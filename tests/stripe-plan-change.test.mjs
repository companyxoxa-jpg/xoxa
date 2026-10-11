import test from 'node:test';
import assert from 'node:assert/strict';
import {changeStripeSubscriptionPlan} from '../base44/shared/stripe-billing.ts';
import {loadHandler} from './load-handler.mjs';
const handler=await loadHandler('ManageBilling');
test('plan changes use configured monthly EUR price and preserve trial with proration',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;let posted;
 globalThis.Deno={env:{get:n=>({STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_TEST_ONLY:'true',STRIPE_PREMIUM_PRICE_ID:'price_premium'})[n]||''}};
 globalThis.fetch=async(url,opt)=>{
  if(opt.method==='POST'){posted=new URLSearchParams(opt.body);return Response.json({status:'trialing'});}
  if(url.includes('/prices/'))return Response.json({active:true,currency:'eur',unit_amount:3999,recurring:{interval:'month',interval_count:1},livemode:false});
  return Response.json({status:'trialing',items:{data:[{id:'si_fixture',quantity:1,price:{id:'price_standard'}}]}});
 };
 try{assert.equal((await changeStripeSubscriptionPlan('sub_fixture','premium')).status,'trialing');assert.equal(posted.get('items[0][price]'),'price_premium');assert.equal(posted.get('proration_behavior'),'create_prorations');assert.equal(posted.has('trial_end'),false);await assert.rejects(changeStripeSubscriptionPlan('sub_fixture','untrusted'),/Tarifa/);}
 finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});
test('owner cannot call the plan change action even on own business',async()=>{
 const client={auth:{me:async()=>({id:'owner',email:'owner@example.com',role:'user',rinno_role:'business_owner',business_id:'b'})},asServiceRole:{entities:{Subscription:{filter:async()=>[{id:'s',external_subscription_id:'sub'}]}}}};
 const res=await handler(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'change_plan',business_id:'b',plan_id:'premium'})}),client);
 assert.equal(res.status,403);
});
