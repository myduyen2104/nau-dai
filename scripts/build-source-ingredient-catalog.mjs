import { readFile, readdir, writeFile } from "node:fs/promises";
import { ingredients as coreIngredients } from "../src/data.ts";

const root = process.cwd();
const mnnmDir = `${root}/public/data/mnnm`;
const knorrArchivePath = `${root}/data-archive/knorr_source_2026-11-15/recipes.jsonl`;
const outputPath = `${root}/src/data/source-ingredients.json`;

function normalize(value) {
  return value.toLocaleLowerCase("vi").normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function fold(value) {
  return value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function decode(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&reg;/gi, "®")
    .replace(/&trade;/gi, "™");
}

function cleanName(value) {
  let name = decode(value).normalize("NFC").replace(/[¼]/g, "1/4").replace(/[½]/g, "1/2").replace(/[¾]/g, "3/4").replace(/[⅓]/g, "1/3").replace(/[⅔]/g, "2/3").replace(/\s+/g, " ").trim();
  name = name.replace(/^(?:gia\s*vị|ăn\s*kèm|rau\s*nêm|rau\s*ăn\s*kèm|trang\s*trí|nước\s*chấm)\s*:\s*/i, "");
  name = name.replace(/\s*\((?:[^)]*\d+\s*(?:g|kg|ml|quả|trứng)[^)]*)\)\s*/gi, " ");
  name = name.replace(/\s*\([^)]*\)\s*/g, " ");
  name = name.replace(/(?:\s|:)\d+(?:[.,/]\d+)?\s*(?:kg|g|mg|ml|lít|l|muỗng|thìa|trái|quả|củ|cây|nhánh|gram|gr|oz|cup|chén|tép|gói|lon|bịch|miếng|con|bó|tsp|tbsp|m)(?=$|[^\p{L}]).*$/iu, "");
  name = name.replace(/\s+(?:cắt|thái|rửa|bóc|lột|chặt|ngâm|đập dập|để nguyên)(?=$|[^\p{L}]).*$/iu, "");
  name = name.replace(/[\s:;,.-]+$/g, "").replace(/^[\s:;,.-]+/g, "").replace(/\s+/g, " ").trim();
  return name;
}

