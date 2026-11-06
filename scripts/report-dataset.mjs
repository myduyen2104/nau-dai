import { readFile } from "node:fs/promises";
const [catalog, ingredients, audit] = await Promise.all([
  readFile(new URL("../src/data/recipes/copper-vietnam.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../src/data/ingredients/copper-vietnam.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../source-audit.json", import.meta.url), "utf8").then(JSON.parse),
]);
const report = {
  imported: {
    recipesByStatus: catalog.recipes.reduce((out, recipe) => ((out[recipe.dataStatus] ??= 0), out[recipe.dataStatus]++, out), {}),
    recipesBySource: { Copper: catalog.recipes.length },
    uniqueIngredientTerms: ingredients.terms.length,
    mappedIngredientTerms: ingredients.terms.filter((x) => x.ingredientId).length,
  },
  notImported: audit.sources.filter((source) => source.importDecision !== "approved_for_import").map(({ sourceName, importDecision, license, totalRecords, notes }) => ({ sourceName, importDecision, license, totalRecords, notes })),
};
console.log(JSON.stringify(report, null, 2));
