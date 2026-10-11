import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isCommercial, isSuperAdmin } from '../base44/shared/rinno.ts';

test('the three approved emails require the protected admin role', () => {
  for (const email of ['companyxoxa@gmail.com','ax.network.hub@gmail.com','xoxamariles@gmail.com']) {
    assert.equal(isSuperAdmin({ role:'admin', email }), true);
    assert.equal(isSuperAdmin({ role:'user', email }), false);
  }
});

test('commercial access comes from the server-side allowlist entity', async () => {
  const client={asServiceRole:{entities:{CommercialAccess:{filter:async q=>q.email==='seller@rinno.es'&&q.status==='active'?[{id:'c1'}]:[]}}}};
  assert.equal(await isCommercial(client,{role:'user',email:'SELLER@RINNO.ES'}),true);
  assert.equal(await isCommercial(client,{role:'user',email:'other@rinno.es'}),false);
});

test('commercial demo endpoint exposes no financial or sales entities', () => {
  const source=fs.readFileSync(new URL('../base44/functions/CommercialDemos/entry.ts',import.meta.url),'utf8');
  for(const forbidden of ['entities.Order','entities.Subscription','entities.Payment','entities.MemberFee','monthly_price','total_spent']) assert.equal(source.includes(forbidden),false,forbidden);
});

test('commercial business mutations are restricted to update actions and demo records', () => {
  const source=fs.readFileSync(new URL('../base44/functions/ManageBusiness/entry.ts',import.meta.url),'utf8');
  assert.match(source,/commercial && action !== 'update'/);
  assert.match(source,/commercial && !isDemo/);
});

test('commercial command center is outside business workspace guard', () => {
  const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const businessEnd=source.indexOf('</Route>',source.indexOf('<Route element={<BusinessRoute />}>' ));
  const commandStart=source.indexOf('<Route element={<CommandCenterRoute />}>' );
  assert.ok(commandStart > businessEnd, 'CommandCenterRoute must not be nested under BusinessRoute');
});

test('support mode enters the establishment panel instead of the public landing', () => {
  const source=fs.readFileSync(new URL('../src/pages/BusinessDetail.jsx',import.meta.url),'utf8');
  assert.match(source,/await enterSupportMode\(business\.id, business\.business_name\);\s*navigate\("\/panel"\)/);
});
