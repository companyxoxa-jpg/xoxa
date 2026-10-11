import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAssociationSetup,initialAssociationChecklist} from '../base44/shared/association-onboarding.js';

test('association onboarding normalizes age, member limit and annual fee',()=>{
 assert.deepEqual(normalizeAssociationSetup({minimum_age:'21',default_monthly_limit_grams:'45',membership_fee:'36.50',membership_plan_name:'Socio anual'}),{minimum_age:21,default_monthly_limit_grams:45,membership_fee_cents:3650,membership_plan_name:'Socio anual'});
});
test('association onboarding rejects unsafe configuration',()=>{
 assert.throws(()=>normalizeAssociationSetup({minimum_age:17}),/edad mínima/);
 assert.throws(()=>normalizeAssociationSetup({default_monthly_limit_grams:501}),/límite mensual/);
 assert.throws(()=>normalizeAssociationSetup({membership_fee:-1}),/cuota/);
});
test('new association receives a complete launch checklist',()=>{
 const items=initialAssociationChecklist();assert.equal(items.length,8);assert.equal(new Set(items.map(x=>x.key)).size,8);assert.equal(items.find(x=>x.key==='legal').status,'external_review');
});
