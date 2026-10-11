import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { createAuditLog, isCustomer, resolveBusinessBySlug, ensureMembership } from '../../shared/rinno.ts';

// Links guest orders to the authenticated user, scoped to a single business.
// Only finds orders where business_id = resolved AND customer_email = verified email
// AND customer_user_id is null. Never touches orders from other businesses.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });

    const body = await req.json();
    const { action, slug } = body;
    if (!slug) return Response.json({ error: 'Contexto de tienda requerido' }, { status: 400 });

    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });

    // Ensure a membership exists for this user + business
    const membership = await ensureMembership(base44, user.id, business.id, { email: user.email });

    const email = user.email;
    if (!email) return Response.json({ error: 'Sin email verificado' }, { status: 400 });

    // Find guest orders ONLY for this business + this email
    const guestOrders = await base44.asServiceRole.entities.Order.filter({
      business_id: business.id,
      customer_email: email,
    });
    const unlinked = guestOrders.filter(o => !o.customer_user_id);

    if (action === 'check') {
      return Response.json({
        found_count: unlinked.length,
        business_name: business.business_name,
        orders: unlinked.map(o => ({
          order_number: o.order_number,
          created_date: o.created_date,
          total: o.total,
        })),
      });
    }

    if (action === 'link') {
      let linked = 0;
      for (const o of unlinked) {
        if (o.customer_email === email && !o.customer_user_id && o.business_id === business.id) {
          await base44.asServiceRole.entities.Order.update(o.id, { customer_user_id: user.id });
          linked++;
        }
      }
      await createAuditLog(base44, user, 'customer.previous_orders_linked', {
        business_id: business.id, entity_type: 'Order',
        metadata: { linked_count: linked, business_slug: business.slug },
      });
      return Response.json({ linked_count: linked });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'No se pudieron vincular los pedidos' }, { status: 500 });
  }
}