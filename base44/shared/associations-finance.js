// RINNO Asociaciones — Fase A2: financial domain (Cuotas + Pagos + Integridad).
// MemberFee, MemberPayment, PaymentAllocation.
//
// Design rules (from A2 spec):
// - amount_paid is a CACHE, never the source of truth. The truth is
//   SUM(PaymentAllocation.amount) where the linked MemberPayment is 'completed'.
// - Fee status is computed centrally by computeFeeStatus; never dispersed.
// - A completed payment is an immutable financial record. Corrections only via
//   void/reversal (which preserves allocations for audit and recalculates fees).
// - All operations run inside withBusinessMutation (per-tenant DB-backed lock)
//   to serialize the critical section. Idempotency via idempotency_key pre-check
//   inside the lock (authoritative because the lock serializes check-then-create).
// - Tenant is ALWAYS resolved from the authenticated user (getUserBusinessId),
//   never from the request body. registered_by / voided_by always from user.id.
// - Default-deny authorization via requirePermission (role matrix + explicit
//   permissions on RoleAssignment).
import { withBusinessMutation, MutationLockError } from './business-mutation.js';
import {
  getUserBusinessId, requirePermission, createAuditLog, sanitizeData,
  AssociationError, ValidationError, NotFoundError, ConflictError, AuthorizationError,
} from './associations.js';

export {
  AssociationError, ValidationError, NotFoundError, ConflictError, AuthorizationError,
  MutationLockError,
};

// ---- Constants ----
export const FEE_TYPE_VALUES = ['periodic', 'extraordinary', 'enrollment', 'adjustment'];
export const FEE_STATUS_VALUES = ['pending', 'partially_paid', 'paid', 'overdue', 'voided', 'refunded'];
export const PAYMENT_METHOD_VALUES = ['cash', 'transfer', 'card', 'other'];
export const PAYMENT_STATUS_VALUES = ['completed', 'voided'];
export const FEE_ALLOWLIST = ['membership_id', 'type', 'concept', 'amount', 'period_start', 'period_end', 'due_date', 'reference'];
export const PAYMENT_ALLOWLIST = ['method', 'method_reference', 'notes', 'idempotency_key'];

// ---- Validation helpers ----
function assertCents(v, label) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new ValidationError(`${label} debe ser un entero positivo en céntimos`);
  if (!Number.isInteger(n)) throw new ValidationError(`${label} debe ser un entero (sin decimales)`);
  return n;
}

