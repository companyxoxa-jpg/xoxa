export class BookingError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const APPOINTMENT_STATES = {
  pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [], no_show: [], cancelled: [],
};
export const STATE_LABELS = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', no_show: 'No presentado', cancelled: 'Cancelada' };
export function assert(condition, message, status = 400) { if (!condition) throw new BookingError(message, status); }
export function minutes(value) {
  assert(typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value), 'Hora no válida');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}
export function timeLabel(value) { return `${Math.floor(value / 60)}`.padStart(2, '0') + ':' + `${value % 60}`.padStart(2, '0'); }
export function validDate(date) {
  assert(typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date), 'Fecha no válida');
  const parsed = new Date(`${date}T12:00:00Z`);
  assert(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date, 'Fecha no válida');
  return date;
}
export function zonedParts(instant, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const p = Object.fromEntries(parts.map(v => [v.type, v.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
// Resolve a wall clock time in the business timezone. DST gaps and ambiguous
// hours are deliberately not bookable; never silently shift an appointment.
export function wallToUTC(date, time, timezone) {
  validDate(date); minutes(time);
  const target = Date.parse(`${date}T${time}:00Z`);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(guess, timezone);
    guess += target - Date.parse(`${p.date}T${p.time}:00Z`);
  }
  const matches = [guess - 3600000, guess, guess + 3600000].filter(g => {
    const p = zonedParts(g, timezone); return p.date === date && p.time === time;
  });
  return matches.length === 1 ? matches[0] : null;
}
export function validateSchedule(schedule, daysOff = []) {
  assert(Array.isArray(schedule) && schedule.length <= 28, 'Horario no válido');
  const seen = {};
  for (const row of schedule) {
    assert(Number.isInteger(row.day) && row.day >= 0 && row.day <= 6, 'Día de semana no válido');
    const start = minutes(row.start), end = minutes(row.end);
    assert(start < end, 'La hora final debe ser posterior al inicio');
    assert(!(seen[row.day] || []).some(r => start < r.end && end > r.start), 'Hay turnos superpuestos');
    (seen[row.day] ||= []).push({ start, end });
  }
  assert(Array.isArray(daysOff) && daysOff.length <= 366, 'Días libres no válidos');
  daysOff.forEach(validDate);
}
export function availableSlots({ professional, service, date, appointments, timezone = 'Europe/Madrid', closedDates = [], now = Date.now() }) {
  validDate(date);
  assert(Number.isInteger(service.duration_minutes) && service.duration_minutes > 0, 'Duración no válida');
  if (closedDates.includes(date) || !professional.active || !service.active || !professional.service_ids?.includes(service.id) || professional.days_off?.includes(date)) return [];
  const today = zonedParts(now, timezone).date;
  const horizon = new Date(`${today}T12:00:00Z`); horizon.setUTCDate(horizon.getUTCDate() + 90);
  if (date < today || date > horizon.toISOString().slice(0, 10)) return [];
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const result = new Map();
  for (const shift of professional.schedule || []) {
    if (shift.day !== day) continue;
    for (let start = minutes(shift.start); start + service.duration_minutes <= minutes(shift.end); start += 15) {
      const end = start + service.duration_minutes;
      const utc = wallToUTC(date, timeLabel(start), timezone);
      const endUTC = wallToUTC(date, timeLabel(end), timezone);
      if (utc === null || endUTC === null || endUTC - utc !== service.duration_minutes * 60000 || utc < now + 30 * 60000) continue;
      if (appointments.some(a => a.professional_id === professional.id && a.date === date && ['pending', 'confirmed'].includes(a.status) && start < minutes(a.end_time) && end > minutes(a.start_time))) continue;
      result.set(start, { time: timeLabel(start), end_time: timeLabel(end), starts_at: new Date(utc).toISOString(), ends_at: new Date(endUTC).toISOString() });
    }
  }
  return [...result.values()].sort((a, b) => a.time.localeCompare(b.time));
}
