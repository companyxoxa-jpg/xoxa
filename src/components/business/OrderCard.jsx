import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/format";
import { Bike, Store, Clock, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  pending: "bg-amber-500/15 text-amber-400",
  accepted: "bg-blue-500/15 text-blue-400",
  preparing: "bg-indigo-500/15 text-indigo-400",
  ready: "bg-cyan-500/15 text-cyan-400",
  out_for_delivery: "bg-violet-500/15 text-violet-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-rose-500/15 text-rose-400",
  rejected: "bg-rose-500/15 text-rose-400",
};
const STATUS_LABELS = {
  pending: "NUEVO", accepted: "ACEPTADO", preparing: "PREPARANDO",
  ready: "LISTO", out_for_delivery: "EN REPARTO", completed: "ENTREGADO",
  cancelled: "CANCELADO", rejected: "RECHAZADO",
};

export function OrderCard({ order, onAccept, accepting }) {
  const isNew = order.order_status === "pending";
  const statusStyle = STATUS_STYLES[order.order_status] || "bg-muted text-muted-foreground";
  const statusLabel = STATUS_LABELS[order.order_status] || order.order_status;
  const isDelivery = order.fulfillment_type !== "pickup";

  return (
    <div className={cn(
      "rounded-2xl bg-card border p-4",
      isNew ? "border-amber-500/40" : "border-border"
    )}>
      <Link to={`/orders/${order.id}`} className="block hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-heading font-bold text-foreground">{order.order_number}</span>
              {isNew && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
            </div>
            <p className="text-sm text-foreground font-medium truncate">{order.customer_name}</p>
          </div>
          <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap", statusStyle)}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {isDelivery ? <Bike className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
              {isDelivery ? "Domicilio" : "Recogida"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {order.scheduled_time_start}–{order.scheduled_time_end}
            </span>
          </div>
          <span className="font-heading font-bold text-foreground">{formatCurrency(order.total)}</span>
        </div>
      </Link>
      {isNew && onAccept && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAccept(order); }}
          disabled={accepting}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Aceptar pedido
        </button>
      )}
    </div>
  );
}

export default OrderCard;