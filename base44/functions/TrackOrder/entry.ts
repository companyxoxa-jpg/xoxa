import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = body.token;

    if (typeof token !== 'string' || !token.trim() || token.length > 256) {
      return Response.json({ error: "Missing token" }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ tracking_token: token });
    if (orders.length === 0) return Response.json({ error: "Order not found" }, { status: 404 });
    const order = orders[0];

    // Get business name
    const businesses = await base44.asServiceRole.entities.Business.filter({ id: order.business_id });
    const business = businesses[0] || {};

    // Get order items
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id, business_id: order.business_id });

    return Response.json({
      order_number: order.order_number,
      order_status: order.order_status,
      fulfillment_type: order.fulfillment_type,
      scheduled_date: order.scheduled_date,
      scheduled_time_start: order.scheduled_time_start,
      scheduled_time_end: order.scheduled_time_end,
      total: order.total,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      customer_name: order.customer_name,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      created_date: order.created_date,
      delivery_address: order.delivery_address,
      business_name: business.business_name,
      business_slug: business.slug,
      items: orderItems.map(oi => ({
        product_name_snapshot: oi.product_name_snapshot,
        quantity: oi.quantity,
        unit_type: oi.unit_type,
        unit_price: oi.unit_price,
        subtotal: oi.subtotal,
      })),
    });
  } catch (error) {
    return Response.json({ error: "Pedido no encontrado." }, { status: 500 });
  }
}
