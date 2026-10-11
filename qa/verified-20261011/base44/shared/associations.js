// RINNO Asociaciones — core authorization, allowlists, and business logic
// for Member, RoleAssignment, MembershipPlan, Membership (Fase A1).
//
// This module is shared by all Asociaciones backend functions so authorization
// checks are never duplicated. Entry functions (base44/functions/*/entry.ts)
// are thin wrappers: they build the SDK client from the request, call the
// functions exported here, and convert thrown AssociationError subclasses into
// HTTP responses.
//
// Design rules (from A0/A1):
// - Tenant is ALWAYS resolved from the authenticated user (getUserBusinessId),
//   never from the request body — the frontend cannot alter business_id to
//   operate on another tenant.
// - RLS provides inter-tenant isolation; RoleAssignment provides intra-tenant
//   authorization. Default-deny: no role / no matching permission => 403.
// - Owner conserves total access within its tenant (full permission set).
// - Mutations that must be serialized per-tenant (member_number generation,
//   membership create/renew) run inside withBusinessMutation.
import { withBusinessMutation, MutationLockError } from './business-mutation.js';

export { MutationLockError };

// ---- Identity / authorization helpers (mirror base44/shared/rinno.ts) ----
// Inlined here (not imported from rinno.ts) so this module is pure JS and
// loadable by the Node test runner without a TypeScript loader, while the
// backend runtime loads it identically. Keep these in sync with rinno.ts.
const SUPER_ADMIN_EMAILS = ['qa-superadmin@rinno.es'];
const SUPER_ADMIN_EMAIL_SET = new Set(SUPER_ADMIN_EMAILS);

function isSuperAdmin(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  return user?.role === 'admin' && SUPER_ADMIN_EMAIL_SET.has(email);
}
function isSupportMode(user) {
  if (!isSuperAdmin(user)) return false;
  return !!(user?.data?.support_business_id || user?.support_business_id);
}
export function getUserBusinessId(user) {
  if (isSuperAdmin(user)) {
    const s = user?.data?.support_business_id || user?.support_business_id;
    if (s) return s;
  }
  return user?.data?.business_id || user?.business_id || null;
}
function getRinnoRole(user) {
  if (isSupportMode(user)) return 'business_owner';
  const r = user?.data?.rinno_role || user?.rinno_role;
  if (r) return r;
  if (isSuperAdmin(user)) return 'super_admin';
  return 'customer';
}
export function sanitizeData(data, allowlist) {
  const s = {};
  if (!data || typeof data !== 'object') return s;
  for (const k of allowlist) { if (k in data) s[k] = data[k]; }
  return s;
}
export async function createAuditLog(client, user, action, details = {}) {
  try {
    await client.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      actor_role: getRinnoRole(user),
      business_id: details.business_id || getUserBusinessId(user) || null,
      action,
      entity_type: details.entity_type || null,
      entity_id: details.entity_id || null,
      metadata: details.metadata || {},
    });
  } catch (e) {
    console.error('RINNO audit write failed');
  }
}

// ---- Errors ----
export class AssociationError extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}
export class ValidationError extends AssociationError { constructor(msg) { super(msg, 400); } }
export class NotFoundError extends AssociationError { constructor(msg) { super(msg, 404); } }
export class ConflictError extends AssociationError { constructor(msg) { super(msg, 409); } }
export class AuthorizationError extends AssociationError { constructor(msg = 'No autorizado') { super(msg, 403); } }

