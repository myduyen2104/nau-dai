import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { loadRecipeData } from "./load-recipe-data.mjs";

const SOURCE_URL = "https://copperapp.app/data/copper-dishes.json";
const ATTRIBUTION_URL = "https://copperapp.app/study/what-the-world-cooks.html";
const destination = new URL("../src/data/recipes/copper-vietnam.json", import.meta.url);
const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Không tải được Copper dataset: HTTP ${response.status}`);
const source = await response.json();
if (source.license !== "CC-BY-4.0" || source.attribution !== `Copper — ${ATTRIBUTION_URL}` || !Array.isArray(source.dishes)) {
  throw new Error("License, attribution hoặc schema Copper không khớp; không ghi đè dữ liệu hiện tại.");
}
const { ingredients: knownIngredients } = await loadRecipeData();
const normalize = (text) => String(text ?? "").toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const resolveIngredient = (term) => {
  const wanted = normalize(term);
  return knownIngredients.find((item) => [item.name, ...item.aliases].some((candidate) => normalize(candidate) === wanted))?.id ?? null;
};
const sourceIds = new Set();
const uniqueNames = new Set();
const recipes = source.dishes.filter((dish) => dish.country_code === "VN").map((dish) => {
  const ingredientNames = Array.isArray(dish.ingredients)
    ? dish.ingredients
    : typeof dish.ingredients === "string"
      ? dish.ingredients.split(";")
      : null;
  if (!dish.id || !dish.dish || !ingredientNames) throw new Error("Có dòng Vietnam thiếu ID, tên hoặc danh sách nguyên liệu; không ghi file.");
  const key = normalize(dish.dish);
  if (sourceIds.has(dish.id) || uniqueNames.has(key)) throw new Error(`Dòng trùng trong nguồn Copper: ${dish.id}/${dish.dish}`);
  sourceIds.add(dish.id); uniqueNames.add(key);
  return {
    id: `copper:${dish.id}`,
    slug: dish.id,
    name: dish.dish,
    cuisine: "vietnamese",
    country: dish.country,
    countryCode: dish.country_code,
    dataStatus: "ingredients_only",
    verificationStatus: "unverified",
    totalTimeMinutes: Number.isFinite(dish.minutes) ? dish.minutes : null,
    difficulty: ["easy", "medium", "hard"].includes(dish.difficulty) ? dish.difficulty : null,
    ingredients: ingredientNames.map((sourceName) => String(sourceName).trim()).filter(Boolean).map((sourceName) => ({
      sourceName,
      ingredientId: resolveIngredient(sourceName),
      quantity: null,
      unit: null,
    })),
    instructions: [],
    source: {
      name: "Copper — traditional dishes of the world",
      datasetUrl: SOURCE_URL,
      recipeUrl: dish.url,
      license: source.license,
      attribution: source.attribution,
      attributionUrl: ATTRIBUTION_URL,
    },
  };
});
if (!recipes.length) throw new Error("Copper dataset không có dòng country_code=VN; dữ liệu hiện tại không bị thay đổi.");
const stableData = { schemaVersion: 1, source: source.source, license: source.license, attribution: source.attribution, attributionUrl: ATTRIBUTION_URL, recipes };
let previous;
try { previous = JSON.parse(await readFile(destination, "utf8")); } catch {}
const sameData = previous && JSON.stringify({ schemaVersion: previous.schemaVersion, source: previous.source, license: previous.license, attribution: previous.attribution, attributionUrl: previous.attributionUrl, recipes: previous.recipes }) === JSON.stringify(stableData);
if (sameData) console.log(`Không đổi: ${recipes.length} món Copper đã import.`);
else {
  const output = `${JSON.stringify({ ...stableData, importedAt: new Date().toISOString() }, null, 2)}\n`;
  await mkdir(new URL("../src/data/recipes/", import.meta.url), { recursive: true });
  const temporary = new URL("../src/data/recipes/copper-vietnam.json.tmp", import.meta.url);
  await writeFile(temporary, output);
  await rename(temporary, destination);
  console.log(`Đã nhập ${recipes.length} món Việt dạng ingredients_only; không có bước nấu trong nguồn JSON.`);
}
