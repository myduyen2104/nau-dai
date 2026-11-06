import { mkdir, readFile, writeFile } from "node:fs/promises";
import { loadRecipeData } from "./load-recipe-data.mjs";

const sourceFile = new URL("../src/data/recipes/copper-vietnam.json", import.meta.url);
const outputFile = new URL("../src/data/ingredients/copper-vietnam.json", import.meta.url);
const data = JSON.parse(await readFile(sourceFile, "utf8"));
if (data.license !== "CC-BY-4.0") throw new Error("Nguồn nguyên liệu chưa có license được duyệt.");
const { ingredients: known } = await loadRecipeData();
const normalize = (text) => String(text ?? "").toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const idsByTerm = new Map();
for (const ingredient of known) for (const name of [ingredient.name, ...ingredient.aliases]) {
  const key = normalize(name);
  if (idsByTerm.has(key) && idsByTerm.get(key) !== ingredient.id) idsByTerm.set(key, null);
  else idsByTerm.set(key, ingredient.id);
}
const mapExactTerm = (name) => idsByTerm.get(normalize(name)) ?? null;
const entries = new Map();
for (const recipe of data.recipes) for (const item of recipe.ingredients) {
  const normalizedName = normalize(item.sourceName);
  const ingredientId = mapExactTerm(item.sourceName);
  item.ingredientId = ingredientId;
  const current = entries.get(normalizedName) ?? { sourceName: item.sourceName, normalizedName, ingredientId, usedBy: [] };
  if (current.ingredientId && ingredientId && current.ingredientId !== ingredientId) current.ingredientId = null;
  if (!current.usedBy.includes(recipe.id)) current.usedBy.push(recipe.id);
  entries.set(normalizedName, current);
}
await writeFile(sourceFile, `${JSON.stringify(data, null, 2)}\n`);
const out = `${JSON.stringify({ schemaVersion: 1, source: data.source, license: data.license, attribution: data.attribution, attributionUrl: data.attributionUrl, terms: [...entries.values()] }, null, 2)}\n`;
await mkdir(new URL("../src/data/ingredients/", import.meta.url), { recursive: true });
await writeFile(outputFile, out);
console.log(`Xuất ${entries.size} tên nguyên liệu nguồn; ${[...entries.values()].filter((x) => x.ingredientId).length} khớp ID nguyên liệu hiện có.`);
