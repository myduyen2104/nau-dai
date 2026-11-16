import assert from "node:assert/strict";
import test from "node:test";
import { ingredients } from "../src/data.ts";
import { buildIngredientIndex } from "../src/utils/ingredientMatcher.ts";
import { canonicalShoppingIngredientName, shoppingIngredientCategory, shoppingIngredientIdentity } from "../src/services/shoppingList.ts";

const index = buildIngredientIndex(ingredients);

test("shopping categories use kitchen-appropriate overrides for source names", () => {
  assert.equal(shoppingIngredientCategory("Nước mắm cá loại 1", index), "Gia vị");
  assert.equal(shoppingIngredientCategory("Hoa chuối", index), "Rau củ");
  assert.equal(shoppingIngredientCategory("Rau thơm", index), "Rau củ");
});

test("shopping identity folds explicit aliases but keeps unrelated ingredients separate", () => {
  assert.equal(shoppingIngredientIdentity("thịt heo", index), shoppingIngredientIdentity("thịt lợn", index));
  assert.notEqual(shoppingIngredientIdentity("đậu phộng", index), shoppingIngredientIdentity("đậu gà", index));
});

test("shopping display names normalize only explicit ingredient aliases", () => {
  assert.equal(canonicalShoppingIngredientName("thịt lợn", index), "Thịt heo");
  assert.equal(canonicalShoppingIngredientName("unknown special ingredient", index), "unknown special ingredient");
});
