import { validateSchedule } from './booking.js';
import { validImage } from './templates.js';

export function validateInitialBookingSetup(value) {
  if (value == null) return null;
  if (!value || !Array.isArray(value.services) || !value.services.length || value.services.length > 50 || !Array.isArray(value.professionals) || !value.professionals.length || value.professionals.length > 20) throw new Error('Configuración inicial de reservas no válida');
  const services = value.services.map((row) => {
    const name = String(row?.name || '').trim();
    if (!name || name.length > 100 || !Number.isSafeInteger(row.price) || row.price < 0 || row.price > 1000000 || !Number.isInteger(row.duration_minutes) || row.duration_minutes < 5 || row.duration_minutes > 480 || !['fixed', 'from'].includes(row.price_type || 'fixed') || (row.image && !validImage(row.image))) throw new Error('Servicio inicial no válido');
    return { name, description: String(row.description || '').slice(0, 1500), price: row.price, price_type: row.price_type || 'fixed', duration_minutes: row.duration_minutes, image: row.image || '', active: true };
  });
  const professionals = value.professionals.map((row) => {
    const name = String(row?.name || '').trim();
    const service_indexes = [...new Set(row?.service_indexes || services.map((_, i) => i))];
    if (!name || name.length > 100 || !service_indexes.length || service_indexes.some((i) => !Number.isInteger(i) || i < 0 || i >= services.length) || !Array.isArray(row.schedule)) throw new Error('Profesional inicial no válido');
    validateSchedule(row.schedule, []);
    if (row.photo && !validImage(row.photo)) throw new Error('Foto inicial no válida');
    return { name, specialty: String(row.specialty || '').slice(0, 240), photo: row.photo || '', service_indexes, schedule: row.schedule.map(({ day, start, end }) => ({ day, start, end })), days_off: [], active: true };
  });
  return { services, professionals };
}

export async function seedInitialBookingSetup(entities, businessId, setup) {
  if (!setup) return { services: [], professionals: [] };
  const checked = validateInitialBookingSetup(setup);
  const services = [];
  for (const row of checked.services) services.push(await entities.BookingService.create({ ...row, business_id: businessId }));
  const professionals = [];
  for (const row of checked.professionals) {
    const service_ids = row.service_indexes.map((index) => services[index].id);
    const { service_indexes, ...safe } = row;
    professionals.push(await entities.BookingProfessional.create({ ...safe, business_id: businessId, service_ids }));
  }
  return { services, professionals };
}
