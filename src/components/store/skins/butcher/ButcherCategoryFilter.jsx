// Carnicería V2 — lateral category filter (desktop sidebar) and mobile sheet.
// Vertical list with counts; "Todas las piezas" clears the filter. Active item
// uses the accent token (left rule + tinted bg). No chips, no horizontal
// scroll — deliberately different from Frutería's CategoryBar.
export default function ButcherCategoryFilter({ categories, active, onSelect, counts }) {
  const items = [{ id: null, name: "Todas las piezas", count: null }, ...categories];
  return (
    <nav className="space-y-1">
      {items.map(c => {
        const isActive = (active || null) === c.id;
        return (
          <button key={c.id || "all"} onClick={() => onSelect(c.id)} className="relative w-full text-left flex items-center justify-between gap-2 py-2 pl-3 pr-2 rounded-md text-sm transition-colors"
            style={isActive ? { color: "var(--accent)", backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)" } : { color: "hsl(var(--muted-foreground))" }}>
            {isActive && <span className="absolute left-0 w-1 h-5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />}
            <span className={`truncate ${isActive ? "font-semibold" : ""}`} style={isActive ? { color: "var(--accent)" } : {}}>{c.name}</span>
            {c.count != null && <span className="text-[11px] tabular-nums opacity-70">{c.count}</span>}
          </button>
        );
      })}
    </nav>
  );
}