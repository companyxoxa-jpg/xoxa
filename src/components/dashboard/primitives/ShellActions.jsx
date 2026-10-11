import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogOut, Volume2, VolumeX } from "lucide-react";

// Template Engine V2 — shared dashboard actions cluster (pending-orders badge
// + sound toggle + logout). Only the plain icon-cluster presentation is shared
// here; shells with a genuinely different affordance (FreshOps labeled sidebar
// buttons, ButcherOps role+border cluster, RetailOps bg-button cluster) keep
// their own markup. `big` switches the icon size (used by SpaOps workspace
// rail). `pendingLabel` controls the badge text suffix (e.g. "ped." or none).
export function ShellActions({ pendingCount, soundEnabled, onToggleSound, onLogout, big = false, pendingLabel }) {
  return (
    <div className={cn("flex items-center gap-2", big && "flex-col gap-1.5")}>
      {pendingCount > 0 && (
        <Link to="/orders" className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {pendingLabel ? `${pendingCount} ${pendingLabel}` : pendingCount}
        </Link>
      )}
      {soundEnabled !== undefined && (
        <button onClick={onToggleSound} aria-label={soundEnabled ? "Desactivar sonido" : "Activar sonido"} className="text-muted-foreground hover:text-foreground" title={soundEnabled ? "Sonido on" : "Sonido off"}>
          {soundEnabled ? <Volume2 className={big ? "w-5 h-5" : "w-4 h-4"} /> : <VolumeX className={big ? "w-5 h-5" : "w-4 h-4"} />}
        </button>
      )}
      <button onClick={onLogout} aria-label="Cerrar sesión" className="text-muted-foreground hover:text-foreground" title="Cerrar sesión">
        <LogOut className={big ? "w-5 h-5" : "w-4 h-4"} />
      </button>
    </div>
  );
}
