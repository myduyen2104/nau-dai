export function recordRecentRecipe(history: string[], recipeId: string, limit = 20): string[] {
  return [...new Set([recipeId, ...history.filter((id) => id !== recipeId)])].slice(0, limit);
}

/** Preserve stored order (most recent first) and hide IDs no longer in the recipe database. */
export function visibleRecentRecipes(history: string[], availableRecipeIds: ReadonlySet<string>): string[] {
  return history.filter((id) => availableRecipeIds.has(id));
}
