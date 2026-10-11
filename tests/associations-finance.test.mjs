// RINNO Asociaciones — Fase A2 financial tests (self-contained, mock SDK).
// Covers the 20 required scenarios: fee issue, full/partial/multi payment,
// over-allocation & overpayment prevention, cross-tenant & cross-member denial,
// voided fee/payment behavior, idempotency, permissions, immutability of
// registered_by, integer-cents validation, audit logging, and overdue calc.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  manageMemberFee, registerPayment, voidPayment,
  computeFeeStatus, generateFeeReference,
  AssociationError, ConflictError, NotFoundError, ValidationError, AuthorizationError,
} from '../base44/shared/associations-finance.js';
import { manageMember, manageRoleAssignment, manageMembershipPlan } from '../base44/shared/associations.js';

// ---- in-memory mock SDK ----
function fixture() {
  const db = {
    Business: [{ id: 'A', mutation_token: '' }, { id: 'B', mutation_token: '' }],
    Member: [], RoleAssignment: [], MembershipPlan: [], Membership: [],
    MemberFee: [], MemberPayment: [], PaymentAllocation: [], AuditLog: [],
  };
  const ids = {};
  const entities = Object.fromEntries(Object.keys(db).map((name) => [name, {
    filter: async (filter) => {
      const rows = db[name].filter(r => Object.entries(filter).every(([k, v]) => {
        if (k === '$or') return v.some(alt => Object.entries(alt).every(([ak, av]) => r[ak] === av));
        return r[k] === v;
      }));
      return rows.map(r => structuredClone(r));
    },
    get: async (id) => { const r = db[name].find(x => x.id === id); return r ? structuredClone(r) : undefined; },
    create: async (data) => {
      ids[name] = (ids[name] || 0) + 1;
      const row = { ...structuredClone(data), id: `${name}-${ids[name]}` };
      db[name].push(row);
      return structuredClone(row);
    },
    update: async (id, data) => {
      const row = db[name].find(x => x.id === id);
      if (!row) throw new Error('not found');
      Object.assign(row, structuredClone(data));
      return structuredClone(row);
    },
    delete: async (id) => { const i = db[name].findIndex(x => x.id === id); if (i >= 0) db[name].splice(i, 1); },
    updateMany: async (query, update) => {
      let updated = 0;
      for (const row of db[name]) {
        const match = Object.entries(query).every(([k, v]) => {
          if (k === '$or') return v.some(alt => Object.entries(alt).every(([ak, av]) => row[ak] === av));
          return row[k] === v;
        });
        if (match) { if (update.$set) Object.assign(row, update.$set); updated++; }
      }
      return { updated };
    },
  }]));
  let current = null;
  const client = { asServiceRole: { entities }, auth: { me: async () => current } };
  const setU = (u) => { current = u; };
  return { db, client, setU };
}

const ownerA = () => ({ id: 'ownerA', email: 'owner@a.test', role: 'user', data: { business_id: 'A', rinno_role: 'business_owner' } });
const ownerB = () => ({ id: 'ownerB', email: 'owner@b.test', role: 'user', data: { business_id: 'B', rinno_role: 'business_owner' } });
const accountantA = () => ({ id: 'accA', email: 'acc@a.test', role: 'user', data: { business_id: 'A' } });
const staffA = () => ({ id: 'staffA', email: 'staff@a.test', role: 'user', data: { business_id: 'A' } });

async function mkMember(client, user, name = 'Ana', last = 'García') {
  const r = await manageMember(client, user, { action: 'create', member_data: { first_name: name, last_name: last } });
  return r.member;
}
async function mkFee(client, user, memberId, amount = 1000, dueDate = '2099-12-31', extra = {}) {
  const r = await manageMemberFee(client, user, { action: 'issue', member_id: memberId, fee_data: { concept: 'Cuota', amount, due_date: dueDate, type: 'periodic', ...extra } });
  return r.fee;
}
async function mkPayment(client, user, memberId, amount, allocations, extra = {}) {
  const r = await registerPayment(client, user, { member_id: memberId, amount, method: 'cash', allocations, ...extra });
  return r.payment;
}

