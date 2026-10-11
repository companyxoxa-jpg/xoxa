import { useMemo, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";

// Template Engine V2 — shared storefront state + logic (search, category
// filter, product detail sheet, quick-add). This hook owns NO markup — each
// skin keeps its own composition. Skins whose flow doesn't fit this commerce
// pattern (booking-first Barber/Spa) do not use it.
//
// The search predicate is unified across skins: it matches name, description,
// origin and category name. For skins whose products never set `origin`
// (e.g. retail), the origin check is a no-op (undefined → "" never matches a
// non-empty query), so behavior is preserved.
export function useStorefrontState({ products, categories, slug, color, defaultQuantity = 0.5 }) {
  const { addItem } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const productsRef = useRef(null);

  const featured = useMemo(() => (products || []).filter((p) => p.is_featured && p.is_available), [products]);
  const isSearching = !!searchQuery;

  const displayProducts = useMemo(() => {
    if (!products) return [];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.origin || "").toLowerCase().includes(q) ||
          (categories || []).find((c) => c.id === p.category_id)?.name.toLowerCase().includes(q)
      );
    }
    if (activeCategory) return products.filter((p) => p.category_id === activeCategory);
    return products;
  }, [products, categories, searchQuery, activeCategory]);

  function handleQuickAdd(p) { addItem(p, p.minimum_quantity || defaultQuantity, slug, color); }
  function handleCardClick(p) { setSelectedProduct(p); setSheetOpen(true); }
  function scrollToProducts() { productsRef.current?.scrollIntoView({ behavior: "smooth" }); }
  function closeSheet() { setSheetOpen(false); }

  return {
    searchQuery, setSearchQuery,
    activeCategory, setActiveCategory,
    selectedProduct, sheetOpen, productsRef,
    featured, isSearching, displayProducts,
    handleQuickAdd, handleCardClick, scrollToProducts, closeSheet,
  };
}