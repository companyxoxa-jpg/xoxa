// Shared RINNO helpers for backend functions — centralized authorization

// The hosted SDK rejects anonymous sessions rather than returning null.
// Preserve outages and other errors; only a confirmed 401 means no user.
export async function readAuthenticatedUser(base44) {
  try { return await base44.auth.me(); }
  catch (error) {
    if (error?.status === 401) return null;
    throw error;
  }
}

// === Order State Machine ===
export const VALID_TRANSITIONS = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'rejected', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed', 'cancelled'],
  out_for_delivery: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function isValidTransition(from, to) {
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// === Super Admin ===
export const SUPER_ADMIN_EMAILS = Object.freeze([
  'qa-superadmin@rinno.es',
]);

const SUPER_ADMIN_EMAIL_SET = new Set(SUPER_ADMIN_EMAILS);

// Require Base44's protected admin role and the RINNO allowlist.
// `rinno_role` is a user-editable data field and must NOT grant admin escalation.
export function isSuperAdmin(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  return user?.role === 'admin' && SUPER_ADMIN_EMAIL_SET.has(email);
}

export async function isCommercial(base44, user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email || isSuperAdmin(user)) return false;
  const matches = await base44.asServiceRole.entities.CommercialAccess.filter({ email, status: 'active' });
  return matches.length > 0;
}

// === Support Mode (Super Admin impersonation) ===
// support_business_id is a backend-issued field (set via ManageSupportMode).
// A non-admin user self-assigning it via updateMe must NOT be honored, so
// support mode is only active for a real Super Admin.
export function isSupportMode(user) {
  if (!isSuperAdmin(user)) return false;
  return !!(user?.data?.support_business_id || user?.support_business_id);
}

// === Business Context Resolution ===
// support_business_id takes precedence but is only honored for real Super Admins.
export function getUserBusinessId(user) {
  if (isSuperAdmin(user)) {
    const supportBid = user?.data?.support_business_id || user?.support_business_id;
    if (supportBid) return supportBid;
  }
  return user?.data?.business_id || user?.business_id || null;
}

// === Role Resolution ===
// Business roles (business_owner/business_staff) are backend-issued via
// LinkBusinessUser. Default-deny: a user with no explicit rinno_role is an
// unprivileged customer, NOT business_staff.
export function getRinnoRole(user) {
  if (isSupportMode(user)) return 'business_owner';
  const role = user?.data?.rinno_role || user?.rinno_role;
  if (role) return role;
  if (isSuperAdmin(user)) return 'super_admin';
  return 'customer';
}

export function isBusinessOwner(user) {
  return getRinnoRole(user) === 'business_owner';
}

export function isBusinessStaff(user) {
  return getRinnoRole(user) === 'business_staff';
}

// === Authorization Checks ===
// Owner and Staff can manage products and orders.
// Only Owner can manage business configuration.
// Super Admin gets access only through support mode (acts as owner).
export function canManageProducts(user) {
  const role = getRinnoRole(user);
  return role === 'business_owner' || role === 'business_staff';
}

export function canManageOrders(user) {
  const role = getRinnoRole(user);
  return role === 'business_owner' || role === 'business_staff';
}

export function canManageConfig(user) {
  return getRinnoRole(user) === 'business_owner';
}

// === Slot Management Authorization ===
// Only owner (or super admin in support mode) can manage fulfillment slots
export function canManageSlots(user) {
  return getRinnoRole(user) === 'business_owner';
}

// === Data Allowlists ===
// Server-side field filtering — prevents clients from modifying protected fields
export const PRODUCT_ALLOWLIST = [
  'name', 'slug', 'description', 'category_id', 'image', 'gallery',
  'price', 'compare_at_price', 'cost_price',
  'unit_type', 'unit_label', 'minimum_quantity', 'quantity_step',
  'origin', 'sku', 'barcode',
  'stock_mode', 'stock_quantity',
  'is_available', 'is_featured', 'sort_order', 'status'
];

export const BUSINESS_ALLOWLIST = [
  'business_name', 'contact_email', 'contact_phone', 'whatsapp_phone',
  'address', 'city', 'province', 'postal_code',
  'latitude', 'longitude',
  'logo', 'primary_color', 'secondary_color', 'cover_image', 'headline', 'tagline',
  'timezone'
];

export const SETTINGS_ALLOWLIST = [
  'schedule', 'accept_online_orders', 'minimum_order',
  'min_lead_time_minutes', 'allow_scheduled_orders', 'max_future_days',
  'pickup_enabled', 'own_delivery_enabled', 'external_delivery_enabled',
  'max_delivery_radius_km', 'delivery_fee', 'free_delivery_threshold',
  'store_message', 'store_description', 'cover_image',
  'social_links', 'whatsapp_phone', 'temporary_notice',
  'online_store_active'
];

export const SLOT_ALLOWLIST = [
  'fulfillment_type', 'day_of_week', 'start_time', 'end_time',
  'max_orders', 'is_active'
];

