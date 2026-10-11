// Storefront skin registry (Template Engine V2).
// Maps a V2 storefront skin id to its React component. Store.jsx resolves
// branding.storefront.skin and looks up here; only skins with a dedicated V2
// storefront component are registered. V1 templates (classic, editorial,
// split, calm) and BOOKING V1 are NOT registered → Store.jsx falls through to
// the V1 fallback. A V1 template never lands inside a V2 component.
//
// Adding a new vertical: create the storefront component, import it here, and
// add it to STOREFRONT_REGISTRY. No new `if skin === ...` in Store.jsx.
import FreshMarketStorefront from "@/components/store/skins/freshmarket/FreshMarketStorefront";
import ButcherStorefront from "@/components/store/skins/butcher/ButcherStorefront";
import BarberStorefront from "@/components/store/skins/barber/BarberStorefront";
import SpaStorefront from "@/components/store/skins/spa/SpaStorefront";
import RetailStorefront from "@/components/store/skins/retail/RetailStorefront";
import AssociationStorefront from "@/components/store/skins/association/AssociationStorefront";

const STOREFRONT_REGISTRY = {
  freshmarket: FreshMarketStorefront,
  butcher: ButcherStorefront,
  barber: BarberStorefront,
  spa: SpaStorefront,
  retail: RetailStorefront,
  association: AssociationStorefront,
};

// Returns the V2 storefront component for a skin id, or null when the skin
// has no dedicated V2 component (V1 fallback path).
export function getStorefrontComponent(skin) {
  return STOREFRONT_REGISTRY[skin] || null;
}
