export function isDemoBusiness(business) {
  return Boolean(business?.demo_key) || /^rinno-demo-\d+$/i.test(business?.slug || "");
}

export function getDemoNumber(business) {
  return String(business?.slug || "").match(/rinno-demo-(\d+)/i)?.[1] || "";
}

export function getBusinessDisplayName(business) {
  if (business?.slug === "rinno-fresh") return "Tienda interna de pruebas";
  return business?.business_name || "Negocio sin nombre";
}
