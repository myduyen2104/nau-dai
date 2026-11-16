import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const recent = JSON.parse(await readFile(new URL("../public/data/mnnm/recent.json", import.meta.url), "utf8"));

test("MNMN home feed contains only the newest recipes with instructions", () => {
  assert.ok(recent.recipes.length > 0 && recent.recipes.length <= 8);
  assert.ok(recent.recipes.every((recipe: { has_instructions: boolean; published_at?: string; updated_at?: string }) => recipe.has_instructions && (recipe.published_at || recipe.updated_at)));
  const dates = recent.recipes.map((recipe: { published_at?: string; updated_at?: string }) => Date.parse(recipe.published_at || recipe.updated_at || ""));
  assert.ok(dates.every((date: number, index: number) => index === 0 || dates[index - 1] >= date), "recipes should be ordered newest first");
});
