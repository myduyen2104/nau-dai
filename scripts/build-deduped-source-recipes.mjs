import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { normalizeIngredientSignature, normalizeSourceMethod, servingTitleIdentity } from "./lib/recipe-serving-identity.mjs";
import { getDinhduongEligibilityDecision, isDinhduongSourceRecordEligible } from "./lib/dinhduong-recipe-eligibility.mjs";

const project = new URL("../", import.meta.url);
const sourceInput = JSON.parse(await readFile(new URL("dinhduong2598_final_export/recipes_with_health_tags.json", project), "utf8"));
const input = sourceInput.filter(isDinhduongSourceRecordEligible);
const deletedSourceCount = sourceInput.filter((record) => getDinhduongEligibilityDecision(record).decision === "DELETE").length;
const reviewSourceCount = sourceInput.filter((record) => getDinhduongEligibilityDecision(record).decision === "REVIEW").length;
const imageManifest = JSON.parse(await readFile(new URL("src/data/recipe-image-manifest.json", project), "utf8"));
const priorCanonical = await readFile(new URL("public/data/dinhduong2598-canonical-recipes.json", project), "utf8").then(JSON.parse).catch((error) => error?.code === "ENOENT" ? [] : Promise.reject(error));
const priorMergeMap = await readFile(new URL("data-archive/catalog-cleanup/build-state/canonical-merge-map.json", project), "utf8").then(JSON.parse).catch((error) => error?.code === "ENOENT" ? { previousCanonicalIdMerges: [] } : Promise.reject(error));
const aiImageKeys = new Set(imageManifest.records.filter((record) => record.source === "dinhduong2598" && record.imageType === "ai_illustration").map((record) => `${record.source}|${record.recipeId}`));
const normalize = (value) => value.toLocaleLowerCase("vi").normalize("NFC").replace(/\s+/g, " ").trim();
const qualityRank = { complete: 4, needs_review: 3, missing_at_source: 2, unmatched: 1 };
const priorRecipeByVariantId = new Map();
for (const priorRecipe of priorCanonical) for (const variant of priorRecipe.variants ?? []) priorRecipeByVariantId.set(variant.id, priorRecipe);
const priorImageIds = new Set(imageManifest.records.filter((record) => record.source === "dinhduong2598").map((record) => record.canonicalRecipeId ?? record.recipeId));
const methodTerms = ["ap chao", "xao", "chien", "ran", "hap", "luoc", "kho", "nuong", "rim", "ham", "tron", "goi", "nau", "quay"];
function methodSignature(record) {
  const text = normalize(`${record.detail_name ?? record.name ?? ""} ${record.instructions_raw ?? ""}`)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  return methodTerms.filter((term) => new RegExp(`(?:^|\\W)${term.replace(/ /g, "\\s+")}(?:$|\\W)`).test(text)).join("+") || "method-unspecified";
}
function ingredientSignature(record) {
  if (!Array.isArray(record.ingredients) || !record.ingredients.length) return "ingredients-unspecified";
  return [...new Set(record.ingredients.map((ingredient) => normalize(ingredient.name ?? "")).filter(Boolean))].sort().join("+");
}
const groups = new Map();
const titleGroups = new Map();
const methodSignatureForRecord = (record) => methodSignature(record);
const mergeDecisions = [];
const servingMergeDecisions = [];
for (const record of input) {
  const title = (record.detail_name ?? record.name ?? "").replace(/\s+/g, " ").trim();
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) throw new Error(`Record ${record.id} has no usable title`);
  const titleGroup = titleGroups.get(normalizedTitle) ?? [];
  titleGroup.push(record);
  titleGroups.set(normalizedTitle, titleGroup);
}

