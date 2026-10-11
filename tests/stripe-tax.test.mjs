import test from 'node:test';
import assert from 'node:assert/strict';
import {createStripeCheckout,createStripeSubscriptionFromCheckout} from '../base44/shared/stripe-billing.ts';

test('inclusive configured tax is applied to checkout and subsequent subscription without changing gross prices',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch,posts=[];
 globalThis.Deno={env:{get:n=>({STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_TEST_ONLY:'true',STRIPE_INCLUSIVE_TAX_RATE_ID:'txr_fixture'})[n]||''}};
 globalThis.fetch=async(url,options)=>{
  if(options.method==='POST'){posts.push({url,params:new URLSearchParams(options.body)});return Response.json({id:'fixture'});}
  if(url.includes('/tax_rates/'))return Response.json({active:true,inclusive:true,percentage:21,livemode:false});
  if(url.includes('/subscriptions?'))return Response.json({data:[],has_more:false});
  return Response.json({status:'succeeded',amount_received:39900,currency:'eur',customer:'cus_fixture',payment_method:'pm_fixture'});
 };
 try{
  const definition={mode:'payment',line_items:[{price:'price_setup',quantity:1}]};
  await createStripeCheckout(definition);
  await createStripeSubscriptionFromCheckout({id:'cs_fixture',mode:'payment',payment_status:'paid',amount_total:39900,currency:'eur',customer:'cus_fixture',payment_intent:'pi_fixture',metadata:{business_id:'b_fixture',monthly_price_id:'price_standard',trial_end_unix:'1900000000'}});
  assert.equal(posts[0].params.get('line_items[0][tax_rates][0]'),'txr_fixture');
  assert.equal(posts[0].params.get('line_items[0][price]'),'price_setup');
  assert.equal(posts[1].params.get('default_tax_rates[0]'),'txr_fixture');
  assert.equal(posts[1].params.get('items[0][price]'),'price_standard');
  assert.equal(definition.line_items[0].tax_rates,undefined);
 }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});

test('inactive exclusive malformed and live tax rates fail before creating a checkout',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;let posts=0;
 globalThis.Deno={env:{get:n=>({STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_TEST_ONLY:'true',STRIPE_INCLUSIVE_TAX_RATE_ID:'txr_fixture'})[n]||''}};
 try{
  for(const patch of [{active:false},{inclusive:false},{percentage:'21'},{percentage:-1},{livemode:true}]){
   globalThis.fetch=async(_url,options)=>{if(options.method==='POST')posts++;return Response.json({active:true,inclusive:true,percentage:21,livemode:false,...patch});};
   await assert.rejects(createStripeCheckout({line_items:[]}),/Configuración fiscal/);
  }
  assert.equal(posts,0);
 }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});
