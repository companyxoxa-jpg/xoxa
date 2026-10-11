import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/business/EmptyState";
import { OrderCard } from "@/components/business/OrderCard";
import { useOrdersAlert } from "@/contexts/OrdersAlertContext";
import { Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "pending", label: "Nuevos", statuses: ["pending"] },
  { id: "preparing", label: "Preparando", statuses: ["accepted", "preparing"] },
  { id: "ready", label: "Listos", statuses: ["ready", "out_for_delivery"] },
  { id: "delivery", label: "Entregas", statuses: [], deliveryOnly: true },
  { id: "completed", label: "Completados", statuses: ["completed"] },
  { id: "all", label: "Todos", statuses: null },
];

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [acceptingId, setAcceptingId] = useState(null);
  const { acceptOrder } = useOrdersAlert();

  const bid = getBusinessId(user);

  const loadData = useCallback(async () => {
    if (!bid) { setLoading(false); return; }
    try {
      const ords = await base44.entities.Order.filter({ business_id: bid }, "-created_date", 100);
      setOrders(ords);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, [loadData]);

  const f = FILTERS.find(f => f.id === filter);
  const filtered = orders.filter(o => {
    if (!f) return true;
    if (f.deliveryOnly) return o.fulfillment_type === "own_delivery" && !["completed", "cancelled", "rejected"].includes(o.order_status);
    if (!f.statuses) return true;
    return f.statuses.includes(o.order_status);
  }).sort((a, b) => {
    const orderRank = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled", "rejected"];
    const pa = orderRank.indexOf(a.order_status);
    const pb = orderRank.indexOf(b.order_status);
    if (pa !== pb) return pa - pb;
    // pending: oldest first so an old order is never buried; others: newest first
    if (a.order_status === "pending") return new Date(a.created_date) - new Date(b.created_date);
    return new Date(b.created_date) - new Date(a.created_date);
  });

  async function handleAccept(order) {
    setAcceptingId(order.id);
    try {
      await acceptOrder(order.id);
      toast({ title: "Pedido aceptado", description: order.order_number });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, order_status: "accepted" } : o));
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No se pudo aceptar.", variant: "destructive" });
    } finally { setAcceptingId(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-6 pb-2">
        <h1 className="font-heading font-bold text-2xl text-foreground">Pedidos</h1>
      </div>
      <div className="px-4 md:px-8 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {FILTERS.map(flt => (
            <button key={flt.id} onClick={() => setFilter(flt.id)} className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              filter === flt.id ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25" : "bg-muted text-muted-foreground"
            )}>
              {flt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 md:px-8 mt-2">
        {filtered.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No hay pedidos aquí" description="Los pedidos que coincidan con este filtro aparecerán aquí." />
        ) : (
          <div className="space-y-3">
            {filtered.map(o => (
              <OrderCard key={o.id} order={o} onAccept={handleAccept} accepting={acceptingId === o.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}