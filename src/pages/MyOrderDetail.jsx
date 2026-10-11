import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getStatusMeta, getFulfillmentMeta } from "@/lib/format";
import { getProductEmoji } from "@/lib/productEmoji";
import { useStoreBranding } from "@/lib/storeContext";
import StoreAccountHeader from "@/components/store/StoreAccountHeader";
import { Loader2, MapPin, Clock, CreditCard, Check } from "lucide-react";

const STATUS_FLOW = {
  pending: { label: "Pedido recibido", icon: Check }, accepted: { label: "Aceptado", icon: Check },
  preparing: { label: "Preparando", icon: Clock }, ready: { label: "Listo", icon: Check },
  out_for_delivery: { label: "En reparto", icon: Check }, completed: { label: "Entregado", icon: Check },
};

export default function MyOrderDetail() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") setIsNew(true);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("GetCustomerOrderDetail", { order_id: id, slug });
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id, slug]);

  useEffect(() => { load(); }, [load]);

  async function handleReorder() {
    setReordering(true);
    try {
      const res = await base44.functions.invoke("PrepareReorder", { order_id: id, slug });
      const { cart_items, business_slug, primary_color, unavailable } = res.data;
      if (cart_items.length === 0) { navigate(`/store/${slug}/account/orders`); return; }
      localStorage.setItem("rinno_cart", JSON.stringify({
        items: cart_items.map(item => ({ product_id: item.product_id, name: item.name, price: item.price, unit_type: item.unit_type, unit_label: item.unit_label, quantity: item.quantity, image: item.image, origin: item.origin, business_id: item.business_id })),
        businessId: cart_items[0].business_id, businessSlug: business_slug, primaryColor: primary_color || color,
      }));
      navigate(`/store/${business_slug}/cart`);
    } catch (e) { console.error(e); }
    finally { setReordering(false); }
  }

  if (loading || bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;
  if (!data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <p className="text-sm text-muted-foreground mb-4">Pedido no encontrado.</p>
      <Link to={`/store/${slug}/account/orders`} className="font-medium" style={{ color }}>Volver a mis pedidos</Link>
    </div>
  );

  const { order, items } = data;
  const status = getStatusMeta(order.order_status);
  const fmeta = getFulfillmentMeta(order.fulfillment_type);
  const flowOrder = order.fulfillment_type === "own_delivery" ? ["pending", "accepted", "preparing", "ready", "out_for_delivery", "completed"] : ["pending", "accepted", "preparing", "ready", "completed"];
  const currentStep = flowOrder.indexOf(order.order_status);
  const isCancelled = ["cancelled", "rejected"].includes(order.order_status);

  return (
    <div className="min-h-screen bg-background pb-8">
      <StoreAccountHeader business={business} slug={slug} primaryColor={color} onBack={() => navigate(`/store/${slug}/account/orders`)} title={order.order_number} />
      {isNew && (
        <div className="mx-4 mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2"><Check className="w-6 h-6 text-emerald-600" /></div>
          <p className="font-heading font-bold text-foreground">¡Pedido recibido!</p><p className="text-sm text-muted-foreground">Pedido {order.order_number}</p>
        </div>
      )}
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-medium text-foreground mb-3">Estado del pedido</p>
          {isCancelled ? (
            <div className="flex items-center gap-2 text-rose-600"><span className="text-sm font-medium">{order.order_status === "rejected" ? "Rechazado" : "Cancelado"}</span></div>
          ) : (
            <div className="flex items-center justify-between">
              {flowOrder.map((step, i) => {
                const meta = STATUS_FLOW[step] || { label: step, icon: Check };
                const done = i <= currentStep; const Icon = meta.icon;
                return (
                  <div key={step} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${done ? "text-white" : "bg-muted text-muted-foreground"}`} style={done ? { backgroundColor: color } : {}}><Icon className="w-4 h-4" /></div>
                    <span className={`text-[10px] text-center ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-medium text-foreground mb-2">{business?.business_name}</p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{order.scheduled_date} · {order.scheduled_time_start}–{order.scheduled_time_end}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{fmeta.label}{order.delivery_address ? ` · ${order.delivery_address}` : ""}{order.delivery_city ? `, ${order.delivery_city}` : ""}</p>
            <p className="flex items-center gap-2"><CreditCard className="w-4 h-4" />{order.payment_method === "cash_on_delivery" ? "Pago en efectivo al recibir" : "Tarjeta al recibir"} · {order.payment_status === "paid" ? "Pagado" : "Pendiente"}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0">{getProductEmoji(item.product_name_snapshot)}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{item.product_name_snapshot}</p><p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)}</p></div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          {order.delivery_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Entrega</span><span>{formatCurrency(order.delivery_fee)}</span></div>}
          <div className="flex justify-between pt-1.5 border-t border-border"><span className="font-heading font-bold">Total</span><span className="font-heading font-bold">{formatCurrency(order.total)}</span></div>
        </div>
        {order.customer_notes && <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground mb-1">Notas</p><p className="text-sm text-foreground">{order.customer_notes}</p></div>}
        <button onClick={handleReorder} disabled={reordering} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-medium disabled:opacity-50" style={{ backgroundColor: color }}>
          {reordering ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Repetir pedido
        </button>
      </div>
    </div>
  );
}