function knorrIngredientName(value) {
  let name = decode(value).replace(/\s+/g, " ").trim();
  name = name.replace(/^\s*(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(?:kilograms?|kg|grams?|gr|g|millilit(?:er|re)s?|ml|lit(?:er|re)s?|lít|l|muỗng\s+(?:canh|cà\s*phê)|thìa\s+(?:canh|cà\s*phê)|con|quả|trái|củ|tép|nhánh|cây|bó|lát|gói|chén|bát|lon|miếng|túi|viên|nắm|tsp|tbsp|cup)\s*/iu, "");
  const colonPrefix = name.match(/^([^:]{1,70}):/u);
  if (colonPrefix) name = colonPrefix[1].trim();
  name = name.replace(/^\s*(?:\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*(?:kilograms?|kg|grams?|gr|g|millilit(?:er|re)s?|ml|lit(?:er|re)s?|lít|l|muỗng\s+(?:canh|cà\s*phê)|thìa\s+(?:canh|cà\s*phê)|con|quả|trái|củ|tép|nhánh|cây|bó|lát|gói|chén|bát|lon|miếng|túi|viên|nắm|tsp|tbsp|cup)\s*/iu, "");
  return name || decode(value).trim();
}

function classify(name) {
  const text = fold(name);
  const raw = name.toLocaleLowerCase("vi");
  if (/thit|suon|gio song|gio lua|cha lua|lap xuong|xuc xich|ba ro|ba chi|gan heo|tim heo|bo cau|chim cut|heo|lon|thit nguoi|pate|ba te/.test(text) || /(?:^|\s)bò(?:\s|$)/u.test(raw)) return { category: "Thịt", containsMeat: true, vegan: false };
  if (/(?:^|\s)cá(?:\s|$|,)/u.test(raw) || /tom|tep|muc|cua|ngheu|ngao|so diep|hau|hen|luon|ech|oc |bach tuoc|thanh cua|ca thu|ca hoi|ca basa|ca loc/.test(text)) return { category: "Hải sản", containsSeafood: true, vegan: false };
  if (/trung/.test(text)) return { category: "Trứng", vegan: false };
  if (/sua|pho mai|phomai|kem tuoi|whipping|yogurt|yaourt/.test(text)) return { category: "Sữa", vegan: false };
  if (/gao|com |com$|bun|mien|mi |mi$|pho |hu tieu|banh|bot |nui|khoai|y$|yen mach|ngu coc|mi can/.test(text)) return { category: "Tinh bột" };
  if (/^(?:dầu|dau) (?:phộng|phong|mè|me|đậu|dau)|^hạt |vung|lac|dau phong|dau xanh|dau den|dau hu|dau phu|tau hu ky|tao pho/.test(raw) || /hat |vung|lac|dau phong|dau xanh|dau den|dau hu|dau phu|tau hu ky|tao pho/.test(text)) return { category: "Đậu & hạt" };
  if (/tao|cam|xoai|chuoi|nho|le$|du du|dua hau|chanh|buoi|mit|khach|man|vai|mang cau|hong|quyt|quao|sau rieng|thom$|dua ta/.test(text) || /(?:^|\s)dâu(?:\s|$)/u.test(raw)) return { category: "Trái cây" };
  if (/dau|muoi|duong|nuoc mam|nuoc tuong|xi dau|tuong|bot nem|hat nem|bot ngot|tieu|sa te|giam|ruou|mam |chao|gia vi|xot|sot|dau hao|dau me|dau dieu|dau olive|dau oliu|mat ong|nuoc cot|nuoc dua|nuoc dung|nuoc|cary|curry|ngu vi|sa$|toi|gung|nghe|hanh tim/.test(text)) return { category: "Gia vị" };
  return { category: "Rau củ" };
}

const mnnmFiles = (await readdir(mnnmDir)).filter((file) => /^recipes-\d+\.json$/.test(file));
const mnnmRecipes = (await Promise.all(mnnmFiles.map(async (file) => JSON.parse(await readFile(`${mnnmDir}/${file}`, "utf8"))))).flat();
const sourceRows = [];
let knorrRecipes = [];
for (const recipe of mnnmRecipes) for (const item of recipe.ingredients ?? []) sourceRows.push({ name: item.name, source: "Món Ngon Mỗi Ngày", kind: item.kind ?? "ingredient" });
try {
  knorrRecipes = (await readFile(knorrArchivePath, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  for (const recipe of knorrRecipes) for (const rawName of recipe.ingredients ?? []) sourceRows.push({ name: knorrIngredientName(rawName), rawName, source: "Knorr Việt Nam", kind: "ingredient" });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const coreByName = new Map();
const coreByAlias = new Map();
for (const ingredient of coreIngredients) {
  coreByName.set(normalize(ingredient.name), ingredient);
  for (const alias of ingredient.aliases) coreByAlias.set(normalize(alias), ingredient);
}

const generated = new Map();
const aliasesByCore = new Map();
for (const row of sourceRows) {
  const original = decode(row.rawName ?? row.name).replace(/\s+/g, " ").trim();
  const cleaned = cleanName(row.name);
  if (!cleaned || /^(?:gia vi|an kem|rau nem|dung cu|nguyen lieu)$/i.test(cleaned)) continue;
  const key = normalize(cleaned);
  // Branded/flavored seasoning granules share one pantry item. Keep each source
  // spelling searchable as an alias, but don't create a separate picker row.
  const folded = fold(cleaned);
  const isSeasoningGranules = /\bhat nem\b|\bbot nem rau cu\b/.test(folded);
  const exactCore = (isSeasoningGranules ? coreIngredients.find((item) => item.id === "stock-cube") : undefined)
    ?? coreByName.get(key)
    ?? coreByAlias.get(key);
  if (exactCore) {
    const aliases = aliasesByCore.get(exactCore.id) ?? new Set();
    if (normalize(original) !== normalize(exactCore.name) && original.length < 100) aliases.add(original);
    aliasesByCore.set(exactCore.id, aliases);
    continue;
  }
  const existing = generated.get(key) ?? { name: cleaned, aliases: new Set(), sources: new Set(), kinds: new Set() };
  if (original.length < 130 && normalize(original) !== key) existing.aliases.add(original);
  existing.sources.add(row.source);
  existing.kinds.add(row.kind);
  generated.set(key, existing);
}

const mergedCore = coreIngredients.map((ingredient) => ({
  ...ingredient,
  aliases: [...new Set([...ingredient.aliases, ...(aliasesByCore.get(ingredient.id) ?? [])])],
}));
const supplemental = [...generated.entries()].map(([key, item]) => {
  const category = classify(item.name);
  return {
    id: `source-${key.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}`,
    name: item.name,
    aliases: [...item.aliases],
    category: category.category,
    emoji: "🥣",
    ...(category.containsMeat ? { containsMeat: true } : {}),
    ...(category.containsSeafood ? { containsSeafood: true } : {}),
    ...(category.vegan === false ? { vegan: false } : {}),
  };
});

const allNames = new Map();
for (const item of [...mergedCore, ...supplemental]) {
  const key = normalize(item.name);
  const owners = allNames.get(key) ?? new Set();
  owners.add(item.id);
  allNames.set(key, owners);
}
const withoutConflictingAliases = (item) => ({
  ...item,
  aliases: item.aliases.filter((alias) => {
    const owners = allNames.get(normalize(alias));
    return !owners || (owners.size === 1 && owners.has(item.id));
  }),
});
const cleanCore = mergedCore.map(withoutConflictingAliases);
const cleanSupplemental = supplemental
  .filter((item) => !allNames.has(normalize(item.name)) || allNames.get(normalize(item.name)).size === 1)
  .map(withoutConflictingAliases);

const idCounts = new Map();
for (const item of cleanSupplemental) idCounts.set(item.id, (idCounts.get(item.id) ?? 0) + 1);
const duplicateIds = [...idCounts].filter(([, count]) => count > 1);
if (duplicateIds.length) throw new Error(`Generated ingredient ID collision(s): ${duplicateIds.slice(0, 10).map(([id]) => id).join(", ")}`);

await writeFile(outputPath, `${JSON.stringify({ sources: ["Món Ngon Mỗi Ngày", ...(knorrRecipes.length ? ["Knorr Việt Nam"] : [])], sourceIngredientRows: sourceRows.length, coreIngredients: cleanCore, supplementalIngredients: cleanSupplemental })}\n`);
console.log(`Generated ${cleanCore.length} core ingredients with source aliases and ${cleanSupplemental.length} supplemental ingredients from ${sourceRows.length} ingredient rows across ${mnnmRecipes.length} MNMN recipes and ${knorrRecipes.length} Knorr recipes.`);
