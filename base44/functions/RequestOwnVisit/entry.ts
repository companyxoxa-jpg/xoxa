import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { createAuditLog } from '../../shared/associations.js';

export default async function(req) {
  try {
    const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);
    if(!user)return Response.json({error:'No autenticado'},{status:401});
    const {slug,scheduled_at}=await req.json();
    const business=(await base44.asServiceRole.entities.Business.filter({slug,status:'active'}))[0];
    if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Asociación no encontrada'},{status:404});
    const members=await base44.asServiceRole.entities.Member.filter({business_id:business.id,user_id:user.id});
    if(members.length!==1||members[0].status!=='active')return Response.json({error:'Socio no vinculado'},{status:403});
    const at=new Date(scheduled_at);
    if(!Number.isFinite(at.getTime())||at.getTime()<Date.now()+30*60*1000)return Response.json({error:'Elige una fecha con al menos 30 minutos de antelación'},{status:400});
    return await withBusinessMutation(base44,business.id,async()=>{
      const pending=await base44.asServiceRole.entities.CscVisit.filter({business_id:business.id,member_id:members[0].id,status:'scheduled'});
      if(pending.length)return Response.json({error:'Ya tienes una visita programada'},{status:409});
      const visit=await base44.asServiceRole.entities.CscVisit.create({business_id:business.id,member_id:members[0].id,scheduled_at:at.toISOString(),status:'scheduled',notes:'Solicitada por el socio',created_by:user.id});
      await createAuditLog(base44,user,'csc.visit_requested',{business_id:business.id,entity_type:'CscVisit',entity_id:visit.id,metadata:{member_id:members[0].id}});
      return Response.json({ok:true,visit});
    });
  }catch(error){
    if(error instanceof MutationLockError)return Response.json({error:error.message},{status:error.status});
    return Response.json({error:'No se pudo solicitar la visita'},{status:500});
  }
}
