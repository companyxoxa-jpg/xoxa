/**
 * Format an amount in minor currency units (cents) as a display string.
 * @param {number} cents - amount in cents (e.g. 189 => "1,89 €")
 * @param {string} currency - ISO currency code, default EUR
 */
export function formatCurrency(cents, currency = "EUR") {
  if (cents == null || isNaN(cents)) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Format a unit price badge, e.g. "1,89 €/kg".
 */
export function formatUnitPrice(cents, unitLabel, currency = "EUR") {
  return `${formatCurrency(cents, currency)}/${unitLabel || "ud"}`;
}

/**
 * Format a quantity with up to 2 decimals (Spanish locale uses comma).
 */
export function formatQuantity(qty) {
  if (qty == null) return "0";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(qty);
}

const STATUS_META = {
  pending: { label: "Pendiente", color: "amber" },
  accepted: { label: "Aceptado", color: "blue" },
  preparing: { label: "Preparando", color: "indigo" },
  ready: { label: "Listo", color: "blue" },
  out_for_delivery: { label: "En reparto", color: "indigo" },
  completed: { label: "Completado", color: "emerald" },
  cancelled: { label: "Cancelado", color: "rose" },
  rejected: { label: "Rechazado", color: "rose" },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status, color: "slate" };
}

const FULFILLMENT_META = {
  pickup: { label: "Recogida", color: "emerald" },
  own_delivery: { label: "Reparto propio", color: "blue" },
  external_delivery: { label: "Reparto externo", color: "indigo" },
};

export function getFulfillmentMeta(type) {
  return FULFILLMENT_META[type] || { label: type, color: "slate" };
}

const BUSINESS_TYPE_META = {
  fruit_store: { label: "Frutería" },
  butcher: { label: "Carnicería" },
  fishmonger: { label: "Pescadería" },
  bakery: { label: "Panadería" },
  florist: { label: "Floristería" },
  grocery: { label: "Alimentación" },
  barber: { label: "Barbería" },
  beauty: { label: "Belleza y spa" },
  retail: { label: "Comercio" },
  association: { label: "Asociación" },
  services: { label: "Servicios" },
  other: { label: "Otro" },
};

export function getBusinessTypeLabel(type) {
  return BUSINESS_TYPE_META[type]?.label || type;
}
