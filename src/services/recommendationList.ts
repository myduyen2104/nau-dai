import { nameFor, type Recipe } from "../data.ts";
import type { RecipeRecommendation } from "./recommendationEngine.ts";
import { normalizeVietnamese } from "../utils/ingredientMatcher.ts";

export type RecommendationListFilters = {
  query?: string;
  category?: string;
  source?: "all" | "internal" | "copper" | "dinhduong2598" | "mnnm" | "knorr" | "other";
  match?: "all" | "high" | "medium" | "low";
  matchedOnly?: boolean;
  quickOnly?: boolean;
  status?: "all" | "full_recipe" | "ingredients_only" | "catalog_only";
};

export const RECOMMENDATION_PAGE_SIZE = 24;

/** Keep only the best-ranked card for an exact canonical dish title. */
export function uniqueRecommendationsByRecipeTitle<T>(items: T[], getTitle: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const title = normalizeVietnamese(getTitle(item)).replace(/[^a-z0-9]+/g, " ").trim();
    if (!title) return true;
    if (seen.has(title)) return false;
    seen.add(title);
    return true;
  });
}

export function recommendationSource(recipe: Recipe): "internal" | "copper" | "dinhduong2598" | "mnnm" | "knorr" {
  if (recipe.id.startsWith("dinhduong2598:")) return "dinhduong2598";
  if (recipe.source.title === "Món Ngon Mỗi Ngày") return "mnnm";
  if (recipe.source.title === "Knorr Việt Nam") return "knorr";
  if (recipe.id.startsWith("copper:") || recipe.source.title.toLocaleLowerCase("en").includes("copper")) return "copper";
  return "internal";
}

export function filterRecommendationList(
  recommendations: RecipeRecommendation[],
  recipeById: Map<string, Recipe>,
  filters: RecommendationListFilters,
): RecipeRecommendation[] {
  const query = normalizeVietnamese(filters.query ?? "");
  return recommendations.filter((recommendation) => {
    const recipe = recipeById.get(recommendation.recipeId);
    if (!recipe) return false;
    if (query) {
      const searchable = normalizeVietnamese(`${recipe.name} ${recipe.ingredients.map((ingredient) => `${ingredient.sourceName ?? ""} ${ingredient.ingredientId} ${nameFor(ingredient.ingredientId)}`).join(" ")}`);
      if (!searchable.includes(query)) return false;
    }
    if (filters.category && recipe.category !== filters.category) return false;
    if (filters.quickOnly && (recipe.totalTime === null || recipe.totalTime > 30)) return false;
    if (filters.status && filters.status !== "all" && recipe.dataStatus !== filters.status) return false;
    if (filters.source && filters.source !== "all") {
      const source = recommendationSource(recipe);
      if (filters.source === "other" ? !["internal", "copper", "dinhduong2598"].includes(source) : source !== filters.source) return false;
    }
    if (filters.matchedOnly && recommendation.matchedIngredients.length === 0) return false;
    if (filters.match === "high" && recommendation.matchPercentage < 75) return false;
    if (filters.match === "medium" && (recommendation.matchPercentage < 40 || recommendation.matchPercentage >= 75)) return false;
    if (filters.match === "low" && recommendation.matchPercentage >= 40) return false;
    return true;
  });
}
