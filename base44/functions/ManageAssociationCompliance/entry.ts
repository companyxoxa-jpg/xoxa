import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { getUserBusinessId, createAuditLog } from '../../shared/rinno.ts';
import { requirePermission } from '../../shared/associations.js';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';

const KINDS=['privacy','statutes','rules','age_declaration','other'];
export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);if(!user)return Response.json({error:'No autenticado'},{status:401});
  const bid=getUserBusinessId(user),body=await req.json(),e=base44.asServiceRole.entities,business=bid?await e.Business.get(bid):null;
  if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Asociación no encontrada'},{status:404});
  await requirePermission(base44,user,bid,body.action==='list'?'association.compliance.read':'association.compliance.manage');
  if(body.action==='list'){
   const [policies,consents,members]=await Promise.all([e.AssociationLegalPolicy.filter({business_id:bid},'-effective_at',200),e.MemberConsent.filter({business_id:bid},'-accepted_at',1000),e.Member.filter({business_id:bid},'member_number',1000)]);
   return Response.json({policies,consents,members:members.map(m=>({id:m.id,member_number:m.member_number,first_name:m.first_name,last_name:m.last_name,status:m.status,birth_date:m.birth_date||null}))});
  }
  return await withBusinessMutation(base44,bid,async()=>{
   if(body.action==='save_policy'){
    const d=body.policy||{},title=String(d.title||'').trim(),version=String(d.version||'').trim(),content=String(d.content||'').trim();
    if(!title||!version||!content)return Response.json({error:'Título, versión y texto son obligatorios'},{status:400});
    if(content.length>50000)return Response.json({error:'El texto supera el máximo permitido'},{status:400});
    const kind=KINDS.includes(d.kind)?d.kind:'other',minimumAge=kind==='age_declaration'?Math.max(18,Math.min(99,Number(d.minimum_age)||18)):null;
    const data={business_id:bid,kind,title:title.slice(0,160),version:version.slice(0,40),content,required:d.required!==false,status:'draft',minimum_age:minimumAge,effective_at:null,created_by:user.id,published_at:null};
    let row;
    if(d.id){const current=await e.AssociationLegalPolicy.get(d.id);if(!current||current.business_id!==bid)return Response.json({error:'Política no encontrada'},{status:404});if(current.status==='active')return Response.json({error:'Una versión activa es inmutable. Crea una versión nueva.'},{status:409});row=await e.AssociationLegalPolicy.update(d.id,data);}else row=await e.AssociationLegalPolicy.create(data);
    await createAuditLog(base44,user,'association.policy_saved',{business_id:bid,entity_type:'AssociationLegalPolicy',entity_id:row.id,metadata:{kind,version}});return Response.json({ok:true,policy:row});
   }
   if(body.action==='publish_policy'){
    const row=await e.AssociationLegalPolicy.get(body.policy_id);if(!row||row.business_id!==bid)return Response.json({error:'Política no encontrada'},{status:404});if(row.status!=='draft')return Response.json({error:'Solo se puede publicar un borrador'},{status:409});
    const sameKind=await e.AssociationLegalPolicy.filter({business_id:bid,kind:row.kind,status:'active'},'-effective_at',100);for(const old of sameKind)await e.AssociationLegalPolicy.update(old.id,{status:'archived'});
    const now=new Date().toISOString(),updated=await e.AssociationLegalPolicy.update(row.id,{status:'active',effective_at:now,published_at:now});
    await createAuditLog(base44,user,'association.policy_published',{business_id:bid,entity_type:'AssociationLegalPolicy',entity_id:row.id,metadata:{kind:row.kind,version:row.version,replaced:sameKind.map(x=>x.id)}});return Response.json({ok:true,policy:updated});
   }
   if(body.action==='archive_policy'){
    const row=await e.AssociationLegalPolicy.get(body.policy_id);if(!row||row.business_id!==bid)return Response.json({error:'Política no encontrada'},{status:404});const updated=await e.AssociationLegalPolicy.update(row.id,{status:'archived'});await createAuditLog(base44,user,'association.policy_archived',{business_id:bid,entity_type:'AssociationLegalPolicy',entity_id:row.id});return Response.json({ok:true,policy:updated});
   }
   return Response.json({error:'Acción no válida'},{status:400});
  });
 }catch(error){if(error instanceof MutationLockError)return Response.json({error:error.message},{status:error.status});return Response.json({error:error?.message||'No se pudo completar la operación'},{status:error?.status||500});}
}