// ---- Roles & Permissions ----
export const ASSOCIATION_ROLES = ['owner', 'admin', 'manager', 'staff', 'accountant', 'viewer'];
export const ASSOCIATION_PERMISSIONS = [
  'members.read', 'members.write',
  'memberships.manage', 'plans.manage',
  'roles.manage', 'config.manage',
  'fees.read', 'fees.manage',
  'payments.read', 'payments.register', 'payments.void',
  'credentials.read', 'credentials.manage', 'credential.validate',
  'activities.read', 'activities.manage',
  'enrollments.read', 'enrollments.manage', 'enrollments.checkin',
  'csc.read', 'csc.manage', 'csc.limits', 'association.records.read', 'association.records.manage',
  'association.compliance.read', 'association.compliance.manage',
];
const ALL_PERMS = new Set(ASSOCIATION_PERMISSIONS);
export const ROLE_PERMISSIONS = {
  owner: ALL_PERMS,
  admin: ALL_PERMS,
  manager: new Set(['members.read', 'members.write', 'memberships.manage', 'plans.manage', 'fees.read', 'fees.manage', 'payments.read', 'payments.register', 'payments.void', 'credentials.read', 'credentials.manage', 'credential.validate', 'activities.read', 'activities.manage', 'enrollments.read', 'enrollments.manage', 'enrollments.checkin', 'csc.read', 'csc.manage', 'csc.limits', 'association.records.read', 'association.records.manage', 'association.compliance.read', 'association.compliance.manage']),
  staff: new Set(['members.read', 'credential.validate', 'activities.read', 'enrollments.read', 'enrollments.manage', 'enrollments.checkin', 'csc.read', 'csc.manage', 'association.records.read', 'association.records.manage', 'association.compliance.read']),
  accountant: new Set(['members.read', 'fees.read', 'payments.read', 'payments.register']),
  viewer: new Set(['members.read', 'fees.read', 'payments.read', 'activities.read', 'enrollments.read', 'csc.read']),
};

export function hasPermission(role, perm) {
  const perms = ROLE_PERMISSIONS[role];
  return !!perms && perms.has(perm);
}

