import test from "node:test";
import assert from "node:assert/strict";
import { recordRecentRecipe, visibleRecentRecipes } from "../src/utils/recipeHistory.ts";

test("xem lại món đưa ID lên đầu, bỏ trùng và giữ giới hạn lịch sử cũ", () => {
  assert.deepEqual(recordRecentRecipe(["a", "b", "a"], "b"), ["b", "a"]);
  assert.equal(recordRecentRecipe(Array.from({ length: 20 }, (_, i) => `recipe-${i}`), "new").length, 20);
});

test("lịch sử hiển thị theo thứ tự cũ đã lưu và bỏ recipe ID không còn trong database", () => {
  assert.deepEqual(visibleRecentRecipes(["new", "removed", "old"], new Set(["new", "old"])), ["new", "old"]);
});
