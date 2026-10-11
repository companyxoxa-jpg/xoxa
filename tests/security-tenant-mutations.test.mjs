import test from 'node:test';
import assert from 'node:assert/strict';
import { loadHandler } from './load-handler.mjs';
import { createAuditLog } from '../base44/shared/rinno.ts';

const request = body => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
const cases = [
  ['ManageProduct', 'Product', { action: 'update', product_id: 'target', product_data: { name: 'Changed', business_id: 'B' } }],
  ['UpdateOrderStatus', 'Order', { order_id: 'target', new_status: 'accepted', actor_user_id: 'forged' }],
  ['ManageFulfillmentSlots', 'FulfillmentSlot', { action: 'update', slot_id: 'target', slot_data: { start_time: '10:00', business_id: 'B' } }],
  ['ManageFulfillmentSlots', 'FulfillmentSlot', { action: 'delete', slot_id: 'target' }],
];
for (const [name, entityName, body] of cases) {
  const handler = await loadHandler(name);
  test(`${name}/${body.action || 'status'} denies foreign rows; allows same-tenant owner`, async () => {
    for (const business_id of ['B', 'A']) {
      const row = { id: 'target', business_id, order_status: 'pending', name: 'Original' };
      const changes = [];
      const audit = [];
      const entity = { get: async () => structuredClone(row), update: async (id, data) => { changes.push(data); return { ...row, ...data }; }, delete: async () => { changes.push('delete'); } };
      const user = { id: 'owner-a', role: 'user', data: { business_id: 'A', rinno_role: 'business_owner' } };
      const client = { auth: { me: async () => user }, asServiceRole: { entities: { [entityName]: entity, AuditLog: { create: async x => audit.push(x) } } } };
      const response = await handler(request({ ...body, business_id: 'B' }), client);
      assert.equal(response.status, business_id === 'B' ? 404 : 200);
      assert.equal(changes.length, business_id === 'B' ? 0 : 1);
      if (typeof changes[0] === 'object') assert.equal(changes[0].business_id, undefined);
      for (const entry of audit) assert.equal(entry.actor_user_id, user.id);
    }
  });
}
test('audit actor and tenant come from authenticated context, not claimed actor fields', async () => {
  let entry;
  await createAuditLog({ asServiceRole: { entities: { AuditLog: { create: async x => { entry = x; } } } } },
    { id: 'real', role: 'user', data: { business_id: 'A', rinno_role: 'business_owner' } }, 'security.test', { actor_user_id: 'forged', actor_role: 'super_admin' });
  assert.equal(entry.actor_user_id, 'real');
  assert.equal(entry.actor_role, 'business_owner');
  assert.equal(entry.business_id, 'A');
});
