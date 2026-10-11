import { Link } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

export default function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-5">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-heading font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Este módulo está preparado en la arquitectura de RINNO pero aún no se ha implementado en esta fase.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al Dashboard
      </Link>
    </div>
  );
}