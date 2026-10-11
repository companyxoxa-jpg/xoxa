import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { resolveBusinessBySlug } from '../../shared/rinno.ts';

// Guest order lookup by order_number + (email OR phone), scoped to a business.
// NEVER allows lookup by number alone — requires a matching email or phone.
// Returns a generic error on any mismatch — never reveals whether the order,
// email, or phone exists, or whether it belongs to another business.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { slug, order_number, email, phone } = body;

    if (typeof slug !== 'string' || !slug.trim() || typeof order_number !== 'string' || !order_number.trim() || order_number.length > 128 ||
        (email != null && typeof email !== 'string') || (phone != null && typeof phone !== 'string')) {
      return Response.json({ error: 'No hemos podido encontrar un pedido con esos datos.' }, { status: 400 });
    }
    if (!email && !phone) {
      return Response.json({ error: 'No hemos podido encontrar un pedido con esos datos.' }, { status: 400 });
    }

    // Resolve business server-side — never trust frontend business context
    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) {
      return Response.json({ error: 'No hemos podido encontrar un pedido con esos datos.' }, { status: 404 });
    }

    // Find order by business + order_number
    const orders = await base44.asServiceRole.entities.Order.filter({
      business_id: business.id,
      order_number,
    });

    // Match: email OR phone must match exactly (case-insensitive email, trimmed phone)
    const emailNorm = email ? email.trim().toLowerCase() : null;
    const phoneNorm = phone ? phone.trim().replace(/\s/g, '') : null;

    const order = orders.find(o => {
      const oEmail = (o.customer_email || '').trim().toLowerCase();
      const oPhone = (o.customer_phone || '').trim().replace(/\s/g, '');
      if (emailNorm && oEmail === emailNorm) return true;
      if (phoneNorm && oPhone === phoneNorm) return true;
      return false;
    });

    if (!order) {
      // Generic — never reveal why it didn't match
      return Response.json({ error: 'No hemos podido encontrar un pedido con esos datos.' }, { status: 404 });
    }

    // Return the same shape as TrackOrder for a consistent tracking experience
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id, business_id: business.id });

    return Response.json({
      order_number: order.order_number,
      tracking_token: order.tracking_token,
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
      delivery_city: order.delivery_city,
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
    return Response.json({ error: 'No hemos podido encontrar un pedido con esos datos.' }, { status: 500 });
  }
}
