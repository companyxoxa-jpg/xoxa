import test from 'node:test';
import assert from 'node:assert/strict';
import {processBillingEvent} from '../base44/shared/billing.js';

function fixture() {
  const db={Business:[{id:'b',status:'onboarding'}],Subscription:[],BillingPayment:[],BillingInvoice:[],BillingWebhookEvent:[]};
  let seq=0;
  const entities=Object.fromEntries(Object.keys(db).map(name=>[name,{
    updateMany:async(q,change)=>{const rows=db[name].filter(row=>row.id===q.id&&(q.$or?!row.mutation_token:row.mutation_token===q.mutation_token));for(const row of rows)Object.assign(row,change.$set);return {updated:rows.length};},
    filter:async q=>structuredClone(db[name].filter(row=>Object.entries(q).every(([key,value])=>row[key]===value))),
    create:async data=>{const row={...data,id:`row-${++seq}`};db[name].push(row);return structuredClone(row);},
    update:async(id,data)=>{const row=db[name].find(row=>row.id===id);Object.assign(row,data);return structuredClone(row);},
  }]));
  return {db,client:{asServiceRole:{entities}}};
}
const checkout=(id='evt_checkout')=>({id,type:'checkout.session.completed',data:{object:{id:'cs_checkout',mode:'payment',payment_status:'paid',customer:'cus',subscription:'sub',amount_total:39900,currency:'eur',metadata:{business_id:'b',plan_id:'standard'}}}});

test('a failed webhook can recover on redelivery using its original event row',async()=>{
  const f=fixture();
  const update=f.client.asServiceRole.entities.Business.update;
  f.client.asServiceRole.entities.Business.update=async()=>{throw Object.assign(new Error('definite validation failure'),{status:400});};
  await assert.rejects(processBillingEvent(f.client,checkout()));
  assert.equal(f.db.BillingWebhookEvent[0].status,'failed');
  f.client.asServiceRole.entities.Business.update=update;
  const retry=await processBillingEvent(f.client,checkout());
  assert.equal(retry.ok,true);
  assert.equal(f.db.Business[0].status,'trial');
  assert.equal(f.db.BillingWebhookEvent.length,1);
  assert.equal(f.db.BillingWebhookEvent[0].status,'processed');
});

test('redelivery while processing must not acknowledge an unfinished event as success',async()=>{
  const f=fixture();
  f.db.BillingWebhookEvent.push({id:'row',provider:'stripe',external_event_id:'evt_checkout',status:'processing'});
  await assert.rejects(processBillingEvent(f.client,checkout()));
  assert.equal(f.db.Subscription.length,0);
});

test('a stale failed invoice cannot overwrite a successful payment for the same invoice',async()=>{
  const f=fixture();await processBillingEvent(f.client,checkout());
  const invoice={id:'in_paid',subscription:'sub',amount_paid:2495,amount_due:2495,currency:'eur',status:'paid'};
  await processBillingEvent(f.client,{id:'evt_paid',type:'invoice.paid',data:{object:invoice}});
  await processBillingEvent(f.client,{id:'evt_old_failure',type:'invoice.payment_failed',data:{object:{...invoice,amount_paid:0,status:'open'}}});
  assert.equal(f.db.BillingPayment[0].status,'succeeded');
  assert.equal(f.db.Subscription[0].status,'active');
  assert.equal(f.db.Business[0].status,'active');
});

test('failed webhook evidence never stores raw error details containing credentials',async()=>{
  const f=fixture();
  f.client.asServiceRole.entities.Business.update=async()=>{throw new Error('sensitive-provider-response');};
  await assert.rejects(processBillingEvent(f.client,checkout()));
  assert.ok(!f.db.BillingWebhookEvent[0].error.includes('sensitive-provider-response'));
});

test('concurrent deliveries are serialized by the persistent business gate',async()=>{
  const f=fixture();
  const results=await Promise.allSettled([processBillingEvent(f.client,checkout()),processBillingEvent(f.client,checkout())]);
  assert.equal(results.filter(row=>row.status==='fulfilled').length,1);
  assert.equal(results.find(row=>row.status==='rejected').reason.status,423);
  assert.deepEqual(await processBillingEvent(f.client,checkout()),{duplicate:true});
  assert.equal(f.db.Subscription.length,1);
  assert.equal(f.db.BillingWebhookEvent.length,1);
});

test('an uncertain write fails closed until an administrator reconciles the business gate',async()=>{
  const f=fixture();
  f.client.asServiceRole.entities.Business.update=async()=>{throw new Error('connection lost after send');};
  await assert.rejects(processBillingEvent(f.client,checkout()));
  assert.ok(f.db.Business[0].mutation_token);
  await assert.rejects(processBillingEvent(f.client,checkout()),error=>error.status===423);
  assert.equal(f.db.BillingWebhookEvent[0].status,'failed');
});

test('incomplete and past-due subscriptions never grant active business access',async()=>{
  for(const status of ['incomplete','past_due','unpaid','paused']) {
    const f=fixture();await processBillingEvent(f.client,checkout());
    await processBillingEvent(f.client,{id:`evt_${status}`,type:'customer.subscription.updated',data:{object:{id:'sub',status,cancel_at_period_end:true}}});
    assert.equal(f.db.Business[0].status,'suspended',status);
  }
});

test('a second checkout event cannot reactivate an already cancelled subscription',async()=>{
  const f=fixture();await processBillingEvent(f.client,checkout());
  await processBillingEvent(f.client,{id:'evt_cancel',type:'customer.subscription.deleted',data:{object:{id:'sub',status:'canceled'}}});
  await processBillingEvent(f.client,checkout('evt_other_checkout'));
  assert.equal(f.db.Subscription[0].status,'cancelled');
  assert.equal(f.db.Business[0].status,'suspended');
});

test('setup invoice records the one-off fee without ending the free trial',async()=>{
  const f=fixture();await processBillingEvent(f.client,checkout());
  await processBillingEvent(f.client,{id:'evt_setup_invoice',type:'invoice.paid',data:{object:{id:'in_setup',metadata:{business_id:'b',charge_type:'setup'},amount_paid:39900,amount_due:39900,currency:'eur',status:'paid'}}});
  assert.equal(f.db.Subscription[0].status,'trialing');
  assert.equal(f.db.Business[0].status,'trial');
  assert.equal(f.db.BillingPayment[0].kind,'setup');
});

test('provider plan change updates the local approved tariff',async()=>{
  const f=fixture();await processBillingEvent(f.client,checkout());
  await processBillingEvent(f.client,{id:'evt_upgrade',type:'customer.subscription.updated',data:{object:{id:'sub',status:'trialing',items:{data:[{price:{unit_amount:3999,currency:'eur',recurring:{interval:'month',interval_count:1}}}]}}}});
  assert.equal(f.db.Subscription[0].plan_id,'premium');
  assert.equal(f.db.Subscription[0].monthly_amount,3999);
});
