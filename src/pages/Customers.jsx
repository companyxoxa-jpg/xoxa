import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/lib/format";
import { EmptyState } from "@/components/business/EmptyState";
import { Loader2, Search, Users, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const bid = getBusinessId(user);

  const loadData = useCallback(async () => {
    if (!bid) { setLoading(false); return; }
    try {
      const data = await base44.entities.Customer.filter({ business_id: bid }, "-last_order_at", 200);
      setCustomers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [bid]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = customers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.first_name?.toLowerCase().includes(q) || c.last_name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-6 pb-2">
        <h1 className="font-heading font-bold text-2xl text-foreground">Clientes</h1>
      </div>

      <div className="px-4 md:px-8 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="px-4 md:px-8 mt-2">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Sin clientes" description="Los clientes aparecerán aquí cuando realicen su primer pedido." />
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <Link key={c.id} to={`/customers/${c.id}`} className="block bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{c.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-heading font-bold text-foreground">{formatCurrency(c.total_spent)}</p>
                    <p className="text-xs text-muted-foreground">{c.total_orders} pedido(s)</p>
                  </div>
                </div>
                {c.last_order_at && (
                  <p className="text-xs text-muted-foreground mt-2">Último pedido: hace {formatDistanceToNow(new Date(c.last_order_at), { locale: es })}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}