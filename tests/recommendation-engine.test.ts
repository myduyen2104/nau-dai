import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ingredients, recipes } from "../src/data.ts";
import { buildIngredientIndex, matchesIngredient, resolveIngredientId } from "../src/utils/ingredientMatcher.ts";
import { defaultRecommendationPreferences, recommendRecipes, type EngineRecipe, type RecommendationInput } from "../src/services/recommendationEngine.ts";

const catalog = [
  { id: "egg", name: "Trứng gà", aliases: ["trứng", "egg"], category: "Trứng" },
  { id: "tomato", name: "Cà chua", aliases: ["tomato"], category: "Rau củ" },
  { id: "oil", name: "Dầu ăn", aliases: ["cooking oil"], category: "Gia vị" },
  { id: "pork", name: "Thịt heo", aliases: ["thịt lợn", "pork"], category: "Thịt" },
  { id: "pork-belly", name: "Ba chỉ heo", aliases: ["thịt ba chỉ"], category: "Thịt", parentId: "pork" },
  { id: "ground-pork", name: "Thịt heo xay", aliases: ["pork mince"], category: "Thịt", parentId: "pork" },
  { id: "milk", name: "Sữa tươi", aliases: ["milk"], category: "Sữa" },
  { id: "coconut-milk", name: "Nước cốt dừa", aliases: ["coconut milk"], category: "Sữa", vegan: true },
  { id: "rice", name: "Cơm", aliases: ["gạo", "rice"], category: "Tinh bột" },
  { id: "fish", name: "Cá", aliases: ["fish"], category: "Hải sản" },
  { id: "fish-sauce", name: "Nước mắm", aliases: ["fish sauce"], category: "Gia vị", vegan: false, containsSeafood: true },
  { id: "oyster-sauce", name: "Dầu hào", aliases: ["oyster sauce"], category: "Gia vị", vegan: false, containsSeafood: true },
  { id: "stock-cube", name: "Viên súp", aliases: ["bouillon cube"], category: "Gia vị", vegan: false, containsMeat: true },
  { id: "soy-sauce", name: "Nước tương", aliases: ["soy sauce"], category: "Gia vị" },
];
const recipe = (id: string, ids: string[], options: Partial<EngineRecipe> = {}): EngineRecipe => ({
  id, name: id, ingredients: ids.map((ingredientId) => ({ ingredientId, quantity: null, unit: "", optional: false })),
  method: "xào", minutes: 20, dataStatus: "full_recipe", steps: [{ instruction: "Cook" }],
  ...options,
});
const input = (recipes: EngineRecipe[], stock: RecommendationInput["stock"] = [], overrides: Partial<RecommendationInput> = {}): RecommendationInput => ({
  recipes, stock, ingredients: catalog, preferences: { ...defaultRecommendationPreferences }, now: new Date("2026-11-04T12:00:00Z"), ...overrides,
});
const resultFor = (data: RecommendationInput, id: string) => recommendRecipes(data).find((item) => item.recipeId === id)!;

test("tủ lạnh trống không tạo gợi ý nấu ngay", () => {
  const result = resultFor(input([recipe("eggs", ["egg"])]), "eggs");
  assert.equal(result.category, "discover");
  assert.deepEqual(result.matchedIngredients, []);
  assert.deepEqual(result.missingIngredients, ["egg"]);
});

test("đủ các loại nguyên liệu bắt buộc được xếp nhóm ready", () => {
  const result = resultFor(input([recipe("tomato-egg", ["egg", "tomato"])] , [{ id: "egg" }, { id: "tomato" }]), "tomato-egg");
  assert.equal(result.category, "ready");
  assert.equal(result.matchPercentage, 100);
});

test("thiếu một nguyên liệu được ghi đúng và vào almost", () => {
  const result = resultFor(input([recipe("tomato-egg", ["egg", "tomato"])] , [{ id: "egg" }]), "tomato-egg");
  assert.equal(result.category, "almost");
  assert.deepEqual(result.missingIngredients, ["tomato"]);
});

