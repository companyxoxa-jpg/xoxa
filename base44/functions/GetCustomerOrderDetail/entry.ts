import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isCustomer, resolveBusinessBySlug } from '../../shared/rinno.ts';

// Returns order detail for an authenticated customer, scoped to a business.
// ALL of these must hold: valid session, order.customer_user_id === user.id,
// order.business_id === resolved business. Any failure → generic 404.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });

    const body = await req.json();
    const { order_id, slug } = body;
    if (!order_id || !slug) return Response.json({ error: 'Datos incompletos' }, { status: 400 });

    // Resolve business — the order MUST belong to this business
    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const order = await base44.asServiceRole.entities.Order.get(order_id);

    // Triple check: ownership + business match — any failure is a generic 404
    if (!order || order.customer_user_id !== user.id || order.business_id !== business.id) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const [items, businessInfo] = await Promise.all([
      base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id }),
      base44.asServiceRole.entities.Business.get(order.business_id),
    ]);

    return Response.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        tracking_token: order.tracking_token,
        created_date: order.created_date,
        scheduled_date: order.scheduled_date,
        scheduled_time_start: order.scheduled_time_start,
        scheduled_time_end: order.scheduled_time_end,
        order_status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        fulfillment_type: order.fulfillment_type,
        delivery_address: order.delivery_address,
        delivery_city: order.delivery_city,
        delivery_postal_code: order.delivery_postal_code,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        total: order.total,
        customer_notes: order.customer_notes,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
      },
      items: items.map(i => ({
        product_id: i.product_id,
        product_name_snapshot: i.product_name_snapshot,
        product_image_snapshot: i.product_image_snapshot,
        quantity: i.quantity,
        unit_type: i.unit_type,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      })),
      business: {
        business_name: businessInfo?.business_name,
        slug: businessInfo?.slug,
        address: businessInfo?.address,
        contact_phone: businessInfo?.contact_phone,
      },
    });
  } catch (error) {
    return Response.json({ error: 'No se pudo cargar el pedido' }, { status: 500 });
  }
}