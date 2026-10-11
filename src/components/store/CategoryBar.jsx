import { getCategoryEmoji } from "@/lib/productEmoji";

export default function CategoryBar({ categories, active, onSelect, primaryColor }) {
  const color = primaryColor || "#16A34A";
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <button onClick={() => onSelect(null)}
        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active === null ? "text-white" : "bg-muted text-muted-foreground"}`}
        style={active === null ? { backgroundColor: color } : {}}>
        🛒 Todos
      </button>
      {categories.map(c => (
        <button key={c.id} onClick={() => onSelect(c.id)}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active === c.id ? "text-white" : "bg-muted text-muted-foreground"}`}
          style={active === c.id ? { backgroundColor: color } : {}}>
          <span>{c.icon || getCategoryEmoji(c.name)}</span>
          {c.name}
        </button>
      ))}
    </div>
  );
}