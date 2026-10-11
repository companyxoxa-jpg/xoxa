// RINNO Asociaciones — Fase A4: activities, capacity and FIFO enrollments.
import { withBusinessMutation, MutationLockError } from './business-mutation.js';
import {
  getUserBusinessId, requirePermission, createAuditLog, sanitizeData,
  AssociationError, ValidationError, NotFoundError, ConflictError, AuthorizationError,
} from './associations.js';

export { AssociationError, ValidationError, NotFoundError, ConflictError, AuthorizationError, MutationLockError };

export const ACTIVITY_STATUS_VALUES = ['draft', 'published', 'full', 'cancelled', 'completed'];
export const ENROLLMENT_STATUS_VALUES = ['pending', 'confirmed', 'waitlisted', 'cancelled', 'attended', 'no_show'];
const EFFECTIVE_ENROLLMENT_STATUSES = new Set(['pending', 'confirmed', 'waitlisted']);
const ACTIVITY_FIELDS = ['title', 'description', 'start_at', 'end_at', 'location', 'capacity', 'is_public', 'enrollment_open', 'enrollment_until', 'check_in_enabled', 'is_paid', 'price'];

function validateActivityData(data, existing = {}) {
  const d = { ...existing, ...data };
  if (!d.title || !String(d.title).trim()) throw new ValidationError('Título obligatorio');
  if (!d.start_at || !Number.isFinite(new Date(d.start_at).getTime())) throw new ValidationError('Fecha de inicio no válida');
  if (d.end_at && new Date(d.end_at) <= new Date(d.start_at)) throw new ValidationError('La fecha final debe ser posterior al inicio');
  if (d.enrollment_until && !Number.isFinite(new Date(d.enrollment_until).getTime())) throw new ValidationError('Fecha límite no válida');
  if (d.capacity != null) {
    const capacity = Number(d.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) throw new ValidationError('La capacidad debe ser un entero mayor que cero');
    data.capacity = capacity;
  }
  data.is_paid = d.is_paid === true;
  if (data.is_paid) {
    const price = Number(d.price);
    if (!Number.isInteger(price) || price <= 0) throw new ValidationError('El precio debe ser un entero positivo');
    data.price = price;
  } else data.price = null;
}

async function decorateActivity(client, activity) {
  const confirmed = (await client.asServiceRole.entities.Enrollment.filter({ business_id: activity.business_id, activity_id: activity.id, status: 'confirmed' })).length;
  const unlimited = activity.capacity == null;
  const full = !unlimited && confirmed >= activity.capacity;
  return { ...activity, confirmed_count: confirmed, available_places: unlimited ? null : Math.max(0, activity.capacity - confirmed), effective_status: activity.status === 'published' && full ? 'full' : activity.status };
}

export async function manageActivity(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const write = ['create', 'update', 'publish', 'cancel', 'complete'].includes(body.action);
  await requirePermission(client, user, bid, write ? 'activities.manage' : 'activities.read');
  if (body.action === 'list') {
    const rows = await client.asServiceRole.entities.Activity.filter({ business_id: bid });
    return { activities: await Promise.all(rows.map(a => decorateActivity(client, a))) };
  }
  if (body.action === 'get') {
    const a = await client.asServiceRole.entities.Activity.get(body.activity_id);
    if (!a || a.business_id !== bid) throw new NotFoundError('Actividad no encontrada');
    return { activity: await decorateActivity(client, a) };
  }
  if (body.action === 'create') {
    const data = sanitizeData(body.activity_data || {}, ACTIVITY_FIELDS);
    validateActivityData(data);
    const now = new Date().toISOString();
    const activity = await client.asServiceRole.entities.Activity.create({ business_id: bid, ...data, is_public: data.is_public === true, enrollment_open: data.enrollment_open === true, check_in_enabled: data.check_in_enabled === true, status: 'draft', created_by: user.id, created_at: now });
    await createAuditLog(client, user, 'activity.created', { business_id: bid, entity_type: 'Activity', entity_id: activity.id });
    return { activity: await decorateActivity(client, activity) };
  }
  return withBusinessMutation(client, bid, async () => {
    const a = await client.asServiceRole.entities.Activity.get(body.activity_id);
    if (!a || a.business_id !== bid) throw new NotFoundError('Actividad no encontrada');
    if (body.action === 'update') {
      if (['completed', 'cancelled'].includes(a.status)) throw new ConflictError('La actividad ya no se puede editar');
      const data = sanitizeData(body.activity_data || {}, ACTIVITY_FIELDS);
      if (!Object.keys(data).length) throw new ValidationError('Sin campos para actualizar');
      validateActivityData(data, a);
      const updated = await client.asServiceRole.entities.Activity.update(a.id, data);
      await createAuditLog(client, user, 'activity.updated', { business_id: bid, entity_type: 'Activity', entity_id: a.id, metadata: { fields: Object.keys(data) } });
      return { activity: await decorateActivity(client, updated) };
    }
    const targets = { publish: 'published', cancel: 'cancelled', complete: 'completed' };
    if (!(body.action in targets)) throw new ValidationError('Acción no válida');
    if (a.status === 'completed') throw new ConflictError('La actividad ya está completada');
    if (body.action === 'publish' && a.status !== 'draft') throw new ConflictError('Solo se puede publicar un borrador');
    if (body.action === 'complete' && !['published', 'full'].includes(a.status)) throw new ConflictError('La actividad no está publicada');
    const updated = await client.asServiceRole.entities.Activity.update(a.id, { status: targets[body.action], ...(body.action === 'cancel' ? { enrollment_open: false } : {}) });
    await createAuditLog(client, user, `activity.${targets[body.action]}`, { business_id: bid, entity_type: 'Activity', entity_id: a.id });
    return { activity: await decorateActivity(client, updated) };
  });
}

