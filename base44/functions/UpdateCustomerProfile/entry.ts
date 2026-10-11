import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isCustomer, resolveBusinessBySlug, ensureMembership } from '../../shared/rinno.ts';

// Updates the customer's profile, scoped to a business membership.
// Also keeps the global User profile in sync for display purposes.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });

    const body = await req.json();
    const { slug, first_name, last_name, phone } = body;

    if (!slug) return Response.json({ error: 'Contexto de tienda requerido' }, { status: 400 });
    if (!first_name?.trim() || !phone?.trim()) {
      return Response.json({ error: 'Nombre y teléfono son obligatorios' }, { status: 400 });
    }

    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });

    // Ensure membership exists, then update it
    const membership = await ensureMembership(base44, user.id, business.id, { email: user.email });
    await base44.asServiceRole.entities.Customer.update(membership.id, {
      first_name: first_name.trim(),
      last_name: (last_name || '').trim(),
      phone: phone.trim(),
      whatsapp_phone: phone.trim(),
    });

    // Keep global User profile in sync for display
    const fullName = `${first_name} ${last_name || ''}`.trim();
    await base44.asServiceRole.entities.User.update(user.id, {
      full_name: fullName,
      first_name: first_name.trim(),
      last_name: (last_name || '').trim(),
      phone: phone.trim(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'No se pudo actualizar el perfil' }, { status: 500 });
  }
}