test("thiếu hai nguyên liệu được xếp almost", () => {
  const result = resultFor(input([recipe("three", ["egg", "tomato", "oil"])] , [{ id: "egg" }]), "three");
  assert.equal(result.category, "almost");
  assert.deepEqual(result.missingIngredients, ["tomato", "oil"]);
});

test("thiếu nguyên liệu chính không được bù điểm bằng nhiều gia vị trùng", () => {
  const seasoningHeavy = recipe("seasoning-heavy", ["pork", "oil", "salt", "sugar", "fish-sauce"]);
  const completeMain = recipe("complete-main", ["egg"]);
  const results = recommendRecipes(input([seasoningHeavy, completeMain], [
    { id: "oil" }, { id: "salt" }, { id: "sugar" }, { id: "fish-sauce" }, { id: "egg" },
  ]));
  const main = results.find((item) => item.recipeId === "complete-main")!;
  const seasoning = results.find((item) => item.recipeId === "seasoning-heavy")!;
  assert.equal(main.matchPercentage, 100);
  assert.equal(seasoning.missingIngredients.includes("pork"), true);
  assert.ok(seasoning.matchPercentage < main.matchPercentage);
});

test("nguyên liệu tùy chọn không làm món bị tính thiếu", () => {
  const result = resultFor(input([recipe("optional", ["egg"], { ingredients: [
    { ingredientId: "egg", quantity: null, unit: "", optional: false },
    { ingredientId: "tomato", quantity: null, unit: "", optional: true },
  ] })], [{ id: "egg" }]), "optional");
  assert.equal(result.category, "ready");
  assert.deepEqual(result.missingIngredients, []);
});

test("alias vùng miền thịt heo/thịt lợn ánh xạ chính xác", () => {
  const result = resultFor(input([recipe("pork", ["pork"])] , [{ id: "custom-thit-lon" }]), "pork");
  assert.deepEqual(result.matchedIngredients, ["pork"]);
});

test("tìm tên không dấu bằng alias tiếng Việt", () => {
  const index = buildIngredientIndex(catalog);
  assert.equal(resolveIngredientId("thit lon", index), "pork");
  assert.equal(matchesIngredient("ca chua", "Cà chua", ["tomato"]), true);
});

test("matching tên nguyên liệu không dùng substring mơ hồ", () => {
  assert.equal(matchesIngredient("cá", "Cá hồi", []), false);
  assert.equal(matchesIngredient("gà", "Cánh gà", []), false);
});

test("nguyên liệu cụ thể chỉ thay nguyên liệu cha trong phương pháp được cho phép", () => {
  const items = [recipe("pork-stir", ["pork"], { method: "xào" }), recipe("pork-boil", ["pork"], { method: "luộc" })];
  const results = recommendRecipes(input(items, [{ id: "pork-belly" }]));
  assert.deepEqual(results.find((item) => item.recipeId === "pork-stir")?.matchedIngredients, ["pork"]);
  assert.match(results.find((item) => item.recipeId === "pork-stir")!.reasons.join(" "), /ba chỉ heo/i);
  assert.deepEqual(results.find((item) => item.recipeId === "pork-boil")?.matchedIngredients, []);
  assert.deepEqual(recommendRecipes(input([recipe("specific", ["pork-belly"])] , [{ id: "pork" }]))[0].matchedIngredients, []);
});

test("không có định lượng thì chỉ xác nhận đủ loại nguyên liệu", () => {
  const result = resultFor(input([recipe("egg", ["egg"])] , [{ id: "egg", quantity: "2", unit: "quả" }]), "egg");
  assert.equal(result.category, "ready");
  assert.deepEqual(result.quantityShortages, []);
  assert.match(result.reasons.join(" "), /chưa thể xác nhận đủ số lượng/i);
  assert.equal(result.quantityStatus, "unknown");
});

