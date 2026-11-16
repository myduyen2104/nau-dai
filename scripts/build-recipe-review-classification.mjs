import { readFile, writeFile } from "node:fs/promises";

const readJson = (path) => readFile(path, "utf8").then(JSON.parse);
const [dinhduong, mnnmIndex, knorr, copper] = await Promise.all([
  readJson("public/data/dinhduong2598-canonical-recipes.json"),
  readJson("public/data/mnnm/index.json"),
  readJson("public/data/knorr/recipes.json"),
  readJson("src/data/recipes/copper-vietnam.json"),
]);
const rows = [];
const classify = ({ missing, quality }) => missing ? "SOURCE_MISSING" : quality === "verified" ? "VERIFIED" : quality === "rejected" ? "REJECTED" : "NEEDS_REVIEW";
for (const item of dinhduong) rows.push({
  source: "Dinh dưỡng 2598",
  id: item.canonicalRecipeId,
  title: item.canonicalTitle,
  status: classify({ missing: item.qualityStatus === "missing_at_source" || !item.has_ingredients || !item.has_instructions, quality: "unverified" }),
  evidence: `quality=${item.qualityStatus}; ingredients=${Boolean(item.has_ingredients)}; instructions=${Boolean(item.has_instructions)}; warnings=${(item.warnings ?? []).join("|")}`,
  source_url: item.source_url ?? item.variants?.[0]?.sourceUrl ?? "",
});
for (const item of mnnmIndex.recipes) rows.push({
  source: "Món Ngon Mỗi Ngày",
  id: item.id,
  title: item.name,
  status: classify({ missing: !item.has_ingredients || !item.has_instructions, quality: "unverified" }),
  evidence: `ingredient_names=${item.ingredient_count ?? 0}; has_ingredients=${Boolean(item.has_ingredients)}; has_instructions=${Boolean(item.has_instructions)}; catalog flags only; detail not manually reviewed`,
  source_url: item.source_url ?? "",
});
for (const item of knorr) rows.push({
  source: "Knorr Việt Nam",
  id: item.id,
  title: item.name,
  status: classify({ missing: !item.ingredients?.length || !item.steps?.length, quality: item.verificationStatus }),
  evidence: `ingredients=${item.ingredients?.length ?? 0}; steps=${item.steps?.length ?? 0}; verificationStatus=${item.verificationStatus ?? "missing"}`,
  source_url: item.source?.url ?? "",
});
for (const item of copper.recipes) rows.push({
  source: "Copper / Cook the World",
  id: item.id,
  title: item.name,
  status: classify({ missing: !item.ingredients?.length || !item.instructions?.length, quality: item.verificationStatus }),
  evidence: `ingredients=${item.ingredients?.length ?? 0}; steps=${item.instructions?.length ?? 0}; verificationStatus=${item.verificationStatus ?? "missing"}; attribution=${copper.attributionUrl}`,
  source_url: item.source?.recipeUrl ?? copper.attributionUrl ?? "",
});
const headers = ["source", "id", "title", "status", "evidence", "source_url"];
const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => quote(row[key])).join(","))].join("\n") + "\n";
await writeFile("docs/qa/recipe-quality-classification.csv", csv);
console.log(JSON.stringify({ total: rows.length, bySource: Object.fromEntries([...new Set(rows.map((row) => row.source))].map((source) => [source, rows.filter((row) => row.source === source).length])), byStatus: Object.fromEntries([...new Set(rows.map((row) => row.status))].map((status) => [status, rows.filter((row) => row.status === status).length])) }));
