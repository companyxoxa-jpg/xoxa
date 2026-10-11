export default function StoreHero({ primaryColor, onShop }) {
  const color = primaryColor || "#16A34A";
  return (
    <div className="px-4 pt-5 pb-3">
      <h1 className="text-3xl font-heading font-bold text-foreground leading-tight">
        Fresco cada día 🍓
      </h1>
      <p className="text-sm text-muted-foreground mt-1.5">
        Frutas y verduras seleccionadas para ti.
      </p>
      <p className="text-sm font-semibold mt-0.5" style={{ color }}>
        Compra hoy. Recíbelo cuando quieras.
      </p>
      <button onClick={onShop}
        className="mt-4 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-sm transition-opacity hover:opacity-90"
        style={{ backgroundColor: color }}>
        Comprar ahora
      </button>
    </div>
  );
}