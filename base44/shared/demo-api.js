import { isSuperAdmin, createAuditLog, getDefaultSlots, getDefaultSchedule } from './rinno.ts';
import { TEMPLATES } from './templates.js';
import { DEMO_SERVICES, DEMO_PRODUCTS, DEMO_PEOPLE, DEMO_CATEGORIES, CSC_PILOT_POLICIES } from './demo-seeds.js';
import { assert } from './booking.js';
import { initializeBusinessTenant } from './business-tenant.js';
export async function installDemo(client, body) {
  try {
    const user = await client.auth.me();
    assert(user && isSuperAdmin(user), 'Solo Super Admin puede instalar demos', 403);
    const { template_id } = body;
    const t = TEMPLATES.find(t => t.id === template_id && t.demo !== '01');
    assert(t, 'DEMO 01 se conserva; selecciona una nueva demo');
    const e = client.asServiceRole.entities, key = `rinno-demo-${t.demo}`, slug = key;
    const demoName = `DEMO ${t.demo} · ${t.name}`;
    let business = (await e.Business.filter({ slug }))[0];
    assert(!business || business.demo_key === key, 'Ese enlace pertenece a un negocio existente; no se ha modificado', 409);
    if (!business) business = await e.Business.create({ business_name: demoName, slug, business_type: t.sector, business_mode: t.mode, template_id: t.id, primary_color: t.color, secondary_color: '#EFECE4', cover_image: t.image, headline: t.title, tagline: t.subtitle, status: 'trial', timezone: 'Europe/Madrid', currency: 'EUR', language: 'es', demo_key: key });
    else if (business.business_name !== demoName) business = await e.Business.update(business.id, { business_name: demoName });
    business = await initializeBusinessTenant(e.Business, business);
    const bid = business.id;
    // Only fill an unconfigured demo; never replace an existing subscription.
    if (!(await e.Subscription.filter({ business_id: bid })).length) {
      const plans = await e.Plan.filter({ name: 'DEMO', active: true });
      assert(plans.length === 1, 'Configura un único plan DEMO activo y vuelve a preparar la demo.', 409);
      await e.Subscription.create({ business_id: bid, plan_id: plans[0].id, status: 'trial', start_date: new Date().toISOString() });
      if (!business.plan_id) await e.Business.update(bid, { plan_id: plans[0].id });
    }
    // Add missing records only. Re-running never resets edited data or appointments.
    if (!(await e.BusinessSettings.filter({ business_id: bid })).length) await e.BusinessSettings.create({ business_id: bid, accept_online_orders: true, online_store_active: true, pickup_enabled: true, own_delivery_enabled: false, minimum_order: 0, allow_scheduled_orders: true, max_future_days: 7, min_lead_time_minutes: 60, schedule: getDefaultSchedule(), store_description: t.subtitle, ...(t.mode === 'ASSOCIATION' ? { association_modules: { memberships:true, fees:true, credential:true, activities:true, communications:true, incidents:false, documents:false, wallet:false } } : {}) });
    if (['COMMERCE', 'HYBRID'].includes(t.mode)) {
      for (const slot of getDefaultSlots(['pickup'])) {
        if (!(await e.FulfillmentSlot.filter({ business_id: bid, fulfillment_type: slot.fulfillment_type, day_of_week: slot.day_of_week, start_time: slot.start_time })).length) await e.FulfillmentSlot.create({ ...slot, business_id: bid });
      }
      // Resolve categories for this template. DEMO_CATEGORIES (when present)
      // creates multiple categories and routes products by their product[4]
      // slug; otherwise the single 'seleccion' category is used (legacy).
      const categoryIds = {};
      const extraCats = DEMO_CATEGORIES[t.id];
      if (extraCats && extraCats.length) {
        for (const [ci, c] of extraCats.entries()) {
          let cat = (await e.Category.filter({ business_id: bid, slug: c.slug }))[0];
          if (!cat) cat = await e.Category.create({ business_id: bid, name: c.name, slug: c.slug, image: c.image ? `https://images.unsplash.com/${c.image}?auto=format&fit=crop&w=700&q=80` : undefined, is_active: true, sort_order: ci });
          categoryIds[c.slug] = cat.id;
        }
      } else {
        let category = (await e.Category.filter({ business_id: bid, slug: 'seleccion' }))[0];
        if (!category) category = await e.Category.create({ business_id: bid, name: 'Nuestra selección', slug: 'seleccion', is_active: true, sort_order: 0 });
        categoryIds['seleccion'] = category.id;
      }
      for (const [index, entry] of DEMO_PRODUCTS[t.id].entries()) {
        const [name, price, unit, image, catSlug] = entry;
        const productSlug = `demo-${index}`;
        if (!(await e.Product.filter({ business_id: bid, slug: productSlug })).length) await e.Product.create({ business_id: bid, category_id: categoryIds[catSlug] || Object.values(categoryIds)[0], name, slug: productSlug, price, unit_type: unit, unit_label: unit === 'kg' ? 'kg' : 'ud', minimum_quantity: unit === 'kg' ? 0.5 : 1, quantity_step: unit === 'kg' ? 0.5 : 1, image: image ? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=700&q=80` : undefined, is_available: true, is_featured: index < 4, stock_mode: 'unlimited', status: 'active', sort_order: index });
      }
    }
    if (['BOOKING', 'HYBRID'].includes(t.mode)) {
      const ids = [];
      for (const [index, [name, price, duration_minutes]] of DEMO_SERVICES[t.id].entries()) {
        const demo_key = `${key}-service-${index}`;
        let service = (await e.BookingService.filter({ business_id: bid, demo_key }))[0];
        if (!service) service = await e.BookingService.create({ business_id: bid, demo_key, name, price, duration_minutes, active: true, description: 'Atención personalizada por nuestro equipo', image: t.image });
        ids.push(service.id);
      }
      for (const [index, person] of DEMO_PEOPLE.entries()) if (!(await e.BookingProfessional.filter({ business_id: bid, demo_key: `${key}-person-${index}` })).length) await e.BookingProfessional.create({ business_id: bid, demo_key: `${key}-person-${index}`, ...person, specialty: t.sector === 'hair_salon' ? 'Corte y color' : t.sector === 'barber' ? 'Barbería y estilo' : 'Cuidado y bienestar', active: true, service_ids: ids, days_off: [], schedule: [1, 2, 3, 4, 5, 6].flatMap(day => [{ day, start: '09:00', end: '14:00' }, { day, start: '16:00', end: '20:00' }]) });
    }
    if (t.mode === 'ASSOCIATION') {
      let memberPlan = (await e.MembershipPlan.filter({ business_id: bid, code: 'annual' }))[0];
      if (!memberPlan) memberPlan = await e.MembershipPlan.create({ business_id: bid, name: 'Membresía anual', code: 'annual', description: 'Acceso completo a la vida asociativa', fee_amount: 3600, fee_period: 'annual', duration_months: 12, is_active: true });
      const demoMembers = [['0001','Lucía','Moreno','1992-04-18'],['0002','Carlos','Vega','1987-11-03'],['0003','Marta','Santos','1995-07-22']];
      const seededMembers=[];
      for (const [number, first_name, last_name,birth_date] of demoMembers) {
        let member = (await e.Member.filter({ business_id: bid, member_number: number }))[0];
        if (!member) member = await e.Member.create({ business_id: bid, member_number: number, first_name, last_name,birth_date, status: 'active', joined_at: new Date().toISOString(), user_id: null, metadata:{monthly_limit_grams:60} });
        else if (!Number(member.metadata?.monthly_limit_grams)||!member.birth_date) member = await e.Member.update(member.id,{birth_date:member.birth_date||birth_date,metadata:{...(member.metadata||{}),monthly_limit_grams:Number(member.metadata?.monthly_limit_grams)||60}});
        seededMembers.push(member);
        if (!(await e.Membership.filter({ business_id: bid, member_id: member.id, status: 'active' })).length) await e.Membership.create({ business_id: bid, member_id: member.id, plan_id: memberPlan.id, plan_name_snapshot: memberPlan.name, fee_amount_snapshot: memberPlan.fee_amount, fee_period_snapshot: memberPlan.fee_period, start_date: new Date().toISOString().slice(0,10), end_date: null, status: 'active', renewed_from: null });
      }
      const starts = [7, 18].map(days => new Date(Date.now() + days * 86400000));
      const demoActivities = [
        { title:'Encuentro de bienvenida', description:'Una tarde para conocer proyectos, personas y formas de participar.', location:'Sede de la asociación', capacity:40 },
        { title:'Taller comunitario', description:'Sesión práctica abierta a socios para compartir conocimientos y propuestas.', location:'Sala de actividades', capacity:24 },
      ];
      for (const [index, item] of demoActivities.entries()) if (!(await e.Activity.filter({ business_id: bid, title: item.title })).length) await e.Activity.create({ business_id: bid, ...item, start_at: starts[index].toISOString(), end_at: new Date(starts[index].getTime()+7200000).toISOString(), is_public:true, enrollment_open:true, enrollment_until:new Date(starts[index].getTime()-86400000).toISOString(), status:'published', check_in_enabled:false, is_paid:false, price:null, created_by:user.id, created_at:new Date().toISOString() });
      const catalog=[['Aurora Verde','flower','Perfil equilibrado y aromático','THC/CBD verificado',120,'/images/csc-aurora-verde.webp'],['Brisa CBD','flower','Variedad de CBD para socios','CBD predominante',85,'/images/csc-brisa-cbd.webp'],['Resina Artesana','extract','Información y disponibilidad interna','Lote analizado',32,'/images/csc-resina-artesana.webp']];
      for(const [name,category,description,cannabinoid_profile,stock_grams,image] of catalog){const existing=(await e.CscCatalogItem.filter({business_id:bid,name}))[0];if(!existing)await e.CscCatalogItem.create({business_id:bid,name,category,description,cannabinoid_profile,stock_grams,image,availability:'available',is_active:true});else if(!existing.image)await e.CscCatalogItem.update(existing.id,{image});}
      const notices=[['Asamblea mensual','La próxima asamblea de socios se celebrará el primer viernes del mes.','assembly'],['Uso responsable','Consulta tus límites personales y solicita ayuda al equipo ante cualquier duda.','safety']];
      for(const [title,bodyText,kind] of notices)if(!(await e.CscNotice.filter({business_id:bid,title})).length)await e.CscNotice.create({business_id:bid,title,body:bodyText,kind,status:'published',published_at:new Date().toISOString(),created_by:user.id});
      if(e.AssociationLegalPolicy&&e.MemberConsent){
        for(const draft of CSC_PILOT_POLICIES){
          let policy=(await e.AssociationLegalPolicy.filter({business_id:bid,kind:draft.kind,version:draft.version}))[0];
          if(!policy)policy=await e.AssociationLegalPolicy.create({business_id:bid,...draft,required:true,status:'active',effective_at:new Date().toISOString(),published_at:new Date().toISOString(),created_by:user.id});
          for(const member of seededMembers)if(!(await e.MemberConsent.filter({business_id:bid,member_id:member.id,policy_id:policy.id,policy_version:policy.version})).length)await e.MemberConsent.create({business_id:bid,member_id:member.id,policy_id:policy.id,policy_version:policy.version,accepted_at:new Date().toISOString(),accepted_by_user_id:user.id,evidence:{method:'demo_seed',notice:'Datos ficticios de demostración'},revoked_at:null});
        }
      }
      if(e.AssociationDocument){
        const docs=[['Protocolo de acceso de la sede','protocol','staff','Pasos de demostración: comprobar credencial activa, identidad visual y estado de membresía. Registrar cualquier incidencia sin incluir datos innecesarios.'],['Guía del socio','other','members','Consulta tu carné desde el móvil, revisa tus límites, solicita visitas y acepta las versiones vigentes desde tu perfil.']];
        for(const[title,category,audience,protected_content]of docs)if(!(await e.AssociationDocument.filter({business_id:bid,title})).length)await e.AssociationDocument.create({business_id:bid,title,description:'Documento privado de demostración',category,audience,protected_content,storage_mode:'protected_text',status:'published',created_by:user.id,published_at:new Date().toISOString()});
      }
    }
    await createAuditLog(client, user, 'demo.installed', { business_id: bid, entity_id: bid, metadata: { template_id: t.id } });
    return Response.json({ business_id: bid, slug });
  } catch (error) { return Response.json({ error: error.status ? error.message : 'No se pudo completar la demo. Puedes reintentar para añadir los registros pendientes.' }, { status: error.status || 500 }); }
}
