import { withBusinessMutation } from './business-mutation.js';
import { assert, availableSlots, minutes, validateSchedule, validDate, APPOINTMENT_STATES } from './booking.js';
import { hasBooking, validImage } from './templates.js';
import { getUserBusinessId, canManageOrders, canManageConfig, createAuditLog, resolveBusinessBySlug, isCustomer, isSuperAdmin, ensureMembership } from './rinno.ts';

// Every entity is private by RLS. Only these scoped server handlers expose data.
export async function allRows(entity, filter) {
  const rows = [];
  for (let skip = 0; ; skip += 200) {
    const page = await entity.filter(filter, 'id', 200, skip);
    rows.push(...page);
    if (page.length < 200) return rows;
    assert(rows.length < 20000, 'Demasiados registros; acota la consulta', 422);
  }
}
async function publicBusiness(client, slug) {
  const business = await resolveBusinessBySlug(client, slug);
  assert(business && ['active', 'trial'].includes(business.status) && hasBooking(business), 'Reservas no disponibles', 404);
  const settings = await client.asServiceRole.entities.BusinessSettings.filter({ business_id: business.id });
  assert(settings[0]?.online_store_active !== false, 'Reservas no disponibles', 404);
  return business;
}
async function scoped(entity, businessId, id) {
  assert(typeof id === 'string' && id.length > 0, 'Registro requerido');
  const rows = await entity.filter({ business_id: businessId, id });
  assert(rows[0], 'Registro no encontrado', 404);
  return rows[0];
}
function publicService(s) { return { id: s.id, name: s.name, description: s.description, price: s.price, price_type: s.price_type === 'from' ? 'from' : 'fixed', duration_minutes: s.duration_minutes, image: s.image, active: s.active }; }
function publicProfessional(p) { return { id: p.id, name: p.name, specialty: p.specialty, photo: p.photo, service_ids: p.service_ids, active: p.active }; }
async function bookingOptions(client, business, body, now, excludeAppointmentId = null) {
  const entities = client.asServiceRole.entities;
  const [service, professionals, settings, appointments] = await Promise.all([
    scoped(entities.BookingService, business.id, body.service_id),
    body.professional_id === 'any'
      ? allRows(entities.BookingProfessional, { business_id: business.id, active: true })
      : Promise.all([scoped(entities.BookingProfessional, business.id, body.professional_id)]),
    entities.BusinessSettings.filter({ business_id: business.id }),
    allRows(entities.Appointment, { business_id: business.id, date: validDate(body.date) }),
  ]);
  const closedDates = settings[0]?.booking_closed_dates || [];
  const eligible = professionals.filter(p => p.active && p.service_ids?.includes(service.id));
  const blockingAppointments = excludeAppointmentId ? appointments.filter(a => a.id !== excludeAppointmentId) : appointments;
  const options = eligible.flatMap(professional => availableSlots({
    professional, service, appointments: blockingAppointments, date: body.date, closedDates,
    timezone: business.timezone || 'Europe/Madrid', now,
  }).map(slot => ({ ...slot, professional })));
  return { service, eligible, options, closedDates, appointments, date: body.date, timezone: business.timezone || 'Europe/Madrid' };
}
async function bookingPublicUnlocked(client, body, now = Date.now()) {
  const business = await publicBusiness(client, body.slug);
  const e = client.asServiceRole.entities;
  if (body.action === 'catalog') {
    const [services, professionals] = await Promise.all([
      allRows(e.BookingService, { business_id: business.id, active: true }),
      allRows(e.BookingProfessional, { business_id: business.id, active: true }),
    ]);
    return { services: services.map(publicService), professionals: professionals.map(publicProfessional), timezone: business.timezone || 'Europe/Madrid' };
  }
  if (body.action === 'lookup') {
    const fail = () => { const error = new Error('No hemos podido encontrar una reserva con esos datos.'); error.status = 404; throw error; };
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    if (!reference || (!email && !phone)) fail();
    const rows = await e.Appointment.filter({ business_id: business.id, id: reference });
    const appointment = rows[0];
    if (!appointment) fail();
    const emailMatches = email && (appointment.customer_email || '').trim().toLowerCase() === email;
    const phoneMatches = phone && (appointment.phone || '').replace(/\D/g, '') === phone;
    if (!emailMatches && !phoneMatches) fail();
    return { appointment: {
      reference: appointment.id, status: appointment.status,
      service_name: appointment.service_name, professional_name: appointment.professional_name,
      date: appointment.date, start_time: appointment.start_time, end_time: appointment.end_time,
      timezone: appointment.timezone, price: appointment.price, price_type: appointment.price_type === 'from' ? 'from' : 'fixed',
      business_name: business.business_name, business_slug: business.slug,
    } };
  }
  assert(['availability', 'reserve'].includes(body.action), 'Acción no válida');
  const context = await bookingOptions(client, business, body, now);
  const slotsByTime = new Map();
  for (const option of context.options) if (!slotsByTime.has(option.time)) slotsByTime.set(option.time, { time: option.time, end_time: option.end_time, starts_at: option.starts_at, ends_at: option.ends_at });
  const slots = [...slotsByTime.values()].sort((a, b) => a.time.localeCompare(b.time));
  if (body.action === 'availability') return { slots };
  const user = await client.auth.me().catch(() => null);
  if (user) assert(isCustomer(user), 'Utiliza una cuenta de cliente para reservar', 403);
  assert(typeof body.request_id === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(body.request_id), 'Identificador de solicitud no válido');
  const customerEmail = user?.email || (typeof body.customer_email === 'string' ? body.customer_email.trim().toLowerCase() : '');
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) && customerEmail.length <= 254, 'Introduce un correo válido');
  const existing = await e.Appointment.filter({ business_id: business.id, request_id: body.request_id });
  if (existing[0]) {
    const a = existing[0];
    const professionalMatches = body.professional_id === 'any' || a.professional_id === body.professional_id;
    assert(a.service_id === body.service_id && professionalMatches && a.date === body.date && a.start_time === body.time && (a.customer_user_id || null) === (user?.id || null), 'La solicitud ya corresponde a otra cita', 409);
    return { appointment: { id: a.id, status: a.status, date: a.date, start_time: a.start_time } };
  }
  const option = context.options.find(s => s.time === body.time && (body.professional_id === 'any' || s.professional.id === body.professional_id));
  assert(option, 'La hora ya no está disponible. Elige otra.', 409);
  assert(typeof body.customer_name === 'string' && body.customer_name.trim().length >= 2 && body.customer_name.length <= 100, 'Introduce tu nombre');
  assert(typeof body.phone === 'string' && /^[+()\d\s-]{7,25}$/.test(body.phone), 'Introduce un teléfono válido');
  assert(body.privacy_accepted === true, 'Acepta el uso de tus datos para gestionar la cita');
  if (user) await ensureMembership(client, user.id, business.id, { first_name: body.customer_name.trim(), last_name: '', phone: body.phone.trim(), email: customerEmail, marketing_consent: false });
  const a = await e.Appointment.create({
    business_id: business.id, customer_user_id: user?.id || null, request_id: body.request_id,
    service_id: context.service.id, professional_id: option.professional.id,
    service_name: context.service.name, professional_name: option.professional.name,
    price: context.service.price, price_type: context.service.price_type === 'from' ? 'from' : 'fixed', duration_minutes: context.service.duration_minutes,
    date: body.date, start_time: option.time, end_time: option.end_time, starts_at: option.starts_at, ends_at: option.ends_at,
    timezone: context.timezone, customer_name: body.customer_name.trim(), phone: body.phone.trim(),
    customer_email: customerEmail, privacy_accepted_at: new Date(now).toISOString(), status: 'pending',
  });
  if (user) await createAuditLog(client, user, 'appointment.requested', { business_id: business.id, entity_type: 'Appointment', entity_id: a.id });
  else await e.AuditLog.create({ actor_user_id: 'public', actor_role: 'customer_guest', business_id: business.id, action: 'appointment.requested', entity_type: 'Appointment', entity_id: a.id, metadata: {} });
  return { appointment: { id: a.id, status: a.status, date: a.date, start_time: a.start_time, professional_name: a.professional_name } };
}