// 1. emitir Fee
test('1. issue a fee creates it with pending status and reference', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  assert.equal(fee.status, 'pending');
  assert.equal(fee.amount_paid, 0);
  assert.match(fee.reference, /^CUO-\d{4}-000001$/);
  assert.equal(f.db.MemberFee.length, 1);
});

// 2. pago completo
test('2. full payment marks fee as paid', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await mkPayment(f.client, ownerA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]);
  const r = await manageMemberFee(f.client, ownerA(), { action: 'get', fee_id: fee.id });
  assert.equal(r.fee.status, 'paid');
  assert.equal(r.fee.amount_paid, 1000);
});

// 3. pago parcial
test('3. partial payment marks fee as partially_paid', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await mkPayment(f.client, ownerA(), m.id, 400, [{ fee_id: fee.id, amount: 400 }]);
  const r = await manageMemberFee(f.client, ownerA(), { action: 'get', fee_id: fee.id });
  assert.equal(r.fee.status, 'partially_paid');
  assert.equal(r.fee.amount_paid, 400);
});

// 4. dos pagos sobre una Fee
test('4. two payments on one fee sum to paid', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await mkPayment(f.client, ownerA(), m.id, 400, [{ fee_id: fee.id, amount: 400 }]);
  await mkPayment(f.client, ownerA(), m.id, 600, [{ fee_id: fee.id, amount: 600 }]);
  const r = await manageMemberFee(f.client, ownerA(), { action: 'get', fee_id: fee.id });
  assert.equal(r.fee.status, 'paid');
  assert.equal(r.fee.amount_paid, 1000);
  assert.equal(f.db.MemberPayment.length, 2);
});

// 5. un Payment distribuido entre varias Fees
test('5. one payment distributed across several fees', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const f1 = await mkFee(f.client, ownerA(), m.id, 600);
  const f2 = await mkFee(f.client, ownerA(), m.id, 400);
  await mkPayment(f.client, ownerA(), m.id, 1000, [{ fee_id: f1.id, amount: 600 }, { fee_id: f2.id, amount: 400 }]);
  const r1 = await manageMemberFee(f.client, ownerA(), { action: 'get', fee_id: f1.id });
  const r2 = await manageMemberFee(f.client, ownerA(), { action: 'get', fee_id: f2.id });
  assert.equal(r1.fee.status, 'paid');
  assert.equal(r2.fee.status, 'paid');
});

// 6. impedir over-allocation del Payment
test('6. allocations exceeding payment amount are rejected', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await assert.rejects(
    mkPayment(f.client, ownerA(), m.id, 500, [{ fee_id: fee.id, amount: 600 }]),
    ValidationError,
  );
  assert.equal(f.db.MemberPayment.length, 0);
});

// 7. impedir overpayment de Fee
test('7. fee cannot receive more than its pending amount', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await mkPayment(f.client, ownerA(), m.id, 600, [{ fee_id: fee.id, amount: 600 }]);
  await assert.rejects(
    mkPayment(f.client, ownerA(), m.id, 500, [{ fee_id: fee.id, amount: 500 }]),
    ConflictError,
  );
});

// 8. impedir Payment/Allocation cross-tenant
test('8. cross-tenant payment is denied', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  f.setU(ownerB());
  await assert.rejects(
    registerPayment(f.client, ownerB(), { member_id: m.id, amount: 1000, method: 'cash', allocations: [{ fee_id: fee.id, amount: 1000 }] }),
    NotFoundError,
  );
});

// 9. impedir allocation entre Members distintos
test('9. allocation between different members is denied', async () => {
  const f = fixture(); f.setU(ownerA());
  const m1 = await mkMember(f.client, ownerA(), 'Ana', 'One');
  const m2 = await mkMember(f.client, ownerA(), 'Beto', 'Two');
  const fee1 = await mkFee(f.client, ownerA(), m1.id, 1000);
  await assert.rejects(
    registerPayment(f.client, ownerA(), { member_id: m2.id, amount: 1000, method: 'cash', allocations: [{ fee_id: fee1.id, amount: 1000 }] }),
    ValidationError,
  );
});

