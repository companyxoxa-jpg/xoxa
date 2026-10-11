import { conditionalUpdate } from '../conditional-update.mjs';
import { loadHandler } from '../load-handler.mjs';
import { getDefaultSlots } from '../../base44/shared/rinno.ts';
const handlers = Object.fromEntries(await Promise.all(['GetStorefront','ResolveBusiness','ResolveBusinessInvitation','CreateOrder','TrackOrder','GetCustomerOrderDetail','GetCustomerOrders','LinkPreviousOrders','PrepareReorder','MyAssociationPortal','ManageSavedAddress','UpdateOrderStatus','ManageProduct','ManageBusiness','ManageBusinessTeam','ManageCommercial','CommercialDemos','ManageSalesLead','InstallDemo','ManageBilling','ManageClientDossier','ManageMutationLock'].map(async name => [name, await loadHandler(name)])));
import { bookingPublic, bookingManage, bookingCustomer } from '../../base44/shared/booking-api.js';
import { TEMPLATES } from '../../base44/shared/templates.js';
import { DEMO_PRODUCTS, DEMO_SERVICES, DEMO_PEOPLE } from '../../base44/shared/demo-seeds.js';
// In-memory implementation of the SDK entity contract. This is not a Base44
// emulator and cannot validate deployed RLS or database concurrency guarantees.
let db;
function reset() {
  db = { Business: [], BusinessSettings: [], BookingService: [], BookingProfessional: [], Appointment: [], AuditLog: [], Product: [], Category: [], Order: [], OrderItem: [], Customer: [], FulfillmentSlot: [], TeamInvitation: [], SalesLead: [], Subscription: [], BillingPayment: [], BillingInvoice: [], BillingWebhookEvent: [], ClientContract: [], ClientDocument: [{id:'doc-qa',document_number:'RGPD-2026-000001',document_type:'rgpd',client_name:'Cliente QA',trade_name:'Comercio QA',tax_id:'B00000001',contract_number:'RIN-2026-000001',status:'signed'}], Plan: [{id:'plan-business',name:'Business',active:true,monthly_price:2495,setup_price:39900}], CommercialAccess: [{ id:'commercial-1', email:'seller@rinno.test', status:'active' }, { id:'commercial-2', email:'commercial2@rinno.test', status:'active' }] };
  Object.assign(db, {
    Member: [{ id:'member-customer', business_id:'association-community', user_id:'customer', member_number:'CSC-0001', first_name:'María de la Comunidad con Nombre Largo', last_name:'García', email:'customer@example.test', status:'active' }],
    Membership: [{ id:'membership-customer', business_id:'association-community', member_id:'member-customer', plan_name_snapshot:'Socio activo anual', start_date:'2026-01-01', status:'active' }],
    Credential: [], MemberFee: [], CscCatalogItem: [], CscDispensation: [], CscVisit: [], CscNotice: [], AssociationIncident: [], AssociationDocument: [], AssociationLegalPolicy: [], MemberConsent: [], Activity: [], Enrollment: [], SavedAddress: [],
  });
  for (const t of TEMPLATES) {
    const bid = t.id;
    db.Business.push({ id: bid, slug: `rinno-demo-${t.demo}`, business_name: t.demo === '01' ? 'RINNO Fresh' : t.name.split(' · ')[1], business_mode: t.mode, template_id: t.id, primary_color: t.color, timezone: 'Europe/Madrid', status: 'active', currency: 'EUR' });
    db.BusinessSettings.push({ id: `settings-${bid}`, business_id: bid, accept_online_orders: true, online_store_active: true, pickup_enabled: true });
    for (const slot of getDefaultSlots(['pickup'])) db.FulfillmentSlot.push({...slot,id:crypto.randomUUID(),business_id:bid});
    db.Category.push({ id: `cat-${bid}`, business_id: bid, name: 'Selección', is_active: true });
    for (const [i, s] of (DEMO_SERVICES[t.id] || []).entries()) db.BookingService.push({ id: `${bid}-s${i}`, business_id: bid, name: s[0], price: s[1], duration_minutes: s[2], image: t.image, active: true });
    if (['BOOKING','HYBRID'].includes(t.mode)) for (const [i, p] of DEMO_PEOPLE.entries()) db.BookingProfessional.push({ id: `${bid}-p${i}`, business_id: bid, ...p, specialty: 'Especialista', active: true, service_ids: db.BookingService.filter(s => s.business_id === bid).map(s => s.id), days_off: [], schedule: [0,1,2,3,4,5,6].flatMap(day => [{ day, start:'09:00',end:'14:00'},{ day,start:'16:00',end:'20:00'}]) });
    for (const [i, p] of (DEMO_PRODUCTS[t.id] || (t.demo === '01' ? [['Fresas', 350, 'kg','photo-1464965911861-746a04b4bca6']] : [])).entries()) db.Product.push({ id:`${bid}-prod${i}`, business_id:bid,category_id:`cat-${bid}`,name:p[0],price:p[1],unit_type:p[2],unit_label:p[2],minimum_quantity:p[2]==='kg'?0.5:1,quantity_step:p[2]==='kg'?0.5:1,is_featured:true,is_available:true,status:'active',image:`https://images.unsplash.com/${p[3]}?auto=format&fit=crop&w=500&q=80` });
  }
}
reset();
export function testServer() {
  return { name: 'rinno-test-adapter', configureServer(server) {
    server.middlewares.use('/__test_api', async (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      try {
        let raw = ''; for await (const chunk of req) raw += chunk;
        const input = JSON.parse(raw), role = req.headers['x-test-role'];
        const user = role === 'guest' ? null : role === 'owner' ? { id:'owner',email:'owner@example.test',data:{rinno_role:'business_owner',business_id:'barber-studio'} } : role === 'staff' ? { id:'staff',email:'staff@example.test',data:{rinno_role:'business_staff',business_id:'barber-studio'} } : role === 'commerce_staff' ? { id:'commerce-staff',email:'commerce.staff@example.test',data:{rinno_role:'business_staff',business_id:'retail-store'} } : role === 'association_owner' ? { id:'association-owner',email:'association.owner@example.test',data:{rinno_role:'business_owner',business_id:'association-community'} } : role === 'association_staff' ? { id:'association-staff',email:'association.staff@example.test',data:{rinno_role:'business_staff',business_id:'association-community'} } : role === 'admin' ? { id:'admin',role:'admin',email:'companyxoxa@gmail.com' } : role === 'commercial' ? { id:'commercial',role:'user',email:'seller@rinno.test' } : role === 'unlinked' ? { id:'unlinked',role:'user',email:'unlinked@example.test' } : { id:'customer',email:'customer@example.test',data:{rinno_role:'customer'} };
        const entities = new Proxy({}, { get: (_, name) => ({
          list: async (sort,limit=200,skip=0) => (db[name]||[]).slice(skip,skip+limit).map(row=>structuredClone(row)),
          filter: async (filter = {}, sort, limit=200, skip=0) => (db[name] || []).filter(row => Object.entries(filter).every(([k,v])=>row[k]===v)).slice(skip,skip+limit).map(row=>structuredClone(row)),
          updateMany: async (query, update) => conditionalUpdate(db[name], query, update),
    get: async id => structuredClone((db[name]||[]).find(row=>row.id===id)),
          create: async data => { const row={...structuredClone(data),id:crypto.randomUUID()}; db[name].push(row); return structuredClone(row); },
          bulkCreate: async rows => rows.map(data=>{ const row={...data,id:crypto.randomUUID()};db[name].push(row);return row; }),
          update: async(id,data)=>{const row=db[name].find(row=>row.id===id);Object.assign(row,structuredClone(data));return structuredClone(row);},
          delete: async id=>{const index=db[name].findIndex(row=>row.id===id);if(index>=0)db[name].splice(index,1);return {ok:index>=0};},
        }) });
        const client={entities,asServiceRole:{entities},auth:{me:async()=>user}};
        let result;
        if(input.kind==='reset'){reset();result={ok:true};}
        else if(input.kind==='me') { if (!user) { const error = new Error('No autenticado'); error.status = 401; throw error; } result=user; }
        else if(input.kind==='entity')result=await entities[input.name].filter(...input.args);
        else if(input.kind==='get')result=await entities[input.name].get(input.id);
        else if(handlers[input.name]) { const response = await handlers[input.name](new Request('http://localhost/test', {method:'POST',body:JSON.stringify(input.body)}), client); result=await response.json(); res.statusCode=response.status; }else if(input.name==='BookingPublic') result=await bookingPublic(client,input.body);
        else if(input.name==='ManageBooking')result=await bookingManage(client,input.body);
        else if(input.name==='CustomerAppointments')result=await bookingCustomer(client,input.body);
        else if(input.name==='ManageContract'&&input.body?.action==='list')result={contracts:db.ClientContract};
        else if(input.name==='ManageDocuments'&&input.body?.action==='list')result={documents:db.ClientDocument,contracts:db.ClientContract};
        else if(input.name==='ManageDocuments'&&input.body?.action==='annul'){
          const doc=db.ClientDocument.find(x=>x.id===input.body.id);if(!doc)throw Object.assign(new Error('Documento no encontrado'),{status:404});if(String(input.body.reason||'').trim().length<10)throw Object.assign(new Error('Indica un motivo de anulación suficiente'),{status:400});doc.status='annulled';doc.annulment_reason=input.body.reason;result={document:structuredClone(doc)};
        }
        else if(input.name==='OnboardBusiness'){
          if(role!=='admin'&&role!=='commercial')throw Object.assign(new Error('No autorizado'),{status:403});
          const id=crypto.randomUUID(),business={id,slug:input.body.identity.slug,business_name:input.body.business.business_name,business_type:input.body.business.business_type,template_id:input.body.identity.template_id,primary_color:input.body.identity.primary_color,secondary_color:input.body.identity.secondary_color,contact_email:input.body.business.contact_email,contact_phone:input.body.business.contact_phone,address:input.body.business.address,city:input.body.business.city,status:'onboarding',subscription_status:'onboarding',launch_review_status:'draft',created_date:new Date().toISOString()};
          db.Business.push(business);db.BusinessSettings.push({id:crypto.randomUUID(),business_id:id,pickup_enabled:input.body.operation.pickup_enabled,own_delivery_enabled:input.body.operation.own_delivery_enabled});
          result={business,message:'Negocio creado correctamente.'};
        }
        else if(input.name==='CreateBillingCheckout'){
          const business=db.Business.find(x=>x.id===input.body.business_id);if(!business)throw Object.assign(new Error('Negocio no encontrado'),{status:404});
          db.Subscription.push({id:crypto.randomUUID(),business_id:business.id,plan_id:'plan-business',status:'pending_payment',checkout_url:`https://checkout.stripe.test/${business.id}`});
          result={url:`https://checkout.stripe.test/${business.id}`};
        }
        else throw new Error(`Unhandled test API: ${input.name}`);
        res.end(JSON.stringify(result));
      }catch(e){res.statusCode=e.status||500;res.end(JSON.stringify({error:e.message}));}
    });
  }};
}