function permissionsFor(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

// Resolve the effective association role for a user within a tenant.
// 1. Super Admin in support mode acts as owner.
// 2. An explicit RoleAssignment (business_id + user_id) wins.
// 3. Fallback: business_owner rinno_role => owner; business_staff => staff.
// 4. Otherwise null => default-deny.
export async function resolveAssociationRole(client, user, businessId) {
  if (!user || !businessId || getUserBusinessId(user) !== businessId) return null;
  if (isSupportMode(user)) return 'owner';
  const assignments = await client.asServiceRole.entities.RoleAssignment.filter(
    { business_id: businessId, user_id: user.id }
  );
  if (assignments.length > 0) return assignments[0].role;
  const rr = getRinnoRole(user);
  if (rr === 'business_owner') return 'owner';
  if (rr === 'business_staff') return 'staff';
  return null;
}

export async function requirePermission(client, user, businessId, perm) {
  if (!user || !businessId || getUserBusinessId(user) !== businessId) throw new AuthorizationError();
  const role = await resolveAssociationRole(client, user, businessId);
  if (role && hasPermission(role, perm)) return role;
  // Explicit granular permission on the RoleAssignment record (permiso explícito).
  // Allows e.g. an accountant to be granted payments.void without changing its role.
  if (user) {
    const assignments = await client.asServiceRole.entities.RoleAssignment.filter({ business_id: businessId, user_id: user.id });
    if (assignments.length > 0 && Array.isArray(assignments[0].permissions) && assignments[0].permissions.includes(perm)) {
      return role || 'explicit';
    }
  }
  throw new AuthorizationError(`Requiere permiso: ${perm}`);
}

// Administrative data is not delegable through generic members.write grants.
export function isAssociationAdministrator(role) { return role === 'owner' || role === 'admin'; }
export function projectMember(member, role) {
  if (!member) return member;
  const result = { ...member };
  if (!isAssociationAdministrator(role)) delete result.internal_notes;
  return result;
}
export function canReadAssociationDocument(role, document) {
  return ['staff', 'members'].includes(document?.audience) ||
    (document?.audience === 'board' && isAssociationAdministrator(role));
}

// ---- Allowlists ----
// Admin-editable fields (dashboard). Internal_notes is admin-only and never
// reaches the member self-edit path.
export const MEMBER_ADMIN_ALLOWLIST = [
  'first_name', 'last_name', 'email', 'phone', 'birth_date', 'photo',
  'emergency_contact_name', 'emergency_contact_phone', 'address', 'metadata', 'internal_notes',
];
// Fields a member may edit on their OWN record (future portal). Never includes
// member_number, status, joined_at, internal_notes, or metadata administrative use.
export const MEMBER_SELF_ALLOWLIST = ['email', 'phone', 'photo', 'address'];
export const MEMBER_STATUS_VALUES = ['pending', 'active', 'suspended', 'resigned', 'expired'];

export const MEMBERSHIP_PLAN_ALLOWLIST = [
  'name', 'code', 'description', 'fee_amount', 'fee_period',
  'duration_months', 'auto_renew', 'is_active', 'sort_order',
];
export const MEMBERSHIP_ALLOWLIST = ['start_date', 'end_date', 'status', 'auto_renew', 'notes'];
export const MEMBERSHIP_STATUS_VALUES = ['pending', 'active', 'expired', 'cancelled', 'suspended'];
export const FEE_PERIOD_VALUES = ['monthly', 'quarterly', 'biannual', 'annual', 'one_time', 'custom'];

// ---- member_number generation ----
// No atomic counter on the platform. The caller serializes per-tenant writes
// with withBusinessMutation, then computes max(existing)+1. Collision is
// pre-checked against the in-memory list; create is retried with the next
// candidate if a concurrent insert slipped in.
export function generateNextMemberNumber(existingNumbers) {
  let max = 0;
  for (const n of existingNumbers || []) {
    const v = parseInt(String(n), 10);
    if (Number.isFinite(v) && v > max) max = v;
  }
  return String(max + 1);
}

function assertMemberData(d) {
  if (!d.first_name || !String(d.first_name).trim()) throw new ValidationError('Nombre obligatorio');
  if (!d.last_name || !String(d.last_name).trim()) throw new ValidationError('Apellidos obligatorios');
  if (d.email != null && d.email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) {
    throw new ValidationError('Email no válido');
  }
}

// ---- Member ----
export async function manageMember(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const writeActions = ['create', 'update', 'set_status'];
  const perm = writeActions.includes(body.action) ? 'members.write' : 'members.read';
  await requirePermission(client, user, bid, perm);
  const memberRole = await resolveAssociationRole(client, user, bid);
  if (['create', 'update'].includes(body.action) && Object.hasOwn(body.member_data || {}, 'internal_notes') && !isAssociationAdministrator(memberRole)) throw new AuthorizationError('Notas internas restringidas');

  if (body.action === 'list') {
    const members = await client.asServiceRole.entities.Member.filter({ business_id: bid });
    return { members: members.map(m => projectMember(m, memberRole)) };
  }
  if (body.action === 'get') {
    const m = await client.asServiceRole.entities.Member.get(body.member_id);
    if (!m || m.business_id !== bid) throw new NotFoundError('Socio no encontrado');
    return { member: projectMember(m, memberRole) };
  }
  if (body.action === 'create') {
    return await withBusinessMutation(client, bid, async () => {
      const existing = await client.asServiceRole.entities.Member.filter({ business_id: bid });
      const existingNumbers = existing.map(m => m.member_number);
      let number = body.member_number != null ? String(body.member_number) : generateNextMemberNumber(existingNumbers);
      let attempts = 0;
      while (existingNumbers.includes(number) && attempts < 50) {
        number = generateNextMemberNumber([...existingNumbers, number]);
        attempts++;
      }
      if (existingNumbers.includes(number)) throw new ConflictError('No se pudo generar un número de socio único');
      const sanitized = sanitizeData(body.member_data || {}, MEMBER_ADMIN_ALLOWLIST);
      assertMemberData(sanitized);
      const status = body.status && MEMBER_STATUS_VALUES.includes(body.status) ? body.status : 'active';
      const member = await client.asServiceRole.entities.Member.create({
        business_id: bid, member_number: number, user_id: null,
        ...sanitized, joined_at: new Date().toISOString(), status,
      });
      await createAuditLog(client, user, 'member.created', { entity_type: 'Member', entity_id: member.id, business_id: bid, metadata: { member_number: number } });
      return { member: projectMember(member, memberRole) };
    });
  }
  if (body.action === 'update') {
    const m = await client.asServiceRole.entities.Member.get(body.member_id);
    if (!m || m.business_id !== bid) throw new NotFoundError('Socio no encontrado');
    const sanitized = sanitizeData(body.member_data || {}, MEMBER_ADMIN_ALLOWLIST);
    if (Object.keys(sanitized).length === 0) throw new ValidationError('Sin campos para actualizar');
    assertMemberData({ ...m, ...sanitized });
    const updated = await client.asServiceRole.entities.Member.update(body.member_id, sanitized);
    await createAuditLog(client, user, 'member.data_changed', { entity_type: 'Member', entity_id: m.id, business_id: bid, metadata: { fields: Object.keys(sanitized) } });
    return { member: projectMember(updated, memberRole) };
  }
  if (body.action === 'set_status') {
    const m = await client.asServiceRole.entities.Member.get(body.member_id);
    if (!m || m.business_id !== bid) throw new NotFoundError('Socio no encontrado');
    if (!MEMBER_STATUS_VALUES.includes(body.status)) throw new ValidationError('Estado no válido');
    const updated = await client.asServiceRole.entities.Member.update(body.member_id, { status: body.status });
    await createAuditLog(client, user, `member.${body.status}`, { entity_type: 'Member', entity_id: m.id, business_id: bid, metadata: { from: m.status } });
    return { member: projectMember(updated, memberRole) };
  }
  throw new ValidationError('Acción no válida');
}

// ---- Link / Unlink User <-> Member ----
// Enforces: a Member has at most one user_id; a user_id is linked to at most
// one Member per tenant. (business_id + user_id uniqueness is enforced here
// since the platform has no conditional unique index.)
export async function linkMemberUser(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  await requirePermission(client, user, bid, 'members.write');

  if (!isAssociationAdministrator(await resolveAssociationRole(client, user, bid))) throw new AuthorizationError('Vinculación restringida a administración');

  if (body.action === 'link') {
    const m = await client.asServiceRole.entities.Member.get(body.member_id);
    if (!m || m.business_id !== bid) throw new NotFoundError('Socio no encontrado');
    if (m.user_id) throw new ConflictError('El socio ya tiene un usuario vinculado');
    if (typeof body.user_id !== 'string' || !body.user_id.trim()) throw new ValidationError('user_id obligatorio');
    const target = await client.asServiceRole.entities.User.get(body.user_id);
    const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!target || target.is_verified !== true || !normalize(m.email) || normalize(target.email) !== normalize(m.email) || (getUserBusinessId(target) && getUserBusinessId(target) !== bid)) throw new AuthorizationError('Identidad de socio no verificada');
    const taken = await client.asServiceRole.entities.Member.filter({ business_id: bid, user_id: body.user_id });
    if (taken.length > 0) throw new ConflictError('El usuario ya está vinculado a otro socio de la asociación');
    const updated = await client.asServiceRole.entities.Member.update(body.member_id, { user_id: body.user_id });
    await createAuditLog(client, user, 'member.user_linked', { entity_type: 'Member', entity_id: m.id, business_id: bid, metadata: { user_id: body.user_id } });
    return { member: updated };
  }
  if (body.action === 'unlink') {
    const m = await client.asServiceRole.entities.Member.get(body.member_id);
    if (!m || m.business_id !== bid) throw new NotFoundError('Socio no encontrado');
    if (!m.user_id) throw new ConflictError('El socio no tiene usuario vinculado');
    const updated = await client.asServiceRole.entities.Member.update(body.member_id, { user_id: null });
    await createAuditLog(client, user, 'member.user_unlinked', { entity_type: 'Member', entity_id: m.id, business_id: bid });
    return { member: updated };
  }
  throw new ValidationError('Acción no válida');
}

