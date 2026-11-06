import test from "node:test";
import assert from "node:assert/strict";
import { ingredients, recipes } from "../src/data.ts";
import { defaultRecommendationPreferences, recommendRecipes, type EngineRecipe } from "../src/services/recommendationEngine.ts";
import { ingredientSubstitutions, getRecipeSubstitutions } from "../src/services/substitutions.ts";
import { buildIngredientIndex } from "../src/utils/ingredientMatcher.ts";

const soup = recipes.find((item) => item.id === "chicken-soup") as EngineRecipe;
const now = new Date("2026-11-06T12:00:00");
const index = buildIngredientIndex(ingredients);
const prefs = { ...defaultRecommendationPreferences };
const output = (stock: { id: string; fresh?: "fresh" | "soon" | "urgent" | "spoiled"; expiresAt?: string }[], overrides: Partial<typeof prefs> = {}, recipe = soup) => recommendRecipes({
  recipes: [recipe], stock, ingredients, preferences: { ...prefs, ...overrides }, now,
}).find((item) => item.recipeId === recipe.id)!;

test("verified potato swap in chicken soup creates its own category when sweet potato is in stock", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato" }]);
  assert.equal(result.category, "substitution");
  assert.equal(result.missingIngredients[0], "potato");
  assert.equal(result.substitutions[0].substituteIngredientId, "sweet-potato");
  assert.equal(result.substitutions[0].availability, "in_fridge");
});

test("the distinct substitution category ranks below a ready recipe and above an almost recipe", () => {
  const ready: EngineRecipe = { ...soup, id: "ready", name: "Món đủ nguyên liệu", ingredients: [{ ingredientId: "chicken", quantity: null, unit: "", optional: false }], required: ["chicken"], optional: [] };
  const almost: EngineRecipe = { ...soup, id: "almost", name: "Canh thiếu nguyên liệu", ingredients: [{ ingredientId: "chicken", quantity: null, unit: "", optional: false }, { ingredientId: "garlic", quantity: null, unit: "", optional: false }], required: ["chicken", "garlic"], optional: [] };
  const results = recommendRecipes({ recipes: [almost, soup, ready], stock: [{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato" }], ingredients, preferences: prefs, now });
  assert.equal(results[0].category, "ready");
  assert.equal(results[1].category, "substitution");
  assert.ok(results.findIndex((item) => item.category === "almost") > results.findIndex((item) => item.category === "substitution"));
});

test("turning substitution suggestions off removes substitution candidates and category", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato" }], { allowSubstitutions: false });
  assert.notEqual(result.category, "substitution");
  assert.deepEqual(result.substitutions, []);
});

test("a missing original without its verified substitute remains almost", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }]);
  assert.equal(result.category, "almost");
});

test("a rule can be shown as a buy option but cannot create the cook-with-substitution category", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }]);
  const candidate = result.substitutions.find((item) => item.substituteIngredientId === "sweet-potato");
  assert.equal(candidate?.availability, "buy");
  assert.notEqual(result.category, "substitution");
});

test("all missing required ingredients must have an in-fridge substitution", () => {
  const twoMissing = { ...soup, ingredients: [...soup.ingredients, { ingredientId: "onion", quantity: null, unit: "", optional: false }], required: [...soup.required, "onion"] };
  const result = output([{ id: "chicken" }, { id: "sweet-potato" }], {}, twoMissing);
  assert.notEqual(result.category, "substitution");
});

test("an alias of the original ingredient counts as the original, not a substitute", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }, { id: "custom-potato" }]);
  assert.notEqual(result.category, "substitution");
  assert.equal(result.substitutions.some((item) => item.originalIngredientId === "potato"), false);
});

test("substitutions are directional and are not inferred in reverse", () => {
  const reverse: EngineRecipe = { ...soup, ingredients: [{ ingredientId: "sweet-potato", quantity: null, unit: "", optional: false }], required: ["sweet-potato"], optional: [] };
  const result = output([{ id: "potato" }], {}, reverse);
  assert.equal(result.substitutions.length, 0);
});

