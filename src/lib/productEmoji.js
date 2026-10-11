/**
 * Product and category emoji mapping for storefront display.
 * Used as visual placeholder when no product image is available.
 */

const productEmojiMap = [
  { keywords: ["tomate cherry"], emoji: "🍅" },
  { keywords: ["tomate"], emoji: "🍅" },
  { keywords: ["platano", "plátano", "banana"], emoji: "🍌" },
  { keywords: ["manzana"], emoji: "🍎" },
  { keywords: ["pera"], emoji: "🍐" },
  { keywords: ["naranja"], emoji: "🍊" },
  { keywords: ["mandarina", "clementina"], emoji: "🍊" },
  { keywords: ["limon", "limón"], emoji: "🍋" },
  { keywords: ["fresa", "freson", "fresón", "strawberry"], emoji: "🍓" },
  { keywords: ["arandano", "arándano", "blueberry", "arandanos"], emoji: "🫐" },
  { keywords: ["frambuesa", "raspberry"], emoji: "🍓" },
  { keywords: ["aguacate", "avocado", "palta"], emoji: "🥑" },
  { keywords: ["mango"], emoji: "🥭" },
  { keywords: ["patata", "papa", "potato"], emoji: "🥔" },
  { keywords: ["cebolla", "onion"], emoji: "🧅" },
  { keywords: ["ajo", "garlic"], emoji: "🧄" },
  { keywords: ["pimiento", "pepper", "pimenton", "pimentón"], emoji: "🫑" },
  { keywords: ["calabacin", "calabacín", "zucchini", "courgette"], emoji: "🥒" },
  { keywords: ["berenjena", "berenjena", "eggplant", "aubergine"], emoji: "🍆" },
  { keywords: ["lechuga", "lettuce"], emoji: "🥬" },
  { keywords: ["zanahoria", "carrot"], emoji: "🥕" },
  { keywords: ["brocoli", "brócoli", "broccoli"], emoji: "🥦" },
  { keywords: ["maiz", "maíz", "corn"], emoji: "🌽" },
  { keywords: ["uva", "uvas", "grape"], emoji: "🍇" },
  { keywords: ["sandia", "sandía", "watermelon"], emoji: "🍉" },
  { keywords: ["melon", "melón", "melon"], emoji: "🍈" },
  { keywords: ["ciruela", "plum"], emoji: "🍑" },
  { keywords: ["kiwi"], emoji: "🥝" },
  { keywords: ["anana", "piña", "pineapple"], emoji: "🍍" },
  { keywords: ["papaya"], emoji: "🥭" },
  { keywords: ["cilantro", "perejil", "albahaca", "hierba", "menta", "romero", "tomillo", "aromatic"], emoji: "🌿" },
  { keywords: ["nuez", "almendra", "avellana", "pistacho", "castana", "fruto seco", "nut"], emoji: "🥜" },
];

export function getProductEmoji(name) {
  const lower = (name || "").toLowerCase();
  for (const entry of productEmojiMap) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.emoji;
  }
  return "🛒";
}

const categoryEmojiMap = [
  { keywords: ["fruta"], emoji: "🍎" },
  { keywords: ["verdura"], emoji: "🥬" },
  { keywords: ["tropical"], emoji: "🥑" },
  { keywords: ["patata", "cebolla", "basico", "básico"], emoji: "🥔" },
  { keywords: ["hierba", "aromatic", "aromátic"], emoji: "🌿" },
  { keywords: ["fruto seco", "nut"], emoji: "🥜" },
  { keywords: ["oferta", "offer"], emoji: "🔥" },
];

export function getCategoryEmoji(name) {
  const lower = (name || "").toLowerCase();
  for (const entry of categoryEmojiMap) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.emoji;
  }
  return "🛒";
}