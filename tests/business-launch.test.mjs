import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manage=fs.readFileSync(new URL('../base44/functions/ManageBusiness/entry.ts',import.meta.url),'utf8');
const onboard=fs.readFileSync(new URL('../base44/functions/OnboardBusiness/entry.ts',import.meta.url),'utf8');

test('new real businesses stay private until the launch gate is completed',()=>{
  assert.match(onboard,/status: "onboarding"/);
  assert.match(manage,/\['launch_summary','submit_review','request_changes','approve_review','publish'\]\.includes\(action\)/);
  assert.match(manage,/if\(!ready\).*Completa todos los requisitos antes de publicar/);
  assert.match(manage,/status:courtesy\?'active':'trial',published_at:publishedAt/);
  assert.match(manage,/const courtesy = subscriptions.length === 1 && subscriptions\[0\]\.billing_exempt === true/);
});

test('owner can read and submit only the launch review of their own business',()=>{
  assert.match(manage,/ownerAction = \['launch_summary','submit_review'\]/);
  assert.match(manage,/getUserBusinessId\(user\) === business_id/);
  assert.match(manage,/reviewStatus!=='approved'/);
});

test('review workflow requires owner submission, admin approval and written corrections',()=>{
  assert.match(manage,/action==='submit_review'/);
  assert.match(manage,/action==='request_changes'/);
  assert.match(manage,/action==='approve_review'/);
  assert.match(manage,/notes\.length<5\|\|notes\.length>2000/);
});

test('launch readiness adapts content checks to each business mode',()=>{
  assert.match(manage,/business\.business_mode==='BOOKING'\?services\.length>0/);
  assert.match(manage,/business\.business_mode==='ASSOCIATION'\?plans\.length>0/);
  assert.match(manage,/products\.length>0/);
  for(const key of ['identity','contact','settings','content','journey','owner']) assert.ok(manage.includes(`key:'${key}'`));
  assert.match(manage,/professionals\.some/);
  assert.match(manage,/slots\.length>0/);
  assert.match(manage,/associationSetup\.length>0/);
});

test('commercial follow-up exposes progress without financial data',()=>{
  const lead=fs.readFileSync(new URL('../base44/functions/ManageSalesLead/entry.ts',import.meta.url),'utf8');
  assert.match(lead,/delivery_status/);
  assert.doesNotMatch(lead,/monthly_price|setup_price|Subscription|Order/);
});

test('post-launch milestones follow the primary journey without exposing amounts',()=>{
  assert.match(manage,/const milestones=/);
  assert.match(manage,/Primera reserva/);
  assert.match(manage,/Primer socio/);
  assert.match(manage,/Primer pedido/);
  const milestone=manage.slice(manage.indexOf('const milestones='),manage.indexOf("if(action==='launch_summary')"));
  assert.doesNotMatch(milestone,/total|price|amount/);
});