// ---- RoleAssignment ----
export async function manageRoleAssignment(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const writeActions = ['set', 'remove'];
  const perm = writeActions.includes(body.action) ? 'roles.manage' : 'members.read';
  await requirePermission(client, user, bid, perm);

  if (body.action === 'list') {
    const items = await client.asServiceRole.entities.RoleAssignment.filter({ business_id: bid });
    return { assignments: items };
  }
  if (body.action === 'set') {
    if (typeof body.user_id !== 'string' || !body.user_id.trim()) throw new ValidationError('user_id obligatorio');
    if (!ASSOCIATION_ROLES.includes(body.role)) throw new ValidationError('Rol no válido');
    const existing = await client.asServiceRole.entities.RoleAssignment.filter({ business_id: bid, user_id: body.user_id });
    if (existing.length > 0) {
      const updated = await client.asServiceRole.entities.RoleAssignment.update(existing[0].id, { role: body.role, permissions: permissionsFor(body.role) });
      await createAuditLog(client, user, 'role.assigned', { entity_type: 'RoleAssignment', entity_id: updated.id, business_id: bid, metadata: { user_id: body.user_id, role: body.role } });
      return { assignment: updated };
    }
    const created = await client.asServiceRole.entities.RoleAssignment.create({ business_id: bid, user_id: body.user_id, role: body.role, permissions: permissionsFor(body.role) });
    await createAuditLog(client, user, 'role.assigned', { entity_type: 'RoleAssignment', entity_id: created.id, business_id: bid, metadata: { user_id: body.user_id, role: body.role } });
    return { assignment: created };
  }
  if (body.action === 'remove') {
    const items = await client.asServiceRole.entities.RoleAssignment.filter({ business_id: bid, user_id: body.user_id });
    if (items.length === 0) throw new NotFoundError('Asignación no encontrada');
    await client.asServiceRole.entities.RoleAssignment.delete(items[0].id);
    await createAuditLog(client, user, 'role.revoked', { entity_type: 'RoleAssignment', entity_id: items[0].id, business_id: bid, metadata: { user_id: body.user_id } });
    return { removed: true };
  }
  throw new ValidationError('Acción no válida');
}

