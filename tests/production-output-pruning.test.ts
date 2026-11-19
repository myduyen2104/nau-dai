import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/prune-production-output.mjs", import.meta.url));

test("production pruning keeps manifest assets and removes only unreferenced images/build-only source data", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "nau-dai-prune-"));
  const originalCwd = process.cwd();
  try {
    await mkdir(resolve(root, "dist/data"), { recursive: true });
    await mkdir(resolve(root, "dist/assets"), { recursive: true });
    await mkdir(resolve(root, "dist/images/recipes"), { recursive: true });
    await writeFile(resolve(root, "dist/data/recipe-image-manifest.json"), JSON.stringify({ records: [{ imagePath: "/images/recipes/active.webp", cardImagePath: "/images/recipes/active.webp" }] }));
    await writeFile(resolve(root, "dist/images/recipes/active.webp"), "active");
    await writeFile(resolve(root, "dist/images/recipes/runtime.webp"), "runtime-referenced");
    await writeFile(resolve(root, "dist/images/recipes/orphan.webp"), "orphan");
    await writeFile(resolve(root, "dist/data/app-settings.json"), "runtime-data");
    await writeFile(resolve(root, "dist/assets/app.js"), 'const path = "/images/recipes/runtime.webp";');

    process.chdir(root);
    await import(`${new URL(script, "file://").href}?fixture=valid-${Date.now()}`);
    assert.equal(await readFile(resolve(root, "dist/images/recipes/active.webp"), "utf8"), "active");
    assert.equal(await readFile(resolve(root, "dist/images/recipes/runtime.webp"), "utf8"), "runtime-referenced");
    await assert.rejects(readFile(resolve(root, "dist/images/recipes/orphan.webp")));
    assert.equal(await readFile(resolve(root, "dist/data/app-settings.json"), "utf8"), "runtime-data");
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
});

test("production pruning leaves runtime data files untouched", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "nau-dai-prune-referenced-data-"));
  const originalCwd = process.cwd();
  try {
    await mkdir(resolve(root, "dist/data"), { recursive: true });
    await mkdir(resolve(root, "dist/assets"), { recursive: true });
    await writeFile(resolve(root, "dist/data/recipe-image-manifest.json"), JSON.stringify({ records: [] }));
    await writeFile(resolve(root, "dist/data/app-settings.json"), "runtime-data");
    await writeFile(resolve(root, "dist/assets/app.js"), 'fetch("/data/app-settings.json");');
    process.chdir(root);
    await import(`${new URL(script, "file://").href}?fixture=runtime-data-${Date.now()}`);
    assert.equal(await readFile(resolve(root, "dist/data/app-settings.json"), "utf8"), "runtime-data");
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
});

test("production pruning fails closed when a manifest asset is missing", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "nau-dai-prune-missing-"));
  const originalCwd = process.cwd();
  try {
    await mkdir(resolve(root, "dist/data"), { recursive: true });
    await writeFile(resolve(root, "dist/data/recipe-image-manifest.json"), JSON.stringify({ records: [{ imagePath: "/images/recipes/missing.webp" }] }));
    process.chdir(root);
    await assert.rejects(import(`${new URL(script, "file://").href}?fixture=missing-${Date.now()}`), /Manifest image missing from production output/);
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
});
