import { buildIngredientIndex, normalizeVietnamese, resolveIngredientId } from "../utils/ingredientMatcher.ts";

export type ShoppingIngredientIndex = ReturnType<typeof buildIngredientIndex>;

const SHOPPING_CATEGORY_OVERRIDES: Record<string, string> = {
  "nuoc mam": "Gia vị",
  "nuoc mam ca loai 1": "Gia vị",
  "nuoc mam nhi": "Gia vị",
  "mam ruoc": "Gia vị",
  "mam nem": "Gia vị",
  "hoa chuoi": "Rau củ",
  "rau thom": "Rau củ",
  "rau ghem": "Rau củ",
  "rau song": "Rau củ",
};

export function shoppingIngredientIdentity(name: string, index: ShoppingIngredientIndex): string {
  const resolved = resolveIngredientId(name.trim(), index);
  return resolved ? `ingredient:${resolved}` : `name:${normalizeVietnamese(name).replace(/[^a-z0-9]+/g, " ").trim()}`;
}

export function canonicalShoppingIngredientName(name: string, index: ShoppingIngredientIndex): string {
  const resolved = resolveIngredientId(name.trim(), index);
  return (resolved && index.byId.get(resolved)?.name) || name.trim();
}

export function shoppingIngredientCategory(name: string, index: ShoppingIngredientIndex): string {
  const normalized = normalizeVietnamese(name).replace(/[^a-z0-9]+/g, " ").trim();
  const override = SHOPPING_CATEGORY_OVERRIDES[normalized];
  if (override) return override;
  const resolved = resolveIngredientId(name.trim(), index);
  return (resolved && index.byId.get(resolved)?.category) || "Khác";
}

