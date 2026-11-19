import test from "node:test";
import assert from "node:assert/strict";
import { sourceInstructionParagraphs, sourceRecipeEligibleForFridge } from "../src/services/sourceRecipeCatalog.ts";

test("source detail is fridge-eligible only with complete method and ingredient evidence", () => {
  const ingredients = [{ name: "Cà rốt", quantity_raw: "100 g", quantity_value: 100, quantity_unit: "g" }];
  assert.equal(sourceRecipeEligibleForFridge({ instructions_raw: "Nấu món ăn", ingredients, quality_status: "complete" }), true);
  assert.equal(sourceRecipeEligibleForFridge({ instructions_raw: "Nấu món ăn", ingredients, quality_status: "needs_review" }), false);
  assert.equal(sourceRecipeEligibleForFridge({ instructions_raw: " ", ingredients, quality_status: "complete" }), false);
  assert.equal(sourceRecipeEligibleForFridge({ instructions_raw: "Nấu món ăn", ingredients: [], quality_status: "complete" }), false);
});

test("instruction paragraphs preserve explicit source structure and unclear wording", () => {
  assert.deepEqual(sourceInstructionParagraphs("Bước 1: Rửa sạch\n\nBước 2: Nấu chín"), ["Bước 1: Rửa sạch", "Bước 2: Nấu chín"]);
  assert.deepEqual(sourceInstructionParagraphs("Rửa nguyên liệu rồi nấu chín."), ["Rửa nguyên liệu rồi nấu chín."]);
});
