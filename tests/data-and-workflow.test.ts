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

test("YouTube catalog có schema hợp lệ, ID duy nhất và metadata freshness", async () => {
  const data = JSON.parse(await readFile(new URL("../public/data/youtube/catalog.json", import.meta.url), "utf8"));
  assert.equal(data.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(data.updatedAt)));
  assert.ok(Array.isArray(data.videos));
  assert.equal(new Set(data.videos.map((video: { videoId: string }) => video.videoId)).size, data.videos.length);
  for (const video of data.videos) {
    assert.ok(video.videoId && video.title && video.lastValidatedAt && video.discoveredAt);
    assert.equal(video.platform, "youtube");
    assert.equal(video.id, video.videoId);
    assert.equal(video.videoUrl, `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`);
    assert.ok(["unknown", "available"].includes(video.availabilityStatus));
    assert.ok(["accepted", "needs_review"].includes(video.moderationStatus));
    assert.equal(new URL(video.thumbnailUrl).protocol, "https:");
    if (video.publishedAt) assert.ok(Number.isFinite(Date.parse(video.publishedAt)));
  }
});

test("toàn bộ database hiện chưa có định lượng hoặc số khẩu phần gốc", async () => {
  const { recipes } = await loadRecipeData();
  assert.ok(recipes.length > 0);
  assert.equal(recipes.some((recipe: { servings: number | null }) => recipe.servings !== null), false);
  assert.equal(recipes.some((recipe: { ingredients: { quantity: number | null }[] }) => recipe.ingredients.some((item) => item.quantity !== null)), false);
});
