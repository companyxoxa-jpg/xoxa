import { getStatusMeta, getFulfillmentMeta, formatCurrency } from "@/lib/format";
import { MessageCircle, MapPin, ShoppingBag, Check, Truck, Package } from "lucide-react";

const badgeColors = {
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  slate: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColors[meta.color] || badgeColors.slate}`}>{meta.label}</span>;
}

function nextActions(status, fulfillmentType) {
  switch (status) {
    case "pending": return [{ label: "Aceptar", next: "accepted", variant: "primary" }, { label: "Rechazar", next: "rejected", variant: "danger" }];
    case "accepted": return [{ label: "Preparar", next: "preparing", variant: "primary" }];
    case "preparing": return [{ label: "Listo", next: "ready", variant: "primary" }];
    case "ready":
      return fulfillmentType === "pickup"
        ? [{ label: "Completar", next: "completed", variant: "success" }]
        : [{ label: "En reparto", next: "out_for_delivery", variant: "primary" }];
    case "out_for_delivery": return [{ label: "Completar", next: "completed", variant: "success" }];
    default: return [];
  }
}

function OrderCard({ order, onStatusChange }) {
  const fmeta = getFulfillmentMeta(order.fulfillment_type);
  const actions = nextActions(order.order_status, order.fulfillment_type);
  const waPhone = (order.customer_phone || "").replace(/\D/g, "");

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-heading font-bold text-sm text-foreground">#{order.order_number}</span>
            <StatusBadge status={order.order_status} />
          </div>
          <p className="text-sm font-medium text-foreground truncate">{order.customer_name}</p>
          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-heading font-bold text-base text-foreground">{formatCurrency(order.total)}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
            {order.fulfillment_type === "pickup" ? <Package className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
            {fmeta.label}
          </p>
        </div>
      </div>

      {order.delivery_address && order.fulfillment_type !== "pickup" && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mb-3 bg-muted px-3 py-2 rounded-lg">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span className="truncate">{order.delivery_address}</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        {actions.map((a) => (
          <button
            key={a.next}
            onClick={() => onStatusChange(order.id, a.next)}
            className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-colors ${
              a.variant === "primary" ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90" :
              a.variant === "success" ? "bg-emerald-600 text-white hover:bg-emerald-700" :
              "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            {a.label}
          </button>
        ))}
        {waPhone && (
          <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shrink-0">
            <MessageCircle className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function OrdersQueue({ orders, onStatusChange }) {
  const active = orders.filter(o => !["completed", "cancelled", "rejected"].includes(o.order_status));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          Cola de pedidos activos
        </h2>
        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-full">{active.length}</span>
      </div>
      {active.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay pedidos activos. ¡Todo al día!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((o) => <OrderCard key={o.id} order={o} onStatusChange={onStatusChange} />)}
        </div>
      )}
    </div>
  );
}