type RecommendationRecipe = { required: string[]; optional: string[]; method: string; minutes: number };
type RecommendationPreferences = {
  avoid: string[]; vegan: boolean; vegetarian: boolean; avoidMeat: boolean;
  avoidSeafood: boolean; noRice: boolean; noFry: boolean; noOven: boolean;
  noDefrost: boolean; quick: boolean; maxTime: number;
};

export function matchRecipeIngredients(required: string[], optional: string[], ownedIds: Set<string>) {
  const missing = required.filter((id) => !ownedIds.has(id));
  const owned = required.filter((id) => ownedIds.has(id));
  const optionalOwned = optional.filter((id) => ownedIds.has(id));
  const ratio = required.length ? Math.round(((owned.length + optionalOwned.length * 0.3) / required.length) * 100) : 0;
  return { missing, owned, optionalOwned, ratio };
}

export function isRecipeAllowed(
  recipe: RecommendationRecipe,
  prefs: RecommendationPreferences,
  categoryFor: (ingredientId: string) => string | undefined,
) {
  if (recipe.minutes > prefs.maxTime || (prefs.quick && recipe.minutes > 25)) return false;
  if (prefs.noRice && recipe.required.includes("rice")) return false;
  if (prefs.noFry && ["xào", "rang", "áp chảo", "chiên"].includes(recipe.method)) return false;
  if (prefs.noOven && recipe.method === "nướng") return false;
  if (prefs.noDefrost && recipe.required.some((id) => ["chicken", "pork", "beef", "shrimp", "fish"].includes(id))) return false;
  return !recipe.required.some((id) => {
    const category = categoryFor(id);
    return prefs.avoid.includes(id)
      || (prefs.vegan && ["Thịt", "Hải sản", "Trứng", "Sữa"].includes(category ?? ""))
      || ((prefs.vegetarian || prefs.avoidMeat) && category === "Thịt")
      || (prefs.avoidSeafood && category === "Hải sản");
  });
}
