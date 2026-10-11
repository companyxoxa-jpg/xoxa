import { getFulfillmentMeta } from "@/lib/format";
import { CalendarClock, Package, Truck } from "lucide-react";

const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function FulfillmentSlotsPanel({ slots }) {
  const today = new Date().getDay();
  const todaySlots = slots.filter(s => s.day_of_week === today);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          Slots de hoy ({dayLabels[today]})
        </h2>
      </div>
      {todaySlots.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">No hay slots activos para hoy.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todaySlots.map((s) => {
            const fmeta = getFulfillmentMeta(s.fulfillment_type);
            const Icon = s.fulfillment_type === "pickup" ? Package : Truck;
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.start_time} — {s.end_time}</p>
                  <p className="text-xs text-muted-foreground">{fmeta.label}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Capacidad</p>
                  <p className="text-sm font-bold text-foreground">{s.max_orders} pedidos</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}