// ---- MembershipPlan ----
export async function manageMembershipPlan(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const writeActions = ['create', 'update', 'deactivate'];
  const perm = writeActions.includes(body.action) ? 'plans.manage' : 'members.read';
  await requirePermission(client, user, bid, perm);

  if (body.action === 'list') {
    const plans = await client.asServiceRole.entities.MembershipPlan.filter({ business_id: bid });
    return { plans };
  }
  if (body.action === 'get') {
    const p = await client.asServiceRole.entities.MembershipPlan.get(body.plan_id);
    if (!p || p.business_id !== bid) throw new NotFoundError('Plan no encontrado');
    return { plan: p };
  }
  if (body.action === 'create') {
    const sanitized = sanitizeData(body.plan_data || {}, MEMBERSHIP_PLAN_ALLOWLIST);
    if (!sanitized.name) throw new ValidationError('Nombre de plan obligatorio');
    if (!sanitized.code) throw new ValidationError('Código de plan obligatorio');
    if (sanitized.fee_amount == null) throw new ValidationError('Importe obligatorio');
    sanitized.fee_amount = Math.round(Number(sanitized.fee_amount));
    if (!Number.isFinite(sanitized.fee_amount) || sanitized.fee_amount < 0) throw new ValidationError('Importe no válido');
    if (sanitized.fee_period && !FEE_PERIOD_VALUES.includes(sanitized.fee_period)) throw new ValidationError('Periodo no válido');
    const dup = await client.asServiceRole.entities.MembershipPlan.filter({ business_id: bid, code: sanitized.code });
    if (dup.length > 0) throw new ConflictError('Código de plan ya existe');
    const plan = await client.asServiceRole.entities.MembershipPlan.create({ business_id: bid, ...sanitized, is_active: sanitized.is_active !== false });
    await createAuditLog(client, user, 'plan.created', { entity_type: 'MembershipPlan', entity_id: plan.id, business_id: bid, metadata: { code: plan.code } });
    return { plan };
  }
  if (body.action === 'update') {
    const p = await client.asServiceRole.entities.MembershipPlan.get(body.plan_id);
    if (!p || p.business_id !== bid) throw new NotFoundError('Plan no encontrado');
    const sanitized = sanitizeData(body.plan_data || {}, MEMBERSHIP_PLAN_ALLOWLIST);
    if ('fee_amount' in sanitized && sanitized.fee_amount != null) {
      const v = Math.round(Number(sanitized.fee_amount));
      if (!Number.isFinite(v) || v < 0) throw new ValidationError('Importe no válido');
      sanitized.fee_amount = v;
    }
    if ('fee_period' in sanitized && sanitized.fee_period && !FEE_PERIOD_VALUES.includes(sanitized.fee_period)) throw new ValidationError('Periodo no válido');
    if ('code' in sanitized && sanitized.code !== p.code) {
      const dup = await client.asServiceRole.entities.MembershipPlan.filter({ business_id: bid, code: sanitized.code });
      if (dup.length > 0) throw new ConflictError('Código de plan ya existe');
    }
    const updated = await client.asServiceRole.entities.MembershipPlan.update(body.plan_id, sanitized);
    await createAuditLog(client, user, 'plan.updated', { entity_type: 'MembershipPlan', entity_id: p.id, business_id: bid, metadata: { fields: Object.keys(sanitized) } });
    return { plan: updated };
  }
  if (body.action === 'deactivate') {
    const p = await client.asServiceRole.entities.MembershipPlan.get(body.plan_id);
    if (!p || p.business_id !== bid) throw new NotFoundError('Plan no encontrado');
    const updated = await client.asServiceRole.entities.MembershipPlan.update(body.plan_id, { is_active: false });
    await createAuditLog(client, user, 'plan.deactivated', { entity_type: 'MembershipPlan', entity_id: p.id, business_id: bid });
    return { plan: updated };
  }
  throw new ValidationError('Acción no válida');
}

