import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { getUserBusinessId } from '../../shared/rinno.ts';
import { requirePermission, resolveAssociationRole } from '../../shared/associations.js';

export default async function(req){try{
 const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);if(!user)return Response.json({error:'No autenticado'},{status:401});
 const bid=getUserBusinessId(user),e=base44.asServiceRole.entities,business=bid?await e.Business.get(bid):null;if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Asociación no encontrada'},{status:404});
 await requirePermission(base44,user,bid,'association.records.read');const role=await resolveAssociationRole(base44,user,bid),owner=role==='owner';
 const [members,memberships,plans,activities,enrollments,incidents,documents,policies,consents,catalog,dispensations,visits,notices,credentials]=await Promise.all([
  e.Member.filter({business_id:bid},'member_number',5000),e.Membership.filter({business_id:bid},'-start_date',5000),e.MembershipPlan.filter({business_id:bid},'sort_order',1000),e.Activity.filter({business_id:bid},'-start_at',2000),e.Enrollment.filter({business_id:bid},'-enrolled_at',10000),e.AssociationIncident.filter({business_id:bid},'-created_date',5000),e.AssociationDocument.filter({business_id:bid},'-published_at',2000),e.AssociationLegalPolicy.filter({business_id:bid},'-effective_at',1000),e.MemberConsent.filter({business_id:bid},'-accepted_at',10000),e.CscCatalogItem.filter({business_id:bid},'name',2000),e.CscDispensation.filter({business_id:bid},'-recorded_at',10000),e.CscVisit.filter({business_id:bid},'-scheduled_at',5000),e.CscNotice.filter({business_id:bid},'-published_at',2000),e.Credential.filter({business_id:bid},'-issued_at',5000)
 ]);
 const payload={schema_version:'rinno-association-backup-1',generated_at:new Date().toISOString(),business:{id:business.id,name:business.business_name,slug:business.slug},scope:owner?'owner':'staff',members:members.map(x=>{const safe={...x};if(!owner)delete safe.internal_notes;return safe}),membership_plans:plans,memberships,activities,enrollments,incidents,documents:documents.map(({protected_content,...x})=>owner?{...x,protected_content}:x),legal_policies:policies,member_consents:consents,catalog,dispensations,visits,notices,credentials:credentials.map(x=>{const safe={...x};delete safe.token_hash;return safe})};
 if(owner){const[fees,payments,allocations,roles,audit]=await Promise.all([e.MemberFee.filter({business_id:bid},'-issued_at',10000),e.MemberPayment.filter({business_id:bid},'-paid_at',10000),e.PaymentAllocation.filter({business_id:bid},'-created_date',10000),e.RoleAssignment.filter({business_id:bid},'role',5000),e.AuditLog.filter({business_id:bid},'-created_date',10000)]);payload.fees=fees;payload.payments=payments;payload.payment_allocations=allocations;payload.roles=roles;payload.audit=audit;}
 return Response.json(payload);
}catch(error){return Response.json({error:error?.message||'No se pudo preparar la exportación'},{status:error?.status||500});}}