// ---- Fee reference generation ----
// CUO-YYYY-NNNNNN. No atomic counter on the platform; the per-tenant lock makes
// the pre-check authoritative (same pattern as member_number).
export function generateFeeReference(existingRefs, year) {
  let max = 0;
  const prefix = `CUO-${year}-`;
  for (const ref of existingRefs || []) {
    if (typeof ref === 'string' && ref.startsWith(prefix)) {
      const n = parseInt(ref.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(6, '0')}`;
}

// ---- Centralized Fee status calculation ----
// voided and refunded are terminal: preserved. Otherwise derived from
// amount_paid vs amount, with overdue when amount_paid===0 and due_date past.
// A partially_paid fee stays partially_paid even if overdue (per spec).
export function computeFeeStatus(fee, amountPaid) {
  if (fee.status === 'voided') return 'voided';
  if (fee.status === 'refunded') return 'refunded';
  if (amountPaid >= fee.amount) return 'paid';
  if (amountPaid > 0) return 'partially_paid';
  if (fee.due_date && new Date(fee.due_date) < new Date()) return 'overdue';
  return 'pending';
}

// ---- Recalculate a single fee's amount_paid + status ----
// Source of truth: allocations of this fee linked to non-voided payments.
export async function recalcFeeAmountPaid(client, bid, feeId) {
  const fee = await client.asServiceRole.entities.MemberFee.get(feeId);
  if (!fee || fee.business_id !== bid) throw new NotFoundError('Cuota no encontrada');
  const allocations = await client.asServiceRole.entities.PaymentAllocation.filter({ business_id: bid, fee_id: feeId });
  let sum = 0;
  for (const a of allocations) {
    const payment = await client.asServiceRole.entities.MemberPayment.get(a.payment_id);
    if (payment && payment.business_id === bid && payment.status === 'completed') {
      sum += a.amount;
    }
  }
  const status = computeFeeStatus(fee, sum);
  const updated = await client.asServiceRole.entities.MemberFee.update(feeId, { amount_paid: sum, status });
  return { fee: updated, amount_paid: sum };
}

// Recalculate every fee touched by a payment's allocations.
async function recalcFeesForPayment(client, bid, paymentId) {
  const allocations = await client.asServiceRole.entities.PaymentAllocation.filter({ business_id: bid, payment_id: paymentId });
  const feeIds = [...new Set(allocations.map(a => a.fee_id))];
  const results = [];
  for (const fid of feeIds) results.push(await recalcFeeAmountPaid(client, bid, fid));
  return results;
}

// ---- ManageMemberFee ----
export async function manageMemberFee(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  const writeActions = ['issue', 'void'];
  const perm = writeActions.includes(body.action) ? 'fees.manage'
    : body.action === 'recalc' ? 'fees.read' : 'fees.read';
  await requirePermission(client, user, bid, perm);

  if (body.action === 'list') {
    const filter = { business_id: bid };
    if (body.member_id) filter.member_id = body.member_id;
    const fees = await client.asServiceRole.entities.MemberFee.filter(filter);
    return { fees };
  }
  if (body.action === 'get') {
    const fee = await client.asServiceRole.entities.MemberFee.get(body.fee_id);
    if (!fee || fee.business_id !== bid) throw new NotFoundError('Cuota no encontrada');
    return { fee };
  }
  if (body.action === 'recalc') {
    if (body.fee_id) {
      const r = await recalcFeeAmountPaid(client, bid, body.fee_id);
      return { fee: r.fee };
    }
    const filter = { business_id: bid };
    if (body.member_id) filter.member_id = body.member_id;
    const fees = await client.asServiceRole.entities.MemberFee.filter(filter);
    const out = [];
    for (const f of fees) {
      if (f.status === 'voided' || f.status === 'refunded') { out.push(f); continue; }
      out.push((await recalcFeeAmountPaid(client, bid, f.id)).fee);
    }
    return { fees: out };
  }
  if (body.action === 'issue') {
    return await withBusinessMutation(client, bid, async () => {
      const member = await client.asServiceRole.entities.Member.get(body.member_id);
      if (!member || member.business_id !== bid) throw new NotFoundError('Socio no encontrado');
      const sanitized = sanitizeData(body.fee_data || {}, FEE_ALLOWLIST);
      if (!sanitized.concept || !String(sanitized.concept).trim()) throw new ValidationError('Concepto obligatorio');
      if (sanitized.amount == null) throw new ValidationError('Importe obligatorio');
      sanitized.amount = assertCents(sanitized.amount, 'amount');
      if (sanitized.type && !FEE_TYPE_VALUES.includes(sanitized.type)) throw new ValidationError('Tipo no válido');
      if (!sanitized.type) sanitized.type = 'periodic';
      if (sanitized.membership_id) {
        const m = await client.asServiceRole.entities.Membership.get(sanitized.membership_id);
        if (!m || m.business_id !== bid || m.member_id !== member.id) throw new ValidationError('Membresía no válida para este socio');
      }
      if (!sanitized.due_date) throw new ValidationError('Fecha de vencimiento obligatoria');
      // reference generation
      const year = new Date().getFullYear();
      const existing = await client.asServiceRole.entities.MemberFee.filter({ business_id: bid });
      let existingRefs = existing.map(f => f.reference).filter(Boolean);
      let reference = sanitized.reference || generateFeeReference(existingRefs, year);
      let attempts = 0;
      while (existingRefs.includes(reference) && attempts < 50) {
        reference = generateFeeReference([...existingRefs, reference], year);
        attempts++;
      }
      if (existingRefs.includes(reference)) throw new ConflictError('No se pudo generar una referencia única');
      // initial status from due_date (overdue if already past)
      const initialStatus = computeFeeStatus({ amount: sanitized.amount, due_date: sanitized.due_date }, 0);
      const fee = await client.asServiceRole.entities.MemberFee.create({
        business_id: bid, member_id: member.id, membership_id: sanitized.membership_id || null,
        type: sanitized.type, concept: sanitized.concept, amount: sanitized.amount,
        period_start: sanitized.period_start || null, period_end: sanitized.period_end || null,
        due_date: sanitized.due_date, status: initialStatus, amount_paid: 0,
        issued_at: new Date().toISOString(), voided_at: null, void_reason: null, reference,
      });
      await createAuditLog(client, user, 'fee.issued', { entity_type: 'MemberFee', entity_id: fee.id, business_id: bid, metadata: { reference, amount: fee.amount, type: fee.type } });
      return { fee };
    });
  }
  if (body.action === 'void') {
    return await withBusinessMutation(client, bid, async () => {
      const fee = await client.asServiceRole.entities.MemberFee.get(body.fee_id);
      if (!fee || fee.business_id !== bid) throw new NotFoundError('Cuota no encontrada');
      if (fee.status === 'voided') throw new ConflictError('La cuota ya está anulada');
      // A fee with applied payments cannot be voided silently — reverse the
      // payments first. This preserves the financial audit trail.
      if (fee.amount_paid > 0) throw new ConflictError('No se puede anular una cuota con pagos aplicados. Anula primero los pagos asociados.');
      const updated = await client.asServiceRole.entities.MemberFee.update(body.fee_id, {
        status: 'voided', voided_at: new Date().toISOString(), void_reason: body.void_reason || 'Anulación',
      });
      await createAuditLog(client, user, 'fee.voided', { entity_type: 'MemberFee', entity_id: fee.id, business_id: bid, metadata: { reference: fee.reference, reason: body.void_reason || null } });
      return { fee: updated };
    });
  }
  throw new ValidationError('Acción no válida');
}

// ---- RegisterPayment ----
// Centralized payment registration. Allocates a payment across one or more fees.
// Atomic (per-tenant lock) + idempotent (idempotency_key pre-check inside lock).
export async function registerPayment(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  await requirePermission(client, user, bid, 'payments.register');

  const amount = assertCents(body.amount, 'amount');
  if (!PAYMENT_METHOD_VALUES.includes(body.method)) throw new ValidationError('Método de pago no válido');
  if (!body.member_id) throw new ValidationError('member_id obligatorio');
  if (!Array.isArray(body.allocations) || body.allocations.length === 0) throw new ValidationError('Se requiere al menos una asignación');
  for (const a of body.allocations) {
    if (!a.fee_id) throw new ValidationError('fee_id obligatorio en asignación');
    assertCents(a.amount, 'allocation.amount');
  }
  const allocSum = body.allocations.reduce((s, a) => s + a.amount, 0);
  if (allocSum > amount) throw new ValidationError('La suma de asignaciones supera el importe del pago');

  return await withBusinessMutation(client, bid, async () => {
    // Idempotency: if a payment with this key already exists, return it.
    if (body.idempotency_key) {
      const existing = await client.asServiceRole.entities.MemberPayment.filter({ business_id: bid, idempotency_key: body.idempotency_key });
      if (existing.length > 0) return { payment: existing[0], allocations: [], idempotent: true };
    }
    // Validate member
    const member = await client.asServiceRole.entities.Member.get(body.member_id);
    if (!member || member.business_id !== bid) throw new NotFoundError('Socio no encontrado');
    // Validate all fees (same tenant, same member, not voided) + compute pending
    const feeRemaining = {};
    const perFee = {};
    for (const a of body.allocations) {
      const fee = await client.asServiceRole.entities.MemberFee.get(a.fee_id);
      if (!fee || fee.business_id !== bid) throw new NotFoundError('Cuota no encontrada');
      if (fee.member_id !== member.id) throw new ValidationError(`La cuota ${fee.reference} no pertenece a este socio`);
      if (fee.status === 'voided') throw new ConflictError(`La cuota ${fee.reference} está anulada`);
      feeRemaining[fee.id] = fee.amount - fee.amount_paid;
      perFee[fee.id] = (perFee[fee.id] || 0) + a.amount;
    }
    // No overpayment per fee
    for (const fid of Object.keys(perFee)) {
      if (perFee[fid] > feeRemaining[fid]) throw new ConflictError('La asignación supera el pendiente de la cuota');
    }
    // Create payment — registered_by ALWAYS from authenticated user
    const paid_at = body.paid_at || new Date().toISOString();
    const payment = await client.asServiceRole.entities.MemberPayment.create({
      business_id: bid, member_id: member.id, amount, method: body.method,
      method_reference: body.method_reference || null, paid_at,
      registered_by: user.id, status: 'completed', notes: body.notes || null,
      idempotency_key: body.idempotency_key || null, voided_at: null, void_reason: null, voided_by: null,
    });
    // Create allocations
    const createdAllocs = [];
    for (const a of body.allocations) {
      createdAllocs.push(await client.asServiceRole.entities.PaymentAllocation.create({
        business_id: bid, payment_id: payment.id, fee_id: a.fee_id, amount: a.amount,
      }));
    }
    // Recalc affected fees
    await recalcFeesForPayment(client, bid, payment.id);
    await createAuditLog(client, user, 'payment.registered', {
      entity_type: 'MemberPayment', entity_id: payment.id, business_id: bid,
      metadata: { amount, method: body.method, member_id: member.id, allocations: createdAllocs.length },
    });
    return { payment, allocations: createdAllocs };
  });
}

// ---- VoidPayment ----
// Safe reversal: marks the payment voided (never deleted), allocations remain
// for audit, and all affected fees are recalculated (the voided payment's
// allocations stop counting as applied money).
export async function voidPayment(client, user, body) {
  const bid = getUserBusinessId(user);
  if (!bid) throw new AuthorizationError('Sin asociación asociada');
  await requirePermission(client, user, bid, 'payments.void');

  return await withBusinessMutation(client, bid, async () => {
    const payment = await client.asServiceRole.entities.MemberPayment.get(body.payment_id);
    if (!payment || payment.business_id !== bid) throw new NotFoundError('Pago no encontrado');
    if (payment.status === 'voided') throw new ConflictError('El pago ya está anulado');
    const updated = await client.asServiceRole.entities.MemberPayment.update(body.payment_id, {
      status: 'voided', voided_at: new Date().toISOString(),
      void_reason: body.void_reason || 'Anulación', voided_by: user.id,
    });
    // Recalc all fees touched by this payment — they lose this payment's money.
    await recalcFeesForPayment(client, bid, payment.id);
    await createAuditLog(client, user, 'payment.voided', {
      entity_type: 'MemberPayment', entity_id: payment.id, business_id: bid,
      metadata: { amount: payment.amount, reason: body.void_reason || null },
    });
    return { payment: updated };
  });
}