// ---- Membership ----
// Single-active guarantee: at most one Membership with status='active' per
// (business_id, member_id). Enforced by assertNoActiveMembership before any
// create/set_status to 'active'. The 'renew' action transitions the previous
// active membership to 'expired' BEFORE creating the new active one, both
// inside withBusinessMutation so concurrent renewals are serialized per tenant.
export async function manageMembership(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const writeActions = ['create', 'renew', 'set_status'];
  const perm = writeActions.includes(body.action) ? 'memberships.manage' : 'members.read';
  await requirePermission(client, user, bid, perm);

  if (body.action === 'list') {
    const filter = { business_id: bid };
    if (body.member_id) filter.member_id = body.member_id;
    const memberships = await client.asServiceRole.entities.Membership.filter(filter);
    return { memberships };
  }
  if (body.action === 'get') {
    const m = await client.asServiceRole.entities.Membership.get(body.membership_id);
    if (!m || m.business_id !== bid) throw new NotFoundError('Membresía no encontrada');
    return { membership: m };
  }
  if (body.action === 'create') {
    return await withBusinessMutation(client, bid, async () => {
      const member = await client.asServiceRole.entities.Member.get(body.member_id);
      if (!member || member.business_id !== bid) throw new NotFoundError('Socio no encontrado');
      const plan = await client.asServiceRole.entities.MembershipPlan.get(body.plan_id);
      if (!plan || plan.business_id !== bid) throw new NotFoundError('Plan no encontrado');
      const status = body.status && MEMBERSHIP_STATUS_VALUES.includes(body.status) ? body.status : 'active';
      if (status === 'active') await assertNoActiveMembership(client, bid, body.member_id);
      const membership = await createMembershipFromPlan(client, bid, member, plan, { start_date: body.start_date, end_date: body.end_date, status, auto_renew: body.auto_renew, notes: body.notes });
      await createAuditLog(client, user, 'membership.created', { entity_type: 'Membership', entity_id: membership.id, business_id: bid, metadata: { member_id: member.id, plan_id: plan.id } });
      return { membership };
    });
  }
  if (body.action === 'renew') {
    return await withBusinessMutation(client, bid, async () => {
      const member = await client.asServiceRole.entities.Member.get(body.member_id);
      if (!member || member.business_id !== bid) throw new NotFoundError('Socio no encontrado');
      const plan = await client.asServiceRole.entities.MembershipPlan.get(body.plan_id);
      if (!plan || plan.business_id !== bid) throw new NotFoundError('Plan no encontrado');
      const actives = await client.asServiceRole.entities.Membership.filter({ business_id: bid, member_id: body.member_id, status: 'active' });
      let previous = null;
      if (actives.length > 0) {
        previous = actives[0];
        const expireOn = body.start_date || new Date().toISOString().slice(0, 10);
        await client.asServiceRole.entities.Membership.update(previous.id, { status: 'expired', end_date: expireOn });
      }
      const membership = await createMembershipFromPlan(client, bid, member, plan, { start_date: body.start_date, end_date: body.end_date, status: 'active', auto_renew: body.auto_renew, notes: body.notes, renewed_from: previous ? previous.id : null });
      await createAuditLog(client, user, 'membership.renewed', { entity_type: 'Membership', entity_id: membership.id, business_id: bid, metadata: { member_id: member.id, previous_membership_id: previous ? previous.id : null } });
      return { membership };
    });
  }
  if (body.action === 'set_status') {
    const m = await client.asServiceRole.entities.Membership.get(body.membership_id);
    if (!m || m.business_id !== bid) throw new NotFoundError('Membresía no encontrada');
    if (!MEMBERSHIP_STATUS_VALUES.includes(body.status)) throw new ValidationError('Estado no válido');
    if (body.status === 'active') await assertNoActiveMembership(client, bid, m.member_id, m.id);
    const updated = await client.asServiceRole.entities.Membership.update(body.membership_id, { status: body.status });
    await createAuditLog(client, user, `membership.${body.status}`, { entity_type: 'Membership', entity_id: m.id, business_id: bid, metadata: { from: m.status } });
    return { membership: updated };
  }
  throw new ValidationError('Acción no válida');
}

