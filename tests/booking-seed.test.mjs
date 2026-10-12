import test from 'node:test';
import assert from 'node:assert/strict';
import { seedInitialBookingSetup, validateInitialBookingSetup } from '../base44/shared/booking-seed.js';
import { elixirInitialBookingSetup, elixirInitialClosures, toBase44BookingSetup } from '../src/lib/elixir-onboarding.js';

test('ELIXIR initial setup uses only its named customer data and starting-price labels', async () => {
  const setup = elixirInitialBookingSetup('ELIXIR BARBER', 'barber');
  assert.equal(setup.services.length, 11);
  assert.deepEqual(setup.services.filter(row => row.price_type === 'from').map(row => row.name), ['Color', 'Permanente']);
  assert.equal(setup.services.find(row => row.name === 'Corte').duration_minutes, 40);
  assert.equal(setup.services.find(row => row.name === 'Corte y Barba Básico').duration_minutes, 60);
  assert.equal(setup.services.find(row => row.name === 'Elixir Total Experience').duration_minutes, 80);
  assert.deepEqual(setup.professionals.map(row => row.name), ['Fabián', 'Alonso']);
  const hostedSetup = toBase44BookingSetup(setup, elixirInitialClosures);
  assert.deepEqual(hostedSetup.services.filter(row => row.price_is_from).map(row => row.name), ['Color', 'Permanente']);
  assert.equal('price_type' in hostedSetup.services[0], false);
  assert.deepEqual(hostedSetup.holidays[0], { date: '2026-01-01', name: '' });
  assert.equal(hostedSetup.professionals[0].schedule[0].day, 1);
  assert.deepEqual(hostedSetup.schedule[0], { day: 0, closed: true, continuous: true });
  assert.equal(hostedSetup.schedule[1].morning_close, '21:00');
  assert.equal(elixirInitialBookingSetup('Otra barbería', 'barber'), null);
  assert.equal(elixirInitialClosures.includes('2026-07-16'), false);
  assert.equal(elixirInitialClosures.includes('2026-10-07'), false);
  assert.equal(elixirInitialClosures.includes('2026-01-06'), true);
  assert.equal(elixirInitialClosures.includes('2027-01-06'), true);
  assert.equal(elixirInitialClosures.includes('2026-10-12'), true);
  assert.equal(elixirInitialClosures.includes('2027-03-26'), true);
});

test('initial booking seed validates first and assigns only same-business service IDs', async () => {
  const setup = elixirInitialBookingSetup('ELIXIR BARBER', 'barber');
  const created = { BookingService: [], BookingProfessional: [] };
  const entities = Object.fromEntries(Object.entries(created).map(([name, rows]) => [name, {
    create: async input => { const row = { ...structuredClone(input), id: `${name}-${rows.length}` }; rows.push(row); return structuredClone(row); },
  }]));
  const result = await seedInitialBookingSetup(entities, 'business-elixir', setup);
  assert.equal(result.services.length, 11);
  assert.equal(result.professionals.length, 2);
  assert(result.professionals.every(row => row.business_id === 'business-elixir' && row.service_ids.length === 11));
  assert(result.services.every(row => row.business_id === 'business-elixir'));
  assert.throws(() => validateInitialBookingSetup({ ...setup, services: [{ ...setup.services[0], price: -1 }] }));
  assert.throws(() => validateInitialBookingSetup({ ...setup, professionals: [{ ...setup.professionals[0], service_indexes: [99] }] }));
});
