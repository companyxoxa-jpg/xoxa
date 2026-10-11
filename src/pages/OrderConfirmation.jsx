import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/format";
import { useStoreBranding } from "@/lib/storeContext";
import { Check, Loader2, Package, ChevronRight, ShoppingBag, Store as StoreIcon, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";

export default function OrderConfirmation() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authIsCustomer = isCustomer(user);
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("GetCustomerOrderDetail", { order_id: id, slug });
      setData(res.data);
    } catch (e) { navigate(`/store/${slug}/account/orders`, { replace: true }); }
    finally { setLoading(false); }
  }, [id, slug]);

  useEffect(() => { load(); }, [load]);

  if (loading || bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  if (!data?.order) return <p className="p-6">No se pudo cargar el pedido.</p>;
  const { order } = data;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: color + "15" }}>
          {business?.logo ? <img src={business.logo} alt="" className="w-full h-full rounded-2xl object-cover" /> : <StoreIcon className="w-7 h-7" style={{ color }} />}
        </div>
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6"><Check className="w-10 h-10 text-emerald-600" /></div>
        <h1 className="font-heading font-bold text-2xl text-foreground mb-2">¡Pedido recibido!</h1>
        <p className="text-sm text-muted-foreground mb-1">Tu pedido <span className="font-semibold text-foreground">{order.order_number}</span> en</p>
        <p className="text-sm text-muted-foreground mb-6">{business?.business_name}</p>

        <div className="bg-card border border-border rounded-2xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Total</span><span className="font-heading font-bold text-foreground">{formatCurrency(order.total)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fecha</span><span className="text-foreground">{order.scheduled_date}</span></div>
        </div>

        <div className="space-y-2">
          <Link to={`/store/${slug}/account/orders/${order.id}?new=1`} className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl text-white font-medium" style={{ backgroundColor: color }}>
            <span className="flex items-center gap-2"><Package className="w-5 h-5" />Ver mi pedido</span><ChevronRight className="w-5 h-5" />
          </Link>
          {!authIsCustomer && (
            <>
              <p className="text-sm text-muted-foreground pt-2">Crea tu cuenta en {business?.business_name || "esta tienda"} para guardar tus pedidos y comprar más rápido la próxima vez.</p>
              <button
                onClick={() => {
                  sessionStorage.setItem("rinno_register_prefill", JSON.stringify({
                    first_name: order.customer_name?.split(" ")[0] || "",
                    last_name: order.customer_name?.split(" ").slice(1).join(" ") || "",
                    email: order.customer_email || "",
                    phone: order.customer_phone || "",
                  }));
                  navigate(`/store/${slug}/register`);
                }}
                className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl font-medium" style={{ backgroundColor: color + "15", color }}>
                <span className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Crear mi cuenta</span><ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <Link to={`/store/${slug}/account/orders`} className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl border border-border text-foreground font-medium">
            <span>Ver todos mis pedidos</span><ChevronRight className="w-5 h-5" />
          </Link>
          <Link to={`/store/${slug}`} className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl text-muted-foreground font-medium">
            <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" />Volver a la tienda</span><ChevronRight className="w-5 h-5" />
          </Link>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">Tecnología de <span className="font-semibold">RINNO</span></p>
      </div>
    </div>
  );
}
