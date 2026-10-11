// Frontend RINNO helpers — mirrors backend shared/rinno.ts

export const SUPER_ADMIN_EMAILS = Object.freeze([
  "companyxoxa@gmail.com",
  "ax.network.hub@gmail.com",
  "xoxamariles@gmail.com",
]);

const SUPER_ADMIN_EMAIL_SET = new Set(SUPER_ADMIN_EMAILS);

export function isSuperAdmin(user) {
  // Require both Base44's protected admin role and the RINNO allowlist.
  const email = String(user?.email || "").trim().toLowerCase();
  return user?.role === "admin" && SUPER_ADMIN_EMAIL_SET.has(email);
}

export function isSupportMode(user) {
  if (!isSuperAdmin(user)) return false;
  return !!(user?.data?.support_business_id || user?.support_business_id);
}

export function getBusinessId(user) {
  if (isSuperAdmin(user)) {
    const supportBid = user?.data?.support_business_id || user?.support_business_id;
    if (supportBid) return supportBid;
  }
  return user?.data?.business_id || user?.business_id || null;
}

export function getRinnoRole(user) {
  if (isSupportMode(user)) return "business_owner";
  const role = user?.rinno_role || user?.data?.rinno_role;
  if (role) return role;
  if (isSuperAdmin(user)) return "super_admin";
  // Default-deny: unlinked users are customers, not business_staff.
  return "customer";
}

export function isBusinessOwner(user) {
  return getRinnoRole(user) === "business_owner";
}

export function isBusinessStaff(user) {
  return getRinnoRole(user) === "business_staff";
}

export function getSupportBusinessName(user) {
  return user?.data?.support_business_name || user?.support_business_name || null;
}

export function isCustomer(user) {
  return !!user && getRinnoRole(user) === "customer";
}

export function getCustomerFullName(user) {
  if (user?.data?.first_name || user?.first_name) {
    return `${user?.first_name || user?.data?.first_name || ""} ${user?.last_name || user?.data?.last_name || ""}`.trim();
  }
  return user?.full_name || "";
}

