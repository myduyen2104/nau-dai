import rulesJson from "../data/ingredient-substitutions.json" with { type: "json" };
import { normalizeVietnamese, resolveIngredientId } from "../utils/ingredientMatcher.ts";
import type { EngineRecipe, StockItem, RecommendationPreferences } from "./recommendationEngine.ts";

export type IngredientSubstitution = {
  id: string;
  originalIngredientId: string;
  substituteIngredientId: string;
  allowedCookingMethods?: string[];
  allowedRecipeIds?: string[];
  excludedRecipeIds?: string[];
  suitability: "good" | "conditional" | "not_recommended";
  flavorImpact?: string;
  textureImpact?: string;
  cookingAdjustment?: string;
  ratio?: { originalQuantity: number; substituteQuantity: number; unit: string };
  sourceUrl?: string;
  supportingSourceUrls?: string[];
  verificationStatus: "verified" | "unverified";
};

export type SubstitutionSuggestion = {
  rule: IngredientSubstitution;
  originalIngredientId: string;
  substituteIngredientId: string;
  availability: "in_fridge" | "buy";
};

export const ingredientSubstitutions = (rulesJson as { version: number; rules: IngredientSubstitution[] }).rules;

function canonicalId(id: string, index: ReturnType<typeof import("../utils/ingredientMatcher.ts").buildIngredientIndex>) {
  return index.byId.has(id) ? id : resolveIngredientId(id, index) ?? `custom:${normalizeVietnamese(id)}`;
}

function stockCanonicalId(item: StockItem, index: ReturnType<typeof import("../utils/ingredientMatcher.ts").buildIngredientIndex>) {
  if (index.byId.has(item.id)) return item.id;
  const value = item.name ?? (item.id.startsWith("custom-") ? item.id.slice(7).replace(/-/g, " ") : item.id);
  return resolveIngredientId(value, index) ?? `custom:${normalizeVietnamese(value)}`;
}

function methodMatches(method: string, allowed?: string[]) {
  if (!allowed?.length) return true;
  const normalized = normalizeVietnamese(method);
  return allowed.some((value) => normalized.includes(normalizeVietnamese(value)));
}

function allowedByPreference(id: string, prefs: RecommendationPreferences, index: ReturnType<typeof import("../utils/ingredientMatcher.ts").buildIngredientIndex>) {
  const entry = index.byId.get(id);
  if (!entry) return false;
  if (prefs.avoid.includes(id) || (entry.parentId && prefs.avoid.includes(entry.parentId))) return false;
  if (prefs.vegan && (entry.vegan === false || entry.containsMeat || entry.containsSeafood || ["Thịt", "Hải sản", "Trứng", "Sữa"].includes(entry.category ?? ""))) return false;
  if ((prefs.vegetarian || prefs.avoidMeat) && (entry.category === "Thịt" || entry.containsMeat)) return false;
  if ((prefs.vegetarian || prefs.avoidSeafood) && (entry.category === "Hải sản" || entry.containsSeafood)) return false;
  return true;
}

export function getRecipeSubstitutions(
  recipe: EngineRecipe,
  stock: StockItem[],
  prefs: RecommendationPreferences,
  index: ReturnType<typeof import("../utils/ingredientMatcher.ts").buildIngredientIndex>,
  now = new Date(),
): SubstitutionSuggestion[] {
  const requiredIds = recipe.ingredients.filter((item) => !item.optional).map((item) => canonicalId(item.ingredientId, index));
  const safeStock = stock.filter((item) => {
    if (item.fresh === "spoiled" || item.fresh === "expired") return false;
    if (!item.expiresAt) return true;
    const expiry = new Date(`${item.expiresAt}T23:59:59`);
    return Number.isFinite(expiry.getTime()) && expiry.getTime() >= now.getTime();
  });
  const stockIds = safeStock.map((item) => stockCanonicalId(item, index));

  return ingredientSubstitutions.flatMap((rule) => {
    if (rule.verificationStatus !== "verified" || rule.suitability === "not_recommended") return [];
    const originalId = canonicalId(rule.originalIngredientId, index);
    const substituteId = canonicalId(rule.substituteIngredientId, index);
    if (!requiredIds.includes(originalId) || stockIds.includes(originalId) || !index.byId.has(originalId) || !index.byId.has(substituteId)) return [];
    if (requiredIds.includes(substituteId) || !methodMatches(recipe.method, rule.allowedCookingMethods)) return [];
    if (rule.allowedRecipeIds?.length && !rule.allowedRecipeIds.includes(recipe.id)) return [];
    if (rule.excludedRecipeIds?.includes(recipe.id) || !allowedByPreference(substituteId, prefs, index)) return [];
    const available = stockIds.includes(substituteId);
    const substituteEntry = index.byId.get(substituteId)!;
    const originalEntry = index.byId.get(originalId)!;
    const matchingStock = safeStock.find((item) => stockCanonicalId(item, index) === substituteId);
    if (prefs.noDefrost && matchingStock?.frozen && (substituteEntry.requiresDefrost || originalEntry.requiresDefrost)) return [];
    return [{ rule, originalIngredientId: originalId, substituteIngredientId: substituteId, availability: available ? "in_fridge" as const : "buy" as const }];
  });
}
