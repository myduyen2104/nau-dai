import test from "node:test";
import assert from "node:assert/strict";
import { formatRecipeQuantity, scaleRecipeQuantity } from "../src/utils/servings.ts";

test("điều chỉnh lượng theo khẩu phần khi có định lượng và phần gốc", () => {
  assert.equal(scaleRecipeQuantity(3, "quả", 2, 4), 6);
  assert.equal(scaleRecipeQuantity(2.5, "g", 4, 2), 1.25);
});

test("không tạo định lượng khi thiếu lượng hoặc số phần gốc", () => {
  assert.equal(scaleRecipeQuantity(null, "g", 2, 4), null);
  assert.equal(scaleRecipeQuantity(3, "g", null, 4), null);
  assert.equal(scaleRecipeQuantity(3, "g", 0, 4), null);
  assert.equal(scaleRecipeQuantity(3, "pinch", 2, 4), null);
});

test("định dạng lượng gọn, không để lượng dương rất nhỏ thành số không", () => {
  assert.equal(formatRecipeQuantity(1.666), "1,67");
  assert.equal(formatRecipeQuantity(0.001), "<0,01");
});
