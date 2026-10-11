import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { getUserBusinessId, createAuditLog } from '../../shared/rinno.ts';
import { requirePermission } from '../../shared/associations.js';

export default async function(req){try{
 const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);if(!user)return Response.json({error:'No autenticado'},{status:401});const bid=getUserBusinessId(user),body=await req.json(),e=base44.asServiceRole.entities,business=bid?await e.Business.get(bid):null;if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Asociación no encontrada'},{status:404});await requirePermission(base44,user,bid,'config.manage');
 const rows=await e.AssociationSetup.filter({business_id:bid},'-created_at',10),setup=rows[0];if(!setup)return Response.json({setup:null});if(body.action==='get'||!body.action)return Response.json({setup});
 if(body.action==='set_check'){
  const allowed=['pending','complete','external_review'],checklist=(setup.checklist||[]).map(item=>item.key===body.key?{...item,status:allowed.includes(body.status)?body.status:item.status}:item);if(!checklist.some(x=>x.key===body.key))return Response.json({error:'Paso no encontrado'},{status:404});
  const pending=checklist.filter(x=>x.status!=='complete'),status=pending.length===0?'production_ready':checklist.some(x=>x.key==='mobile_pilot'&&x.status==='complete')?'ready_for_pilot':'setup';const updated=await e.AssociationSetup.update(setup.id,{checklist,status});await createAuditLog(base44,user,'association.setup_updated',{business_id:bid,entity_type:'AssociationSetup',entity_id:setup.id,metadata:{key:body.key,status:body.status,setup_status:status}});return Response.json({setup:updated});
 }
 return Response.json({error:'Acción no válida'},{status:400});
}catch(error){return Response.json({error:error?.message||'No se pudo actualizar la puesta en marcha'},{status:error?.status||500});}}
