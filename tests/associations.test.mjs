// RINNO Asociaciones — Fase A1 core tests.
// Self-contained: exercises the shared business logic with an in-memory mock
// SDK (no network, no @base44/sdk). Covers tenant isolation, authorization
// (default-deny, owner permitted, accountant cannot write members), member
// number uniqueness per tenant, Member-without-User, User↔Member linking
// constraints, membership history, renewal, snapshots, and cross-tenant denial.
//
// Run:  node --test tests/associations.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHandler } from './load-handler.mjs';
import {
  manageMember, linkMemberUser, manageRoleAssignment,
  manageMembershipPlan, manageMembership, resolveMember,
  AuthorizationError, ConflictError, NotFoundError, ValidationError,
  hasPermission, generateNextMemberNumber,
} from '../base44/shared/associations.js';

// ---- in-memory conditional update (mimics the platform updateMany $set) ----
function conditionalUpdate(rows, query, update) {
  let updated = 0;
  for (const row of rows) {
    const match = Object.entries(query).every(([k, v]) => {
      if (k === '$or') return v.some(alt => Object.entries(alt).every(([ak, av]) => row[ak] === av));
      return row[k] === v;
    });
    if (match) {
      if (update.$set) Object.assign(row, update.$set);
      updated++;
    }
  }
  return { updated };
}

function fixture() {
  const db = {
    AssociationDocument: [], AssociationIncident: [], MemberFee: [], Credential: [],
    CscDispensation: [], CscVisit: [], Enrollment: [], Activity: [],
    Business: [
      { id: 'A', mutation_token: '' },
      { id: 'B', mutation_token: '' },
    ],
    User: [{id:'member1',email:'socio@a.test',is_verified:true,business_id:'A'}],
    Member: [],
    RoleAssignment: [],
    MembershipPlan: [],
    Membership: [],
    AuditLog: [],
  };
  const entities = Object.fromEntries(Object.keys(db).map((name) => [name, {
    filter: async (filter) => {
      const rows = db[name].filter(r => Object.entries(filter).every(([k, v]) => r[k] === v));
      return rows.map(r => structuredClone(r));
    },
    get: async (id) => {
      const r = db[name].find(x => x.id === id);
      return r ? structuredClone(r) : undefined;
    },
    create: async (data) => {
      if (name === 'Member' && db.Member.some(m => m.business_id === data.business_id && m.member_number === data.member_number)) {
        throw new ConflictError('duplicate member_number');
      }
      if (name === 'MembershipPlan' && db.MembershipPlan.some(p => p.business_id === data.business_id && p.code === data.code)) {
        throw new ConflictError('duplicate plan code');
      }
      const row = { ...structuredClone(data), id: `${name}-${db[name].length}` };
      db[name].push(row);
      return structuredClone(row);
    },
    update: async (id, data) => {
      const row = db[name].find(x => x.id === id);
      if (!row) throw new NotFoundError('not found');
      Object.assign(row, structuredClone(data));
      return structuredClone(row);
    },
    delete: async (id) => {
      const i = db[name].findIndex(x => x.id === id);
      if (i >= 0) db[name].splice(i, 1);
    },
    updateMany: async (query, update) => conditionalUpdate(db[name], query, update),
  }]));
  let current = null;
  const client = { asServiceRole: { entities }, auth: { me: async () => current } };
  const setU = (u) => { current = u; };
  return { db, client, setU };
}

for (const role of ['owner','admin','manager','staff','accountant','viewer']) {
  test(`Bareto AUTH-01: ${role} note projection and write boundary`, async () => {
    const f=fixture(), actor={id:'actor',business_id:'A',role:'user'};
    f.db.RoleAssignment.push({business_id:'A',user_id:actor.id,role});f.setU(actor);
    const m=await createMember(f.client,ownerA(),{internal_notes:'ADMIN ONLY'});
    const privileged=['owner','admin'].includes(role);
    for(const action of ['get','list']) {
      const result=await manageMember(f.client,actor,{action,member_id:m.id});
      const row=result.member||result.members[0];
      assert.equal(Object.hasOwn(row,'internal_notes'),privileged);
    }
    const profile=await loadHandler('GetMemberProfile');
    const response=await profile(new Request('http://localhost',{method:'POST',body:JSON.stringify({member_id:m.id})}),f.client);
    assert.equal(response.status,200);
    assert.equal(Object.hasOwn((await response.json()).member,'internal_notes'),privileged);
    for(const action of ['create','update']) {
      const operation=()=>manageMember(f.client,actor,{action,member_id:m.id,member_data:{first_name:'QA',last_name:'Test',internal_notes:'CHANGED'}});
      if(privileged)assert.equal((await operation()).member.internal_notes,'CHANGED');
      else await assert.rejects(operation,AuthorizationError);
    }
    if(role==='manager'){
      const result=await manageMember(f.client,actor,{action:'update',member_id:m.id,member_data:{phone:'synthetic'}});
      assert.equal(Object.hasOwn(result.member,'internal_notes'),false);
      assert.equal(f.db.Member[0].internal_notes,'ADMIN ONLY');
    }
  });
}