export function sanitizeData(data, allowlist) {
  const sanitized = {};
  if (!data || typeof data !== 'object') return sanitized;
  for (const key of allowlist) {
    if (key in data) {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
}

// === Audit Log Helper ===
// Creates an audit log entry using the authenticated server context.
// Never trusts actor_user_id from the frontend.
export async function createAuditLog(base44, user, action, details = {}) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      actor_role: getRinnoRole(user),
      business_id: details.business_id || getUserBusinessId(user) || null,
      action,
      entity_type: details.entity_type || null,
      entity_id: details.entity_id || null,
      metadata: details.metadata || {},
    });
  } catch (e) {
    // Do not leak SDK errors, but make missing audit entries operationally visible.
    console.error('RINNO audit write failed');
  }
}

// === Customer Role Helpers ===
export function isCustomer(user) {
  return !!user && getRinnoRole(user) === 'customer';
}

// === Centralized Business Resolution ===
// Single source of truth for resolving a Business by slug (future: hostname).
// Every storefront/customer function must resolve its business_id here — never
// trust a business_id sent from the frontend.
export async function resolveBusinessBySlug(base44, slug) {
  if (!slug || typeof slug !== 'string') return null;
  const businesses = await base44.asServiceRole.entities.Business.filter({ slug });
  if (businesses.length === 0) return null;
  return businesses[0];
}

// Ensure a Customer membership exists for user_id + business_id.
// Idempotent: returns the existing membership if already present.
export async function ensureMembership(base44, userId, businessId, data) {
  const existing = await base44.asServiceRole.entities.Customer.filter({
    business_id: businessId, user_id: userId,
  });
  if (existing.length > 0) return existing[0];
  return await base44.asServiceRole.entities.Customer.create({
    business_id: businessId,
    user_id: userId,
    first_name: (data?.first_name || '').trim(),
    last_name: (data?.last_name || '').trim(),
    phone: (data?.phone || '').trim(),
    email: data?.email || null,
    whatsapp_phone: data?.phone || null,
    total_orders: 0,
    total_spent: 0,
    last_order_at: null,
    marketing_consent: data?.marketing_consent || false,
    status: 'active',
  });
}

// Customer data allowlist for saved addresses
export const ADDRESS_ALLOWLIST = [
  'label', 'recipient_name', 'phone', 'address',
  'city', 'postal_code', 'province',
  'delivery_notes', 'latitude', 'longitude', 'is_default'
];

// === Onboarding Helpers ===
export const CATEGORIES_BY_TYPE = {
  fruit_store: [
    { name: "Fruta", slug: "fruta", sort_order: 1 },
    { name: "Verdura", slug: "verdura", sort_order: 2 },
    { name: "Tropical", slug: "tropical", sort_order: 3 },
    { name: "Básicos", slug: "basicos", sort_order: 4 },
    { name: "Hierbas aromáticas", slug: "hierbas-aromaticas", sort_order: 5 },
    { name: "Frutos secos", slug: "frutos-secos", sort_order: 6 },
  ],
  butcher: [
    { name: "Carne", slug: "carne", sort_order: 1 },
    { name: "Aves", slug: "aves", sort_order: 2 },
    { name: "Embutidos", slug: "embutidos", sort_order: 3 },
    { name: "Charcutería", slug: "charcuteria", sort_order: 4 },
  ],
  fishmonger: [
    { name: "Pescado", slug: "pescado", sort_order: 1 },
    { name: "Marisco", slug: "marisco", sort_order: 2 },
    { name: "Congelados", slug: "congelados", sort_order: 3 },
  ],
  bakery: [
    { name: "Pan", slug: "pan", sort_order: 1 },
    { name: "Bollería", slug: "bolleria", sort_order: 2 },
    { name: "Pastelería", slug: "pasteleria", sort_order: 3 },
  ],
  florist: [
    { name: "Flores", slug: "flores", sort_order: 1 },
    { name: "Plantas", slug: "plantas", sort_order: 2 },
    { name: "Ramos", slug: "ramos", sort_order: 3 },
  ],
  grocery: [
    { name: "Frescos", slug: "frescos", sort_order: 1 },
    { name: "Despensa", slug: "despensa", sort_order: 2 },
    { name: "Bebidas", slug: "bebidas", sort_order: 3 },
  ],
  other: [
    { name: "General", slug: "general", sort_order: 1 },
  ],
};

export function generateSlug(name) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDefaultSlots(fulfillmentTypes) {
  const slots = [];
  for (let day = 1; day <= 6; day++) {
    for (const ft of fulfillmentTypes) {
      slots.push({ fulfillment_type: ft, day_of_week: day, start_time: "10:00", end_time: "13:00", max_orders: 10, is_active: true });
      slots.push({ fulfillment_type: ft, day_of_week: day, start_time: "17:00", end_time: "20:00", max_orders: 10, is_active: true });
    }
  }
  return slots;
}

export function getDefaultSchedule() {
  return Array.from({ length: 7 }, (_, day) => {
    if (day === 0) return { day, closed: true };
    return { day, closed: false, continuous: true, morning_open: "09:00", morning_close: "20:00", afternoon_open: "", afternoon_close: "" };
  });
}
