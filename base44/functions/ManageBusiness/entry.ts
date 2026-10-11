import { readAuthenticatedUser } from '../../shared/rinno.ts';
import { withBusinessMutation, MutationLockError } from '../../shared/business-mutation.js';
import { createClientFromRequest } from 'npm:@base44/sdk';
import { validatePresentation, validateAppearanceConfig, validImage } from '../../shared/templates.js';
import { isSuperAdmin, isCommercial, isBusinessOwner, getUserBusinessId, createAuditLog } from '../../shared/rinno.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await readAuthenticatedUser(base44);
    if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json();
    const { action, business_id, status, business_data } = body;
    const superAdmin = isSuperAdmin(user);
    const commercial = !superAdmin && await isCommercial(base44, user);
    const ownerAction = ['launch_summary','submit_review'].includes(body.action) && isBusinessOwner(user) && getUserBusinessId(user) === business_id;
    if (!superAdmin && !commercial && !ownerAction) return Response.json({ error: 'Acceso denegado' }, { status: 403 });
    if (commercial && action !== 'update') return Response.json({ error: 'El perfil comercial solo puede editar demos' }, { status: 403 });

    if (!business_id) {
      return Response.json({ error: 'ID de negocio requerido' }, { status: 400 });
    }

    return await withBusinessMutation(base44, business_id, async () => {
    let business;
    try {
      business = await base44.asServiceRole.entities.Business.get(business_id);
    } catch (e) {
      return Response.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }
    const isDemo = !!business.demo_key || /^rinno-demo-\d+$/i.test(business.slug || '');
    if (commercial && !isDemo) return Response.json({ error: 'Los comerciales solo pueden editar demos' }, { status: 403 });

    if (action === 'set_courtesy') {
      if (!superAdmin) return Response.json({ error: 'Solo Super Admin puede asignar una cortesía' }, { status: 403 });
      if (isDemo) return Response.json({ error: 'La cortesía solo se asigna a un negocio real' }, { status: 409 });
      if (String(body.confirm_name || '').trim() !== String(business.business_name || '').trim()) return Response.json({ error: 'Escribe el nombre exacto del negocio para confirmar' }, { status: 400 });
      const reason = String(body.reason || '').trim();
      if (reason.length < 5 || reason.length > 1000) return Response.json({ error: 'Indica el motivo de la cortesía (entre 5 y 1000 caracteres)' }, { status: 400 });
      if (!business.published_at || business.launch_review_status !== 'published') return Response.json({ error: 'Publica primero el negocio y completa la revisión de lanzamiento' }, { status: 409 });
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ business_id });
      if (subscriptions.length !== 1) return Response.json({ error: 'Revisa la suscripción antes de asignar la cortesía' }, { status: 409 });
      const subscription = subscriptions[0];
      if (subscription.billing_exempt === true) return Response.json({ ok: true, already_exempt: true });
      if (subscription.provider || subscription.external_subscription_id || subscription.external_customer_id || subscription.checkout_session_id || subscription.checkout_url) return Response.json({ error: 'Hay una referencia Stripe activa o pendiente; concíliala antes de cambiar la facturación' }, { status: 409 });
      if (!business.plan_id || !await base44.asServiceRole.entities.Plan.get(business.plan_id)) return Response.json({ error: 'Asigna un plan válido antes de activar la cortesía' }, { status: 409 });
      const exemptedAt = new Date().toISOString();
      await base44.asServiceRole.entities.Subscription.update(subscription.id, { status: 'active', billing_exempt: true, exemption_reason: reason, exempted_at: exemptedAt, exempted_by: user.id, setup_amount: 0, monthly_amount: 0, checkout_url: null, checkout_session_id: null, checkout_expires_at: null, last_payment_status: null });
      await base44.asServiceRole.entities.Business.update(business_id, { status: 'active', subscription_status: 'active' });
      await createAuditLog(base44, user, 'billing.courtesy_enabled', { business_id, entity_type: 'Subscription', entity_id: subscription.id, metadata: { reason } });
      return Response.json({ ok: true, billing_exempt: true, status: 'active' });
    }

    if (action === 'archive' || action === 'restore') {
      if (!superAdmin) return Response.json({ error: 'Solo Super Admin puede retirar o restaurar negocios' }, { status: 403 });
      const confirmed = String(body.confirm_name || '').trim();
      if (confirmed !== String(business.business_name || '').trim()) return Response.json({ error: 'Escribe el nombre exacto del negocio para confirmar' }, { status: 400 });
      const archive = action === 'archive';
      const patch = archive
        ? { archived_at: new Date().toISOString(), archived_by: user.id, status: 'cancelled', published_at: null }
        : { archived_at: null, archived_by: null, status: 'onboarding', launch_review_status: 'draft' };
      await base44.asServiceRole.entities.Business.update(business_id, patch);
      await createAuditLog(base44, user, archive ? 'business.archived' : 'business.restored', {
        business_id, entity_type: 'Business', entity_id: business_id,
        metadata: { business_name: business.business_name, demo: isDemo },
      });
      return Response.json({ ok: true, archived: archive });
    }

    if (['launch_summary','submit_review','request_changes','approve_review','publish'].includes(action)) {
      if (isDemo || (!superAdmin && !ownerAction)) return Response.json({error:'Acceso denegado'},{status:403});
      const [settings,products,services,plans,team,invitations,slots,professionals,associationSetup,orders,appointments,members]=await Promise.all([
        base44.asServiceRole.entities.BusinessSettings.filter({business_id}),
        base44.asServiceRole.entities.Product.filter({business_id,status:'active'}),
        base44.asServiceRole.entities.BookingService.filter({business_id,active:true}),
        base44.asServiceRole.entities.MembershipPlan.filter({business_id,is_active:true}),
        base44.asServiceRole.entities.User.filter({business_id,rinno_role:'business_owner'}),
        base44.asServiceRole.entities.TeamInvitation.filter({business_id,rinno_role:'business_owner',status:'pending'}),
        base44.asServiceRole.entities.FulfillmentSlot.filter({business_id,is_active:true}),
        base44.asServiceRole.entities.BookingProfessional.filter({business_id,active:true}),
        base44.asServiceRole.entities.AssociationSetup.filter({business_id}),
        base44.asServiceRole.entities.Order.filter({business_id},'-created_date',1),
        base44.asServiceRole.entities.Appointment.filter({business_id},'-created_date',1),
        base44.asServiceRole.entities.Member.filter({business_id},'-joined_at',1),
      ]);
      const contentReady=business.business_mode==='BOOKING'?services.length>0:business.business_mode==='ASSOCIATION'?plans.length>0:products.length>0;
      const operationReady=business.business_mode==='BOOKING'?professionals.some(p=>(p.service_ids||[]).length>0&&(p.schedule||[]).length>0):business.business_mode==='ASSOCIATION'?associationSetup.length>0:slots.length>0&&settings.some(s=>s.accept_online_orders&&s.online_store_active);
      const checks=[
        {key:'identity',label:'Logo, portada y mensaje',ok:!!business.logo&&!!business.cover_image&&!!business.headline},
        {key:'contact',label:'Correo y teléfono de contacto',ok:!!business.contact_email&&!!business.contact_phone},
        {key:'settings',label:'Configuración operativa',ok:settings.length>0},
        {key:'content',label:business.business_mode==='BOOKING'?'Servicios publicados':business.business_mode==='ASSOCIATION'?'Plan de socios activo':'Productos publicados',ok:contentReady},
        {key:'journey',label:business.business_mode==='BOOKING'?'Profesional, agenda y servicio conectados':business.business_mode==='ASSOCIATION'?'Configuración legal y operativa del club':'Pedidos online y franjas de entrega preparados',ok:operationReady},
        {key:'owner',label:'Propietario con acceso',ok:team.length>0},
      ];
      const ready=checks.every(x=>x.ok);
      const reviewStatus=business.published_at?'published':business.launch_review_status||'draft';
      const deliveryStatus=reviewStatus==='changes_requested'?'configuring':ready?'ready':team.length?'configuring':'waiting_owner';
      const lead=await base44.asServiceRole.entities.SalesLead.filter({converted_business_id:business_id});
      if(lead[0]) await base44.asServiceRole.entities.SalesLead.update(lead[0].id,{delivery_status:business.published_at?'published':deliveryStatus});
      const firstActivity=business.business_mode==='BOOKING'?appointments.length>0:business.business_mode==='ASSOCIATION'?members.length>0:orders.length>0;
      const milestones=[{key:'owner',label:'Propietario activado',ok:team.length>0},{key:'content',label:business.business_mode==='BOOKING'?'Primer servicio':'Primer contenido',ok:contentReady},{key:'activity',label:business.business_mode==='BOOKING'?'Primera reserva':business.business_mode==='ASSOCIATION'?'Primer socio':'Primer pedido',ok:firstActivity}];
      const review={status:reviewStatus,notes:business.launch_review_notes||null,submitted_at:business.launch_review_submitted_at||null,reviewed_at:business.launch_reviewed_at||null};
      if(action==='launch_summary') return Response.json({checks,milestones,ready,progress:Math.round(checks.filter(x=>x.ok).length/checks.length*100),delivery_status:business.published_at?'published':deliveryStatus,pending_owner_invitation:invitations.length>0,published_at:business.published_at||null,review});
      if(action==='submit_review'){
        if(!ready)return Response.json({error:'Completa todos los requisitos antes de enviar la revisión',checks},{status:409});
        if(['submitted','approved','published'].includes(reviewStatus))return Response.json({error:'La revisión ya está enviada'},{status:409});
        const now=new Date().toISOString();
        await base44.asServiceRole.entities.Business.update(business_id,{launch_review_status:'submitted',launch_review_notes:null,launch_review_submitted_at:now,launch_reviewed_at:null,launch_reviewed_by:null});
        await createAuditLog(base44,user,'business.review_submitted',{business_id,entity_type:'Business',entity_id:business_id});
        return Response.json({ok:true,status:'submitted',submitted_at:now});
      }
      if(action==='request_changes'){
        if(reviewStatus!=='submitted')return Response.json({error:'La revisión no está pendiente de evaluación'},{status:409});
        const notes=String(body.notes||'').trim();
        if(notes.length<5||notes.length>2000)return Response.json({error:'Explica las correcciones necesarias (entre 5 y 2000 caracteres)'},{status:400});
        const now=new Date().toISOString();
        await base44.asServiceRole.entities.Business.update(business_id,{launch_review_status:'changes_requested',launch_review_notes:notes,launch_reviewed_at:now,launch_reviewed_by:user.id});
        if(lead[0])await base44.asServiceRole.entities.SalesLead.update(lead[0].id,{delivery_status:'configuring'});
        await createAuditLog(base44,user,'business.changes_requested',{business_id,entity_type:'Business',entity_id:business_id,metadata:{notes}});
        return Response.json({ok:true,status:'changes_requested'});
      }
      if(action==='approve_review'){
        if(!ready)return Response.json({error:'El negocio ya no cumple todos los requisitos',checks},{status:409});
        if(reviewStatus!=='submitted')return Response.json({error:'El propietario debe enviar primero la revisión'},{status:409});
        const now=new Date().toISOString();
        await base44.asServiceRole.entities.Business.update(business_id,{launch_review_status:'approved',launch_review_notes:null,launch_reviewed_at:now,launch_reviewed_by:user.id});
        await createAuditLog(base44,user,'business.review_approved',{business_id,entity_type:'Business',entity_id:business_id});
        return Response.json({ok:true,status:'approved'});
      }
      if(!ready) return Response.json({error:'Completa todos los requisitos antes de publicar',checks},{status:409});
      if(reviewStatus!=='approved')return Response.json({error:'Aprueba la revisión antes de publicar'},{status:409});
      const publishedAt=new Date().toISOString();
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({ business_id });
      const courtesy = subscriptions.length === 1 && subscriptions[0].billing_exempt === true;
      await base44.asServiceRole.entities.Business.update(business_id,{status:courtesy?'active':'trial',published_at:publishedAt,launch_review_status:'published'});
      if(lead[0]) await base44.asServiceRole.entities.SalesLead.update(lead[0].id,{delivery_status:'published'});
      await createAuditLog(base44,user,'business.published',{business_id,entity_type:'Business',entity_id:business_id,metadata:{slug:business.slug}});
      return Response.json({ok:true,status:courtesy?'active':'trial',billing_exempt:courtesy,published_at:publishedAt});
    }

    // --- Status change ---
    if (action === 'change_status') {
      const validStatuses = ['onboarding', 'trial', 'active', 'suspended', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return Response.json({ error: 'Estado no válido' }, { status: 400 });
      }
      const previousStatus = business.status;
      await base44.asServiceRole.entities.Business.update(business_id, { status });

      // Update subscription status to match
      const subs = await base44.asServiceRole.entities.Subscription.filter({ business_id });
      if (subs.length > 0) {
        const subStatus = status === 'active' ? 'active' : status === 'suspended' || status === 'cancelled' ? 'cancelled' : subs[0].status;
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: subStatus });
      }

      const auditAction = status === 'suspended' ? 'business.suspended'
        : status === 'active' ? 'business.activated'
        : status === 'cancelled' ? 'business.cancelled'
        : 'business.updated';
      await createAuditLog(base44, user, auditAction, {
        business_id, entity_type: 'Business', entity_id: business_id,
        metadata: { business_name: business.business_name, previous_status: previousStatus, new_status: status },
      });

      return Response.json({ ok: true, business_name: business.business_name, status });
    }

    // --- Edit business details ---
    if (action === 'update') {
      if (!business_data) {
        return Response.json({ error: 'Datos requeridos' }, { status: 400 });
      }
      // Only allow safe fields
      const allowed = {};
      const safeFields = commercial
        ? ['business_name', 'contact_email', 'contact_phone', 'address', 'primary_color', 'secondary_color', 'logo', 'business_mode', 'template_id', 'cover_image', 'headline', 'tagline', 'timezone', 'favicon', 'appearance_config']
        : ['business_name', 'legal_name', 'tax_id', 'contact_email', 'contact_phone', 'whatsapp_phone', 'address', 'city', 'province', 'postal_code', 'primary_color', 'secondary_color', 'logo', 'business_mode', 'template_id', 'cover_image', 'headline', 'tagline', 'timezone', 'favicon', 'appearance_config'];
      for (const f of safeFields) {
        if (business_data[f] !== undefined) allowed[f] = business_data[f];
      }
      // Server-side HEX validation for colors
      const hexRe = /^#[0-9A-Fa-f]{6}$/;
      if ('primary_color' in allowed && allowed.primary_color !== null && allowed.primary_color !== '' && !hexRe.test(allowed.primary_color)) {
        return Response.json({ error: 'Color principal no válido (formato HEX #RRGGBB)' }, { status: 400 });
      }
      if ('secondary_color' in allowed && allowed.secondary_color !== null && allowed.secondary_color !== '' && !hexRe.test(allowed.secondary_color)) {
        return Response.json({ error: 'Color secundario no válido (formato HEX #RRGGBB)' }, { status: 400 });
      }
      // Logo + favicon: HTTPS URL, no SVG (SVG sanitization arrives in a later phase)
      for (const imgField of ['logo', 'favicon']) {
        if (imgField in allowed && allowed[imgField] !== null && allowed[imgField] !== '') {
          if (!validImage(allowed[imgField])) return Response.json({ error: `${imgField} debe ser una URL HTTPS válida` }, { status: 400 });
          if (/\.svg(\?|$)/i.test(allowed[imgField])) return Response.json({ error: `SVG no permitido para ${imgField} (aún no habilitado)` }, { status: 400 });
        }
      }
      // V2 appearance_config: validate against the resolved template's skin supports
      if ('appearance_config' in allowed && allowed.appearance_config !== null) {
        try {
          allowed.appearance_config = validateAppearanceConfig({ ...business, ...allowed }, allowed.appearance_config);
        } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
      }
      try { validatePresentation({ ...business, ...allowed }); } catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
      await base44.asServiceRole.entities.Business.update(business_id, allowed);
      await createAuditLog(base44, user, 'business.updated', {
        business_id, entity_type: 'Business', entity_id: business_id,
        metadata: { updated_fields: Object.keys(allowed) },
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
    });
  } catch (error) {
    if (error instanceof MutationLockError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No pudimos actualizar el negocio.' }, { status: 500 });
  }
}
