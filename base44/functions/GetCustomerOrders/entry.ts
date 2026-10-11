import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isCustomer, resolveBusinessBySlug } from '../../shared/rinno.ts';

// Lists orders for the authenticated customer, scoped to a single business.
// business_id is resolved from slug server-side — never trusted from frontend.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });

    const body = await req.json();
    const { slug } = body;
    if (!slug) return Response.json({ error: 'Contexto de tienda requerido' }, { status: 400 });

    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });

    // Orders for this user AND this business only — cross-tenant isolation
    const orders = await base44.asServiceRole.entities.Order.filter(
      { customer_user_id: user.id, business_id: business.id },
      '-created_date',
      50
    );

    const result = orders.map(o => ({
      id: o.id,
      order_number: o.order_number,
      business_id: o.business_id,
      business_name: business.business_name,
      business_slug: business.slug,
      created_date: o.created_date,
      scheduled_date: o.scheduled_date,
      scheduled_time_start: o.scheduled_time_start,
      total: o.total,
      order_status: o.order_status,
      fulfillment_type: o.fulfillment_type,
    }));

    return Response.json({ orders: result });
  } catch (error) {
    return Response.json({ error: 'No se pudieron cargar los pedidos' }, { status: 500 });
  }
}