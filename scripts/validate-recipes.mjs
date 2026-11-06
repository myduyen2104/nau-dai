import { loadRecipeData, validateRecipeData } from "./load-recipe-data.mjs";

const { ingredients, recipes } = await loadRecipeData();
const errors = validateRecipeData({ ingredients, recipes });
if (errors.length) {
  console.error(`Tìm thấy ${errors.length} vấn đề trong dữ liệu:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Dữ liệu hợp lệ: ${ingredients.length} nguyên liệu, ${recipes.length} công thức.`);
}
