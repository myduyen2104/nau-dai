import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicManifest = JSON.parse(await readFile("public/data/recipe-image-manifest.json", "utf8"));
const sourceManifest = JSON.parse(await readFile("src/data/recipe-image-manifest.json", "utf8"));
const serviceWorker = await readFile("public/sw.js", "utf8");
const app = await readFile("src/main.tsx", "utf8");

test("public recipe image manifest is valid and synchronized with its source", () => {
  assert.equal(publicManifest.schemaVersion, sourceManifest.schemaVersion);
  assert.equal(publicManifest.records.length, sourceManifest.records.length);
  assert.deepEqual(publicManifest.records.map(({ source, recipeId }) => [source, recipeId]), sourceManifest.records.map(({ source, recipeId }) => [source, recipeId]));
  for (const record of publicManifest.records) {
    assert.ok(record.imagePath.startsWith("/images/"));
    assert.ok(!("promptSummary" in record));
    assert.ok(!("modifications" in record));
  }
});

test("service worker refreshes manifest online and serves cached copy offline", () => {
  assert.match(serviceWorker, /pathname\s*===\s*["']\/data\/recipe-image-manifest\.json["']/);
  assert.match(serviceWorker, /const response = await fetch\(event\.request\)/);
  assert.match(serviceWorker, /cache\.put\(event\.request, response\.clone\(\)\)/);
  assert.match(serviceWorker, /cache\.match\(event\.request\).*Response\.error\(\)/s);
});

test("image manifest fetch failure is caught so UI keeps its emoji fallback", () => {
  assert.match(app, /fetch\(["']\/data\/recipe-image-manifest\.json["']\)/);
  assert.match(app, /\.catch\(\(\)\s*=>\s*\{\s*recipeImagesReady\s*=\s*true;\s*\}\)/);
  assert.match(app, /recipeImages\.get\(`\$\{source\}\|\$\{keyId\}`\)/);
});
