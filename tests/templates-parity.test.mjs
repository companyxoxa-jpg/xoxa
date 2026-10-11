// Template Engine V2 — parity guard.
// base44/shared/templates.js (backend) and src/lib/templates.js (frontend) are
// hand-maintained mirrors. They MUST stay identical so the admin editor
// (frontend) and the server-side appearance validation (backend) never drift.
// This test fails loudly naming the diverging block if the mirrors desync.
//
// Run:  node --test tests/templates-parity.test.mjs
//
// We deliberately do NOT introduce a build-step that copies one into the other;
// both mirrors stay independent (platform import restriction) and this test is
// the safety net.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as backend from '../base44/shared/templates.js';
import * as frontend from '../src/lib/templates.js';

const DATA_EXPORTS = ['STOREFRONT_SKINS', 'DASHBOARD_SKINS', 'TEMPLATES', 'LEGACY_TEMPLATES', 'OPTION_LABELS'];

for (const name of DATA_EXPORTS) {
  test(`mirror parity: ${name} identical between backend and frontend`, () => {
    assert.ok(backend[name] != null, `backend missing export ${name}`);
    assert.ok(frontend[name] != null, `frontend missing export ${name}`);
    try {
      assert.deepStrictEqual(backend[name], frontend[name]);
    } catch (e) {
      assert.fail(
        `Divergencia en "${name}":\n${e.message}\n` +
        `Edita base44/shared/templates.js y src/lib/templates.js JUNTOS para volver a sincronizarlos.`
      );
    }
  });
}

// Function exports must exist on both sides (a missing function is a divergence
// in the public contract even if the data registries match).
const FUNCTION_EXPORTS = [
  'getStorefrontSkin', 'getDashboardSkin', 'templateFor', 'modeFor', 'hasBooking',
  'validImage', 'validatePresentation', 'defaultAppearanceConfig',
  'validateAppearanceConfig', 'resolveBranding',
];
test('mirror parity: all function exports present on both sides', () => {
  for (const fn of FUNCTION_EXPORTS) {
    assert.equal(typeof backend[fn], 'function', `backend missing function ${fn}`);
    assert.equal(typeof frontend[fn], 'function', `frontend missing function ${fn}`);
  }
});

// Behavioral parity: run the pure functions over representative businesses and
// compare outputs. Catches logic drift even when the data registries are equal.
const SAMPLES = [
  { id: 'fresh-classic', business_mode: 'COMMERCE' },
  { id: 'fresh-market', business_mode: 'COMMERCE' },
  { id: 'butcher-craft', business_mode: 'COMMERCE' },
  { id: 'barber-studio', business_mode: 'BOOKING' },
  { id: 'beauty-spa', business_mode: 'BOOKING' },
  { id: 'retail-store', business_mode: 'COMMERCE' },
  { id: 'wellness-hybrid', business_mode: 'HYBRID' },
  { id: 'unknown-template', business_mode: 'COMMERCE' }, // falls back to TEMPLATES[0]
];

function makeBusiness(tpl) {
  return {
    template_id: tpl.id,
    business_name: 'Sample',
    slug: 'sample',
    business_type: tpl.sector,
    business_mode: tpl.business_mode || tpl.mode,
    primary_color: tpl.primary_color || tpl.color || '#16A34A',
    secondary_color: '#0284C7',
    appearance_config: tpl.appearance_config,
  };
}

const APPEARANCE_CASES = [
  null,
  { storefront: { heroVariant: 'banner' } },
  { dashboard: { navigationVariant: 'ribbon' } },
  { storefront: { tokens: { accent: '#FF0000' } }, dashboard: { tokens: { accent: '#00FF00' } } },
  { storefront: { typography: { heading: 'editorial' } } },
];

test('behavioral parity: resolveBranding identical across templates + overrides', () => {
  const templates = backend.TEMPLATES;
  for (const t of templates) {
    for (const ac of APPEARANCE_CASES) {
      const b = makeBusiness({ ...t, primary_color: t.color, appearance_config: ac });
      const rb = backend.resolveBranding(b);
      const rf = frontend.resolveBranding(b);
      try {
        assert.deepStrictEqual(rb, rf);
      } catch (e) {
        assert.fail(
          `resolveBranding diverge para template "${t.id}" con appearance_config ${JSON.stringify(ac)}:\n${e.message}`
        );
      }
    }
  }
});

