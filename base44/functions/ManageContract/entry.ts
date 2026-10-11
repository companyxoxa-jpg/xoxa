import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { isSuperAdmin, isCommercial, createAuditLog } from '../../shared/rinno.ts';
import { cleanContractData, validateContract, contractNumber, PAYMENT_METHODS } from '../../shared/contracts.js';

const MASTER_URL='https://rinno.es/contracts/Contrato_Alta_RINNO_Completo_Profesional_v3_master.pdf';
const email=v=>String(v||'').trim().toLowerCase();
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const summary=c=>({id:c.id,contract_number:c.contract_number,client_name:c.client_name,trade_name:c.trade_name,tax_id:c.tax_id,representative_name:c.representative_name,contact_email:c.contact_email,contact_phone:c.contact_phone,payment_method:c.payment_method,status:c.status,commercial_email:c.commercial_email,created_by_email:c.created_by_email,created_date:c.created_date,signed_at:c.signed_at,previous_contract_id:c.previous_contract_id});
const bytesToBase64=bytes=>{let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(out)};
const base64ToBytes=value=>Uint8Array.from(atob(String(value).split(',').pop()||''),c=>c.charCodeAt(0));
async function sha256(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}

async function authorize(base44,user){
  const admin=isSuperAdmin(user),commercial=!admin&&await isCommercial(base44,user);
  if(!admin&&!commercial)throw fail('Acceso denegado',403);
  return {admin,commercial,userEmail:email(user.email)};
}
function allowed(contract,auth){return auth.admin||email(contract.commercial_email||contract.created_by_email)===auth.userEmail}
async function history(base44,user,contract,from,to,reason=null){await base44.asServiceRole.entities.ContractStatusHistory.create({contract_id:contract.id,from_status:from||null,to_status:to,changed_by:user.id,changed_by_email:email(user.email),changed_at:new Date().toISOString(),reason})}

async function allocateNumber(base44,year){
  for(let attempt=0;attempt<8;attempt++){
    const counters=await base44.asServiceRole.entities.ContractCounter.filter({year});
    if(!counters.length){
      await base44.asServiceRole.entities.ContractCounter.create({year,next_number:2});
      const used=await base44.asServiceRole.entities.ClientContract.filter({contract_number:contractNumber(year,1)});
      if(!used.length)return contractNumber(year,1);
      continue;
    }
    if(counters.length!==1)throw fail('El contador anual requiere revisión administrativa',503);
    const counter=counters[0],sequence=Number(counter.next_number||1);
    const updated=await base44.asServiceRole.entities.ContractCounter.updateMany({id:counter.id,next_number:sequence},{$set:{next_number:sequence+1}});
    if(updated.updated===1){
      const candidate=contractNumber(year,sequence),used=await base44.asServiceRole.entities.ClientContract.filter({contract_number:candidate});
      if(!used.length)return candidate;
    }
  }
  throw fail('No se pudo reservar un número de contrato único',503);
}

