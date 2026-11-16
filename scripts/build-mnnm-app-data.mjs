import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";

const root = process.cwd();
const inputPath = `${root}/data-archive/monngonmoingay_source_2026-11-14/recipes.jsonl`;
const outputDir = `${root}/public/data/mnnm`;
const shardSize = 100;

function decodeHtml(value = "") {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"', ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", hellip: "…", reg: "®", copy: "©", trade: "™" };
  return String(value).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const number = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(number) && number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function categoryFor(tags = []) {
  const normalized = tags.map((tag) => String(tag).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi"));
  if (normalized.some((tag) => tag.includes("mon xao"))) return "Món xào";
  if (normalized.some((tag) => tag.includes("hap/tiem"))) return "Món hấp";
  if (normalized.some((tag) => tag.includes("canh/sup") || tag.includes("lau") || tag.includes("pho/ bun/ hu tieu/ mien"))) return "Món nước";
  if (normalized.some((tag) => tag.includes("goi/tron") || tag.includes("an vat") || tag.includes("mon an kem"))) return "Món ăn nhẹ";
  if (normalized.some((tag) => tag.includes("mon chay") || tag.includes("an chay"))) return "Món chay";
  if (normalized.some((tag) => tag.includes("mon au"))) return "Món Âu";
  return "Món chính";
}

function ingredientNames(recipe) {
  return [...new Set((recipe.ingredients ?? []).map((ingredient) => decodeHtml(ingredient.name?.trim() ?? "")).filter(Boolean))];
}

function imageSizeScore(url) {
  const parsed = new URL(url);
  const file = parsed.pathname.split("/").pop() ?? "";
  const dimensions = file.match(/[-_](\d{2,4})x(\d{2,4})(?:[-_.]|$)/i) ?? parsed.search.match(/[?&](?:resize|w|width)=(\d{2,4})[x,%2C]+(\d{2,4})/i);
  if (dimensions) return Math.max(Number(dimensions[1]), Number(dimensions[2]));
  const suffix = file.match(/[-_](\d{2,4})(?=(?:-(?:min|e\d)|\.[a-z\d]+$))/i) ?? parsed.search.match(/[?&](?:w|width)=(\d{2,4})(?:&|$)/i);
  if (!suffix) return 10000;
  const size = Number(suffix[1]);
  if (size >= 100 && size <= 2048) return size;
  return size <= 20 ? 10 + size : 30;
}

function imageUrls(recipe) {
  return [...new Set((recipe.image_urls ?? []).filter((url) => typeof url === "string" && /^https:\/\//i.test(url)))].sort((a, b) => imageSizeScore(b) - imageSizeScore(a));
}

function sourceTips(recipe) {
  const tipSections = (recipe.instruction_sections ?? []).filter((section) => section.key === "tips" || /mách nhỏ|mẹo hay/i.test(section.name ?? ""));
  return [...new Set(tipSections.flatMap((section) => {
    const entries = Array.isArray(section.steps) && section.steps.length ? section.steps : [section.text ?? ""];
    return entries.flatMap((entry) => String(entry).split(/🧑‍🍳|(?:^|\n)\s*[•●-]\s*/u));
  }).map((tip) => decodeHtml(tip).replace(/^\s*(?:mách\s*nhỏ|mẹo\s*(?:hay|nhỏ))\s*:?\s*/iu, "").trim()).filter((tip) => tip && !/:\s*$/u.test(tip) && !/^(?:để .+? lưu ý|một vài lưu ý)\s*:?$/iu.test(tip)))];
}
function compactTip(value, max = 180) {
  const text = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (text.length <= max) return text;
  const space = text.lastIndexOf(" ", max - 3);
  return `${text.slice(0, space > max * 0.65 ? space : max - 3).trimEnd()}…`;
}

const existing = await readFile(inputPath, "utf8");
const sourceLines = existing.split(/\r?\n/).filter(Boolean);
const index = [];
const details = [];
for (const line of sourceLines) {
  const recipe = JSON.parse(line);
  const position = index.length;
  const shard = String(Math.floor(position / shardSize)).padStart(2, "0");
  const names = ingredientNames(recipe);
  const images = imageUrls(recipe);
  const sections = (recipe.instruction_sections ?? []).map((section) => ({
    name: decodeHtml(section.name ?? section.key ?? "Cách làm"),
    text: decodeHtml(section.text ?? ""),
    steps: Array.isArray(section.steps) ? section.steps.filter((step) => typeof step === "string" && step.trim()).map((step) => decodeHtml(step)) : [],
  }));
  const normalizedIngredients = (recipe.ingredients ?? []).map((ingredient) => ({
    name: decodeHtml(ingredient.name ?? ingredient.raw ?? "Nguyên liệu"),
    quantity_raw: ingredient.quantity_raw ? decodeHtml(ingredient.quantity_raw) : null,
    raw: ingredient.raw ? decodeHtml(ingredient.raw) : null,
    kind: ingredient.kind ?? "ingredient",
  }));
  index.push({
    id: recipe.id,
    name: decodeHtml(recipe.name),
    description: decodeHtml(recipe.description ?? ""),
    source_url: recipe.source_url,
    published_at: recipe.date_published ?? null,
    updated_at: recipe.sitemap_lastmod ?? null,
    image_url: images[0] ?? null,
    image_fallbacks: images.slice(1),
    category: categoryFor(recipe.tags),
    tags: (recipe.tags ?? []).map((tag) => decodeHtml(tag)),
    ingredient_names: names,
    ingredient_count: names.length,
    has_ingredients: normalizedIngredients.length > 0,
    has_instructions: sections.some((section) => section.steps.length > 0 || section.text.trim()),
    prep_time: recipe.prep_time ?? null,
    cook_time: recipe.cook_time ?? null,
    total_time: recipe.total_time ?? null,
    servings: recipe.servings ?? null,
    warnings: recipe.warnings ?? [],
    tips: sourceTips(recipe).map((tip) => compactTip(tip)),
    detail_shard: `/data/mnnm/recipes-${shard}.json`,
  });
  details.push({
    id: recipe.id,
    ingredients: normalizedIngredients,
    instruction_sections: sections.filter((section) => section.key !== "tips" && !/mách nhỏ|mẹo hay/i.test(section.name)),
    tips: sourceTips(recipe),
    warnings: recipe.warnings ?? [],
  });
}

await mkdir(outputDir, { recursive: true });
for (const file of await readdir(outputDir)) if (/^recipes-\d+\.json$/.test(file)) await unlink(`${outputDir}/${file}`);
await writeFile(`${outputDir}/index.json`, JSON.stringify({ source: "Món Ngon Mỗi Ngày", generated_at: new Date().toISOString(), recipes: index }));
const newestRecipes = index
  .filter((recipe) => recipe.has_instructions && (recipe.published_at || recipe.updated_at))
  .sort((a, b) => Date.parse(b.published_at || b.updated_at || "") - Date.parse(a.published_at || a.updated_at || ""))
  .slice(0, 8);
await writeFile(`${outputDir}/recent.json`, JSON.stringify({ source: "Món Ngon Mỗi Ngày", generated_at: new Date().toISOString(), recipes: newestRecipes }));
for (let offset = 0; offset < details.length; offset += shardSize) {
  const shard = String(Math.floor(offset / shardSize)).padStart(2, "0");
  await writeFile(`${outputDir}/recipes-${shard}.json`, JSON.stringify(details.slice(offset, offset + shardSize)));
}
console.log(`Wrote ${index.length} MNMN recipes in ${Math.ceil(details.length / shardSize)} detail shards to public/data/mnnm/`);