test('Bareto AUTH-01: ResolveMember never discloses internal notes to the linked member',async()=>{
  const f=fixture();f.db.Member.push({id:'m',business_id:'A',user_id:'member1',internal_notes:'PRIVATE'});
  const result=await resolveMember(f.client,linkedUser());assert.equal(Object.hasOwn(result.member,'internal_notes'),false);
});

for(const role of ['owner','admin','manager','staff']){
  test(`Bareto AUTH-02: ${role} document list and direct view respect board audience`,async()=>{
    const f=fixture(),actor={id:'actor',role:'user',business_id:'A'};f.setU(actor);
    f.db.Business[0].business_mode='ASSOCIATION';f.db.RoleAssignment.push({business_id:'A',user_id:actor.id,role});
    f.db.AssociationDocument.push(...['staff','members','board','unknown'].map(audience=>({id:audience,business_id:'A',status:'published',audience,protected_content:'PRIVATE '+audience})));
    const list=await loadHandler('ManageAssociationRecords'),view=await loadHandler('ViewAssociationDocument');
    const req=body=>new Request('http://localhost',{method:'POST',body:JSON.stringify(body)});
    const response=await list(req({action:'list'}),f.client);assert.equal(response.status,200);
    assert.deepEqual((await response.json()).documents.map(x=>x.id),['owner','admin'].includes(role)?['staff','members','board']:['staff','members']);
    for(const audience of ['board','unknown']){
      const res=await view(req({document_id:audience}),f.client);
      assert.equal(res.status,audience==='board'&&['owner','admin'].includes(role)?200:403);
    }
    if(!['owner','admin'].includes(role)){
      for(const body of [{action:'publish_document',document:{title:'QA',protected_content:'hidden',audience:'board'}},{action:'archive_document',document_id:'board'}])assert.equal((await list(req(body),f.client)).status,403);
      assert.equal(f.db.AssociationDocument.find(x=>x.id==='board').status,'published');
    }
  });
}

test('Bareto AUTH-03: manual linking denies manager, mismatched/unverified/cross-tenant users',async()=>{
  for(const scenario of ['manager','mismatch','unverified','missing-verification','foreign-tenant','missing-user','valid']){
    const f=fixture(),m=await createMember(f.client,ownerA());
    let actor=ownerA();
    if(scenario==='manager'){actor={id:'manager',business_id:'A',role:'user'};f.db.RoleAssignment.push({business_id:'A',user_id:actor.id,role:'manager',permissions:['members.write']});}
    if(scenario==='mismatch')f.db.User[0].email='other@test.invalid';
    if(scenario==='unverified')f.db.User[0].is_verified=false;
    if(scenario==='missing-verification')delete f.db.User[0].is_verified;
    if(scenario==='foreign-tenant')f.db.User[0].business_id='B';
    if(scenario==='missing-user')f.db.User=[];
    if(scenario==='valid')f.db.User[0].email=' SOCIO@A.TEST ';
    const operation=()=>linkMemberUser(f.client,actor,{action:'link',member_id:m.id,user_id:'member1'});
    if(scenario==='valid')assert.equal((await operation()).member.user_id,'member1');
    else {await assert.rejects(operation,AuthorizationError);assert.equal(f.db.Member[0].user_id,null);}
  }
});

const ownerA = () => ({ id: 'ownerA', email: 'owner@a.test', role: 'user', data: { business_id: 'A', rinno_role: 'business_owner' } });
const ownerB = () => ({ id: 'ownerB', email: 'owner@b.test', role: 'user', data: { business_id: 'B', rinno_role: 'business_owner' } });
const accountantA = () => ({ id: 'accA', email: 'acc@a.test', role: 'user', data: { business_id: 'A' } });
const strangerA = () => ({ id: 'stranger', email: 's@a.test', role: 'user', data: { business_id: 'A' } });
const linkedUser = () => ({ id: 'member1', email: 'socio@a.test', role: 'user', data: { business_id: 'A', rinno_role: 'customer' } });

