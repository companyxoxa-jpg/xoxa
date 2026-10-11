// RINNO Asociaciones — Fase A3 credential tests (self-contained, mock SDK).
// Covers the 24 required scenarios: issue, no-clear-token-in-DB, hash match,
// entropy, valid/invalid/revoked/expired tokens, member & membership status
// checks, rotation invalidation + version increment, revoke auditability,
// token never in AuditLog/errors, cross-tenant denial, role permissions,
// uniform malformed/oversized rejection, token_hash uniqueness, single-active.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  manageCredential, validateCredential, hashToken, generateCredentialToken, buildCredentialQrPayload,
  AssociationError, ConflictError, NotFoundError, ValidationError, AuthorizationError,
} from '../base44/shared/associations-credential.js';
import { manageMember, manageMembershipPlan, manageMembership, manageRoleAssignment } from '../base44/shared/associations.js';

// ---- in-memory mock SDK ----
function fixture() {
  const db = {
    Business: [{ id: 'A', business_name: 'Asoc A', logo: 'logoA.png', mutation_token: '' }, { id: 'B', business_name: 'Asoc B', logo: null, mutation_token: '' }],
    Member: [], RoleAssignment: [], MembershipPlan: [], Membership: [],
    Credential: [], AuditLog: [],
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
const staffA = () => ({ id: 'staffA', email: 'staff@a.test', role: 'user', data: { business_id: 'A' } });
const accountantA = () => ({ id: 'accA', email: 'acc@a.test', role: 'user', data: { business_id: 'A' } });

async function mkMember(client, user, name = 'Ana', last = 'García') {
  return (await manageMember(client, user, { action: 'create', member_data: { first_name: name, last_name: last } })).member;
}
async function mkMembership(client, user, memberId, opts = {}) {
  let plan;
  const existing = await manageMembershipPlan(client, user, { action: 'list' });
  if (existing.plans.length > 0) plan = existing.plans[0];
  else plan = (await manageMembershipPlan(client, user, { action: 'create', plan_data: { name: 'Anual', code: 'anual', fee_amount: 1000, fee_period: 'annual' } })).plan;
  return (await manageMembership(client, user, { action: 'create', member_id: memberId, plan_id: plan.id, start_date: opts.start_date || '2026-01-01', end_date: opts.end_date || null, status: opts.status || 'active' })).membership;
}
async function mkFullMember(client, user) {
  const m = await mkMember(client, user);
  await mkMembership(client, user, m.id);
  return m;
}
async function issueCred(client, user, memberId) {
  return (await manageCredential(client, user, { action: 'issue', member_id: memberId })).token;
}

// 1. issue genera Credential
test('1. issue creates a Credential', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  assert.ok(res.credential.id);
  assert.equal(res.credential.status, 'active');
  assert.equal(res.credential.version, 1);
  assert.ok(res.token);
  assert.equal(f.db.Credential.length, 1);
});

// 2. DB no contiene token claro
test('2. the DB never stores the clear token', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  const stored = f.db.Credential[0];
  assert.equal(stored.token, undefined);
  assert.ok(stored.token_hash);
  assert.equal(stored.token_hash.length, 64); // SHA-256 hex
  // the clear token is not findable anywhere in the stored record
  assert.equal(JSON.stringify(stored).includes(res.token), false);
});

// 3. token_hash corresponde al token
test('3. stored token_hash equals SHA-256(token)', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  const expected = await hashToken(token);
  assert.equal(f.db.Credential[0].token_hash, expected);
});

// 4. token con alta entropía
test('4. generated tokens have high entropy (256 bits, unique)', async () => {
  const tokens = new Set();
  for (let i = 0; i < 1000; i++) tokens.add(generateCredentialToken());
  assert.equal(tokens.size, 1000); // all unique
  const sample = generateCredentialToken();
  assert.ok(sample.length >= 40); // base64url of 32 bytes ~= 43 chars
  assert.ok(/^[A-Za-z0-9_-]+$/.test(sample));
});

// 5. token válido → valid true
test('5. a valid token validates', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  const r = await validateCredential(f.client, ownerA(), { token });
  assert.equal(r.valid, true);
  assert.equal(r.member_number, m.member_number);
  assert.equal(r.display_name, 'Ana García');
  assert.equal(r.membership_status, 'active');
  assert.equal(r.association_name, 'Asoc A');
  assert.equal(r.association_logo, 'logoA.png');
});

