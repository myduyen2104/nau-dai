import { readFile } from "node:fs/promises";
import { loadRecipeData } from "./load-recipe-data.mjs";

const db = JSON.parse(await readFile(new URL("../src/data/ingredient-substitutions.json", import.meta.url), "utf8"));
const { ingredients, recipes } = await loadRecipeData();
const copper = JSON.parse(await readFile(new URL("../src/data/recipes/copper-vietnam.json", import.meta.url), "utf8"));
const ingredientIds = new Set(ingredients.map((item) => item.id));
const recipeIds = new Set([...recipes.map((item) => item.id), ...copper.recipes.map((item) => item.id)]);
const errors = [];
const ids = new Set();
const pairs = new Set();
const allowedMethods = new Set(["kho", "rim", "xào", "rang", "áp chảo", "chiên", "nướng", "nấu canh", "luộc", "hấp", "trộn", "nấu", "om", "hầm"]);

if (db.version !== 1 || !Array.isArray(db.rules)) errors.push("Substitution database must have version 1 and a rules array.");
for (const rule of db.rules ?? []) {
  if (!rule.id || ids.has(rule.id)) errors.push(`Missing or duplicate rule ID: ${rule.id ?? "(empty)"}`);
  ids.add(rule.id);
  if (!ingredientIds.has(rule.originalIngredientId)) errors.push(`${rule.id}: original ingredient does not exist.`);
  if (!ingredientIds.has(rule.substituteIngredientId)) errors.push(`${rule.id}: substitute ingredient does not exist.`);
  if (rule.originalIngredientId === rule.substituteIngredientId) errors.push(`${rule.id}: self substitution is not allowed.`);
  const pair = `${rule.originalIngredientId}->${rule.substituteIngredientId}`;
  if (pairs.has(pair)) errors.push(`${rule.id}: duplicate directional pair ${pair}.`);
  pairs.add(pair);
  if (!["good", "conditional", "not_recommended"].includes(rule.suitability)) errors.push(`${rule.id}: invalid suitability.`);
  if (!["verified", "unverified"].includes(rule.verificationStatus)) errors.push(`${rule.id}: invalid verification status.`);
  if (rule.verificationStatus === "verified" && (!rule.sourceUrl || !/^https:\/\//.test(rule.sourceUrl))) errors.push(`${rule.id}: verified rules require an HTTPS source.`);
  if ((rule.supportingSourceUrls ?? []).some((url) => typeof url !== "string" || !/^https:\/\//.test(url))) errors.push(`${rule.id}: invalid supporting source URL.`);
  if (rule.ratio && (!(rule.ratio.originalQuantity > 0) || !(rule.ratio.substituteQuantity > 0) || !rule.ratio.unit)) errors.push(`${rule.id}: invalid ratio.`);
  for (const method of rule.allowedCookingMethods ?? []) if (!allowedMethods.has(method)) errors.push(`${rule.id}: unknown cooking method ${method}.`);
  for (const id of [...(rule.allowedRecipeIds ?? []), ...(rule.excludedRecipeIds ?? [])]) if (!recipeIds.has(id)) errors.push(`${rule.id}: recipe condition references unknown recipe ${id}.`);
}
for (const rule of db.rules ?? []) if (pairs.has(`${rule.substituteIngredientId}->${rule.originalIngredientId}`)) errors.push(`${rule.id}: reverse rule exists; confirm intentional two-way substitution.`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const verified = db.rules.filter((rule) => rule.verificationStatus === "verified").length;
  const conditional = db.rules.filter((rule) => rule.suitability === "conditional").length;
  console.log(`Validated ${db.rules.length} rules (${verified} verified, ${conditional} conditional), ${ingredientIds.size} ingredient IDs, and ${recipeIds.size} recipe IDs.`);
}
