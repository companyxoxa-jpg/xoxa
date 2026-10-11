import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { loadHandler } from './load-handler.mjs';
import { isSuperAdmin } from '../base44/shared/rinno.ts';

const publicFunctions = new Set(['GetStorefront', 'ResolveBusiness', 'TrackOrder', 'GuestOrderLookup', 'CreateOrder', 'BookingPublic', 'BillingWebhook']);
// These imports depend on Deno's npm resolver; exercised separately by existing
// contract/document tests. This suite does not claim their runtime coverage.
const denoOnly = new Set(['ManageContract', 'ManageDocuments']);
const request = body => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });

for (const name of await readdir('base44/functions')) {
  if (publicFunctions.has(name) || denoOnly.has(name)) continue;
  const handler = await loadHandler(name);
  test(`${name}: anonymous request cannot touch entities or integrations`, async () => {
    let touched = false;
    const forbidden = new Proxy({}, { get() { touched = true; throw new Error('Unexpected privileged access'); } });
    const client = { auth: { me: async () => null }, asServiceRole: forbidden, entities: forbidden, integrations: forbidden };
    const response = await handler(request({ action: 'list', business_id: 'B' }), client);
    assert.ok([401, 403].includes(response.status), `status ${response.status}`);
    assert.equal(touched, false);
    client.auth.me = async () => { throw Object.assign(new Error('Authentication required'), { status: 401 }); };
    const rejected = await handler(request({ action: 'list', business_id: 'B' }), client);
    assert.ok([401, 403].includes(rejected.status), `SDK rejects anonymous session: ${rejected.status}`);
    assert.equal(touched, false);
  });
}

test('Super Admin requires both protected admin role and allowlisted identity', () => {
  for (const user of [null, { role: 'user', email: 'companyxoxa@gmail.com', rinno_role: 'super_admin' }, { role: 'admin', email: 'other@test.invalid' }, { role: 'user', email: 'other@test.invalid', data: { rinno_role: 'super_admin', support_business_id: 'B' } }]) assert.equal(isSuperAdmin(user), false);
  assert.equal(isSuperAdmin({ role: 'admin', email: 'companyxoxa@gmail.com' }), true);
});

const adminOnly = ['ManageBusinessTeam', 'LinkBusinessUser', 'ManageSupportMode', 'ManageMutationLock', 'ManageClientDossier', 'CleanupExpiredSecurityData', 'ResetDemo'];
for (const name of adminOnly) {
  const handler = await loadHandler(name);
  test(`${name}: owner, employee, commercial, customer and unlisted admin cannot act as Super Admin`, async () => {
    for (const role of ['business_owner', 'business_staff', 'commercial', 'customer', 'super_admin']) {
      let touched = false;
      const forbidden = new Proxy({}, { get() { touched = true; throw new Error('Unexpected privileged access'); } });
      const user = { id: 'actor', email: 'other@test.invalid', role: role === 'super_admin' ? 'admin' : 'user', data: { rinno_role: role, business_id: 'A', support_business_id: 'B' } };
      const response = await handler(request({ action: 'enter', business_id: 'B' }), { auth: { me: async () => user }, asServiceRole: forbidden });
      assert.equal(response.status, 403, role);
      assert.equal(touched, false);
    }
  });
}

test('all app-managed entities reject direct client mutations', async () => {
  for (const file of await readdir('base44/entities')) {
    const schema = JSON.parse(await readFile(`base44/entities/${file}`, 'utf8'));
    if (schema.name === 'User') continue;
    for (const action of ['create', 'update', 'delete']) assert.equal(schema.rls[action], false, `${file}:${action}`);
  }
});

test('direct billing reads require an allowlisted platform admin, not a tenant staff role', async () => {
  const s = JSON.parse(await readFile('base44/entities/Subscription.jsonc', 'utf8'));
  assert.ok(s.rls.read.$or.length > 0);
  for (const condition of s.rls.read.$or) {
    assert.equal(condition.user_condition.role, 'admin');
    assert.equal(isSuperAdmin(condition.user_condition), true);
  }
});
