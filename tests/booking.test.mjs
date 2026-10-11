import { conditionalUpdate } from './conditional-update.mjs';
import { withBusinessMutation } from '../base44/shared/business-mutation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { availableSlots, validateSchedule, wallToUTC, validDate } from '../base44/shared/booking.js';
import { bookingPublic, bookingManage, bookingCustomer } from '../base44/shared/booking-api.js';
import { templateFor, validatePresentation } from '../base44/shared/templates.js';
import { installDemo } from '../base44/shared/demo-api.js';
import { isCustomer, isSuperAdmin } from '../base44/shared/rinno.ts';

const now = Date.parse('2026-09-23T06:00:00Z');
const date = '2026-09-24';

test('Super Admin requires the protected role and an authorized email', () => {
  assert.equal(isSuperAdmin({ role: 'admin', email: 'companyxoxa@gmail.com' }), true);
  assert.equal(isSuperAdmin({ role: 'admin', email: 'AX.NETWORK.HUB@gmail.com' }), true);
  assert.equal(isSuperAdmin({ role: 'admin', email: 'xoxamariles@gmail.com' }), true);
  assert.equal(isSuperAdmin({ role: 'user', email: 'ax.network.hub@gmail.com' }), false);
  assert.equal(isCustomer({ role: 'user', email: 'unlinked@example.test' }), true);
  assert.equal(isCustomer(null), false);
});
function fixture() {
  const db = {
    Business: [{ id: 'A', slug: 'studio', status: 'active', business_mode: 'BOOKING', timezone: 'Europe/Madrid' }, { id: 'B', slug: 'other', status: 'active', business_mode: 'BOOKING' }],
    BusinessSettings: [{ id: 'settingsA', business_id: 'A', online_store_active: true, booking_closed_dates: [] }],
    BookingService: [{ id: 's', business_id: 'A', name: 'Corte', active: true, duration_minutes: 45, price: 2800 }, { id: 'sB', business_id: 'B', name: 'Ajeno', active: true, duration_minutes: 30, price: 100 }],
    BookingProfessional: [{ id: 'p', business_id: 'A', name: 'Laura', active: true, service_ids: ['s'], days_off: [], schedule: [{ day: 4, start: '09:00', end: '12:00' }, { day: 4, start: '16:00', end: '18:00' }] }],
    Appointment: [], AuditLog: [], Category: [], Product: [], FulfillmentSlot: [], Customer: [],
    Plan: [{ id: 'demo-plan', name: 'DEMO', active: true }], Subscription: [],
    MembershipPlan: [], User: [], Member: [], Membership: [], Activity: [], Enrollment: [],
    CscCatalogItem: [], CscDispensation: [], CscVisit: [], CscNotice: [],
  };
  const entities = Object.fromEntries(Object.keys(db).map(name => [name, {
    filter: async (filter, sort, limit = 200, skip = 0) => db[name].filter(row => Object.entries(filter).every(([key, value]) => row[key] === value)).slice(skip, skip + limit).map(row => structuredClone(row)),
    updateMany: async (query, update) => conditionalUpdate(db[name], query, update),
    get: async id => structuredClone(db[name].find(row => row.id === id)),
    create: async data => { const row = { ...structuredClone(data), id: `${name}-${db[name].length}` }; db[name].push(row); return structuredClone(row); },
    update: async (id, data) => { const row = db[name].find(row => row.id === id); Object.assign(row, structuredClone(data)); return structuredClone(row); },
  }]));
  let user = { id: 'customerA', email: 'a@example.test', data: { rinno_role: 'customer' } };
  const client = { asServiceRole: { entities }, auth: { me: async () => user } };
  const request = { action: 'reserve', slug: 'studio', service_id: 's', professional_id: 'p', date, time: '09:00', customer_name: 'Ana García', phone: '+34600000000', privacy_accepted: true, request_id: 'request-0000000001' };
  return { db, client, request, user: value => { user = value; } };
}
test('default presentation uses the current market template; mismatched template rejected', () => {
  assert.equal(templateFor({}).id, 'fresh-market');
  assert.throws(() => validatePresentation({ business_mode: 'COMMERCE', template_id: 'barber-studio' }));
  validatePresentation({ business_mode: 'BOOKING', template_id: 'barber-studio' });
});

