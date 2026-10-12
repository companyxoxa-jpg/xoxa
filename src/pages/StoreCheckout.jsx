import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { isCustomer } from "@/lib/rinno";
import { formatCurrency, formatUnitPrice, getFulfillmentMeta } from "@/lib/format";
import { getProductEmoji } from "@/lib/productEmoji";
import { zonedParts, wallToUTC } from '../../base44/shared/booking.js';
import { ArrowLeft, Loader2, Store as StoreIcon, Package, Truck, Check, AlertCircle } from "lucide-react";

function getAvailableDates(slots, fulfillmentType, settings, timezone = 'Europe/Madrid') {
  const maxDays = settings.max_future_days || 7;
  const minLead = settings.min_lead_time_minutes || 60;
  const now = new Date();
  const today = zonedParts(now, timezone).date;
  const dates = [];
  for (let i = 0; i <= maxDays; i++) {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getUTCDay();
    const daySlots = slots.filter(s => s.day_of_week === dayOfWeek && s.fulfillment_type === fulfillmentType);
    if (daySlots.length === 0) continue;
    const available = daySlots.filter(s => {
      const start = wallToUTC(dateStr, s.start_time, timezone);
      return start !== null && start > now.getTime() + minLead * 60000;
    });
    if (available.length > 0) {
      dates.push({
        date: dateStr,
        label: i === 0 ? "Hoy" : i === 1 ? "Mañana" : date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", timeZone: 'UTC' }),
        slots: available.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      });
    }
  }
  return dates;
}

