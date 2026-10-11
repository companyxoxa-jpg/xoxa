import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeBusinessTenant } from '../base44/shared/business-tenant.js';

test('tenant provisioning derives membership from the persisted business ID only', async () => {
  const writes=[];
  const entity={update:async(id,data)=>writes.push({id,data})};
  const initialized=await initializeBusinessTenant(entity,{id:'A',business_name:'Synthetic'});
  assert.equal(initialized.tenant_id,'A');
  assert.deepEqual(writes,[{id:'A',data:{tenant_id:'A'}}]);
  await initializeBusinessTenant(entity,initialized);
  assert.equal(writes.length,1);
  await assert.rejects(initializeBusinessTenant(entity,{id:'A',tenant_id:'B'}),/mismatch/);
  await assert.rejects(initializeBusinessTenant(entity,{id:''}),/ID required/);
  assert.equal(writes.length,1);
});
test('failed provisioning does not return a business with a fabricated tenant binding', async () => {
  const business={id:'A'};
  await assert.rejects(initializeBusinessTenant({update:async()=>{throw Error('write failed');}},business),/write failed/);
  assert.equal(business.tenant_id,undefined);
});
test('Business tenant comparison excludes missing or empty tenant keys and disallows direct writes', async () => {
  const schema=JSON.parse(await readFile(new URL('../base44/entities/Business.jsonc',import.meta.url)));
  const rule=schema.rls.read.$or[0];
  assert.deepEqual(rule,{$and:[{'data.tenant_id':'{{user.data.business_id}}'},{'data.tenant_id':{$exists:true,$nin:['',null]}}]});
  assert.equal(schema.properties.tenant_id.rls.write,false);
  for(const operation of ['create','update','delete'])assert.equal(schema.rls[operation],false);
  // Simulate only this explicit equality branch, not Base44 runtime behavior.
  const allowed=(tenant,userTenant)=>tenant!==undefined&&tenant!==null&&tenant!==''&&tenant===userTenant;
  assert.equal(allowed('A','A'),true);
  assert.equal(allowed('A','B'),false);
  for(const empty of [undefined,null,''])assert.equal(allowed(empty,empty),false);
});
