import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { formatUnitPrice } from "@/lib/format";
import { getProductEmoji } from "@/lib/productEmoji";
import { EmptyState } from "@/components/business/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search, Package, Plus, Tag, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Catalog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const bid = getBusinessId(user);

  const loadData = useCallback(async () => {
    if (!bid) { setLoading(false); return; }
    try {
      const [prods, cats] = await Promise.all([
        base44.entities.Product.filter({ business_id: bid }, "sort_order", 200),
        base44.entities.Category.filter({ business_id: bid }, "sort_order", 50),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [bid]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleAvailability(product) {
    try {
      await base44.functions.invoke('ManageProduct', {
        action: 'update', product_id: product.id, product_data: { is_available: !product.is_available },
      });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
      toast({ title: product.is_available ? "Marcado como agotado" : "Marcado como disponible", description: product.name });
    } catch (e) {
      toast({ title: "Error", description: "No pudimos actualizar el producto.", variant: "destructive" });
    }
  }

  const filtered = products.filter(p => {
    if (filter === "available" && !p.is_available) return false;
    if (filter === "soldout" && p.is_available) return false;
    if (filter === "offers" && !p.compare_at_price) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-6 pb-2 flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl text-foreground">Productos</h1>
        <Link to="/catalog/new"><Button size="sm"><Plus className="w-4 h-4" />Nuevo</Button></Link>
      </div>

      <div className="px-4 md:px-8 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="px-4 md:px-8 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { id: "all", label: "Todos" },
            { id: "available", label: "Disponibles" },
            { id: "soldout", label: "Agotados" },
            { id: "offers", label: "Ofertas" },
          ].map(flt => (
            <button key={flt.id} onClick={() => setFilter(flt.id)} className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              filter === flt.id ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/25" : "bg-muted text-muted-foreground"
            )}>{flt.label}</button>
          ))}
          <Link to="/catalog/prices" className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-accent text-accent-foreground flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />Precios de hoy
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-8 mt-2">
        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="Sin productos" description="Crea tu primer producto para empezar a vender." action={<Link to="/catalog/new"><Button size="sm" className="mt-4"><Plus className="w-4 h-4" />Nuevo producto</Button></Link>} />
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
              const emoji = getProductEmoji(p.name, p.category_id, categories);
              const cat = categories.find(c => c.id === p.category_id);
              return (
                <div key={p.id} className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">{emoji}</div>
                  <Link to={`/catalog/${p.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{formatUnitPrice(p.price, p.unit_label || p.unit_type)}{cat && ` · ${cat.name}`}</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs font-semibold", p.is_available ? "text-emerald-400" : "text-rose-400")}>
                      {p.is_available ? "Disponible" : "Agotado"}
                    </span>
                    <Switch checked={p.is_available} onCheckedChange={() => toggleAvailability(p)} />
                    <Link to={`/catalog/${p.id}`} className="p-2 rounded-lg hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></Link>
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