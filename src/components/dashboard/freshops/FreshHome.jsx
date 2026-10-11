import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getBusinessId } from "@/lib/rinno";
import { formatCurrency } from "@/lib/format";
import { ShoppingBasket, PackageCheck, Clock3, Users, ArrowRight, Sprout } from "lucide-react";

export default function FreshHome({ business }) {
  const { user } = useAuth(); const bid = getBusinessId(user);
  const [orders,setOrders]=useState([]),[products,setProducts]=useState([]),[customers,setCustomers]=useState([]),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;Promise.all([base44.entities.Order.filter({business_id:bid},"-created_date",60),base44.entities.Product.filter({business_id:bid},"sort_order",200),base44.entities.Customer.filter({business_id:bid},"-created_date",200)]).then(([o,p,c])=>{if(active){setOrders(o);setProducts(p);setCustomers(c)}}).finally(()=>active&&setLoading(false));return()=>{active=false}},[bid]);
  const live=orders.filter(o=>["pending","accepted","preparing","ready"].includes(o.order_status));
  const today=orders.filter(o=>(o.created_date||"").slice(0,10)===new Date().toISOString().slice(0,10));
  const sales=today.reduce((sum,o)=>sum+(o.total||0),0);
  const fresh=products.filter(p=>p.is_available);
  return <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
    <header className="freshops-home-hero rounded-[28px] bg-[#dfff5b] text-[#17351f] p-6 sm:p-8 overflow-hidden relative"><Sprout className="absolute -right-5 -bottom-8 w-40 h-40 opacity-10"/><p className="text-[10px] font-black uppercase tracking-[.25em]">Mercado en vivo</p><h1 className="mt-2 text-3xl sm:text-5xl font-black tracking-[-.05em]">Buenos días,<br/>{business.business_name}.</h1><p className="mt-3 text-sm max-w-md opacity-75">Pedidos, producto fresco y clientes organizados para empezar la jornada.</p></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4"><Tile icon={ShoppingBasket} value={today.length} label="Cestas de hoy"/><Tile icon={Clock3} value={live.length} label="Por preparar"/><Tile icon={PackageCheck} value={fresh.length} label="Productos activos"/><Tile icon={Users} value={customers.length} label="Clientes"/></div>
    <div className="grid lg:grid-cols-[1.35fr_.65fr] gap-5 mt-7"><section><div className="flex items-center justify-between mb-3"><h2 className="font-bold text-xl">La cola de preparación</h2><Link to="/orders" className="text-sm font-bold text-primary">Ver pedidos →</Link></div>{loading?<p className="text-sm text-muted-foreground">Cargando…</p>:live.length?<div className="space-y-2">{live.slice(0,6).map((o,i)=><Link to={`/orders/${o.id}`} key={o.id} className="flex items-center gap-3 rounded-2xl bg-card border p-3"><b className="grid h-10 w-10 place-items-center rounded-full bg-[#dfff5b] text-[#17351f]">{String(i+1).padStart(2,"0")}</b><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{o.customer_name||"Pedido"}</strong><small className="text-muted-foreground">{o.fulfillment_type==="pickup"?"Recogida":"Entrega"} · {formatCurrency(o.total)}</small></span><ArrowRight className="w-4 h-4"/></Link>)}</div>:<Empty text="La mesa está despejada. El próximo pedido aparecerá aquí."/>}</section><aside className="rounded-[28px] bg-[#17351f] text-white p-6"><p className="text-xs uppercase tracking-[.2em] text-[#dfff5b]">Hoy</p><strong className="block text-4xl mt-3">{formatCurrency(sales)}</strong><span className="text-sm text-white/60">en pedidos recibidos</span><div className="mt-8 grid gap-2"><Quick to="/catalog" label="Revisar género"/><Quick to="/customers" label="Ver clientes"/><Quick to="/settings" label="Horario y reparto"/></div></aside></div>
  </div>;
}
function Tile({icon:Icon,value,label}){return <div className="rounded-2xl border bg-card p-4"><Icon className="w-5 h-5 text-emerald-600"/><b className="block text-2xl mt-3">{value}</b><span className="text-xs text-muted-foreground">{label}</span></div>};
function Quick({to,label}){return <Link to={to} className="flex items-center justify-between border-t border-white/15 py-3 text-sm">{label}<ArrowRight className="w-4 h-4"/></Link>};
function Empty({text}){return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>};
