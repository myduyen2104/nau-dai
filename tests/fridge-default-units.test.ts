import test from "node:test";
import assert from "node:assert/strict";
import { ingredients } from "../src/data.ts";

test("nguyên liệu phổ biến có đơn vị tủ lạnh mặc định dễ hiểu", () => {
  const defaultUnit = (id: string) => ingredients.find((ingredient) => ingredient.id === id)?.defaultUnit;
  assert.equal(defaultUnit("egg"), "quả");
  assert.equal(defaultUnit("tomato"), "quả");
  assert.equal(defaultUnit("pork"), "g");
});
