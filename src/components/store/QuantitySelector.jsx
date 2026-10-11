export default function QuantitySelector({ quantity, min, step, unitLabel, onChange, primaryColor }) {
  const color = primaryColor || "#16A34A";
  const dec = () => onChange(Math.max(min, Math.round((quantity - step) * 100) / 100));
  const inc = () => onChange(Math.round((quantity + step) * 100) / 100);

  return (
    <div className="flex items-center gap-3">
      <button onClick={dec} disabled={quantity <= min}
        className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-xl font-bold text-foreground disabled:opacity-40 hover:border-foreground transition-colors">
        −
      </button>
      <span className="text-base font-semibold min-w-[70px] text-center text-foreground">
        {quantity} {unitLabel}
      </span>
      <button onClick={inc}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: color }}>
        +
      </button>
    </div>
  );
}