import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeIngredientSignature, normalizeSourceMethod, servingTitleIdentity } from "../scripts/lib/recipe-serving-identity.mjs";
import { isDinhduongSourceRecordEligible } from "../scripts/lib/dinhduong-recipe-eligibility.mjs";
import { migrateCanonicalIdList } from "../src/utils/canonicalIdMigration.ts";
import { filterSourceRecipeCatalog, type SourceRecipeCatalogItem } from "../src/services/sourceRecipeCatalog.ts";

const source = JSON.parse(await readFile(new URL("../dinhduong2598_final_export/recipes_with_health_tags.json", import.meta.url), "utf8"));
const eligibleSource = source.filter(isDinhduongSourceRecordEligible);
const canonical = JSON.parse(await readFile(new URL("../public/data/dinhduong2598-canonical-recipes.json", import.meta.url), "utf8"));
const sourceById = new Map(source.map((row: { id: string }) => [row.id, row]));

test("serving normalizer strips supported weights and sizes but preserves recipe identity", () => {
  const titles = [
    "Bánh chuối chiên (120g/ cái lớn)",
    "Bánh chuối chiên (120G/Cái lớn)",
    "Bánh chuối chiên (65g/ cái bé)",
    "Bánh chuối chiên (65g/ Cái bé))",
  ].map(servingTitleIdentity);
  assert.equal(new Set(titles.map((item) => item.normalizedCanonicalName)).size, 1);
  assert.deepEqual(titles.map((item) => item.serving.weightGrams), [120, 120, 65, 65]);
  assert.deepEqual(titles.map((item) => item.serving.size), ["large", "large", "small", "small"]);
  assert.notEqual(servingTitleIdentity("Bánh chuối bắp").normalizedCanonicalName, titles[0].normalizedCanonicalName);
  assert.notEqual(servingTitleIdentity("Bánh chuối chiên").normalizedCanonicalName, servingTitleIdentity("Bánh chuối chiên hấp").normalizedCanonicalName);
  assert.notEqual(servingTitleIdentity("Mè").normalizedCanonicalName, servingTitleIdentity("Me").normalizedCanonicalName);
  assert.equal(servingTitleIdentity("Bánh chuối chiên (size S)").canonicalName, "Bánh chuối chiên");
  const breadLoaves = ["Bánh mì cá hộp", "Bánh mì cá hộp (Ổ lớn)", "Bánh mì chả lụa (Ổ vừa)"].map(servingTitleIdentity);
  assert.equal(breadLoaves[0].normalizedCanonicalName, breadLoaves[1].normalizedCanonicalName);
  assert.equal(breadLoaves[1].serving.servingUnit, "o");
  assert.equal(breadLoaves[1].serving.size, "large");
  assert.equal(breadLoaves[2].serving.size, "medium");
  const corn = servingTitleIdentity("Bắp nếp luộc (1/2Trái vừa)");
  assert.equal(corn.canonicalName, "Bắp nếp luộc");
  assert.equal(corn.serving.servingUnit, "trai");
  assert.equal(corn.serving.size, "medium");
  assert.equal(servingTitleIdentity("Bắp nếp luộc (1/2Trái vừa").canonicalName, "Bắp nếp luộc");
  assert.equal(servingTitleIdentity("Bánh mì cá hộp (Ổ lớn").canonicalName, "Bánh mì cá hộp");
  assert.equal(servingTitleIdentity("Bánh plan nhà làm 60g/ cái to").canonicalName, "Bánh plan nhà làm");
  assert.equal(servingTitleIdentity("Bò cuốn lá lốt bình dân (8 cuốn/phần").canonicalName, "Bò cuốn lá lốt bình dân");
  assert.equal(servingTitleIdentity("Nhãn nhục đá (100ml/ ly").canonicalName, "Nhãn nhục đá");
  assert.equal(servingTitleIdentity("Bánh chuối chiên 100 gram").normalizedCanonicalName, titles[0].normalizedCanonicalName);
  assert.notEqual(normalizeSourceMethod("Bánh chuối chiên"), normalizeSourceMethod("Bánh chuối hấp"));
});

