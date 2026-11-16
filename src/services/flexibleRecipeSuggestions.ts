import type { Ingredient } from "../data.ts";
import type { Recipe } from "../data.ts";

export type FlexibleStockItem = {
  id: string;
  name?: string;
  quantity?: number | string | null;
  unit?: string;
  fresh?: string;
  expiresAt?: string;
  frozen?: boolean;
};

export type FlexiblePreferences = {
  avoid: string[];
  vegan: boolean;
  vegetarian: boolean;
  avoidMeat: boolean;
  avoidSeafood: boolean;
};

type PantryFood = {
  stock: FlexibleStockItem;
  name: string;
  normalized: string;
  category?: Ingredient["category"];
  emoji: string;
  kind: "protein" | "vegetable" | "other";
  preCooked: boolean;
  known: boolean;
};

const normalize = (value: string) => value.normalize("NFC").toLocaleLowerCase("vi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
  .replace(/[^a-z0-9]+/g, " ").trim();

const preCookedTerms = ["cha lua", "gio lua", "xuc xich", "lap xuong", "ham", "thit nguoi"];
const seasoningTerms = ["toi", "hanh", "gung", "sa", "muoi", "duong", "nuoc mam", "nuoc tuong", "dau an", "tieu", "giam", "sa te"];
// These are normally eaten fresh or used as aromatics, so the generic
// stir-fry/soup templates should not turn them into cooked vegetables.
const unsuitableGenericVegetables = ["xa lach", "dua leo", "rau thom", "hung que", "ngo gai", "rau mui", "bac ha", "rau ram"];

function describeStock(stock: FlexibleStockItem, catalog: Ingredient[]): PantryFood {
  const rawName = stock.name ?? "";
  const ingredient = catalog.find((item) => item.id === stock.id)
    ?? catalog.find((item) => [item.name, item.id, ...item.aliases].some((term) => normalize(term) === normalize(rawName)));
  const name = ingredient?.name ?? (rawName || stock.id.replace(/^custom-/, "").replace(/-/g, " "));
  const normalized = normalize(name);
  const preCooked = preCookedTerms.some((term) => normalized.includes(term));
  const seasoning = ingredient?.category === "Gia vị" || seasoningTerms.some((term) => normalized === term || normalized.startsWith(`${term} `));
  const tofu = ingredient?.id === "tofu" || normalized.includes("dau hu") || normalized.includes("dau phu");
  const protein = !seasoning && (preCooked || tofu || ["Thịt", "Hải sản", "Trứng"].includes(ingredient?.category ?? ""));
  const vegetable = !seasoning && ingredient?.category === "Rau củ"
    && !unsuitableGenericVegetables.some((term) => normalized.includes(term));
  return {
    stock, name, normalized, category: ingredient?.category, emoji: ingredient?.emoji ?? (protein ? "🥢" : "🥬"),
    kind: protein ? "protein" : vegetable ? "vegetable" : "other", preCooked, known: !!ingredient,
  };
}

function safeForPreferences(food: PantryFood, preferences: FlexiblePreferences): boolean {
  if (preferences.avoid.some((term) => {
    const blocked = normalize(term);
    return !!blocked && (blocked === food.normalized || food.normalized.includes(blocked));
  })) return false;
  if (preferences.vegetarian || preferences.vegan || preferences.avoidMeat) {
    if (food.category === "Thịt" || food.category === "Hải sản" || food.normalized.includes("cha lua") || food.normalized.includes("gio lua")) return false;
  }
  if (preferences.vegan && (food.category === "Trứng" || food.category === "Sữa")) return false;
  if (preferences.avoidSeafood && food.category === "Hải sản") return false;
  if ((preferences.vegetarian || preferences.vegan || preferences.avoidMeat || preferences.avoidSeafood) && !food.known) return false;
  return true;
}

function recipeFromFoods(foods: PantryFood[], method: "xào" | "canh"): Recipe {
  const proteins = foods.filter((food) => food.kind === "protein");
  const vegetables = foods.filter((food) => food.kind === "vegetable");
  const main = proteins[0];
  const vegNames = vegetables.map((food) => food.name);
  const quickVegetables = vegetables.filter((food) => /gia|rau|cai|xa lach|nam|ca chua/.test(food.normalized));
  const firmVegetables = vegetables.filter((food) => !quickVegetables.includes(food));
  const sauteVegetableStep = quickVegetables.length && firmVegetables.length
    ? `Xào ${firmVegetables.map((food) => food.name).join(", ")} trước; khi gần mềm mới thêm ${quickVegetables.map((food) => food.name).join(", ")} và đảo nhanh.`
    : quickVegetables.length
      ? `Cho ${quickVegetables.map((food) => food.name).join(", ")} vào gần cuối, đảo nhanh khoảng 1–2 phút để rau còn độ giòn.`
      : `Cho ${vegNames.join(", ")} vào xào đến độ mềm bạn thích; thêm chút nước nếu chảo khô.`;
  const loweredVegNames = vegNames.map((name, index) => index === 0 ? name : name.toLocaleLowerCase("vi"));
  const name = main
    ? `${loweredVegNames.join(" và ")} ${method} ${main.name.toLocaleLowerCase("vi")}`
    : method === "xào" ? `${loweredVegNames[0]} xào ${loweredVegNames.slice(1).join(" và ")}` : `Canh ${loweredVegNames.join(" và ")}`;
  const ingredients = foods.map((food) => {
    const amount = food.stock.quantity !== undefined && food.stock.quantity !== null && String(food.stock.quantity).trim()
      ? `${food.stock.quantity} ${food.stock.unit ?? ""} · lượng bạn đang có`.trim()
      : undefined;
    return {
      ingredientId: food.stock.id,
      sourceName: food.name,
      quantity: null,
      unit: "",
      note: amount,
      optional: false,
      role: food.kind === "protein" ? "main" as const : "required" as const,
    };
  });
  const steps = method === "xào"
    ? [
      main?.category === "Trứng"
        ? `Rửa và để ráo ${vegNames.join(", ")}, cắt vừa ăn rồi đánh tan trứng.`
        : `${vegNames.map((name) => /giá/i.test(name) ? `Rửa và để ráo ${name}` : `Rửa và cắt ${name} vừa ăn`).join(". ")}.${main ? ` Thái ${main.name} mỏng hoặc vừa miếng.` : ""}`,
      "Làm nóng chảo. Nếu có tỏi và dầu ăn thì phi thơm; thiếu tỏi vẫn nấu được. Có thể dùng chảo chống dính và ít dầu nếu có.",
      ...(main ? [main.category === "Trứng"
        ? "Đánh tan trứng, đổ vào chảo và đảo đến khi vừa đông; gắp ra để xào rau rồi cho trứng trở lại cuối cùng."
        : main.preCooked || main.category === "Đậu & hạt"
          ? `Cho ${main.name} vào đảo nóng trước. Nguyên liệu này thường đã chín hoặc ăn được; chỉ cần làm nóng và tránh làm nát.`
          : `Cho ${main.name} vào xào trước đến khi chín hoàn toàn; thịt và hải sản sống không được để tái.`] : []),
      sauteVegetableStep,
      main?.category === "Trứng"
        ? "Nêm từng ít nước mắm, nước tương hoặc muối nếu đang có; cho trứng đã xào trở lại chảo, đảo đều rồi nếm lại. Gia vị không nằm trong tủ có thể bỏ qua."
        : "Nêm từng ít nước mắm, nước tương hoặc muối nếu đang có; nếm lại rồi tắt bếp. Gia vị không nằm trong tủ có thể bỏ qua.",
    ]
    : [
      `Rửa ${vegNames.join(", ")} và cắt miếng vừa ăn. Cắt ${main?.name ?? "nguyên liệu chính"} vừa miệng.`,
      "Đun sôi nước trong nồi; lượng nước điều chỉnh theo số người ăn.",
      ...(main ? [main.category === "Trứng"
        ? "Đánh tan trứng rồi rót thành dòng mỏng vào nồi đang sôi nhẹ, khuấy nhẹ đến khi trứng chín."
        : main.preCooked || main.category === "Đậu & hạt"
          ? `Cho ${main.name} vào làm nóng trong nước dùng; không cần nấu lâu.`
          : `Cho ${main.name} vào nấu đến khi chín hoàn toàn, hớt bọt nếu cần.`] : []),
      `Cho rau củ lâu chín vào trước, rau mềm vào sau. Nấu đến độ mềm mong muốn.`,
      "Nêm từng ít muối hoặc nước mắm nếu có, nếm lại rồi tắt bếp.",
    ];
  return {
    id: `flexible-${foods.map((food) => normalize(food.stock.id)).join("-")}-${method}`,
    slug: `flexible-${foods.map((food) => normalize(food.stock.id)).join("-")}-${method}`,
    name,
    emoji: method === "xào" ? "🍳" : "🥣",
    description: `Gợi ý tự phối từ ${foods.map((food) => food.name).join(", ")} đang có trong tủ.`,
    category: method === "xào" ? "Món xào" : "Món canh",
    cuisine: "vietnamese",
    method,
    minutes: method === "xào" ? 15 : 25,
    preparationTime: null,
    cookingTime: null,
    totalTime: method === "xào" ? 15 : 25,
    difficulty: "Linh hoạt",
    servings: null,
    required: ingredients.map((item) => item.ingredientId),
    optional: [],
    ingredients,
    steps: steps.map((instruction, index) => ({ order: index + 1, instruction })),
    equipment: [method === "xào" ? "Chảo" : "Nồi"],
    tips: ["Đây là gợi ý tự phối, chưa phải công thức nguồn hay món đã thử nghiệm. Nêm từ ít rồi nếm lại; không cần dùng đủ mọi gia vị."],
    tags: ["Gợi ý linh hoạt", method],
    source: { type: "internal", title: "Gợi ý linh hoạt từ tủ lạnh · tự biên soạn, chưa thử nghiệm" },
    verificationStatus: "adapted",
    dataStatus: "full_recipe",
  };
}

export function suggestFlexibleRecipes(
  stock: FlexibleStockItem[],
  catalog: Ingredient[],
  preferences: FlexiblePreferences,
): Recipe[] {
  const foods = stock.map((item) => describeStock(item, catalog)).filter((food) => food.kind !== "other" && safeForPreferences(food, preferences));
  const proteins = foods.filter((food) => food.kind === "protein");
  const vegetables = foods.filter((food) => food.kind === "vegetable");
  const suggestions: Recipe[] = [];
  const add = (items: PantryFood[], method: "xào" | "canh") => {
    const recipe = recipeFromFoods(items, method);
    if (!suggestions.some((entry) => entry.id === recipe.id)) suggestions.push(recipe);
  };

  for (const protein of proteins.slice(0, 2)) {
    if (vegetables.length) add([protein, ...vegetables.slice(0, 3)], "xào");
  }
  if (!proteins.length && vegetables.length >= 2) add(vegetables.slice(0, 4), "xào");
  if (proteins.length && vegetables.length >= 2 && (proteins[0].preCooked || proteins[0].category === "Đậu & hạt")) {
    add([proteins[0], ...vegetables.slice(0, 3)], "canh");
  }
  return suggestions.slice(0, 3);
}
