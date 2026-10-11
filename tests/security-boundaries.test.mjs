import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadHandler } from './load-handler.mjs';
import { requirePermission } from '../base44/shared/associations.js';

const track = await loadHandler('TrackOrder');
const guest = await loadHandler('GuestOrderLookup');
const storefront = await loadHandler('GetStorefront');
const createOrder = await loadHandler('CreateOrder');
const request = body => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
function fixture() {
  const queries = [];
  const rows = {
    Business: [{ id: 'B', slug: 'shop-b', business_name: 'B' }],
    Order: [{ id: 'order-b', business_id: 'B', order_number: '123', tracking_token: 'private-token', customer_email: 'customer@test.invalid', delivery_address: 'Private address' }],
    OrderItem: [],
  };
  const entities = Object.fromEntries(Object.entries(rows).map(([name, data]) => [name, {
    filter: async query => {
      queries.push({ name, query });
      // Model the documented Mongo-style filter contract, including attacker-supplied operators.
      return data.filter(row => Object.entries(query).every(([key, value]) =>
        value && typeof value === 'object' && '$ne' in value ? row[key] !== value.$ne : row[key] === value));
    },
  }]));
  return { client: { asServiceRole: { entities } }, queries };
}
test('public tracking rejects query operators before touching privileged data', async () => {
  for (const token of [{ $ne: null }, ['private-token'], 1, true]) {
    const f = fixture();
    assert.equal((await track(request({ token }), f.client)).status, 400);
    assert.equal(f.queries.length, 0);
  }
});
test('guest lookup requires an exact order reference, not a query operator', async () => {
  const f = fixture();
  assert.equal((await guest(request({ slug: 'shop-b', order_number: { $ne: null }, email: 'customer@test.invalid' }), f.client)).status, 400);
  assert.equal(f.queries.length, 0);
});
test('public storefront and checkout reject a non-string tenant selector', async () => {
  for (const handler of [storefront, createOrder]) {
    const f = fixture();
    f.client.auth = { me: async () => null };
    const response = await handler(request({ slug: { $ne: null }, items: [{ product_id: 'x', quantity: 1 }] }), f.client);
    assert.equal(response.status, 400);
    assert.equal(f.queries.length, 0);
  }
});
test('valid bearer tracking and exact guest lookup remain available', async () => {
  const f = fixture();
  assert.equal((await track(request({ token: 'private-token' }), f.client)).status, 200);
  assert.equal((await guest(request({ slug: 'shop-b', order_number: '123', email: 'customer@test.invalid' }), f.client)).status, 200);
  assert.equal((await guest(request({ slug: 'shop-b', order_number: '123', email: 'other@test.invalid' }), f.client)).status, 404);
});
test('association owner fallback and explicit permissions cannot cross tenant context', async () => {
  const client = { asServiceRole: { entities: { RoleAssignment: { filter: async () => [{ role: 'admin', permissions: ['roles.manage'] }] } } } };
  const owner = { id: 'owner-a', role: 'user', data: { business_id: 'A', rinno_role: 'business_owner' } };
  await assert.rejects(requirePermission(client, owner, 'B', 'roles.manage'), { status: 403 });
  assert.equal(await requirePermission(client, owner, 'A', 'roles.manage'), 'admin');
});

const schema = async name => JSON.parse(await readFile(new URL(`../base44/entities/${name}.jsonc`, import.meta.url)));
test('direct role grants and sensitive mutations are closed at the schema boundary', async () => {
  for (const name of ['RoleAssignment', 'Member', 'Credential', 'MemberPayment', 'PaymentAllocation', 'Order', 'OrderItem', 'Product', 'BusinessSettings', 'AuditLog', 'Subscription']) {
    const s = await schema(name);
    for (const action of ['create', 'update', 'delete']) assert.equal(s.rls[action], false, `${name}.${action}`);
  }
});
test('profile cannot self-assign tenant, business role or support context', async () => {
  const s = await schema('User');
  for (const name of ['business_id', 'rinno_role', 'support_business_id']) {
    assert.deepEqual(s.properties[name]?.rls, { write: false }, name);
  }
});
