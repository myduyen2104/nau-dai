import test from "node:test";
import assert from "node:assert/strict";
import { buildIngredientIndex, matchesIngredient, normalizeVietnamese, resolveIngredientId } from "../src/utils/ingredientMatcher.ts";

test("chuẩn hóa tiếng Việt không dấu, không phân biệt hoa thường", () => {
  assert.equal(normalizeVietnamese("ĐẬU HÀ LAN"), "dau ha lan");
  assert.equal(matchesIngredient("rau muong", "Rau muống", ["water spinach"]), true);
  assert.equal(matchesIngredient("rau lang", "Rau muống", []), false);
});

test("tên có dấu phân biệt được 'me' và 'mè'; chữ không dấu nhập vào thì không đoán alias trùng", () => {
  const index = buildIngredientIndex([
    { id: "tamarind", name: "Me", aliases: ["tamarind"], category: "Gia vị" },
    { id: "sesame", name: "Mè", aliases: ["vừng"], category: "Đậu & hạt" },
  ]);

  assert.equal(resolveIngredientId("mè", index), "sesame");
  assert.equal(resolveIngredientId("me", index), null);
});
