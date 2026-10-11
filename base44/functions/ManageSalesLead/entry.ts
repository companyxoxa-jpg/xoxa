import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSuperAdmin, isCommercial, createAuditLog } from '../../shared/rinno.ts';

const clean = (value, max = 200) => String(value || '').trim().slice(0, max);
const normalizeEmail = value => clean(value, 160).toLowerCase();
const STATUSES = new Set(['new', 'contacted', 'demo', 'interested', 'closed']);
const TYPES = new Set(['Frutería', 'Carnicería', 'Barbería', 'Centro de belleza', 'Comercio', 'Social Club', 'Otro']);
const safe = lead => ({ id:lead.id, created_date:lead.created_date, name:lead.name, business_name:lead.business_name, email:lead.email, phone:lead.phone, business_type:lead.business_type, message:lead.message, status:lead.status, assigned_to:lead.assigned_to, source:lead.source, template_id:lead.template_id, internal_notes:lead.internal_notes, last_contact_at:lead.last_contact_at, converted_business_id:lead.converted_business_id, converted_at:lead.converted_at, delivery_status:lead.delivery_status });

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (body.action === 'create') {
      if (clean(body.website)) return Response.json({ ok:true });
      const data = {
        name: clean(body.name,120), business_name: clean(body.business_name,160),
        email: normalizeEmail(body.email), phone: clean(body.phone,40),
        business_type: clean(body.business_type,80), message: clean(body.message,1000),
        source: clean(body.source,120) || 'landing', template_id: clean(body.template_id,80) || null,
        status:'new', assigned_to:null, internal_notes:'', last_contact_at:null,
      };
      if (!data.name || !data.business_name || !/^\S+@\S+\.\S+$/.test(data.email) || data.phone.replace(/\D/g,'').length < 8 || !TYPES.has(data.business_type) || body.consent !== true) {
        return Response.json({ error:'Revisa los datos y acepta el aviso de privacidad.' }, { status:400 });
      }
      const lead = await base44.asServiceRole.entities.SalesLead.create(data);
      return Response.json({ ok:true, id:lead.id });
    }

    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error:'No autenticado' }, { status:401 });
    const admin = isSuperAdmin(user);
    const commercial = !admin && await isCommercial(base44,user);
    if (!admin && !commercial) return Response.json({ error:'Acceso denegado' }, { status:403 });
    const email = normalizeEmail(user.email);
    const all = await base44.asServiceRole.entities.SalesLead.list('-created_date',500);
    if (body.action === 'list') return Response.json({ leads:(admin ? all : all.filter(x=>normalizeEmail(x.assigned_to)===email)).map(safe) });
    if (body.action === 'options') {
      if (!admin) return Response.json({ error:'Acceso denegado' }, { status:403 });
      const records = await base44.asServiceRole.entities.CommercialAccess.filter({status:'active'});
      return Response.json({ commercials:records.map(x=>({email:normalizeEmail(x.email)})) });
    }
    const lead = all.find(x=>x.id===body.id);
    if (!lead) return Response.json({ error:'Solicitud no encontrada' }, { status:404 });
    if (commercial && normalizeEmail(lead.assigned_to)!==email) return Response.json({ error:'Esta solicitud no está asignada a tu cuenta' }, { status:403 });
    if (body.action === 'assign') {
      if (!admin) return Response.json({ error:'Solo Super Admin puede asignar solicitudes' }, { status:403 });
      const assigned = normalizeEmail(body.assigned_to) || null;
      if (assigned) {
        const allowed = await base44.asServiceRole.entities.CommercialAccess.filter({email:assigned,status:'active'});
        if (!allowed.length) return Response.json({ error:'El comercial no está activo' }, { status:400 });
      }
      const updated = await base44.asServiceRole.entities.SalesLead.update(lead.id,{assigned_to:assigned});
      await createAuditLog(base44,user,'sales_lead.assigned',{entity_type:'SalesLead',entity_id:lead.id,metadata:{assigned_to:assigned}});
      return Response.json({ok:true,lead:safe(updated)});
    }
    if (body.action === 'update') {
      const status = clean(body.status,30);
      if (!STATUSES.has(status)) return Response.json({error:'Estado no válido'},{status:400});
      const update = {status,internal_notes:clean(body.internal_notes,2000),last_contact_at:status==='new'?lead.last_contact_at:new Date().toISOString()};
      const updated = await base44.asServiceRole.entities.SalesLead.update(lead.id,update);
      await createAuditLog(base44,user,'sales_lead.updated',{entity_type:'SalesLead',entity_id:lead.id,metadata:{status}});
      return Response.json({ok:true,lead:safe(updated)});
    }
    return Response.json({error:'Acción no válida'},{status:400});
  } catch (error) { return Response.json({error:error?.message || 'No se pudo gestionar la solicitud'},{status:500}); }
}
