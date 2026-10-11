import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSuperAdmin, isCommercial, createAuditLog } from '../../shared/rinno.ts';

const normalize = value => String(value || '').trim().toLowerCase();

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const body = await req.json();
    if (body.action === 'current') {
      return Response.json({ role: isSuperAdmin(user) ? 'super_admin' : await isCommercial(base44, user) ? 'commercial' : null });
    }
    if (!isSuperAdmin(user)) return Response.json({ error: 'Solo Super Admin puede gestionar comerciales' }, { status: 403 });
    if (body.action === 'list') {
      const [records,leads,audit]=await Promise.all([base44.asServiceRole.entities.CommercialAccess.list('-invited_at',200),base44.asServiceRole.entities.SalesLead.list('-created_date',1000),base44.asServiceRole.entities.AuditLog.list('-created_date',1000)]);
      return Response.json({ commercials: records.map(record=>({...record,permissions:['Ver y presentar demos','Editar demos','Gestionar sus solicitudes','Completar formularios de alta','Generar cobros de altas asignadas'],assigned_leads:leads.filter(x=>normalize(x.assigned_to)===record.email).length,closed_leads:leads.filter(x=>normalize(x.assigned_to)===record.email&&x.status==='closed').length,last_activity:audit.find(x=>x.actor_user_id===record.user_id)?.created_date||null})) });
    }
    const email = normalize(body.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: 'Correo no válido' }, { status: 400 });
    const existing = await base44.asServiceRole.entities.CommercialAccess.filter({ email });
    if (body.action === 'invite') {
      const data = { email, status: 'active', invited_by: user.id, invited_at: new Date().toISOString(), revoked_at: null };
      const record = existing[0]
        ? await base44.asServiceRole.entities.CommercialAccess.update(existing[0].id, data)
        : await base44.asServiceRole.entities.CommercialAccess.create(data);
      await base44.users.inviteUser(email, 'user');
      await createAuditLog(base44, user, 'commercial.invited', { entity_type: 'CommercialAccess', entity_id: record.id, metadata: { email } });
      return Response.json({ ok: true, commercial: record });
    }
    if (body.action === 'revoke') {
      if (!existing[0]) return Response.json({ error: 'Comercial no encontrado' }, { status: 404 });
      const record = await base44.asServiceRole.entities.CommercialAccess.update(existing[0].id, { status: 'revoked', revoked_at: new Date().toISOString() });
      await createAuditLog(base44, user, 'commercial.revoked', { entity_type: 'CommercialAccess', entity_id: record.id, metadata: { email } });
      return Response.json({ ok: true });
    }
    if (body.action === 'remove') {
      if (!existing[0]) return Response.json({ error: 'Comercial no encontrado' }, { status: 404 });
      await base44.asServiceRole.entities.CommercialAccess.delete(existing[0].id);
      await createAuditLog(base44, user, 'commercial.removed', { entity_type: 'CommercialAccess', entity_id: existing[0].id, metadata: { email } });
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'No se pudo gestionar el comercial' }, { status: 500 });
  }
}