async function createMember(client, user, extra = {}) {
  const res = await manageMember(client, user, { action: 'create', member_data: { first_name: 'Ana', last_name: 'García', email:'socio@a.test', ...extra } });
  return res.member;
}
async function createPlan(client, user, code, fee = 1000) {
  const res = await manageMembershipPlan(client, user, { action: 'create', plan_data: { name: `Plan ${code}`, code, fee_amount: fee, fee_period: 'annual' } });
  return res.plan;
}

// 1. aislamiento business A vs B
test('tenant A members are invisible to tenant B', async () => {
  const f = fixture(); f.setU(ownerA());
  const a = await createMember(f.client, ownerA(), { first_name: 'A', last_name: 'One' });
  f.setU(ownerB());
  const res = await manageMember(f.client, ownerB(), { action: 'list' });
  assert.equal(res.members.length, 0);
  // B cannot fetch A's member by id (business_id mismatch => NotFound)
  await assert.rejects(manageMember(f.client, ownerB(), { action: 'get', member_id: a.id }), NotFoundError);
  assert.equal(f.db.Member.length, 1);
});

// 2. usuario sin permiso -> denegado
test('user without role assignment is denied (default-deny)', async () => {
  const f = fixture(); f.setU(strangerA());
  await assert.rejects(manageMember(f.client, strangerA(), { action: 'create', member_data: { first_name: 'X', last_name: 'Y' } }), AuthorizationError);
  assert.equal(f.db.Member.length, 0);
});

// 3. owner -> permitido
test('owner can create a member', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  assert.ok(m.id);
  assert.equal(m.business_id, 'A');
  assert.equal(m.status, 'active');
  assert.equal(m.user_id, null);
});

// 4. accountant no puede editar Member si no posee permiso
test('accountant can read members but cannot write them', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  await manageRoleAssignment(f.client, ownerA(), { action: 'set', user_id: 'accA', role: 'accountant' });
  f.setU(accountantA());
  const res = await manageMember(f.client, accountantA(), { action: 'list' });
  assert.equal(res.members.length, 1);
  await assert.rejects(manageMember(f.client, accountantA(), { action: 'update', member_id: m.id, member_data: { phone: '600' } }), AuthorizationError);
});

// 5. member_number unique por tenant
test('member_number is unique within a tenant (auto-generated)', async () => {
  const f = fixture(); f.setU(ownerA());
  const m1 = await createMember(f.client, ownerA(), { first_name: 'A', last_name: '1' });
  const m2 = await createMember(f.client, ownerA(), { first_name: 'A', last_name: '2' });
  assert.notEqual(m1.member_number, m2.member_number);
  // explicit duplicate rejected by retry → still unique
  const m3 = await createMember(f.client, ownerA(), { first_name: 'A', last_name: '3' });
  assert.notEqual(m3.member_number, m1.member_number);
  assert.notEqual(m3.member_number, m2.member_number);
});

// 6. mismo member_number permitido en tenants diferentes
test('same member_number is allowed in different tenants', async () => {
  const f = fixture(); f.setU(ownerA());
  await manageMember(f.client, ownerA(), { action: 'create', member_number: '100', member_data: { first_name: 'A', last_name: '1' } });
  f.setU(ownerB());
  const m = await manageMember(f.client, ownerB(), { action: 'create', member_number: '100', member_data: { first_name: 'B', last_name: '1' } });
  assert.equal(m.member.member_number, '100');
  assert.equal(m.member.business_id, 'B');
});

// 7. Member sin User válido
test('a Member is valid without a linked User', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  assert.equal(m.user_id, null);
  // resolveMember for an unlinked user returns null (no crash)
  f.setU(linkedUser());
  const r = await resolveMember(f.client, linkedUser());
  assert.equal(r.member, null);
});

// 8. vinculación User → Member
test('linking a User to a Member sets user_id', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  const res = await linkMemberUser(f.client, ownerA(), { action: 'link', member_id: m.id, user_id: 'member1' });
  assert.equal(res.member.user_id, 'member1');
  // resolveMember now finds it
  f.setU(linkedUser());
  const r = await resolveMember(f.client, linkedUser());
  assert.equal(r.member.id, m.id);
});

// 9. impedir User vinculado a dos Members del mismo tenant
test('a User cannot be linked to two Members of the same tenant', async () => {
  const f = fixture(); f.setU(ownerA());
  const m1 = await createMember(f.client, ownerA(), { first_name: 'A', last_name: '1' });
  const m2 = await createMember(f.client, ownerA(), { first_name: 'A', last_name: '2' });
  await linkMemberUser(f.client, ownerA(), { action: 'link', member_id: m1.id, user_id: 'member1' });
  await assert.rejects(linkMemberUser(f.client, ownerA(), { action: 'link', member_id: m2.id, user_id: 'member1' }), ConflictError);
});

