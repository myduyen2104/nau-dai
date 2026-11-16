import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const recipes = JSON.parse(await readFile(new URL("../public/data/dinhduong2598-canonical-recipes.json", import.meta.url), "utf8"));
const sourceRows = JSON.parse(await readFile(new URL("../dinhduong2598_final_export/recipes_with_health_tags.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../data-archive/catalog-cleanup/eligibility-manifest.json", import.meta.url), "utf8"));
const nonKeptSourceUrls = new Set(manifest.entries.filter((entry: { decision: string }) => entry.decision !== "KEEP").map((entry: { sourceUrl: string }) => entry.sourceUrl));
const eligibleSourceRows = sourceRows.filter((row: { id: string }) => !nonKeptSourceUrls.has(row.id.replace(/#variant-\d+$/, "")));
const fridgeIndex = JSON.parse(await readFile(new URL("../public/data/dinhduong2598-fridge-index.json", import.meta.url), "utf8"));
const images = JSON.parse(await readFile(new URL("../src/data/recipe-image-manifest.json", import.meta.url), "utf8"));

test("canonical source set retains every eligible ID and groups Bạc hà xào nghêu into one dish", () => {
  assert.equal(recipes.reduce((total: number, item: { variantCount: number }) => total + item.variantCount, 0), eligibleSourceRows.length);
  const activeSourceIds = new Set(recipes.flatMap((item: { variants: { id: string }[] }) => item.variants.map((variant) => variant.id)));
  assert.deepEqual(activeSourceIds, new Set(eligibleSourceRows.map((row: { id: string }) => row.id)));
  const bacHa = recipes.filter((item: { canonicalTitle: string }) => item.canonicalTitle === "Bạc hà xào nghêu");
  assert.equal(bacHa.length, 1);
  assert.equal(bacHa[0].variantCount, 3);
  assert.equal(bacHa[0].variants.length, 3);
  assert.equal(bacHa[0].canonicalVariantId, "https://dinhduong2598.food/mon-an/cmrg0p3tw00bft8m1jmcrar3k#variant-1");
  assert.deepEqual(bacHa[0].availableAgeGroups, ["6-7 tuổi", "8-18 tuổi"]);
});

test("canonical variant selection keeps a source variant for every dish", () => {
  for (const recipe of recipes) assert.ok(recipe.variants.some((variant: { id: string }) => variant.id === recipe.canonicalVariantId));
});

test("same-title records with identical ingredients merge into the record that has source instructions", () => {
  for (const title of ["Bánh bèo", "Bánh bèo thập cẩm"]) {
    const matches = recipes.filter((item: { canonicalTitle: string }) => item.canonicalTitle === title);
    assert.equal(matches.length, 1, `${title} should have one canonical UI record`);
    assert.equal(matches[0].has_instructions, true);
    assert.ok(matches[0].variantCount > (title === "Bánh bèo" ? 1 : 7));
  }
});

test("fridge index contains unique eligible canonical dishes only", () => {
  assert.equal(fridgeIndex.length, 194);
  assert.equal(new Set(fridgeIndex.map((item: { canonical_recipe_id: string }) => item.canonical_recipe_id)).size, fridgeIndex.length);
  assert.ok(fridgeIndex.every((item: { quality_status: string; has_ingredients: boolean; has_instructions: boolean; ingredients: unknown[] }) => item.quality_status === "complete" && item.has_ingredients && item.has_instructions && item.ingredients.length > 0));
});

test("display catalog has one row per dish title and keeps the fullest recipe representative", () => {
  const normalizedTitles = recipes.map((item: { canonicalTitle: string }) => item.canonicalTitle.toLocaleLowerCase("vi").normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim());
  assert.equal(new Set(normalizedTitles).size, recipes.length);
  for (const name of ["Canh khoai mỡ nấu thịt heo", "Canh khoai mỡ nấu tôm"]) {
    const kept = recipes.filter((item: { canonicalTitle: string }) => item.canonicalTitle === name);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].has_instructions, true);
    assert.equal(kept[0].has_ingredients, true);
  }
});

test("homemade plan remains while packaged or unresolved plan products stay out of runtime", () => {
  const flan = recipes.filter((item: { canonicalTitle: string }) => /flan|plan/i.test(item.canonicalTitle));
  const normalized = flan.map((item: { canonicalTitle: string }) => item.canonicalTitle.toLocaleLowerCase("vi").normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim());
  assert.equal(new Set(normalized).size, flan.length);
  assert.equal(flan.filter((item: { canonicalTitle: string }) => item.canonicalTitle === "Bánh Plan").length, 1);
  assert.equal(flan.filter((item: { canonicalTitle: string }) => item.canonicalTitle === "Bánh Plan nhà làm").length, 1);
  assert.equal(flan.filter((item: { canonicalTitle: string }) => item.canonicalTitle === "Bánh Plan Ánh Hồng").length, 0);
  assert.equal(flan.filter((item: { canonicalTitle: string }) => item.canonicalTitle === "Bánh Plan Caramen NutiFood").length, 0);
  assert.equal(flan.filter((item: { canonicalTitle: string }) => item.canonicalTitle === "Bánh Plan làm từ hỗn hợp bột đông khô với nước").length, 0);
});

test("source programme and age prefixes do not create duplicate display cards", () => {
  assert.ok(recipes.every((item: { canonicalTitle: string }) => !/^[A-Z][A-Z0-9]{1,8}-\d{1,2}-\d{1,2}[MY]-/i.test(item.canonicalTitle)));
  assert.ok(recipes.every((item: { canonicalTitle: string }) => !/^(?:LH-\s*C\d+[-\s]*|ROHTO\s+N\s*\d+(?:\s*,\s*\d+)?\s*|N\d+(?:\s*,\s*\d+)?\s+(?:ROHTO\s+)?)/i.test(item.canonicalTitle)));
  for (const title of ["Canh bầu nấu tôm", "Cơm trắng", "Cải ngồng xào", "VỊT QUAY BẮC KINH", "Canh khoai mỡ nấu tôm khô", "Bò cuốn lá lốt đặc biệt", "Nhãn nhục đá", "Canh khoai mỡ nấu thịt heo"]) {
    assert.equal(recipes.filter((item: { canonicalTitle: string }) => item.canonicalTitle === title).length, 1);
  }
});

test("images use canonical recipe keys", () => {
  const sourceImages = images.records.filter((item: { source: string }) => item.source === "dinhduong2598");
  assert.equal(new Set(sourceImages.map((item: { recipeId: string }) => item.recipeId)).size, sourceImages.length);
  assert.ok(sourceImages.every((item: { imageType: string }) => item.imageType === "ai_illustration"));
});
