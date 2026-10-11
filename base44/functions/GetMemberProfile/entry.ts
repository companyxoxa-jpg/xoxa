import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { getUserBusinessId, requirePermission, resolveAssociationRole, hasPermission, projectMember, AssociationError } from '../../shared/associations.js';

export default async function(req){
  try{
    const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);
    if(!user)return Response.json({error:'No autenticado'},{status:401});
    const body=await req.json(),bid=getUserBusinessId(user),e=base44.asServiceRole.entities;
    if(!bid)return Response.json({error:'Sin asociación asociada'},{status:403});
    await requirePermission(base44,user,bid,'members.read');
    const member=await e.Member.get(body.member_id);
    if(!member||member.business_id!==bid)return Response.json({error:'Socio no encontrado'},{status:404});
    const role=await resolveAssociationRole(base44,user,bid),can=permission=>hasPermission(role,permission);
    const [memberships,fees,credentials,dispensations,visits,enrollments,activities]=await Promise.all([
      e.Membership.filter({business_id:bid,member_id:member.id},'-start_date',100),
      can('fees.read')?e.MemberFee.filter({business_id:bid,member_id:member.id},'-issued_at',100):[],
      can('credentials.read')?e.Credential.filter({business_id:bid,member_id:member.id},'-issued_at',20):[],
      can('csc.read')?e.CscDispensation.filter({business_id:bid,member_id:member.id},'-recorded_at',200):[],
      can('csc.read')?e.CscVisit.filter({business_id:bid,member_id:member.id},'-scheduled_at',100):[],
      can('enrollments.read')?e.Enrollment.filter({business_id:bid,member_id:member.id},'-enrolled_at',100):[],
      can('activities.read')?e.Activity.filter({business_id:bid},'-start_at',200):[],
    ]);
    const safeCredential=credentials.map(({token_hash,...credential})=>credential);
    return Response.json({member:projectMember(member,role),memberships,fees,credentials:safeCredential,dispensations,visits,enrollments:enrollments.map(x=>{const activity=activities.find(a=>a.id===x.activity_id);return {...x,activity:activity?{title:activity.title,start_at:activity.start_at}:null}}),permissions:{fees:can('fees.read'),credentials:can('credentials.read'),csc:can('csc.read'),edit:can('members.write'),limits:can('csc.limits')}});
  }catch(error){if(error instanceof AssociationError)return Response.json({error:error.message},{status:error.status});return Response.json({error:'No se pudo cargar la ficha del socio.'},{status:500})}
}
