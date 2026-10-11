import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Store } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Register() {
  return <AuthLayout
    icon={ShieldCheck}
    title="Acceso solo por invitación"
    subtitle="RINNO protege la gestión de cada negocio"
    footer={<Link to="/" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"><ArrowLeft className="w-4 h-4"/>Volver a rinno.es</Link>}
  >
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-muted/40 p-5">
        <h2 className="font-semibold">Propietarios, equipo y comerciales</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">No existe registro público. Dirección crea el negocio y envía una invitación personal a cada usuario autorizado.</p>
      </div>
      <div className="rounded-2xl border border-border p-5">
        <Store className="w-5 h-5 text-blue-600"/>
        <h2 className="mt-3 font-semibold">¿Eres cliente de una tienda?</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Entra en la aplicación de ese establecimiento. Allí podrás crear tu cuenta para comprar, reservar o gestionar tus citas sin mezclar datos con otros negocios.</p>
      </div>
      <Link to="/login?returnTo=%2Fpanel" className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 font-medium text-white hover:bg-blue-700">Ya tengo acceso autorizado</Link>
    </div>
  </AuthLayout>;
}
