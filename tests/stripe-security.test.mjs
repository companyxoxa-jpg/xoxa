import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyStripeEvent, createStripeCheckout, createStripeSubscriptionFromCheckout } from '../base44/shared/stripe-billing.ts';
import { processBillingEvent } from '../base44/shared/billing.js';

// Ephemeral synthetic secret; no Stripe account or network access is used.
const secret = crypto.randomUUID();
const signed = (raw, t = String(Math.floor(Date.now() / 1000))) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`;
const raw = JSON.stringify({ id: 'evt_local', type: 'invoice.paid', data: { object: { id: 'in_local' } } });
test('Stripe signatures reject tampering, stale timestamps, missing signature and malformed timestamps', async () => {
  const old = globalThis.Deno;
  globalThis.Deno = { env: { get: name => name === 'STRIPE_WEBHOOK_SECRET' ? secret : '' } };
  try {
    assert.equal((await verifyStripeEvent(raw, signed(raw))).id, 'evt_local');
    await assert.rejects(verifyStripeEvent(raw + ' ', signed(raw)));
    await assert.rejects(verifyStripeEvent(raw, signed(raw, String(Math.floor(Date.now() / 1000) - 601))));
    await assert.rejects(verifyStripeEvent(raw, null));
    for (const t of ['NaN', 'Infinity', 'abc', '1.5']) await assert.rejects(verifyStripeEvent(raw, signed(raw, t)));
    await assert.rejects(verifyStripeEvent('null', signed('null')));
  } finally { globalThis.Deno = old; }
});
test('Stripe verification fails closed without a configured signing secret', async () => {
  const old = globalThis.Deno;
  globalThis.Deno = { env: { get: () => '' } };
  try { await assert.rejects(verifyStripeEvent(raw, signed(raw))); }
  finally { globalThis.Deno = old; }
});
test('provider error bodies never echo secrets back to a caller', async () => {
  const previousDeno = globalThis.Deno, previousFetch = globalThis.fetch;
  const syntheticKey = crypto.randomUUID();
  globalThis.Deno = { env: { get: name => name === 'STRIPE_SECRET_KEY' ? syntheticKey : '' } };
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: `Invalid key: ${syntheticKey}` } }), { status: 401 });
  try {
    await assert.rejects(createStripeCheckout({}), error => !error.message.includes(syntheticKey) && error.message === 'El proveedor de pagos rechazó la operación');
  } finally { globalThis.Deno = previousDeno; globalThis.fetch = previousFetch; }
});
test('unpaid checkout must not activate a business or write billing records', async () => {
  for (const payment_status of ['unpaid', 'no_payment_required', undefined]) {
    let writes = 0;
    const entity = { filter: async () => [], create: async () => { writes++; return { id: 'new' }; }, update: async () => { writes++; } };
    const client = { asServiceRole: { entities: new Proxy({}, { get: () => entity }) } };
    const result = await processBillingEvent(client, { id: 'evt_unpaid', type: 'checkout.session.completed', data: { object: { id: 'cs_unpaid', mode: 'payment', payment_status, metadata: { business_id: 'B' } } } });
    assert.equal(writes, 0);
    assert.equal(result.ignored, true);
  }
});

test('QA test-only guard rejects non-test credentials before any network call',async()=>{
  const oldDeno=globalThis.Deno, oldFetch=globalThis.fetch;let calls=0;
  globalThis.Deno={env:{get:name=>name==='STRIPE_TEST_ONLY'?'true':'not-a-test-key'}};
  globalThis.fetch=async()=>{calls++;throw new Error('unexpected network');};
  try {await assert.rejects(createStripeCheckout({}),/QA requiere/);assert.equal(calls,0);}
  finally {globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});

test('distinct Stripe events for the same checkout reuse the subscription idempotency key',async()=>{
  const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;const keys=[];
  globalThis.Deno={env:{get:name=>name==='STRIPE_SECRET_KEY'?'local-synthetic-credential':''}};
  globalThis.fetch=async(_url,options)=>{if(options.method==='POST'){keys.push(options.headers['Idempotency-Key']);return Response.json({id:'sub_one'});}return _url.includes('/subscriptions?')?Response.json({data:[],has_more:false}):Response.json({payment_method:'pm_fake',status:'succeeded',amount_received:39900,currency:'eur',customer:'cus_fake'});};
  const session={id:'cs_same',mode:'payment',payment_status:'paid',amount_total:39900,currency:'eur',payment_intent:'pi_fake',customer:'cus_fake',metadata:{business_id:'b_fake',monthly_price_id:'price_fake',trial_end_unix:'1900000000'}};
  try {await createStripeSubscriptionFromCheckout(session,'evt_first');await createStripeSubscriptionFromCheckout(session,'evt_second');assert.deepEqual(keys,['rinno-subscription-cs_same','rinno-subscription-cs_same']);}
  finally {globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});
