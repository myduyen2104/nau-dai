import { readFile, writeFile } from "node:fs/promises";
const file = new URL("../src/data/recipes/copper-vietnam.json", import.meta.url);
const data = JSON.parse(await readFile(file, "utf8"));
const normalize = (text) => String(text ?? "").toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const seenIds = new Set();
const seenNames = new Set();
const before = data.recipes.length;
data.recipes = data.recipes.filter((recipe) => {
  const name = normalize(recipe.name);
  if (seenIds.has(recipe.id) || seenNames.has(name)) return false;
  seenIds.add(recipe.id); seenNames.add(name); return true;
});
await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Đã loại ${before - data.recipes.length} bản ghi trùng; còn ${data.recipes.length}.`);
