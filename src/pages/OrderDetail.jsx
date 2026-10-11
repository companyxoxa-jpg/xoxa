import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useOrdersAlert } from "@/contexts/OrdersAlertContext";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, MapPin, Clock, Bike, Store, Check, X, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const STATUS_LABELS = { pending: "NUEVO", accepted: "ACEPTADO", preparing: "PREPARANDO", ready: "LISTO", out_for_delivery: "EN REPARTO", completed: "ENTREGADO", cancelled: "CANCELADO", rejected: "RECHAZADO" };
const STATUS_STYLES = { pending: "bg-amber-500/15 text-amber-400", accepted: "bg-blue-500/15 text-blue-400", preparing: "bg-indigo-500/15 text-indigo-400", ready: "bg-cyan-500/15 text-cyan-400", out_for_delivery: "bg-violet-500/15 text-violet-400", completed: "bg-emerald-500/15 text-emerald-400", cancelled: "bg-rose-500/15 text-rose-400", rejected: "bg-rose-500/15 text-rose-400" };
const REJECTION_REASONS = ["Sin stock", "Fuera de zona", "No podemos atenderlo", "Otro"];
const PAYMENT_LABELS = { cash_on_delivery: "Efectivo al recibir", card_on_delivery: "Tarjeta al recibir", online_payment: "Pago online" };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { removeFromPending } = useOrdersAlert();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [ord, its] = await Promise.all([
        base44.entities.Order.get(id),
        base44.entities.OrderItem.filter({ order_id: id }),
      ]);
      setOrder(ord);
      setItems(its);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, [loadData]);

  async function updateStatus(newStatus, reason) {
    setUpdating(true);
    try {
      await base44.functions.invoke('UpdateOrderStatus', { order_id: id, new_status: newStatus, rejection_reason: reason });
      if (order?.order_status === "pending" && newStatus !== "pending") removeFromPending(id);
      setOrder(prev => ({ ...prev, order_status: newStatus, ...(reason ? { internal_notes: reason } : {}) }));
      toast({ title: "Pedido actualizado", description: `Estado: ${STATUS_LABELS[newStatus] || newStatus}` });
      if (newStatus === "rejected") setShowReject(false);
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No pudimos actualizar el pedido. Inténtalo nuevamente.", variant: "destructive" });
    } finally { setUpdating(false); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!order) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-sm text-muted-foreground mb-4">Pedido no encontrado.</p>
      <Link to="/orders"><Button variant="outline">Volver a pedidos</Button></Link>
    </div>
  );

  const isDelivery = order.fulfillment_type !== "pickup";
  const isFinal = ["completed", "rejected", "cancelled"].includes(order.order_status);
  const statusLabel = STATUS_LABELS[order.order_status] || order.order_status;
  const statusStyle = STATUS_STYLES[order.order_status] || "bg-muted text-muted-foreground";

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/orders")} className="p-2 -ml-2 rounded-lg hover:bg-muted">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-xl text-foreground">{order.order_number}</h1>
        </div>
        <span className={cn("text-xs font-bold px-3 py-1 rounded-full", statusStyle)}>{statusLabel}</span>
      </div>

      <div className="px-4 md:px-8 space-y-4">
        <Section title="Cliente">
          <p className="font-medium text-foreground">{order.customer_name}</p>
          <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Phone className="w-3.5 h-3.5" />{order.customer_phone}
          </a>
        </Section>

        <Section title="Entrega">
          <div className="flex items-center gap-2 text-sm">
            {isDelivery ? <Bike className="w-4 h-4 text-muted-foreground" /> : <Store className="w-4 h-4 text-muted-foreground" />}
            <span className="text-foreground font-medium">{isDelivery ? "Entrega a domicilio" : "Recogida en tienda"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Clock className="w-3.5 h-3.5" />{order.scheduled_date} · {order.scheduled_time_start}–{order.scheduled_time_end}
          </div>
          {isDelivery && order.delivery_address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5 mt-0.5" /><span>{order.delivery_address}</span>
            </div>
          )}
          {order.customer_notes && <p className="text-sm text-muted-foreground mt-2 italic">"{order.customer_notes}"</p>}
        </Section>

        <Section title="Productos">
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground"><span className="font-medium">{formatQuantity(item.quantity)} {item.unit_type}</span> {item.product_name_snapshot}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)}/{item.unit_type}</p>
                </div>
                <span className="text-sm font-medium text-foreground">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-1.5">
          <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
          {order.delivery_fee > 0 && <Row label="Entrega" value={formatCurrency(order.delivery_fee)} />}
          {order.discount > 0 && <Row label="Descuento" value={`-${formatCurrency(order.discount)}`} />}
          <div className="pt-2 mt-1 border-t border-border">
            <Row label="TOTAL" value={formatCurrency(order.total)} bold />
          </div>
        </div>

        <Section title="Pago">
          <p className="text-sm text-foreground">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{order.payment_status === "paid" ? "Pagado" : "Pendiente de pago"}</p>
        </Section>

        {order.internal_notes && (
          <Section title="Motivo del rechazo"><p className="text-sm text-rose-400">{order.internal_notes}</p></Section>
        )}

        {!isFinal && (
          <div className="space-y-2 pt-2">
            {order.order_status === "pending" && (<>
              <Button className="w-full" size="lg" disabled={updating} onClick={() => updateStatus("accepted")}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Aceptar pedido
              </Button>
              <Button variant="outline" className="w-full" size="lg" disabled={updating} onClick={() => setShowReject(true)}>
                <X className="w-4 h-4" />Rechazar
              </Button>
            </>)}
            {order.order_status === "accepted" && (
              <Button className="w-full" size="lg" disabled={updating} onClick={() => updateStatus("preparing")}>
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}Empezar a preparar
              </Button>
            )}
            {order.order_status === "preparing" && (
              <Button className="w-full" size="lg" disabled={updating} onClick={() => updateStatus("ready")}>
                {updating && <Loader2 className="w-4 h-4 animate-spin" />}Marcar como listo
              </Button>
            )}
            {order.order_status === "ready" && !isDelivery && (
              <Button className="w-full" size="lg" disabled={updating} onClick={() => updateStatus("completed")}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Entregado
              </Button>
            )}
            {order.order_status === "ready" && isDelivery && (
              <Button className="w-full" size="lg" disabled={updating} onClick={() => updateStatus("out_for_delivery")}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4" />}Salir a reparto
              </Button>
            )}
            {order.order_status === "out_for_delivery" && (
              <Button className="w-full" size="lg" disabled={updating} onClick={() => updateStatus("completed")}>
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Entregado
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showReject} onOpenChange={setShowReject}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar pedido</AlertDialogTitle>
            <AlertDialogDescription>Selecciona el motivo. El cliente verá que el pedido fue rechazado.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {REJECTION_REASONS.map(r => (
              <button key={r} onClick={() => setRejectReason(r)} className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors",
                rejectReason === r ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"
              )}>{r}</button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={updating} onClick={(e) => { e.preventDefault(); updateStatus("rejected", rejectReason); }}>
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rechazar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={cn("text-muted-foreground", bold && "text-foreground font-semibold")}>{label}</span>
      <span className={cn("text-foreground", bold && "font-heading font-bold text-lg")}>{value}</span>
    </div>
  );
}