test("định lượng cùng đơn vị được so sánh và quy đổi theo khẩu phần", () => {
  const item = recipe("quantity", ["egg"], { servings: 2, ingredients: [{ ingredientId: "egg", quantity: 3, unit: "quả", optional: false }] });
  const result = resultFor(input([item], [{ id: "egg", quantity: "2", unit: "quả" }], { preferences: { ...defaultRecommendationPreferences, servings: 4 } }), "quantity");
  assert.deepEqual(result.quantityShortages, [{ ingredientId: "egg", needed: 6, available: 2, unit: "quả" }]);
  assert.equal(result.category, "almost");
});

test("định lượng khối lượng quy đổi kg sang g", () => {
  const item = recipe("grams", ["egg"], { ingredients: [{ ingredientId: "egg", quantity: 500, unit: "g", optional: false }] });
  const result = resultFor(input([item], [{ id: "egg", quantity: 0.25, unit: "kg" }]), "grams");
  assert.equal(result.quantityShortages[0].available, 250);
});

test("nguyên liệu sắp hết hạn đẩy món sang use_soon và nêu lý do", () => {
  const result = resultFor(input([recipe("egg", ["egg"])] , [{ id: "egg", fresh: "soon" }]), "egg");
  assert.equal(result.category, "use_soon");
  assert.match(result.reasons.join(" "), /ưu tiên dùng sớm/i);
});

test("món thịt bị loại khi ăn chay, món thuần chay từ nước cốt dừa vẫn được giữ", () => {
  const items = [recipe("pork", ["pork"]), recipe("coconut", ["coconut-milk"])];
  const results = recommendRecipes(input(items, [], { preferences: { ...defaultRecommendationPreferences, vegetarian: true } }));
  assert.equal(results.some((item) => item.recipeId === "pork"), false);
  assert.equal(results.some((item) => item.recipeId === "coconut"), true);
});

test("nguyên liệu cần tránh được lọc ra", () => {
  const results = recommendRecipes(input([recipe("egg", ["egg"])], [], { preferences: { ...defaultRecommendationPreferences, avoid: ["egg"] } }));
  assert.equal(results.length, 0);
});

test("lọc hải sản khi ăn chay hoặc bật tránh hải sản", () => {
  const data = input([recipe("fish", ["fish"])]);
  assert.equal(recommendRecipes({ ...data, preferences: { ...data.preferences, vegetarian: true } }).length, 0);
  assert.equal(recommendRecipes({ ...data, preferences: { ...data.preferences, avoidSeafood: true } }).length, 0);
});

test("chế độ ăn chay và tránh hải sản nhận biết nước mắm/dầu hào trong nhóm gia vị", () => {
  const items = [recipe("fish-sauce", ["fish-sauce"]), recipe("oyster-sauce", ["oyster-sauce"]), recipe("stock-cube", ["stock-cube"]), recipe("soy-sauce", ["soy-sauce"] )];
  const data = input(items);
  const vegetarian = recommendRecipes({ ...data, preferences: { ...data.preferences, vegetarian: true } });
  assert.deepEqual(vegetarian.map((item) => item.recipeId), ["soy-sauce"]);

  const pescatarian = recommendRecipes({ ...data, preferences: { ...data.preferences, avoidSeafood: true } });
  assert.deepEqual(pescatarian.map((item) => item.recipeId), ["soy-sauce", "stock-cube"]);

  const vegan = recommendRecipes({ ...data, preferences: { ...data.preferences, vegan: true } });
  assert.deepEqual(vegan.map((item) => item.recipeId), ["soy-sauce"]);
});

test("lọc món chiên và món nướng theo phương pháp nấu", () => {
  const data = input([recipe("fried", ["egg"], { method: "chiên" }), recipe("baked", ["egg"], { method: "nướng" })]);
  assert.deepEqual(recommendRecipes({ ...data, preferences: { ...data.preferences, noFry: true } }).map((item) => item.recipeId), ["baked"]);
  assert.deepEqual(recommendRecipes({ ...data, preferences: { ...data.preferences, noOven: true } }).map((item) => item.recipeId), ["fried"]);
});