function membershipIsCurrent(m, today) {
  return m.status === 'active' && (!m.start_date || m.start_date <= today) && (!m.end_date || m.end_date >= today);
}
async function assertEligible(client, bid, activity, member) {
  if (!activity || activity.business_id !== bid) throw new NotFoundError('Actividad no encontrada');
  if (!member || member.business_id !== bid) throw new NotFoundError('Socio no encontrado');
  if (member.status !== 'active') throw new ConflictError('El socio no está activo');
  if (activity.status !== 'published' || !activity.enrollment_open) throw new ConflictError('La inscripción no está abierta');
  if (activity.enrollment_until && new Date(activity.enrollment_until) < new Date()) throw new ConflictError('El plazo de inscripción ha finalizado');
  const today = new Date().toISOString().slice(0, 10);
  const memberships = await client.asServiceRole.entities.Membership.filter({ business_id: bid, member_id: member.id });
  if (!memberships.some(m => membershipIsCurrent(m, today))) throw new ConflictError('El socio no tiene una membresía vigente');
}
async function resolveSelf(client, user, businessId) {
  const matches = await client.asServiceRole.entities.Member.filter({ user_id: user.id });
  const hinted = businessId || getUserBusinessId(user);
  const eligible = hinted ? matches.filter(m => m.business_id === hinted) : matches;
  if (eligible.length !== 1) throw new AuthorizationError('No existe un socio vinculado de forma unívoca');
  return eligible[0];
}
async function enrollLocked(client, user, bid, activityId, memberId, notes, admin) {
  const activity = await client.asServiceRole.entities.Activity.get(activityId);
  const member = await client.asServiceRole.entities.Member.get(memberId);
  await assertEligible(client, bid, activity, member);
  const prior = await client.asServiceRole.entities.Enrollment.filter({ business_id: bid, activity_id: activity.id, member_id: member.id });
  if (prior.some(e => EFFECTIVE_ENROLLMENT_STATUSES.has(e.status))) throw new ConflictError('El socio ya tiene una inscripción efectiva');
  const confirmed = (await client.asServiceRole.entities.Enrollment.filter({ business_id: bid, activity_id: activity.id, status: 'confirmed' })).length;
  const status = activity.capacity == null || confirmed < activity.capacity ? 'confirmed' : 'waitlisted';
  const enrollment = await client.asServiceRole.entities.Enrollment.create({ business_id: bid, activity_id: activity.id, member_id: member.id, enrolled_at: new Date().toISOString(), status, check_in_at: null, cancelled_at: null, cancellation_reason: null, notes: notes || null });
  if (admin) await createAuditLog(client, user, 'enrollment.created', { business_id: bid, entity_type: 'Enrollment', entity_id: enrollment.id, metadata: { activity_id: activity.id, member_id: member.id, status } });
  return enrollment;
}
async function promoteWaitlist(client, bid, activity) {
  if (activity.status !== 'published' || !activity.enrollment_open) return null;
  const waiting = await client.asServiceRole.entities.Enrollment.filter({ business_id: bid, activity_id: activity.id, status: 'waitlisted' });
  waiting.sort((a, b) => String(a.enrolled_at).localeCompare(String(b.enrolled_at)) || String(a.id).localeCompare(String(b.id)));
  for (const candidate of waiting) {
    const member = await client.asServiceRole.entities.Member.get(candidate.member_id);
    try {
      await assertEligible(client, bid, activity, member);
      return await client.asServiceRole.entities.Enrollment.update(candidate.id, { status: 'confirmed' });
    } catch (error) {
      if (!(error instanceof AssociationError)) throw error;
      await client.asServiceRole.entities.Enrollment.update(candidate.id, { status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: 'waitlist_ineligible' });
    }
  }
  return null;
}
async function cancelLocked(client, user, bid, enrollment, reason, admin) {
  if (!EFFECTIVE_ENROLLMENT_STATUSES.has(enrollment.status)) throw new ConflictError('La inscripción no está activa');
  const wasConfirmed = enrollment.status === 'confirmed';
  const updated = await client.asServiceRole.entities.Enrollment.update(enrollment.id, { status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: reason || null });
  let promoted = null;
  if (wasConfirmed) {
    const activity = await client.asServiceRole.entities.Activity.get(enrollment.activity_id);
    if (activity && activity.business_id === bid) promoted = await promoteWaitlist(client, bid, activity);
  }
  if (admin) await createAuditLog(client, user, 'enrollment.cancelled', { business_id: bid, entity_type: 'Enrollment', entity_id: enrollment.id, metadata: { reason: reason || null, promoted_id: promoted?.id || null } });
  return { enrollment: updated, promoted };
}

