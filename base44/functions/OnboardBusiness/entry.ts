import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { initializeBusinessTenant } from '../../shared/business-tenant.js';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isSuperAdmin, isCommercial, createAuditLog, CATEGORIES_BY_TYPE, generateSlug, getDefaultSlots, getDefaultSchedule } from '../../shared/rinno.ts';
import { normalizeAssociationSetup, initialAssociationChecklist } from '../../shared/association-onboarding.js';
import { TEMPLATES } from '../../shared/templates.js';
import { validImage } from '../../shared/templates.js';
import { seedInitialBookingSetup, validateInitialBookingSetup } from '../../shared/booking-seed.js';

function cleanSocialLinks(links) {
  if (!links || typeof links !== 'object' || Array.isArray(links)) return {};
  const hosts = { instagram: ['instagram.com', 'www.instagram.com'], threads: ['threads.com', 'www.threads.com'], tiktok: ['tiktok.com', 'www.tiktok.com'] };
  const result = {};
  for (const [key, value] of Object.entries(links)) {
    if (!['instagram', 'threads', 'tiktok'].includes(key) || !value) continue;
    if (typeof value !== 'string' || value.length > 500) throw new Error(`Enlace de ${key} no válido`);
    const url = new URL(value);
    if (url.protocol !== 'https:' || !hosts[key].includes(url.hostname) || url.username || url.password) throw new Error(`Enlace de ${key} no válido`);
    result[key] = url.toString();
  }
  return result;
}

