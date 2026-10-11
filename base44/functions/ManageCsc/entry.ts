import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { getUserBusinessId, createAuditLog } from '../../shared/rinno.ts';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { requirePermission } from '../../shared/associations.js';
import { calculateDispensation } from '../../shared/csc.js';
import { requireMemberCompliance } from '../../shared/association-compliance.js';

const periodFor = date => date.toISOString().slice(0,7);

export default async function(req) {
  try {
    const base44=createClientFromRequest(req), user=await readAuthenticatedUser(base44);
    if(!user)return Response.json({error:'No autenticado'},{status:401});
    const bid=getUserBusinessId(user), body=await req.json(), e=base44.asServiceRole.entities;
    const business=bid?await e.Business.get(bid):null;
    if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Club no encontrado'},{status:404});
    await requirePermission(base44,user,bid,body.action==='list'?'csc.read':body.action==='set_member_limit'?'csc.limits':'csc.manage');
    if(body.action==='list')return Response.json({
      members:(await e.Member.filter({business_id:bid},'member_number',500)).map(member=>({id:member.id,member_number:member.member_number,first_name:member.first_name,last_name:member.last_name,status:member.status,monthly_limit_grams:Number(member.metadata?.monthly_limit_grams)||null})),
      catalog:await e.CscCatalogItem.filter({business_id:bid},'name',200),
      dispensations:await e.CscDispensation.filter({business_id:bid},'-recorded_at',200),
      visits:await e.CscVisit.filter({business_id:bid},'-scheduled_at',200),
      notices:await e.CscNotice.filter({business_id:bid},'-published_at',200),
    });
    return await withBusinessMutation(base44,bid,async()=>{
      if(body.action==='save_catalog'){
        const d=body.item||{}; if(!String(d.name||'').trim())return Response.json({error:'Nombre obligatorio'},{status:400});
        const data={business_id:bid,name:String(d.name).trim(),category:['flower','extract','edible','other'].includes(d.category)?d.category:'other',description:String(d.description||'').slice(0,500),cannabinoid_profile:String(d.cannabinoid_profile||'').slice(0,120),image:d.image||null,availability:['available','limited','unavailable'].includes(d.availability)?d.availability:'available',stock_grams:Math.max(0,Number(d.stock_grams)||0),is_active:d.is_active!==false};
        const item=d.id?await e.CscCatalogItem.update(d.id,data):await e.CscCatalogItem.create(data); return Response.json({ok:true,item});
      }
      if(body.action==='set_catalog_availability'){
        const item=await e.CscCatalogItem.get(body.catalog_item_id); if(!item||item.business_id!==bid)return Response.json({error:'Artículo no encontrado'},{status:404});
        const availability=String(body.availability||''); if(!['available','limited','unavailable'].includes(availability))return Response.json({error:'Disponibilidad no válida'},{status:400});
        const updated=await e.CscCatalogItem.update(item.id,{availability,is_active:body.is_active!==false});
        await createAuditLog(base44,user,'csc.catalog_updated',{business_id:bid,entity_type:'CscCatalogItem',entity_id:item.id,metadata:{availability,is_active:body.is_active!==false}}); return Response.json({ok:true,item:updated});
      }
      if(body.action==='publish_notice'){
        const d=body.notice||{}; if(!d.title||!d.body)return Response.json({error:'Título y mensaje obligatorios'},{status:400});
        const notice=await e.CscNotice.create({business_id:bid,title:String(d.title).slice(0,140),body:String(d.body).slice(0,2000),kind:['notice','assembly','event','safety'].includes(d.kind)?d.kind:'notice',status:'published',published_at:new Date().toISOString(),created_by:user.id}); return Response.json({ok:true,notice});
      }
      if(body.action==='archive_notice'){
        const notice=await e.CscNotice.get(body.notice_id); if(!notice||notice.business_id!==bid)return Response.json({error:'Aviso no encontrado'},{status:404});
        const updated=await e.CscNotice.update(notice.id,{status:'archived'});
        await createAuditLog(base44,user,'csc.notice_archived',{business_id:bid,entity_type:'CscNotice',entity_id:notice.id}); return Response.json({ok:true,notice:updated});
      }
      if(body.action==='schedule_visit'){
        const member=await e.Member.get(body.member_id); if(member.business_id!==bid)return Response.json({error:'Socio no encontrado'},{status:404});
        const at=new Date(body.scheduled_at); if(!Number.isFinite(at.getTime())||at<=new Date())return Response.json({error:'Fecha no válida'},{status:400});
        const visit=await e.CscVisit.create({business_id:bid,member_id:member.id,scheduled_at:at.toISOString(),status:'scheduled',notes:String(body.notes||'').slice(0,500),created_by:user.id}); return Response.json({ok:true,visit});
      }
      if(body.action==='update_visit'){
        const visit=await e.CscVisit.get(body.visit_id); if(!visit||visit.business_id!==bid)return Response.json({error:'Visita no encontrada'},{status:404});
        const status=String(body.status||''); if(!['scheduled','checked_in','completed','cancelled'].includes(status))return Response.json({error:'Estado no válido'},{status:400});
        const updated=await e.CscVisit.update(visit.id,{status});
        await createAuditLog(base44,user,'csc.visit_updated',{business_id:bid,entity_type:'CscVisit',entity_id:visit.id,metadata:{status}}); return Response.json({ok:true,visit:updated});
      }
      if(body.action==='set_member_limit'){
        const member=await e.Member.get(body.member_id); if(!member||member.business_id!==bid)return Response.json({error:'Socio no encontrado'},{status:404});
        const limit=Number(body.monthly_limit_grams); if(!Number.isFinite(limit)||limit<=0||limit>500)return Response.json({error:'Introduce un límite válido entre 0 y 500 g'},{status:400});
        const updated=await e.Member.update(member.id,{metadata:{...(member.metadata||{}),monthly_limit_grams:limit}});
        await createAuditLog(base44,user,'csc.member_limit_updated',{business_id:bid,entity_type:'Member',entity_id:member.id,metadata:{monthly_limit_grams:limit}}); return Response.json({ok:true,member:updated});
      }
      if(body.action==='record_dispensation'){
        const member=await e.Member.get(body.member_id); if(member.business_id!==bid||member.status!=='active')return Response.json({error:'Socio activo no encontrado'},{status:404});
        await requireMemberCompliance(e,bid,member.id);
        const quantity=Number(body.quantity_grams), limit=Number(member.metadata?.monthly_limit_grams);
        const period=periodFor(new Date()), previous=await e.CscDispensation.filter({business_id:bid,member_id:member.id,period});
        const item=body.catalog_item_id?await e.CscCatalogItem.get(body.catalog_item_id):null; if(item&&(item.business_id!==bid||item.is_active===false))return Response.json({error:'Artículo no encontrado'},{status:404});
        let calc; try{calc=calculateDispensation({quantity,limit,previousTotal:previous.reduce((sum,x)=>sum+Number(x.quantity_grams||0),0),stock:item?.stock_grams,availability:item?.availability})}catch(error){return Response.json({error:error.message},{status:error.status||400})}
        const total=calc.periodTotal;
        const row=await e.CscDispensation.create({business_id:bid,member_id:member.id,catalog_item_id:item?.id||null,quantity_grams:quantity,period,period_total_grams:total,limit_grams_snapshot:limit,recorded_at:new Date().toISOString(),recorded_by:user.id,notes:String(body.notes||'').slice(0,500)});
        if(item&&calc.remaining!==null)await e.CscCatalogItem.update(item.id,{stock_grams:calc.remaining,availability:calc.nextAvailability});
        await createAuditLog(base44,user,'csc.dispensation_recorded',{business_id:bid,entity_type:'CscDispensation',entity_id:row.id,metadata:{member_id:member.id,quantity_grams:quantity,period_total_grams:total}}); return Response.json({ok:true,dispensation:row});
      }
      return Response.json({error:'Acción no válida'},{status:400});
    });
  }catch(error){if(error instanceof MutationLockError)return Response.json({error:error.message},{status:error.status});return Response.json({error:error?.message||'No se pudo completar la operación'},{status:error?.status||500});}
}