function Section({ title, children, color }) {
  return (
    <div className="px-4 py-4">
      <h2 className="font-heading font-bold text-base text-foreground mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function StoreCheckout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { items, total, clearCart, primaryColor } = useCart();
  const { user, isLoadingAuth } = useAuth();
  const authIsCustomer = isCustomer(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const confirmRef = useRef(false);

  const [fulfillmentType, setFulfillmentType] = useState("pickup");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [customer, setCustomer] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "", city: "", postal_code: "", notes: "" });
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const color = primaryColor || "#16A34A";
  const checkoutPath = `/store/${slug}/checkout`;
  const returnTo = encodeURIComponent(checkoutPath);
  const loginPath = `/store/${slug}/login?returnTo=${returnTo}`;
  const registerPath = `/store/${slug}/register?returnTo=${returnTo}`;

  useEffect(() => {
    if (items.length === 0) { navigate(`/store/${slug}`); return; }
    async function load() {
      try {
        const res = await base44.functions.invoke("GetStorefront", { slug });
        setData(res.data);
        const s = res.data.settings;
        if (!s.pickup_enabled && s.own_delivery_enabled) setFulfillmentType("own_delivery");
        else if (s.pickup_enabled) setFulfillmentType("pickup");
      } catch (e) {
        setError("No se pudo cargar la tienda");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Prefill customer data if authenticated
  useEffect(() => {
    if (authIsCustomer && user) {
      setCustomer(prev => ({
        ...prev,
        first_name: user.first_name || user.data?.first_name || prev.first_name,
        last_name: user.last_name || user.data?.last_name || prev.last_name,
        phone: user.phone || user.data?.phone || prev.phone,
        email: user.email || prev.email,
      }));
    }
  }, [user, authIsCustomer]);

  // Load saved addresses when delivery is selected
  useEffect(() => {
    if (authIsCustomer && fulfillmentType === "own_delivery") {
      base44.functions.invoke("ManageSavedAddress", { action: "list" })
        .then(res => setSavedAddresses(res.data.addresses || []))
        .catch(() => {});
    }
  }, [authIsCustomer, fulfillmentType]);

  const settings = data?.settings || {};
  const slots = data?.slots || [];

  const availableDates = useMemo(() => {
    if (!data) return [];
    return getAvailableDates(slots, fulfillmentType, settings, data.business.timezone || 'Europe/Madrid');
  }, [slots, fulfillmentType, settings, data]);

  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0].date);
      setSelectedSlot(null);
    }
  }, [availableDates]);

  const currentDateSlots = availableDates.find(d => d.date === selectedDate)?.slots || [];

  let deliveryFee = 0;
  if (fulfillmentType === "own_delivery") {
    deliveryFee = settings.delivery_fee || 0;
    if (settings.free_delivery_threshold && total >= settings.free_delivery_threshold) deliveryFee = 0;
  }
  const grandTotal = total + deliveryFee;
  const minOrder = settings.minimum_order || 0;
  const minNotMet = minOrder > 0 && total < minOrder;
  const remaining = minOrder - total;

  async function handleConfirm() {
    if (!authIsCustomer) {
      setError("Inicia sesión con una cuenta de cliente para realizar el pedido.");
      return;
    }
    if (confirmRef.current || submitting) return;
    confirmRef.current = true;

    if (!customer.first_name?.trim()) { setError("El nombre es obligatorio"); confirmRef.current = false; return; }
    if (!customer.phone?.trim()) { setError("El teléfono es obligatorio"); confirmRef.current = false; return; }
    if (fulfillmentType === "own_delivery" && !customer.address?.trim()) { setError("La dirección es obligatoria"); confirmRef.current = false; return; }
    if (!selectedDate || !selectedSlot) { setError("Selecciona un horario"); confirmRef.current = false; return; }
    if (minNotMet) { setError(`Te faltan ${formatCurrency(remaining)} para alcanzar el pedido mínimo`); confirmRef.current = false; return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("CreateOrder", {
        slug,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        fulfillment_type: fulfillmentType,
        scheduled_date: selectedDate,
        scheduled_time_start: selectedSlot.start_time,
        scheduled_time_end: selectedSlot.end_time,
        customer,
        payment_method: paymentMethod,
        marketing_consent: marketingConsent,
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        clearCart();
        navigate(`/store/${slug}/order-confirmed/${res.data.order_id}`, { replace: true });
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Error al crear el pedido");
    } finally {
      setSubmitting(false);
      confirmRef.current = false;
    }
  }

  if (loading || isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <StoreIcon className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!authIsCustomer) {
    const hasOtherSession = Boolean(user);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/store/${slug}/cart`)} aria-label="Volver al carrito" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading font-bold text-lg text-foreground">Finalizar compra</h1>
        </header>
        <main className="flex-1 flex items-center justify-center px-5 py-12">
          <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${color}15` }}>
              <StoreIcon className="h-7 w-7" style={{ color }} />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              {hasOtherSession ? "Cambia a una cuenta de cliente" : "Inicia sesión para pedir"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {hasOtherSession
                ? "La sesión actual es de gestión y no puede realizar pedidos. Cierra esa sesión e inicia con tu cuenta de cliente."
                : "Para confirmar tu pedido, inicia sesión o crea una cuenta de cliente. Tu carrito seguirá guardado."}
            </p>
            {hasOtherSession ? (
              <button
                type="button"
                onClick={() => base44.auth.logout(`${window.location.origin}${loginPath}`)}
                className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                Usar otra cuenta
              </button>
            ) : (
              <div className="mt-6 grid gap-3">
                <Link to={loginPath} className="rounded-xl px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
                  Iniciar sesión
                </Link>
                <Link to={registerPath} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted">
                  Crear cuenta de cliente
                </Link>
              </div>
            )}
            <Link to={`/store/${slug}/cart`} className="mt-5 inline-flex text-sm font-medium hover:underline" style={{ color }}>
              Volver al carrito
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(`/store/${slug}/cart`)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading font-bold text-lg text-foreground">Finalizar compra</h1>
      </header>

      {/* Delivery method */}
      <Section title="¿Cómo quieres recibirlo?">
        <div className="space-y-2">
          {settings.pickup_enabled && (
            <button onClick={() => { setFulfillmentType("pickup"); setSelectedSlot(null); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${fulfillmentType === "pickup" ? "border-2 bg-card" : "border-border bg-card"}`}
              style={fulfillmentType === "pickup" ? { borderColor: color } : {}}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
                <Package className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Recoger en tienda</p>
                <p className="text-xs text-muted-foreground">{data.business.address}</p>
              </div>
              <span className="text-sm font-semibold" style={{ color }}>Gratis</span>
            </button>
          )}
          {settings.own_delivery_enabled && (
            <button onClick={() => { setFulfillmentType("own_delivery"); setSelectedSlot(null); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${fulfillmentType === "own_delivery" ? "border-2 bg-card" : "border-border bg-card"}`}
              style={fulfillmentType === "own_delivery" ? { borderColor: color } : {}}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
                <Truck className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Entrega a domicilio</p>
                <p className="text-xs text-muted-foreground">{settings.max_delivery_radius_km ? `Hasta ${settings.max_delivery_radius_km} km` : "En tu zona"}</p>
              </div>
              <span className="text-sm font-semibold" style={{ color }}>
                {deliveryFee === 0 ? "Gratis" : formatCurrency(deliveryFee)}
              </span>
            </button>
          )}
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Schedule */}
      <Section title="¿Cuándo lo quieres?">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {availableDates.map(d => (
            <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedSlot(null); }}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${selectedDate === d.date ? "text-white" : "bg-muted text-muted-foreground"}`}
              style={selectedDate === d.date ? { backgroundColor: color } : {}}>
              {d.label}
            </button>
          ))}
          {availableDates.length === 0 && <p className="text-sm text-muted-foreground">No hay horarios disponibles.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {currentDateSlots.map(s => (
            <button key={s.id} onClick={() => setSelectedSlot(s)}
              className={`px-3 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${selectedSlot?.id === s.id ? "text-white border-transparent" : "border-border bg-card text-foreground"}`}
              style={selectedSlot?.id === s.id ? { backgroundColor: color } : {}}>
              {s.start_time} – {s.end_time}
            </button>
          ))}
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Customer info */}
      <Section title="Tus datos">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={customer.first_name} onChange={e => setCustomer({ ...customer, first_name: e.target.value })} placeholder="Nombre *" className="px-3 py-2.5 rounded-xl border border-border text-sm" />
            <input value={customer.last_name} onChange={e => setCustomer({ ...customer, last_name: e.target.value })} placeholder="Apellidos" className="px-3 py-2.5 rounded-xl border border-border text-sm" />
          </div>
          <input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="Teléfono *" className="w-full px-3 py-2.5 rounded-xl border border-border text-sm" />
          <input value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} placeholder="Email (opcional)" className="w-full px-3 py-2.5 rounded-xl border border-border text-sm" />
          {fulfillmentType === "own_delivery" && (
            <>
              {authIsCustomer && savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Direcciones guardadas:</p>
                  {savedAddresses.map(a => (
                    <button key={a.id} onClick={() => {
                      setSelectedAddressId(a.id);
                      setCustomer(prev => ({ ...prev, address: a.address, city: a.city || "", postal_code: a.postal_code || "", notes: a.delivery_notes || prev.notes }));
                    }} className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${selectedAddressId === a.id ? "" : "border-border"}`} style={selectedAddressId === a.id ? { borderColor: color } : {}}>
                      <p className="text-sm font-medium text-foreground">{a.label ? `${a.label} · ` : ""}{a.address}</p>
                      <p className="text-xs text-muted-foreground">{a.city} {a.postal_code}</p>
                    </button>
                  ))}
                </div>
              )}
              <input value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} placeholder="Dirección *" className="w-full px-3 py-2.5 rounded-xl border border-border text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={customer.city} onChange={e => setCustomer({ ...customer, city: e.target.value })} placeholder="Ciudad" className="px-3 py-2.5 rounded-xl border border-border text-sm" />
                <input value={customer.postal_code} onChange={e => setCustomer({ ...customer, postal_code: e.target.value })} placeholder="Código postal" className="px-3 py-2.5 rounded-xl border border-border text-sm" />
              </div>
            </>
          )}
          <textarea value={customer.notes} onChange={e => setCustomer({ ...customer, notes: e.target.value })} placeholder="Indicaciones (opcional)" rows={2} className="w-full px-3 py-2.5 rounded-xl border border-border text-sm resize-none" />
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: color }} />
            <span className="text-sm text-muted-foreground">Quiero recibir ofertas y novedades</span>
          </label>
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Payment */}
      <Section title="Método de pago">
        <div className="space-y-2">
          <button onClick={() => setPaymentMethod("cash_on_delivery")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === "cash_on_delivery" ? "border-2" : "border-border bg-card"}`}
            style={paymentMethod === "cash_on_delivery" ? { borderColor: color } : {}}>
            <span className="text-2xl">💵</span>
            <span className="text-sm font-semibold text-foreground flex-1 text-left">Pagar al recibir</span>
            {paymentMethod === "cash_on_delivery" && <Check className="w-5 h-5" style={{ color }} />}
          </button>
          <button onClick={() => setPaymentMethod("card_on_delivery")}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === "card_on_delivery" ? "border-2" : "border-border bg-card"}`}
            style={paymentMethod === "card_on_delivery" ? { borderColor: color } : {}}>
            <span className="text-2xl">💳</span>
            <span className="text-sm font-semibold text-foreground flex-1 text-left">Tarjeta al recibir</span>
            {paymentMethod === "card_on_delivery" && <Check className="w-5 h-5" style={{ color }} />}
          </button>
          <div className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border opacity-50">
            <span className="text-2xl">💳</span>
            <span className="text-sm font-semibold text-muted-foreground flex-1">Pagar online (próximamente)</span>
          </div>
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Summary */}
      <Section title="Revisa tu pedido">
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {items.map(i => (
            <div key={i.product_id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: color + "15" }}>
                {getProductEmoji(i.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.quantity} {i.unit_label} × {formatUnitPrice(i.price, i.unit_label)}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(Math.round(i.quantity * i.price))}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatCurrency(total)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Entrega</span><span className="font-medium">{deliveryFee === 0 ? "Gratis" : formatCurrency(deliveryFee)}</span></div>
          <div className="flex justify-between pt-1.5 border-t border-border"><span className="font-heading font-bold text-foreground">Total</span><span className="font-heading font-bold text-foreground text-lg">{formatCurrency(grandTotal)}</span></div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium">Entrega:</span> {getFulfillmentMeta(fulfillmentType).label}</p>
          <p><span className="font-medium">Fecha:</span> {selectedDate || "—"} · {selectedSlot ? `${selectedSlot.start_time}–${selectedSlot.end_time}` : "—"}</p>
          <p><span className="font-medium">Cliente:</span> {customer.first_name || "—"} · {customer.phone || "—"}</p>
          {fulfillmentType === "own_delivery" && customer.address && <p><span className="font-medium">Dirección:</span> {customer.address}</p>}
        </div>
      </Section>

      {minNotMet && (
        <div className="mx-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Te faltan {formatCurrency(remaining)} para alcanzar el pedido mínimo.
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-background to-transparent pb-4">
        <button onClick={handleConfirm} disabled={submitting || minNotMet}
          className="w-full max-w-2xl mx-auto py-4 rounded-2xl text-white font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: color }}>
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creando tu pedido...</>
          ) : (
            <>CONFIRMAR PEDIDO · {formatCurrency(grandTotal)}</>
          )}
        </button>
      </div>
    </div>
  );
}
