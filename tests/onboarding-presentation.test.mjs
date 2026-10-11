import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../base44/functions/OnboardBusiness/entry.ts', import.meta.url), 'utf8');

test('new businesses receive the matching customer and establishment template', () => {
  for (const expected of [
    "fruit_store: { business_mode: 'COMMERCE', template_id: 'fresh-market' }",
    "butcher: { business_mode: 'COMMERCE', template_id: 'butcher-craft' }",
    "barber: { business_mode: 'BOOKING', template_id: 'barber-studio' }",
    "beauty: { business_mode: 'BOOKING', template_id: 'beauty-spa' }",
    "association: { business_mode: 'ASSOCIATION', template_id: 'association-community' }",
    "{ business_mode: 'COMMERCE', template_id: 'retail-store' }",
  ]) assert.ok(source.includes(expected), `missing onboarding presentation: ${expected}`);
  assert.ok(source.includes('AssociationSetup.create'), 'association onboarding must create its launch checklist');
  assert.ok(source.includes('MembershipPlan.create'), 'association onboarding must create an initial member plan');
  assert.match(source, /business_mode: presentation\.business_mode/);
  assert.match(source, /template_id: presentation\.template_id/);
});

test('lead conversion accepts a compatible template and closes the source opportunity', () => {
  assert.match(source,/TEMPLATES\.find\(t => t\.id === identity\?\.template_id\)/);
  assert.match(source,/requestedTemplate\.mode === defaultPresentation\.business_mode/);
  assert.match(source,/Esta solicitud ya fue convertida en negocio/);
  assert.match(source,/converted_business_id:bid/);
  assert.match(source,/sales_lead\.converted/);
});
