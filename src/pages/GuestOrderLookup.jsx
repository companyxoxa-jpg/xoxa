import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Package, Clock, MapPin } from "lucide-react";
import { useStoreBranding } from "@/lib/storeContext";
import { formatCurrency, getFulfillmentMeta } from "@/lib/format";

// Guest order lookup — requires order_number + (email OR phone).
// Validation is exclusively backend-side. Never reveals why a lookup failed.
export default function GuestOrderLookup() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { business, loading: bizLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [form, setForm] = useState({ order_number: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const statusLabels = {
    pending: "Esperando confirmación", accepted: "Pedido aceptado", preparing: "Preparando tu pedido",
    ready: "Listo", out_for_delivery: "En reparto", completed: "Pedido completado",
    cancelled: "Cancelado", rejected: "No aceptado",
  };
  const paymentLabels = { cash_on_delivery: "Pagar al recibir", card_on_delivery: "Tarjeta al recibir" };

  async function handleLookup(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!form.order_number.trim()) { setError("Introduce el número de pedido"); return; }
    if (!form.email.trim() && !form.phone.trim()) { setError("Introduce el email o teléfono utilizado al comprar"); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("GuestOrderLookup", {
        slug, order_number: form.order_number.trim(),
        email: form.email.trim() || undefined, phone: form.phone.trim() || undefined,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "No hemos podido encontrar un pedido con esos datos.");
    } finally { setLoading(false); }
  }

  if (bizLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/store/${slug}`)} className="p-1 -ml-1 text-foreground">‹</button>
        <h1 className="font-heading font-bold text-lg text-foreground">Consultar mi pedido</h1>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {!result && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: color + "15" }}>
                <Search className="w-7 h-7" style={{ color }} />
              </div>
              <p className="text-sm text-muted-foreground">Introduce el número de pedido y el email o teléfono que usaste al comprar.</p>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">{error}</div>}
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Número de pedido *</Label>
                <Input value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} placeholder="RF-1001" className="h-12" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@ejemplo.com" className="h-12" />
              </div>
              <p className="text-center text-xs text-muted-foreground">o</p>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="600 123 456" className="h-12" />
              </div>
              <button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: color }}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Consultar pedido</>}
              </button>
            </form>
          </>
        )}

        {result && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: color + "15" }}>
                <Package className="w-7 h-7" style={{ color }} />
              </div>
              <p className="font-heading font-bold text-lg text-foreground">Pedido {result.order_number}</p>
              <p className="text-sm text-muted-foreground">{result.business_name}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${["cancelled", "rejected"].includes(result.order_status) ? "bg-rose-500" : result.order_status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-sm font-medium text-foreground">{statusLabels[result.order_status] || result.order_status}</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Clock className="w-4 h-4" /> {result.scheduled_date} · {result.scheduled_time_start}–{result.scheduled_time_end}</p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {getFulfillmentMeta(result.fulfillment_type).label}{result.delivery_address ? ` · ${result.delivery_address}` : ""}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl divide-y divide-border">
              {result.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div><p className="text-sm font-medium text-foreground">{item.product_name_snapshot}</p><p className="text-xs text-muted-foreground">{item.quantity} {item.unit_type} × {formatCurrency(item.unit_price)}</p></div>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(result.subtotal)}</span></div>
                {result.delivery_fee > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Entrega</span><span>{formatCurrency(result.delivery_fee)}</span></div>}
                <div className="flex justify-between pt-1.5 border-t border-border"><span className="font-heading font-bold">Total</span><span className="font-heading font-bold">{formatCurrency(result.total)}</span></div>
              </div>
            </div>

            <button onClick={() => navigate(`/track/${result.tracking_token}`)} className="w-full h-12 rounded-xl text-white font-semibold" style={{ backgroundColor: color }}>Ver seguimiento completo</button>
            <button onClick={() => { setResult(null); setError(""); }} className="w-full py-3 rounded-xl border border-border text-foreground font-medium">Consultar otro pedido</button>
          </div>
        )}
      </div>
    </div>
  );
}