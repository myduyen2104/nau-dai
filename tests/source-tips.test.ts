import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const readJson = async <T>(path: string) => JSON.parse(await readFile(path, "utf8")) as T;

test("Món Ngon Mỗi Ngày tips are retained separately from cooking steps", async () => {
  const index = await readJson<{ recipes: { id: string; tips?: string[]; detail_shard: string }[] }>("public/data/mnnm/index.json");
  const item = index.recipes.find((recipe) => (recipe.tips?.length ?? 0) > 0);
  assert.ok(item, "expected at least one source recipe with a Mách Nhỏ section");
  const details = await readJson<{ id: string; tips?: string[]; instruction_sections: { name: string }[] }[]>(`public${item.detail_shard}`);
  const detail = details.find((recipe) => recipe.id === item.id);
  assert.ok(detail);
  assert.ok((detail.tips?.length ?? 0) > 0);
  assert.ok(detail.tips?.every((tip) => !/:\s*$/.test(tip)));
  assert.equal(detail.instruction_sections.some((section) => /mách nhỏ|mẹo hay/i.test(section.name)), false);
});

test("Knorr app recipes retain only tips explicitly marked in source instructions", async () => {
  const recipes = await readJson<{ tips: string[]; source: { url: string } }[]>("public/data/knorr/recipes.json");
  const withTips = recipes.filter((recipe) => recipe.tips.length > 0);
  assert.ok(withTips.length > 0);
  assert.ok(withTips.every((recipe) => recipe.source.url.startsWith("https://www.knorr.com/")));
  assert.ok(withTips.every((recipe) => recipe.tips.every((tip) => /mẹo|mách bạn|bí quyết|lưu ý/i.test(tip))));
  assert.ok(withTips.every((recipe) => recipe.tips.every((tip) => !/thêm một bí quyết|còn rất nhiều bí quyết|có thêm một bí quyết/i.test(tip))));
});

test("homepage cooking-tip feed contains short, linked tips from both publishers", async () => {
  const feed = await readJson<{ tips: { text: string; source: string; sourceUrl: string | null }[] }>("public/data/cooking-tips.json");
  assert.ok(feed.tips.some((tip) => tip.source === "Món Ngon Mỗi Ngày"));
  assert.ok(feed.tips.some((tip) => tip.source === "Knorr Việt Nam"));
  assert.ok(feed.tips.every((tip) => tip.text.length <= 180));
  assert.ok(feed.tips.every((tip) => tip.sourceUrl?.startsWith("https://")));
  const firstKnorr = feed.tips.find((tip) => tip.source === "Knorr Việt Nam");
  assert.ok(firstKnorr?.text, "a concise Knorr editorial tip should lead the Knorr section");
});
