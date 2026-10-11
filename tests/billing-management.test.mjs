import test from 'node:test';
import assert from 'node:assert/strict';
import {loadHandler} from './load-handler.mjs';
const handler=await loadHandler('ManageBilling');
test('resuming cancellation preserves provider trial and waits for its webhook',async()=>{
  const previousFetch=globalThis.fetch,previousDeno=globalThis.Deno;
  let writes=0;
  globalThis.Deno={env:{get:()=>''+crypto.randomUUID()}};
  globalThis.fetch=async()=>new Response(JSON.stringify({id:'sub',status:'trialing',cancel_at_period_end:false}));
  const client={auth:{me:async()=>({id:'synthetic-admin',email:'companyxoxa@gmail.com',role:'admin'})},asServiceRole:{entities:{Subscription:{filter:async()=>[{id:'local',external_subscription_id:'sub',status:'cancel_at_period_end'}],update:async()=>{writes++;}},AuditLog:{create:async()=>({})}}}};
  try{const response=await handler(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'resume',business_id:'b'})}),client);assert.equal(response.status,200);assert.equal((await response.json()).status,'trialing');assert.equal(writes,0);}finally{globalThis.fetch=previousFetch;globalThis.Deno=previousDeno;}
});