for (const [normalizedTitle, titleGroup] of titleGroups) {
  const methodGroups = new Map();
  for (const record of titleGroup) {
    const signature = methodSignature(record);
    methodGroups.set(signature, [...(methodGroups.get(signature) ?? []), record]);
  }
  for (const [sourceSignature, sourceVariants] of [...methodGroups]) {
    if (!sourceVariants.every((record) => !record.instructions_raw?.trim())) continue;
    const sourceIngredientSignatures = new Set(sourceVariants.map(ingredientSignature));
    if (sourceIngredientSignatures.size !== 1 || sourceIngredientSignatures.has("ingredients-unspecified")) continue;
    const signature = [...sourceIngredientSignatures][0];
    const compatible = [...methodGroups.entries()].filter(([targetSignature, variants]) =>
      targetSignature !== sourceSignature && variants.some((variant) => ingredientSignature(variant) === signature && !!variant.instructions_raw?.trim()));
    if (compatible.length === 1) {
      compatible[0][1].push(...sourceVariants);
      mergeDecisions.push({
        normalizedTitle,
        title: sourceVariants[0].detail_name ?? sourceVariants[0].name,
        sourceVariantIds: sourceVariants.map((record) => record.id),
        fromMethodSignature: sourceSignature,
        toMethodSignature: compatible[0][0],
        ingredientSignature: signature,
        reason: "Same normalized title and exact nonempty ingredient signature; the source group has no instructions while exactly one other source group with instructions matches.",
      });
      methodGroups.delete(sourceSignature);
    }
  }
  for (const [signature, variants] of methodGroups) groups.set(`${normalizedTitle}|method:${signature}`, variants);
}

// Merge only title variants whose difference is a confidently parsed serving descriptor
// (or punctuation/case after normalization) and whose cooking/ingredient evidence agrees.
const servingBuckets = new Map();
for (const [groupKey, variants] of groups) {
  const identity = servingTitleIdentity(variants[0].detail_name ?? variants[0].name);
  const signature = methodSignature(variants[0]);
  const key = `${identity.normalizedCanonicalName}|method:${signature}`;
  const bucket = servingBuckets.get(key) ?? [];
  bucket.push({ groupKey, variants, identity, signature });
  servingBuckets.set(key, bucket);
}
for (const [key, bucket] of servingBuckets) {
  if (bucket.length < 2) continue;
  const allRows = bucket.flatMap((entry) => entry.variants);
  const titleForms = new Set(allRows.map((record) => String(record.detail_name ?? record.name ?? "").normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim()));
  if (titleForms.size < 2) continue;
  const hasServing = allRows.some((record) => servingTitleIdentity(record.detail_name ?? record.name).hasServingDescriptor);
  const ingredientSignatures = new Set(allRows.map(normalizeIngredientSignature));
  const concreteIngredientSignatures = [...ingredientSignatures].filter((signature) => signature !== "ingredients-unspecified");
  const ingredientSafe = concreteIngredientSignatures.length <= 1;
  const ageScopes = new Set(allRows.map((record) => record.source_age_group?.label ?? record.age_group ?? "").filter(Boolean));
  const categories = new Set(allRows.map((record) => record.detail_category ?? record.category ?? "").map((value) => String(value).toLocaleLowerCase("vi").replace(/\s*\([^)]*(?:tuổi|tháng)[^)]*\)/gi, "").replace(/\s+/g, " ").trim()).filter(Boolean));
  if (!ingredientSafe) {
    servingMergeDecisions.push({
      status: "manual_review",
      normalizedCanonicalName: bucket[0].identity.normalizedCanonicalName,
      canonicalName: bucket[0].identity.canonicalName,
      sourceVariantIds: allRows.map((record) => record.id),
      sourceTitles: [...titleForms],
      ingredientSignatures: [...ingredientSignatures],
      ageScopes: [...ageScopes],
      categories: [...categories],
      concreteIngredientSignatures,
      reason: "Nhiều danh sách nguyên liệu cụ thể khác nhau; cần giữ riêng để không gộp biến thể thành phần món.",
    });
    continue;
  }
  const targetKey = key;
  groups.set(targetKey, allRows);
  for (const entry of bucket) if (entry.groupKey !== targetKey) groups.delete(entry.groupKey);
  servingMergeDecisions.push({
    status: "merged_serving_variants",
    normalizedCanonicalName: bucket[0].identity.normalizedCanonicalName,
    canonicalName: bucket[0].identity.canonicalName,
    sourceVariantIds: allRows.map((record) => record.id),
    sourceTitles: [...new Set(allRows.map((record) => record.detail_name ?? record.name))],
    ingredientSignature: [...ingredientSignatures][0],
    hasServingDescriptor: hasServing,
    ageScopes: [...ageScopes],
    categories: [...categories],
    concreteIngredientSignatures,
    reason: "Cùng tên món chuẩn hóa và phương pháp; không có hai danh sách nguyên liệu cụ thể mâu thuẫn. Khác biệt tuổi, nhóm phân loại, khẩu phần và dinh dưỡng được giữ thành source variants.",
  });
}

