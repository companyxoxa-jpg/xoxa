import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
const APP='6aca8950491b4b2d74f6f62d';
const fixtures=[
{id:'6acb4ef45bc98c05813041f5',email:'qa-propietario-a@rinno.es',business:'6aca8bffd29ed0095f3ea682',product:'6acb506c8a5632ab7b03bf9b',subscription:'6acb506f5d3afb235f0e3708'},
{id:'6acb4f83199250398b7e9ace',email:'qa-propietario-b@rinno.es',business:'6aca8bffd29ed0095f3ea683',product:'6acb506c8a5632ab7b03bf9c',subscription:'6acb506f5d3afb235f0e3709'}
];
const safeUser=u=>({id:u.id,email:u.email,role:u.role,business_id:u.business_id||null,rinno_role:u.rinno_role||null,support_business_id:u.support_business_id||null});
export default function QaPilot() {
 const [result,setResult]=useState({estado:'PENDIENTE: pulsa Comprobar auth.me() para consultar la identidad real'}),[busy,setBusy]=useState(false);
 async function perform(label, action) {
 if(busy)return;
 setBusy(true);setResult({estado:'EN CURSO',accion:label,at:new Date().toISOString()});
 try{await action();}catch(e){setResult({estado:'ERROR',http:e.status||e.response?.status||0,mensaje:'La operación no se completó. No se considera aprobada.'});}
 finally{setBusy(false);}
 }
 async function closeSession(){base44.auth.logout();try{const u=await base44.auth.me();setResult({closed:false,id:u.id});}catch(e){setResult({closed:true,http:e.status||e.response?.status||0,at:new Date().toISOString()});}}
 async function testTenantKey(){
 const u=await base44.auth.me(),f=fixtures.find(x=>x.id===u.id),other=fixtures.find(x=>x.id!==u.id);
 if(!f||u.role!=='user'||u.business_id!==f.business)throw Error('Identidad no autorizada para el piloto');
 const results=[];
 for(const tenant_id of [other.business,null,'']){
 let status=200;try{await base44.entities.Business.update(f.business,{tenant_id});}catch(e){status=e.status||e.response?.status||0;}
 const after=await base44.entities.Business.get(f.business);
 results.push({action:'Business.update tenant_id',attempt:tenant_id,http:status,actual:after.tenant_id,status:status===403&&after.tenant_id===f.business?'APROBADO':'FALLIDO'});
 }
 const rows=await base44.entities.Business.list();
 results.push({action:'Business.list',ids:rows.map(x=>x.id),status:rows.length===1&&rows[0].id===f.business?'APROBADO':'FALLIDO'});
 setResult({at:new Date().toISOString(),actor:safeUser(u),checks:results});
 }

 async function testPrivateMatrix(){
 const u=await base44.auth.me(),own=fixtures.find(f=>f.id===u.id),other=fixtures.find(f=>f.id!==u.id);
 if(!own||u.role!=='user'||u.rinno_role!=='business_owner')throw Error('Owner fixture required');
 const side=u.id==='6acb4ef45bc98c05813041f5'?'B':'A',checks=[];
 const mapped=[{"entity":"Activity","A":"6acb61a478991f90779beb31","B":"6acb61a478991f90779beb32"},{"entity":"BillingWebhookEvent","A":"6acb61a6ff62ca521e80fd85","B":"6acb61a6ff62ca521e80fd86"},{"entity":"BillingInvoice","A":"6acb61a80b6f17dedc750c69","B":"6acb61a80b6f17dedc750c6a"},{"entity":"MemberConsent","A":"6acb61aaa989e74035321d04","B":"6acb61aaa989e74035321d05"},{"entity":"CredentialValidationAttempt","A":"6acb61ad963bd6ff6a9f3653","B":"6acb61ad963bd6ff6a9f3654"},{"entity":"Appointment","A":"6acb61af577b15419b39cefc","B":"6acb61af577b15419b39cefd"},{"entity":"LaunchImportJob","A":"6acb61b19ab7b8d9e13f842a","B":"6acb61b19ab7b8d9e13f842b"},{"entity":"TeamInvitation","A":"6acb61b387240e98a1dcde7a","B":"6acb61b387240e98a1dcde7b"},{"entity":"MemberFee","A":"6acb61b5278de07fa1441e68","B":"6acb60b3757c426d1b4e6e5f"},{"entity":"CustomerAddress","A":"6acb61b74edc241f3ede0447","B":"6acb61b74edc241f3ede0448"},{"entity":"Product","A":"6acb506c8a5632ab7b03bf9b","B":"6acb506c8a5632ab7b03bf9c"},{"entity":"MemberImportJob","A":"6acb61baff62ca521e80fd98","B":"6acb61baff62ca521e80fd99"},{"entity":"CscNotice","A":"6acb61bc510169b58be0c7d2","B":"6acb61bc510169b58be0c7d3"},{"entity":"OrderItem","A":"6acb61bef2581209eb9ad14e","B":"6acb61bef2581209eb9ad14f"},{"entity":"Subscription","A":"6acb506f5d3afb235f0e3708","B":"6acb506f5d3afb235f0e3709"},{"entity":"Category","A":"6acb61c1ee1be73b1cbbfa35","B":"6acb61c1ee1be73b1cbbfa36"},{"entity":"Membership","A":"6acb61c379dd5644fcad3fd6","B":"6acb61c379dd5644fcad3fd7"},{"entity":"Order","A":"6acb61c53498436d408391f9","B":"6acb61c53498436d408391fa"},{"entity":"MemberPayment","A":"6acb61c884c6b0313be3b818","B":"6acb60b54b61f1332bec98e4"},{"entity":"FulfillmentSlot","A":"6acb61ca5874cb0df7c6a04f","B":"6acb61ca5874cb0df7c6a050"},{"entity":"Enrollment","A":"6acb61cc7f1791357c1b102e","B":"6acb61cc7f1791357c1b102f"},{"entity":"BusinessSettings","A":"6acb60f8ff350d1f8ae4cb11","B":"6acb61ce8b203d332cbd694c"},{"entity":"AssociationLegalPolicy","A":"6acb61d0bcfedb9f3757f56a","B":"6acb61d0bcfedb9f3757f56b"},{"entity":"AuditLog","A":"6acb60c8e7906c461d63f173","B":"6acb60c49d1c82622561445d"},{"entity":"PaymentAllocation","A":"6acb61d27e63e54d1157700a","B":"6acb60b596f0697102c1cecf"},{"entity":"BookingService","A":"6acb61d536064d140c7ab8ca","B":"6acb61d536064d140c7ab8cb"},{"entity":"SavedAddress","A":"6acb5fdc5847da57d2d63fbd","B":"6acb61d7577b15419b39cf2c"},{"entity":"Member","A":"6acb602aa74456e5475e8945","B":"6acb60369621cc25b8955365"},{"entity":"Customer","A":"6acb61da6af2611e02869c7e","B":"6acb61da6af2611e02869c7f"},{"entity":"CscCatalogItem","A":"6acb61dd0d87ac2feef7b7f8","B":"6acb61dd0d87ac2feef7b7f9"},{"entity":"ClientDocument","A":"6acb61df823df83d7fb1ba9d","B":"6acb61df823df83d7fb1ba9e"},{"entity":"CscVisit","A":"6acb61e131ca36da5a17f88f","B":"6acb61e131ca36da5a17f890"},{"entity":"AssociationSetup","A":"6acb61e3acdea635fe31d733","B":"6acb61e3acdea635fe31d734"},{"entity":"BillingPayment","A":"6acb61e5a7d1fa748a702fc3","B":"6acb61e5a7d1fa748a702fc4"},{"entity":"CscDispensation","A":"6acb61e82d1fe0679081a9a0","B":"6acb61e82d1fe0679081a9a1"},{"entity":"BookingProfessional","A":"6acb61ea10a99fabd9de5992","B":"6acb61ea10a99fabd9de5993"},{"entity":"RoleAssignment","A":"6acb602c9a5a3aa8b5408c59","B":"6acb61ec3eed4dbb87572721"},{"entity":"MembershipPlan","A":"6acb61eeb9a7f0369ee3a4ab","B":"6acb61eeb9a7f0369ee3a4ac"},{"entity":"AssociationIncident","A":"6acb61f08f5268bc6a8762f6","B":"6acb61f08f5268bc6a8762f7"},{"entity":"AssociationDocument","A":"6acb602bc151ec313105e221","B":"6acb61f265eda2cf1ac13960"},{"entity":"Credential","A":"6acb61f4f966f020e1c269cc","B":"6acb60b6179cfd23f330aa43"},{"entity":"Business","A":"6aca8bffd29ed0095f3ea682","B":"6aca8bffd29ed0095f3ea683"},{"entity":"User","A":"6acb4ef45bc98c05813041f5","B":"6acb4f83199250398b7e9ace"}];
 for(const f of mapped){
  try {const v=await base44.entities[f.entity].get(f[side]);checks.push({entity:f.entity,action:'get foreign existing fixture',expected:'403/404',status:'FALLIDO',returnedId:v?.id});}
  catch(e){const http=e.status||e.response?.status;checks.push({entity:f.entity,action:'get foreign existing fixture',expected:'403/404',http,status:[403,404].includes(http)?'APROBADO':'NO VERIFICADO'});}
  const query=f.entity==='Business'?{id:other.business}:f.entity==='User'?{id:other.id}:{business_id:other.business};
  try {const v=await base44.entities[f.entity].filter(query);checks.push({entity:f.entity,action:'filter foreign',expected:'empty',count:v.length,status:v.length===0?'APROBADO':'FALLIDO'});}
  catch(e){const http=e.status||e.response?.status;checks.push({entity:f.entity,action:'filter foreign',http,status:[401,403].includes(http)?'APROBADO':'NO VERIFICADO'});}
  try {const v=await base44.entities[f.entity].list('-created_date',500);const foreign=v.filter(x=>x.id===f[side]||x.business_id===other.business||x.tenant_id===other.business);checks.push({entity:f.entity,action:'list no foreign fixtures',expected:'no foreign record',foreignIds:foreign.map(x=>x.id),status:foreign.length===0?'APROBADO':'FALLIDO'});}
  catch(e){const http=e.status||e.response?.status;checks.push({entity:f.entity,action:'list no foreign fixtures',http,status:[401,403].includes(http)?'APROBADO':'NO VERIFICADO'});}
 }
 setResult({case:'T01',appId:APP,at:new Date().toISOString(),actor:safeUser(u),checks,completed:true});
 }

 async function identify(){try{setResult({at:new Date().toISOString(),authMe:safeUser(await base44.auth.me())});}catch(e){setResult({status:e.status||e.response?.status||0});}}
 async function run(){
 setBusy(true);const report={appId:APP,at:new Date().toISOString(),checks:[]};
 const record=(name,expected,obtained,pass)=>{report.checks.push({name,expected,obtained,status:pass?'APROBADO':'FALLIDO'});setResult({...report});};
 const call=async fn=>{try{return {status:200,data:await fn()};}catch(e){return {status:e.status||e.response?.status||0};}};
 const deny=async(name,fn)=>{const r=await call(fn);record(name,'403 o 404',r.status,[403,404].includes(r.status));};
 try{
 if(location.hostname!=='preview-sandbox--'+APP+'.base44.app')throw Error('Destino no autorizado');
 const u=await base44.auth.me(),own=fixtures.find(f=>f.id===u.id&&f.email===u.email),other=fixtures.find(f=>f.id!==u.id);
 report.actor=safeUser(u);
 if(!own||u.role!=='user'||u.business_id!==own.business||u.rinno_role!=='business_owner')throw Error('Identidad o vinculación incorrecta');
 const invoke=(name,data)=>base44.functions.invoke(name,data).then(r=>r.data);
 let r=await call(()=>base44.entities.Business.get(own.business));
 record('Leer negocio propio','ID propio',r.data?.id||r.status,r.data?.id===own.business);
 r=await call(()=>base44.entities.Product.get(own.product));
 record('Leer producto propio','Centinela propio',r.data?.id||r.status,r.data?.id===own.product);
 r=await call(()=>base44.entities.Product.list());
 record('Listar productos','Sin productos ajenos',r.data?.map(x=>x.id)||r.status,Array.isArray(r.data)&&r.data.some(x=>x.id===own.product)&&r.data.every(x=>x.business_id===own.business));
 r=await call(()=>base44.entities.Product.filter({business_id:other.business}));
 record('Filtrar productos ajenos','Lista vacía',r.data?.length??r.status,Array.isArray(r.data)&&r.data.length===0);
 await deny('Leer producto ajeno por ID',()=>base44.entities.Product.get(other.product));
 await deny('Leer negocio ajeno por ID',()=>base44.entities.Business.get(other.business));
 await deny('Crear producto directo en negocio ajeno',()=>base44.entities.Product.create({business_id:other.business,name:'QA unauthorized sentinel',price:777,unit_type:'unit',status:'draft'}));
 await deny('Modificar producto ajeno directo',()=>base44.entities.Product.update(other.product,{price:777}));
 await deny('Eliminar centinela ajeno directo',()=>base44.entities.Product.delete(other.product));
 await deny('Modificar producto ajeno mediante backend',()=>invoke('ManageProduct',{action:'update',product_id:other.product,product_data:{price:777}}));
 r=await call(()=>invoke('ManageProduct',{action:'update',product_id:own.product,product_data:{price:101,business_id:other.business}}));
 const ownAfter=await base44.entities.Product.get(own.product);
 record('Modificar producto propio e inyectar business_id ajeno','Precio 101; negocio original',{http:r.status,price:ownAfter.price,business_id:ownAfter.business_id},r.status===200&&ownAfter.price===101&&ownAfter.business_id===own.business);
 // Restore only our synthetic price through normal authorized backend.
 await invoke('ManageProduct',{action:'update',product_id:own.product,product_data:{price:100}});
 r=await call(()=>base44.entities.Subscription.filter({business_id:other.business}));
 record('Leer suscripción ajena directa','Vacío o rechazo',r.data?.length??r.status,(Array.isArray(r.data)&&r.data.length===0)||[403,404].includes(r.status));
 await deny('Leer suscripción ajena backend',()=>invoke('ManageBilling',{action:'summary',business_id:other.business}));
 r=await call(()=>invoke('ManageBilling',{action:'summary',business_id:own.business}));
 record('Consultar facturación propia','Suscripción sintética propia',r.data?.subscription?.id||r.status,r.data?.subscription?.id===own.subscription);
 await deny('Acceder a métricas de Super Admin',()=>invoke('ManageBilling',{action:'metrics'}));
 await deny('Vincular otro usuario sin Super Admin',()=>invoke('LinkBusinessUser',{email:other.email,business_id:own.business,rinno_role:'business_owner'}));
 for(const payload of [{business_id:other.business},{support_business_id:other.business},{rinno_role:'business_staff'},{role:'admin'}]){
 const field=Object.keys(payload)[0];r=await call(()=>base44.auth.updateMe(payload));const after=await base44.auth.me();
 const unchanged=after.role==='user'&&after.business_id===own.business&&after.rinno_role==='business_owner'&&!after.support_business_id;
 record('Campo protegido '+field,'Autoridad sin cambios',{http:r.status,user:safeUser(after)},unchanged);
 if(!unchanged)throw Error('Cambio de autoridad detectado; pruebas detenidas');
 }
 record('Identidad estable al finalizar',own.id,(await base44.auth.me()).id,(await base44.auth.me()).id===own.id);
 report.completed=true;
 }catch(e){report.stopped=true;report.reason='No se completó el piloto; revisar la última comprobación. No se guardan errores con posibles secretos.';}
 finally{setResult({...report});setBusy(false);}
 }
 return <main style={{padding:32,maxWidth:1000}}><h1>RINNO Seguridad QA — piloto</h1><p>Solo datos ficticios. Las pruebas usan la sesión actual y no muestran secretos.</p><button disabled={busy} onClick={()=>perform('Consultar identidad',identify)}>Comprobar auth.me()</button> <button disabled={busy} onClick={()=>perform('Ejecutar 21 comprobaciones',run)}>Ejecutar piloto de permisos</button><button disabled={busy} onClick={()=>perform('Cerrar sesión',closeSession)}>Cerrar esta sesión QA y verificar</button><button disabled={busy} onClick={()=>perform('Verificar inmutabilidad',testTenantKey)}>Verificar inmutabilidad tenant_id</button><button disabled={busy} onClick={()=>perform('Matriz privada',testPrivateMatrix)}>Verificar lectura privada ampliada</button><p role="status" aria-live="polite">{busy?'Ejecutando: espera a que finalice la operación.':result.completed?`Piloto finalizado: ${result.checks.filter(c=>c.status==='APROBADO').length}/${result.checks.length} aprobadas.`:'Controles disponibles.'}</p><p><a href="/login">Iniciar sesión con otra cuenta QA</a></p><pre translate="no" data-testid="qa-result" style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result,null,2)}</pre></main>;
}
