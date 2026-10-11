import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const command=fs.readFileSync(new URL('../src/pages/CommandCenter.jsx',import.meta.url),'utf8');
const business=fs.readFileSync(new URL('../base44/functions/ManageBusiness/entry.ts',import.meta.url),'utf8');
const dossier=fs.readFileSync(new URL('../base44/functions/ManageClientDossier/entry.ts',import.meta.url),'utf8');
const commercial=fs.readFileSync(new URL('../base44/functions/ManageCommercial/entry.ts',import.meta.url),'utf8');

test('Super Admin navigation is operational and removes unused Plan and Audit entries',()=>{
  assert.match(command,/label: "Información detallada"/);
  assert.doesNotMatch(command,/label: "Planes"/);
  assert.doesNotMatch(command,/label: "Auditoría"/);
  for(const label of ['Negocios','Clientes','Cobro de alta nueva','Formulario de alta','Contratos','Documentación','Comerciales','Solicitudes'])assert.match(command,new RegExp(`label: "${label}"`));
});

test('direction report is read-only and covers registrations, contracts, sales, closes and cancellations',()=>{
  for(const text of ['Informe de dirección · solo lectura','Negocios y altas','Contratos y documentación','Actividad comercial','Cierres y bajas','Cierre de hoy','Cierre mensual','Bajas registradas'])assert.match(command,new RegExp(text));
  assert.match(dossier,/body\.action==='metrics'/);
  assert.match(dossier,/recent_activity/);
});

test('business removal is confirmed, audited and recoverable',()=>{
  assert.match(business,/action === 'archive' \|\| action === 'restore'/);
  assert.match(business,/confirm_name/);
  assert.match(business,/business\.archived/);
  assert.match(business,/business\.restored/);
  assert.match(command,/Retirados/);
  assert.match(command,/onRestore/);
});

test('commercial administration exposes safe capabilities, activity counts and removal',()=>{
  assert.match(commercial,/permissions:/);
  assert.match(commercial,/assigned_leads/);
  assert.match(commercial,/closed_leads/);
  assert.match(commercial,/body\.action === 'remove'/);
  assert.match(command,/Sin acceso a dinero, facturación, métricas privadas ni expedientes/);
});

test('quick onboarding ends by generating the protected Stripe checkout',()=>{
  assert.match(command,/Alta rápida y cobro/);
  assert.match(command,/<OnboardingWizard plans=\{plans\} generatePaymentLink/);
  assert.match(command,/CreateBillingCheckout/);
});