test("the recipe-specific rule does not leak into other potato dishes", () => {
  const other: EngineRecipe = { ...soup, id: "potato-mash", name: "Khoai tây nghiền", ingredients: [{ ingredientId: "potato", quantity: null, unit: "", optional: false }], required: ["potato"], optional: [] };
  assert.equal(getRecipeSubstitutions(other, [{ id: "sweet-potato" }], prefs, index, now).length, 0);
});

test("method constraints prevent the soup rule from being used for stir-fry", () => {
  const stirFry = { ...soup, method: "xào" };
  assert.equal(getRecipeSubstitutions(stirFry, [{ id: "sweet-potato" }], prefs, index, now).length, 0);
});

test("recipe allow-lists prevent a rule from leaking into a signature dish", () => {
  const other: EngineRecipe = { ...soup, id: "copper:vn-pho-bo", name: "Phở bò", ingredients: [{ ingredientId: "potato", quantity: null, unit: "", optional: false }], required: ["potato"], optional: [] };
  assert.equal(getRecipeSubstitutions(other, [{ id: "sweet-potato" }], prefs, index, now).length, 0);
});

test("spoiled replacement ingredients are never suggested", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato", fresh: "spoiled" }]);
  assert.notEqual(result.category, "substitution");
});

test("expired replacement ingredients are never suggested", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato", expiresAt: "2026-11-05" }]);
  assert.notEqual(result.category, "substitution");
});

test("a user exclusion blocks the replacement ingredient", () => {
  const result = output([{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato" }], { avoid: ["sweet-potato"] });
  assert.notEqual(result.category, "substitution");
});

test("a replacement candidate respects dietary preferences", () => {
  const results = recommendRecipes({ recipes: [soup], stock: [{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato" }], ingredients, preferences: { ...prefs, vegan: true }, now });
  assert.equal(results.length, 0);
});

test("vegetarian and seafood restrictions do not block a vegetable replacement", () => {
  const vegetarianSoup: EngineRecipe = { ...soup, ingredients: [{ ingredientId: "tofu", quantity: null, unit: "", optional: false }, { ingredientId: "carrot", quantity: null, unit: "", optional: false }, { ingredientId: "potato", quantity: null, unit: "", optional: false }], required: ["tofu", "carrot", "potato"], optional: [] };
  const result = output([{ id: "tofu" }, { id: "carrot" }, { id: "sweet-potato" }], { vegetarian: true, avoidSeafood: true }, vegetarianSoup);
  assert.equal(result.category, "substitution");
});

test("substitution data has no invented quantity ratio", () => {
  const rule = ingredientSubstitutions.find((item) => item.id === "potato-to-sweet-potato-in-chicken-soup")!;
  assert.equal(rule.ratio, undefined);
  assert.match(rule.cookingAdjustment ?? "", /không tự quy đổi/i);
});

test("recommendation never rewrites the source recipe or ingredient quantity", () => {
  const before = structuredClone(soup);
  output([{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato" }]);
  assert.deepEqual(soup, before);
});

test("a complete original recipe stays above substitution recipes", () => {
  const complete = { ...soup, id: "complete", name: "Canh đủ nguyên liệu" };
  const results = recommendRecipes({ recipes: [soup, complete], stock: [{ id: "chicken" }, { id: "carrot" }, { id: "potato" }, { id: "sweet-potato" }], ingredients, preferences: prefs, now });
  assert.equal(results[0].recipeId, "complete");
  assert.equal(results[0].category, "ready");
});

test("recipe ranking is deterministic when substitutions are present", () => {
  const stock = [{ id: "chicken" }, { id: "carrot" }, { id: "sweet-potato" }];
  const first = recommendRecipes({ recipes: [soup], stock, ingredients, preferences: prefs, now });
  const second = recommendRecipes({ recipes: [soup], stock, ingredients, preferences: prefs, now });
  assert.deepEqual(first, second);
});

test("an empty fridge does not produce a cook-with-substitution recommendation", () => {
  assert.notEqual(output([]).category, "substitution");
});

test("every active rule is explicitly sourced and verified", () => {
  assert.ok(ingredientSubstitutions.length > 0);
  assert.ok(ingredientSubstitutions.every((rule) => rule.verificationStatus === "verified" && rule.sourceUrl?.startsWith("https://")));
});