async function assertNoActiveMembership(client, bid, memberId, excludeId = null) {
  const actives = await client.asServiceRole.entities.Membership.filter({ business_id: bid, member_id: memberId, status: 'active' });
  const conflict = actives.find(m => m.id !== excludeId);
  if (conflict) throw new ConflictError('El socio ya tiene una membresía activa. Usa renovar.');
}

async function createMembershipFromPlan(client, bid, member, plan, opts) {
  return await client.asServiceRole.entities.Membership.create({
    business_id: bid,
    member_id: member.id,
    plan_id: plan.id,
    plan_name_snapshot: plan.name,
    fee_amount_snapshot: plan.fee_amount,
    fee_period_snapshot: plan.fee_period,
    start_date: opts.start_date || new Date().toISOString().slice(0, 10),
    end_date: opts.end_date != null ? opts.end_date : null,
    status: opts.status || 'active',
    auto_renew: opts.auto_renew != null ? !!opts.auto_renew : !!plan.auto_renew,
    renewed_from: opts.renewed_from || null,
    notes: opts.notes || null,
  });
}

// ---- Resolve Member (user -> member) for the future portal ----
// No permission check: returns the member linked to the authenticated user in
// their tenant, or null. The portal uses this to scope all subsequent queries;
// it never accepts a member_id from the client.
export async function resolveMember(client, user) {
  const bid = getUserBusinessId(user);
  if (!bid) return { member: null };
  const members = await client.asServiceRole.entities.Member.filter({ business_id: bid, user_id: user.id });
  return { member: projectMember(members[0] || null, null) };
}