// 10. historial Membership
test('membership history is preserved (no overwrite)', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  const plan = await createPlan(f.client, ownerA(), 'adult', 1000);
  await manageMembership(f.client, ownerA(), { action: 'create', member_id: m.id, plan_id: plan.id, start_date: '2026-01-01' });
  await manageMembership(f.client, ownerA(), { action: 'renew', member_id: m.id, plan_id: plan.id, start_date: '2027-01-01' });
  const res = await manageMembership(f.client, ownerA(), { action: 'list', member_id: m.id });
  assert.equal(res.memberships.length, 2);
});

// 11. renovación crea nueva Membership y expira la anterior
test('renewal creates a new active membership and expires the previous', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  const plan = await createPlan(f.client, ownerA(), 'adult', 1000);
  const first = await manageMembership(f.client, ownerA(), { action: 'create', member_id: m.id, plan_id: plan.id, start_date: '2026-01-01' });
  const renewed = await manageMembership(f.client, ownerA(), { action: 'renew', member_id: m.id, plan_id: plan.id, start_date: '2027-01-01' });
  assert.equal(renewed.membership.status, 'active');
  assert.equal(renewed.membership.renewed_from, first.membership.id);
  const prev = await manageMembership(f.client, ownerA(), { action: 'get', membership_id: first.membership.id });
  assert.equal(prev.membership.status, 'expired');
});

// 12. snapshots del plan permanecen aunque MembershipPlan cambie
test('membership snapshots survive plan changes', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  const plan = await createPlan(f.client, ownerA(), 'adult', 1000);
  const mem = await manageMembership(f.client, ownerA(), { action: 'create', member_id: m.id, plan_id: plan.id, start_date: '2026-01-01' });
  assert.equal(mem.membership.fee_amount_snapshot, 1000);
  assert.equal(mem.membership.plan_name_snapshot, 'Plan adult');
  // rename + repricing the plan
  await manageMembershipPlan(f.client, ownerA(), { action: 'update', plan_id: plan.id, plan_data: { name: 'Plan adulto nuevo', fee_amount: 2000 } });
  // the membership snapshot is untouched
  const r = await manageMembership(f.client, ownerA(), { action: 'get', membership_id: mem.membership.id });
  assert.equal(r.membership.fee_amount_snapshot, 1000);
  assert.equal(r.membership.plan_name_snapshot, 'Plan adult');
});

// 13. impedir operaciones cross-tenant
test('cross-tenant membership creation is denied', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  const plan = await createPlan(f.client, ownerA(), 'adult', 1000);
  f.setU(ownerB());
  await assert.rejects(manageMembership(f.client, ownerB(), { action: 'create', member_id: m.id, plan_id: plan.id }), NotFoundError);
});

// single-active membership guard
test('a member cannot hold two active memberships', async () => {
  const f = fixture(); f.setU(ownerA());
  const m = await createMember(f.client, ownerA());
  const plan = await createPlan(f.client, ownerA(), 'adult', 1000);
  await manageMembership(f.client, ownerA(), { action: 'create', member_id: m.id, plan_id: plan.id });
  await assert.rejects(manageMembership(f.client, ownerA(), { action: 'create', member_id: m.id, plan_id: plan.id }), ConflictError);
});

// member_number generator unit
test('generateNextMemberNumber returns max+1 and handles gaps', () => {
  assert.equal(generateNextMemberNumber([]), '1');
  assert.equal(generateNextMemberNumber(['1', '2', '5']), '6');
  assert.equal(generateNextMemberNumber(['A', '3', 'foo']), '4');
});

// permission matrix unit
test('permission matrix: owner all, accountant read-only, viewer read-only', () => {
  assert.equal(hasPermission('owner', 'members.write'), true);
  assert.equal(hasPermission('owner', 'roles.manage'), true);
  assert.equal(hasPermission('accountant', 'members.read'), true);
  assert.equal(hasPermission('accountant', 'members.write'), false);
  assert.equal(hasPermission('viewer', 'members.read'), true);
  assert.equal(hasPermission('viewer', 'memberships.manage'), false);
});

// member without required fields rejected
test('member create without name is rejected', async () => {
  const f = fixture(); f.setU(ownerA());
  await assert.rejects(manageMember(f.client, ownerA(), { action: 'create', member_data: { first_name: '', last_name: '' } }), ValidationError);
});

// audit log is generated on member create
test('member.create writes an AuditLog entry', async () => {
  const f = fixture(); f.setU(ownerA());
  await createMember(f.client, ownerA());
  assert.equal(f.db.AuditLog.length, 1);
  assert.equal(f.db.AuditLog[0].action, 'member.created');
  assert.equal(f.db.AuditLog[0].business_id, 'A');
});
