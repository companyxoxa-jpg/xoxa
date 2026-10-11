import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { resolveBusinessBySlug, createAuditLog } from '../../shared/rinno.ts';
import { findLinkableMember } from '../../shared/member-link.js';
import { meetsMinimumAge } from '../../shared/association-compliance.js';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);if(!user)return Response.json({error:'No autenticado'},{status:401});
  const body=await req.json(),business=await resolveBusinessBySlug(base44,body.slug);if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Asociación no encontrada'},{status:404});
  const e=base44.asServiceRole.entities,members=await e.Member.filter({business_id:business.id,user_id:user.id});let member=members[0];
  if(!member&&user.email){const linkable=findLinkableMember(await e.Member.filter({business_id:business.id},'member_number',1000),user);if(linkable)member=linkable.user_id===user.id?linkable:await e.Member.update(linkable.id,{user_id:user.id});}
  if(!member||member.status!=='active')return Response.json({error:'No hay un socio activo vinculado'},{status:403});
  return await withBusinessMutation(base44,business.id,async()=>{
   const policy=await e.AssociationLegalPolicy.get(body.policy_id);if(!policy||policy.business_id!==business.id||policy.status!=='active')return Response.json({error:'Documento vigente no encontrado'},{status:404});
   if(policy.kind==='age_declaration'&&!meetsMinimumAge(member.birth_date,Number(policy.minimum_age)||18))return Response.json({error:'No consta una fecha de nacimiento que cumpla la edad mínima'},{status:409});
   const prior=await e.MemberConsent.filter({business_id:business.id,member_id:member.id,policy_id:policy.id,policy_version:policy.version},'-accepted_at',10);if(prior.some(x=>!x.revoked_at))return Response.json({ok:true,already_accepted:true});
   const consent=await e.MemberConsent.create({business_id:business.id,member_id:member.id,policy_id:policy.id,policy_version:policy.version,accepted_at:new Date().toISOString(),accepted_by_user_id:user.id,evidence:{method:'authenticated_member_portal'},revoked_at:null});
   await createAuditLog(base44,user,'association.policy_accepted',{business_id:business.id,entity_type:'MemberConsent',entity_id:consent.id,metadata:{member_id:member.id,policy_id:policy.id,policy_version:policy.version}});return Response.json({ok:true,consent});
  });
 }catch(error){if(error instanceof MutationLockError)return Response.json({error:error.message},{status:error.status});return Response.json({error:error?.message||'No se pudo registrar la aceptación'},{status:error?.status||500});}
}