function fit(page,text,x,y,maxWidth,font,size=7.5){
  let value=String(text||''),s=size;
  while(s>5.5&&font.widthOfTextAtSize(value,s)>maxWidth)s-=.25;
  if(font.widthOfTextAtSize(value,s)>maxWidth){while(value.length&&font.widthOfTextAtSize(value+'…',s)>maxWidth)value=value.slice(0,-1);value+='…'}
  page.drawText(value,{x,y,size:s,font,color:rgb(.03,.08,.16)});
}
function mark(page,x,y){page.drawText('X',{x,y,size:8.5,color:rgb(.03,.08,.16)})}
async function generatePdf(data,number,signedAt){
  const response=await fetch(MASTER_URL,{headers:{'cache-control':'no-cache'}});if(!response.ok)throw fail('No se pudo cargar la plantilla maestra',503);
  const pdf=await PDFDocument.load(await response.arrayBuffer()),font=await pdf.embedFont(StandardFonts.Helvetica),pages=pdf.getPages(),p1=pages[0],p2=pages[1],p3=pages[2];
  const date=new Date(signedAt),dateText=new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Madrid'}).format(date);
  fit(p1,number,158,736,100,font,8);p1.drawRectangle({x:294,y:728,width:68,height:14,color:rgb(1,1,1)});fit(p1,dateText,295,736,66,font,8);
  const first=[['client_name',169,676,320],['tax_id',169,657,165],['trade_name',169,638,320],['fiscal_address',169,619,320],['business_address',169,600,320],['representative_name',169,581,320],['representative_id',169,562,165],['representative_role',169,543,320],['contact_phone',169,524,165],['contact_email',169,505,320]];
  for(const [key,x,y,w] of first)fit(p1,data[key],x,y,w,font);
  const pay={stripe:[108,305],direct_debit:[221,305],transfer:[300,305],other:[379,305]};if(pay[data.payment_method])mark(p1,...pay[data.payment_method]);
  const second=[['display_name',169,219,320],['primary_color',169,208,110],['secondary_color',286,208,110],['public_phone',169,170,110],['whatsapp',286,170,110],['public_email',169,151,320],['public_address',169,132,320],['instagram',169,113,150],['facebook',330,113,150]];
  for(const [key,x,y,w] of second)fit(p2,data[key],x,y,w,font);
  const logo={delivered:[172,184],pending:[220,184],none:[266,184]},google={existing:[172,89],configure:[222,89],na:[300,89]},ops={pickup:[172,70],delivery:[248,70],both:[316,70],other:[353,70]};
  if(logo[data.logo_status])mark(p2,...logo[data.logo_status]);if(google[data.google_business])mark(p2,...google[data.google_business]);if(ops[data.operation])mark(p2,...ops[data.operation]);
  const third=[['weekday_hours',169,777,320],['saturday_hours',169,758,110],['sunday_hours',286,758,110],['service_area',169,739,320],['minimum_order',169,720,100],['approx_products',169,682,100],['main_categories',169,663,320],['observations',169,618,320],['billing_name',169,503,320],['billing_tax_id',169,484,165],['billing_address',169,465,320],['billing_email',169,446,320],['client_signer_name',46,270,230],['client_signer_id',75,255,105],['client_signer_role',68,246,112],['rinno_signer_name',304,270,230],['rinno_signer_id',333,255,105],['rinno_signer_role',326,246,112],['place',69,162,120]];
  for(const [key,x,y,w] of third)fit(p3,data[key],x,y,w,font);
  fit(p3,dateText,226,162,90,font);
  const material={excel:[172,700],photos:[221,700],physical:[253,700],pending:[315,700]},taxes={yes:[172,645],no:[193,645],na:[216,645]};
  if(material[data.catalog_material])mark(p3,...material[data.catalog_material]);if(taxes[data.taxes_included])mark(p3,...taxes[data.taxes_included]);
  for(let i=0;i<4;i++)if(data.authorizations?.[i])mark(p3,46,[582,559,536,513][i]);
  for(const [sig,x] of [[data.client_signature,66],[data.rinno_signature,325]]){const png=await pdf.embedPng(base64ToBytes(sig));const scaled=png.scaleToFit(190,55);p3.drawImage(png,{x,y:173,width:scaled.width,height:scaled.height})}
  return await pdf.save({useObjectStreams:true});
}

