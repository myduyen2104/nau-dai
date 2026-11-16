import test from "node:test";
import assert from "node:assert/strict";
import { groupCanonicalRecipeCandidates, recipeSearchRelevance } from "../src/services/sourceRecipeCatalog.ts";

test("tên món khớp chính xác đứng trước kết quả chỉ khớp từ khóa rời rạc", () => {
  assert.equal(recipeSearchRelevance("Bún bò Huế", "bun bo hue"), 0);
  assert.equal(recipeSearchRelevance("Cách nấu bún bò Huế đậm chất miền Trung", "Bún bò Huế"), 1);
  assert.equal(recipeSearchRelevance("Bắp Bò Nhúng Mắm Ruốc", "Bún bò Huế"), 3);
});

test("same-title exact copies collapse into one card while distinct source and ingredient variants remain", () => {
  const rows = [
    { title: "Canh cà chua trứng", source: "internal", ingredients: ["Cà chua", "Trứng gà"] },
    { title: "Canh cà chua trứng", source: "internal", ingredients: ["Trứng gà", "Cà chua"] },
    { title: "Canh cà chua trứng", source: "Dinh dưỡng 2598", ingredients: ["Cà chua", "Trứng gà"] },
    { title: "Canh cà chua trứng", source: "Món Ngon Mỗi Ngày", ingredients: ["Cà chua", "Trứng vịt"] },
  ];
  const [group] = groupCanonicalRecipeCandidates(rows, (row) => row.title, (row) => row.ingredients, (row) => row.source);
  assert.equal(group.primary, rows[0]);
  assert.deepEqual(group.variants, [rows[2], rows[3]]);
});
