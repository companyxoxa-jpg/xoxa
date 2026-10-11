import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { resolveBusinessBySlug, getUserBusinessId, createAuditLog } from '../../shared/rinno.ts';
import { requirePermission, resolveAssociationRole, canReadAssociationDocument } from '../../shared/associations.js';

export default async function(req){
 try{
  const base44=createClientFromRequest(req),user=await readAuthenticatedUser(base44);if(!user)return Response.json({error:'No autenticado'},{status:401});const body=await req.json(),e=base44.asServiceRole.entities;
  let bid=null,member=null;
  if(body.slug){const business=await resolveBusinessBySlug(base44,body.slug);if(!business||business.business_mode!=='ASSOCIATION')return Response.json({error:'Asociación no encontrada'},{status:404});bid=business.id;member=(await e.Member.filter({business_id:bid,user_id:user.id}))[0];if(!member||member.status!=='active')return Response.json({error:'Socio no autorizado'},{status:403});}
  else{bid=getUserBusinessId(user);if(!bid)return Response.json({error:'Asociación no encontrada'},{status:404});await requirePermission(base44,user,bid,'association.records.read');}
  const document=await e.AssociationDocument.get(body.document_id);if(!document||document.business_id!==bid||document.status!=='published')return Response.json({error:'Documento no encontrado'},{status:404});
  if((member&&document.audience!=='members')||(!member&&!canReadAssociationDocument(await resolveAssociationRole(base44,user,bid),document)))return Response.json({error:'Documento no disponible'},{status:403});
  await createAuditLog(base44,user,'association.document_viewed',{business_id:bid,entity_type:'AssociationDocument',entity_id:document.id,metadata:{member_id:member?.id||null,audience:document.audience}});
  return Response.json({document:{id:document.id,title:document.title,description:document.description,category:document.category,content:document.protected_content||null,legacy_url:document.storage_mode==='legacy_url'||(!document.storage_mode&&document.file_url)?document.file_url:null}});
 }catch(error){return Response.json({error:error?.message||'No se pudo abrir el documento'},{status:error?.status||500});}
}
