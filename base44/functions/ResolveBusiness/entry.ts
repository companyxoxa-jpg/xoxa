import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { resolveBusinessBySlug } from '../../shared/rinno.ts';

// Centralized business resolver — returns branding + minimal info for a storefront.
// Public (no auth required): used by storefront, login, register, account pages.
// Today: resolves by slug. Future: accept hostname for custom-domain routing.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { slug, hostname } = body;

    // Today only slug is supported. Hostname is reserved for future custom-domain routing.
    if (!slug) return Response.json({ error: 'Slug requerido' }, { status: 400 });

    const business = await resolveBusinessBySlug(base44, slug);
    if (!business) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });

    // Block storefront for suspended/cancelled businesses
    if (!['active', 'trial'].includes(business.status)) {
      return Response.json({ error: 'Esta tienda no está disponible temporalmente' }, { status: 403 });
    }

    // Load settings for delivery config (needed by checkout)
    const settingsList = await base44.asServiceRole.entities.BusinessSettings.filter({ business_id: business.id });
    const settings = settingsList[0] || {};

    return Response.json({
      business: {
        id: business.id,
        business_name: business.business_name,
        slug: business.slug,
        logo: business.logo,
        primary_color: business.primary_color || '#16A34A',
        secondary_color: business.secondary_color || '#0284C7',
        address: business.address,
        city: business.city,
        contact_phone: business.contact_phone,
        business_type: business.business_type,
      },
      settings: {
        pickup_enabled: settings.pickup_enabled,
        own_delivery_enabled: settings.own_delivery_enabled,
        delivery_fee: settings.delivery_fee,
        free_delivery_threshold: settings.free_delivery_threshold,
        minimum_order: settings.minimum_order,
        max_future_days: settings.max_future_days,
        min_lead_time_minutes: settings.min_lead_time_minutes,
        online_store_active: settings.online_store_active,
        accept_online_orders: settings.accept_online_orders,
      },
    });
  } catch (error) {
    return Response.json({ error: 'No se pudo cargar la tienda' }, { status: 500 });
  }
}