test('behavioral parity: defaultAppearanceConfig identical across templates', () => {
  for (const t of backend.TEMPLATES) {
    const db = backend.defaultAppearanceConfig(t);
    const df = frontend.defaultAppearanceConfig(t);
    try {
      assert.deepStrictEqual(db, df);
    } catch (e) {
      assert.fail(`defaultAppearanceConfig diverge para template "${t.id}":\n${e.message}`);
    }
  }
});

test('behavioral parity: validateAppearanceConfig identical (accepted + rejected)', () => {
  const t = backend.TEMPLATES.find(x => x.id === 'retail-store');
  const cases = [
    null,
    { storefront: { heroVariant: 'campaign' } },
    { storefront: { heroVariant: 'collection' } },
    { dashboard: { navigationVariant: 'launcher' } },
    { storefront: { logoPlacement: 'top' } },
  ];
  for (const ac of cases) {
    const b = makeBusiness({ ...t, primary_color: t.color, appearance_config: ac });
    const bb = backend.validateAppearanceConfig(b, ac);
    const ff = frontend.validateAppearanceConfig(b, ac);
    try { assert.deepStrictEqual(bb, ff); }
    catch (e) { assert.fail(`validateAppearanceConfig diverge (accept) para ${JSON.stringify(ac)}:\n${e.message}`); }
  }
  // Rejection parity — both must throw for unsupported values.
  const rejects = [
    { storefront: { heroVariant: 'immersive' } },      // not supported by retail
    { storefront: { typography: { heading: 'editorial' } } },
    { storefront: { logoPlacement: 'center' } },
    { dashboard: { navigationVariant: 'sidebar' } },
  ];
  for (const ac of rejects) {
    const b = makeBusiness({ ...t, primary_color: t.color, appearance_config: ac });
    let be = null, fe = null;
    try { backend.validateAppearanceConfig(b, ac); } catch (e) { be = e.message; }
    try { frontend.validateAppearanceConfig(b, ac); } catch (e) { fe = e.message; }
    assert.ok(be && fe, `validateAppearanceConfig: un lado aceptó lo que el otro rechazó para ${JSON.stringify(ac)}`);
    assert.equal(be, fe, `validateAppearanceConfig: mensajes de rechazo divergentes para ${JSON.stringify(ac)} (backend="${be}" vs frontend="${fe}")`);
  }
});

test('behavioral parity: validatePresentation identical (accept + reject)', () => {
  for (const t of backend.TEMPLATES) {
    const ok = makeBusiness({ ...t, primary_color: t.color, appearance_config: null });
    assert.doesNotThrow(() => backend.validatePresentation(ok), `backend rechazó plantilla válida ${t.id}`);
    assert.doesNotThrow(() => frontend.validatePresentation(ok), `frontend rechazó plantilla válida ${t.id}`);
    // mode mismatch (non-HYBRID) must reject on both
    if (t.mode !== 'HYBRID') {
      const mismatch = makeBusiness({ ...t, business_mode: t.mode === 'COMMERCE' ? 'BOOKING' : 'COMMERCE' });
      let be = false, fe = false;
      try { backend.validatePresentation(mismatch); } catch { be = true; }
      try { frontend.validatePresentation(mismatch); } catch { fe = true; }
      assert.ok(be && fe, `validatePresentation diverge en mode-mismatch para ${t.id}`);
    }
  }
});

test('behavioral parity: getStorefrontSkin / getDashboardSkin fallback identical', () => {
  for (const id of ['classic', 'freshmarket', 'butcher', 'barber', 'spa', 'retail', 'nonexistent']) {
    assert.deepStrictEqual(backend.getStorefrontSkin(id), frontend.getStorefrontSkin(id), `getStorefrontSkin diverge para "${id}"`);
  }
  for (const id of ['minimal', 'freshops', 'butcherops', 'barberops', 'spaops', 'retailops', 'nonexistent']) {
    assert.deepStrictEqual(backend.getDashboardSkin(id), frontend.getDashboardSkin(id), `getDashboardSkin diverge para "${id}"`);
  }
});