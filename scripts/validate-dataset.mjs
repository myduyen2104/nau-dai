import { readFile } from "node:fs/promises";
import { validateRecipeData, loadRecipeData } from "./load-recipe-data.mjs";
const errors = [];
const [catalog, ingredientCatalog, audit] = await Promise.all([
  readFile(new URL("../src/data/recipes/copper-vietnam.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../src/data/ingredients/copper-vietnam.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../source-audit.json", import.meta.url), "utf8").then(JSON.parse),
]);
if (!catalog.recipes.length) errors.push("Catalog không có công thức.");
if (catalog.license !== "CC-BY-4.0" || !catalog.attributionUrl) errors.push("Catalog thiếu license hoặc attribution.");
if (audit.sources.some((source) => source.importDecision === "approved_for_import" && source.redistributionAllowed !== "yes")) errors.push("Nguồn được duyệt nhưng quyền tái phân phối chưa xác nhận.");
const ids = new Set(); const names = new Set();
for (const recipe of catalog.recipes) {
  if (ids.has(recipe.id)) errors.push(`Trùng recipe ID: ${recipe.id}`); ids.add(recipe.id);
  const key = recipe.name.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
  if (names.has(key)) errors.push(`Trùng tên recipe: ${recipe.name}`); names.add(key);
  if (recipe.dataStatus === "ingredients_only" && recipe.instructions.length) errors.push(`${recipe.id}: ingredients_only nhưng lại có instructions`);
  if (recipe.ingredients.some((item) => item.quantity !== null || item.unit !== null)) errors.push(`${recipe.id}: importer tự điền định lượng không có trong nguồn`);
  if (recipe.ingredients.some((item) => item.ingredientId !== null && !item.ingredientId)) errors.push(`${recipe.id}: ingredient ID không hợp lệ`);
}
for (const term of ingredientCatalog.terms) if (!term.sourceName || !Array.isArray(term.usedBy)) errors.push(`Term nguyên liệu sai schema: ${term.sourceName}`);
const current = await loadRecipeData(); errors.push(...validateRecipeData(current));
if (errors.length) { console.error(errors.map((x) => `- ${x}`).join("\n")); process.exitCode = 1; }
else console.log(`Hợp lệ: ${catalog.recipes.length} món nhập được phép; ${ingredientCatalog.terms.length} term nguồn; ${current.recipes.length} công thức nội bộ.`);
