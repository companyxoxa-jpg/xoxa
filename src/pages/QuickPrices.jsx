import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getProductEmoji } from "@/lib/productEmoji";
import { EmptyState } from "@/components/business/EmptyState";
import { ArrowLeft, Loader2, Save, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QuickPrices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [originalMap, setOriginalMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const bid = getBusinessId(user);

  const loadData = useCallback(async () => {
    if (!bid) { setLoading(false); return; }
    try {
      const [prods, cats] = await Promise.all([
        base44.entities.Product.filter({ business_id: bid, status: "active" }, "name", 200),
        base44.entities.Category.filter({ business_id: bid }, "sort_order", 50),
      ]);
      setProducts(prods);
      setCategories(cats);
      const pm = {};
      prods.forEach(p => { pm[p.id] = (p.price / 100).toFixed(2).replace(".", ","); });
      setPriceMap(pm);
      setOriginalMap({ ...pm });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [bid]);

  useEffect(() => { loadData(); }, [loadData]);

  function setPrice(id, value) {
    setPriceMap(prev => ({ ...prev, [id]: value }));
  }

  const changedIds = Object.keys(priceMap).filter(id => priceMap[id] !== originalMap[id]);
  const hasChanges = changedIds.length > 0;

  async function handleSave() {
    const updates = changedIds.map(id => ({ id, price: priceMap[id] })).filter(u => {
      const v = Number(u.price.replace(",", "."));
      return !isNaN(v) && v >= 0;
    });
    if (updates.length === 0) return;
    setSaving(true);
    try {
      await base44.functions.invoke('ManageProduct', { action: 'bulk_price_update', price_updates: updates });
      const newOriginal = { ...originalMap };
      updates.forEach(u => { newOriginal[u.id] = priceMap[u.id]; });
      setOriginalMap(newOriginal);
      toast({ title: "Precios actualizados", description: `${updates.length} producto(s) actualizado(s)` });
    } catch (e) {
      toast({ title: "Error", description: "No pudimos guardar los precios. Inténtalo nuevamente.", variant: "destructive" });
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/catalog")} className="p-2 -ml-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-xl text-foreground">Precios de hoy</h1>
          <p className="text-xs text-muted-foreground">{hasChanges ? `${changedIds.length} cambio(s) sin guardar` : "Todos los precios guardados"}</p>
        </div>
      </div>

      <div className="px-4 md:px-8 mt-2">
        {products.length === 0 ? (
          <EmptyState icon={Tag} title="Sin productos" description="No hay productos para editar precios." />
        ) : (
          <div className="space-y-2">
            {products.map(p => {
              const emoji = getProductEmoji(p.name, p.category_id, categories);
              const changed = priceMap[p.id] !== originalMap[p.id];
              return (
                <div key={p.id} className={cn("bg-card border rounded-2xl p-3 flex items-center gap-3", changed ? "border-primary" : "border-border")}>
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">{emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.unit_type}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      type="text" inputMode="decimal"
                      value={priceMap[p.id] || ""}
                      onChange={e => setPrice(p.id, e.target.value)}
                      className="w-24 text-right font-medium"
                    />
                    <span className="text-sm text-muted-foreground">€</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 md:left-[260px] bg-card border-t border-border p-4 z-30">
          <Button className="w-full" size="lg" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar {changedIds.length} precio(s)
          </Button>
        </div>
      )}
    </div>
  );
}