test("banana fritter portions collapse to one canonical row while source nutrition stays per source ID", async () => {
  const matches = canonical.filter((recipe: { canonicalTitle: string }) => recipe.canonicalTitle === "Bánh chuối chiên");
  assert.equal(matches.length, 1);
  const recipe = matches[0];
  assert.equal(recipe.servingVariants.length, 4);
  const rows = recipe.servingVariants.map((variant: { sourceRecipeId: string }) => sourceById.get(variant.sourceRecipeId)! as { nutrition: Record<string, number | null>; serving: { quantity_value: number } });
  const byWeight = new Map(rows.map((row) => [row.serving.quantity_value, row.nutrition.kcal]));
  assert.equal(byWeight.get(65), 139);
  assert.equal(byWeight.get(120), 256.6);
  for (const variant of recipe.servingVariants) {
    const original = sourceById.get(variant.sourceRecipeId) as { nutrition: unknown };
    assert.deepEqual(variant.nutrition, original.nutrition);
  }
  const catalog = JSON.parse(await readFile(new URL("../public/data/dinhduong2598-recipe-catalog.json", import.meta.url), "utf8"));
  const item = catalog.find((entry: { name: string }) => entry.name === "Bánh chuối chiên");
  assert.deepEqual(item.serving_options.map((option: { weightGrams: number }) => option.weightGrams), [65, 120]);
  assert.deepEqual(item.serving_options.map((option: { nutrition: { kcal: number } }) => option.nutrition.kcal), [139, 256.6]);
  assert.ok(item.legacy_canonical_ids.length >= 3);
  assert.equal(filterSourceRecipeCatalog(catalog as SourceRecipeCatalogItem[], { query: "Bánh chuối chiên 65g" }).filter((entry) => entry.name === "Bánh chuối chiên").length, 1);
  assert.equal(filterSourceRecipeCatalog(catalog as SourceRecipeCatalogItem[], { query: "Bánh chuối chiên cái lớn" }).filter((entry) => entry.name === "Bánh chuối chiên").length, 1);
});

test("all source variants and their exact nutrition remain reachable after canonical merges", async () => {
  const variants = canonical.flatMap((recipe: { sourceServingVariants?: { sourceRecipeId: string; nutrition: unknown; servingRaw: string | null }[]; servingVariants: { sourceRecipeId: string; nutrition: unknown; servingRaw: string | null }[] }) => recipe.sourceServingVariants ?? recipe.servingVariants);
  assert.equal(variants.length, eligibleSource.length);
  assert.equal(new Set(variants.map((variant: { sourceRecipeId: string }) => variant.sourceRecipeId)).size, eligibleSource.length);
  for (const variant of variants) {
    const original = sourceById.get(variant.sourceRecipeId) as { nutrition: unknown; serving: { raw: string | null } | null };
    assert.ok(original, `missing original source row ${variant.sourceRecipeId}`);
    assert.deepEqual(variant.nutrition, original.nutrition);
    assert.equal(variant.servingRaw, original.serving?.raw ?? null);
  }
  for (const recipe of canonical.filter((item: { legacyCanonicalIds: string[] }) => item.legacyCanonicalIds.length)) {
    const shownOptions = recipe.servingVariants.map((item: { sourceRecipeId: string }) => item.sourceRecipeId);
    const allSourceOptions = recipe.sourceServingVariants.map((item: { sourceRecipeId: string }) => item.sourceRecipeId);
    assert.ok(shownOptions.every((id: string) => allSourceOptions.includes(id)));
    assert.ok(shownOptions.length <= allSourceOptions.length);
  }
  const aliases = JSON.parse(await readFile(new URL("../public/data/canonical-recipe-id-aliases.json", import.meta.url), "utf8"));
  const liveIds = new Set(canonical.map((recipe: { canonicalRecipeId: string }) => recipe.canonicalRecipeId));
  assert.ok(Object.values(aliases).every((target: unknown) => typeof target === "string" && liveIds.has(target)));
});

test("ID migration redirects retired canonical IDs without dropping or duplicating saved references", () => {
  const aliases = new Map([["dinhduong2598:old-small", "dinhduong2598:survivor"], ["dinhduong2598:old-large", "dinhduong2598:survivor"]]);
  assert.deepEqual(migrateCanonicalIdList(["dinhduong2598:old-small", "internal:r1", "dinhduong2598:old-large"], aliases), ["dinhduong2598:survivor", "internal:r1"]);
});

test("empty source ingredient evidence is not treated as a positive ingredient match", () => {
  assert.equal(normalizeIngredientSignature({ ingredients: null }), "ingredients-unspecified");
  assert.equal(normalizeIngredientSignature({ ingredients: [{ name: "Mè" }] }), "mè");
});
