import { mkdir, readFile, writeFile } from "node:fs/promises";

const project = new URL("../", import.meta.url);
const input = JSON.parse(await readFile(new URL("public/data/dinhduong2598-canonical-recipes.json", project), "utf8"));
const outputDir = new URL("public/data/", project);
await mkdir(outputDir, { recursive: true });
const excludedDisplayTitles = new Map([
  ["", "Tên món bị trống; biến thể nguồn chỉ có mã sản phẩm, không phải tên món."],
  ["acb", "Tên không nhận diện được là món ăn; bản ghi không có hướng dẫn nấu."],
  ["hương test 25032024", "Tên bản ghi chứa nhãn TEST; không phải tên món để hiển thị."],
  ["test 14032024", "Tên bản ghi chứa nhãn TEST; không phải tên món để hiển thị."],
  ["x", "Tên chỉ có một ký tự và không nhận diện được là món ăn."],
]);
const excludedDisplayRecords = input
  .filter((recipe) => excludedDisplayTitles.has(String(recipe.canonicalTitle ?? "").trim().toLocaleLowerCase("vi")))
  .map((recipe) => ({ canonicalRecipeId: recipe.canonicalRecipeId, canonicalTitle: recipe.canonicalTitle, reason: excludedDisplayTitles.get(String(recipe.canonicalTitle ?? "").trim().toLocaleLowerCase("vi")) }));
