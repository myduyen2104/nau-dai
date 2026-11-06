import test from "node:test";
import assert from "node:assert/strict";
import { isRecipeAllowed, matchRecipeIngredients } from "../src/utils/recommendations.ts";

const prefs = { avoid: [], vegan: false, vegetarian: false, avoidMeat: false, avoidSeafood: false, noRice: false, noFry: false, noOven: false, noDefrost: false, quick: false, maxTime: 60 };

test("tính chính xác nguyên liệu có sẵn và còn thiếu", () => {
  assert.deepEqual(matchRecipeIngredients(["egg", "rice"], ["scallion"], new Set(["egg", "scallion"])), {
    missing: ["rice"], owned: ["egg"], optionalOwned: ["scallion"], ratio: 65,
  });
});

test("không tuyên bố sẵn nguyên liệu khi công thức chưa khai báo thành phần bắt buộc", () => {
  assert.deepEqual(matchRecipeIngredients([], [], new Set(["egg"])), { missing: [], owned: [], optionalOwned: [], ratio: 0 });
});

test("loại món có nguyên liệu bị tránh hoặc không hợp chế độ ăn", () => {
  const recipe = { required: ["pork"], optional: [], method: "kho", minutes: 30 };
  assert.equal(isRecipeAllowed(recipe, { ...prefs, vegetarian: true }, () => "Thịt"), false);
  assert.equal(isRecipeAllowed(recipe, { ...prefs, avoid: ["pork"] }, () => "Thịt"), false);
  assert.equal(isRecipeAllowed(recipe, prefs, () => "Thịt"), true);
  assert.equal(isRecipeAllowed({ required: ["shrimp"], optional: [], method: "luộc", minutes: 20 }, { ...prefs, avoidSeafood: true }, () => "Hải sản"), false);
  assert.equal(isRecipeAllowed({ required: ["milk"], optional: [], method: "luộc", minutes: 20 }, { ...prefs, vegan: true }, () => "Sữa"), false);
});

test("áp dụng giới hạn thời gian và phương thức nấu", () => {
  assert.equal(isRecipeAllowed({ required: [], optional: [], method: "xào", minutes: 20 }, { ...prefs, noFry: true }, () => undefined), false);
  assert.equal(isRecipeAllowed({ required: [], optional: [], method: "luộc", minutes: 50 }, { ...prefs, maxTime: 45 }, () => undefined), false);
});