test("lọc món nấu cơm khi bật tùy chọn không nấu cơm", () => {
  const results = recommendRecipes(input([recipe("rice", ["rice"]), recipe("egg", ["egg"])], [], { preferences: { ...defaultRecommendationPreferences, noRice: true } }));
  assert.deepEqual(results.map((item) => item.recipeId), ["egg"]);
});

test("không rã đông chỉ lọc công thức được gắn dữ liệu cần rã đông", () => {
  const data = input([recipe("frozen-protein", ["pork"], { ingredients: [{ ingredientId: "pork", quantity: null, unit: "", optional: false, requiresDefrost: true }] })]);
  assert.equal(recommendRecipes({ ...data, stock: [{ id: "pork", frozen: true }], preferences: { ...data.preferences, noDefrost: true } }).length, 0);
  assert.equal(recommendRecipes({ ...data, stock: [{ id: "pork", frozen: false }], preferences: { ...data.preferences, noDefrost: true } }).length, 1);
});

test("nguyên liệu hết hạn hoặc đánh dấu hỏng không được tính là có", () => {
  const data = input([recipe("egg", ["egg"])], [{ id: "egg", fresh: "spoiled" }]);
  assert.deepEqual(resultFor(data, "egg").matchedIngredients, []);
  const expired = input([recipe("egg", ["egg"])], [{ id: "egg", expiresAt: "2026-11-03" }]);
  assert.deepEqual(resultFor(expired, "egg").matchedIngredients, []);
  const invalidExpiry = input([recipe("egg", ["egg"])], [{ id: "egg", expiresAt: "2026-02-30" }]);
  assert.deepEqual(resultFor(invalidExpiry, "egg").matchedIngredients, []);
});

test("trạng thái quantity phân biệt đủ, thiếu và chưa xác định lượng", () => {
  const measured = recipe("measured", ["egg"], { ingredients: [{ ingredientId: "egg", quantity: 2, unit: "quả", optional: false }] });
  const enough = resultFor(input([measured], [{ id: "egg", quantity: 3, unit: "quả" }]), "measured");
  const short = resultFor(input([measured], [{ id: "egg", quantity: 1, unit: "quả" }]), "measured");
  const unknown = resultFor(input([recipe("unknown", ["egg"])], [{ id: "egg" }]), "unknown");
  assert.equal(enough.quantityStatus, "sufficient");
  assert.equal(short.quantityStatus, "shortage");
  assert.equal(unknown.quantityStatus, "unknown");
});

test("thực phẩm sắp hết hạn nhưng thiếu hướng dẫn vẫn ở Khám phá, không giả là món nấu sớm", () => {
  const result = resultFor(input([recipe("partial", ["egg"], { dataStatus: "ingredients_only", steps: [] })], [{ id: "egg", fresh: "urgent" }]), "partial");
  assert.equal(result.category, "discover");
});

test("nguyên liệu cùng nhóm không được coi là tương đương ngoài quan hệ cha con", () => {
  const result = resultFor(input([recipe("pork-belly", ["pork-belly"], { method: "luộc" })], [{ id: "ground-pork" }]), "pork-belly");
  assert.deepEqual(result.matchedIngredients, []);
  assert.deepEqual(result.missingIngredients, ["pork-belly"]);
});

test("bộ lọc tránh nguyên liệu nhận alias vùng miền", () => {
  const data = input([recipe("pork", ["pork"])] , [], { preferences: { ...defaultRecommendationPreferences, avoid: ["thịt lợn"] } });
  assert.equal(recommendRecipes(data).length, 0);
});