function ageScope(record) {
  const label = record.source_age_group?.label ?? record.age_group ?? "";
  if (!label) return { scoped: false, width: Number.POSITIVE_INFINITY };
  const numbers = [...label.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")));
  const width = numbers.length >= 2 ? numbers.at(-1) - numbers[0] : 0;
  return { scoped: true, width };
}

function hasRecipeCore(record) {
  return Array.isArray(record.ingredients) && record.ingredients.length > 0
    && typeof record.instructions_raw === "string" && !!record.instructions_raw.trim();
}
function nutritionCompleteness(record) {
  return record.nutrition ? Object.values(record.nutrition).filter((value) => typeof value === "number").length : 0;
}

function displayDishIdentity(title) {
  let canonicalName = servingTitleIdentity(title).canonicalName
    // Source menu identifiers (LH-C1/C2, ROHTO N1.., N11/N27) are not part
    // of the dish identity. Their source rows remain attached as variants.
    .replace(/^(?:LH-\s*C\d+[-\s]*|ROHTO\s+N\s*\d+(?:\s*,\s*\d+)?\s*|N\d+(?:\s*,\s*\d+)?\s+(?:ROHTO\s+)?)/i, "")
    // These prefixes encode source programme and target age, not a distinct
    // dish. Keep the age scoped records as variants under one display card.
    .replace(/^[A-Z][A-Z0-9]{1,8}-\d{1,2}-\d{1,2}[MY]-/i, "")
    .replace(/\bplanl\s+àm\b/giu, "plan làm")
    .replace(/hỗn hợp bột đông khô/iu, "hỗn hợp đông khô")
    .replace(/\bsanwich\b/giu, "sandwich")
    .replace(/ốpla/giu, "ốp la")
    .replace(/điêu hồng/giu, "diêu hồng")
    .replace(/đậu phụ/giu, "đậu hũ")
    .replace(/đậu hủ/giu, "đậu hũ")
    .replace(/\bsusu\b/giu, "su su")
    .replace(/bánh qui/giu, "bánh quy")
    .replace(/\bflan\b/giu, "plan");
  if (/^canh khoai mỡ nấu thịt băm$/iu.test(canonicalName)) canonicalName = "Canh khoai mỡ nấu thịt heo";
  if (/bánh\s+plan/iu.test(canonicalName) && /ánh\s+hồng/iu.test(canonicalName)) canonicalName = "Bánh Plan Ánh Hồng";
  else if (/bánh\s+plan/iu.test(canonicalName) && /caramen/iu.test(canonicalName) && /nutifood/iu.test(canonicalName)) canonicalName = "Bánh Plan Caramen NutiFood";
  const key = normalize(canonicalName).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const displayTitle = key === "bánh plan ánh hồng" ? "Bánh Plan Ánh Hồng"
    : key === "bánh plan caramen nutifood hũ" || key === "bánh plan caramen hũ nutifood" || key === "bánh plan caramen nutifood" ? "Bánh Plan Caramen NutiFood"
      : key === "bánh plan" ? "Bánh Plan"
        : key === "bánh plan nhà làm" ? "Bánh Plan nhà làm"
          : key === "bánh plan làm từ hỗn hợp đông khô với nước" ? "Bánh Plan làm từ hỗn hợp bột đông khô với nước"
            : canonicalName;
  return { key, displayTitle };
}

function compareVariants(a, b) {
  const instructions = Number(!!b.instructions_raw?.trim()) - Number(!!a.instructions_raw?.trim());
  if (instructions) return instructions;
  const quality = (qualityRank[b.quality_status] ?? 0) - (qualityRank[a.quality_status] ?? 0);
  if (quality) return quality;
  const ageA = ageScope(a), ageB = ageScope(b);
  if (ageA.scoped !== ageB.scoped) return Number(ageA.scoped) - Number(ageB.scoped);
  if (ageA.width !== ageB.width) return ageB.width - ageA.width;
  const recipeCore = Number(hasRecipeCore(b)) - Number(hasRecipeCore(a));
  if (recipeCore) return recipeCore;
  const nutrition = nutritionCompleteness(b) - nutritionCompleteness(a);
  if (nutrition) return nutrition;
  return String(a.id).localeCompare(String(b.id));
}

const canonicalRecipes = [...groups.entries()].map(([groupKey, variants]) => {
  const identity = servingTitleIdentity(variants[0].detail_name ?? variants[0].name ?? "");
  const normalizedTitle = normalize(identity.canonicalName);
  const signatureStart = groupKey.lastIndexOf("|method:") + "|method:".length;
  const signature = groupKey.slice(signatureStart);
  const sorted = [...variants].sort(compareVariants);
  const canonical = sorted[0];
  const ageGroups = [...new Set(variants.map((variant) => variant.source_age_group?.label ?? variant.age_group).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const portions = [...new Set(variants.map((variant) => variant.serving?.raw).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const categoryLabels = [...new Set((variants.flatMap((variant) => variant.source_categories ?? []).map((category) => category.baseLabel ?? category.label).filter(Boolean)))];
  const warnings = [...new Set(variants.flatMap((variant) => variant.warnings ?? []))];
  const priorIds = [...new Set(variants.map((variant) => priorRecipeByVariantId.get(variant.id)?.canonicalRecipeId).filter(Boolean))];
  const priorRank = (id) => {
    const prior = priorCanonical.find((recipe) => recipe.canonicalRecipeId === id);
    return (priorImageIds.has(id) ? 1000 : 0)
      + (prior?.has_instructions ? 100 : 0)
      + (prior?.has_ingredients ? 30 : 0)
      + (qualityRank[prior?.qualityStatus] ?? 0) * 10
      + (prior?.nutrition && Object.values(prior.nutrition).some((value) => typeof value === "number") ? 5 : 0);
  };
  const canonicalRecipeId = priorIds.sort((a, b) => priorRank(b) - priorRank(a) || a.localeCompare(b))[0]
    ?? `dish-${createHash("sha256").update(`${normalizedTitle}|method:${signature}`).digest("hex").slice(0, 16)}`;
  const ingredientSignatures = [...new Set(variants.map(ingredientSignature))];
  return {
    canonicalRecipeId,
    source: "dinhduong2598",
    canonicalTitle: servingTitleIdentity(canonical.detail_name ?? canonical.name).canonicalName,
    normalizedTitle,
    methodSignature: signature,
    ingredientSignature: ingredientSignature(canonical),
    ingredientListConflict: ingredientSignatures.length > 1,
    ingredientSignatures,
    qualityStatus: canonical.quality_status,
    canonicalVariantId: canonical.id,
    legacyCanonicalIds: priorIds.filter((id) => id !== canonicalRecipeId),
    canonicalSelectionReason: `Chọn theo thứ tự quality_status (${canonical.quality_status}), nhóm tuổi ít ràng buộc nhất, độ đầy đủ dữ liệu, rồi ID ổn định.` ,
    variantCount: variants.length,
    variants: variants.map((variant) => ({
      id: variant.id,
      title: variant.name,
      ageGroup: variant.source_age_group?.label ?? variant.age_group ?? null,
      portion: variant.serving?.raw ?? null,
      qualityStatus: variant.quality_status,
      hasIngredients: Array.isArray(variant.ingredients) && variant.ingredients.length > 0,
      hasInstructions: typeof variant.instructions_raw === "string" && !!variant.instructions_raw.trim(),
      detailShard: createHash("sha1").update(variant.id).digest("hex").slice(0, 2),
      ingredientNames: Array.isArray(variant.ingredients) ? [...new Set(variant.ingredients.map((ingredient) => ingredient.name).filter(Boolean))] : null,
      category: variant.source_categories?.[0]?.label ?? variant.category ?? null,
      sourceUrl: variant.source_url ?? null,
    })),
    servingVariants: variants.map((variant) => {
      const servingIdentity = servingTitleIdentity(variant.detail_name ?? variant.name);
      return {
        sourceRecipeId: variant.id,
        sourceTitle: variant.detail_name ?? variant.name,
        contentFingerprint: createHash("sha256").update(JSON.stringify({ ingredients: variant.ingredients ?? null, instructions: variant.instructions_raw ?? null })).digest("hex"),
        servingRaw: variant.serving?.raw ?? null,
        hasServingDescriptor: servingIdentity.hasServingDescriptor,
        weightGrams: variant.serving?.quantity_unit?.toLocaleLowerCase("en") === "g"
          ? variant.serving?.quantity_value ?? servingIdentity.serving.weightGrams : servingIdentity.serving.weightGrams,
        servingUnit: variant.serving?.portion_label ?? servingIdentity.serving.servingUnit,
        size: servingIdentity.serving.size,
        nutrition: variant.nutrition ?? null,
        ageGroup: variant.source_age_group?.label ?? variant.age_group ?? null,
        detailShard: createHash("sha1").update(variant.id).digest("hex").slice(0, 2),
      };
    }),
    availableAgeGroups: ageGroups,
    availablePortions: portions,
    dedupeStatus: variants.length > 1 ? "merged_exact_normalized_title" : "unique_title",
    dedupeReason: variants.length > 1 ? `Gộp ${variants.length} record cùng tên chuẩn hóa và dấu hiệu chế biến (${signature}) trong cùng nguồn. Khác biệt nguyên liệu/định lượng vẫn lưu ở từng biến thể; nếu danh sách nguyên liệu khác nhau, đặt cảnh báo và chỉ dùng danh sách canonical cho gợi ý.` : "Không có record cùng tên và dấu hiệu chế biến chuẩn hóa trong cùng nguồn.",
    category: canonical.source_categories?.[0]?.baseLabel ?? canonical.category ?? categoryLabels[0] ?? null,
    categoryLabels,
    ageGroup: canonical.source_age_group?.label ?? canonical.age_group ?? null,
    source_url: canonical.source_url ?? null,
    detail_shard: createHash("sha1").update(canonical.id).digest("hex").slice(0, 2),
    ingredients: Array.isArray(canonical.ingredients) ? canonical.ingredients.map(({ name, quantity_raw, quantity_value, quantity_unit }) => ({ name, quantity_raw: quantity_raw ?? null, quantity_value: quantity_value ?? null, quantity_unit: quantity_unit ?? null })) : null,
    instructions_raw: canonical.instructions_raw ?? null,
    nutrition: canonical.nutrition ?? null,
    serving: canonical.serving ?? null,
    has_instructions: typeof canonical.instructions_raw === "string" && !!canonical.instructions_raw.trim(),
    has_ingredients: Array.isArray(canonical.ingredients) && canonical.ingredients.length > 0,
    warnings,
    showInExplore: true,
    showInFridgeSuggestions: canonical.quality_status === "complete" && Array.isArray(canonical.ingredients) && canonical.ingredients.length > 0 && !!canonical.instructions_raw?.trim(),
    imageKey: `dinhduong2598|${canonicalRecipeId}`,
    hasAiIllustration: aiImageKeys.has(`dinhduong2598|${canonicalRecipeId}`),
  };
}).sort((a, b) => a.canonicalTitle.localeCompare(b.canonicalTitle, "vi") || a.canonicalRecipeId.localeCompare(b.canonicalRecipeId));

// A dish can still be split into several canonical rows when instruction text
// produces different method signatures. The public catalog should show one row
// per normalized dish title, with a complete source recipe preferred.
const qualityRankForDisplay = { complete: 4, needs_review: 3, missing_at_source: 2, unmatched: 1 };
const displayGroups = new Map();
for (const recipe of canonicalRecipes) {
  const key = displayDishIdentity(recipe.canonicalTitle).key;
  displayGroups.set(key, [...(displayGroups.get(key) ?? []), recipe]);
}
const displayDedupeReport = [];
const canonicalToDisplayCanonical = new Map();
const displayCanonicalRecipes = [];
for (const [normalizedTitle, recipes] of displayGroups) {
  const rank = (recipe) => [
    Number(recipe.has_ingredients && recipe.has_instructions),
    qualityRankForDisplay[recipe.qualityStatus] ?? 0,
    recipe.ingredients?.length ?? 0,
    String(recipe.instructions_raw ?? "").trim().length,
    nutritionCompleteness(recipe),
    Number(recipe.hasAiIllustration),
    recipe.variantCount ?? 0,
  ];
  const compareRanked = (a, b) => {
    const left = rank(a), right = rank(b);
    for (let index = 0; index < left.length; index++) if (left[index] !== right[index]) return right[index] - left[index];
    return a.canonicalRecipeId.localeCompare(b.canonicalRecipeId);
  };
  const [kept, ...removed] = [...recipes].sort(compareRanked);
  kept.canonicalTitle = displayDishIdentity(kept.canonicalTitle).displayTitle;
  displayCanonicalRecipes.push(kept);
  for (const recipe of recipes) canonicalToDisplayCanonical.set(recipe.canonicalRecipeId, kept.canonicalRecipeId);
  if (!removed.length) {
    kept.sourceServingVariants = kept.servingVariants;
    kept.displayVariantCount = kept.variantCount;
    continue;
  }
  const removedIds = removed.map((recipe) => recipe.canonicalRecipeId);
  const selectedServingVariants = kept.servingVariants;
  const selectedVariantCount = kept.variantCount;
  const selectedIngredientConflict = kept.ingredientListConflict;
  const allVariants = [...new Map([kept, ...removed].flatMap((recipe) => recipe.variants).map((variant) => [variant.id, variant])).values()];
  const allServingVariants = [...new Map([kept, ...removed].flatMap((recipe) => recipe.servingVariants).map((variant) => [variant.sourceRecipeId, variant])).values()];
  const allIngredientSignatures = [...new Set([kept, ...removed].flatMap((recipe) => recipe.ingredientSignatures ?? []))];
  kept.variants = allVariants;
  // Keep every source nutrition row in a non-display audit field. The recipe
  // detail picker uses only portions from the selected representative.
  kept.sourceServingVariants = allServingVariants;
  kept.servingVariants = selectedServingVariants;
  kept.variantCount = allVariants.length;
  // If the selected canonical source still contains conflicting ingredient
  // lists, present a single recipe instead of surfacing alternatives as sizes.
  kept.displayVariantCount = selectedIngredientConflict ? 1 : selectedVariantCount;
  kept.ingredientSignatures = allIngredientSignatures;
  kept.ingredientListConflict = selectedIngredientConflict;
  kept.availableAgeGroups = [...new Set([kept, ...removed].flatMap((recipe) => recipe.availableAgeGroups ?? []))].sort((a, b) => a.localeCompare(b, "vi"));
  kept.availablePortions = [...new Set([kept, ...removed].flatMap((recipe) => recipe.availablePortions ?? []))].sort((a, b) => a.localeCompare(b, "vi"));
  kept.categoryLabels = [...new Set([kept, ...removed].flatMap((recipe) => recipe.categoryLabels ?? []))];
  kept.warnings = [...new Set([kept, ...removed].flatMap((recipe) => recipe.warnings ?? []))];
  kept.legacyCanonicalIds = [...new Set([kept, ...removed].flatMap((recipe) => [...(recipe.legacyCanonicalIds ?? []), recipe.canonicalRecipeId]).filter((id) => id !== kept.canonicalRecipeId))];
  displayDedupeReport.push({
    normalizedTitle,
    kept: {
      canonicalRecipeId: kept.canonicalRecipeId,
      canonicalTitle: kept.canonicalTitle,
      qualityStatus: kept.qualityStatus,
      hasIngredients: kept.has_ingredients,
      hasInstructions: kept.has_instructions,
      ingredientCount: kept.ingredients?.length ?? 0,
      hasAiIllustration: kept.hasAiIllustration,
      sourceVariantIds: kept.variants.map((variant) => variant.id),
    },
    removedFromDisplay: removed.map((recipe) => ({
      canonicalRecipeId: recipe.canonicalRecipeId,
      canonicalTitle: recipe.canonicalTitle,
      qualityStatus: recipe.qualityStatus,
      hasIngredients: recipe.has_ingredients,
      hasInstructions: recipe.has_instructions,
      ingredientCount: recipe.ingredients?.length ?? 0,
      hasAiIllustration: recipe.hasAiIllustration,
      sourceVariantIds: recipe.variants.map((variant) => variant.id),
    })),
    reason: kept.has_ingredients && kept.has_instructions
      ? "Giữ một thẻ theo tên món chuẩn hóa; ưu tiên bản có cả nguyên liệu và hướng dẫn, sau đó chất lượng nguồn và độ đầy đủ. Các bản còn lại không xóa khỏi dữ liệu nguồn."
      : "Không có bản nào đủ cả nguyên liệu và hướng dẫn; giữ một thẻ có dữ liệu đầy đủ nhất để có thể bổ sung công thức sau. Các bản còn lại không xóa khỏi dữ liệu nguồn.",
  });
}
canonicalRecipes.length = 0;
canonicalRecipes.push(...displayCanonicalRecipes.sort((a, b) => a.canonicalTitle.localeCompare(b.canonicalTitle, "vi") || a.canonicalRecipeId.localeCompare(b.canonicalRecipeId)));
const duplicateCanonicalIds = canonicalRecipes.filter((recipe, index, all) => all.findIndex((item) => item.canonicalRecipeId === recipe.canonicalRecipeId) !== index).map((recipe) => recipe.canonicalRecipeId);
if (duplicateCanonicalIds.length) throw new Error(`Prior canonical ID selection collided: ${[...new Set(duplicateCanonicalIds)].join(", ")}`);

const sourceVariantToCanonical = new Map();
for (const recipe of canonicalRecipes) for (const variant of recipe.variants) sourceVariantToCanonical.set(variant.id, recipe.canonicalRecipeId);
// Source rows belonging to a canonical row hidden from the display resolve to
// its selected representative, preserving old recipe links and saved IDs.
for (const recipe of [...groups.values()].flat()) {
  const targetId = canonicalToDisplayCanonical.get(recipe.canonicalRecipeId);
  if (!targetId) continue;
  for (const variant of recipe.variants) sourceVariantToCanonical.set(variant.id, targetId);
}
for (const priorAlias of priorMergeMap.previousCanonicalIdMerges ?? []) {
  const targets = [...new Set((priorAlias.sourceVariantIds ?? []).map((id) => sourceVariantToCanonical.get(id)).filter(Boolean))];
  if (targets.length !== 1 || targets[0] === priorAlias.oldCanonicalRecipeId) continue;
  const targetRecipe = canonicalRecipes.find((recipe) => recipe.canonicalRecipeId === targets[0]);
  if (targetRecipe && !targetRecipe.legacyCanonicalIds.includes(priorAlias.oldCanonicalRecipeId)) targetRecipe.legacyCanonicalIds.push(priorAlias.oldCanonicalRecipeId);
}
const oldGroups = new Map();
for (const record of input) {
  const title = (record.detail_name ?? record.name ?? "").replace(/\s+/g, " ").trim();
  const normalizedTitle = normalize(title);
  const signature = methodSignatureForRecord(record);
  const oldKey = `${normalizedTitle}|method:${signature}`;
  oldGroups.set(oldKey, [...(oldGroups.get(oldKey) ?? []), record]);
}
const canonicalMergeMap = [];
const canonicalById = new Map(canonicalRecipes.map((recipe) => [recipe.canonicalRecipeId, recipe]));
const aliasById = new Map();
const servingSourceVariantIds = new Set(servingMergeDecisions.filter((item) => item.status === "merged_serving_variants").flatMap((item) => item.sourceVariantIds));
const addAlias = (oldCanonicalRecipeId, canonicalRecipeId, sourceVariantIds, title, reason, mergeType = "exact_title_ingredient") => {
  if (!oldCanonicalRecipeId || oldCanonicalRecipeId === canonicalRecipeId || !canonicalById.has(canonicalRecipeId)) return;
  const existing = aliasById.get(oldCanonicalRecipeId);
  if (existing?.mergeType === "serving_variant" && mergeType !== "serving_variant") return;
  aliasById.set(oldCanonicalRecipeId, { oldCanonicalRecipeId, canonicalRecipeId, canonicalTitle: canonicalById.get(canonicalRecipeId).canonicalTitle, sourceVariantIds: [...new Set(sourceVariantIds ?? [])], previousMethodSignature: null, keptMethodSignature: canonicalById.get(canonicalRecipeId).methodSignature, ingredientSignatures: [], mergeType, reason: reason ?? title ?? "Canonical ID alias after conservative deduplication." });
};
for (const prior of priorCanonical) {
  const targets = [...new Set((prior.variants ?? []).map((variant) => sourceVariantToCanonical.get(variant.id)).filter(Boolean))];
  if (targets.length === 1 && targets[0] !== prior.canonicalRecipeId) {
    const target = canonicalById.get(targets[0]);
    const servingMerge = target?.servingVariants?.length > 1 && target.servingVariants.some((variant) => servingTitleIdentity(variant.sourceTitle).hasServingDescriptor);
    addAlias(prior.canonicalRecipeId, targets[0], prior.variants.map((variant) => variant.id), prior.canonicalTitle,
      servingMerge ? "Serving-size/name formatting variant merged; source data and nutrition retained as selectable serving variants." : "Canonical source variants resolve to a single surviving canonical recipe.",
      servingMerge ? "serving_variant" : "normalized_identity");
  }
}
for (const [oldKey, variants] of oldGroups) {
  const targetIds = [...new Set(variants.map((variant) => sourceVariantToCanonical.get(variant.id)).filter(Boolean))];
  if (targetIds.length !== 1) continue;
  const oldSignature = oldKey.slice(oldKey.lastIndexOf("|method:") + "|method:".length);
  const normalizedTitle = oldKey.slice(0, oldKey.lastIndexOf("|method:"));
  const oldId = `dish-${createHash("sha256").update(`${normalizedTitle}|method:${oldSignature}`).digest("hex").slice(0, 16)}`;
  if (oldId === targetIds[0]) continue;
  const decision = mergeDecisions.find((item) => item.sourceVariantIds.some((id) => variants.some((variant) => variant.id === id)));
  const mergeType = variants.some((variant) => servingSourceVariantIds.has(variant.id)) ? "serving_variant" : "source_variant";
  addAlias(oldId, targetIds[0], variants.map((variant) => variant.id), variants[0].detail_name ?? variants[0].name,
    decision?.reason ?? "Source variants resolve to one current canonical record.", mergeType);
}
for (const priorAlias of priorMergeMap.previousCanonicalIdMerges ?? []) {
  const targetIds = [...new Set((priorAlias.sourceVariantIds ?? []).map((id) => sourceVariantToCanonical.get(id)).filter(Boolean))];
  const target = targetIds.length === 1 ? targetIds[0] : priorAlias.canonicalRecipeId;
  const mergeType = (priorAlias.sourceVariantIds ?? []).some((id) => servingSourceVariantIds.has(id)) ? "serving_variant" : priorAlias.mergeType ?? "source_variant";
  if (target !== priorAlias.oldCanonicalRecipeId) addAlias(priorAlias.oldCanonicalRecipeId, target, priorAlias.sourceVariantIds, priorAlias.canonicalTitle, priorAlias.reason, mergeType);
}
canonicalMergeMap.push(...aliasById.values());

const outputDir = new URL("public/data/", project);
await mkdir(outputDir, { recursive: true });
await writeFile(new URL("dinhduong2598-canonical-recipes.json", outputDir), JSON.stringify(canonicalRecipes));
await writeFile(new URL("data-archive/catalog-cleanup/build-state/canonical-merge-map.json", project), `${JSON.stringify({ previousCanonicalIdMerges: canonicalMergeMap })}\n`);
const merged = canonicalRecipes.filter((recipe) => recipe.variantCount > 1);
console.log(`Canonical recipes: ${canonicalRecipes.length}; display duplicate title groups: ${displayDedupeReport.length}; rows hidden from display: ${displayDedupeReport.reduce((sum, group) => sum + group.removedFromDisplay.length, 0)}; merged groups: ${merged.length}; eligible source records: ${input.length}; deleted by exact URL policy: ${deletedSourceCount}; held for review: ${reviewSourceCount}`);