async function bookingManageUnlocked(client, body, now = Date.now()) {
  const user = await client.auth.me().catch(() => null);
  assert(user, 'No autenticado', 401);
  const support = user.data?.support_business_id || user.support_business_id;
  assert(!support || isSuperAdmin(user), 'Modo soporte no autorizado', 403);
  assert(isSuperAdmin(user) || ['business_owner', 'business_staff'].includes(user.data?.rinno_role || user.rinno_role), 'Acceso denegado', 403);
  assert(canManageOrders(user), 'Acceso denegado', 403);
  const bid = getUserBusinessId(user);
  assert(bid, 'Sin negocio asociado', 403);
  const e = client.asServiceRole.entities;
  const business = await e.Business.get(bid);
  assert(business && hasBooking(business), 'Este negocio no tiene reservas activadas', 403);
  if (body.action === 'list') {
    validDate(body.date);
    const [services, professionals, appointments, settings] = await Promise.all([
      allRows(e.BookingService, { business_id: bid }), allRows(e.BookingProfessional, { business_id: bid }),
      allRows(e.Appointment, { business_id: bid, date: body.date }),
      e.BusinessSettings.filter({ business_id: bid }),
    ]);
    return { services, professionals, appointments, booking_closed_dates: settings[0]?.booking_closed_dates || [], can_edit: canManageConfig(user), timezone: business.timezone || 'Europe/Madrid' };
  }
  assert(['save_service', 'save_professional', 'save_closures', 'status'].includes(body.action), 'Acción no válida');
  if (body.action === 'status') {
    const a = await scoped(e.Appointment, bid, body.id);
    assert(APPOINTMENT_STATES[a.status]?.includes(body.status), 'Cambio de estado no permitido', 409);
    if (body.status === 'confirmed') {
      assert(Date.parse(a.starts_at) > now, 'No se puede confirmar una cita pasada');
      const others = await allRows(e.Appointment, { business_id: bid, professional_id: a.professional_id, date: a.date });
      assert(!others.some(other => other.id !== a.id && other.status === 'confirmed' && minutes(a.start_time) < minutes(other.end_time) && minutes(a.end_time) > minutes(other.start_time)), 'Existe otra cita confirmada en esa franja', 409);
      const context = await bookingOptions(client, business, { ...a }, now - 30 * 60000, a.id);
      assert(context.options.some(s => s.professional.id === a.professional_id && s.time === a.start_time && s.end_time === a.end_time), 'El horario o servicio ha cambiado; revisa la cita', 409);
    }
    if (['completed', 'no_show'].includes(body.status)) assert(Date.parse(a.starts_at) <= now, 'La cita todavía no ha comenzado');
    await e.Appointment.update(a.id, { status: body.status });
    await createAuditLog(client, user, 'appointment.status_updated', { business_id: bid, entity_type: 'Appointment', entity_id: a.id, metadata: { from: a.status, to: body.status } });
    return { ok: true };
  }
  assert(canManageConfig(user), 'Solo el propietario puede gestionar servicios y personal', 403);
  if (body.action === 'save_closures') {
    assert(Array.isArray(body.dates) && body.dates.length <= 500, 'Fechas de cierre no válidas');
    const dates = [...new Set(body.dates.map(validDate))].sort();
    const rows = await e.BusinessSettings.filter({ business_id: bid });
    if (rows[0]) await e.BusinessSettings.update(rows[0].id, { booking_closed_dates: dates });
    else await e.BusinessSettings.create({ business_id: bid, booking_closed_dates: dates });
    await createAuditLog(client, user, 'booking.closures_saved', { business_id: bid, metadata: { count: dates.length } });
    return { ok: true, dates };
  }
  const data = body.data || {};
  assert(typeof data.name === 'string' && data.name.trim().length > 0 && data.name.length <= 100, 'Nombre requerido (máximo 100 caracteres)');
  assert(typeof data.active === 'boolean', 'Estado activo requerido');
  const serviceAction = body.action === 'save_service';
  const entity = serviceAction ? e.BookingService : e.BookingProfessional;
  if (body.id) await scoped(entity, bid, body.id);
  let safe;
  if (serviceAction) {
    assert(Number.isInteger(data.price) && data.price >= 0 && data.price <= 1000000, 'Precio no válido');
    assert(Number.isInteger(data.duration_minutes) && data.duration_minutes >= 5 && data.duration_minutes <= 480, 'Duración entre 5 y 480 minutos');
    assert(validImage(data.image || ''), 'Imagen no válida');
    assert(data.price_type === undefined || ['fixed', 'from'].includes(data.price_type), 'Tipo de precio no válido');
    safe = { name: data.name.trim(), price: data.price, price_type: data.price_type === 'from' ? 'from' : 'fixed', duration_minutes: data.duration_minutes, image: data.image || '', description: String(data.description || '').slice(0, 1500), active: data.active };
  } else {
    validateSchedule(data.schedule, data.days_off);
    assert(validImage(data.photo || ''), 'Foto no válida');
    assert(Array.isArray(data.service_ids) && data.service_ids.length <= 100, 'Servicios no válidos');
    for (const id of data.service_ids) await scoped(e.BookingService, bid, id);
    safe = { name: data.name.trim(), specialty: String(data.specialty || '').slice(0, 240), photo: data.photo || '', service_ids: [...new Set(data.service_ids)], schedule: data.schedule.map(r => ({ day: r.day, start: r.start, end: r.end })), days_off: data.days_off, active: data.active };
  }
  const row = body.id ? await entity.update(body.id, safe) : await entity.create({ ...safe, business_id: bid });
  await createAuditLog(client, user, serviceAction ? 'booking.service_saved' : 'booking.professional_saved', { business_id: bid, entity_id: row.id });
  return { ok: true, id: row.id };
}

