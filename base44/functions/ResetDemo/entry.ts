import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSuperAdmin, createAuditLog } from '../../shared/rinno.ts';

// Demo reset — cleans ONLY transactional demo data for a specific business.
// Never deletes: Business, BusinessSettings, Categories, Products, FulfillmentSlots, Users, Plans, Subscriptions.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    if (!isSuperAdmin(user)) {
      return Response.json({ error: 'Solo el Super Admin puede restablecer la demo' }, { status: 403 });
    }

    const body = await req.json();
    const { business_id, confirm } = body;

    if (!business_id) {
      return Response.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }
    if (confirm !== "RESET") {
      return Response.json({ error: 'Confirmación requerida' }, { status: 400 });
    }

    // Verify business exists
    let business;
    try {
      business = await base44.asServiceRole.entities.Business.get(business_id);
    } catch (e) {
      return Response.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    // --- Delete orders ---
    const orders = await base44.asServiceRole.entities.Order.filter({ business_id });
    let deletedOrders = 0;
    let deletedItems = 0;
    for (const order of orders) {
      // Delete order items for this order
      const items = await base44.asServiceRole.entities.OrderItem.filter({ order_id: order.id });
      for (const item of items) {
        await base44.asServiceRole.entities.OrderItem.delete(item.id);
        deletedItems++;
      }
      await base44.asServiceRole.entities.Order.delete(order.id);
      deletedOrders++;
    }

    // --- Reset customer metrics (don't delete customers, just reset metrics) ---
    const customers = await base44.asServiceRole.entities.Customer.filter({ business_id });
    let resetCustomers = 0;
    for (const c of customers) {
      await base44.asServiceRole.entities.Customer.update(c.id, {
        total_orders: 0,
        total_spent: 0,
        last_order_at: null,
      });
      resetCustomers++;
    }

    // --- Audit log ---
    await createAuditLog(base44, user, 'demo.reset', {
      business_id, entity_type: 'Business', entity_id: business_id,
      metadata: { business_name: business.business_name, deleted_orders: deletedOrders, deleted_items: deletedItems, reset_customers: resetCustomers },
    });

    return Response.json({
      ok: true,
      deleted_orders: deletedOrders,
      deleted_items: deletedItems,
      reset_customers: resetCustomers,
      message: `Demo restablecida: ${deletedOrders} pedidos eliminados, ${resetCustomers} clientes resetados.`,
    });
  } catch (error) {
    return Response.json({ error: 'No pudimos restablecer la demo.' }, { status: 500 });
  }
}