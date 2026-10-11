// Template Engine V2 — shared registry. A template changes presentation, never
// tenant identity or data. Each template is an INDIVISIBLE pack of two
// experiences (storefront + dashboard); the Super Admin selects one template,
// never independent storefront/dashboard templates.
//
// V1 fields are preserved for full backwards compat. The `v2` block and
// `appearance_config` are additive and optional — a business without them
// resolves exactly as it did in V1.
//
// NOTE: base44/shared/templates.js (backend) and src/lib/templates.js
// (frontend mirror) MUST stay identical. Edit both together.
// === Skin Registries (V2) ===
// Each skin declares `supports`: the options it accepts and the allowed
// values for each. The appearance editor only renders controls for supported
// options, and the backend validates every write against these manifests —
// so no template can be configured into a broken design.
export const STOREFRONT_SKINS = {
  classic: {
    id: 'classic', name: 'Clásico', layout: 'classic',
    supports: {
      typography: { heading: ['display', 'heading'], body: ['body'] },
      logoPlacement: ['header'],
      logoSize: ['sm', 'md', 'lg'],
      headerVariant: ['default', 'compact'],
      heroVariant: ['default', 'minimal'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  editorial: {
    id: 'editorial', name: 'Editorial', layout: 'editorial',
    supports: {
      typography: { heading: ['display', 'editorial'], body: ['body'] },
      logoPlacement: ['header', 'top'],
      logoSize: ['md', 'lg'],
      headerVariant: ['default', 'expanded'],
      heroVariant: ['default', 'editorial'],
      density: ['comfortable', 'spacious'],
      tokens: { accent: 'color', heroOverlay: 'percent' },
    },
  },
  split: {
    id: 'split', name: 'Split', layout: 'split',
    supports: {
      typography: { heading: ['display', 'heading'], body: ['body'] },
      logoPlacement: ['header', 'top'],
      logoSize: ['sm', 'md', 'lg'],
      headerVariant: ['default'],
      heroVariant: ['default', 'split'],
      density: ['comfortable'],
      tokens: { accent: 'color' },
    },
  },
  calm: {
    id: 'calm', name: 'Calma', layout: 'calm',
    supports: {
      typography: { heading: ['display', 'editorial'], body: ['body'] },
      logoPlacement: ['header', 'top', 'center'],
      logoSize: ['sm', 'md'],
      headerVariant: ['default', 'minimal'],
      heroVariant: ['default', 'calm'],
      density: ['comfortable', 'spacious'],
      tokens: { accent: 'color', heroOverlay: 'percent' },
    },
  },
  freshmarket: {
    id: 'freshmarket', name: 'Mercado', layout: 'freshmarket',
    supports: {
      typography: { heading: ['display', 'heading'], body: ['body'] },
      logoPlacement: ['header', 'top', 'center'],
      logoSize: ['sm', 'md', 'lg'],
      headerVariant: ['default', 'compact'],
      heroVariant: ['banner', 'feature'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  butcher: {
    id: 'butcher', name: 'Mostrador', layout: 'butcher',
    supports: {
      typography: { heading: ['display', 'heading'], body: ['body'] },
      logoPlacement: ['header', 'top', 'center'],
      logoSize: ['sm', 'md', 'lg'],
      headerVariant: ['default', 'compact'],
      heroVariant: ['editorial', 'plaque'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  barber: {
    id: 'barber', name: 'Estudio', layout: 'barber',
    supports: {
      typography: { heading: ['editorial', 'display'], body: ['body'] },
      logoPlacement: ['header', 'top', 'center'],
      logoSize: ['sm', 'md', 'lg'],
      headerVariant: ['default', 'compact'],
      heroVariant: ['editorial', 'feature'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color', heroOverlay: 'percent' },
    },
  },
  spa: {
    id: 'spa', name: 'Ritual', layout: 'spa',
    supports: {
      typography: { heading: ['editorial', 'display'], body: ['body'] },
      logoPlacement: ['header', 'top', 'center'],
      logoSize: ['sm', 'md', 'lg'],
      headerVariant: ['default', 'minimal'],
      heroVariant: ['immersive', 'split'],
      density: ['comfortable', 'spacious'],
      tokens: { accent: 'color', heroOverlay: 'percent' },
    },
  },
  retail: {
    id: 'retail', name: 'Boutique', layout: 'retail',
    supports: {
      typography: { heading: ['display', 'heading'], body: ['body'] },
      logoPlacement: ['header', 'top'],
      logoSize: ['sm', 'md', 'lg'],
      headerVariant: ['default', 'compact'],
      heroVariant: ['campaign', 'collection'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  association: {
    id: 'association', name: 'Comunidad', layout: 'association',
    supports: {
      typography: { heading: ['editorial', 'display', 'heading'], body: ['body'] },
      logoPlacement: ['hero', 'header', 'center'], logoSize: ['md', 'lg'],
      headerVariant: ['transparent', 'solid'], heroVariant: ['community', 'institutional'],
      density: ['comfortable', 'spacious'], tokens: { accent: 'color', heroOverlay: 'percent' },
    },
  },
};

export const DASHBOARD_SKINS = {
  minimal: {
    id: 'minimal', name: 'Minimal', navigationVariant: 'sidebar',
    supports: {
      typography: { heading: ['heading', 'display'], body: ['body'] },
      logoPlacement: ['sidebar', 'top'],
      logoSize: ['sm', 'md'],
      navigationVariant: ['sidebar', 'top'],
      headerVariant: ['default', 'compact'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  freshops: {
    id: 'freshops', name: 'Fresh Ops', navigationVariant: 'sidebar',
    supports: {
      typography: { heading: ['heading', 'display'], body: ['body'] },
      logoPlacement: ['sidebar', 'top'],
      logoSize: ['sm', 'md'],
      navigationVariant: ['sidebar', 'top'],
      headerVariant: ['default', 'compact'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  butcherops: {
    id: 'butcherops', name: 'Mostrador Ops', navigationVariant: 'top',
    supports: {
      typography: { heading: ['heading', 'display'], body: ['body'] },
      logoPlacement: ['top', 'sidebar'],
      logoSize: ['sm', 'md'],
      navigationVariant: ['top', 'rail'],
      headerVariant: ['default', 'compact'],
      density: ['compact', 'comfortable'],
      tokens: { accent: 'color' },
    },
  },
  barberops: {
    id: 'barberops', name: 'Barbería Ops', navigationVariant: 'editorial',
    supports: {
      typography: { heading: ['editorial', 'display', 'heading'], body: ['body'] },
      logoPlacement: ['top', 'sidebar'],
      logoSize: ['sm', 'md'],
      navigationVariant: ['editorial', 'dock'],
      headerVariant: ['default', 'compact'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  spaops: {
    id: 'spaops', name: 'Spa Ops', navigationVariant: 'workspace',
    supports: {
      typography: { heading: ['editorial', 'display', 'heading'], body: ['body'] },
      logoPlacement: ['top', 'sidebar'],
      logoSize: ['sm', 'md'],
      navigationVariant: ['workspace', 'bar'],
      headerVariant: ['default', 'minimal'],
      density: ['comfortable', 'spacious'],
      tokens: { accent: 'color' },
    },
  },
  retailops: {
    id: 'retailops', name: 'Retail Ops', navigationVariant: 'ribbon',
    supports: {
      typography: { heading: ['heading', 'display'], body: ['body'] },
      logoPlacement: ['top', 'sidebar'],
      logoSize: ['sm', 'md'],
      navigationVariant: ['ribbon', 'launcher'],
      headerVariant: ['default', 'compact'],
      density: ['comfortable', 'compact'],
      tokens: { accent: 'color' },
    },
  },
  associationops: {
    id: 'associationops', name: 'Asociación Admin', navigationVariant: 'civic',
    supports: {
      typography: { heading: ['editorial', 'heading', 'display'], body: ['body'] },
      logoPlacement: ['sidebar', 'top'], logoSize: ['sm', 'md'],
      navigationVariant: ['civic', 'top'], headerVariant: ['default', 'compact'],
      density: ['comfortable', 'compact'], tokens: { accent: 'color' },
    },
  },
};

export function getStorefrontSkin(id) {
  return STOREFRONT_SKINS[id] || STOREFRONT_SKINS.classic;
}
export function getDashboardSkin(id) {
  return DASHBOARD_SKINS[id] || DASHBOARD_SKINS.minimal;
}

// Human-readable labels for option values (UI only; harmless on the backend).
export const OPTION_LABELS = {
  typography: { heading: { display: 'Display', heading: 'Encabezado', editorial: 'Editorial', body: 'Cuerpo' }, body: { body: 'Cuerpo' } },
  logoPlacement: { header: 'Cabecera', top: 'Superior', center: 'Centrado', sidebar: 'Barra lateral' },
  logoSize: { sm: 'Pequeño', md: 'Mediano', lg: 'Grande' },
  headerVariant: { default: 'Estándar', compact: 'Compacta', expanded: 'Ampliada', minimal: 'Mínima' },
  heroVariant: { default: 'Estándar', minimal: 'Minimal', editorial: 'Editorial', split: 'Split', calm: 'Calma', banner: 'Banner', feature: 'Destacada', plaque: 'Placa', immersive: 'Inmersiva', campaign: 'Campaña', collection: 'Colección' },
  navigationVariant: { sidebar: 'Barra lateral', top: 'Barra superior', rail: 'Rail de iconos', editorial: 'Editorial', dock: 'Dock inferior', workspace: 'Workspace', bar: 'Píldoras', ribbon: 'Cinta', launcher: 'Launcher' },
  density: { comfortable: 'Cómoda', compact: 'Compacta', spacious: 'Amplia' },
};

// Default V2 storefront descriptor — mirrors current V1 layout behavior.
const sf = (skin, extra = {}) => ({
  skin,
  tokens: {},
  heroVariant: 'default',
  logoPlacement: 'header',
  logoSize: 'md',
  headerVariant: 'default',
  typography: { heading: 'display', body: 'body' },
  density: 'comfortable',
  ...extra,
});

// Default V2 dashboard descriptor — mirrors the current single dashboard.
const db = (extra = {}) => ({
  skin: 'minimal',
  tokens: {},
  navigationVariant: 'sidebar',
  logoPlacement: 'sidebar',
  logoSize: 'sm',
  headerVariant: 'default',
  typography: { heading: 'heading', body: 'body' },
  density: 'comfortable',
  ...extra,
});

const REGISTERED_TEMPLATES = [
  { id: 'fresh-market', demo: '08', name: 'Frutería · Mercado', mode: 'COMMERCE', sector: 'fruit_store', color: '#16A34A', title: 'Fresco cada día', subtitle: 'Frutas y verduras seleccionadas para ti.', image: '/images/hero-fresh-market-v2.webp', layout: 'freshmarket', v2: { storefront: sf('freshmarket', { heroVariant: 'feature' }), dashboard: db({ skin: 'freshops' }) } },
  { id: 'butcher-craft', demo: '09', name: 'Carnicería · Mostrador', mode: 'COMMERCE', sector: 'butcher', color: '#842D32', title: 'Buen origen. Mejor mesa.', subtitle: 'Cortes seleccionados y el oficio de toda la vida.', image: '/images/hero-butcher-craft-v2.webp', layout: 'butcher', v2: { storefront: sf('butcher', { heroVariant: 'editorial', logoPlacement: 'header' }), dashboard: db({ skin: 'butcherops', navigationVariant: 'top', logoPlacement: 'top', density: 'compact' }) } },
  { id: 'barber-studio', demo: '10', name: 'Barbería · Estudio', mode: 'BOOKING', sector: 'barber', color: '#254C48', title: 'Tu estilo. Nuestro oficio.', subtitle: 'Cortes precisos y rituales de barbería sin prisas.', image: '/images/hero-barber-studio-v2.webp', layout: 'barber', v2: { storefront: sf('barber', { heroVariant: 'editorial', logoPlacement: 'header', typography: { heading: 'editorial', body: 'body' } }), dashboard: db({ skin: 'barberops', navigationVariant: 'editorial', logoPlacement: 'top', typography: { heading: 'editorial', body: 'body' }, density: 'comfortable' }) } },
  { id: 'beauty-spa', demo: '11', name: 'Belleza · Spa', mode: 'BOOKING', sector: 'beauty', color: '#8C7B6B', title: 'Un momento para ti.', subtitle: 'Tratamientos y rituales en un espacio para desconectar.', image: '/images/hero-beauty-spa-v2.webp', layout: 'spa', v2: { storefront: sf('spa', { heroVariant: 'immersive', logoPlacement: 'header', typography: { heading: 'editorial', body: 'body' }, density: 'spacious' }), dashboard: db({ skin: 'spaops', navigationVariant: 'workspace', logoPlacement: 'top', typography: { heading: 'editorial', body: 'body' }, density: 'spacious' }) } },
  { id: 'retail-store', demo: '12', name: 'Comercio · Retail', mode: 'COMMERCE', sector: 'other', color: '#1F2937', title: 'Tu tienda, online.', subtitle: 'Descubre nuestra colección y compra en pocos clics.', image: '/images/hero-retail-store-v2.webp', layout: 'retail', v2: { storefront: sf('retail', { heroVariant: 'campaign', logoPlacement: 'header' }), dashboard: db({ skin: 'retailops', navigationVariant: 'ribbon', logoPlacement: 'top' }) } },
  { id: 'association-community', demo: '13', name: 'Club Social · CSC', mode: 'ASSOCIATION', sector: 'association', color: '#173F35', title: 'El club que tus socios quieren llevar en el bolsillo.', subtitle: 'Credencial, variedades, límites, reservas y comunidad en una experiencia privada creada alrededor de la cultura del cannabis.', image: '/images/csc-club-hero-v2.webp', layout: 'association', v2: { storefront: sf('association', { heroVariant: 'community', logoPlacement: 'hero', logoSize: 'lg', headerVariant: 'transparent', typography: { heading: 'editorial', body: 'body' }, density: 'spacious' }), dashboard: db({ skin: 'associationops', navigationVariant: 'civic', logoPlacement: 'sidebar', typography: { heading: 'editorial', body: 'body' } }) } },
].sort((a, b) => a.demo.localeCompare(b.demo));

export const TEMPLATES = REGISTERED_TEMPLATES;
// Preserve existing businesses without adding legacy models to new-business choices.
const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=85`;
export const LEGACY_TEMPLATES = [
  { id: 'fresh-classic', demo: '01', name: 'Frutería · Original', mode: 'COMMERCE', sector: 'fruit_store', color: '#166534', title: 'Fresco cada día', subtitle: 'Frutas y verduras seleccionadas para ti.', image: photo('photo-1542838132-92c53300491e'), layout: 'classic', v2: { storefront: sf('classic'), dashboard: db() } },
  { id: 'butcher-premium', demo: '02', name: 'Carnicería · Origen', mode: 'COMMERCE', sector: 'butcher', color: '#842D32', title: 'Buen origen. Mejor mesa.', subtitle: 'Cortes seleccionados y el oficio de toda la vida.', image: photo('photo-1607623814075-e51df1bdc82f'), layout: 'editorial', v2: { storefront: sf('editorial'), dashboard: db() } },
  { id: 'bakery-warm', demo: '03', name: 'Panadería · La Miga', mode: 'COMMERCE', sector: 'bakery', color: '#87522D', title: 'Cada mañana, algo bueno.', subtitle: 'Masa madre, tiempo y manos que saben.', image: photo('photo-1509440159596-0249088772ff'), layout: 'split', v2: { storefront: sf('split'), dashboard: db() } },
  { id: 'salon-studio', demo: '04', name: 'Peluquería · Studio', mode: 'BOOKING', sector: 'hair_salon', color: '#765344', title: 'Un momento para ti.', subtitle: 'Corte, color y cuidado con tu profesional de confianza.', image: photo('photo-1562322140-8baeececf3df'), layout: 'split', v2: { storefront: sf('split'), dashboard: db() } },
  { id: 'barber-club', demo: '05', name: 'Barbería · Club', mode: 'BOOKING', sector: 'barber', color: '#254C48', title: 'Tu estilo. Nuestro oficio.', subtitle: 'Cortes precisos y rituales de barbería sin prisas.', image: photo('photo-1503951914875-452162b0f3f1'), layout: 'editorial', v2: { storefront: sf('editorial'), dashboard: db() } },
  { id: 'beauty-calm', demo: '06', name: 'Estética · Calma', mode: 'BOOKING', sector: 'beauty', color: '#73526F', title: 'Cuídate, a tu ritmo.', subtitle: 'Tratamientos personalizados en un espacio para desconectar.', image: photo('photo-1540555700478-4be289fbecef'), layout: 'calm', v2: { storefront: sf('calm'), dashboard: db() } },
  { id: 'wellness-hybrid', demo: '07', name: 'Bienestar · Ritual', mode: 'HYBRID', sector: 'beauty', color: '#53685D', title: 'Tu ritual, aquí y en casa.', subtitle: 'Reserva tu tratamiento y descubre nuestra selección de cuidado personal.', image: photo('photo-1540555700478-4be289fbecef'), layout: 'calm', v2: { storefront: sf('calm'), dashboard: db() } },
];

export function templateFor(business = {}) {
  const id = business.template_id;
  return REGISTERED_TEMPLATES.find(t => t.id === id) || LEGACY_TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}
export function modeFor(business = {}) { return business.business_mode || 'COMMERCE'; }
export function hasBooking(business) { return ['BOOKING', 'HYBRID'].includes(modeFor(business)); }
export function validImage(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 2048) return false;
  return /^https:\/\/[^\s]+$/.test(value) || /^\/assets\/brands\/[a-z0-9-]+\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp)$/i.test(value);
}
export function validatePresentation(business) {
  const mode = modeFor(business);
  const template = templateFor(business);
  if (!['COMMERCE', 'BOOKING', 'HYBRID', 'ASSOCIATION'].includes(mode) || !template || (mode !== 'HYBRID' && template.mode !== mode)) throw new Error('Plantilla y modalidad incompatibles');
  for (const field of ['cover_image', 'logo']) if (business[field] != null && !validImage(business[field])) throw new Error('Las imágenes deben tener una URL HTTPS o un recurso de marca local válido');
  for (const field of ['headline', 'tagline']) if (business[field] != null && (typeof business[field] !== 'string' || business[field].length > 240)) throw new Error('Texto de portada demasiado largo');
  if (business.timezone) new Intl.DateTimeFormat('es', { timeZone: business.timezone });
}

// === Template Engine V2 — Appearance Config ===
// Returns the template's default storefront + dashboard visual config.
// Used as the Reset target and as the merge base in resolveBranding.
export function defaultAppearanceConfig(template) {
  const sfDef = (template.v2 && template.v2.storefront) || {};
  const dbDef = (template.v2 && template.v2.dashboard) || {};
  return {
    storefront: {
      typography: sfDef.typography || { heading: 'display', body: 'body' },
      logoPlacement: sfDef.logoPlacement || 'header',
      logoSize: sfDef.logoSize || 'md',
      headerVariant: sfDef.headerVariant || 'default',
      heroVariant: sfDef.heroVariant || 'default',
      density: sfDef.density || 'comfortable',
      tokens: { ...(sfDef.tokens || {}) },
    },
    dashboard: {
      typography: dbDef.typography || { heading: 'heading', body: 'body' },
      logoPlacement: dbDef.logoPlacement || 'sidebar',
      logoSize: dbDef.logoSize || 'sm',
      navigationVariant: dbDef.navigationVariant || 'sidebar',
      headerVariant: dbDef.headerVariant || 'default',
      density: dbDef.density || 'comfortable',
      tokens: { ...(dbDef.tokens || {}) },
    },
  };
}

// Server-side validation of a business's appearance_config against the
// resolved template's skin supports. Rejects unsupported keys/values so no
// template can be persisted in a broken configuration. Returns a sanitized
// config (only supported keys retained) or null when nothing is provided.
export function validateAppearanceConfig(business, cfg) {
  if (cfg == null) return null;
  if (typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('appearance_config inválido');
  const template = templateFor(business);
  const out = {};
  for (const face of ['storefront', 'dashboard']) {
    const faceCfg = cfg[face];
    if (faceCfg == null) continue;
    if (typeof faceCfg !== 'object' || Array.isArray(faceCfg)) throw new Error(`appearance_config.${face} inválido`);
    const def = (template.v2 && template.v2[face]) || {};
    const skin = face === 'storefront'
      ? getStorefrontSkin(def.skin || template.layout || 'classic')
      : getDashboardSkin(def.skin || 'minimal');
    const sup = skin.supports || {};
    const clean = {};
    if (faceCfg.typography != null) {
      if (typeof faceCfg.typography !== 'object' || Array.isArray(faceCfg.typography)) throw new Error(`typography de ${face} inválido`);
      const tOut = {};
      for (const role of ['heading', 'body']) {
        if (faceCfg.typography[role] != null) {
          const allowed = sup.typography && sup.typography[role];
          if (!allowed || !allowed.includes(faceCfg.typography[role])) throw new Error(`typography.${role} no soportado por el skin "${skin.id}"`);
          tOut[role] = faceCfg.typography[role];
        }
      }
      clean.typography = tOut;
    }
    for (const key of ['logoPlacement', 'logoSize', 'headerVariant', 'heroVariant', 'navigationVariant', 'density']) {
      if (faceCfg[key] != null) {
        const allowed = sup[key];
        if (!allowed || !allowed.includes(faceCfg[key])) throw new Error(`"${key}" no soportado por el skin "${skin.id}"`);
        clean[key] = faceCfg[key];
      }
    }
    if (faceCfg.tokens != null) {
      if (typeof faceCfg.tokens !== 'object' || Array.isArray(faceCfg.tokens)) throw new Error(`tokens de ${face} inválido`);
      const tokenSup = sup.tokens || {};
      const tOut = {};
      for (const [k, v] of Object.entries(faceCfg.tokens)) {
        const type = tokenSup[k];
        if (!type) throw new Error(`token "${k}" no soportado por el skin "${skin.id}"`);
        if (type === 'color') {
          if (typeof v !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(v)) throw new Error(`token "${k}" debe ser un color HEX #RRGGBB`);
          tOut[k] = v;
        } else if (type === 'percent') {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`token "${k}" debe estar entre 0 y 100`);
          tOut[k] = n;
        } else if (type === 'radius') {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0 || n > 32) throw new Error(`token "${k}" fuera de rango`);
          tOut[k] = n;
        } else {
          throw new Error(`tipo de token "${k}" desconocido`);
        }
      }
      clean.tokens = tOut;
    }
    out[face] = clean;
  }
  return out;
}

// === Template Engine V2 — Unified Branding Resolver ===
// Merges template defaults with the business's appearance_config overrides.
// Additive: a business without appearance_config resolves EXACTLY as V1.
export function resolveBranding(business = {}) {
  const template = templateFor(business);
  const primaryColor = business.primary_color || template.color || '#16A34A';
  const secondaryColor = business.secondary_color || template.color || '#0284C7';
  const sfDef = (template.v2 && template.v2.storefront) || {};
  const dbDef = (template.v2 && template.v2.dashboard) || {};
  const d = defaultAppearanceConfig(template);
  const cfg = business.appearance_config || {};
  const sfO = cfg.storefront || {};
  const dbO = cfg.dashboard || {};
  const sfSkin = getStorefrontSkin(sfDef.skin || template.layout || 'classic');
  const dbSkin = getDashboardSkin(dbDef.skin || 'minimal');
  const sfTypo = {
    heading: (sfO.typography && sfO.typography.heading) || d.storefront.typography.heading,
    body: (sfO.typography && sfO.typography.body) || d.storefront.typography.body,
  };
  const dbTypo = {
    heading: (dbO.typography && dbO.typography.heading) || d.dashboard.typography.heading,
    body: (dbO.typography && dbO.typography.body) || d.dashboard.typography.body,
  };
  return {
    shared: {
      businessName: business.business_name,
      logo: business.logo,
      favicon: business.favicon,
      primaryColor,
      secondaryColor,
      city: business.city,
      slug: business.slug,
    },
    storefront: {
      skin: sfSkin.id,
      tokens: { primary: primaryColor, secondary: secondaryColor, ...(sfDef.tokens || {}), ...(sfO.tokens || {}) },
      typography: sfTypo,
      logoPlacement: sfO.logoPlacement != null ? sfO.logoPlacement : d.storefront.logoPlacement,
      logoSize: sfO.logoSize != null ? sfO.logoSize : d.storefront.logoSize,
      headerVariant: sfO.headerVariant != null ? sfO.headerVariant : d.storefront.headerVariant,
      heroVariant: sfO.heroVariant != null ? sfO.heroVariant : d.storefront.heroVariant,
      density: sfO.density != null ? sfO.density : d.storefront.density,
    },
    dashboard: {
      skin: dbSkin.id,
      tokens: { primary: primaryColor, secondary: secondaryColor, ...(dbDef.tokens || {}), ...(dbO.tokens || {}) },
      typography: dbTypo,
      logoPlacement: dbO.logoPlacement != null ? dbO.logoPlacement : d.dashboard.logoPlacement,
      logoSize: dbO.logoSize != null ? dbO.logoSize : d.dashboard.logoSize,
      navigationVariant: dbO.navigationVariant != null ? dbO.navigationVariant : d.dashboard.navigationVariant,
      headerVariant: dbO.headerVariant != null ? dbO.headerVariant : d.dashboard.headerVariant,
      density: dbO.density != null ? dbO.density : d.dashboard.density,
    },
  };
}
