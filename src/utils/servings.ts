const scalableUnits = new Set(["g", "gram", "grams", "kg", "mg", "ml", "milliliter", "l", "liter", "tsp", "teaspoon", "tbsp", "tablespoon", "cup", "cups", "pcs", "pc", "piece", "pieces", "qua", "cu", "trai", "con", "bo", "phan", "cu", "bo", "goi", "tep", "nhanh", "lat", "mieng", "cai"]);

export function isScalableRecipeUnit(unit: string): boolean {
  const normalized = unit.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\./g, "").trim();
  return scalableUnits.has(normalized);
}

/** Scale only when quantity, unit, source servings, and requested servings are explicit and supported. */
export function scaleRecipeQuantity(quantity: number | null, unit: string, sourceServings: number | null, requestedServings: number): number | null {
  if (quantity === null || !Number.isFinite(quantity) || quantity < 0
    || !isScalableRecipeUnit(unit)
    || sourceServings === null || !Number.isFinite(sourceServings) || sourceServings <= 0
    || !Number.isInteger(requestedServings) || requestedServings < 1) return null;
  return quantity * requestedServings / sourceServings;
}

/** Keep at most two decimals so scaled amounts stay readable without changing source values. */
export function formatRecipeQuantity(quantity: number): string {
  const rounded = Math.round((quantity + Number.EPSILON) * 100) / 100;
  if (rounded === 0 && quantity > 0) return "<0,01";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(rounded);
}