export default async function(req){
  try{
    const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);if(!user)throw fail('No autenticado',401);
    const auth=await authorize(base44,user),body=await req.json(),entity=base44.asServiceRole.entities.ClientContract;
    const all=await entity.list('-created_date',500),visible=auth.admin?all:all.filter(c=>allowed(c,auth));
    if(body.action==='list')return Response.json({contracts:visible.map(summary)});
    if(body.action==='create'){
      const data=cleanContractData(body.data);if(!PAYMENT_METHODS.includes(data.payment_method))data.payment_method='stripe';
      const now=new Date().toISOString(),record=await entity.create({contract_number:null,contract_year:null,client_name:data.client_name||'Borrador sin nombre',trade_name:data.trade_name||data.client_name||'Borrador',tax_id:data.tax_id||'PENDIENTE',representative_name:data.representative_name||'Pendiente',representative_id:data.representative_id||'Pendiente',contact_email:data.contact_email||email(user.email),contact_phone:data.contact_phone||'Pendiente',payment_method:data.payment_method,status:'draft',data_json:JSON.stringify(data),client_signature:null,rinno_signature:null,pdf_base64:null,pdf_sha256:null,created_by:user.id,created_by_email:email(user.email),commercial_email:auth.commercial?email(user.email):(email(body.commercial_email)||null),previous_contract_id:body.previous_contract_id||null,signed_at:null,cancelled_at:null});
      await history(base44,user,record,null,'draft');await createAuditLog(base44,user,'contract.created',{entity_type:'ClientContract',entity_id:record.id});return Response.json({contract:summary(record)});
    }
    const contract=visible.find(c=>c.id===body.id);if(!contract)throw fail('Contrato no encontrado',404);
    if(body.action==='get')return Response.json({contract:{...summary(contract),data:JSON.parse(contract.data_json||'{}'),history:(await base44.asServiceRole.entities.ContractStatusHistory.filter({contract_id:contract.id})).sort((a,b)=>String(a.changed_at).localeCompare(String(b.changed_at)))}});
    if(body.action==='pdf'){if(!contract.pdf_base64)throw fail('El contrato todavía no tiene PDF',404);return Response.json({filename:`${contract.contract_number}.pdf`,base64:contract.pdf_base64,sha256:contract.pdf_sha256});}
    if(body.action==='save'){
      if(!['draft','pending_signature'].includes(contract.status))throw fail('Un contrato firmado no puede modificarse',409);
      const data=cleanContractData(body.data),nextStatus=body.pending_signature?'pending_signature':'draft';
      const update={client_name:data.client_name||'Borrador sin nombre',trade_name:data.trade_name||data.client_name||'Borrador',tax_id:data.tax_id||'PENDIENTE',representative_name:data.representative_name||'Pendiente',representative_id:data.representative_id||'Pendiente',contact_email:data.contact_email||contract.contact_email,contact_phone:data.contact_phone||'Pendiente',payment_method:PAYMENT_METHODS.includes(data.payment_method)?data.payment_method:'stripe',data_json:JSON.stringify(data),status:nextStatus};
      const saved=await entity.update(contract.id,update);if(contract.status!==nextStatus)await history(base44,user,saved,contract.status,nextStatus);return Response.json({contract:summary(saved)});
    }
    if(body.action==='finalize'){
      if(!['draft','pending_signature'].includes(contract.status))throw fail('El contrato ya no admite firma',409);
      const data=cleanContractData(body.data);data.client_signature=String(body.client_signature||'');data.rinno_signature=String(body.rinno_signature||'');
      if(data.client_signature.length>700000||data.rinno_signature.length>700000)throw fail('La firma supera el tamaño permitido');
      const missing=validateContract(data,{signatures:true});if(missing.length)throw fail(`Faltan datos obligatorios: ${missing.join(', ')}`);
      const signedAt=new Date().toISOString(),year=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(signedAt))),number=await allocateNumber(base44,year),bytes=await generatePdf(data,number,signedAt),digest=await sha256(bytes);
      const saved=await entity.update(contract.id,{contract_number:number,contract_year:year,client_name:data.client_name,trade_name:data.trade_name,tax_id:data.tax_id,representative_name:data.representative_name,representative_id:data.representative_id,contact_email:data.contact_email,contact_phone:data.contact_phone,payment_method:data.payment_method,status:'signed',data_json:JSON.stringify({...data,client_signature:undefined,rinno_signature:undefined}),client_signature:data.client_signature,rinno_signature:data.rinno_signature,pdf_base64:bytesToBase64(bytes),pdf_sha256:digest,signed_at:signedAt});
      await history(base44,user,saved,contract.status,'signed');await createAuditLog(base44,user,'contract.signed',{entity_type:'ClientContract',entity_id:saved.id,metadata:{contract_number:number,pdf_sha256:digest}});return Response.json({contract:summary(saved)});
    }
    if(body.action==='status'){
      if(!auth.admin)throw fail('Solo Super Admin puede cambiar el estado',403);if(!['active','cancelled'].includes(body.status))throw fail('Estado no válido');if(!['signed','active'].includes(contract.status))throw fail('Transición no permitida',409);
      const saved=await entity.update(contract.id,{status:body.status,cancelled_at:body.status==='cancelled'?new Date().toISOString():null});await history(base44,user,saved,contract.status,body.status,String(body.reason||'').slice(0,500)||null);return Response.json({contract:summary(saved)});
    }
    throw fail('Acción no válida');
  }catch(error){return Response.json({error:error?.message||'No se pudo gestionar el contrato'},{status:Number(error?.status)||500})}
}
