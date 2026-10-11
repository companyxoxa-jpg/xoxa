import { AlertCircle, ArrowLeft } from "lucide-react";

// Template Engine V2 — shared support-mode banner. The markup was byte-identical
// across all five V2 shells, so it is extracted here once. Each shell still
// decides WHERE to place it. Returns null when not in support mode.
export function SupportBanner({ supportMode, supportBusinessName, onExitSupport }) {
  if (!supportMode) return null;
  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between relative z-20">
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm font-medium text-amber-400 truncate">Modo soporte · {supportBusinessName || "Negocio"}</p>
      </div>
      <button onClick={onExitSupport} className="flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 shrink-0">
        <ArrowLeft className="w-4 h-4" />Salir
      </button>
    </div>
  );
}