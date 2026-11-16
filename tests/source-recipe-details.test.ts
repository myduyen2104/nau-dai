import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { clearSourceRecipeDetailCache, loadSourceRecipeDetail } from "../src/services/sourceRecipeDetails.ts";
import { sourceInstructionParagraphs, sourceRecipeCompleteness, sourceRecipeWarnings, type SourceRecipeDetail } from "../src/services/sourceRecipeCatalog.ts";
import { getSourceInstructionSupplement } from "../src/services/sourceInstructionSupplements.ts";

const sourceRows = JSON.parse(await readFile(new URL("../dinhduong2598_final_export/recipes_with_health_tags.json", import.meta.url), "utf8"));
const catalog = JSON.parse(await readFile(new URL("../public/data/dinhduong2598-recipe-catalog.json", import.meta.url), "utf8"));
const detailRows = new Map<string, SourceRecipeDetail>();
for (const row of sourceRows) detailRows.set(row.id, row as SourceRecipeDetail);

test("lazy detail fetch preserves source ingredients, portion, nutrition and exact method text", async () => {
  clearSourceRecipeDetailCache();
  const item = catalog.find((entry: { has_instructions: boolean; quality_status: string; warnings?: string[] }) => entry.has_instructions && entry.quality_status === "complete" && !(entry.warnings?.length));
  const expected = detailRows.get(item.id)!;
  let calls = 0;
  const detail = await loadSourceRecipeDetail(item, async () => { calls++; return Response.json([expected]); });
  assert.equal(detail.instructions_raw, expected.instructions_raw);
  assert.deepEqual(detail.ingredients, expected.ingredients);
  assert.deepEqual(detail.serving, expected.serving);
  assert.deepEqual(detail.nutrition, expected.nutrition);
  assert.equal(calls, 1);
  assert.equal(sourceRecipeCompleteness(detail), detail.warnings.length || detail.integrity_findings.length ? "recipe_with_warnings" : "cookable");
});

test("method-missing and warning-bearing records remain explicitly non-verified", () => {
  const missing = sourceRows.find((row: SourceRecipeDetail) => !row.instructions_raw) as SourceRecipeDetail;
  assert.equal(sourceRecipeCompleteness(missing), missing.ingredients?.length ? "ingredients_only" : "no_recipe_content");
  const review = sourceRows.find((row: SourceRecipeDetail) => row.quality_status === "needs_review" && row.instructions_raw) as SourceRecipeDetail;
  assert.ok(sourceRecipeWarnings(review).length > 0);
  assert.equal(sourceRecipeCompleteness(review), review.ingredients?.length ? "recipe_with_warnings" : "method_only");
});

test("complete status cannot bypass a warning or integrity finding before cooking", () => {
  const clean = sourceRows.find((row: SourceRecipeDetail) => row.quality_status === "complete" && row.instructions_raw && row.ingredients?.length && !row.warnings?.length && !row.integrity_findings?.length) as SourceRecipeDetail;
  assert.equal(sourceRecipeCompleteness(clean), "cookable");
  assert.equal(sourceRecipeCompleteness({ ...clean, warnings: ["instructions_missing_from_detail"] }), "recipe_with_warnings");
  assert.equal(sourceRecipeCompleteness({ ...clean, integrity_findings: ["ingredient_method_mismatch"] }), "recipe_with_warnings");
});

test("canonical-level conflicts from a sibling variant reach the runtime detail", async () => {
  clearSourceRecipeDetailCache();
  const item = catalog.find((entry: { name: string; warnings?: string[] }) => entry.name === "Canh cải cúc nấu thịt bò" && entry.warnings?.includes("recipe_method_ingredient_mismatch"));
  assert.ok(item);
  const detail = await loadSourceRecipeDetail(item, async () => Response.json([detailRows.get(item.id)]));
  assert.ok(sourceRecipeWarnings(detail).includes("recipe_method_ingredient_mismatch"));
});

test("multiple catalog variants can resolve to the same source URL without collapsing IDs", () => {
  const groups = new Map<string, SourceRecipeDetail[]>();
  for (const row of sourceRows as SourceRecipeDetail[]) if (row.source_url) groups.set(row.source_url, [...(groups.get(row.source_url) ?? []), row]);
  const variants = [...groups.values()].find((group) => group.length > 1)!;
  assert.ok(variants.length > 1);
  assert.equal(new Set(variants.map((row) => row.id)).size, variants.length);
});

test("one-paragraph source directions split only at complete sentences or action-led clauses and retain the original source", () => {
  const source = "Hành phi thơm, cho thịt vào xào săn, thêm nước mắm và nước lọc rồi kho nhỏ lửa.";
  assert.deepEqual(sourceInstructionParagraphs(source), [
    "Hành phi thơm",
    "cho thịt vào xào săn",
    "thêm nước mắm và nước lọc rồi kho nhỏ lửa.",
  ]);
  assert.deepEqual(sourceInstructionParagraphs("Phi thơm hành. Cho thịt vào xào săn."), ["Phi thơm hành.", "Cho thịt vào xào săn."]);
  assert.equal(source, "Hành phi thơm, cho thịt vào xào săn, thêm nước mắm và nước lọc rồi kho nhỏ lửa.");
});

test("supplemented ingredients remain separate from nutrition-source ingredients and are marked by instruction use", async () => {
  let cases = 0;
  let additions = 0;
  const statuses = { mentioned: 0, not_mentioned: 0, optional: 0 };
  for (const item of catalog) {
    const supplement = getSourceInstructionSupplement(item.id);
    if (!supplement?.addedIngredients?.length) continue;
    const original = detailRows.get(item.id)!;
    clearSourceRecipeDetailCache();
    const detail = await loadSourceRecipeDetail(item, async () => Response.json([original]));
    assert.deepEqual(detail.source_ingredients, original.ingredients);
    assert.deepEqual(detail.nutrition, original.nutrition);
    assert.deepEqual(detail.instruction_added_ingredients?.map((entry) => entry.name), supplement.addedIngredients);
    for (const addition of detail.instruction_added_ingredients ?? []) statuses[addition.usage_status]++;
    cases++;
    additions += supplement.addedIngredients.length;
  }
  assert.equal(cases, 43);
  assert.equal(additions, 279);
  assert.deepEqual(statuses, { mentioned: 272, not_mentioned: 6, optional: 1 });
});

test("detail shard request failure is surfaced and retried on the next open", async () => {
  clearSourceRecipeDetailCache();
  const item = catalog[0];
  await assert.rejects(loadSourceRecipeDetail(item, async () => new Response("", { status: 503 })));
  const detail = detailRows.get(item.id)!;
  const recovered = await loadSourceRecipeDetail(item, async () => Response.json([detail]));
  assert.equal(recovered.id, item.id);
});
