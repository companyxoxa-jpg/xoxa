import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isValidTransition, getUserBusinessId, canManageOrders, createAuditLog } from '../../shared/rinno.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    // Authorization: owner or staff (or super admin in support mode)
    if (!canManageOrders(user)) {
      return Response.json({ error: 'No tienes permisos para gestionar pedidos' }, { status: 403 });
    }

    const body = await req.json();
    const { order_id, new_status, rejection_reason } = body;

    if (!order_id || !new_status) {
      return Response.json({ error: 'Parámetros incompletos' }, { status: 400 });
    }

    const bid = getUserBusinessId(user);
    if (!bid) {
      return Response.json({ error: 'Sin negocio asociado' }, { status: 403 });
    }

    // Get order — verify it belongs to the user's business context
    let order;
    try {
      order = await base44.asServiceRole.entities.Order.get(order_id);
    } catch (e) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }
    if (!order || order.business_id !== bid) {
      return Response.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Validate transition
    if (!isValidTransition(order.order_status, new_status)) {
      return Response.json({ error: 'Transición no permitida' }, { status: 400 });
    }

    // Update order status
    const updateData = { order_status: new_status };
    if (new_status === 'rejected' && rejection_reason) {
      updateData.internal_notes = rejection_reason;
    }
    await base44.asServiceRole.entities.Order.update(order_id, updateData);

    // Update customer metrics ONLY on completion
    if (new_status === 'completed') {
      const customers = await base44.asServiceRole.entities.Customer.filter({
        business_id: bid, phone: order.customer_phone,
      });
      if (customers.length > 0) {
        const c = customers[0];
        await base44.asServiceRole.entities.Customer.update(c.id, {
          total_orders: (c.total_orders || 0) + 1,
          total_spent: (c.total_spent || 0) + order.total,
          last_order_at: new Date().toISOString(),
        });
      }
    }

    // Audit log — server-side identity
    await createAuditLog(base44, user, 'order.status_changed', {
      entity_type: 'Order', entity_id: order_id,
      metadata: { from: order.order_status, to: new_status, order_number: order.order_number },
    });

    return Response.json({
      order_id,
      order_number: order.order_number,
      order_status: new_status,
      tracking_token: order.tracking_token,
    });
  } catch (error) {
    return Response.json({ error: 'No pudimos actualizar el pedido. Inténtalo nuevamente.' }, { status: 500 });
  }
}