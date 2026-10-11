import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_LABELS = { pending: "Pendiente", accepted: "Aceptado", preparing: "Preparando", ready: "Listo", out_for_delivery: "En reparto", completed: "Entregado", cancelled: "Cancelado", rejected: "Rechazado" };
const STATUS_STYLES = { pending: "bg-amber-500/15 text-amber-400", accepted: "bg-blue-500/15 text-blue-400", preparing: "bg-indigo-500/15 text-indigo-400", ready: "bg-cyan-500/15 text-cyan-400", out_for_delivery: "bg-violet-500/15 text-violet-400", completed: "bg-emerald-500/15 text-emerald-400", cancelled: "bg-rose-500/15 text-rose-400", rejected: "bg-rose-500/15 text-rose-400" };

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const c = await base44.entities.Customer.get(id);
      setCustomer(c);
      if (c.phone) {
        const ords = await base44.entities.Order.filter({ business_id: c.business_id, customer_phone: c.phone }, "-created_date", 50);
        setOrders(ords);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!customer) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-sm text-muted-foreground mb-4">Cliente no encontrado.</p>
      <Link to="/customers"><Button variant="outline">Volver</Button></Link>
    </div>
  );

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/customers")} className="p-2 -ml-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="font-heading font-bold text-xl text-foreground">{customer.first_name} {customer.last_name}</h1>
      </div>

      <div className="px-4 md:px-8 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-foreground"><Phone className="w-4 h-4 text-muted-foreground" />{customer.phone}</a>
          {customer.email && <p className="flex items-center gap-2 text-sm text-foreground"><Mail className="w-4 h-4 text-muted-foreground" />{customer.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Pedidos" value={customer.total_orders || 0} />
          <Stat label="Total gastado" value={formatCurrency(customer.total_spent)} />
          <Stat className="col-span-2 sm:col-span-1" label="Último pedido" value={customer.last_order_at ? formatDistanceToNow(new Date(customer.last_order_at), { locale: es }) : "—"} />
        </div>

        <div>
          <h2 className="font-heading font-semibold text-lg text-foreground mb-3">Historial de pedidos</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin pedidos registrados.</p>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <Link key={o.id} to={`/orders/${o.id}`} className="block bg-card border border-border rounded-2xl p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-heading font-bold text-foreground">{o.order_number}</span>
                      <p className="text-xs text-muted-foreground">{o.scheduled_date} · {o.scheduled_time_start}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-foreground">{formatCurrency(o.total)}</span>
                      <span className={cn("ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full", STATUS_STYLES[o.order_status])}>{STATUS_LABELS[o.order_status]}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className }) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl p-3", className)}>
      <p className="font-heading font-bold text-lg text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
