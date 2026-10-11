import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { assertPlanCapacity, PlanLimitError } from '../../shared/plan-limits.js';
import { createAuditLog } from '../../shared/rinno.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const email = String(user.email || '').trim().toLowerCase();
    const invitations = await base44.asServiceRole.entities.TeamInvitation.filter({ email, status: 'pending' });
    if (!invitations[0]) return Response.json({ ok: true, linked: false });
    const invitation = invitations.sort((a, b) => String(b.invited_at).localeCompare(String(a.invited_at)))[0];
    const currentBusiness = user.data?.business_id || user.business_id;
    if (currentBusiness && currentBusiness !== invitation.business_id) return Response.json({ error: 'Tu cuenta ya pertenece a otro negocio' }, { status: 409 });
    return await withBusinessMutation(base44, invitation.business_id, async () => {
      const fresh = await base44.asServiceRole.entities.TeamInvitation.get(invitation.id);
      if (fresh.status !== 'pending') return Response.json({ ok: true, linked: false });
      const currentUser = await base44.asServiceRole.entities.User.get(user.id);
      await assertPlanCapacity(base44, invitation.business_id, 'users', currentUser);
      await base44.asServiceRole.entities.User.update(user.id, { business_id: invitation.business_id, rinno_role: invitation.rinno_role });
      await base44.asServiceRole.entities.TeamInvitation.update(invitation.id, { status: 'accepted', accepted_at: new Date().toISOString() });
      await createAuditLog(base44, user, 'team.invitation_accepted', { business_id: invitation.business_id, entity_type: 'TeamInvitation', entity_id: invitation.id, metadata: { email, rinno_role: invitation.rinno_role } });
      return Response.json({ ok: true, linked: true, business_id: invitation.business_id, rinno_role: invitation.rinno_role });
    });
  } catch (error) {
    if (error instanceof MutationLockError || error instanceof PlanLimitError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: error?.message || 'No se pudo activar la invitación' }, { status: 500 });
  }
}
