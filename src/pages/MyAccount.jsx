import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getCustomerFullName } from "@/lib/rinno";
import { useStoreBranding } from "@/lib/storeContext";
import StoreAccountHeader from "@/components/store/StoreAccountHeader";
import { Package, MapPin, User as UserIcon, LogOut, ChevronRight, ShoppingBag, Loader2 } from "lucide-react";

export default function MyAccount() {
  const { slug } = useParams();
  const { user, logout } = useAuth();
  const { business, loading, primaryColor } = useStoreBranding(slug);
  const color = primaryColor;
  const name = getCustomerFullName(user) || user?.email || "Cliente";

  const menu = business?.business_mode === 'ASSOCIATION' ? [
    { icon: Package, label: "Membresía y actividades", desc: "Consulta tu estado y gestiona inscripciones", to: `/store/${slug}/account/association` },
    { icon: UserIcon, label: "Mis datos", desc: "Actualiza tu información personal", to: `/store/${slug}/account/profile` },
  ] : [
    { icon: Package, label: "Mis citas", desc: "Consulta y cancela tus reservas", to: `/store/${slug}/account/appointments` },
    { icon: Package, label: "Mis pedidos", desc: "Consulta y repite tus pedidos", to: `/store/${slug}/account/orders` },
    { icon: MapPin, label: "Mis direcciones", desc: "Gestiona tus direcciones de entrega", to: `/store/${slug}/account/addresses` },
    { icon: UserIcon, label: "Mis datos", desc: "Actualiza tu información personal", to: `/store/${slug}/account/profile` },
  ];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color }} /></div>;

  return (
    <div className="min-h-screen bg-background">
      <StoreAccountHeader business={business} slug={slug} primaryColor={color} title="Mi cuenta" />
      <div className="px-4 py-6 max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
            <UserIcon className="w-7 h-7" style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-lg text-foreground truncate">Hola, {name.split(" ")[0]}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          {menu.map(item => (
            <Link key={item.to} to={item.to} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0"><item.icon className="w-5 h-5 text-foreground" /></div>
              <div className="flex-1 min-w-0"><p className="font-medium text-foreground">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
        <button onClick={() => logout()} className="w-full mt-6 flex items-center justify-center gap-2 bg-card border border-border rounded-2xl p-4 text-destructive font-medium hover:bg-destructive/5 transition-colors">
          <LogOut className="w-5 h-5" /> Cerrar sesión
        </button>
        <div className="mt-8 text-center">
          <Link to={`/store/${slug}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5">
            <ShoppingBag className="w-4 h-4" /> Seguir comprando en {business?.business_name || "la tienda"}
          </Link>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">Tecnología de <span className="font-semibold">RINNO</span></p>
      </div>
    </div>
  );
}

