import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSuperAdmin, getUserBusinessId, createAuditLog } from '../../shared/rinno.ts';

// Manages Super Admin support mode — the BACKEND is the authority.
// Sets/clears support_business_id on the user record via User.update.
// The frontend must NOT call base44.auth.updateMe for support fields.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    if (!isSuperAdmin(user)) {
      return Response.json({ error: 'Solo el Super Admin puede usar el modo soporte' }, { status: 403 });
    }

    const body = await req.json();
    const { action, business_id } = body;

    if (action === 'enter') {
      if (!business_id) {
        return Response.json({ error: 'ID de negocio requerido' }, { status: 400 });
      }
      let business;
      try {
        business = await base44.asServiceRole.entities.Business.get(business_id);
      } catch (e) {
        return Response.json({ error: 'Negocio no encontrado' }, { status: 404 });
      }
      // Backend sets the support context — frontend never does this directly
      await base44.asServiceRole.entities.User.update(user.id, {
        support_business_id: business_id,
        support_business_name: business.business_name,
      });
      await createAuditLog(base44, user, 'support.entered', {
        business_id, entity_type: 'Business', entity_id: business_id,
        metadata: { business_name: business.business_name },
      });
      return Response.json({ ok: true, business_name: business.business_name, business_id });
    }

    if (action === 'exit') {
      const currentBid = getUserBusinessId(user);
      const currentName = user?.data?.support_business_name || user?.support_business_name || null;
      // Backend clears the support context
      await base44.asServiceRole.entities.User.update(user.id, {
        support_business_id: null,
        support_business_name: null,
      });
      await createAuditLog(base44, user, 'support.exited', {
        business_id: currentBid, entity_type: 'Business', entity_id: currentBid,
        metadata: { business_name: currentName },
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'No pudimos procesar el modo soporte.' }, { status: 500 });
  }
}