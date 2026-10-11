import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { generateCredentialToken, hashToken, buildCredentialQrPayload } from '../../shared/associations-credential.js';
import { createAuditLog } from '../../shared/associations.js';
import { requireMemberCompliance } from '../../shared/association-compliance.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    const { slug } = await req.json();
    const business = (await base44.asServiceRole.entities.Business.filter({ slug, status: 'active' }))[0];
    if (!business || business.business_mode !== 'ASSOCIATION') return Response.json({ error: 'Asociación no encontrada' }, { status: 404 });
    const members = await base44.asServiceRole.entities.Member.filter({ business_id: business.id, user_id: user.id });
    if (members.length !== 1 || members[0].status !== 'active') return Response.json({ error: 'No hay un socio activo vinculado a esta cuenta' }, { status: 403 });
    const member = members[0];
    const memberships = await base44.asServiceRole.entities.Membership.filter({ business_id: business.id, member_id: member.id, status: 'active' });
    const today = new Date().toISOString().slice(0, 10);
    if (!memberships.some(m => (!m.start_date || m.start_date <= today) && (!m.end_date || m.end_date >= today))) return Response.json({ error: 'Necesitas una membresía activa para generar el carné' }, { status: 409 });
    await requireMemberCompliance(base44.asServiceRole.entities, business.id, member.id);
    return await withBusinessMutation(base44, business.id, async () => {
      const active = (await base44.asServiceRole.entities.Credential.filter({ business_id: business.id, member_id: member.id, status: 'active' }))[0];
      const token = generateCredentialToken();
      const token_hash = await hashToken(token);
      const now = new Date().toISOString();
      const credential = active
        ? await base44.asServiceRole.entities.Credential.update(active.id, { token_hash, version: Number(active.version || 1) + 1, rotated_at: now })
        : await base44.asServiceRole.entities.Credential.create({ business_id: business.id, member_id: member.id, token_hash, status: 'active', version: 1, issued_at: now, expires_at: null, rotated_at: null, revoked_at: null, revoke_reason: null });
      await createAuditLog(base44, user, active ? 'credential.member_rotated' : 'credential.member_issued', { entity_type: 'Credential', entity_id: credential.id, business_id: business.id, metadata: { member_id: member.id, version: credential.version } });
      return Response.json({ token, qr_payload: buildCredentialQrPayload(token), credential: { id: credential.id, status: credential.status, version: credential.version, expires_at: credential.expires_at || null } });
    });
  } catch (error) {
    if (error instanceof MutationLockError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No se pudo preparar el carné digital' }, { status: 500 });
  }
}
