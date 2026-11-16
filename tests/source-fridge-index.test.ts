import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sourceFridgeIndexToCatalogItem, sourceFridgeIndexToEngineRecipe, sourceInstructionParagraphs, sourceRecipeEligibleForFridge, type SourceFridgeIndexItem } from "../src/services/sourceRecipeCatalog.ts";
import { recommendRecipes, defaultRecommendationPreferences } from "../src/services/recommendationEngine.ts";
import { ingredients, recipes } from "../src/data.ts";

test("fridge index contains eligible canonical source recipes with namespaced IDs", async () => {
  const index = JSON.parse(await readFile(new URL("../public/data/dinhduong2598-fridge-index.json", import.meta.url), "utf8")) as SourceFridgeIndexItem[];
  assert.equal(index.length, 194);
  assert.equal(new Set(index.map((item) => item.id)).size, index.length);
  assert.equal(new Set(index.map((item) => item.canonical_recipe_id)).size, index.length);
  assert.ok(index.every((item) => item.quality_status === "complete" && item.has_instructions && item.has_ingredients && item.ingredients.length));
  const engine = index.map(sourceFridgeIndexToEngineRecipe);
  assert.equal(new Set(engine.map((item) => item.id)).size, 194);
  assert.ok(engine.every((item) => item.id.startsWith("dinhduong2598:")));
  const copper = JSON.parse(await readFile(new URL("../src/data/recipes/copper-vietnam.json", import.meta.url), "utf8"));
  const allIds = [...recipes.map((item) => item.id), ...copper.recipes.map((item: { id: string }) => item.id), ...engine.map((item) => item.id)];
  assert.equal(recipes.length, 41);
  assert.equal(copper.recipes.length, 3);
  assert.equal(allIds.length, 238);
  assert.equal(new Set(allIds).size, allIds.length);
  assert.equal(sourceFridgeIndexToCatalogItem(index[0]).ingredients?.length, index[0].ingredients.length);
});

test("source recipes rank by ingredient coverage and expose missing ingredients", () => {
  const item: SourceFridgeIndexItem = {
    id: "source-1", name: "Món thử", source_url: null, category: "Món thử", age_group: null,
    ingredients: [
      { name: "Cà rốt", quantity_raw: "100 g", quantity_value: 100, quantity_unit: "g" },
      { name: "Thịt heo", quantity_raw: "100 g", quantity_value: 100, quantity_unit: "g" },
    ], quality_status: "complete", has_instructions: true, has_ingredients: true, detail_shard: "aa",
  };
  const result = recommendRecipes({
    stock: [{ id: "carrot", name: "Cà rốt", quantity: 100, unit: "g" }],
    recipes: [sourceFridgeIndexToEngineRecipe(item)], preferences: { ...defaultRecommendationPreferences }, ingredients,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].recipeId, "dinhduong2598:source-1");
  assert.equal(result[0].category, "almost");
  assert.deepEqual(result[0].missingIngredients, ["pork"]);
  assert.equal(result[0].matchPercentage, 29);
  assert.equal(result[0].hasFullInstructions, true);
});

test("fridge eligibility excludes incomplete source records; instruction splitting preserves unclear text", () => {
  assert.equal(sourceRecipeEligibleForFridge({ instructions_raw: "Nấu món ăn", ingredients: [{ name: "Gạo", quantity_raw: null, quantity_value: null, quantity_unit: null }], quality_status: "complete" }), true);
  assert.equal(sourceRecipeEligibleForFridge({ instructions_raw: "Nấu món ăn", ingredients: [], quality_status: "complete" }), false);
  assert.deepEqual(sourceInstructionParagraphs("Bước 1: Rửa sạch\n\nBước 2: Nấu chín"), ["Bước 1: Rửa sạch", "Bước 2: Nấu chín"]);
  assert.deepEqual(sourceInstructionParagraphs("Rửa nguyên liệu rồi nấu chín."), ["Rửa nguyên liệu rồi nấu chín."]);
});
