import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { loadHandler } from './load-handler.mjs';
import { readAuthenticatedUser } from '../base44/shared/rinno.ts';
const addresses = await loadHandler('ManageSavedAddress');
const register = await loadHandler('RegisterCustomer');
const req = body => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });

test('anonymous SDK errors become no user but provider outages remain errors', async () => {
  const client=status=>({auth:{me:async()=>{throw Object.assign(new Error('provider'),{status});}}});
  assert.equal(await readAuthenticatedUser(client(401)),null);
  await assert.rejects(readAuthenticatedUser(client(503)),{status:503});
  await assert.rejects(readAuthenticatedUser(client(403)),{status:403});
});

test('User extends custom fields only; FLS uses documented read/write permissions', async () => {
  for (const file of await readdir('base44/entities')) {
    const s = JSON.parse(await readFile(`base44/entities/${file}`, 'utf8'));
    if (s.name === 'User') for (const field of ['role','email','full_name','id','created_date']) {
      assert.equal(s.properties[field], undefined);
      assert.ok(!(s.required || []).includes(field));
    }
    for (const field of Object.values(s.properties)) for (const op of Object.keys(field.rls || {})) {
      assert.ok(['read','write'].includes(op), `${file}: unsupported FLS ${op}`);
    }
  }
});
function fixture() {
  let user = { id: 'c1', role: 'user', rinno_role: 'customer' };
  const rows = [
    { id: 'own', owner_user_id: 'c1', business_id: 'A', address: 'Synthetic 1', is_default: true },
    { id: 'other', owner_user_id: 'c2', business_id: 'A', address: 'Synthetic 2', is_default: true },
    { id: 'cross', owner_user_id: 'c1', business_id: 'B', address: 'Synthetic 3' },
    { id: 'legacy', created_by_id: 'c1', business_id: 'A', address: 'Synthetic 4' },
  ];
  const writes = [];
  const reader = { filter: async query => rows.filter(r => Object.entries(query).every(([k,v]) => r[k] === v)) };
  const writer = {
    create: async data => { writes.push(['create', data]); return { id: 'new', ...data }; },
    update: async (id, data) => { writes.push(['update', id, data]); return { id, ...data }; },
    delete: async id => { writes.push(['delete', id]); },
  };
  const client = { auth: { me: async () => user }, entities: { SavedAddress: reader }, asServiceRole: { entities: {
    SavedAddress: writer, Business: { filter: async () => [{ id: 'A', slug: 'qa-a', status: 'active' }] },
    AuditLog: { create: async () => ({}) },
    User: { update: async (id,data) => { writes.push(['profile', id, data]); return data; } },
    Customer: { filter: async () => [{ id:'membership' }] },
  } } };
  return { client, writes, user: value => { user = value; } };
}
test('address writes reject another owner or business even if read SDK returns their rows', async () => {
  for (const action of ['update','delete']) for (const id of ['other','cross']) {
    const f = fixture();
    assert.equal((await addresses(req({ action, slug:'qa-a', address_id:id, address_data:{ address:'attack' } }), f.client)).status, 404);
    assert.deepEqual(f.writes, []);
  }
});
test('address creation derives tenant and owner; defaults do not mutate other owners', async () => {
  const f = fixture();
  const response = await addresses(req({ action:'create', slug:'qa-a', address_data:{ address:'Synthetic new', business_id:'B', owner_user_id:'c2', is_default:true } }), f.client);
  assert.equal(response.status, 200);
  const data = (await response.json()).address;
  assert.equal(data.business_id,'A'); assert.equal(data.owner_user_id,'c1');
  assert.ok(!f.writes.some(w => w[1] === 'other'));
  assert.ok(f.writes.some(w => w[0] === 'update' && w[1] === 'own'));
});
test('own and legacy addresses remain mutable without changing tenant or owner', async () => {
  for (const id of ['own','legacy']) {
    const f = fixture();
    assert.equal((await addresses(req({ action:'update', slug:'qa-a', address_id:id, address_data:{ address:'Synthetic changed', business_id:'B', owner_user_id:'c2' } }), f.client)).status,200);
    assert.deepEqual(f.writes[0],['update',id,{address:'Synthetic changed'}]);
    assert.equal((await addresses(req({ action:'delete', slug:'qa-a', address_id:id }), f.client)).status,200);
  }
});
test('address list returns only own addresses and rejects object identifiers', async () => {
  const f = fixture();
  assert.deepEqual((await (await addresses(req({action:'list',slug:'qa-a'}),f.client)).json()).addresses.map(a=>a.id),['own','legacy']);
  assert.equal((await addresses(req({action:'delete',slug:'qa-a',address_id:{$ne:null}}),f.client)).status,400);
  assert.deepEqual(f.writes,[]);
});
test('customer registration does not write reserved platform role', async () => {
  const f = fixture(); f.user({id:'new',role:'user'});
  assert.equal((await register(req({slug:'qa-a',first_name:'QA',phone:'000000000'}),f.client)).status,200);
  assert.equal(f.writes[0][2].rinno_role,'customer');
  assert.equal(f.writes[0][2].role,undefined);
});
test('platform admin cannot convert their account to customer', async () => {
  const f = fixture(); f.user({id:'admin',role:'admin'});
  assert.equal((await register(req({slug:'qa-a',first_name:'QA',phone:'000000000'}),f.client)).status,403);
  assert.deepEqual(f.writes,[]);
});
