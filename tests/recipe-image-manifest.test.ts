import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { recipes } from "../src/data.ts";

const root = process.cwd();
const manifest = JSON.parse(await readFile(resolve(root, "src/data/recipe-image-manifest.json"), "utf8"));

test("recipe image manifest keys are unique and every image points to an optimized file", async () => {
  const keys = manifest.records.map((record) => `${record.source}|${record.recipeId}`);
  assert.equal(new Set(keys).size, keys.length, "duplicate source + recipeId key");
  const licensed = manifest.records.filter((record) => record.imageType !== "ai_illustration");
  const ai = manifest.records.filter((record) => record.imageType === "ai_illustration");
  assert.equal(licensed.length, 3, "existing licensed photos must remain intact");
  const internalAi = ai.filter((record) => record.source === "internal");
  const internalRecipeImages = internalAi.filter((record) => recipes.some((recipe) => recipe.id === record.recipeId));
  const flexibleTemplateImages = internalAi.filter((record) => record.recipeId.startsWith("flexible-template:"));
  assert.deepEqual(internalRecipeImages.map((record) => record.recipeId).sort(), recipes.map((recipe) => recipe.id).sort());
  assert.equal(flexibleTemplateImages.length, 10, "flexible suggestion templates keep their separate illustrations");
  assert.equal(internalAi.length, recipes.length + flexibleTemplateImages.length);
  assert.equal(ai.filter((record) => record.source === "copper").length, 3, "the active Copper illustrations must remain separate from their licensed archival originals");

  for (const record of manifest.records) {
    assert.ok(record.imagePath && record.cardImagePath);
    assert.ok(record.lastChecked && record.verificationStatus);
    if (record.imageType === "ai_illustration") {
      assert.ok(["internal", "dinhduong2598", "copper"].includes(record.source));
      assert.ok(["OpenAI ImageGen", "OpenAI built-in image_gen", "OpenAI built-in image_gen (model/version undisclosed)"].includes(record.imageSource));
      assert.ok(record.promptSummary && record.notes);
      assert.ok(["illustrative_only_visual_reviewed", "pending_human_review"].includes(record.verificationStatus));
      if (record.source === "dinhduong2598") {
        assert.equal(record.canonicalRecipeId, record.recipeId);
        assert.ok(record.canonicalTitle);
        assert.equal(record.imagePathCard, record.cardImagePath);
        assert.equal(record.imagePathDetail, record.imagePath);
        assert.ok(record.createdAt);
        assert.ok(["high", "medium", "low"].includes(record.contextConfidence));
        assert.ok(["generated_pending_review", "generated_reviewed"].includes(record.generationStatus));
        assert.equal(record.generationStatus === "generated_pending_review", record.verificationStatus === "pending_human_review", "unreviewed generated images must remain pending human review");
        assert.match(record.promptFingerprint, /^[a-f0-9]{64}$/);
      }
    } else {
      assert.ok(record.originalUrl && record.sourcePageUrl && record.author);
      assert.ok(record.license && record.licenseUrl && record.attribution);
      assert.equal(record.verificationStatus, "verified_match_license");
      assert.ok(record.fitNotes && record.modifications);
    }
    for (const imagePath of [record.imagePath, record.cardImagePath]) {
      const filePath = resolve(root, "public", imagePath.slice(1));
      const metadata = await stat(filePath);
      assert.ok(metadata.size > 0, `${imagePath} is empty`);
      const bytes = await readFile(filePath);
      assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${imagePath} is not a WebP container`);
      assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${imagePath} is not WebP`);
    }
  }
});
