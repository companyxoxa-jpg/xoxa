import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

const UNIT_TYPES = [
  { value: "kg", label: "Kilo (kg)" },
  { value: "unit", label: "Unidad" },
  { value: "tray", label: "Bandeja" },
  { value: "bunch", label: "Manojo" },
  { value: "bag", label: "Bolsa" },
  { value: "box", label: "Caja" },
  { value: "gram", label: "Gramo" },
];

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category_id: "", price: "", compare_at_price: "",
    unit_type: "kg", quantity_step: "0.5", minimum_quantity: "0.5",
    origin: "", is_available: true, is_featured: false,
  });

  const bid = getBusinessId(user);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const p = await base44.entities.Product.get(id);
      setForm({
        name: p.name || "", description: p.description || "", category_id: p.category_id || "",
        price: p.price ? (p.price / 100).toFixed(2).replace(".", ",") : "",
        compare_at_price: p.compare_at_price ? (p.compare_at_price / 100).toFixed(2).replace(".", ",") : "",
        unit_type: p.unit_type || "kg", quantity_step: String(p.quantity_step || "0.5"),
        minimum_quantity: String(p.minimum_quantity || "0.5"),
        origin: p.origin || "", is_available: p.is_available ?? true, is_featured: p.is_featured ?? false,
      });
    } catch (e) { console.error(e); toast({ title: "Error", description: "Producto no encontrado.", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [id, toast]);

  const loadCategories = useCallback(async () => {
    if (!bid) return;
    try { setCategories(await base44.entities.Category.filter({ business_id: bid }, "sort_order", 50)); }
    catch (e) { console.error(e); }
  }, [bid]);

  useEffect(() => { loadCategories(); loadProduct(); }, [loadCategories, loadProduct]);

  function set(field, value) { setForm(prev => ({ ...prev, [field]: value })); }

  async function handleSave() {
    if (!form.name || !form.price) {
      toast({ title: "Faltan campos", description: "Nombre y precio son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const product_data = {
        name: form.name,
        description: form.description || null,
        category_id: form.category_id || null,
        price: Math.round(Number(form.price.replace(",", ".")) * 100),
        compare_at_price: form.compare_at_price ? Math.round(Number(form.compare_at_price.replace(",", ".")) * 100) : null,
        unit_type: form.unit_type,
        unit_label: UNIT_TYPES.find(u => u.value === form.unit_type)?.label.split(" ")[0].toLowerCase() || form.unit_type,
        quantity_step: Number(form.quantity_step) || 0.5,
        minimum_quantity: Number(form.minimum_quantity) || 0.5,
        origin: form.origin || null,
        is_available: form.is_available,
        is_featured: form.is_featured,
        status: "active",
      };
      const action = id ? 'update' : 'create';
      const payload = { action, product_data };
      if (id) payload.product_id = id;
      await base44.functions.invoke('ManageProduct', payload);
      toast({ title: id ? "Producto actualizado" : "Producto creado", description: form.name });
      navigate("/catalog");
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.error || "No pudimos guardar el producto.", variant: "destructive" });
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="pb-6">
      <div className="px-4 md:px-8 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/catalog")} className="p-2 -ml-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="font-heading font-bold text-xl text-foreground">{id ? "Editar producto" : "Nuevo producto"}</h1>
      </div>

      <div className="px-4 md:px-8 space-y-4 max-w-2xl">
        <Field label="Nombre"><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Tomate pera" /></Field>
        <Field label="Descripción"><Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Descripción del producto" rows={2} /></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            <Select value={form.category_id} onValueChange={v => set("category_id", v)}>
              <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Origen"><Input value={form.origin} onChange={e => set("origin", e.target.value)} placeholder="España" /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio (€)"><Input type="text" inputMode="decimal" value={form.price} onChange={e => set("price", e.target.value)} placeholder="1,89" /></Field>
          <Field label="Precio anterior (€)"><Input type="text" inputMode="decimal" value={form.compare_at_price} onChange={e => set("compare_at_price", e.target.value)} placeholder="2,49" /></Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Unidad">
            <Select value={form.unit_type} onValueChange={v => set("unit_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNIT_TYPES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Paso (cantidad)"><Input type="text" inputMode="decimal" value={form.quantity_step} onChange={e => set("quantity_step", e.target.value)} placeholder="0.5" /></Field>
          <Field label="Cant. mínima"><Input type="text" inputMode="decimal" value={form.minimum_quantity} onChange={e => set("minimum_quantity", e.target.value)} placeholder="0.5" /></Field>
        </div>

        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
          <div><p className="font-medium text-foreground text-sm">Disponible</p><p className="text-xs text-muted-foreground">Mostrar en la tienda</p></div>
          <Switch checked={form.is_available} onCheckedChange={v => set("is_available", v)} />
        </div>
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
          <div><p className="font-medium text-foreground text-sm">Destacado</p><p className="text-xs text-muted-foreground">Mostrar en "Frescos de hoy"</p></div>
          <Switch checked={form.is_featured} onCheckedChange={v => set("is_featured", v)} />
        </div>

        <div className="pt-2 space-y-2">
          <Button className="w-full" size="lg" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{id ? "Guardar cambios" : "Crear producto"}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/catalog")}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}
