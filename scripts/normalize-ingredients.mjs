import { readFile, writeFile } from "node:fs/promises";
const input = new URL("../src/data/ingredients/copper-vietnam.json", import.meta.url);
const data = JSON.parse(await readFile(input, "utf8"));
const byName = new Map();
for (const term of data.terms) {
  const key = String(term.sourceName).normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi");
  const existing = byName.get(term.normalizedName);
  if (existing) existing.usedBy = [...new Set([...existing.usedBy, ...term.usedBy])];
  else byName.set(term.normalizedName, { ...term, normalizedName: key });
}
data.terms = [...byName.values()].sort((a, b) => a.normalizedName.localeCompare(b.normalizedName, "vi"));
await writeFile(input, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Chuẩn hóa ${data.terms.length} tên nguyên liệu theo Unicode NFKC và khoảng trắng.`);
