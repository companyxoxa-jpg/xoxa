import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { createAuditLog, isCustomer, sanitizeData, resolveBusinessBySlug, ADDRESS_ALLOWLIST } from '../../shared/rinno.ts';

// Manages saved addresses scoped to a business. Each address belongs to
// user_id + business_id. The business is resolved from slug server-side.
// Reads use the user SDK; mutations require explicit ownership and tenant checks.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });
    const owned = address => (address.owner_user_id || address.created_by_id) === user.id;
    const addressesWriter = base44.asServiceRole.entities.SavedAddress;

    const body = await req.json();
    const { action, slug, address_id, address_data } = body;
    if (['update', 'delete'].includes(action) && (typeof address_id !== 'string' || !address_id)) {
      return Response.json({ error: 'ID requerido' }, { status: 400 });
    }

    if (!slug) return Response.json({ error: 'Contexto de tienda requerido' }, { status: 400 });

    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });

    if (action === 'list') {
      // User-scoped SDK returns only this user's addresses; filter by business_id
      const addresses = await base44.entities.SavedAddress.filter({ business_id: business.id }, '-created_date', 50);
      return Response.json({ addresses: addresses.filter(owned) });
    }

    if (action === 'create') {
      if (typeof address_data?.address !== 'string' || !address_data.address.trim()) {
        return Response.json({ error: 'La dirección es obligatoria' }, { status: 400 });
      }
      const sanitized = sanitizeData(address_data, ADDRESS_ALLOWLIST);
      sanitized.business_id = business.id;
      sanitized.owner_user_id = user.id;
      // Unset previous defaults for this business
      if (sanitized.is_default) {
        const existing = await base44.entities.SavedAddress.filter({ business_id: business.id });
        for (const a of existing) {
          if (owned(a) && a.is_default) await addressesWriter.update(a.id, { is_default: false });
        }
      }
      const address = await addressesWriter.create(sanitized);
      await createAuditLog(base44, user, 'customer.address_created', {
        business_id: business.id, entity_type: 'SavedAddress', entity_id: address.id,
      });
      return Response.json({ address });
    }

    if (action === 'update') {
      if (!address_id) return Response.json({ error: 'ID requerido' }, { status: 400 });
      // Verify ownership + business scope before updating
      const existing = await base44.entities.SavedAddress.filter({ id: address_id, business_id: business.id });
      if (!existing.some(owned)) return Response.json({ error: 'Dirección no encontrada' }, { status: 404 });

      const sanitized = sanitizeData(address_data, ADDRESS_ALLOWLIST);
      if (sanitized.is_default) {
        const all = await base44.entities.SavedAddress.filter({ business_id: business.id });
        for (const a of all) {
          if (owned(a) && a.is_default && a.id !== address_id) {
            await addressesWriter.update(a.id, { is_default: false });
          }
        }
      }
      const address = await addressesWriter.update(address_id, sanitized);
      await createAuditLog(base44, user, 'customer.address_updated', {
        business_id: business.id, entity_type: 'SavedAddress', entity_id: address_id,
      });
      return Response.json({ address });
    }

    if (action === 'delete') {
      if (!address_id) return Response.json({ error: 'ID requerido' }, { status: 400 });
      // Verify ownership + business scope before deleting
      const existing = await base44.entities.SavedAddress.filter({ id: address_id, business_id: business.id });
      if (!existing.some(owned)) return Response.json({ error: 'Dirección no encontrada' }, { status: 404 });
      await addressesWriter.delete(address_id);
      await createAuditLog(base44, user, 'customer.address_deleted', {
        business_id: business.id, entity_type: 'SavedAddress', entity_id: address_id,
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'No se pudo procesar la dirección' }, { status: 500 });
  }
}
