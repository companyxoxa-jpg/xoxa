const openingSchedule = Array.from({ length: 6 }, (_, index) => ({ day: index + 1, start: '10:00', end: '21:00' }));
const businessSchedule = Array.from({ length: 7 }, (_, day) => day === 0
  ? { day, closed: true, continuous: true }
  : { day, closed: false, continuous: true, morning_open: '10:00', morning_close: '21:00' });

// Only the named customer receives this customer-provided starter catalog.
// Durations explicitly provided by the owner are applied below; remaining
// treatment times are initial estimates to confirm before publishing.
export function elixirInitialBookingSetup(businessName, businessType) {
  if (businessType !== 'barber' || String(businessName).trim().toLocaleUpperCase('es-ES') !== 'ELIXIR BARBER') return null;
  const rows = [
    ['Corte & Barba Signature', 3300, 'fixed', 60], ['Elixir Image Design', 2500, 'fixed', 40],
    ['Corte', 1800, 'fixed', 40], ['Barba', 1500, 'fixed', 30], ['Corte y Barba Básico', 2800, 'fixed', 60],
    ['Limpieza Facial', 5500, 'fixed', 45], ['Elixir Total Experience', 9500, 'fixed', 80],
    ['Color', 7000, 'from', 90], ['Permanente', 4500, 'from', 90], ['Corte de Niño', 1500, 'fixed', 40],
    ['Afeitado Tradicional', 2000, 'fixed', 30],
  ];
  return {
    services: rows.map(([name, price, price_type, duration_minutes]) => ({ name, price, price_type, duration_minutes, description: '' })),
    professionals: ['Fabián', 'Alonso'].map(name => ({ name, specialty: 'Barbero', service_indexes: rows.map((_, index) => index), schedule: openingSchedule })),
    schedule: businessSchedule,
  };
}

// Nationwide statutory holidays for 2026–2027. Local and Andalusian-only
// holidays are intentionally excluded; Sunday is already closed separately.
export const elixirInitialClosures = [
  '2026-01-01', '2026-01-06', '2026-04-03', '2026-05-01', '2026-08-15', '2026-10-12', '2026-11-01', '2026-12-06', '2026-12-08', '2026-12-25',
  '2027-01-01', '2027-01-06', '2027-03-26', '2027-05-01', '2027-08-15', '2027-10-12', '2027-11-01', '2027-12-06', '2027-12-08', '2027-12-25',
];

// The connected Base44 app stores starting prices as price_is_from and
// nationwide closures as BusinessHoliday rows. Keep the local API shape
// usable while emitting the hosted app's expected format at the boundary.
export function toBase44BookingSetup(setup, holidays = []) {
  if (!setup) return null;
  return {
    services: setup.services.map(({ price_type, ...service }) => ({ ...service, price_is_from: price_type === 'from' })),
    professionals: setup.professionals,
    holidays: holidays.map(date => ({ date, name: '' })),
    ...(setup.schedule ? { schedule: setup.schedule } : {}),
  };
}
