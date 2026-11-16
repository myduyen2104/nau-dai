import { mkdir, readFile, writeFile } from "node:fs/promises";

const project = new URL("../", import.meta.url);
const all = JSON.parse(await readFile(new URL("public/data/dinhduong2598-canonical-recipes.json", project), "utf8"));
const index = all.filter((recipe) => recipe.showInFridgeSuggestions).map((recipe) => ({
  id: recipe.canonicalVariantId,
  canonical_recipe_id: recipe.canonicalRecipeId,
  name: recipe.canonicalTitle,
  source_url: recipe.source_url,
  category: recipe.category,
  category_labels: recipe.categoryLabels,
  age_group: recipe.ageGroup,
  available_age_groups: recipe.availableAgeGroups,
  variant_count: recipe.variantCount,
  ingredient_list_conflict: recipe.ingredientListConflict,
  ingredients: recipe.ingredients,
  quality_status: recipe.qualityStatus,
  has_instructions: recipe.has_instructions,
  has_ingredients: recipe.has_ingredients,
  detail_shard: recipe.detail_shard,
  variants: recipe.variants,
}));
await mkdir(new URL("public/data/", project), { recursive: true });
const output = new URL("public/data/dinhduong2598-fridge-index.json", project);
await writeFile(output, JSON.stringify(index));
console.log(`Wrote ${index.length} deduplicated source recipes (${(Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(1)} KiB) to public/data/dinhduong2598-fridge-index.json`);
