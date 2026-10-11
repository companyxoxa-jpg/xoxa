// Template Engine V2 — dashboard skin wrapper.
// Phase 1: a pass-through that preserves the exact current AppLayout
// appearance. Later phases will resolve branding.dashboard.skin and inject
// per-template tokens/navigation variants without touching page logic.
export default function DashboardSkin({ children }) {
  return <>{children}</>;
}