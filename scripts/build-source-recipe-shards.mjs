import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getDinhduongEligibilityDecision, isDinhduongSourceRecordEligible } from "./lib/dinhduong-recipe-eligibility.mjs";

const project = new URL("../", import.meta.url);
const sourceInput = JSON.parse(await readFile(new URL("dinhduong2598_final_export/recipes_with_health_tags.json", project), "utf8"));
const input = sourceInput.filter(isDinhduongSourceRecordEligible);
const deletedSourceCount = sourceInput.filter((record) => getDinhduongEligibilityDecision(record).decision === "DELETE").length;
const reviewSourceCount = sourceInput.filter((record) => getDinhduongEligibilityDecision(record).decision === "REVIEW").length;
const output = new URL("public/data/recipes/", project);
await mkdir(output, { recursive: true });
const shards = new Map();
for (const recipe of input) {
  const shard = createHash("sha1").update(recipe.id).digest("hex").slice(0, 2);
  const rows = shards.get(shard) ?? [];
  rows.push({
    id: recipe.id,
    name: recipe.name,
    detail_name: recipe.detail_name ?? null,
    category: recipe.detail_category ?? recipe.category ?? null,
    age_group: recipe.age_group ?? null,
    serving: recipe.serving ?? null,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : null,
    instructions_raw: recipe.instructions_raw ?? null,
    nutrition: recipe.nutrition ?? null,
    source_url: recipe.source_url ?? null,
    quality_status: recipe.quality_status,
    warnings: recipe.warnings ?? [],
    integrity_findings: recipe.integrity_findings ?? [],
    source_categories: recipe.source_categories ?? [],
    source_age_group: recipe.source_age_group ?? null,
    source_tag_evidence_status: recipe.source_tag_evidence_status ?? "not_available",
  });
  shards.set(shard, rows);
}
let total = 0;
for (const [shard, rows] of shards) {
  total += rows.length;
  await writeFile(new URL(`${shard}.json`, output), JSON.stringify(rows));
}
const activeShardFiles = new Set([...shards.keys()].map((shard) => `${shard}.json`));
for (const filename of await readdir(output)) {
  if (/^[\da-f]{2}\.json$/i.test(filename) && !activeShardFiles.has(filename)) await unlink(new URL(filename, output));
}
console.log(`Wrote ${total} eligible detailed records across ${shards.size} lazy-loaded shards; deleted ${deletedSourceCount}, held ${reviewSourceCount} for review, and removed stale shard files`);
