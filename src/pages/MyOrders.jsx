import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatCurrency, getStatusMeta, getFulfillmentMeta } from "@/lib/format";
import { useStoreBranding } from "@/lib/storeContext";
import StoreAccountHeader from "@/components/store/StoreAccountHeader";
import { Package, RefreshCw, Link2, Loader2, AlertCircle } from "lucide-react";

const STATUS_BADGES = {
  amber: "bg-amber-50 text-amber-700", blue: "bg-blue-50 text-blue-700",
  indigo: "bg-indigo-50 text-indigo-700", emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700", slate: "bg-slate-50 text-slate-700",
};

export default function MyOrders() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [guestOrders, setGuestOrders] = useState(null);
  const [reordering, setReordering] = useState(null);
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [ordersRes, linkRes] = await Promise.all([
        base44.functions.invoke("GetCustomerOrders", { slug }),
        base44.functions.invoke("LinkPreviousOrders", { action: "check", slug }),
      ]);
      setOrders(ordersRes.data.orders || []);
      if (linkRes.data.found_count > 0) setGuestOrders(linkRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLink() {
    setLinking(true);
    try {
      const res = await base44.functions.invoke("LinkPreviousOrders", { action: "link", slug });
      setToast({ type: "success", message: `${res.data.linked_count} pedido(s) vinculado(s)` });
      setGuestOrders(null);
      loadData();
    } catch (e) { setToast({ type: "error", message: "No se pudieron vincular" }); }
    finally { setLinking(false); }
  }

  async function handleReorder(orderId) {
    setReordering(orderId);
    try {
      const res = await base44.functions.invoke("PrepareReorder", { order_id: orderId, slug });
      const { cart_items, business_slug, primary_color, unavailable } = res.data;
      if (cart_items.length === 0) { setToast({ type: "error", message: "Los productos de este pedido ya no están disponibles" }); return; }
      localStorage.setItem("rinno_cart", JSON.stringify({
        items: cart_items.map(item => ({ product_id: item.product_id, name: item.name, price: item.price, unit_type: item.unit_type, unit_label: item.unit_label, quantity: item.quantity, image: item.image, origin: item.origin, business_id: item.business_id })),
        businessId: cart_items[0].business_id, businessSlug: business_slug, primaryColor: primary_color || color,
      }));
      if (unavailable.length > 0) setToast({ type: "warn", message: `${unavailable.length} producto(s) ya no disponible(s)` });
      navigate(`/store/${business_slug}/cart`);
    } catch (e) { setToast({ type: "error", message: "No se pudo preparar el pedido" }); }
    finally { setReordering(null); }
  }

  if (loading || bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  return (
    <div className="min-h-screen bg-background">
      <StoreAccountHeader business={business} slug={slug} primaryColor={color} onBack={() => navigate(`/store/${slug}/account`)} title="Mis pedidos" />
      <div className="px-4 py-4 max-w-lg mx-auto">
        {toast && (
          <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-50 text-emerald-700" : toast.type === "warn" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
            <AlertCircle className="w-4 h-4 shrink-0" />{toast.message}
          </div>
        )}
        {guestOrders && (
          <div className="mb-4 p-4 rounded-2xl" style={{ backgroundColor: color + "0d", border: `1px solid ${color}33` }}>
            <div className="flex items-center gap-2 mb-2"><Link2 className="w-4 h-4" style={{ color }} /><p className="text-sm font-medium text-foreground">Hemos encontrado {guestOrders.found_count} pedido(s) anterior(es) en {guestOrders.business_name}</p></div>
            <p className="text-xs text-muted-foreground mb-3">Pedidos realizados como invitado con tu mismo email verificado.</p>
            <button onClick={handleLink} disabled={linking} className="w-full py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: color }}>{linking ? "Vinculando..." : "Vincular a mi cuenta"}</button>
          </div>
        )}
        {orders.length === 0 && !guestOrders ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Package className="w-8 h-8 text-muted-foreground" /></div>
            <p className="font-medium text-foreground mb-1">Todavía no tienes pedidos en {business?.business_name || "esta tienda"}</p>
            <p className="text-sm text-muted-foreground mb-6">Cuando hagas tu primer pedido aparecerá aquí.</p>
            <Link to={`/store/${slug}`} className="px-6 py-2.5 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: color }}>Explorar la tienda</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => {
              const status = getStatusMeta(o.order_status);
              const fmeta = getFulfillmentMeta(o.fulfillment_type);
              return (
                <div key={o.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-heading font-bold text-foreground">{o.order_number}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGES[status.color] || STATUS_BADGES.slate}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span>{new Date(o.created_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span><span>·</span>
                    <span>{fmeta.label}</span><span>·</span><span className="font-medium text-foreground">{formatCurrency(o.total)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/store/${slug}/account/orders/${o.id}`} className="flex-1 py-2 rounded-xl border border-border text-sm font-medium text-foreground text-center hover:bg-muted transition-colors">Ver pedido</Link>
                    <button onClick={() => handleReorder(o.id)} disabled={reordering === o.id} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: color }}>
                      {reordering === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Repetir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}