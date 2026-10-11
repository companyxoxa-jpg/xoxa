import { ShoppingBag, Euro, Clock, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/format";

function MetricCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className="text-lg font-heading font-bold text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function MetricsBar({ orders, slotsCount }) {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.created_date?.slice(0, 10) === today);
  const gmv = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pending = orders.filter(o => ["pending", "accepted", "preparing"].includes(o.order_status)).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard icon={ShoppingBag} label="Pedidos hoy" value={todayOrders.length} accent="bg-emerald-500/15 text-emerald-400" />
      <MetricCard icon={Euro} label="GMV hoy" value={formatCurrency(gmv)} accent="bg-blue-500/15 text-blue-400" />
      <MetricCard icon={Clock} label="Pendientes" value={pending} accent="bg-amber-500/15 text-amber-400" />
      <MetricCard icon={CalendarClock} label="Slots activos" value={slotsCount} accent="bg-indigo-500/15 text-indigo-400" />
    </div>
  );
}