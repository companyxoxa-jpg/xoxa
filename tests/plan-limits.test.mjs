import { conditionalUpdate } from './conditional-update.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPlanCapacity } from '../base44/shared/plan-limits.js';
import { loadHandler } from './load-handler.mjs';
const manageProduct = await loadHandler('ManageProduct');
const linkUser = await loadHandler('LinkBusinessUser');
function fixture() {
  const db = {
    Business: [{ id: 'A', plan_id: 'wrong' }],
    Subscription: [{ business_id: 'A', plan_id: 'actual', status: 'active' }],
    Plan: [{ id: 'actual', max_products: 2, max_users: 1 }],
    Product: [{ id: 'p1', business_id: 'A' }],
    User: [{ id: 'owner', business_id: 'A', rinno_role: 'business_owner' }, { id: 'new', email: 'new@example.test' }], AuditLog: [],
  };
  const entities = Object.fromEntries(Object.keys(db).map(name => [name, {
    filter: async (filter, sort, limit=200, skip=0) => db[name].filter(r => Object.entries(filter).every(([k,v]) => r[k] === v)).slice(skip,skip+limit),
    updateMany: async (query, update) => conditionalUpdate(db[name], query, update),
    get: async id => db[name].find(r => r.id === id),
    create: async data => { const r = {...data, id: crypto.randomUUID()}; db[name].push(r); return r; },
    update: async (id, data) => Object.assign(db[name].find(r => r.id === id), data),
  }]));
  const client = { asServiceRole: { entities }, auth: { me: async () => ({id: 'admin', role: 'admin', email: 'companyxoxa@gmail.com', data: { support_business_id: 'A' }}) } };
  return { db, client };
}
const request = body => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
test('product handler resolves Subscription → Plan, rejects the next create, preserves edits', async () => {
  const f=fixture(), body={action:'create', product_data:{name:'Pan', price:200, unit_type:'unit', business_id:'B'}};
  assert.equal((await manageProduct(request(body), f.client)).status,200);
  assert.equal(f.db.Product.at(-1).business_id,'A');
  const rejected=await manageProduct(request(body),f.client);
  assert.equal(rejected.status,409); assert.match((await rejected.json()).error,/límite/);
  assert.equal(f.db.Product.length,2);
  assert.equal((await manageProduct(request({action:'update',product_id:'p1',product_data:{price:300}}),f.client)).status,200);
});

test('parallel product creation cannot spend the final slot more than once', async () => {
  const f=fixture();
  const results=await Promise.all(Array.from({length:12},()=>manageProduct(request({action:'create',product_data:{name:'Pan',price:200,unit_type:'unit'}}),f.client)));
  assert.equal(results.filter(r=>r.status===200).length,1);
  assert.equal(f.db.Product.length,2);
});
test('team limit counts owners and staff, excludes customers, permits existing role changes', async () => {
  const f=fixture(); f.db.User.push({id:'customer',business_id:'A',rinno_role:'customer'});
  assert.equal((await linkUser(request({email:'new@example.test',business_id:'A',rinno_role:'business_staff'}),f.client)).status,409);
  assert.equal(f.db.User[1].business_id,undefined);
  f.db.User[0].email='owner@example.test';
  assert.equal((await linkUser(request({email:'owner@example.test',business_id:'A',rinno_role:'business_staff'}),f.client)).status,200);
  f.db.Plan[0].max_users=2;
  assert.equal((await linkUser(request({email:'new@example.test',business_id:'A',rinno_role:'business_staff'}),f.client)).status,200);
});
test('unlimited, pagination, tenant separation and invalid subscription configuration', async () => {
  const f=fixture(); f.db.Plan[0].max_products=201;
  f.db.Product=Array.from({length:201},(_,i)=>({id:String(i),business_id:'A'}));
  await assert.rejects(assertPlanCapacity(f.client,'A','products'),{status:409});
  f.db.Product[200].business_id='B'; await assertPlanCapacity(f.client,'A','products');
  f.db.Plan[0].max_products=0; await assertPlanCapacity(f.client,'A','products');
  f.db.Plan[0].max_products=-1; await assert.rejects(assertPlanCapacity(f.client,'A','products'),{status:409});
  f.db.Plan[0].max_products=10;
  f.db.Subscription.push({...f.db.Subscription[0]}); await assert.rejects(assertPlanCapacity(f.client,'A','products'),{status:409});
  f.db.Subscription=[]; await assert.rejects(assertPlanCapacity(f.client,'A','products'),{status:409});
});
test('direct product creation and tenant subscription mutation cannot bypass checks in schema', async () => {
  const {readFile}=await import('node:fs/promises');
  const schema=async name=>JSON.parse(await readFile(new URL(`../base44/entities/${name}.jsonc`,import.meta.url)));
  assert.equal((await schema('Product')).rls.create,false);
  for(const action of ['create','update','delete']) assert.equal((await schema('Subscription')).rls[action],false);
});

