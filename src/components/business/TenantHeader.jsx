import { getBusinessTypeLabel } from "@/lib/format";
import { Building2, ChevronDown } from "lucide-react";

const statusColors = {
  onboarding: "bg-slate-500/15 text-slate-300",
  trial: "bg-amber-500/15 text-amber-400",
  active: "bg-emerald-500/15 text-emerald-400",
  suspended: "bg-rose-500/15 text-rose-400",
  cancelled: "bg-slate-500/15 text-slate-400",
};

export default function TenantHeader({ business, tenantId }) {
  if (!business) return null;
  const statusClass = statusColors[business.status] || "bg-slate-500/15 text-slate-300";

  return (
    <div className="bg-card border-b border-border px-4 md:px-8 py-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: business.primary_color || "#16A34A" }}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-bold text-lg text-foreground leading-none">{business.business_name}</h1>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {getBusinessTypeLabel(business.business_type)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {business.business_name} — {tenantId || business.id?.slice(-8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${statusClass}`}>
            {business.status}
          </span>
          <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            Cambiar negocio
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}