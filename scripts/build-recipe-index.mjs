import { readFile, writeFile, mkdir } from "node:fs/promises";
import { loadRecipeData } from "./load-recipe-data.mjs";
const catalog = JSON.parse(await readFile(new URL("../src/data/recipes/copper-vietnam.json", import.meta.url), "utf8"));
const { recipes } = await loadRecipeData();
const normalize = (text) => String(text ?? "").toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const byIngredient = {};
for (const recipe of recipes) for (const id of [...recipe.required, ...recipe.optional]) (byIngredient[id] ??= []).push(recipe.id);
const search = [
  ...recipes.map((recipe) => ({ id: recipe.id, name: recipe.name, status: "full_recipe", terms: [recipe.name, ...recipe.required, ...recipe.optional].map(normalize) })),
  ...catalog.recipes.map((recipe) => ({ id: recipe.id, name: recipe.name, status: recipe.dataStatus, terms: [recipe.name, ...recipe.ingredients.map((item) => item.sourceName)].map(normalize) })),
];
const dir = new URL("../src/data/indexes/", import.meta.url); await mkdir(dir, { recursive: true });
await writeFile(new URL("ingredient-to-recipes.json", dir), `${JSON.stringify(byIngredient, null, 2)}\n`);
await writeFile(new URL("search-index.json", dir), `${JSON.stringify(search, null, 2)}\n`);
console.log(`Tạo index: ${Object.keys(byIngredient).length} nguyên liệu, ${search.length} mục tìm kiếm.`);