export async function manageEnrollment(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const write = ['enroll', 'cancel', 'set_status'].includes(body.action);
  await requirePermission(client, user, bid, write ? 'enrollments.manage' : 'enrollments.read');
  if (body.action === 'list') {
    const filter = { business_id: bid };
    if (body.activity_id) filter.activity_id = body.activity_id;
    if (body.member_id) filter.member_id = body.member_id;
    return { enrollments: await client.asServiceRole.entities.Enrollment.filter(filter) };
  }
  if (body.action === 'enroll') return withBusinessMutation(client, bid, async () => ({ enrollment: await enrollLocked(client, user, bid, body.activity_id, body.member_id, body.notes, true) }));
  return withBusinessMutation(client, bid, async () => {
    const enrollment = await client.asServiceRole.entities.Enrollment.get(body.enrollment_id);
    if (!enrollment || enrollment.business_id !== bid) throw new NotFoundError('Inscripción no encontrada');
    if (body.action === 'cancel') return cancelLocked(client, user, bid, enrollment, body.reason, true);
    if (body.action === 'set_status') {
      if (!['attended', 'no_show'].includes(body.status) || enrollment.status !== 'confirmed') throw new ValidationError('Cambio de estado no permitido');
      const activity = await client.asServiceRole.entities.Activity.get(enrollment.activity_id);
      if (!activity || activity.business_id !== bid) throw new NotFoundError('Actividad no encontrada');
      if (!activity.check_in_enabled) throw new ConflictError('El control de asistencia no está habilitado para esta actividad');
      const updated = await client.asServiceRole.entities.Enrollment.update(enrollment.id, { status: body.status, ...(body.status === 'attended' ? { check_in_at: body.check_in_at || new Date().toISOString() } : {}) });
      await createAuditLog(client, user, `enrollment.${body.status}`, { business_id: bid, entity_type: 'Enrollment', entity_id: enrollment.id });
      return { enrollment: updated };
    }
    throw new ValidationError('Acción no válida');
  });
}

export async function enrollSelf(client, user, body) {
  const activity = await client.asServiceRole.entities.Activity.get(body.activity_id);
  if (!activity) throw new NotFoundError('Actividad no encontrada');
  const member = await resolveSelf(client, user, activity.business_id);
  return withBusinessMutation(client, member.business_id, async () => ({ enrollment: await enrollLocked(client, user, member.business_id, body.activity_id, member.id, body.notes, false) }));
}

export async function cancelOwnEnrollment(client, user, body) {
  const enrollment = await client.asServiceRole.entities.Enrollment.get(body.enrollment_id);
  if (!enrollment) throw new NotFoundError('Inscripción no encontrada');
  const member = await resolveSelf(client, user, enrollment.business_id);
  return withBusinessMutation(client, member.business_id, async () => {
    if (!enrollment || enrollment.business_id !== member.business_id || enrollment.member_id !== member.id) throw new NotFoundError('Inscripción no encontrada');
    return cancelLocked(client, user, member.business_id, enrollment, body.reason, false);
  });
}
