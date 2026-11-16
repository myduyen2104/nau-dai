import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getDinhduongEligibilityDecision, isDinhduongSourceRecordEligible } from "../scripts/lib/dinhduong-recipe-eligibility.mjs";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const manifest = readJson("data-archive/catalog-cleanup/eligibility-manifest.json");
const catalog = readJson("public/data/dinhduong2598-recipe-catalog.json");
const canonical = readJson("public/data/dinhduong2598-canonical-recipes.json");
const fridge = readJson("public/data/dinhduong2598-fridge-index.json");
const aliases = readJson("public/data/canonical-recipe-id-aliases.json");
const imageManifest = readJson("public/data/recipe-image-manifest.json");
const mnnm = readJson("public/data/mnnm/index.json");
const knorr = readJson("public/data/knorr/recipes.json");
const details = readdirSync("public/data/recipes")
  .filter((file) => /^[\da-f]{2}\.json$/i.test(file))
  .flatMap((file) => readJson(join("public/data/recipes", file)));
const byName = (name: string) => catalog.find((recipe: { name: string }) => recipe.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"));

test("runtime catalogs contain no explicit DELETE or quarantined REVIEW source URL", () => {
  const nonKeptUrls = new Set(manifest.entries.filter((entry: { decision: string }) => entry.decision !== "KEEP").map((entry: { sourceUrl: string }) => entry.sourceUrl));
  assert.equal(catalog.some((recipe: { source_url: string }) => nonKeptUrls.has(recipe.source_url)), false);
  assert.equal(details.some((recipe: { source_url: string }) => nonKeptUrls.has(recipe.source_url)), false);
  assert.equal(canonical.some((recipe: { variants?: { id: string }[] }) => recipe.variants?.some((variant) => nonKeptUrls.has(variant.id.replace(/#variant-\d+$/, "")))), false);
});

test("confirmed packaged products are excluded while home-cookable dishes remain", () => {
  for (const name of ["Bánh Chocopie orion", "Bánh gạo one one vị ngọt", "Bánh Solite vị dâu", "Bánh snack bắp ngọt oishi", "Yakult"]) assert.equal(byName(name), undefined, `${name} should not be active`);
  for (const name of ["Bánh canh cua", "Bánh canh giò heo", "Bánh xèo đặc biệt (Miền Tây", "Bánh bèo", "Bánh Plan nhà làm"]) assert.ok(byName(name), `${name} should remain active`);
  const brandIngredientRecipe = byName("A- Nui tôm thịt");
  assert.ok(brandIngredientRecipe, "recipe using Knorr as an ingredient should remain active");
  assert.ok(brandIngredientRecipe.ingredients?.some((name: string) => /knorr/i.test(name)));
});

test("an incomplete but cookable recipe is preserved and REVIEW decisions are separate from DELETE", () => {
  const cookable = byName("Bánh canh cua");
  assert.ok(cookable);
  assert.equal(cookable.has_ingredients, true);
  const review = manifest.entries.find((entry: { decision: string; evidence?: { relatedTitles?: string[] } }) => entry.decision === "REVIEW" && entry.evidence?.relatedTitles?.some((title) => /bích qui/i.test(title)));
  assert.ok(review);
  assert.equal(getDinhduongEligibilityDecision(review.sourceUrl).decision, "REVIEW");
  assert.equal(isDinhduongSourceRecordEligible({ source_url: review.sourceUrl }), false);
  const deleteEntry = manifest.entries.find((entry: { decision: string }) => entry.decision === "DELETE");
  assert.ok(deleteEntry);
  assert.equal(isDinhduongSourceRecordEligible({ source_url: deleteEntry.sourceUrl }), false);
  assert.equal(isDinhduongSourceRecordEligible({ source_url: "https://dinhduong2598.food/mon-an/new-uncatalogued-home-recipe" }), true);
});

test("aliases, fridge index and image manifest do not point to quarantined canonical records", () => {
  const nonKeptCanonicalIds = new Set(manifest.entries.filter((entry: { decision: string }) => entry.decision !== "KEEP").map((entry: { evidence?: { canonicalRecipeId?: string } }) => entry.evidence?.canonicalRecipeId).filter(Boolean));
  assert.equal(canonical.some((recipe: { canonicalRecipeId: string }) => nonKeptCanonicalIds.has(recipe.canonicalRecipeId)), false);
  assert.equal(fridge.some((recipe: { canonical_recipe_id: string }) => nonKeptCanonicalIds.has(recipe.canonical_recipe_id)), false);
  assert.equal(Object.values(aliases).some((id) => nonKeptCanonicalIds.has(String(id))), false);
  assert.equal(imageManifest.records.some((record: { source: string; canonicalRecipeId?: string }) => record.source === "dinhduong2598" && nonKeptCanonicalIds.has(record.canonicalRecipeId ?? "")), false);
});

test("other recipe sources are unaffected by Dinhduong cleanup", () => {
  assert.equal(mnnm.recipes.length, 2523);
  assert.equal(knorr.length, 535);
  assert.equal(catalog.length, 1995);
  assert.equal(canonical.length, 1995);
});
