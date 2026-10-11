import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { createAuditLog, resolveBusinessBySlug, ensureMembership } from '../../shared/rinno.ts';

// JoinStorefront — called after OTP verification (new user) OR when an existing
// customer visits a new business. Creates a CustomerMembership for user_id + business_id.
// Never trusts business_id from frontend — resolves by slug server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { slug, first_name, last_name, phone, marketing_consent } = body;

    if (!slug) return Response.json({ error: 'Contexto de tienda requerido' }, { status: 400 });
    if (!first_name?.trim() || !phone?.trim()) {
      return Response.json({ error: 'Nombre y teléfono son obligatorios' }, { status: 400 });
    }

    // Resolve business server-side
    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
    if (!['active', 'trial'].includes(business.status)) {
      return Response.json({ error: 'Esta tienda no está disponible' }, { status: 403 });
    }

    // Prevent business/admin accounts from becoming customers
    const existingRole = user?.data?.rinno_role || user?.rinno_role;
    if (user.role === 'admin' || ['business_owner', 'business_staff', 'super_admin'].includes(existingRole)) {
      return Response.json({ error: 'Esta cuenta ya tiene un rol asignado' }, { status: 403 });
    }

    const fullName = `${first_name} ${last_name || ''}`.trim();

    // Set customer role + profile on User if not already a customer
    if (existingRole !== 'customer') {
      await base44.asServiceRole.entities.User.update(user.id, {
        rinno_role: 'customer',
        full_name: fullName,
        first_name: first_name.trim(),
        last_name: (last_name || '').trim(),
        phone: phone.trim(),
      });
    } else {
      // Already a customer — just keep User profile in sync
      await base44.asServiceRole.entities.User.update(user.id, {
        full_name: fullName,
        first_name: first_name.trim(),
        last_name: (last_name || '').trim(),
        phone: phone.trim(),
      });
    }

    // Create membership for this business (idempotent)
    const membership = await ensureMembership(base44, user.id, business.id, {
      first_name, last_name, phone, email: user.email, marketing_consent,
    });

    await createAuditLog(base44, { id: user.id, data: { rinno_role: 'customer' } }, 'customer.joined_storefront', {
      business_id: business.id,
      entity_type: 'Customer',
      entity_id: membership.id,
      metadata: { business_slug: business.slug },
    });

    return Response.json({
      success: true,
      business_slug: business.slug,
      business_name: business.business_name,
      membership_id: membership.id,
    });
  } catch (error) {
    return Response.json({ error: 'No se pudo completar el registro' }, { status: 500 });
  }
}