// 6. token inexistente → valid false
test('6. a nonexistent token yields valid:false', async () => {
  const f = fixture(); f.setU(ownerA());
  const r = await validateCredential(f.client, ownerA(), { token: 'nonexistenttoken12345678901234567890' });
  assert.deepEqual(r, { valid: false });
});

// 7. token revocado → false
test('7. a revoked token yields valid:false', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  await manageCredential(f.client, ownerA(), { action: 'revoke', credential_id: res.credential.id, revoke_reason: 'lost' });
  const r = await validateCredential(f.client, ownerA(), { token: res.token });
  assert.equal(r.valid, false);
});

// 8. token expirado → false
test('8. an expired credential yields valid:false', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id, expires_at: '2020-01-01T00:00:00.000Z' });
  const r = await validateCredential(f.client, ownerA(), { token: res.token });
  assert.equal(r.valid, false);
});

// 9. Member suspended → false
test('9. a suspended member yields valid:false', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  await manageMember(f.client, ownerA(), { action: 'set_status', member_id: m.id, status: 'suspended' });
  const r = await validateCredential(f.client, ownerA(), { token });
  assert.equal(r.valid, false);
});

// 10. Member resigned → false
test('10. a resigned member yields valid:false', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  await manageMember(f.client, ownerA(), { action: 'set_status', member_id: m.id, status: 'resigned' });
  const r = await validateCredential(f.client, ownerA(), { token });
  assert.equal(r.valid, false);
});

// 11. Membership expired → false
test('11. an expired membership yields valid:false', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  const memberships = await manageMembership(f.client, ownerA(), { action: 'list', member_id: m.id });
  await manageMembership(f.client, ownerA(), { action: 'set_status', membership_id: memberships.memberships[0].id, status: 'expired' });
  const r = await validateCredential(f.client, ownerA(), { token });
  assert.equal(r.valid, false);
});

// 12. Membership active → true
test('12. an active membership yields valid:true', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  const r = await validateCredential(f.client, ownerA(), { token });
  assert.equal(r.valid, true);
});

// 12b. membership with past end_date but status active → false (date check)
test('12b. active membership with past end_date yields valid:false', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkMember(f.client, ownerA());
  await mkMembership(f.client, ownerA(), m.id, { end_date: '2020-01-01' });
  const token = await issueCred(f.client, ownerA(), m.id);
  const r = await validateCredential(f.client, ownerA(), { token });
  assert.equal(r.valid, false);
});

// 13. rotate invalida token anterior
test('13. rotation invalidates the previous token', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  const oldToken = res.token;
  await manageCredential(f.client, ownerA(), { action: 'rotate', credential_id: res.credential.id });
  const r = await validateCredential(f.client, ownerA(), { token: oldToken });
  assert.equal(r.valid, false);
});

// 14. rotate devuelve token nuevo
test('14. rotation returns a new valid token', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  const rot = await manageCredential(f.client, ownerA(), { action: 'rotate', credential_id: res.credential.id });
  assert.notEqual(rot.token, res.token);
  const r = await validateCredential(f.client, ownerA(), { token: rot.token });
  assert.equal(r.valid, true);
});

// 15. version incrementa
test('15. rotation increments version', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  assert.equal(res.credential.version, 1);
  const rot = await manageCredential(f.client, ownerA(), { action: 'rotate', credential_id: res.credential.id });
  assert.equal(rot.credential.version, 2);
  const rot2 = await manageCredential(f.client, ownerA(), { action: 'rotate', credential_id: res.credential.id });
  assert.equal(rot2.credential.version, 3);
});

// 16. revoke auditable
test('16. revoke writes an AuditLog entry', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  await manageCredential(f.client, ownerA(), { action: 'revoke', credential_id: res.credential.id, revoke_reason: 'lost' });
  const entry = f.db.AuditLog.find(e => e.action === 'credential.revoked');
  assert.ok(entry);
  assert.equal(entry.metadata.reason, 'lost');
  assert.equal(entry.business_id, 'A');
});

// 17. token nunca aparece en AuditLog
test('17. the clear token never appears in AuditLog', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  const token = res.token;
  await manageCredential(f.client, ownerA(), { action: 'rotate', credential_id: res.credential.id });
  await manageCredential(f.client, ownerA(), { action: 'revoke', credential_id: res.credential.id, revoke_reason: 'test' });
  const blob = JSON.stringify(f.db.AuditLog);
  assert.equal(blob.includes(token), false);
  // also the hash should not appear in audit logs
  const hash = await hashToken(token);
  assert.equal(blob.includes(hash), false);
});

