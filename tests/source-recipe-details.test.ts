import test from "node:test";
import assert from "node:assert/strict";
import { sourceRecipeCompleteness, sourceRecipeWarnings, type SourceRecipeDetail } from "../src/services/sourceRecipeCatalog.ts";

const detail = (overrides: Partial<SourceRecipeDetail> = {}): SourceRecipeDetail => ({
  id: "source-fixture", name: "Món thử", detail_name: null, category: "Món chính", age_group: null,
  serving: null,
  ingredients: [{ name: "Cà rốt", quantity_raw: null, quantity_value: null, quantity_unit: null }],
  instructions_raw: "Rửa sạch rồi nấu chín.", nutrition: null, source_url: null, quality_status: "complete",
  warnings: [], integrity_findings: [], source_categories: [], source_age_group: null, source_tag_evidence_status: "unknown",
  ...overrides,
});

test("source detail completeness distinguishes cookable, method-only, ingredients-only and empty records", () => {
  assert.equal(sourceRecipeCompleteness(detail()), "cookable");
  assert.equal(sourceRecipeCompleteness(detail({ ingredients: null })), "method_only");
  assert.equal(sourceRecipeCompleteness(detail({ instructions_raw: null })), "ingredients_only");
  assert.equal(sourceRecipeCompleteness(detail({ ingredients: null, instructions_raw: null })), "no_recipe_content");
});

test("review and integrity flags prevent source details from appearing verified", () => {
  assert.deepEqual(sourceRecipeWarnings(detail({ quality_status: "needs_review" })), ["needs_review"]);
  assert.deepEqual(sourceRecipeWarnings(detail({ quality_status: "unmatched", warnings: ["mapping_warning", "mapping_warning"] })), ["mapping_warning", "unmatched_catalog_mapping"]);
  assert.equal(sourceRecipeCompleteness(detail({ integrity_findings: ["ingredient_method_mismatch"] })), "recipe_with_warnings");
  assert.equal(sourceRecipeCompleteness(detail({ instruction_review_status: "needs_review" })), "recipe_with_warnings");
});
