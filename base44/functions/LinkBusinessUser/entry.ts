import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { assertPlanCapacity, PlanLimitError } from '../../shared/plan-limits.js';
import { isSuperAdmin, createAuditLog } from '../../shared/rinno.ts';

// Links a registered user to a business with a specific RINNO role.
// Used after a user accepts their invitation and registers.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    if (!isSuperAdmin(user)) {
      return Response.json({ error: 'Solo el Super Admin puede vincular usuarios' }, { status: 403 });
    }

    const body = await req.json();
    const { email, business_id, rinno_role } = body;

    if (!email || !business_id || !rinno_role) {
      return Response.json({ error: 'Email, negocio y rol son obligatorios' }, { status: 400 });
    }
    if (!['business_owner', 'business_staff'].includes(rinno_role)) {
      return Response.json({ error: 'Rol no válido' }, { status: 400 });
    }

    // Verify business exists
    let business;
    try {
      business = await base44.asServiceRole.entities.Business.get(business_id);
    } catch (e) {
      return Response.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ error: 'Usuario no encontrado. El usuario debe registrarse primero.' }, { status: 404 });
    }
    const targetUser = users[0];
    if (!business) return Response.json({ error: 'Negocio no encontrado' }, { status: 404 });
    return await withBusinessMutation(base44, business_id, async () => {
    const currentTarget = await base44.asServiceRole.entities.User.get(targetUser.id);
    await assertPlanCapacity(base44, business_id, 'users', currentTarget);

    // Update user with business_id and rinno_role
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      business_id,
      rinno_role,
    });

    // Audit log
    await createAuditLog(base44, user, 'user.role_changed', {
      business_id, entity_type: 'User', entity_id: targetUser.id,
      metadata: { email, rinno_role, business_name: business.business_name },
    });

    return Response.json({
      ok: true,
      user: { id: targetUser.id, email: targetUser.email, full_name: targetUser.full_name },
      rinno_role,
      business_name: business.business_name,
    });
    });
  } catch (error) {
    if (error instanceof MutationLockError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof PlanLimitError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No pudimos vincular el usuario.' }, { status: 500 });
  }
}
