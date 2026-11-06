import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

export async function loadRecipeData() {
  const source = await readFile(new URL("../src/data.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dir = await mkdtemp(join(tmpdir(), "fresh-recipes-"));
  const file = join(dir, "data.mjs");
  try {
    await writeFile(file, js);
    return await import(`file://${file}?v=${Date.now()}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function validateRecipeData({ ingredients, recipes }) {
  const errors = [];
  const ingredientIds = new Set();
  const recipeIds = new Set();
  for (const ingredient of ingredients) {
    if (!ingredient.id || !ingredient.name || !Array.isArray(ingredient.aliases)) errors.push(`Nguyên liệu thiếu trường bắt buộc: ${ingredient.id || "(không ID)"}`);
    if (ingredientIds.has(ingredient.id)) errors.push(`Trùng ID nguyên liệu: ${ingredient.id}`);
    ingredientIds.add(ingredient.id);
  }
  for (const recipe of recipes) {
    if (!recipe.id || !recipe.name) errors.push(`Công thức thiếu ID hoặc tên: ${recipe.id || "(không ID)"}`);
    if (recipeIds.has(recipe.id)) errors.push(`Trùng ID công thức: ${recipe.id}`);
    recipeIds.add(recipe.id);
    if (!recipe.slug || !recipe.category || !recipe.source?.title || !["verified", "unverified", "adapted"].includes(recipe.verificationStatus)) errors.push(`Công thức sai schema: ${recipe.id}`);
    if (!Array.isArray(recipe.steps) || recipe.steps.length === 0 || recipe.steps.some((step) => !step.instruction?.trim() || !Number.isInteger(step.order))) errors.push(`Công thức thiếu bước nấu: ${recipe.id}`);
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length !== recipe.required.length + recipe.optional.length || recipe.ingredients.some((item) => !ingredientIds.has(item.ingredientId) || (item.quantity !== null && (!Number.isFinite(item.quantity) || item.quantity <= 0)) || (item.role !== undefined && !["main", "required", "seasoning", "optional"].includes(item.role)))) errors.push(`Danh sách/định lượng/vai trò nguyên liệu sai schema: ${recipe.id}`);
    for (const id of [...recipe.required, ...recipe.optional]) if (!ingredientIds.has(id)) errors.push(`Công thức ${recipe.id} tham chiếu nguyên liệu không tồn tại: ${id}`);
  }
  return errors;
}