// 10. Fee voided no recibe pago
test('10. a voided fee cannot receive a payment', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await manageMemberFee(f.client, ownerA(), { action: 'void', fee_id: fee.id, void_reason: 'error' });
  await assert.rejects(
    mkPayment(f.client, ownerA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]),
    ConflictError,
  );
});

// 11. void Payment recalcula Fee
test('11. voiding a payment recalculates the fee back to pending', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  const p = await mkPayment(f.client, ownerA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]);
  await voidPayment(f.client, ownerA(), { payment_id: p.id, void_reason: 'reversal' });
  const r = await manageMemberFee(f.client, ownerA(), { action: 'get', fee_id: fee.id });
  assert.equal(r.fee.status, 'pending');
  assert.equal(r.fee.amount_paid, 0);
});

// 12. Payment voided no cuenta en amount_paid
test('12. a voided payment does not count towards amount_paid', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  const p = await mkPayment(f.client, ownerA(), m.id, 400, [{ fee_id: fee.id, amount: 400 }]);
  await voidPayment(f.client, ownerA(), { payment_id: p.id });
  const r = await manageMemberFee(f.client, ownerA(), { action: 'get', fee_id: fee.id });
  assert.equal(r.fee.amount_paid, 0);
  assert.equal(r.fee.status, 'pending');
});

// 13. accountant permitido según permisos
test('13. accountant can register payments and read fees', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await manageRoleAssignment(f.client, ownerA(), { action: 'set', user_id: 'accA', role: 'accountant' });
  f.setU(accountantA());
  // read fees
  const list = await manageMemberFee(f.client, accountantA(), { action: 'list' });
  assert.equal(list.fees.length, 1);
  // register payment
  const p = await mkPayment(f.client, accountantA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]);
  assert.equal(p.registered_by, 'accA');
  assert.equal(p.status, 'completed');
});

// 14. staff denegado
test('14. staff cannot register payments (default-deny)', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await manageRoleAssignment(f.client, ownerA(), { action: 'set', user_id: 'staffA', role: 'staff' });
  f.setU(staffA());
  await assert.rejects(
    mkPayment(f.client, staffA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]),
    AuthorizationError,
  );
  // staff can read members (A1) but not fees
  await assert.rejects(manageMemberFee(f.client, staffA(), { action: 'list' }), AuthorizationError);
});

// 15. actor/register_by no manipulable desde body
test('15. registered_by is always the authenticated user, never from body', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  const p = await registerPayment(f.client, ownerA(), {
    member_id: m.id, amount: 1000, method: 'cash',
    allocations: [{ fee_id: fee.id, amount: 1000 }],
    registered_by: 'FAKE_USER',
  });
  assert.equal(p.payment.registered_by, 'ownerA');
  assert.notEqual(p.payment.registered_by, 'FAKE_USER');
});

// 16. amount siempre integer cents y >0
test('16. amount must be a positive integer (cents)', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await assert.rejects(registerPayment(f.client, ownerA(), { member_id: m.id, amount: 0, method: 'cash', allocations: [{ fee_id: fee.id, amount: 0 }] }), ValidationError);
  await assert.rejects(registerPayment(f.client, ownerA(), { member_id: m.id, amount: -5, method: 'cash', allocations: [{ fee_id: fee.id, amount: -5 }] }), ValidationError);
  await assert.rejects(registerPayment(f.client, ownerA(), { member_id: m.id, amount: 10.5, method: 'cash', allocations: [{ fee_id: fee.id, amount: 10.5 }] }), ValidationError);
  await assert.rejects(registerPayment(f.client, ownerA(), { member_id: m.id, amount: 'abc', method: 'cash', allocations: [{ fee_id: fee.id, amount: 1 }] }), ValidationError);
});

