import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatCurrency, formatUnitPrice, getFulfillmentMeta } from "@/lib/format";
import { getProductEmoji } from "@/lib/productEmoji";
import { Check, Clock, Package, Truck, Loader2, XCircle, MapPin, ShoppingBag } from "lucide-react";

const allSteps = [
  { key: "pending", label: "Pedido recibido", icon: Check },
  { key: "accepted", label: "Aceptado", icon: Check },
  { key: "preparing", label: "Preparando", icon: Clock },
  { key: "ready", label: "Listo", icon: Package },
  { key: "out_for_delivery", label: "En reparto", icon: Truck },
  { key: "completed", label: "Entregado", icon: Check },
];

const statusOrder = ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed"];

export default function TrackOrder() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await base44.functions.invoke("TrackOrder", { token });
        if (!active) return;
        setOrder(res.data);
        if (res.data?.business_name) {
          document.title = `Pedido ${res.data.order_number} · ${res.data.business_name}`;
        }
      } catch (e) {
        if (!active) return;
        setError(e.response?.data?.error || "Pedido no encontrado");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 12000);
    return () => { active = false; clearInterval(interval); };
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center">
        <XCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-lg font-heading font-bold text-foreground mb-1">Pedido no encontrado</p>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button onClick={() => navigate("/store/rinno-fresh")} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Volver a la tienda</button>
      </div>
    );
  }

  const isCancelled = order.order_status === "cancelled" || order.order_status === "rejected";
  const isPickup = order.fulfillment_type === "pickup";
  const steps = isPickup ? allSteps.filter(s => s.key !== "out_for_delivery") : allSteps;
  const currentStepIndex = isCancelled ? -1 : statusOrder.indexOf(order.order_status);
  const isNew = order.order_status === "pending";
  const fmeta = getFulfillmentMeta(order.fulfillment_type);

  const paymentLabels = { cash_on_delivery: "Pagar al recibir", card_on_delivery: "Tarjeta al recibir", online_payment: "Pago online" };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Confirmation banner */}
      <div className="px-4 pt-6 pb-4 text-center">
        {isNew ? (
          <>
            <div className="text-4xl mb-2">🎉</div>
            <h1 className="text-2xl font-heading font-bold text-foreground">¡Pedido recibido!</h1>
            <p className="text-base font-semibold text-primary mt-1">Pedido #{order.order_number}</p>
            <p className="text-sm text-muted-foreground mt-1">Tu pedido ha sido enviado a {order.business_name}.</p>
          </>
        ) : isCancelled ? (
          <>
            <div className="text-4xl mb-2">😔</div>
            <h1 className="text-xl font-heading font-bold text-foreground">Pedido {order.order_number}</h1>
            <p className="text-sm text-rose-600 mt-2">El comercio no ha podido aceptar este pedido.</p>
          </>
        ) : order.order_status === "completed" ? (
          <>
            <div className="text-4xl mb-2">✅</div>
            <h1 className="text-2xl font-heading font-bold text-foreground">¡Pedido entregado!</h1>
            <p className="text-base font-semibold text-primary mt-1">#{order.order_number}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-heading font-bold text-foreground">Tu pedido</h1>
            <p className="text-base font-semibold text-primary mt-1">#{order.order_number}</p>
          </>
        )}
      </div>

      {/* Status pill */}
      {!isCancelled && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-amber-50 border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              {order.order_status === "pending" ? "Esperando confirmación del comercio" :
               order.order_status === "accepted" ? "Pedido aceptado" :
               order.order_status === "preparing" ? "Preparando tu pedido" :
               order.order_status === "ready" ? (isPickup ? "Listo para recoger" : "Listo para entrega") :
               order.order_status === "out_for_delivery" ? "En reparto" :
               order.order_status === "completed" ? "Pedido completado" : order.order_status}
            </span>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5">
          {steps.map((step, i) => {
            const isDone = !isCancelled && i <= currentStepIndex;
            const isCurrent = !isCancelled && i === currentStepIndex;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${isDone ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary/20 text-primary border-2 border-primary" : "bg-muted text-muted-foreground"}`}>
                    <StepIcon className="w-4 h-4" />
                  </div>
                  {i < steps.length - 1 && <div className={`w-0.5 h-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
                </div>
                <div className="pt-1.5 pb-2">
                  <p className={`text-sm font-medium ${isDone || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery info */}
      <div className="px-4 mb-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-heading font-bold text-foreground mb-3">Entrega</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Método:</span>
              <span className="font-medium text-foreground">{fmeta.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Fecha:</span>
              <span className="font-medium text-foreground">{order.scheduled_date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Horario:</span>
              <span className="font-medium text-foreground">{order.scheduled_time_start} – {order.scheduled_time_end}</span>
            </div>
            {order.delivery_address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-foreground">{order.delivery_address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="px-4 mb-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="text-sm font-heading font-bold text-foreground mb-3">Productos</h2>
          <div className="divide-y divide-border">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0">
                  {getProductEmoji(item.product_name_snapshot)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.product_name_snapshot}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} {item.unit_type} × {formatUnitPrice(item.unit_price, item.unit_type)}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            {order.delivery_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Entrega</span><span>{formatCurrency(order.delivery_fee)}</span></div>}
            <div className="flex justify-between pt-1.5 border-t border-border"><span className="font-heading font-bold text-foreground">Total</span><span className="font-heading font-bold text-foreground">{formatCurrency(order.total)}</span></div>
          </div>
        </div>
      </div>

      {/* Customer + payment */}
      <div className="px-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium text-foreground">{order.customer_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pago</span><span className="font-medium text-foreground">{paymentLabels[order.payment_method] || order.payment_method}</span></div>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-4 space-y-3">
        <button onClick={() => window.location.reload()} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm">Seguir mi pedido</button>
        <button onClick={() => navigate(`/store/${order.business_slug || "rinno-fresh"}`)} className="w-full py-3.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2">
          <ShoppingBag className="w-4 h-4" /> Volver a la tienda
        </button>
      </div>

      <footer className="px-4 py-8 text-center mt-4">
        <p className="text-xs text-muted-foreground">Tecnología de <span className="font-semibold">RINNO</span></p>
      </footer>
    </div>
  );
}