async function bookingCustomerUnlocked(client, body) {
  const user = await client.auth.me().catch(() => null);
  assert(user, 'No autenticado', 401);
  const e = client.asServiceRole.entities;
  if (body.action === 'list') return { appointments: await allRows(e.Appointment, { customer_user_id: user.id }) };
  assert(body.action === 'cancel', 'Acción no válida');
  const rows = await e.Appointment.filter({ id: body.id, customer_user_id: user.id });
  const a = rows[0];
  assert(a, 'Cita no encontrada', 404);
  assert(['pending', 'confirmed'].includes(a.status) && Date.parse(a.starts_at) > Date.now(), 'Esta cita ya no se puede cancelar', 409);
  await e.Appointment.update(a.id, { status: 'cancelled' });
  await createAuditLog(client, user, 'appointment.cancelled', { business_id: a.business_id, entity_id: a.id });
  return { ok: true };
}

export async function bookingPublic(client, body, now = Date.now()) {
  if (body.action !== 'reserve') return bookingPublicUnlocked(client, body, now);
  const user = await client.auth.me().catch(() => null);
  if (user) assert(isCustomer(user), 'Utiliza una cuenta de cliente para reservar', 403);
  const business = await publicBusiness(client, body.slug);
  return withBusinessMutation(client, business.id, () => bookingPublicUnlocked(client, body, now));
}
export async function bookingManage(client, body, now = Date.now()) {
  if (body.action === 'list') return bookingManageUnlocked(client, body, now);
  const user = await client.auth.me().catch(() => null);
  assert(user, 'No autenticado', 401);
  assert(!(user.data?.support_business_id || user.support_business_id) || isSuperAdmin(user), 'Modo soporte no autorizado', 403);
  assert(isSuperAdmin(user) || ['business_owner','business_staff'].includes(user.data?.rinno_role || user.rinno_role), 'Acceso denegado', 403);
  assert(canManageOrders(user), 'Acceso denegado', 403);
  const bid = getUserBusinessId(user); assert(bid, 'Sin negocio asociado', 403);
  return withBusinessMutation(client, bid, () => bookingManageUnlocked(client, body, now));
}
export async function bookingCustomer(client, body) {
  if (body.action !== 'cancel') return bookingCustomerUnlocked(client, body);
  const user = await client.auth.me().catch(() => null); assert(user, 'No autenticado', 401);
  const rows = await client.asServiceRole.entities.Appointment.filter({ id: body.id, customer_user_id: user.id });
  assert(rows[0], 'Cita no encontrada', 404);
  return withBusinessMutation(client, rows[0].business_id, () => bookingCustomerUnlocked(client, body));
}

