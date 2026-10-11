import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getUserBusinessId, canManageSlots, createAuditLog, sanitizeData, SLOT_ALLOWLIST } from '../../shared/rinno.ts';

// Manages FulfillmentSlot CRUD — replaces direct frontend entity writes.
// Only business_owner (or super admin in support mode) can manage slots.
// Staff cannot. All slot operations are validated against the user's business_id.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    // Authorization: ONLY owner (or super admin in support mode acting as owner)
    if (!canManageSlots(user)) {
      return Response.json({ error: 'Solo el propietario puede gestionar las franjas de entrega' }, { status: 403 });
    }

    const bid = getUserBusinessId(user);
    if (!bid) {
      return Response.json({ error: 'Sin negocio asociado' }, { status: 403 });
    }

    const body = await req.json();
    const { action, slot_id, slot_data } = body;

    if (action === 'create') {
      if (!slot_data?.fulfillment_type || slot_data?.day_of_week == null || !slot_data?.start_time || !slot_data?.end_time) {
        return Response.json({ error: 'Faltan campos obligatorios de la franja' }, { status: 400 });
      }
      const data = { ...sanitizeData(slot_data, SLOT_ALLOWLIST), business_id: bid };
      const slot = await base44.asServiceRole.entities.FulfillmentSlot.create(data);
      await createAuditLog(base44, user, 'slot.created', { entity_type: 'FulfillmentSlot', entity_id: slot.id });
      return Response.json({ slot });
    }

    if (action === 'update') {
      let slot;
      try {
        slot = await base44.asServiceRole.entities.FulfillmentSlot.get(slot_id);
      } catch (e) {
        return Response.json({ error: 'Franja no encontrada' }, { status: 404 });
      }
      // Tenant isolation — slot must belong to the user's business
      if (!slot || slot.business_id !== bid) {
        return Response.json({ error: 'Franja no encontrada' }, { status: 404 });
      }
      const sanitized = sanitizeData(slot_data, SLOT_ALLOWLIST);
      const updated = await base44.asServiceRole.entities.FulfillmentSlot.update(slot_id, sanitized);
      return Response.json({ slot: updated });
    }

    if (action === 'delete') {
      let slot;
      try {
        slot = await base44.asServiceRole.entities.FulfillmentSlot.get(slot_id);
      } catch (e) {
        return Response.json({ error: 'Franja no encontrada' }, { status: 404 });
      }
      // Tenant isolation — slot must belong to the user's business
      if (!slot || slot.business_id !== bid) {
        return Response.json({ error: 'Franja no encontrada' }, { status: 404 });
      }
      await base44.asServiceRole.entities.FulfillmentSlot.delete(slot_id);
      await createAuditLog(base44, user, 'slot.deleted', { entity_type: 'FulfillmentSlot', entity_id: slot_id });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'No pudimos gestionar la franja. Inténtalo nuevamente.' }, { status: 500 });
  }
}