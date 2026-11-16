import { readFile, writeFile } from "node:fs/promises";
import { servingTitleIdentity } from "./lib/recipe-serving-identity.mjs";

const canonicalPath = "public/data/dinhduong2598-canonical-recipes.json";
const manifestPath = "src/data/recipe-image-manifest.json";
const publicManifestPath = "public/data/recipe-image-manifest.json";
const mergeMapPath = "data-archive/catalog-cleanup/build-state/canonical-merge-map.json";
const historyPath = "data-archive/catalog-cleanup/build-state/removed-image-manifest-records.json";
const normalizeTitle = (value) => servingTitleIdentity(value).normalizedCanonicalName;
const [canonical, manifest, mergeMap, previousHistory] = await Promise.all([
  readFile(canonicalPath, "utf8").then(JSON.parse),
  readFile(manifestPath, "utf8").then(JSON.parse),
  readFile(mergeMapPath, "utf8").then(JSON.parse),
  readFile(historyPath, "utf8").then(JSON.parse).catch((error) => error?.code === "ENOENT" ? { records: [] } : Promise.reject(error)),
]);
const canonicalById = new Map(canonical.map((recipe) => [recipe.canonicalRecipeId, recipe]));
const merges = mergeMap.previousCanonicalIdMerges;
const mergesByOldId = new Map(merges.map((merge) => [merge.oldCanonicalRecipeId, merge]));
for (const merge of merges) {
  const keptRecipe = canonicalById.get(merge.canonicalRecipeId);
  if (!keptRecipe || canonicalById.has(merge.oldCanonicalRecipeId) || normalizeTitle(keptRecipe.canonicalTitle) !== normalizeTitle(merge.canonicalTitle)) {
    throw new Error(`Refusing image-manifest merge for ${merge.canonicalTitle}; canonical source did not produce the expected instruction-bearing representative.`);
  }
  const keptVariants = new Set(keptRecipe.variants.map((variant) => variant.id));
  if (!merge.sourceVariantIds.every((id) => keptVariants.has(id))) throw new Error(`Source variants were not preserved for ${merge.canonicalTitle}`);
}

const validCanonicalIds = new Set(canonical.map((recipe) => recipe.canonicalRecipeId));
for (const record of manifest.records.filter((entry) => entry.source === "dinhduong2598")) {
  const id = record.canonicalRecipeId ?? record.recipeId;
  if (!validCanonicalIds.has(id) && !mergesByOldId.has(id)) throw new Error(`Manifest references a missing canonical ID with no verified merge mapping: ${id}`);
}

const keptRecords = [];
const removedHistory = [];
const rekeyedHistory = [];
const targetIdsPresent = new Set(manifest.records
  .filter((record) => record.source === "dinhduong2598")
  .map((record) => record.canonicalRecipeId ?? record.recipeId)
  .filter((id) => validCanonicalIds.has(id)));
for (const record of manifest.records) {
  const id = record.canonicalRecipeId ?? record.recipeId;
  const merge = record.source === "dinhduong2598" ? mergesByOldId.get(id) : null;
  if (!merge) {
    keptRecords.push(record);
    continue;
  }
  const targetAlreadyHasRecord = targetIdsPresent.has(merge.canonicalRecipeId)
    || keptRecords.some((entry) => entry.source === "dinhduong2598" && (entry.canonicalRecipeId ?? entry.recipeId) === merge.canonicalRecipeId);
  if (!targetAlreadyHasRecord) {
    const targetRecipe = canonicalById.get(merge.canonicalRecipeId);
    keptRecords.push({ ...record, recipeId: merge.canonicalRecipeId, canonicalRecipeId: merge.canonicalRecipeId, canonicalTitle: targetRecipe.canonicalTitle, notes: `${record.notes ?? ""} Mapped from a verified source identity group; source variants remain available.`.trim() });
    rekeyedHistory.push({ mergedFromCanonicalRecipeId: id, intoCanonicalRecipeId: merge.canonicalRecipeId, canonicalTitle: merge.canonicalTitle, reason: merge.reason, imageRecordAction: "rekeyed_to_instruction_bearing_canonical", manifestRecord: record });
    targetIdsPresent.add(merge.canonicalRecipeId);
  } else {
    removedHistory.push({ mergedFromCanonicalRecipeId: id, intoCanonicalRecipeId: merge.canonicalRecipeId, canonicalTitle: merge.canonicalTitle, reason: merge.reason, imageRecordAction: "archived_duplicate_reference", manifestRecord: record });
  }
}

const oldIdsByTarget = new Map();
for (const merge of merges) oldIdsByTarget.set(merge.canonicalRecipeId, [...(oldIdsByTarget.get(merge.canonicalRecipeId) ?? []), merge.oldCanonicalRecipeId]);
for (const record of keptRecords) {
  if (record.source !== "dinhduong2598" || !record.notes) continue;
  const targetId = record.canonicalRecipeId ?? record.recipeId;
  for (const oldId of oldIdsByTarget.get(targetId) ?? []) {
    record.notes = record.notes.replace(`Dùng chung ảnh minh họa với ${oldId} cho bản trùng/biến thể tuổi; `, "");
  }
}

const updated = { ...manifest, records: keptRecords };
const serialized = `${JSON.stringify(updated, null, 2)}\n`;
await writeFile(manifestPath, serialized);
await writeFile(publicManifestPath, serialized);
const historyBySourceId = new Map((previousHistory.records ?? []).map((record) => [record.mergedFromCanonicalRecipeId, record]));
for (const record of [...removedHistory, ...rekeyedHistory]) historyBySourceId.set(record.mergedFromCanonicalRecipeId, record);
if (removedHistory.length || rekeyedHistory.length || !previousHistory.records?.length) {
  await writeFile(historyPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), records: [...historyBySourceId.values()] }, null, 2)}\n`);
}
const mergedSourceIdsPresentAtStart = manifest.records.filter((record) => record.source === "dinhduong2598" && mergesByOldId.has(record.canonicalRecipeId ?? record.recipeId)).length;
const previouslyMigratedSourceIds = new Set((previousHistory.records ?? []).map((record) => record.mergedFromCanonicalRecipeId));
const alreadyMigrated = merges.filter((merge) => previouslyMigratedSourceIds.has(merge.oldCanonicalRecipeId)).length;
console.log(JSON.stringify({ canonicalMerges: merges.length, mergedSourceImageRowsFound: mergedSourceIdsPresentAtStart, removedCanonicalImageRecords: removedHistory.length, rekeyedImageRecords: rekeyedHistory.length, alreadyMigratedSourceImageRows: alreadyMigrated, mergesWithoutAnImageRecord: merges.length - mergedSourceIdsPresentAtStart - alreadyMigrated, retainedHistoryPath: historyPath, remainingRecords: keptRecords.length, imageFilesDeleted: 0 }, null, 2));
