// Specialized Home registry (Template Engine V2).
// Maps a V2 dashboard skin id to its optional specialized Home component.
// Home.jsx resolves branding.dashboard.skin and looks up here; skins without
// a specialized Home (minimal, freshops, butcherops) return null → Home.jsx
// renders DefaultHome. Specialized homes load only their own data; DefaultHome
// is the only Home that loads Orders.
//
// Adding a new vertical with a custom Home: create the component, import it
// here, and add it to HOME_REGISTRY. No new `if homeSkin === ...` in Home.jsx.
import BarberHome from "@/components/dashboard/barberops/BarberHome";
import SpaHome from "@/components/dashboard/spaops/SpaHome";
import RetailHome from "@/components/dashboard/retailops/RetailHome";
import AssociationHome from "@/components/dashboard/associationops/AssociationHome";
import FreshHome from "@/components/dashboard/freshops/FreshHome";
import ButcherHome from "@/components/dashboard/butcherops/ButcherHome";

const HOME_REGISTRY = {
  freshops: FreshHome,
  butcherops: ButcherHome,
  barberops: BarberHome,
  spaops: SpaHome,
  retailops: RetailHome,
  associationops: AssociationHome,
};

// Returns the specialized Home component for a dashboard skin id, or null
// when the skin uses DefaultHome.
export function getHomeComponent(skin) {
  return HOME_REGISTRY[skin] || null;
}
