import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isCustomer, ensureMembership, readAuthenticatedUser } from '../../shared/rinno.ts';
import { wallToUTC, zonedParts } from '../../shared/booking.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await readAuthenticatedUser(base44);
    if (!authUser) {
      return Response.json({ error: "Inicia sesión como cliente para realizar el pedido" }, { status: 401 });
    }
    if (!isCustomer(authUser)) {
      return Response.json({ error: "Esta cuenta no tiene permisos para realizar pedidos como cliente" }, { status: 403 });
    }

    const body = await req.json();

    const { slug, items, fulfillment_type, scheduled_date, scheduled_time_start, scheduled_time_end, customer, payment_method, marketing_consent } = body;

    // --- Validate required fields ---
    if (typeof slug !== 'string' || !slug.trim() || slug.length > 200 || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Faltan productos en el carrito" }, { status: 400 });
    }
    if (!fulfillment_type || !scheduled_date || !scheduled_time_start || !scheduled_time_end) {
      return Response.json({ error: "Falta información de entrega" }, { status: 400 });
    }
    if (!customer || !customer.first_name || !customer.phone) {
      return Response.json({ error: "Nombre y teléfono son obligatorios" }, { status: 400 });
    }
    if (!payment_method) {
      return Response.json({ error: "Selecciona un método de pago" }, { status: 400 });
    }
    if (fulfillment_type === "own_delivery" && !customer.address) {
      return Response.json({ error: "La dirección es obligatoria para entrega a domicilio" }, { status: 400 });
    }

    // --- Get business ---
    const businesses = await base44.asServiceRole.entities.Business.filter({ slug });
    if (businesses.length === 0) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    const business = businesses[0];
    // Block orders for suspended/cancelled — generic message
    if (!["active", "trial"].includes(business.status)) {
      return Response.json({ error: "Esta tienda no está disponible temporalmente" }, { status: 403 });
    }
    const bid = business.id;

    // --- Get settings ---
    const settingsList = await base44.asServiceRole.entities.BusinessSettings.filter({ business_id: bid });
    const settings = settingsList[0];
    if (!settings || !settings.accept_online_orders || !settings.online_store_active) {
      return Response.json({ error: "Pedidos online no disponibles" }, { status: 403 });
    }

    // --- Validate fulfillment type ---
    if (fulfillment_type === "pickup" && !settings.pickup_enabled) {
      return Response.json({ error: "Recogida no disponible" }, { status: 400 });
    }
    if (fulfillment_type === "own_delivery" && !settings.own_delivery_enabled) {
      return Response.json({ error: "Entrega a domicilio no disponible" }, { status: 400 });
    }

    // --- Validate payment method ---
    if (!["cash_on_delivery", "card_on_delivery"].includes(payment_method)) {
      return Response.json({ error: "Método de pago no válido" }, { status: 400 });
    }

    // --- Validate scheduling window (server-side) ---
    const now = new Date();
    const timezone = business.timezone || 'Europe/Madrid';
    let scheduledInstant;
    try { scheduledInstant = wallToUTC(scheduled_date, scheduled_time_start, timezone); } catch { scheduledInstant = null; }
    if (scheduledInstant === null) {
      return Response.json({ error: "Datos del pedido no válidos." }, { status: 400 });
    }
    const scheduledDateTime = new Date(scheduledInstant);
    const minLeadTime = settings.min_lead_time_minutes || 60;
    const minDateTime = new Date(now.getTime() + minLeadTime * 60000);
    if (scheduledDateTime < minDateTime) {
      return Response.json({ error: "El horario seleccionado es demasiado próximo" }, { status: 400 });
    }
    const maxFutureDays = settings.max_future_days || 7;
    const maxDate = new Date(`${zonedParts(now, timezone).date}T12:00:00Z`);
    maxDate.setUTCDate(maxDate.getUTCDate() + maxFutureDays);
    if (scheduled_date > maxDate.toISOString().slice(0, 10)) {
      return Response.json({ error: "El horario seleccionado no está disponible" }, { status: 400 });
    }

    // --- Get all products and validate prices server-side ---
    const allProducts = await base44.asServiceRole.entities.Product.filter({ business_id: bid, status: "active" }, "sort_order", 200);
    const productMap = {};
    allProducts.forEach(p => productMap[p.id] = p);

    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = productMap[item.product_id];
      if (!product) {
        return Response.json({ error: "Producto no encontrado en el catálogo" }, { status: 400 });
      }
      if (!product.is_available) {
        return Response.json({ error: `${product.name} ya no está disponible` }, { status: 400 });
      }
      // Safe Number conversion — reject NaN, Infinity, <= 0
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return Response.json({ error: `Cantidad no válida para ${product.name}` }, { status: 400 });
      }
      const minQty = product.minimum_quantity || 0.5;
      if (qty < minQty) {
        return Response.json({ error: `Cantidad mínima para ${product.name} es ${minQty}` }, { status: 400 });
      }
      // Validate quantity_step alignment
      const step = product.quantity_step || 0.5;
      if (step > 0) {
        const remainder = ((qty - minQty) % step + step) % step;
        if (remainder > 0.01 && Math.abs(remainder - step) > 0.01) {
          return Response.json({ error: `La cantidad para ${product.name} debe ir de ${step} en ${step}` }, { status: 400 });
        }
      }
      const itemSubtotal = Math.round(qty * product.price);
      subtotal += itemSubtotal;
      orderItems.push({
        product_id: product.id,
        product_name_snapshot: product.name,
        product_image_snapshot: product.image || "",
        quantity: qty,
        unit_type: product.unit_type,
        unit_price: product.price,
        subtotal: itemSubtotal,
      });
    }

    // --- Check minimum order ---
    if (settings.minimum_order && subtotal < settings.minimum_order) {
      const diff = settings.minimum_order - subtotal;
      return Response.json({ error: `Te faltan ${(diff / 100).toFixed(2).replace(".", ",")} € para alcanzar el pedido mínimo` }, { status: 400 });
    }

    // --- Calculate delivery fee (server-side) ---
    let deliveryFee = 0;
    if (fulfillment_type === "own_delivery") {
      deliveryFee = settings.delivery_fee || 0;
      if (settings.free_delivery_threshold && subtotal >= settings.free_delivery_threshold) {
        deliveryFee = 0;
      }
    }
    const total = subtotal + deliveryFee;

    // --- Validate slot ---
    const dayOfWeek = new Date(scheduled_date + "T12:00:00Z").getUTCDay();
    const slots = await base44.asServiceRole.entities.FulfillmentSlot.filter({
      business_id: bid, fulfillment_type, is_active: true,
    });
    const matchingSlot = slots.find(s =>
      s.day_of_week === dayOfWeek &&
      s.start_time === scheduled_time_start &&
      s.end_time === scheduled_time_end
    );
    if (!matchingSlot) {
      return Response.json({ error: "El horario seleccionado no está disponible" }, { status: 400 });
    }

    // --- Check slot capacity ---
    const existingOrders = await base44.asServiceRole.entities.Order.filter({
      business_id: bid,
      fulfillment_type,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
    });
    const activeOrders = existingOrders.filter(o => !["cancelled", "rejected"].includes(o.order_status));
    if (activeOrders.length >= matchingSlot.max_orders) {
      return Response.json({ error: "Este horario acaba de completarse. Elige otro disponible." }, { status: 409 });
    }

    // --- Generate order number ---
    const existingCount = await base44.asServiceRole.entities.Order.filter({ business_id: bid });
    const orderNum = existingCount.length + 1001;
    const prefix = slug.split("-").map(w => w[0]).join("").toUpperCase().slice(0, 3);
    const order_number = `${prefix}-${orderNum}`;

    // --- Generate tracking token ---
    const tracking_token = crypto.randomUUID();

    // --- Create order ---
    const order = await base44.asServiceRole.entities.Order.create({
      business_id: bid,
      order_number,
      tracking_token,
      customer_name: customer.first_name + (customer.last_name ? " " + customer.last_name : ""),
      customer_phone: customer.phone,
      customer_email: customer.email || null,
      customer_user_id: authUser.id,
      fulfillment_type,
      delivery_address: fulfillment_type === "own_delivery" ? customer.address : null,
      delivery_city: fulfillment_type === "own_delivery" ? (customer.city || null) : null,
      delivery_postal_code: fulfillment_type === "own_delivery" ? (customer.postal_code || null) : null,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      subtotal,
      delivery_fee: deliveryFee,
      discount: 0,
      tax: 0,
      total,
      payment_method,
      payment_status: "pending",
      order_status: "pending",
      customer_notes: customer.notes || null,
      marketing_consent: marketing_consent || false,
    });

    // --- Create order items with snapshots ---
    await base44.asServiceRole.entities.OrderItem.bulkCreate(
      orderItems.map(oi => ({ ...oi, order_id: order.id, business_id: bid }))
    );

    // --- Create or update customer membership (metrics updated on order completion, not creation) ---
    await ensureMembership(base44, authUser.id, bid, {
      first_name: customer.first_name, last_name: customer.last_name || "",
      phone: customer.phone, email: customer.email, marketing_consent,
    });

    return Response.json({
      order_id: order.id,
      order_number,
      total,
      order_status: "pending",
    });
  } catch (error) {
    // Sanitized error — no internal details leaked to client
    return Response.json({ error: "No se pudo procesar el pedido." }, { status: 500 });
  }
}
