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
  kind: "protein" | "vegetable" | "starch" | "other";
  preCooked: boolean;
  dumpling: boolean;
  springRoll: boolean;
  known: boolean;
};

const normalize = (value: string) => value.normalize("NFC").toLocaleLowerCase("vi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
  .replace(/[^a-z0-9]+/g, " ").trim();

const preCookedTerms = ["cha lua", "gio lua", "xuc xich", "lap xuong", "ham", "thit nguoi", "ca vien chien"];
const dumplingTerms = ["ha cao", "sui cao", "xiu mai"];
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
  const dumpling = dumplingTerms.some((term) => normalized.includes(term));
  const springRoll = normalized.includes("cha gio");
  const seasoning = ingredient?.category === "Gia vị" || seasoningTerms.some((term) => normalized === term || normalized.startsWith(`${term} `));
  const tofu = ingredient?.id === "tofu" || normalized.includes("dau hu") || normalized.includes("dau phu");
  const protein = !seasoning && (preCooked || dumpling || springRoll || tofu || ["Thịt", "Hải sản", "Trứng"].includes(ingredient?.category ?? ""));
  const vegetable = !seasoning && ingredient?.category === "Rau củ"
    && !unsuitableGenericVegetables.some((term) => normalized.includes(term));
  const starch = !seasoning && ingredient?.category === "Tinh bột";
  return {
    stock, name, normalized, category: ingredient?.category, emoji: ingredient?.emoji ?? (protein ? "🥢" : "🥬"),
    kind: protein ? "protein" : vegetable ? "vegetable" : starch ? "starch" : "other", preCooked, dumpling, springRoll, known: !!ingredient,
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

function recipeFromFoods(foods: PantryFood[], method: "xào" | "canh" | "chiên"): Recipe {
  const proteins = foods.filter((food) => food.kind === "protein");
  const vegetables = foods.filter((food) => food.kind === "vegetable");
  const main = proteins[0];
  const starch = foods.find((food) => food.kind === "starch");
  const vegNames = vegetables.map((food) => food.name);
  const quickVegetables = vegetables.filter((food) => /gia|rau|cai|xa lach|nam|ca chua/.test(food.normalized));
  const firmVegetables = vegetables.filter((food) => !quickVegetables.includes(food));
  const sauteVegetableStep = quickVegetables.length && firmVegetables.length
    ? `Xào ${firmVegetables.map((food) => food.name).join(", ")} trước; khi gần mềm mới thêm ${quickVegetables.map((food) => food.name).join(", ")} và đảo nhanh.`
    : quickVegetables.length
      ? `Cho ${quickVegetables.map((food) => food.name).join(", ")} vào gần cuối, đảo nhanh khoảng 1–2 phút để rau còn độ giòn.`
      : `Cho ${vegNames.join(", ")} vào xào đến độ mềm bạn thích; thêm chút nước nếu chảo khô.`;
  const loweredVegNames = vegNames.map((name, index) => index === 0 ? name : name.toLocaleLowerCase("vi"));
  const joinedVegNames = loweredVegNames.length > 1
    ? `${loweredVegNames.slice(0, -1).join(", ")} và ${loweredVegNames[loweredVegNames.length - 1]}`
    : loweredVegNames[0] ?? "rau củ";
  const tofu = proteins.find((food) => food.stock.id === "tofu");
  const cookedProtein = proteins.find((food) => food !== tofu && food.preCooked && !food.springRoll && !food.dumpling);
  const springRollOnly = proteins.length === 1 && proteins[0].springRoll && vegetables.length === 0 && !starch;
  const name = springRollOnly
    ? "Chả giò chiên giòn, ăn kèm nước chấm"
    : starch?.stock.id === "rice"
    ? `Cơm chiên${main ? ` ${main.name.toLocaleLowerCase("vi")}` : ""}${vegetables.length ? ` với ${vegNames.join(" và ").toLocaleLowerCase("vi")}` : ""}`
    : vegetables.length === 0 && proteins.length > 1
    ? cookedProtein && tofu
      ? `${cookedProtein.name} áp chảo cùng ${tofu.name.toLocaleLowerCase("vi")}`
      : proteins.map((food) => food.name).join(" và ") + " làm nóng"
    : method === "canh"
        ? main ? `Canh ${joinedVegNames.toLocaleLowerCase("vi")} với ${main.name.toLocaleLowerCase("vi")}` : `Canh ${joinedVegNames.toLocaleLowerCase("vi")}`
        : main ? `${joinedVegNames} xào ${main.name.toLocaleLowerCase("vi")}` : `${joinedVegNames} xào`;
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
  const steps = springRollOnly && main
    ? [
      `Kiểm tra bao bì ${main.name}: nếu còn đông lạnh, làm theo hướng dẫn chiên của nhà sản xuất và không rã đông trước trừ khi bao bì yêu cầu. Nhân chả giò thường đã nêm, không cần nêm thêm vào cuốn.`,
      `Chọn một cách chiên: chiên ngập dầu nóng khoảng 170–175°C đến khi vỏ vàng giòn và nhân nóng chín; hoặc quét/xịt một lớp dầu mỏng rồi dùng nồi chiên không dầu theo nhiệt độ, thời gian trên bao bì, lật giữa chừng.`,
      "Gắp ra để trên rack hoặc giấy thấm dầu 2–3 phút để vỏ giữ độ giòn.",
      "Pha nước chấm nếu có: khuấy 1 phần nước mắm, 1 phần đường, 2 phần nước ấm và 1 phần nước cốt chanh hoặc giấm; thêm tỏi, ớt tùy thích. Nếm rồi chỉnh chua, ngọt, mặn theo khẩu vị.",
    ]
    : starch?.stock.id === "rice"
    ? [
      "Dùng cơm đã nấu chín, để nguội và tách tơi hạt. Nếu đang có gạo sống, nấu chín trước rồi mới chiên.",
      ...(main ? [main.preCooked || main.category === "Đậu & hạt"
        ? `Áp chảo ${main.name} cho nóng và thơm; gắp ra để riêng.`
        : `Xào ${main.name} trước đến khi chín hoàn toàn; gắp ra để riêng.`] : []),
      ...(vegetables.length ? [`Cho ${vegNames.join(", ")} vào chảo, xào vừa chín; nếu có giá đỗ, cho vào sau cùng.`] : []),
      "Cho cơm vào đảo tơi trên lửa vừa; thêm nguyên liệu đã gắp ra, nêm từng ít gia vị nếu đang có rồi đảo nóng đều.",
    ]
    : method === "xào"
    ? [
      vegetables.length === 0
        ? proteins.some((food) => food.dumpling || food.springRoll)
          ? `Nếu ${proteins.filter((food) => food.dumpling || food.springRoll).map((food) => food.name).join(", ")} còn đông lạnh hoặc chưa chín, làm chín theo hướng dẫn trên bao bì trước.`
          : `Lau khô nguyên liệu. Cắt ${proteins.map((food) => food.name).join(" và ")} thành miếng vừa ăn nếu cần.`
        : main?.category === "Trứng"
        ? `Rửa và để ráo ${vegNames.join(", ")}, cắt vừa ăn rồi đánh tan trứng.`
        : `${vegNames.map((name) => /giá/i.test(name) ? `Rửa và để ráo ${name}` : `Rửa và cắt ${name} vừa ăn`).join(". ")}.${main ? ` Thái ${main.name} mỏng hoặc vừa miếng.` : ""}`,
      "Làm nóng chảo. Nếu có tỏi và dầu ăn thì phi thơm; thiếu tỏi vẫn nấu được. Có thể dùng chảo chống dính và ít dầu nếu có.",
      ...(main ? [main.category === "Trứng"
        ? "Đánh tan trứng, đổ vào chảo và đảo đến khi vừa đông; gắp ra để xào rau rồi cho trứng trở lại cuối cùng."
        : main.dumpling
          ? `Làm chín ${main.name} theo hướng dẫn trên bao bì; nếu dùng đồ đông lạnh, bảo đảm phần nhân nóng và chín hoàn toàn.`
          : main.springRoll
            ? `Nếu ${main.name} đã chiên chín, hâm riêng rồi để vào sau cùng; nếu còn sống hoặc đông lạnh, làm chín theo hướng dẫn trên bao bì.`
        : main.preCooked || main.category === "Đậu & hạt"
          ? `Cho ${main.name} vào đảo nóng đến khi nóng đều${main.preCooked ? "; nếu nhãn bao bì yêu cầu nấu chín, làm theo hướng dẫn đó" : ""}.`
          : `Cho ${main.name} vào xào trước đến khi chín hoàn toàn; thịt và hải sản sống không được để tái.`] : []),
      ...(vegetables.length
        ? [sauteVegetableStep]
        : proteins.length > 1
          ? proteins.slice(1).map((food) => food.dumpling || food.springRoll
            ? `Làm chín ${food.name} theo hướng dẫn trên bao bì trước, rồi cho vào sau cùng.`
            : `Cho ${food.name} vào sau, đảo nhẹ đến khi nóng đều.`)
          : []),
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
    emoji: method === "canh" ? "🥣" : method === "chiên" ? "🥟" : "🍳",
    description: `Gợi ý tự phối từ ${foods.map((food) => food.name).join(", ")} đang có trong tủ.`,
    category: springRollOnly
      ? "Món chiên"
      : starch?.stock.id === "rice"
      ? "Món cơm"
      : vegetables.length === 0 && proteins.some((food) => food.springRoll || food.dumpling)
      ? "Món ăn nhẹ"
      : method === "xào" ? "Món xào" : "Món canh",
    cuisine: "vietnamese",
    method,
    minutes: method === "canh" ? 25 : method === "chiên" ? 20 : 15,
    preparationTime: null,
    cookingTime: null,
    totalTime: method === "canh" ? 25 : method === "chiên" ? 20 : 15,
    difficulty: "Linh hoạt",
    servings: null,
    required: ingredients.map((item) => item.ingredientId),
    optional: [],
    ingredients,
    steps: steps.map((instruction, index) => ({ order: index + 1, instruction })),
    equipment: springRollOnly ? ["Chảo sâu lòng hoặc nồi chiên không dầu"] : [method === "xào" ? "Chảo" : "Nồi"],
    tips: [springRollOnly
      ? "Chả giò bán sẵn thường đã nêm nhân; đừng nêm thêm vào cuốn. Ưu tiên thời gian và nhiệt độ trên bao bì, nhất là với chả giò đông lạnh."
      : "Đây là gợi ý tự phối, chưa phải công thức nguồn hay món đã thử nghiệm. Nêm từ ít rồi nếm lại; không cần dùng đủ mọi gia vị."],
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
  const rice = foods.find((food) => food.stock.id === "rice");
  const suggestions: Recipe[] = [];
  const maxSuggestions = 10;
  const recipeKeys = new Set<string>();
  const vegetableKeys = new Set<string>();
  const add = (items: PantryFood[], method: "xào" | "canh" | "chiên") => {
    if (!items.length || items.length > 3 || suggestions.length >= maxSuggestions) return;
    const ingredientKey = items.map((food) => food.stock.id).sort().join("+");
    const vegetableKey = items.filter((food) => food.kind === "vegetable").map((food) => food.stock.id).sort().join("+");
    if (recipeKeys.has(ingredientKey) || (vegetableKey && vegetableKeys.has(vegetableKey))) return;
    const recipe = recipeFromFoods(items, method);
    suggestions.push(recipe);
    recipeKeys.add(ingredientKey);
    if (vegetableKey) vegetableKeys.add(vegetableKey);
  };
  const isSoupVegetable = (food: PantryFood) => ["pumpkin", "winter-melon", "luffa", "bottle-gourd"].includes(food.stock.id);
  const vegetablePairs: PantryFood[][] = [];
  for (let first = 0; first < vegetables.length; first += 1) {
    for (let second = first + 1; second < vegetables.length; second += 1) {
      const pair = [vegetables[first], vegetables[second]];
      if (!pair.some(isSoupVegetable)) vegetablePairs.push(pair);
    }
  }
  const pairScore = (pair: PantryFood[]) => {
    const ids = new Set(pair.map((food) => food.stock.id));
    if (ids.has("bean-sprout") && ids.has("eggplant")) return 0;
    if (ids.has("bean-sprout") && (ids.has("bok-choy") || ids.has("cabbage") || ids.has("spinach") || ids.has("water-spinach"))) return 1;
    return 2;
  };
  vegetablePairs.sort((a, b) => pairScore(a) - pairScore(b));

  // Start with a simple vegetable dish so the list does not repeat one base
  // recipe while merely swapping the meat or sausage.
  vegetablePairs.slice(0, 3).forEach((pair) => add(pair, "xào"));

  const tofu = proteins.find((food) => food.stock.id === "tofu");
  const preparedMeats = proteins.filter((food) => food.preCooked && !food.springRoll && !food.dumpling && food !== tofu);
  const soupVegetables = vegetables.filter(isSoupVegetable);

  // Soup suggestions use squash-like vegetables; tofu is paired with pumpkin
  // when available, instead of combining every vegetable in one pot.
  for (const vegetable of soupVegetables) {
    const protein = vegetable.stock.id === "pumpkin" && tofu
      ? tofu
      : proteins.find((food) => food !== vegetable && !food.springRoll && !food.dumpling);
    add(protein ? [vegetable, protein] : [vegetable], "canh");
  }

  // A prepared meat with tofu is a separate, compact dish idea.
  if (tofu && preparedMeats.length) add([preparedMeats[0], tofu], "xào");

  // Pair prepared proteins with one vegetable at a time, keeping the vegetable
  // combination unique across the list and avoiding a second dish centered on
  // a protein already used in another suggestion.
  const stirFryPriority = ["eggplant", "bok-choy", "cabbage", "carrot", "green-beans", "water-spinach", "bean-sprout"];
  const nonSoupVegetables = vegetables.filter((food) => !isSoupVegetable(food)).sort((a, b) => {
    const rank = (food: PantryFood) => {
      const index = stirFryPriority.indexOf(food.stock.id);
      return index < 0 ? stirFryPriority.length : index;
    };
    return rank(a) - rank(b);
  });
  const proteinsAlreadySuggested = new Set(suggestions.flatMap((recipe) => recipe.ingredients.map((item) => item.ingredientId)).filter((id) => proteins.some((food) => food.stock.id === id)));
  if (suggestions.length < 3) {
    for (const protein of preparedMeats.filter((food) => !proteinsAlreadySuggested.has(food.stock.id))) {
      for (const vegetable of nonSoupVegetables) {
        const countBefore = suggestions.length;
        add([protein, vegetable], "xào");
        if (suggestions.length > countBefore) {
          proteinsAlreadySuggested.add(protein.stock.id);
          break;
        }
      }
    }
  }

  // Rice makes a distinct, familiar meal idea instead of another version of
  // the same stir-fried vegetables.
  if (rice) {
    const protein = preparedMeats.find((food) => !food.springRoll && !food.dumpling && !proteinsAlreadySuggested.has(food.stock.id))
      ?? preparedMeats.find((food) => !food.springRoll && !food.dumpling);
    const vegetable = vegetables.find((food) => food.stock.id === "bean-sprout") ?? vegetables.find((food) => !isSoupVegetable(food));
    if (protein && vegetable) add([rice, protein, vegetable], "xào");
    else if (protein) add([rice, protein], "xào");
    else if (vegetable) add([rice, vegetable], "xào");
  }

  // Keep dumplings and spring rolls out of unrelated stir-fries. A spring roll
  // suggestion is a complete crisp-frying dish with a practical dipping sauce.
  if (suggestions.length < 5) {
    for (const preparedSnack of proteins.filter((food) => food.springRoll || food.dumpling)) {
      add([preparedSnack], preparedSnack.springRoll ? "chiên" : "xào");
    }
  }

  // If the pantry supports more genuinely different combinations, add them
  // one by one, never reusing the same vegetable set or ingredient set.
  for (const pair of vegetablePairs) {
    for (const protein of preparedMeats) add([protein, ...pair], "xào");
  }
  return suggestions.slice(0, maxSuggestions);
}
