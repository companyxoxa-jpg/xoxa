// Dashboard shell registry (Template Engine V2).
// Maps a V2 dashboard skin id to its shell component. AppLayout.jsx resolves
// branding.dashboard.skin and looks up here; 'minimal' (and any unregistered
// skin) returns null → AppLayout renders the V1 chrome. The registry decides
// EXCLUSIVELY which shell renders; it holds no permissions, modules, or
// business rules.
//
// Adding a new vertical: create the shell component, import it here, and add
// it to SHELL_REGISTRY. No new skin-specific ternaries in AppLayout.jsx.
import FreshOpsShell from "@/components/dashboard/skins/freshops/FreshOpsShell";
import ButcherOpsShell from "@/components/dashboard/skins/butcherops/ButcherOpsShell";
import BarberOpsShell from "@/components/dashboard/skins/barberops/BarberOpsShell";
import SpaOpsShell from "@/components/dashboard/skins/spaops/SpaOpsShell";
import RetailOpsShell from "@/components/dashboard/skins/retailops/RetailOpsShell";
import AssociationOpsShell from "@/components/dashboard/skins/associationops/AssociationOpsShell";

const SHELL_REGISTRY = {
  freshops: FreshOpsShell,
  butcherops: ButcherOpsShell,
  barberops: BarberOpsShell,
  spaops: SpaOpsShell,
  retailops: RetailOpsShell,
  associationops: AssociationOpsShell,
};

// Returns the V2 dashboard shell for a skin id, or null when the skin has no
// dedicated V2 shell (V1 chrome path, e.g. 'minimal').
export function getDashboardShell(skin) {
  return SHELL_REGISTRY[skin] || null;
}
