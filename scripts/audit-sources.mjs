import { readFile } from "node:fs/promises";
const audit = JSON.parse(await readFile(new URL("../source-audit.json", import.meta.url), "utf8"));
const invalid = audit.sources.filter((source) => source.importDecision === "approved_for_import" && (source.redistributionAllowed !== "yes" || !source.attributionRequired));
if (invalid.length) { console.error(`Nguồn chưa đủ điều kiện import: ${invalid.map((x) => x.sourceName).join(", ")}`); process.exitCode = 1; }
else {
  for (const source of audit.sources) console.log(`${source.importDecision.padEnd(20)} ${source.sourceName} — ${source.license}`);
}
