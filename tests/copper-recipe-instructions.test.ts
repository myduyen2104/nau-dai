import test from "node:test";
import assert from "node:assert/strict";
import copperCatalog from "../src/data/recipes/copper-vietnam.json" with { type: "json" };

test("Copper Vietnamese dishes include adapted, attributed cooking instructions", () => {
  assert.equal(copperCatalog.license, "CC-BY-4.0");
  assert.equal(copperCatalog.recipes.length, 3);
  for (const recipe of copperCatalog.recipes) {
    assert.ok(recipe.instructions.length >= 4, `${recipe.name} needs ordered cooking steps`);
    assert.ok(recipe.instructionReference?.url, `${recipe.name} needs an instruction source URL`);
    assert.equal(recipe.verificationStatus, "adapted");
    assert.equal(recipe.dataStatus, "full_recipe");
    for (const addedName of recipe.addedIngredients) {
      assert.ok(recipe.ingredients.some((ingredient) => ingredient.sourceName === addedName), `${recipe.name} missing added ingredient ${addedName}`);
    }
  }
});
