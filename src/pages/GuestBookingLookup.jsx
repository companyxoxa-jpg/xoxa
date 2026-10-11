import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Clock, Loader2, Search, Store, UserRound } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStoreBranding } from "@/lib/storeContext";
import { formatServicePrice } from "@/lib/format";
import { STATE_LABELS } from "../../base44/shared/booking.js";

export default function GuestBookingLookup() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { business, loading: businessLoading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const [form, setForm] = useState({ reference: "", email: "", phone: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!form.reference.trim() || (!form.email.trim() && !form.phone.trim())) {
      setError("Introduce la referencia y el email o teléfono de la reserva.");
      return;
    }
    setLoading(true);
    try {
      const response = await base44.functions.invoke("BookingPublic", {
        action: "lookup", slug, reference: form.reference.trim(),
        email: form.email.trim() || undefined, phone: form.phone.trim() || undefined,
      });
      setResult(response.data.appointment);
    } catch (lookupError) {
      setError(lookupError.response?.data?.error || "No hemos podido encontrar una reserva con esos datos.");
    } finally {
      setLoading(false);
    }
  }

  if (businessLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button aria-label="Volver al negocio" onClick={() => navigate(`/store/${slug}`)} className="p-1 -ml-1 text-foreground">‹</button>
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-lg text-foreground">Consultar reserva</h1>
          <p className="text-xs text-muted-foreground truncate">{business?.business_name || "Negocio"}</p>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        {!result ? <>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: color + "15" }}>
              {business?.logo ? <img src={business.logo} alt="" className="w-full h-full rounded-2xl object-cover" /> : <Search className="w-7 h-7" style={{ color }} />}
            </div>
            <p className="text-sm text-muted-foreground">Introduce la referencia y el email o teléfono utilizado al reservar.</p>
          </div>
          {error && <div role="alert" className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">{error}</div>}
          <form onSubmit={lookup} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="booking-reference">Referencia *</Label><Input id="booking-reference" value={form.reference} onChange={event => setForm({ ...form, reference: event.target.value })} placeholder="Referencia de la reserva" className="h-12" /></div>
            <div className="space-y-1.5"><Label htmlFor="booking-email">Email</Label><Input id="booking-email" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="tu@ejemplo.com" className="h-12" /></div>
            <p className="text-center text-xs text-muted-foreground">o</p>
            <div className="space-y-1.5"><Label htmlFor="booking-phone">Teléfono</Label><Input id="booking-phone" type="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="600 123 456" className="h-12" /></div>
            <button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: color }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> Consultar reserva</>}
            </button>
          </form>
        </> : <div className="space-y-4">
          <div className="text-center py-4"><div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: color + "15" }}><CalendarDays className="w-7 h-7" style={{ color }} /></div><h2 className="font-heading font-bold text-lg text-foreground">{result.service_name}</h2><p className="text-sm text-muted-foreground">{result.business_name}</p></div>
          <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="font-semibold" style={{ color }}>{STATE_LABELS[result.status] || result.status}</p>
            <p className="flex items-center gap-2 text-sm"><UserRound className="w-4 h-4 text-muted-foreground" />{result.professional_name}</p>
            <p className="flex items-center gap-2 text-sm"><CalendarDays className="w-4 h-4 text-muted-foreground" />{result.date}</p>
            <p className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-muted-foreground" />{result.start_time}–{result.end_time} · {result.timezone}</p>
            <p className="font-semibold">{formatServicePrice(result.price, result.price_type)}</p>
            <p className="text-xs text-muted-foreground break-all">Referencia: {result.reference}</p>
          </section>
          <button onClick={() => { setResult(null); setError(""); }} className="w-full py-3 rounded-xl border border-border text-foreground font-medium">Consultar otra reserva</button>
          <button onClick={() => navigate(`/store/${slug}`)} className="w-full py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2" style={{ backgroundColor: color }}><Store className="w-4 h-4" /> Volver al negocio</button>
        </div>}
      </main>
    </div>
  );
}

