import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const slug = body.slug;
    if (typeof slug !== 'string' || !slug.trim() || slug.length > 200) return Response.json({ error: "Missing slug" }, { status: 400 });

    const businesses = await base44.asServiceRole.entities.Business.filter({ slug });
    if (businesses.length === 0) return Response.json({ error: "Business not found" }, { status: 404 });
    const business = businesses[0];

    // Block storefront for suspended/cancelled businesses — generic message, no internal reasons
    if (!["active", "trial"].includes(business.status)) {
      return Response.json({ error: "Esta tienda no está disponible temporalmente", store_closed: true }, { status: 403 });
    }

    const bid = business.id;
    const [categories, products, settingsList, slots, publicActivities] = await Promise.all([
      base44.asServiceRole.entities.Category.filter({ business_id: bid, is_active: true }, "sort_order"),
      base44.asServiceRole.entities.Product.filter({ business_id: bid, status: "active" }, "sort_order", 200),
      base44.asServiceRole.entities.BusinessSettings.filter({ business_id: bid }),
      base44.asServiceRole.entities.FulfillmentSlot.filter({ business_id: bid, is_active: true }),
      business.business_mode === 'ASSOCIATION'
        ? base44.asServiceRole.entities.Activity.filter({ business_id: bid }, 'start_at', 50)
            .then(rows => rows.filter(a => a.status === 'published' && a.is_public === true))
        : Promise.resolve([]),
    ]);

    const settings = settingsList[0] || {};

    return Response.json({
      business: {
        business_mode: business.business_mode || 'COMMERCE',
        template_id: business.template_id || 'fresh-classic',
        cover_image: business.cover_image,
        headline: business.headline,
        tagline: business.tagline,
        timezone: business.timezone || 'Europe/Madrid',
        id: business.id,
        business_name: business.business_name,
        slug: business.slug,
        business_type: business.business_type,
        primary_color: business.primary_color,
        secondary_color: business.secondary_color,
        logo: business.logo,
        city: business.city,
        address: business.address,
        whatsapp_phone: business.whatsapp_phone,
        currency: business.currency,
        language: business.language,
        status: business.status,
      },
      categories: categories.map(c => ({
        id: c.id, name: c.name, slug: c.slug, icon: c.icon, sort_order: c.sort_order,
      })),
      products: products.map(p => ({
        business_id: bid,
        id: p.id, name: p.name, slug: p.slug, description: p.description,
        image: p.image,
        category_id: p.category_id, price: p.price, compare_at_price: p.compare_at_price,
        unit_type: p.unit_type, unit_label: p.unit_label,
        minimum_quantity: p.minimum_quantity, quantity_step: p.quantity_step,
        origin: p.origin, is_available: p.is_available, is_featured: p.is_featured,
        sort_order: p.sort_order,
      })),
      settings: {
        accept_online_orders: settings.accept_online_orders,
        online_store_active: settings.online_store_active,
        pickup_enabled: settings.pickup_enabled,
        own_delivery_enabled: settings.own_delivery_enabled,
        minimum_order: settings.minimum_order || 0,
        delivery_fee: settings.delivery_fee || 0,
        free_delivery_threshold: settings.free_delivery_threshold || 0,
        store_message: settings.store_message,
        store_description: settings.store_description,
        cover_image: settings.cover_image,
        allow_scheduled_orders: settings.allow_scheduled_orders,
        max_future_days: settings.max_future_days || 7,
        min_lead_time_minutes: settings.min_lead_time_minutes || 60,
        schedule: settings.schedule || [],
        max_delivery_radius_km: settings.max_delivery_radius_km,
        temporary_notice: settings.temporary_notice,
      },
      slots: slots.map(s => ({
        id: s.id, fulfillment_type: s.fulfillment_type, day_of_week: s.day_of_week,
        start_time: s.start_time, end_time: s.end_time, max_orders: s.max_orders,
      })),
      activities: publicActivities.map(a => ({
        id: a.id, title: a.title, description: a.description, start_at: a.start_at,
        end_at: a.end_at, location: a.location, capacity: a.capacity,
        enrollment_open: a.enrollment_open, enrollment_until: a.enrollment_until,
        is_paid: a.is_paid, price: a.price,
      })),
    });
  } catch (error) {
    return Response.json({ error: "No pudimos cargar la tienda." }, { status: 500 });
  }
}
