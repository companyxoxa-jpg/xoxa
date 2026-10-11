import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { isSuperAdmin, createAuditLog } from '../../shared/rinno.ts';

const MIN_STALE_MS=15*60*1000;
export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);
  if(!user||!isSuperAdmin(user))return Response.json({error:'Acceso no autorizado'},{status:403});
  const body=await req.json(),business=await base44.asServiceRole.entities.Business.get(body.business_id);
  if(!business)return Response.json({error:'Negocio no encontrado'},{status:404});
  const started=business.mutation_started_at?Date.parse(business.mutation_started_at):NaN;
  const age_ms=Number.isFinite(started)?Math.max(0,Date.now()-started):null;
  if(body.action==='inspect')return Response.json({business_id:business.id,locked:!!business.mutation_token,started_at:business.mutation_started_at||null,age_ms,can_recover:!!business.mutation_token&&age_ms!==null&&age_ms>=MIN_STALE_MS,lock_token:business.mutation_token||null});
  if(body.action==='recover'){
   if(!business.mutation_token)return Response.json({error:'El negocio no está bloqueado'},{status:409});
   if(age_ms===null||age_ms<MIN_STALE_MS)return Response.json({error:'El bloqueo todavía puede pertenecer a una operación activa'},{status:409});
   if(body.expected_token!==business.mutation_token)return Response.json({error:'El bloqueo cambió; vuelve a inspeccionarlo'},{status:409});
   if(String(body.reason||'').trim().length<10)return Response.json({error:'Indica el motivo de recuperación'},{status:400});
   const result=await base44.asServiceRole.entities.Business.updateMany({id:business.id,mutation_token:body.expected_token,mutation_started_at:business.mutation_started_at},{$set:{mutation_token:'',mutation_started_at:null}});
   if(result.updated!==1)return Response.json({error:'El bloqueo cambió durante la recuperación'},{status:409});
   await createAuditLog(base44,user,'business.mutation_lock_recovered',{business_id:business.id,entity_type:'Business',entity_id:business.id,metadata:{started_at:business.mutation_started_at,age_ms,reason:String(body.reason).trim().slice(0,500)}});
   return Response.json({ok:true});
  }
  return Response.json({error:'Acción no válida'},{status:400});
 }catch{return Response.json({error:'No se pudo revisar el bloqueo'},{status:500});}
}
