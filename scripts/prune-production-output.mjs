import { readdir, readFile, rm, stat } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const manifestPath = resolve(dist, "data/recipe-image-manifest.json");
const runtimeOnlyData = ["data/dinhduong2598-canonical-recipes.json"];

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Array.isArray(manifest.records)) throw new Error("Production image manifest has no records array");

const expectedImages = new Set();
for (const record of manifest.records) {
  for (const path of [record.imagePath, record.cardImagePath, record.imagePathDetail, record.imagePathCard]) {
    if (!path) continue;
    if (!path.startsWith("/images/") || path.includes("..")) throw new Error(`Invalid public image path in manifest: ${path}`);
    expectedImages.add(path.slice(1));
  }
}

async function walk(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(path));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

const allDistFiles = await walk(dist);
const runtimeTextFiles = allDistFiles.filter((file) => /\.(?:html|js|mjs|css|json|webmanifest)$/i.test(file));
const runtimeTexts = await Promise.all(runtimeTextFiles.map(async (file) => [file, await readFile(file, "utf8")]));
for (const [, text] of runtimeTexts) {
  for (const match of text.matchAll(/\/images\/[^\s"'`()?#]+/g)) {
    const path = match[0].replace(/^\//, "");
    if (!path.includes("..")) expectedImages.add(path);
  }
}

for (const path of expectedImages) {
  const asset = resolve(dist, path);
  if (!asset.startsWith(`${dist}${sep}`)) throw new Error(`Image path escapes dist: ${path}`);
  const metadata = await stat(asset).catch(() => null);
  if (!metadata?.isFile() || metadata.size === 0) throw new Error(`Manifest image missing from production output: ${path}`);
}

const imageRoot = resolve(dist, "images");
const files = await walk(imageRoot).catch((error) => error?.code === "ENOENT" ? [] : Promise.reject(error));
const removedUnreferencedImages = [];
for (const file of files) {
  const publicPath = relative(dist, file).split(sep).join("/");
  if (!expectedImages.has(publicPath)) {
    removedUnreferencedImages.push({ path: publicPath, bytes: (await stat(file)).size });
    await rm(file);
  }
}

const removedBuildOnlyData = [];
for (const path of runtimeOnlyData) {
  const file = resolve(dist, path);
  const metadata = await stat(file).catch(() => null);
  if (metadata?.isFile()) {
    const references = runtimeTexts.filter(([, text]) => text.includes(path) || text.includes(`/${path}`));
    if (references.length) {
      throw new Error(`Refusing to prune runtime data ${path}; referenced by ${references.map(([source]) => relative(dist, source).split(sep).join("/")).join(", ")}`);
    }
    removedBuildOnlyData.push({ path, bytes: metadata.size });
    await rm(file);
  }
}

console.log(JSON.stringify({
  manifestRecords: manifest.records.length,
  uniqueRetainedImagePaths: expectedImages.size,
  removedUnreferencedImages,
  removedBuildOnlyData,
}, null, 2));
