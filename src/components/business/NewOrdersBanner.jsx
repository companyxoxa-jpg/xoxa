import { Link } from "react-router-dom";
import { useOrdersAlert } from "@/contexts/OrdersAlertContext";
import { formatCurrency } from "@/lib/format";
import { Bell, ChevronRight } from "lucide-react";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Hace unos segundos";
  const m = Math.floor(diff / 60);
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  return `Hace ${Math.floor(h / 24)} d`;
}

// Global attention banner shown across the business panel when pending orders exist.
// Single order: shows the order detail + "Ver pedido". Multiple: summary + "Ver pedidos".
export default function NewOrdersBanner() {
  const { pendingCount, latestPending } = useOrdersAlert();
  if (pendingCount === 0 || !latestPending) return null;

  const single = pendingCount === 1;
  const isDelivery = latestPending.fulfillment_type !== "pickup";

  return (
    <div className="mx-4 md:mx-8 mt-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/40 p-4 flex flex-wrap items-center gap-3">
      <div className="relative w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
        <Bell className="w-5 h-5 text-amber-400" />
        {!single && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center">{pendingCount}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">{single ? "Nuevo pedido" : "Pedidos nuevos"}</p>
        {single ? (
          <>
            <p className="font-heading font-bold text-foreground truncate">{latestPending.order_number}</p>
            <p className="text-xs text-muted-foreground truncate">
              {timeAgo(latestPending.created_date)} · {formatCurrency(latestPending.total)} · {isDelivery ? "Domicilio" : "Recogida"}
            </p>
          </>
        ) : (
          <>
            <p className="font-heading font-bold text-foreground">Tienes {pendingCount} pedidos pendientes de atender</p>
            <p className="text-xs text-muted-foreground truncate">
              Más reciente: {latestPending.order_number} · {formatCurrency(latestPending.total)}
            </p>
          </>
        )}
      </div>
      <Link
        to={single ? `/orders/${latestPending.id}` : "/orders"}
        className="shrink-0 inline-flex items-center gap-1 bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
      >
        {single ? "Ver pedido" : "Ver pedidos"}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}