// 18. token nunca aparece en error
test('18. the clear token never appears in error messages', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  const token = res.token;
  // trigger a conflict (second active credential) — error must not leak the token
  let errMsg = '';
  try { await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id }); } catch (e) { errMsg = e.message; }
  assert.equal(errMsg.includes(token), false);
  // revoke then rotate (not active) — error must not leak
  await manageCredential(f.client, ownerA(), { action: 'revoke', credential_id: res.credential.id });
  try { await manageCredential(f.client, ownerA(), { action: 'rotate', credential_id: res.credential.id }); } catch (e) { errMsg = e.message; }
  assert.equal(errMsg.includes(token), false);
});

// 19. cross-tenant management denegado
test('19. cross-tenant credential management is denied', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const res = await manageCredential(f.client, ownerA(), { action: 'issue', member_id: m.id });
  f.setU(ownerB());
  await assert.rejects(manageCredential(f.client, ownerB(), { action: 'get', credential_id: res.credential.id }), NotFoundError);
  await assert.rejects(manageCredential(f.client, ownerB(), { action: 'revoke', credential_id: res.credential.id }), NotFoundError);
  // B validating A's token → valid:false (tenant mismatch)
  const r = await validateCredential(f.client, ownerB(), { token: res.token });
  assert.equal(r.valid, false);
});

// 20. staff puede validar pero no gestionar
test('20. staff can validate but cannot manage credentials', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  await manageRoleAssignment(f.client, ownerA(), { action: 'set', user_id: 'staffA', role: 'staff' });
  f.setU(staffA());
  // staff can validate
  const r = await validateCredential(f.client, staffA(), { token });
  assert.equal(r.valid, true);
  // staff cannot issue
  await assert.rejects(manageCredential(f.client, staffA(), { action: 'issue', member_id: m.id }), AuthorizationError);
  // staff cannot list
  await assert.rejects(manageCredential(f.client, staffA(), { action: 'list' }), AuthorizationError);
});

// 21. accountant denegado
test('21. accountant cannot validate or manage credentials', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  const token = await issueCred(f.client, ownerA(), m.id);
  await manageRoleAssignment(f.client, ownerA(), { action: 'set', user_id: 'accA', role: 'accountant' });
  f.setU(accountantA());
  await assert.rejects(validateCredential(f.client, accountantA(), { token }), AuthorizationError);
  await assert.rejects(manageCredential(f.client, accountantA(), { action: 'issue', member_id: m.id }), AuthorizationError);
});

// 22. malformed/oversized token rechazado uniformemente
test('22. malformed and oversized tokens are rejected uniformly', async () => {
  const f = fixture(); f.setU(ownerA());
  const cases = ['', 'x', 'a'.repeat(200), 'has space!', 'ünïcode-token-1234567890', 12345, null, undefined];
  for (const t of cases) {
    const r = await validateCredential(f.client, ownerA(), { token: t });
    assert.deepEqual(r, { valid: false });
  }
});

// 23. dos Members no comparten token_hash
test('23. two members do not share token_hash', async () => {
  const f = fixture(); f.setU(ownerA());
  const m1 = await mkFullMember(f.client, ownerA());
  const m2 = await mkMember(f.client, ownerA(), 'Beto', 'López');
  await mkMembership(f.client, ownerA(), m2.id);
  const t1 = await issueCred(f.client, ownerA(), m1.id);
  const t2 = await issueCred(f.client, ownerA(), m2.id);
  const h1 = await hashToken(t1);
  const h2 = await hashToken(t2);
  assert.notEqual(h1, h2);
  assert.notEqual(t1, t2);
});

// 24. no se pueden mantener dos credenciales activas para el mismo Member
test('24. a member cannot hold two active credentials', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await mkFullMember(f.client, ownerA());
  await issueCred(f.client, ownerA(), m.id);
  await assert.rejects(issueCred(f.client, ownerA(), m.id), ConflictError);
  assert.equal(f.db.Credential.length, 1);
});

// unit: hashToken determinism
test('unit: hashToken is deterministic and SHA-256', async () => {
  const h1 = await hashToken('abc123');
  const h2 = await hashToken('abc123');
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
  const h3 = await hashToken('abc124');
  assert.notEqual(h1, h3);
});

// unit: buildCredentialQrPayload
test('unit: QR payload is an opaque URL with no PII', () => {
  const token = 'opaqueTokenValue1234567890';
  const payload = buildCredentialQrPayload(token);
  assert.equal(payload, `/credential/validate?t=${token}`);
  // payload contains no PII — only the token
  assert.equal(payload.includes('member'), false);
  assert.equal(payload.includes('email'), false);
});