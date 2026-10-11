import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../base44/functions/ManageSalesLead/entry.ts',import.meta.url),'utf8');

test('lead data is private and only served through the protected function',()=>{
  const entity=JSON.parse(fs.readFileSync(new URL('../base44/entities/SalesLead.jsonc',import.meta.url),'utf8'));
  assert.deepEqual(entity.rls,{read:false,create:false,update:false,delete:false});
  assert.match(source,/isSuperAdmin/);
  assert.match(source,/isCommercial/);
});

test('commercial lead access is restricted to the authenticated assignee',()=>{
  assert.match(source,/filter\(x=>normalizeEmail\(x\.assigned_to\)===email\)/);
  assert.match(source,/Esta solicitud no está asignada a tu cuenta/);
  assert.match(source,/Solo Super Admin puede asignar solicitudes/);
});

test('public lead creation controls fields and consent',()=>{
  assert.match(source,/body\.consent !== true/);
  assert.match(source,/status:'new'/);
  assert.match(source,/assigned_to:null/);
  assert.doesNotMatch(source,/\.create\(body\)/);
});

test('commercials can only complete an assigned and fully validated lead',()=>{
  const onboarding=fs.readFileSync(new URL('../base44/functions/OnboardBusiness/entry.ts',import.meta.url),'utf8');
  assert.match(onboarding,/isCommercial/);
  assert.match(onboarding,/El comercial solo puede completar una oportunidad asignada/);
  assert.match(onboarding,/Esta oportunidad no está asignada a tu cuenta/);
  assert.match(onboarding,/Completa todos los datos del alta antes de generar el enlace de pago/);
  assert.match(onboarding,/converted_business_id/);
});

test('payment links are generated only by super admin or the assigned commercial',()=>{
  const checkout=fs.readFileSync(new URL('../base44/functions/CreateBillingCheckout/entry.ts',import.meta.url),'utf8');
  assert.match(checkout,/isSuperAdmin/);
  assert.match(checkout,/isCommercial/);
  assert.match(checkout,/El alta no está asignada a tu cuenta comercial/);
  assert.match(checkout,/requiredBusinessFields/);
  assert.match(checkout,/billing\.checkout_link_generated/);
  assert.match(checkout,/checkout_url/);
});