test('simultaneous reservations admit one writer and a retry returns the existing appointment', async () => {
  const f = fixture();
  const results = await Promise.allSettled(Array.from({length:16}, () => bookingPublic(f.client, f.request, now)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(f.db.Appointment.length,1);
  const retry=await bookingPublic(f.client,f.request,now);
  assert.equal(retry.appointment.id,f.db.Appointment[0].id);
  await assert.rejects(bookingPublic(f.client,{...f.request,request_id:'another-request-0001'},now),{status:409});
  assert.equal(f.db.Business[0].mutation_token,'');
});

test('uncertain failed writes retain the durable gate rather than admit another writer', async () => {
  const f=fixture();
  await assert.rejects(withBusinessMutation(f.client,'A',async()=>{throw new Error('Connection lost after write');}));
  assert(f.db.Business[0].mutation_token);
  await assert.rejects(withBusinessMutation(f.client,'A',async()=>{}),{status:423});
  // A separate business is not blocked.
  await withBusinessMutation(f.client,'B',async()=>{});
  assert.equal(f.db.Business[1].mutation_token,'');
});

test('schedule mutation and cancellation use the same gate as reservations', async () => {
  const f=fixture(); await bookingPublic(f.client,f.request,now);
  f.user({id:'owner',data:{business_id:'A',rinno_role:'business_owner'}});
  f.db.Business[0].mutation_token='another-active-operation';
  await assert.rejects(bookingManage(f.client,{action:'save_service',id:'s',data:f.db.BookingService[0]},now),{status:423});
  await assert.rejects(bookingManage(f.client,{action:'status',id:f.db.Appointment[0].id,status:'confirmed'},now),{status:423});
  f.user({id:'customerA'});
  await assert.rejects(bookingCustomer(f.client,{action:'cancel',id:f.db.Appointment[0].id}),{status:423});
});
test('availability respects duration, breaks, overlaps and adjacent appointments', () => {
  const { db } = fixture();
  const context = { professional: db.BookingProfessional[0], service: db.BookingService[0], date, now, appointments: [{ professional_id: 'p', date, status: 'confirmed', start_time: '09:45', end_time: '10:30' }] };
  const times = availableSlots(context).map(s => s.time);
  assert(times.includes('09:00')); assert(!times.includes('09:15')); assert(times.includes('10:30'));
  assert(!times.includes('11:30')); assert(!times.includes('14:00')); assert(times.includes('17:15')); assert(!times.includes('17:30'));
  context.professional.days_off = [date]; assert.equal(availableSlots(context).length, 0);
});
test('validates overlapping shifts, date and DST gaps/ambiguity', () => {
  assert.throws(() => validateSchedule([{ day: 1, start: '10:00', end: '12:00' }, { day: 1, start: '11:00', end: '13:00' }]));
  assert.throws(() => validDate('2026-02-30'));
  assert.equal(wallToUTC('2026-03-29', '02:30', 'Europe/Madrid'), null);
  assert.equal(wallToUTC('2026-10-25', '02:30', 'Europe/Madrid'), null);
  assert.equal(new Date(wallToUTC('2026-09-24', '09:00', 'Europe/Madrid')).toISOString(), '2026-09-24T07:00:00.000Z');
});
test('public catalog omits private schedules and cross-tenant services', async () => {
  const f = fixture();
  const result = await bookingPublic(f.client, { action: 'catalog', slug: 'studio' }, now);
  assert.equal(result.services.length, 1); assert(!('schedule' in result.professionals[0])); assert(!('business_id' in result.professionals[0]));
});
test('guest booking lookup requires reference plus matching contact and stays tenant scoped', async () => {
  const f = fixture();
  const reserved = await bookingPublic(f.client, f.request, now);
  const byEmail = await bookingPublic(f.client, { action: 'lookup', slug: 'studio', reference: reserved.appointment.id, email: 'A@EXAMPLE.TEST' }, now);
  assert.equal(byEmail.appointment.reference, reserved.appointment.id);
  assert.equal(byEmail.appointment.business_slug, 'studio');
  assert(!('customer_email' in byEmail.appointment));
  assert(!('phone' in byEmail.appointment));
  const byPhone = await bookingPublic(f.client, { action: 'lookup', slug: 'studio', reference: reserved.appointment.id, phone: '+34 600 000 000' }, now);
  assert.equal(byPhone.appointment.status, 'pending');
  await assert.rejects(bookingPublic(f.client, { action: 'lookup', slug: 'studio', reference: reserved.appointment.id, email: 'other@example.test' }, now), { status: 404 });
  await assert.rejects(bookingPublic(f.client, { action: 'lookup', slug: 'other', reference: reserved.appointment.id, phone: '+34600000000' }, now), { status: 404 });
});
test('reserve → idempotent retry → availability → agenda → confirm → complete', async () => {
  const f = fixture();
  const first = await bookingPublic(f.client, { ...f.request, price: 1, business_id: 'B', customer_user_id: 'victim' }, now);
  const retry = await bookingPublic(f.client, f.request, now);
  assert.equal(first.appointment.id, retry.appointment.id); assert.equal(f.db.Appointment.length, 1);
  assert.equal(f.db.Appointment[0].price, 2800); assert.equal(f.db.Appointment[0].business_id, 'A'); assert.equal(f.db.Appointment[0].customer_user_id, 'customerA');
  assert.equal(f.db.Customer[0].business_id, 'A'); assert.equal(f.db.Customer[0].user_id, 'customerA');
  const availability = await bookingPublic(f.client, { ...f.request, action: 'availability' }, now);
  assert(!availability.slots.some(s => s.time === '09:00'));
  f.user({ id: 'owner', data: { business_id: 'A', rinno_role: 'business_owner' } });
  const agenda = await bookingManage(f.client, { action: 'list', date }, now); assert.equal(agenda.appointments.length, 1);
  await bookingManage(f.client, { action: 'status', id: first.appointment.id, status: 'confirmed' }, now);
  await assert.rejects(bookingManage(f.client, { action: 'status', id: first.appointment.id, status: 'completed' }, now));
  await bookingManage(f.client, { action: 'status', id: first.appointment.id, status: 'completed' }, Date.parse('2026-09-24T08:00:00Z'));
  assert.equal(f.db.Appointment[0].status, 'completed');
});
test('rejects cross-tenant IDs and suspended businesses', async () => {
  const f = fixture();
  await assert.rejects(bookingPublic(f.client, { ...f.request, service_id: 'sB' }, now), { status: 404 });
  f.db.Business[0].status = 'suspended';
  await assert.rejects(bookingPublic(f.client, f.request, now), { status: 404 });
});
test('guest booking requires a valid email and privacy consent', async () => {
  const f = fixture(); f.user(null);
  await assert.rejects(bookingPublic(f.client, f.request, now));
  await assert.rejects(bookingPublic(f.client, { ...f.request, customer_email: 'guest@example.test', privacy_accepted: false }, now));
  const reserved = await bookingPublic(f.client, { ...f.request, customer_email: 'guest@example.test' }, now);
  assert.equal(f.db.Appointment.length, 1);
  assert.equal(f.db.Appointment[0].customer_user_id, null);
  assert.equal(f.db.Appointment[0].customer_email, 'guest@example.test');
  assert.equal(f.db.AuditLog[0].actor_role, 'customer_guest');
  assert.equal(reserved.appointment.professional_name, 'Laura');
});

test('Indiferente returns a shared slot and assigns an actually free professional inside the business gate', async () => {
  const f = fixture();
  f.db.BookingProfessional.push({ ...structuredClone(f.db.BookingProfessional[0]), id: 'p2', name: 'Fabián' });
  await bookingPublic(f.client, f.request, now);
  const any = { ...f.request, professional_id: 'any', request_id: 'request-indifferent-0001' };
  const availability = await bookingPublic(f.client, { ...any, action: 'availability' }, now);
  assert(availability.slots.some(slot => slot.time === '09:00'));
  const booked = await bookingPublic(f.client, any, now);
  assert.equal(f.db.Appointment.find(row => row.id === booked.appointment.id).professional_id, 'p2');
  const after = await bookingPublic(f.client, { ...any, action: 'availability' }, now);
  assert(!after.slots.some(slot => slot.time === '09:00'));
});

test('business-level closed dates block every professional and are owner-managed only', async () => {
  const f = fixture();
  f.db.BusinessSettings[0].booking_closed_dates = [date];
  await assert.rejects(bookingPublic(f.client, f.request, now), { status: 409 });
  const availability = await bookingPublic(f.client, { ...f.request, action: 'availability' }, now);
  assert.equal(availability.slots.length, 0);
  f.user({ id: 'staff', data: { business_id: 'A', rinno_role: 'business_staff' } });
  await assert.rejects(bookingManage(f.client, { action: 'save_closures', dates: [] }, now), { status: 403 });
  f.user({ id: 'owner', data: { business_id: 'A', rinno_role: 'business_owner' } });
  await bookingManage(f.client, { action: 'save_closures', dates: ['2026-12-25', '2026-12-25'] }, now);
  assert.deepEqual(f.db.BusinessSettings[0].booking_closed_dates, ['2026-12-25']);
});

test('starting-price services preserve their display type in public catalog and appointments', async () => {
  const f = fixture(); f.user({ id: 'owner', data: { business_id: 'A', rinno_role: 'business_owner' } });
  await bookingManage(f.client, { action: 'save_service', id: 's', data: { ...f.db.BookingService[0], price_type: 'from' } }, now);
  const catalog = await bookingPublic(f.client, { action: 'catalog', slug: 'studio' }, now);
  assert.equal(catalog.services[0].price_type, 'from');
  f.user({ id: 'customerA', email: 'a@example.test', data: { rinno_role: 'customer' } });
  await bookingPublic(f.client, f.request, now);
  assert.equal(f.db.Appointment[0].price_type, 'from');
});

test('plan courtesy exempts full operational capacity but normal plans retain configured limits', async () => {
  const { assertPlanCapacity } = await import('../base44/shared/plan-limits.js');
  const f = fixture();
  f.db.Plan.push({ id: 'limited', max_users: 1, max_products: 1 });
  f.db.User.push({ id: 'owner', business_id: 'A', rinno_role: 'business_owner' });
  f.db.Subscription.push({ business_id: 'A', plan_id: 'limited', status: 'active', billing_exempt: true });
  await assertPlanCapacity(f.client, 'A', 'users');
  f.db.Subscription[0].billing_exempt = false;
  await assert.rejects(assertPlanCapacity(f.client, 'A', 'users'), { status: 409 });
});

test('business and admin accounts cannot reserve through the customer storefront', async () => {
  for (const account of [
    { id: 'owner', email: 'owner@example.test', data: { business_id: 'A', rinno_role: 'business_owner' } },
    { id: 'admin', email: 'companyxoxa@gmail.com', role: 'admin' },
  ]) {
    const f = fixture(); f.user(account);
    await assert.rejects(bookingPublic(f.client, f.request, now), { status: 403 });
    assert.equal(f.db.Appointment.length, 0);
  }
});
test('owner and staff scoped permissions; foreign appointment cannot be changed', async () => {
  const f = fixture(); await bookingPublic(f.client, f.request, now);
  f.user({ id: 'otherOwner', data: { business_id: 'B', rinno_role: 'business_owner' } });
  await assert.rejects(bookingManage(f.client, { action: 'status', id: f.db.Appointment[0].id, status: 'confirmed' }, now), { status: 404 });
  f.user({ id: 'staff', data: { business_id: 'A', rinno_role: 'business_staff' } });
  await assert.rejects(bookingManage(f.client, { action: 'save_service', data: { name: 'Nuevo', active: true } }, now), { status: 403 });
  const list = await bookingManage(f.client, { action: 'list', date }, now); assert.equal(list.can_edit, false);
});
test('customer list and cancellation cannot access another account', async () => {
  const f = fixture(); await bookingPublic(f.client, f.request, now);
  f.user({ id: 'otherCustomer', data: { rinno_role: 'customer' } });
  assert.equal((await bookingCustomer(f.client, { action: 'list' })).appointments.length, 0);
  await assert.rejects(bookingCustomer(f.client, { action: 'cancel', id: f.db.Appointment[0].id }), { status: 404 });
});
test('service/professional writes ignore injected tenant; archived service is not bookable', async () => {
  const f = fixture(); f.user({ id: 'owner', data: { business_id: 'A', rinno_role: 'business_owner' } });
  await bookingManage(f.client, { action: 'save_service', id: 's', data: { ...f.db.BookingService[0], active: false, business_id: 'B' } });
  assert.equal(f.db.BookingService[0].business_id, 'A');
  f.user({ id: 'customerA', email: 'a@example.test', data: { rinno_role: 'customer' } });
  await assert.rejects(bookingPublic(f.client, f.request, now), { status: 409 });
  f.user({ id: 'owner', data: { business_id: 'A', rinno_role: 'business_owner' } });
  await assert.rejects(bookingManage(f.client, { action: 'save_professional', data: { ...f.db.BookingProfessional[0], service_ids: ['sB'] } }), { status: 404 });
});
test('new entity RLS is closed to direct client reads and writes', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const entity of ['BookingService', 'BookingProfessional', 'Appointment', 'CscCatalogItem', 'CscDispensation', 'CscVisit', 'CscNotice']) {
    const schema = JSON.parse(await readFile(new URL(`../base44/entities/${entity}.jsonc`, import.meta.url)));
    assert.deepEqual(schema.rls, { create: false, read: false, update: false, delete: false });
  }
});
test('six demo installations preserve original data and are safe to rerun', async () => {
  const f = fixture(); f.user({ id: 'admin', role: 'admin', email: 'companyxoxa@gmail.com' });
  const original = structuredClone(f.db.Business[0]);
  for (const id of ['fresh-market','butcher-craft','barber-studio','beauty-spa','retail-store','association-community']) {
    assert.equal((await installDemo(f.client,{template_id:id})).status,200);
    const before = Object.fromEntries(Object.entries(f.db).filter(([name])=>name!=='AuditLog').map(([name,rows])=>[name,rows.length]));
    assert.equal((await installDemo(f.client,{template_id:id})).status,200);
    for(const [name,count] of Object.entries(before)) assert.equal(f.db[name].length,count);
  }
  assert.deepEqual(f.db.Business[0], original);
  assert.equal(f.db.FulfillmentSlot.length,36);
  const association=f.db.Business.find(b=>b.template_id==='association-community');
  assert.equal(association.business_mode,'ASSOCIATION');
  assert.equal(f.db.Subscription.length,6);
  assert.equal(f.db.Subscription.find(s=>s.business_id===association.id).plan_id,'demo-plan');
  assert.equal((await installDemo(f.client,{template_id:'nonexistent'})).status,400);
});
test('demo installer refuses to replace an existing merchant with the demo slug', async () => {
  const f=fixture(); f.user({id:'admin',role:'admin',email:'companyxoxa@gmail.com'});
  f.db.Business.push({id:'protected',slug:'rinno-demo-09',business_name:'Cliente real'});
  assert.equal((await installDemo(f.client,{template_id:'butcher-craft'})).status,409);
  assert.equal(f.db.Product.length,0);
});
test('a forged support context from a non-admin cannot read another tenant', async () => {
  const f=fixture(); f.user({id:'staff',data:{rinno_role:'business_staff',business_id:'B',support_business_id:'A'}});
  await assert.rejects(bookingManage(f.client,{action:'list',date}),{status:403});
});
test('invalid dates and expired horizon never generate availability', () => {
  for (const value of ['2026-13-01','2026-01-32',{},null]) assert.throws(()=>validDate(value));
  const f=fixture(), context={professional:f.db.BookingProfessional[0],service:f.db.BookingService[0],appointments:[],now};
  assert.equal(availableSlots({...context,date:'2026-09-22'}).length,0);
  assert.equal(availableSlots({...context,date:'2027-09-23'}).length,0);
});

