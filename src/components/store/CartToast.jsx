import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { Check, AlertCircle } from "lucide-react";

export default function CartToast() {
  const { toast, dismissToast } = useCart();

  useEffect(() => {
    if (toast) {
      const t = setTimeout(dismissToast, 2500);
      return () => clearTimeout(t);
    }
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg transition-all"
      style={{ backgroundColor: toast.type === "success" ? "#16A34A" : "#F59E0B", color: "white" }}
    >
      {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {toast.message}
    </div>
  );
}