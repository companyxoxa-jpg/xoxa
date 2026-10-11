import test from 'node:test';
import assert from 'node:assert/strict';
import { formatServicePrice } from '../src/lib/format.js';

test('booking prices preserve fixed and starting-price wording', () => {
  assert.equal(formatServicePrice(7000, 'from'), 'Desde 70,00 €');
  assert.equal(formatServicePrice(3300, 'fixed'), '33,00 €');
});
