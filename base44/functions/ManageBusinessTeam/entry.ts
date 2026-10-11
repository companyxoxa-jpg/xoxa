import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { isSuperAdmin, createAuditLog } from '../../shared/rinno.ts';

const normalize = (value) => String(value || '').trim().toLowerCase();

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isSuperAdmin(user)) return Response.json({ error: 'Solo el Super Admin puede gestionar el equipo' }, { status: 403 });
    const body = await req.json();
    const businessId = String(body.business_id || '');
    if (!businessId) return Response.json({ error: 'Negocio obligatorio' }, { status: 400 });
    const business = await base44.asServiceRole.entities.Business.get(businessId);
    if (!business) return Response.json({ error: 'Negocio no encontrado' }, { status: 404 });

    if (body.action === 'list') {
      const [users, invitations] = await Promise.all([
        base44.asServiceRole.entities.User.filter({ business_id: businessId }),
        base44.asServiceRole.entities.TeamInvitation.filter({ business_id: businessId }),
      ]);
      return Response.json({ users: users.map(u => ({ id: u.id, email: u.email, full_name: u.full_name, rinno_role: u.data?.rinno_role || u.rinno_role })), invitations });
    }

    const email = normalize(body.email);
    if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: 'Correo no válido' }, { status: 400 });
    if (body.action === 'invite') {
      const role = body.rinno_role;
      if (!['business_owner', 'business_staff'].includes(role)) return Response.json({ error: 'Rol no válido' }, { status: 400 });
      const currentUsers = await base44.asServiceRole.entities.User.filter({ email });
      const current = currentUsers[0];
      const currentBid = current?.data?.business_id || current?.business_id;
      if (currentBid && currentBid !== businessId) return Response.json({ error: 'Ese usuario ya pertenece a otro negocio' }, { status: 409 });
      if (currentBid === businessId) return Response.json({ error: 'Ese usuario ya forma parte del equipo' }, { status: 409 });
      const existing = await base44.asServiceRole.entities.TeamInvitation.filter({ business_id: businessId, email });
      const data = { business_id: businessId, email, rinno_role: role, status: 'pending', invited_by: user.id, invited_at: new Date().toISOString(), accepted_at: null, revoked_at: null };
      const invitation = existing[0]
        ? await base44.asServiceRole.entities.TeamInvitation.update(existing[0].id, data)
        : await base44.asServiceRole.entities.TeamInvitation.create(data);
      await base44.users.inviteUser(email, 'user');
      await createAuditLog(base44, user, 'team.invited', { business_id: businessId, entity_type: 'TeamInvitation', entity_id: invitation.id, metadata: { email, rinno_role: role } });
      return Response.json({ ok: true, invitation });
    }
    if (body.action === 'revoke') {
      const existing = await base44.asServiceRole.entities.TeamInvitation.filter({ business_id: businessId, email, status: 'pending' });
      if (!existing[0]) return Response.json({ error: 'Invitación pendiente no encontrada' }, { status: 404 });
      await base44.asServiceRole.entities.TeamInvitation.update(existing[0].id, { status: 'revoked', revoked_at: new Date().toISOString() });
      await createAuditLog(base44, user, 'team.invitation_revoked', { business_id: businessId, entity_type: 'TeamInvitation', entity_id: existing[0].id, metadata: { email } });
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'No se pudo gestionar el equipo' }, { status: 500 });
  }
}
