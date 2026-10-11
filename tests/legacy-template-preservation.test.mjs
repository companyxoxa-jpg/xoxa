import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, LEGACY_TEMPLATES, templateFor, resolveBranding, hasBooking, validatePresentation } from '../base44/shared/templates.js';

test('existing legacy businesses retain their template and storefront without data mutation', () => {
  const skins = ['classic', 'editorial', 'split', 'split', 'editorial', 'calm', 'calm'];
  for (const [index, t] of LEGACY_TEMPLATES.entries()) {
    const business = { id: 'existing-tenant', slug: 'existing-store', template_id: t.id, business_mode: t.mode, primary_color: '#123456', headline: 'Custom heading' };
    const before = structuredClone(business);
    assert.equal(templateFor(business).id, t.id);
    assert.equal(resolveBranding(business).storefront.skin, skins[index]);
    assert.doesNotThrow(() => validatePresentation(business));
    assert.deepEqual(business, before);
  }
});

test('DEMO 01 retains classic presentation and hybrid retains booking capability', () => {
  assert.equal(resolveBranding({ template_id: 'fresh-classic', business_mode: 'COMMERCE' }).storefront.skin, 'classic');
  const hybrid = { template_id: 'wellness-hybrid', business_mode: 'HYBRID' };
  assert.equal(templateFor(hybrid).mode, 'HYBRID');
  assert.equal(hasBooking(hybrid), true);
  assert.equal(resolveBranding(hybrid).storefront.skin, 'calm');
});

test('current six templates remain the new-business catalog', () => {
  assert.deepEqual(TEMPLATES.map(t => t.demo), ['08', '09', '10', '11', '12', '13']);
  assert.equal(templateFor({ template_id: 'unknown' }).id, TEMPLATES[0].id);
});