const PRESENTATION_BY_TYPE = {
  fruit_store: { business_mode: 'COMMERCE', template_id: 'fresh-market' },
  butcher: { business_mode: 'COMMERCE', template_id: 'butcher-craft' },
  barber: { business_mode: 'BOOKING', template_id: 'barber-studio' },
  hair_salon: { business_mode: 'BOOKING', template_id: 'barber-studio' },
  beauty: { business_mode: 'BOOKING', template_id: 'beauty-spa' },
  association: { business_mode: 'ASSOCIATION', template_id: 'association-community' },
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { business: bizData, identity, operation, association, plan: planName, owner, lead_id: leadId } = body;
    const admin=isSuperAdmin(user),commercial=!admin&&await isCommercial(base44,user);
    if(!admin&&!commercial)return Response.json({error:'Solo Super Admin o un comercial autorizado pueden completar altas'},{status:403});
    if(commercial&&!leadId)return Response.json({error:'El comercial solo puede completar una oportunidad asignada'},{status:403});

    // --- Validate required fields ---
    if (!bizData?.business_name || !bizData?.business_type) {
      return Response.json({ error: 'Nombre y tipo de negocio son obligatorios' }, { status: 400 });
    }
    if (!owner?.email) {
      return Response.json({ error: 'El email del propietario es obligatorio' }, { status: 400 });
    }
    if (!planName) {
      return Response.json({ error: 'Selecciona un plan' }, { status: 400 });
    }
    const billingExempt = body.billing_exempt === true;
    const exemptionReason = String(body.exemption_reason || '').trim();
    if (billingExempt && !admin) return Response.json({ error: 'Solo Super Admin puede asignar una cortesía' }, { status: 403 });
    if (billingExempt && (exemptionReason.length < 5 || exemptionReason.length > 1000)) return Response.json({ error: 'Indica el motivo de la cortesía (entre 5 y 1000 caracteres)' }, { status: 400 });
    for (const field of ['logo', 'cover_image']) if (identity?.[field] && !validImage(identity[field])) return Response.json({ error: `${field} no es una imagen HTTPS ni un recurso de marca local válido` }, { status: 400 });
    let socialLinks = {};
    try { socialLinks = cleanSocialLinks(operation?.social_links); }
    catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
    let initialBookingSetup = null;
    try { initialBookingSetup = validateInitialBookingSetup(operation?.booking_setup); }
    catch (error) { return Response.json({ error: error.message }, { status: 400 }); }

    let sourceLead = null;
    if (leadId) {
      sourceLead = await base44.asServiceRole.entities.SalesLead.get(leadId);
      if (!sourceLead) return Response.json({ error:'Solicitud comercial no encontrada' }, { status:404 });
      if (sourceLead.converted_business_id) return Response.json({ error:'Esta solicitud ya fue convertida en negocio' }, { status:409 });
      if(commercial&&String(sourceLead.assigned_to||'').trim().toLowerCase()!==String(user.email||'').trim().toLowerCase())return Response.json({error:'Esta oportunidad no está asignada a tu cuenta'},{status:403});
    }

    if(commercial){
      const required=[bizData?.business_name,bizData?.business_type,bizData?.contact_email,bizData?.contact_phone,bizData?.address,bizData?.city,bizData?.province,bizData?.postal_code,identity?.template_id,owner?.first_name,owner?.email,planName];
      if(required.some(value=>!String(value||'').trim()))return Response.json({error:'Completa todos los datos del alta antes de generar el enlace de pago'},{status:400});
    }

    // --- Generate and validate slug ---
    let slug = identity?.slug || generateSlug(bizData.business_name);
    if (!slug) slug = generateSlug(bizData.business_name);

    const existing = await base44.asServiceRole.entities.Business.filter({ slug });
    if (existing.length > 0) {
      return Response.json({ error: 'El slug ya está en uso. Elige otro.' }, { status: 409 });
    }

    // --- Find plan ---
    const plans = await base44.asServiceRole.entities.Plan.filter({ name: planName, active: true });
    if (plans.length === 0) {
      return Response.json({ error: 'Plan no encontrado' }, { status: 400 });
    }
    const plan = plans[0];

    // --- Create Business with the correct customer + establishment model ---
    const defaultPresentation = PRESENTATION_BY_TYPE[bizData.business_type] || { business_mode: 'COMMERCE', template_id: 'retail-store' };
    const requestedTemplate = TEMPLATES.find(t => t.id === identity?.template_id);
    const presentation = requestedTemplate && (requestedTemplate.mode === defaultPresentation.business_mode)
      ? { business_mode:requestedTemplate.mode, template_id:requestedTemplate.id }
      : defaultPresentation;
    const associationSetup = presentation.business_mode === 'ASSOCIATION' ? normalizeAssociationSetup(association) : null;
    const business = await base44.asServiceRole.entities.Business.create({
      business_name: bizData.business_name,
      business_type: bizData.business_type,
      slug,
      contact_email: owner.email,
      contact_phone: bizData.contact_phone || "",
      whatsapp_phone: bizData.whatsapp_phone || bizData.contact_phone || "",
      address: bizData.address || "",
      city: bizData.city || "",
      province: bizData.province || "",
      postal_code: bizData.postal_code || "",
      country: "ES",
      timezone: "Europe/Madrid",
      currency: "EUR",
      language: "es",
      primary_color: identity?.primary_color || "#16A34A",
      secondary_color: identity?.secondary_color || "#0284C7",
      ...(identity?.logo ? { logo: identity.logo } : {}),
      ...(identity?.cover_image ? { cover_image: identity.cover_image } : {}),
      ...(identity?.headline ? { headline: String(identity.headline).slice(0, 240) } : {}),
      ...(identity?.tagline ? { tagline: String(identity.tagline).slice(0, 240) } : {}),
      business_mode: presentation.business_mode,
      template_id: presentation.template_id,
      status: "onboarding",
      plan_id: plan.id,
      subscription_status: billingExempt ? "active" : "none",
    });

    await initializeBusinessTenant(base44.asServiceRole.entities.Business, business);
    const bid = business.id;

    // --- Create BusinessSettings ---
    const fulfillmentTypes = [];
    if (operation?.pickup_enabled !== false) fulfillmentTypes.push("pickup");
    if (operation?.own_delivery_enabled) fulfillmentTypes.push("own_delivery");
    if (fulfillmentTypes.length === 0) fulfillmentTypes.push("pickup");

    const bookingSchedule = Array.isArray(operation?.schedule) ? operation.schedule : null;
    const bookingClosedDates = Array.isArray(operation?.booking_closed_dates) ? [...new Set(operation.booking_closed_dates)] : [];
    if (bookingClosedDates.length > 500 || bookingClosedDates.some(value => typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)))) return Response.json({ error: 'Fechas de cierre no válidas' }, { status: 400 });
    if (bookingSchedule && (bookingSchedule.length > 7 || new Set(bookingSchedule.map(row => row?.day)).size !== bookingSchedule.length || bookingSchedule.some(row => !Number.isInteger(row?.day) || row.day < 0 || row.day > 6 || typeof row.closed !== 'boolean' || (!row.closed && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.morning_open || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(row.morning_close || '') || row.morning_open >= row.morning_close))))) return Response.json({ error: 'Horario semanal no válido' }, { status: 400 });
    for (const closure of bookingClosedDates) if (new Date(`${closure}T12:00:00Z`).toISOString().slice(0, 10) !== closure) return Response.json({ error: 'Fechas de cierre no válidas' }, { status: 400 });

    await base44.asServiceRole.entities.BusinessSettings.create({
      business_id: bid,
      accept_online_orders: presentation.business_mode !== 'ASSOCIATION',
      online_store_active: presentation.business_mode !== 'ASSOCIATION',
      minimum_order: operation?.minimum_order ? Math.round(Number(operation.minimum_order) * 100) : 0,
      min_lead_time_minutes: 60,
      allow_scheduled_orders: true,
      max_future_days: 7,
      pickup_enabled: operation?.pickup_enabled !== false,
      own_delivery_enabled: operation?.own_delivery_enabled || false,
      delivery_fee: operation?.delivery_fee ? Math.round(Number(operation.delivery_fee) * 100) : 0,
      free_delivery_threshold: 0,
      schedule: bookingSchedule || getDefaultSchedule(),
      booking_closed_dates: bookingClosedDates,
      ...(Object.keys(socialLinks).length ? { social_links: socialLinks } : {}),
      store_message: "",
      store_description: "",
      ...(associationSetup ? { association_modules:{memberships:true,fees:true,credential:true,activities:true,communications:true,incidents:true,documents:true,wallet:false} } : {}),
    });

    const bookingSeed = await seedInitialBookingSetup(base44.asServiceRole.entities, bid, initialBookingSetup);

    // --- Create base categories ---
    if(!associationSetup){const catTemplate = CATEGORIES_BY_TYPE[bizData.business_type] || CATEGORIES_BY_TYPE.other;
    await base44.asServiceRole.entities.Category.bulkCreate(catTemplate.map(c => ({ ...c, business_id: bid, is_active: true })));}

    // --- Create initial fulfillment slots ---
    if(!associationSetup){const slots = getDefaultSlots(fulfillmentTypes);
    await base44.asServiceRole.entities.FulfillmentSlot.bulkCreate(slots.map(s => ({ ...s, business_id: bid })));}

    let associationPlan=null;
    if(associationSetup){
      associationPlan=await base44.asServiceRole.entities.MembershipPlan.create({business_id:bid,name:associationSetup.membership_plan_name,code:'annual',description:'Plan inicial creado durante el alta guiada',fee_amount:associationSetup.membership_fee_cents,fee_period:'annual',duration_months:12,auto_renew:false,is_active:true,sort_order:0});
      await base44.asServiceRole.entities.AssociationSetup.create({business_id:bid,minimum_age:associationSetup.minimum_age,default_monthly_limit_grams:associationSetup.default_monthly_limit_grams,membership_plan_id:associationPlan.id,checklist:initialAssociationChecklist(),status:'setup',created_by:user.id,created_at:new Date().toISOString()});
    }

    // --- Create Subscription ---
    const createdAt = new Date().toISOString();
    await base44.asServiceRole.entities.Subscription.create({
      business_id: bid,
      plan_id: plan.id,
      status: billingExempt ? "active" : "pending",
      start_date: createdAt,
      ...(billingExempt ? { billing_exempt: true, exemption_reason: exemptionReason, exempted_at: createdAt, exempted_by: user.id, setup_amount: 0, monthly_amount: 0 } : {}),
    });

    // --- Invite owner ---
    let invited = false;
    let inviteError = null;
    try {
      await base44.asServiceRole.entities.TeamInvitation.create({
        business_id: bid,
        email: String(owner.email).trim().toLowerCase(),
        rinno_role: 'business_owner',
        status: 'pending',
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      });
      await base44.users.inviteUser(owner.email, "user");
      invited = true;
    } catch (e) {
      inviteError = e.message || String(e);
    }

    // --- Audit log ---
    await createAuditLog(base44, user, 'business.created', {
      business_id: bid,
      entity_type: 'Business', entity_id: bid,
      metadata: { business_name: business.business_name, slug, plan: planName, owner_email: owner.email, invited, association_setup:!!associationSetup, created_by:admin?'super_admin':'commercial', billing_exempt: billingExempt, ...(billingExempt ? { exemption_reason: exemptionReason } : {}) },
    });

    if (sourceLead) {
      await base44.asServiceRole.entities.SalesLead.update(sourceLead.id,{status:'closed',converted_business_id:bid,converted_at:new Date().toISOString(),delivery_status:'configuring',last_contact_at:new Date().toISOString()});
      await createAuditLog(base44,user,'sales_lead.converted',{business_id:bid,entity_type:'SalesLead',entity_id:sourceLead.id,metadata:{business_id:bid}});
    }

    return Response.json({
      ok: true,
      business,
      plan: plan.name,
      billing_exempt: billingExempt,
      booking_setup: { services: bookingSeed.services.length, professionals: bookingSeed.professionals.length },
      owner_invited: invited,
      owner_invite_error: inviteError,
      association_setup: associationSetup ? { minimum_age:associationSetup.minimum_age, default_monthly_limit_grams:associationSetup.default_monthly_limit_grams, membership_plan_id:associationPlan.id, checklist:initialAssociationChecklist() } : null,
      message: invited
        ? `Negocio creado. Invitación enviada a ${owner.email}; el acceso se activará al entrar.`
        : `Negocio creado. La invitación queda pendiente para ${owner.email}.`,
    });
  } catch (error) {
    return Response.json({ error: 'No pudimos crear el negocio. ' + (error.message || '') }, { status: 500 });
  }
}
