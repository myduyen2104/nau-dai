import { readFile, writeFile } from "node:fs/promises";

const readJson = (path) => readFile(path, "utf8").then(JSON.parse);
const [mnnm, knorrBlog, knorrRecipes] = await Promise.all([
  readJson("public/data/mnnm/index.json"),
  readJson("data-archive/knorr_tips_source/tips.json"),
  readJson("public/data/knorr/recipes.json"),
]);
const tips = [];
const compact = (value, max = 180) => {
  const text = String(value ?? "").replace(/\s+/gu, " ").trim();
  if (text.length <= max) return text;
  const space = text.lastIndexOf(" ", max - 3);
  return `${text.slice(0, space > max * 0.65 ? space : max - 3).trimEnd()}…`;
};
const recentMnnm = [...mnnm.recipes].sort((a, b) => Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? ""));
let mnnmTipCount = 0;
for (const recipe of recentMnnm) for (const tip of recipe.tips ?? []) {
  if (mnnmTipCount >= 24) break;
  if (!tip || /:\s*$/u.test(tip)) continue;
  tips.push({ id: `mnnm:${recipe.id}:${mnnmTipCount}`, title: recipe.name, text: compact(tip), source: "Món Ngon Mỗi Ngày", sourceUrl: recipe.source_url, imageUrl: recipe.image_url ?? null });
  mnnmTipCount += 1;
}
const knorrArticles = [...knorrBlog.articles].sort((a, b) => Number((b.tips ?? []).some((tip) => tip.text)) - Number((a.tips ?? []).some((tip) => tip.text)));
for (const article of knorrArticles) for (const tip of article.tips ?? []) {
  tips.push({ id: `knorr-tip:${article.id}:${tips.length}`, title: article.title, subheading: tip.title, text: compact(tip.text), source: "Knorr Việt Nam", sourceUrl: article.url, imageUrl: article.image_url ?? null });
}
for (const recipe of knorrRecipes) for (const tip of recipe.tips ?? []) {
  tips.push({ id: `knorr-recipe:${recipe.id}:${tips.length}`, title: recipe.name, text: compact(tip), source: "Knorr Việt Nam", sourceUrl: recipe.source?.url ?? null, imageUrl: recipe.imageUrl ?? null });
}
const deduped = [...new Map(tips.map((tip) => [`${tip.source}|${tip.sourceUrl}|${tip.subheading ?? tip.text}`, tip])).values()];
if (!deduped.some((tip) => tip.source === "Món Ngon Mỗi Ngày") || !deduped.some((tip) => tip.source === "Knorr Việt Nam")) throw new Error("Cooking tips must include both source publishers");
await writeFile("public/data/cooking-tips.json", `${JSON.stringify({ generated_at: new Date().toISOString(), sources: ["Món Ngon Mỗi Ngày", "Knorr Việt Nam"], tips: deduped })}\n`);
console.log(JSON.stringify({ total: deduped.length, bySource: Object.fromEntries([...new Set(deduped.map((tip) => tip.source))].map((source) => [source, deduped.filter((tip) => tip.source === source).length])) }));
