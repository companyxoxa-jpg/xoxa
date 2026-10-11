// Dashboard navigation builder — pure function returning the functional nav
// items for a V2 dashboard shell. Rules are preserved EXACTLY from the
// previous inline construction in AppLayout.jsx:
//  - booking-first skins (barberops, spaops): Inicio, Agenda, Clientes; HYBRID
//    adds Pedidos + Productos; owner adds Configuración.
//  - commerce-first skins: Inicio, Pedidos, Catálogo, Clientes; hasBooking
//    (BOOKING/HYBRID) adds Agenda; owner adds Configuración.
// The shell registry decides which shell renders; this decides which nav it
// shows. No permissions, modules, or business rules are changed — only the
// existing routes (Inicio, Pedidos, Catálogo, Agenda, Clientes, Configuración).
import { CalendarDays, LayoutDashboard, ShoppingBag, Package, Users, Settings, Receipt, IdCard, Leaf, ScanLine, FileText, Download, ShieldCheck, Rocket, Upload, CreditCard } from "lucide-react";
import { hasBooking, modeFor } from "@/lib/templates";

export function getNavItems({ skin, business, isOwner }) {
  if (skin === 'associationops') return [
    { label: 'Resumen', path: '/panel', icon: LayoutDashboard },
    { label: 'Socios', path: '/members', icon: Users },
    ...(isOwner ? [{ label: 'Importar socios', path: '/member-import', icon: Upload }] : []),
    { label: 'Actividades', path: '/activities', icon: CalendarDays },
    ...(isOwner ? [{ label: 'Cuotas', path: '/association-finances', icon: Receipt }, { label: 'Credenciales', path: '/credentials', icon: IdCard }] : []),
    { label: 'Escáner QR', path: '/credential-scanner', icon: ScanLine },
    { label: 'Club CSC', path: '/association-club', icon: Leaf },
    { label: 'Documentos', path: '/association-records', icon: FileText },
    ...(isOwner ? [{ label: 'Privacidad', path: '/association-compliance', icon: ShieldCheck }] : []),
    ...(isOwner ? [{ label: 'Puesta en marcha', path: '/association-setup', icon: Rocket }] : []),
    ...(isOwner ? [{ label: 'Exportar', path: '/association-export', icon: Download }] : []),
    ...(isOwner ? [{ label: 'Configuración', path: '/settings', icon: Settings }] : []),
    ...(isOwner ? [{ label: 'Facturación', path: '/billing', icon: CreditCard }] : []),
  ];
  const bookingFirst = skin === "barberops" || skin === "spaops";
  if (bookingFirst) {
    return [
      { label: "Inicio", path: "/panel", icon: LayoutDashboard },
      { label: "Agenda", path: "/agenda", icon: CalendarDays },
      { label: "Clientes", path: "/customers", icon: Users },
      ...(isOwner ? [{ label: "Importar datos", path: "/initial-import", icon: Upload }] : []),
      ...(modeFor(business) === "HYBRID" ? [
        { label: "Pedidos", path: "/orders", icon: ShoppingBag },
        { label: "Productos", path: "/catalog", icon: Package },
      ] : []),
      ...(isOwner ? [{ label: "Configuración", path: "/settings", icon: Settings }] : []),
      ...(isOwner ? [{ label: "Facturación", path: "/billing", icon: CreditCard }] : []),
    ];
  }
  return [
    { label: "Inicio", path: "/panel", icon: LayoutDashboard },
    { label: "Pedidos", path: "/orders", icon: ShoppingBag },
    { label: "Catálogo", path: "/catalog", icon: Package },
    { label: "Clientes", path: "/customers", icon: Users },
    ...(hasBooking(business) ? [{ label: "Agenda", path: "/agenda", icon: CalendarDays }] : []),
    ...(isOwner ? [{ label: "Importar datos", path: "/initial-import", icon: Upload }] : []),
    ...(isOwner ? [{ label: "Configuración", path: "/settings", icon: Settings }] : []),
    ...(isOwner ? [{ label: "Facturación", path: "/billing", icon: CreditCard }] : []),
  ];
}
