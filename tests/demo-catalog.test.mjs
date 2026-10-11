import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES } from '../base44/shared/templates.js';
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from '../base44/shared/demo-seeds.js';
import { getBusinessDisplayName, isDemoBusiness } from '../src/lib/demoBusiness.js';

test('public catalog contains exactly six distinct demo models', () => {
  assert.equal(TEMPLATES.length, 6);
  for (const field of ['id', 'demo', 'name', 'layout', 'image']) {
    assert.equal(new Set(TEMPLATES.map(template => template[field])).size, 6, `${field} must be unique`);
  }
  assert.equal(new Set(TEMPLATES.map(template => template.v2.storefront.skin)).size, 6, 'storefront skins must be unique');
  assert.equal(new Set(TEMPLATES.map(template => template.v2.dashboard.skin)).size, 6, 'dashboard skins must be unique');
});

test('demo catalog and seeded commerce images never repeat', () => {
  const images = TEMPLATES.map(template => template.image);
  for (const products of Object.values(DEMO_PRODUCTS)) {
    for (const product of products) if (product[3]) images.push(product[3]);
  }
  for (const categories of Object.values(DEMO_CATEGORIES)) {
    for (const category of categories) if (category.image) images.push(category.image);
  }
  const ids = images.map(image => image.match(/photo-[\w-]+/)?.[0] || image);
  assert.equal(new Set(ids).size, ids.length, 'every demo image must be unique');
});

test('demo records are separated from real businesses and internal names are clear', () => {
  assert.equal(isDemoBusiness({ slug: 'rinno-demo-13' }), true);
  assert.equal(isDemoBusiness({ slug: 'customer-shop' }), false);
  assert.equal(getBusinessDisplayName({ slug: 'rinno-fresh', business_name: 'TIENDA DE PRUEBA' }), 'Tienda interna de pruebas');
});