test("bộ lọc tránh nguyên liệu khớp tên không dấu, bí danh và nguyên liệu cha-con hai chiều", () => {
  const items = [recipe("pork", ["pork"]), recipe("pork-belly", ["pork-belly"]), recipe("ground-pork", ["ground-pork"])];
  const parentAvoid = recommendRecipes(input(items, [], { preferences: { ...defaultRecommendationPreferences, avoid: ["thit lon"] } }));
  assert.equal(parentAvoid.length, 0);
  const childAvoid = recommendRecipes(input(items, [], { preferences: { ...defaultRecommendationPreferences, avoid: ["pork-belly"] } }));
  assert.deepEqual(childAvoid.map((item) => item.recipeId), ["ground-pork"]);
});

test("bộ lọc tránh nguyên liệu tự tạo khớp ID custom và tên recipe chưa chuẩn hóa", () => {
  const customRecipe = recipe("custom", ["custom:nam-bao-ngu"], { ingredients: [{ ingredientId: "custom:nam-bao-ngu", sourceName: "nấm bào ngư", quantity: null, unit: "", optional: false }] });
  const byName = recommendRecipes(input([customRecipe], [], { preferences: { ...defaultRecommendationPreferences, avoid: ["nấm bào ngư"] } }));
  assert.deepEqual(byName, []);
  const byId = recommendRecipes(input([customRecipe], [], { preferences: { ...defaultRecommendationPreferences, avoid: ["custom-nam-bao-ngu"] } }));
  assert.deepEqual(byId, []);
});

test("món chỉ có nguyên liệu và món chỉ có tên nằm ở nhóm khám phá", () => {
  const results = recommendRecipes(input([
    recipe("partial", ["egg"], { dataStatus: "ingredients_only", steps: [] }),
    recipe("catalog", [], { ingredients: [], dataStatus: "catalog_only", steps: [] }),
  ], [{ id: "egg" }]));
  assert.ok(results.every((item) => item.category === "discover" && !item.hasFullInstructions));
  assert.match(results.find((item) => item.recipeId === "partial")!.reasons.join(" "), /chưa có cách nấu/i);
});

test("cùng dữ liệu đầu vào luôn trả thứ tự và điểm ổn định", () => {
  const data = input([recipe("b", ["egg"]), recipe("a", ["egg", "tomato"])], [{ id: "egg" }]);
  assert.deepEqual(recommendRecipes(data), recommendRecipes(data));
});

test("xử lý 1.000 công thức và vẫn xếp hạng ổn định", () => {
  const items = Array.from({ length: 1000 }, (_, i) => recipe(`recipe-${String(i).padStart(4, "0")}`, ["egg", "tomato"]));
  const results = recommendRecipes(input(items, [{ id: "egg" }]));
  assert.equal(results.length, 1000);
  assert.equal(results[0].category, "almost");
  assert.equal(results[0].recipeId, "recipe-0000");
});

test("engine nhận toàn bộ 41 công thức hiện có và 3 mục Copper, vẫn để Copper ở Khám phá", async () => {
  const copper = JSON.parse(await readFile(new URL("../src/data/recipes/copper-vietnam.json", import.meta.url), "utf8"));
  const external: EngineRecipe[] = copper.recipes.map((item: { id: string; name: string; totalTimeMinutes: number | null; ingredients: { sourceName: string; ingredientId: string | null }[] }) => ({
    id: item.id, name: item.name, method: "", minutes: item.totalTimeMinutes, dataStatus: "ingredients_only", steps: [],
    ingredients: item.ingredients.map((ingredient) => ({ ingredientId: ingredient.ingredientId ?? ingredient.sourceName, sourceName: ingredient.sourceName, quantity: null, unit: "", optional: false })),
  }));
  const results = recommendRecipes({ recipes: [...recipes, ...external], stock: [{ id: "egg" }], ingredients, preferences: { ...defaultRecommendationPreferences }, now: new Date("2026-11-04T12:00:00Z") });
  assert.equal(recipes.length, 41);
  assert.equal(external.length, 3);
  assert.equal(results.length, 44);
  assert.ok(results.filter((result) => result.recipeId.startsWith("copper:")).every((result) => result.category === "discover" && !result.hasFullInstructions));
});
