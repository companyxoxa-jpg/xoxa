import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { isCustomer, resolveBusinessBySlug } from '../../shared/rinno.ts';

// Prepares a reorder from a previous order, scoped to a business.
// Requires: valid session, order ownership, order belongs to resolved business.
// Products are fetched from the CURRENT catalog — prices/availability/minimums
// are always live, never from snapshots. localStorage is NOT authoritative;
// CreateOrder re-validates everything server-side on confirmation.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
    if (!isCustomer(user)) return Response.json({ error: 'Acceso no autorizado' }, { status: 403 });

    const body = await req.json();
    const { order_id, slug } = body;
    if (!order_id || !slug) return Response.json({ error: 'Datos incompletos' }, { status: 400 });

    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });

    const sourceOrder = await base44.asServiceRole.entities.Order.get(order_id);
    // Triple check: ownership + business match
    if (!sourceOrder || sourceOrder.customer_user_id !== user.id || sourceOrder.business_id !== business.id) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const sourceItems = await base44.asServiceRole.entities.OrderItem.filter({ order_id });

    const currentProducts = await base44.asServiceRole.entities.Product.filter({
      business_id: business.id, status: 'active',
    }, 'sort_order', 200);
    const productMap = {};
    currentProducts.forEach(p => { productMap[p.id] = p; });

    const cartItems = [];
    const unavailable = [];
    for (const item of sourceItems) {
      const product = productMap[item.product_id];
      if (!product || !product.is_available) {
        unavailable.push({ product_name: item.product_name_snapshot, reason: 'no_longer_available' });
        continue;
      }
      cartItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        unit_type: product.unit_type,
        unit_label: product.unit_label,
        quantity: item.quantity,
        minimum_quantity: product.minimum_quantity,
        quantity_step: product.quantity_step,
        image: product.image,
        origin: product.origin,
        business_id: product.business_id,
      });
    }

    return Response.json({
      business_slug: business.slug,
      business_name: business.business_name,
      primary_color: business.primary_color || '#16A34A',
      cart_items: cartItems,
      unavailable,
    });
  } catch (error) {
    return Response.json({ error: 'No se pudo preparar el pedido' }, { status: 500 });
  }
}