import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = process.cwd();
const archivePath = `${root}/data-archive/knorr_source_2026-11-15/recipes.jsonl`;
const ingredientCatalogPath = `${root}/src/data/source-ingredients.json`;
const outputPath = `${root}/public/data/knorr/recipes.json`;
const homeRecommendationsPath = `${root}/public/data/knorr/home-recommendations.json`;

const sourceRows = (await readFile(archivePath, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const catalog = JSON.parse(await readFile(ingredientCatalogPath, "utf8"));
const norm = (value) => String(value ?? "").toLocaleLowerCase("vi").normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const ingredientsByAlias = new Map();
for (const ingredient of [...catalog.coreIngredients, ...catalog.supplementalIngredients]) {
  for (const alias of [ingredient.name, ...(ingredient.aliases ?? [])]) ingredientsByAlias.set(norm(alias), ingredient);
}
function minutes(value) {
  const match = String(value ?? "").match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!match) return null;
  const result = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) + Number(match[3] ?? 0) / 60;
  return result > 0 ? Math.round(result) : null;
}
function categoryFor(recipe) {
  const hints = `${recipe.category ?? ""} ${(recipe.keywords ?? []).join(" ")} ${recipe.name}`.toLocaleLowerCase("vi");
  if (/món chay|ăn chay|chay/.test(hints)) return "Món chay";
  if (/canh|súp|soup|lẩu|bún|phở|miến/.test(hints)) return "Món nước";
  if (/xào|rang|áp chảo/.test(hints)) return "Món xào";
  if (/gỏi|salad|cuốn|ăn nhẹ|khai vị/.test(hints)) return "Món ăn nhẹ";
  if (/nướng|hấp|chiên|kho|hầm|om/.test(hints)) return "Món chính";
  return "Món chính";
}
function servingCount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "").match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}
function highResolutionKnorrImage(row) {
  const id = String(row.id).split(":").at(-1);
  const extension = String(row.image_url ?? "").match(/\.([a-z\d]+)(?:\?.*)?$/i)?.[1] ?? "jpg";
  return `https://assets.unileversolutions.com/recipes-v3/${id}-default.${extension}?im=Resize=(400,400)`;
}
function sourceTips(row) {
  const cue = /\b(?:mẹo(?: nhỏ| hay)?|mách bạn|bí quyết|lưu ý)\b/iu;
  const sentences = (row.instruction_sections ?? []).flatMap((section) => section.steps ?? [])
    .flatMap((text) => String(text).split(/(?<=[.!?])\s+/u))
    .map((text) => text.replace(/\s+/gu, " ").trim())
    .filter((text) => cue.test(text))
    .filter((text) => !/thêm một bí quyết|còn rất nhiều bí quyết|có thêm một bí quyết/iu.test(text));
  return [...new Set(sentences)].slice(0, 3);
}
const recipes = sourceRows.filter((row) => row.id && row.name).map((row) => {
  const mappedIngredients = row.ingredients.map((raw, index) => {
    const sourceName = String(raw).trim();
    const withoutLeadingMeasure = sourceName.replace(/^\s*(?:\d+(?:[.,/]\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(?:kilograms?|kg|grams?|gr|g|millilit(?:er|re)s?|ml|lit(?:er|re)s?|lít|l|muỗng(?:\s+(?:canh|cà\s*phê))?|thìa(?:\s+(?:canh|cà\s*phê))?|con|quả|trái|củ|tép|nhánh|cây|bó|lát|gói|chén|bát|lon|miếng|túi|viên|nắm|tsp|tbsp|cup)\s*/iu, "").trim();
    const colonName = !/^\s*(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞])/u.test(sourceName) ? sourceName.match(/^([^:]{1,70}):/u)?.[1]?.trim() : undefined;
    const searchName = colonName || withoutLeadingMeasure.split(":", 1)[0].replace(/^[,;\s]+/, "").replace(/^(?:cắt|thái|rửa|băm|bằm|xay|bóc)\s+(?:sợi\s+|nhuyễn\s+|lát\s+|nhỏ\s+)?/iu, "");
    const ingredient = (/\bhạt\s+nêm\b/iu.test(searchName) ? ingredientsByAlias.get(norm("Hạt nêm")) : undefined)
      ?? ingredientsByAlias.get(norm(searchName))
      ?? ingredientsByAlias.get(norm(searchName.replace(/[,.;].*$/, "")))
      ?? ingredientsByAlias.get(norm(sourceName));
    const ingredientId = ingredient?.id ?? `knorr-source-${norm(searchName).replace(/\s+/g, "-") || index}`;
    return { ingredientId, sourceName, quantity: null, unit: "", optional: false, role: ingredient?.category === "Gia vị" ? "seasoning" : ["Thịt", "Hải sản", "Trứng", "Tinh bột"].includes(ingredient?.category ?? "") ? "main" : "required" };
  });
  const required = [...new Set(mappedIngredients.map((ingredient) => ingredient.ingredientId))];
  const steps = row.instruction_sections.flatMap((section) => section.steps.map((instruction) => `${section.name ? `${section.name}: ` : ""}${instruction}`)).map((instruction, index) => ({ order: index + 1, instruction }));
  const totalTime = minutes(row.total_time);
  return {
    id: row.id,
    slug: row.id.split(":").at(-1),
    name: row.name,
    emoji: "🍲",
    imageUrl: highResolutionKnorrImage(row),
    imageFallbacks: row.image_url ? [row.image_url] : [],
    publishedAt: row.published_at ?? undefined,
    description: row.description,
    category: categoryFor(row),
    cuisine: "vietnamese",
    method: row.category ?? "",
    minutes: totalTime,
    preparationTime: minutes(row.prep_time),
    cookingTime: minutes(row.cook_time),
    totalTime,
    difficulty: "Chưa đánh giá",
    servings: servingCount(row.servings),
    required,
    optional: [],
    ingredients: mappedIngredients,
    steps,
    equipment: [],
    tips: sourceTips(row),
    tags: [...new Set([categoryFor(row), ...(row.keywords ?? [])])],
    source: { type: "website", url: row.source_url, title: "Knorr Việt Nam" },
    verificationStatus: "unverified",
    dataStatus: steps.length ? "full_recipe" : mappedIngredients.length ? "ingredients_only" : "catalog_only",
  };
});
if (!recipes.length || new Set(recipes.map((recipe) => recipe.id)).size !== recipes.length) throw new Error("Knorr recipe records are empty or have duplicate IDs");
await mkdir(`${root}/public/data/knorr`, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(recipes)}\n`);
const homeRecommendations = recipes
  .filter((recipe) => recipe.dataStatus === "full_recipe" && recipe.steps.length > 0)
  .sort((a, b) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0) || a.name.localeCompare(b.name, "vi"))
  .slice(0, 24);
if (!homeRecommendations.length) throw new Error("No complete Knorr recipes available for the home suggestions.");
await writeFile(homeRecommendationsPath, `${JSON.stringify(homeRecommendations)}\n`);
console.log(`Wrote ${recipes.length} Knorr recipes plus ${homeRecommendations.length} lightweight home recommendations.`);
