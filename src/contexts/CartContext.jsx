import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "rinno_cart";
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [businessSlug, setBusinessSlug] = useState(null);
  const [primaryColor, setPrimaryColor] = useState("#16A34A");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        setItems(p.items || []);
        setBusinessId(p.businessId || null);
        setBusinessSlug(p.businessSlug || null);
        setPrimaryColor(p.primaryColor || "#16A34A");
      }
    } catch (e) { /* ignore */ }
  }, []);

  const persist = useCallback((newItems, bid, slug, color) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: newItems, businessId: bid, businessSlug: slug, primaryColor: color,
    }));
  }, []);

  const addItem = useCallback((product, quantity, slug, color) => {
    const productBid = product.business_id;
    if (items.length > 0 && ((businessSlug && businessSlug !== slug) || (businessId && businessId !== productBid))) {
      setToast({ type: "warn", message: "Tu carrito tiene productos de otro comercio." });
      return "cross-tenant";
    }
    const useColor = color || primaryColor;
    setBusinessId(productBid);
    setBusinessSlug(slug);
    setPrimaryColor(useColor);
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      let newItems;
      if (existing) {
        newItems = prev.map(i =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        newItems = [...prev, {
          product_id: product.id, name: product.name, price: product.price,
          unit_type: product.unit_type, unit_label: product.unit_label,
          minimum_quantity: product.minimum_quantity, quantity_step: product.quantity_step,
          quantity, image: product.image, origin: product.origin, business_id: productBid,
        }];
      }
      persist(newItems, productBid, slug, useColor);
      return newItems;
    });
    setToast({ type: "success", message: "Añadido al carrito ✓" });
    return "ok";
  }, [businessId, businessSlug, items.length, primaryColor, persist]);

  const updateQuantity = useCallback((productId, quantity, min = 0.5) => {
    setItems(prev => {
      if (quantity < min) return prev;
      if (quantity <= 0) {
        const n = prev.filter(i => i.product_id !== productId);
        persist(n, businessId, businessSlug, primaryColor);
        return n;
      }
      const n = prev.map(i => i.product_id === productId ? { ...i, quantity } : i);
      persist(n, businessId, businessSlug, primaryColor);
      return n;
    });
  }, [businessId, businessSlug, primaryColor, persist]);

  const removeItem = useCallback((productId) => {
    setItems(prev => {
      const n = prev.filter(i => i.product_id !== productId);
      persist(n, businessId, businessSlug, primaryColor);
      return n;
    });
  }, [businessId, businessSlug, primaryColor, persist]);

  const clearCart = useCallback(() => {
    setItems([]);
    setBusinessId(null);
    setBusinessSlug(null);
    setPrimaryColor("#16A34A");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const forceAddItem = useCallback((product, quantity, slug, color) => {
    const useColor = color || primaryColor;
    const newItems = [{
      product_id: product.id, name: product.name, price: product.price,
      unit_type: product.unit_type, unit_label: product.unit_label,
      minimum_quantity: product.minimum_quantity, quantity_step: product.quantity_step,
      quantity, image: product.image, origin: product.origin, business_id: product.business_id,
    }];
    setItems(newItems);
    setBusinessId(product.business_id);
    setBusinessSlug(slug);
    setPrimaryColor(useColor);
    persist(newItems, product.business_id, slug, useColor);
    setToast({ type: "success", message: "Carrito actualizado ✓" });
  }, [primaryColor, persist]);

  const dismissToast = useCallback(() => setToast(null), []);

  const total = items.reduce((s, i) => s + Math.round(i.quantity * i.price), 0);
  const count = items.length;

  return (
    <CartContext.Provider value={{
      items, businessId, businessSlug, primaryColor, total, count,
      addItem, updateQuantity, removeItem, clearCart, forceAddItem,
      toast, dismissToast,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
