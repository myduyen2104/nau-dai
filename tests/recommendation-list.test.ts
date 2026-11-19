import test from "node:test";
import assert from "node:assert/strict";
import { filterRecommendationList, RECOMMENDATION_PAGE_SIZE, recommendationSource, uniqueRecommendationsByRecipeTitle } from "../src/services/recommendationList.ts";
import type { Recipe } from "../src/data.ts";
import type { RecipeRecommendation } from "../src/services/recommendationEngine.ts";

const recipe = (id: string, name: string, category: string, sourceTitle: string): Recipe => ({
  id, slug: id, name, emoji: "🍲", description: "", category, cuisine: "vietnamese", method: "", minutes: null,
  preparationTime: null, cookingTime: null, totalTime: null, difficulty: "Chưa đánh giá", servings: null,
  required: [], optional: [], ingredients: [], steps: [], equipment: [], tips: [], tags: [],
  source: { type: id.startsWith("knorr:") || id.startsWith("copper:") ? "website" : "internal", title: sourceTitle },
  verificationStatus: "unverified", dataStatus: "full_recipe",
});
const recommendation = (recipeId: string, matchPercentage: number, matchedIngredients: string[]): RecipeRecommendation => ({
  recipeId, score: matchPercentage, matchPercentage, matchedIngredients, missingIngredients: [], quantityShortages: [],
  category: "almost", urgent: false, substitutions: [], reasons: [], hasFullInstructions: true, quantityStatus: "unknown",
});

const fixtures = [
  { ...recipe("internal-1", "Bún riêu cua", "Món nước", "Công thức nội bộ"), ingredients: [{ ingredientId: "beef", sourceName: "Thịt bò", quantity: null, unit: "", optional: false }] },
  recipe("copper:vn-bun-cha", "Bún chả", "Món chính", "Copper — traditional dishes"),
  recipe("knorr:source-1", "Bún cá", "Món nước", "Knorr Việt Nam"),
  recipe("internal-2", "Cà tím nướng", "Món nướng", "Công thức nội bộ"),
];
const byId = new Map(fixtures.map((item) => [item.id, item]));
const rows = [recommendation(fixtures[0].id, 80, ["pork"]), recommendation(fixtures[1].id, 60, ["fish"]), recommendation(fixtures[2].id, 35, []), recommendation(fixtures[3].id, 90, ["egg"])];

test("recommendation search handles Vietnamese accents and leaves engine order intact", () => {
  assert.deepEqual(filterRecommendationList(rows, byId, { query: "bun" }).map((item) => item.recipeId), [fixtures[0].id, fixtures[1].id, fixtures[2].id]);
  assert.deepEqual(filterRecommendationList(rows, byId, { query: "Bún" }).map((item) => item.recipeId), [fixtures[0].id, fixtures[1].id, fixtures[2].id]);
  assert.deepEqual(filterRecommendationList(rows, byId, { query: "ca tim" }).map((item) => item.recipeId), [fixtures[3].id]);
  assert.deepEqual(filterRecommendationList(rows, byId, { query: "thit bo" }).map((item) => item.recipeId), [fixtures[0].id]);
});

test("Knorr source, category, match level and fridge-match filters combine", () => {
  const result = filterRecommendationList(rows, byId, { source: "knorr", category: "Món nước", match: "low", matchedOnly: false });
  assert.deepEqual(result.map((item) => item.recipeId), [fixtures[2].id]);
  assert.deepEqual(filterRecommendationList(rows, byId, { matchedOnly: true }).map((item) => item.recipeId), [fixtures[0].id, fixtures[1].id, fixtures[3].id]);
  assert.deepEqual(filterRecommendationList(rows, byId, { source: "copper", match: "medium" }).map((item) => item.recipeId), [fixtures[1].id]);
  assert.equal(recommendationSource(fixtures[0]), "internal");
  assert.equal(recommendationSource(fixtures[1]), "copper");
  assert.equal(recommendationSource(fixtures[2]), "knorr");
});

test("no-match returns an empty list; pagination starts at a bounded batch", () => {
  assert.deepEqual(filterRecommendationList(rows, byId, { query: "không tồn tại" }), []);
  assert.equal(RECOMMENDATION_PAGE_SIZE, 24);
  const many = Array.from({ length: 591 }, (_, index) => recommendation(`r${index}`, 50, ["carrot"]));
  const manyRecipes = new Map(many.map((item) => [item.recipeId, recipe(item.recipeId, `Món ${item.recipeId}`, "Món thử", "Nội bộ")]));
  assert.equal(filterRecommendationList(many, manyRecipes, {}).length, 591);
});

test("recommendation cards keep the first best-ranked canonical title only", () => {
  const items = [{ id: "a", title: "Bún bò Huế" }, { id: "b", title: "bun bo hue" }, { id: "c", title: "Bún bò chay" }];
  assert.deepEqual(uniqueRecommendationsByRecipeTitle(items, (item) => item.title), [items[0], items[2]]);
});