const includedInput = input.filter((recipe) => !excludedDisplayTitles.has(String(recipe.canonicalTitle ?? "").trim().toLocaleLowerCase("vi")));
function buildServingOptions(variants, preferredSourceRecipeId) {
  const grouped = new Map();
  for (const variant of variants) {
    const measurementKey = JSON.stringify([variant.weightGrams ?? null, variant.servingUnit ?? null, variant.size ?? null]);
    const nutritionKey = JSON.stringify(variant.nutrition ?? null);
    const contentKey = variant.contentFingerprint ?? variant.sourceRecipeId;
    const key = `${measurementKey}|nutrition:${nutritionKey}|content:${contentKey}`;
    const option = grouped.get(key) ?? {
      sourceRecipeId: variant.sourceRecipeId,
      detailShard: variant.detailShard,
      sourceRecipeIds: [],
      weightGrams: variant.weightGrams ?? null,
      servingUnit: variant.servingUnit ?? null,
      size: variant.size ?? null,
      servingRaw: variant.servingRaw ?? null,
      sourceTitle: variant.sourceTitle,
      contentFingerprint: contentKey,
      nutrition: variant.nutrition ?? null,
      ageGroups: [],
      ageScopeIncomplete: false,
      measurementKey,
    };
    option.sourceRecipeIds.push(variant.sourceRecipeId);
    if (variant.sourceRecipeId === preferredSourceRecipeId) {
      option.sourceRecipeId = variant.sourceRecipeId;
      option.detailShard = variant.detailShard;
      option.sourceTitle = variant.sourceTitle;
    }
    if (variant.ageGroup && !option.ageGroups.includes(variant.ageGroup)) option.ageGroups.push(variant.ageGroup);
    if (!variant.ageGroup) option.ageScopeIncomplete = true;
    grouped.set(key, option);
  }
  const options = [...grouped.values()];
  const nutritionKeysByMeasurement = new Map();
  const contentKeysByMeasurement = new Map();
  for (const option of options) {
    nutritionKeysByMeasurement.set(option.measurementKey, [...(nutritionKeysByMeasurement.get(option.measurementKey) ?? []), JSON.stringify(option.nutrition)]);
    contentKeysByMeasurement.set(option.measurementKey, [...(contentKeysByMeasurement.get(option.measurementKey) ?? []), option.contentFingerprint]);
  }
  const baseLabels = options.map((option) => {
    const sizeLabel = option.size === "small" ? "nhỏ" : option.size === "medium" ? "vừa" : option.size === "large" ? "lớn" : null;
    const servingUnit = option.servingUnit ? String(option.servingUnit).toLocaleLowerCase("vi") : null;
    const label = [servingUnit ? `1 ${servingUnit}${sizeLabel ? ` ${sizeLabel}` : ""}` : sizeLabel, option.weightGrams !== null ? `${option.weightGrams} g` : option.servingRaw]
      .filter(Boolean).join(" · ") || option.sourceTitle;
    const nutritionConflict = new Set(nutritionKeysByMeasurement.get(option.measurementKey) ?? []).size > 1;
    const sourceRecipeConflict = new Set(contentKeysByMeasurement.get(option.measurementKey) ?? []).size > 1;
    return { ...option, label, nutritionConflict, sourceRecipeConflict, ageGroups: option.ageGroups.sort((a, b) => a.localeCompare(b, "vi")) };
  });
  const labelCounts = new Map();
  for (const option of baseLabels) labelCounts.set(option.label, (labelCounts.get(option.label) ?? 0) + 1);
  const duplicateLabelIndexes = new Map();
  return baseLabels.map((option) => {
    if ((labelCounts.get(option.label) ?? 0) < 2) return option;
    const index = (duplicateLabelIndexes.get(option.label) ?? 0) + 1;
    duplicateLabelIndexes.set(option.label, index);
    return { ...option, label: `${option.label} · nguồn ${index}` };
  }).sort((a, b) => (a.weightGrams ?? Number.POSITIVE_INFINITY) - (b.weightGrams ?? Number.POSITIVE_INFINITY) || a.label.localeCompare(b.label, "vi"));
}
const catalog = includedInput.map((recipe) => {
  const servingOptions = buildServingOptions(recipe.ingredientListConflict ? [] : (recipe.servingVariants ?? []), recipe.canonicalVariantId);
  const measurementKeys = new Set((recipe.servingVariants ?? []).map((variant) => JSON.stringify([variant.weightGrams ?? null, variant.servingUnit ?? null, variant.size ?? null])));
  const hasServingTitle = (recipe.servingVariants ?? []).some((variant) => variant.hasServingDescriptor);
  const hasServingDataDifference = measurementKeys.size > 1;
  const showServingOptions = servingOptions.length > 1 && (hasServingTitle || hasServingDataDifference);
  return {
  id: recipe.canonicalVariantId,
  canonical_recipe_id: recipe.canonicalRecipeId,
  name: recipe.canonicalTitle,
  source_url: recipe.source_url,
  category: recipe.category,
  category_labels: recipe.categoryLabels,
  age_group: recipe.ageGroup,
  available_age_groups: recipe.availableAgeGroups,
  variant_count: recipe.displayVariantCount ?? recipe.variantCount,
  source_record_count: recipe.variantCount,
  ingredient_list_conflict: recipe.ingredientListConflict,
  ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ingredient) => ingredient.name).filter(Boolean) : null,
  quality_status: recipe.qualityStatus,
  warnings: recipe.warnings ?? [],
  has_instructions: recipe.has_instructions,
  has_ingredients: recipe.has_ingredients,
  detail_shard: recipe.detail_shard,
  variants: recipe.variants,
  legacy_canonical_ids: recipe.legacyCanonicalIds ?? [],
  serving_options: showServingOptions ? servingOptions : [],
  serving_search_terms: (recipe.servingVariants ?? []).flatMap((variant) => [variant.sourceTitle, variant.servingRaw, variant.weightGrams !== null ? `${variant.weightGrams}g ${variant.weightGrams} gram` : null, variant.size, variant.servingUnit].filter(Boolean)),
};
});
await writeFile(new URL("dinhduong2598-recipe-catalog.json", outputDir), JSON.stringify(catalog));
const idAliases = Object.fromEntries(catalog.flatMap((recipe) => (recipe.legacy_canonical_ids ?? []).map((oldId) => [oldId, recipe.canonical_recipe_id])));
await writeFile(new URL("canonical-recipe-id-aliases.json", outputDir), `${JSON.stringify(idAliases)}\n`);
console.log(`Wrote ${catalog.length} deduplicated source dishes to public/data/dinhduong2598-recipe-catalog.json; excluded ${excludedDisplayRecords.length} obvious non-recipe/test records from the app catalog.`);
