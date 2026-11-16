import { readFile, writeFile } from "node:fs/promises";

const sourcePath = "src/data/recipe-image-manifest.json";
const publicPath = "public/data/recipe-image-manifest.json";
const manifest = JSON.parse(await readFile(sourcePath, "utf8"));
if (!Array.isArray(manifest.records)) throw new Error("Source recipe image manifest is missing records");

const runtimeFields = [
  "source", "recipeId", "imagePath", "cardImagePath", "imageType", "notes",
  "sourcePageUrl", "author", "license", "licenseUrl", "fitNotes",
];
const records = manifest.records.map((record) => {
  if (typeof record.source !== "string" || typeof record.recipeId !== "string" || typeof record.imagePath !== "string") {
    throw new Error("Recipe image manifest contains an invalid identity or path");
  }
  return Object.fromEntries(runtimeFields.filter((field) => record[field] !== undefined).map((field) => [field, record[field]]));
});
await writeFile(publicPath, `${JSON.stringify({ schemaVersion: manifest.schemaVersion, records })}\n`);
console.log(JSON.stringify({ sourceRecords: manifest.records.length, runtimeRecords: records.length, publicBytes: Buffer.byteLength(JSON.stringify({ schemaVersion: manifest.schemaVersion, records })) }));
