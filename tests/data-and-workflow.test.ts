import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadRecipeData, validateRecipeData } from "../scripts/load-recipe-data.mjs";

test("recipe database có ID hợp lệ, bước rõ ràng, tham chiếu nguyên liệu hợp lệ và chưa giả định định lượng", async () => {
  const { ingredients, recipes } = await loadRecipeData();
  assert.deepEqual(validateRecipeData({ ingredients, recipes }), []);
  const ingredientIds = new Set(ingredients.map((item: { id: string }) => item.id));
  assert.equal(ingredientIds.size, ingredients.length);
  assert.equal(new Set(recipes.map((item: { id: string }) => item.id)).size, recipes.length);
  for (const recipe of recipes) {
    assert.equal(recipe.verificationStatus, "unverified");
    assert.ok(recipe.steps.length > 0 && recipe.steps.every((step: { instruction: string }) => step.instruction.trim()));
    assert.ok(recipe.ingredients.every((item: { ingredientId: string; quantity: number | null }) => ingredientIds.has(item.ingredientId) && item.quantity === null));
    assert.ok(recipe.ingredients.every((item: { role?: string }) => ["main", "required", "seasoning", "optional"].includes(item.role ?? "")));
  }
});

test("trend dữ liệu khởi tạo rỗng, không tự tạo video hoặc thống kê mẫu", async () => {
  const data = JSON.parse(await readFile(new URL("../src/data/trending.json", import.meta.url), "utf8"));
  assert.equal(data.updatedAt, null);
  assert.deepEqual(data.videos, []);
});

test("toàn bộ database hiện chưa có định lượng hoặc số khẩu phần gốc", async () => {
  const { recipes } = await loadRecipeData();
  assert.ok(recipes.length > 0);
  assert.equal(recipes.some((recipe: { servings: number | null }) => recipe.servings !== null), false);
  assert.equal(recipes.some((recipe: { ingredients: { quantity: number | null }[] }) => recipe.ingredients.some((item) => item.quantity !== null)), false);
});
