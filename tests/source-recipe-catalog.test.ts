import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { filterSourceRecipeCatalog, sourceRecipeEligibleForFridge, sourceRecipeMissingIngredients, type SourceRecipeCatalogItem } from "../src/services/sourceRecipeCatalog.ts";

const catalog = JSON.parse(await readFile(new URL("../public/data/dinhduong2598-recipe-catalog.json", import.meta.url), "utf8")) as SourceRecipeCatalogItem[];

test("catalog exposes unique canonical dishes without obvious non-recipe records", () => {
  assert.equal(catalog.length, 1995);
  assert.ok(catalog.every((item) => !/^(?:acb|hương test 25032024|test 14032024|x)$/i.test(item.name.trim())));
  assert.equal(new Set(catalog.map((item) => item.canonical_recipe_id)).size, catalog.length);
  assert.equal(catalog.filter((item) => item.has_instructions).length, 1191);
  assert.equal(catalog.filter((item) => !item.has_instructions).length, 804);
  assert.equal(catalog.filter((item) => item.quality_status === "complete" && item.has_instructions && item.has_ingredients).length, 194);
});

test("pantry matching supports curated Vietnamese source aliases", () => {
  const fixture: SourceRecipeCatalogItem[] = [{ id: "alias", name: "Ngao xào", source_url: null, category: null, age_group: null, ingredients: ["Ngao biển trắng (thịt ngao)", "Hành lá (hành hoa)"], quality_status: "complete", has_instructions: true, has_ingredients: true, detail_shard: "aa" }];
  assert.equal(filterSourceRecipeCatalog(fixture, { pantryIngredients: ["nghêu"], pantryMode: "any" }).length, 1);
  assert.equal(sourceRecipeMissingIngredients(fixture[0], ["nghêu", "hành hoa"])?.length, 0);
  assert.equal(filterSourceRecipeCatalog(fixture, { pantryIngredients: ["bí đỏ"], pantryMode: "any" }).length, 0);
});

test("fridge eligibility requires method, ingredients and complete quality status", () => {
  const base = { instructions_raw: "Nấu theo hướng dẫn nguồn", ingredients: [{ name: "Cà rốt", quantity_raw: "20 g", quantity_value: 20, quantity_unit: "g" }] };
  assert.equal(sourceRecipeEligibleForFridge({ ...base, quality_status: "complete" }), true);
  assert.equal(sourceRecipeEligibleForFridge({ ...base, quality_status: "needs_review" }), false);
  assert.equal(sourceRecipeEligibleForFridge({ ...base, instructions_raw: null, quality_status: "complete" }), false);
  assert.equal(sourceRecipeEligibleForFridge({ ...base, ingredients: null, quality_status: "complete" }), false);
  assert.equal(sourceRecipeEligibleForFridge({ ...base, quality_status: "unmatched" }), false);
});

test("catalog filters combine category, age group and pantry ingredients", () => {
  const fixture: SourceRecipeCatalogItem[] = [{ id: "age-item", name: "Món thử", source_url: null, category: "Món mặn", age_group: "8-18 tuổi", ingredients: ["Cà rốt", "Thịt gà"], quality_status: "complete", has_instructions: true, has_ingredients: true, detail_shard: "aa" }];
  const results = filterSourceRecipeCatalog(fixture, { category: "Món mặn", ageGroup: "8-18 tuổi", pantryIngredients: ["Cà rốt"], pantryMode: "any" });
  assert.deepEqual(results.map((item) => item.id), ["age-item"]);
});
