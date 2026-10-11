import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, defaultAppearanceConfig, resolveBranding, validateAppearanceConfig, validatePresentation } from '../base44/shared/templates.js';

test('all six demo models accept independent logo, colors, cover and slogan', () => {
  assert.equal(TEMPLATES.length, 6);
  for (const [index, template] of TEMPLATES.entries()) {
    const business = {
      business_name: `Demo ${template.demo}`,
      business_mode: template.mode,
      template_id: template.id,
      logo: `https://assets.rinno.test/logo-${index}.webp`,
      cover_image: `https://assets.rinno.test/cover-${index}.webp`,
      primary_color: `#${String(index + 1).repeat(6)}`,
      secondary_color: `#${String(index + 2).repeat(6)}`,
      headline: `Titular propio ${template.demo}`,
      tagline: `Eslogan propio ${template.demo}`,
    };
    const appearance = defaultAppearanceConfig(template);
    business.appearance_config = validateAppearanceConfig(business, appearance);
    assert.doesNotThrow(() => validatePresentation(business));
    const resolved = resolveBranding(business);
    assert.equal(resolved.shared.logo, business.logo);
    assert.equal(resolved.shared.primaryColor, business.primary_color);
    assert.equal(resolved.shared.secondaryColor, business.secondary_color);
    assert.equal(resolved.storefront.skin, template.v2.storefront.skin);
    assert.equal(resolved.dashboard.skin, template.v2.dashboard.skin);
  }
});
