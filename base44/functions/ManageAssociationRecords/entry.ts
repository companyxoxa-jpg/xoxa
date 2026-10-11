import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { getUserBusinessId, createAuditLog } from '../../shared/rinno.ts';
import { requirePermission, resolveAssociationRole, canReadAssociationDocument } from '../../shared/associations.js';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44); if(!user)return Response.json({error:'No autenticado'},{status:401});
  const bid=getUserBusinessId(user),body=await req.json(),e=base44.asServiceRole.entities,business=bid?await e.Business.get(bid):null;
  if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Asociación no encontrada'},{status:404});
  await requirePermission(base44,user,bid,body.action==='list'?'association.records.read':'association.records.manage');
  const recordRole=await resolveAssociationRole(base44,user,bid);
  if(body.action==='list')return Response.json({incidents:await e.AssociationIncident.filter({business_id:bid},'-created_date',200),documents:(await e.AssociationDocument.filter({business_id:bid},'-published_at',200)).filter(d=>canReadAssociationDocument(recordRole,d))});
  return await withBusinessMutation(base44,bid,async()=>{
   if(body.action==='create_incident'){
    const d=body.incident||{}; if(!String(d.subject||'').trim()||!String(d.description||'').trim())return Response.json({error:'Asunto y descripción obligatorios'},{status:400});
    if(d.member_id){const m=await e.Member.get(d.member_id);if(!m||m.business_id!==bid)return Response.json({error:'Socio no encontrado'},{status:404});}
    const row=await e.AssociationIncident.create({business_id:bid,member_id:d.member_id||null,subject:String(d.subject).trim().slice(0,160),description:String(d.description).trim().slice(0,3000),priority:['low','normal','high','urgent'].includes(d.priority)?d.priority:'normal',status:'open',resolution:null,reported_by:user.id,assigned_to:null,resolved_at:null});
    await createAuditLog(base44,user,'association.incident_created',{business_id:bid,entity_type:'AssociationIncident',entity_id:row.id});return Response.json({ok:true,incident:row});
   }
   if(body.action==='update_incident'){
    const row=await e.AssociationIncident.get(body.incident_id);if(!row||row.business_id!==bid)return Response.json({error:'Incidencia no encontrada'},{status:404});
    const status=String(body.status||'');if(!['open','in_progress','resolved','closed'].includes(status))return Response.json({error:'Estado no válido'},{status:400});
    const updated=await e.AssociationIncident.update(row.id,{status,resolution:String(body.resolution||'').slice(0,2000)||null,resolved_at:['resolved','closed'].includes(status)?new Date().toISOString():null});
    await createAuditLog(base44,user,'association.incident_updated',{business_id:bid,entity_type:'AssociationIncident',entity_id:row.id,metadata:{status}});return Response.json({ok:true,incident:updated});
   }
   if(body.action==='publish_document'){
    const d=body.document||{},content=String(d.protected_content||'').trim();if(!String(d.title||'').trim()||!content)return Response.json({error:'Título y contenido son obligatorios'},{status:400});if(content.length>50000)return Response.json({error:'El documento supera el máximo permitido'},{status:400});
    if(!canReadAssociationDocument(recordRole,{audience:d.audience||'staff'}))return Response.json({error:'Audiencia no autorizada'},{status:403});
    const row=await e.AssociationDocument.create({business_id:bid,title:String(d.title).trim().slice(0,160),description:String(d.description||'').slice(0,1000),category:['statutes','minutes','protocol','form','other'].includes(d.category)?d.category:'other',file_url:null,protected_content:content,storage_mode:'protected_text',audience:['staff','members','board'].includes(d.audience)?d.audience:'staff',status:'published',created_by:user.id,published_at:new Date().toISOString()});
    await createAuditLog(base44,user,'association.document_published',{business_id:bid,entity_type:'AssociationDocument',entity_id:row.id,metadata:{audience:row.audience}});return Response.json({ok:true,document:row});
   }
   if(body.action==='archive_document'){
    const row=await e.AssociationDocument.get(body.document_id);if(!row||row.business_id!==bid)return Response.json({error:'Documento no encontrado'},{status:404});
    if(!canReadAssociationDocument(recordRole,row))return Response.json({error:'Audiencia no autorizada'},{status:403});
    const updated=await e.AssociationDocument.update(row.id,{status:'archived'});await createAuditLog(base44,user,'association.document_archived',{business_id:bid,entity_type:'AssociationDocument',entity_id:row.id});return Response.json({ok:true,document:updated});
   }
   return Response.json({error:'Acción no válida'},{status:400});
  });
 }catch(error){if(error instanceof MutationLockError)return Response.json({error:error.message},{status:error.status});return Response.json({error:error?.message||'No se pudo completar la operación'},{status:error?.status||500});}
}