// 17. idempotency/retry no duplica Payment
test('17. idempotency key prevents duplicate payment on retry', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  const body = { member_id: m.id, amount: 1000, method: 'cash', allocations: [{ fee_id: fee.id, amount: 1000 }], idempotency_key: 'K1' };
  const r1 = await registerPayment(f.client, ownerA(), body);
  const r2 = await registerPayment(f.client, ownerA(), body);
  assert.equal(f.db.MemberPayment.length, 1);
  assert.equal(r1.payment.id, r2.payment.id);
  assert.equal(r2.idempotent, true);
});

// 18. AuditLog de payment
test('18. payment.registered is written to AuditLog', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await mkPayment(f.client, ownerA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]);
  const entry = f.db.AuditLog.find(e => e.action === 'payment.registered');
  assert.ok(entry);
  assert.equal(entry.business_id, 'A');
  assert.equal(entry.actor_user_id, 'ownerA');
  assert.equal(entry.metadata.method, 'cash');
});

// 19. AuditLog de void
test('19. payment.voided is written to AuditLog', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  const p = await mkPayment(f.client, ownerA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]);
  await voidPayment(f.client, ownerA(), { payment_id: p.id, void_reason: 'test' });
  const entry = f.db.AuditLog.find(e => e.action === 'payment.voided');
  assert.ok(entry);
  assert.equal(entry.business_id, 'A');
  assert.equal(entry.metadata.reason, 'test');
});

// 20. Fee overdue calculada correctamente
test('20. fee with past due_date is overdue', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  // issue with past due_date → overdue immediately
  const fee = await mkFee(f.client, ownerA(), m.id, 1000, '2020-01-01');
  assert.equal(fee.status, 'overdue');
  // recalc keeps it overdue
  const r = await manageMemberFee(f.client, ownerA(), { action: 'recalc', fee_id: fee.id });
  assert.equal(r.fee.status, 'overdue');
  // a future due_date fee is pending
  const fee2 = await mkFee(f.client, ownerA(), m.id, 1000, '2099-12-31');
  assert.equal(fee2.status, 'pending');
});

// unit: computeFeeStatus matrix
test('unit: computeFeeStatus covers all transitions', () => {
  assert.equal(computeFeeStatus({ amount: 1000, due_date: '2099-01-01' }, 0), 'pending');
  assert.equal(computeFeeStatus({ amount: 1000, due_date: '2020-01-01' }, 0), 'overdue');
  assert.equal(computeFeeStatus({ amount: 1000, due_date: '2020-01-01' }, 400), 'partially_paid');
  assert.equal(computeFeeStatus({ amount: 1000, due_date: '2020-01-01' }, 1000), 'paid');
  assert.equal(computeFeeStatus({ status: 'voided', amount: 1000 }, 500), 'voided');
  assert.equal(computeFeeStatus({ status: 'refunded', amount: 1000 }, 1000), 'refunded');
});

// unit: generateFeeReference
test('unit: generateFeeReference increments and ignores other years', () => {
  const year = 2026;
  assert.equal(generateFeeReference([], year), 'CUO-2026-000001');
  assert.equal(generateFeeReference(['CUO-2026-000001', 'CUO-2026-000005'], year), 'CUO-2026-000006');
  assert.equal(generateFeeReference(['CUO-2025-000099', 'CUO-2026-000003'], year), 'CUO-2026-000004');
});

// fee void with payments blocked
test('a fee with applied payments cannot be voided', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const fee = await mkFee(f.client, ownerA(), m.id, 1000);
  await mkPayment(f.client, ownerA(), m.id, 1000, [{ fee_id: fee.id, amount: 1000 }]);
  await assert.rejects(manageMemberFee(f.client, ownerA(), { action: 'void', fee_id: fee.id }), ConflictError);
});

// fee reference uniqueness across issues
test('fee references are unique within a tenant across multiple issues', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  const f1 = await mkFee(f.client, ownerA(), m.id, 1000);
  const f2 = await mkFee(f.client, ownerA(), m.id, 1000);
  const f3 = await mkFee(f.client, ownerA(), m.id, 1000);
  assert.notEqual(f1.reference, f2.reference);
  assert.notEqual(f2.reference, f3.reference);
  assert.notEqual(f1.reference, f3.reference);
});