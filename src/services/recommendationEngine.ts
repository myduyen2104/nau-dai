import { buildIngredientIndex, canonicalIngredientPreference, normalizeVietnamese, resolveIngredientId, type IngredientIndexEntry } from "../utils/ingredientMatcher.ts";
import { isValidDateOnly } from "../utils/dateOnly.ts";
import { getRecipeSubstitutions, type SubstitutionSuggestion } from "./substitutions.ts";

export type StockItem = {
  id: string;
  name?: string;
  quantity?: number | string | null;
  unit?: string;
  fresh?: "fresh" | "soon" | "urgent" | "spoiled" | "expired";
  expiresAt?: string;
  frozen?: boolean;
};

export type EngineIngredient = {
  ingredientId: string;
  sourceName?: string;
  quantity: number | null;
  unit: string;
  optional: boolean;
  role?: "main" | "required" | "seasoning" | "optional";
  requiresDefrost?: boolean;
};

export type EngineRecipe = {
  id: string;
  name: string;
  ingredients: EngineIngredient[];
  required?: string[];
  optional?: string[];
  method: string;
  minutes?: number | null;
  totalTime?: number | null;
  servings?: number | null;
  difficulty?: string;
  dataStatus: "full_recipe" | "ingredients_only" | "catalog_only";
  steps?: { instruction: string }[];
  source?: { title?: string; url?: string };
};

export type RecommendationPreferences = {
  avoid: string[];
  vegan: boolean;
  vegetarian: boolean;
  avoidMeat: boolean;
  avoidSeafood: boolean;
  noRice: boolean;
  noFry: boolean;
  noOven: boolean;
  noDefrost: boolean;
  quick: boolean;
  maxTime: number;
  servings?: number;
  allowSubstitutions?: boolean;
};

export type RecipeRecommendation = {
  recipeId: string;
  score: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  quantityShortages: { ingredientId: string; needed: number; available: number; unit: string }[];
  matchPercentage: number;
  category: "ready" | "substitution" | "almost" | "use_soon" | "discover";
  urgent: boolean;
  substitutions: SubstitutionSuggestion[];
  reasons: string[];
  hasFullInstructions: boolean;
  quantityStatus: "sufficient" | "shortage" | "unknown";
};

export type RecommendationInput = {
  stock: StockItem[];
  recipes: EngineRecipe[];
  preferences: RecommendationPreferences;
  ingredients: IngredientIndexEntry[];
  now?: Date;
};

const compatibleMethods: Record<string, string[]> = {
  "pork-belly": ["kho", "xào", "rim", "nấu canh"],
  "ground-pork": ["xào", "rim", "nấu canh"],
  "chicken-wing": ["nướng", "chiên", "xào", "nấu canh"],
  "beef-brisket": ["kho", "xào", "rim", "nấu canh"],
  "beef-sirloin": ["xào", "áp chảo"],
};
const normalizedMethod = (value: string) => normalizeVietnamese(value).replace(/\s+/g, " ");
const safetyStates = new Set(["spoiled", "expired"]);
const dimensions: Record<string, { dimension: string; factor: number }> = {
  g: { dimension: "mass", factor: 1 }, gram: { dimension: "mass", factor: 1 }, grams: { dimension: "mass", factor: 1 },
  kg: { dimension: "mass", factor: 1000 }, mg: { dimension: "mass", factor: 0.001 },
  ml: { dimension: "volume", factor: 1 }, milliliter: { dimension: "volume", factor: 1 }, l: { dimension: "volume", factor: 1000 }, liter: { dimension: "volume", factor: 1000 },
  tsp: { dimension: "volume", factor: 5 }, teaspoon: { dimension: "volume", factor: 5 }, tbsp: { dimension: "volume", factor: 15 }, tablespoon: { dimension: "volume", factor: 15 }, cup: { dimension: "volume", factor: 240 }, cups: { dimension: "volume", factor: 240 },
  pcs: { dimension: "count", factor: 1 }, pc: { dimension: "count", factor: 1 }, piece: { dimension: "count", factor: 1 }, pieces: { dimension: "count", factor: 1 },
  qua: { dimension: "count", factor: 1 }, cu: { dimension: "count", factor: 1 }, trai: { dimension: "count", factor: 1 }, con: { dimension: "count", factor: 1 }, bo: { dimension: "count", factor: 1 }, phan: { dimension: "serving", factor: 1 },
};
const normalizedUnit = (unit: string) => normalizeVietnamese(unit).replace(/\./g, "").trim();
const validQuantity = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

function isExpired(item: StockItem, now: Date) {
  if (safetyStates.has(item.fresh ?? "")) return true;
  if (!item.expiresAt) return false;
  if (!isValidDateOnly(item.expiresAt)) return true;
  const expiration = new Date(`${item.expiresAt}T23:59:59`);
  return Number.isFinite(expiration.getTime()) && expiration.getTime() < now.getTime();
}

function stockCanonicalId(item: StockItem, index: ReturnType<typeof buildIngredientIndex>) {
  if (index.byId.has(item.id)) return item.id;
  const customName = item.name ?? (item.id.startsWith("custom-") ? item.id.slice(7).replace(/-/g, " ") : item.id);
  return resolveIngredientId(customName, index) ?? `custom:${normalizeVietnamese(customName)}`;
}

function recipeCanonicalId(item: EngineIngredient, index: ReturnType<typeof buildIngredientIndex>) {
  if (index.byId.has(item.ingredientId)) return item.ingredientId;
  if (item.ingredientId.startsWith("custom:") && !item.sourceName) return `custom:${normalizeVietnamese(item.ingredientId.slice(7))}`;
  const name = item.sourceName ?? item.ingredientId;
  return resolveIngredientId(name, index) ?? `custom:${normalizeVietnamese(name)}`;
}

function isMatch(requiredId: string, stockId: string, method: string, index: ReturnType<typeof buildIngredientIndex>) {
  if (requiredId === stockId) return true;
  const stockEntry = index.byId.get(stockId);
  if (stockEntry?.parentId !== requiredId) return false;
  const permitted = compatibleMethods[stockId];
  return !!permitted?.some((candidate) => normalizedMethod(candidate) === normalizedMethod(method));
}

function categoryFor(id: string, index: ReturnType<typeof buildIngredientIndex>) {
  return index.byId.get(id)?.category;
}

function ingredientFamily(id: string, index: ReturnType<typeof buildIngredientIndex>) {
  const family = new Set([id]);
  let current = index.byId.get(id);
  while (current?.parentId && !family.has(current.parentId)) {
    family.add(current.parentId);
    current = index.byId.get(current.parentId);
  }
  for (const entry of index.byId.values()) {
    let parent = entry.parentId;
    while (parent) {
      if (parent === id) { family.add(entry.id); break; }
      parent = index.byId.get(parent)?.parentId;
    }
  }
  return family;
}

function ingredientWeight(item: EngineIngredient, id: string, index: ReturnType<typeof buildIngredientIndex>) {
  const role = item.role ?? (item.optional
    ? "optional"
    : categoryFor(id, index) === "Gia vị"
      ? "seasoning"
      : ["Thịt", "Hải sản", "Trứng", "Tinh bột"].includes(categoryFor(id, index) ?? "")
        ? "main"
        : "required");
  return role === "main" ? 2.5 : role === "seasoning" ? 0.4 : role === "optional" ? 0 : 1;
}

function isAllowed(recipe: EngineRecipe, prefs: RecommendationPreferences, ingredientIds: string[], stock: StockItem[], stockIds: string[], index: ReturnType<typeof buildIngredientIndex>, replacements = new Map<string, string>()) {
  const effectiveIds = ingredientIds.map((id) => replacements.get(id) ?? id);
  const categories = effectiveIds.map((id) => categoryFor(id, index));
  const methods = normalizedMethod(recipe.method);
  const time = recipe.minutes ?? recipe.totalTime ?? null;
  if (prefs.maxTime > 0 && prefs.maxTime < 60 && (time === null || time > prefs.maxTime)) return false;
  if (prefs.quick && (time === null || time > 25)) return false;
  if (prefs.noRice && effectiveIds.includes("rice")) return false;
  if (prefs.noFry && (!methods || ["xao", "rang", "ap chao", "chien"].some((method) => methods.includes(method)))) return false;
  if (prefs.noOven && (!methods || methods.includes("nuong") || methods.includes("oven"))) return false;
  if (prefs.noDefrost) {
    const recipeIds = recipe.ingredients.map((item) => replacements.get(recipeCanonicalId(item, index)) ?? recipeCanonicalId(item, index));
    const methodNeedsThaw = ["xao", "ap chao", "chien", "nuong"].includes(methods);
    const wouldNeedThaw = recipe.ingredients.some((item, position) => {
      if (item.optional) return false;
      const id = recipeIds[position];
      const category = categoryFor(id, index);
      const requiresThaw = item.requiresDefrost || index.byId.get(id)?.requiresDefrost || (methodNeedsThaw && ["Thịt", "Hải sản"].includes(category ?? ""));
      return requiresThaw && stock.some((stockItem, stockPosition) => stockItem.frozen && isMatch(id, stockIds[stockPosition], recipe.method, index));
    });
    if (wouldNeedThaw) return false;
  }
  const avoided = new Set(prefs.avoid.flatMap((value) => {
    const canonicalId = canonicalIngredientPreference(value, index);
    return index.byId.has(canonicalId) ? [...ingredientFamily(canonicalId, index)] : [canonicalId];
  }));
  if (effectiveIds.some((id) => avoided.has(id) || avoided.has(`custom:${normalizeVietnamese(id)}`))) return false;
  if ((prefs.vegan || prefs.vegetarian || prefs.avoidMeat || prefs.avoidSeafood) && categories.some((category) => !category)) return false;
  if (prefs.vegan && effectiveIds.some((id) => {
    const ingredient = index.byId.get(id);
    return ingredient?.vegan === false || ["Thịt", "Hải sản", "Trứng", "Sữa"].includes(ingredient?.category ?? "");
  })) return false;
  if (prefs.vegetarian && effectiveIds.some((id, position) =>
    categories[position] === "Thịt" || categories[position] === "Hải sản" || index.byId.get(id)?.containsMeat || index.byId.get(id)?.containsSeafood,
  )) return false;
  if (prefs.avoidMeat && effectiveIds.some((id, position) => categories[position] === "Thịt" || index.byId.get(id)?.containsMeat)) return false;
  if (prefs.avoidSeafood && effectiveIds.some((id, position) => categories[position] === "Hải sản" || index.byId.get(id)?.containsSeafood)) return false;
  return true;
}

function classifyQuantities(recipe: EngineRecipe, stock: StockItem[], stockIds: string[], recipeIds: string[], neededServings: number | undefined, index: ReturnType<typeof buildIngredientIndex>) {
  const quantityShortages: RecipeRecommendation["quantityShortages"] = [];
  let allComparable = recipe.ingredients.filter((item) => !item.optional).length > 0;
  const quantityById = new Map<string, StockItem[]>();
  for (let position = 0; position < stock.length; position++) {
    for (let recipePosition = 0; recipePosition < recipe.ingredients.length; recipePosition++) {
      if (!recipe.ingredients[recipePosition].optional && isMatch(recipeIds[recipePosition], stockIds[position], recipe.method, index)) {
        const list = quantityById.get(recipeIds[recipePosition]) ?? [];
        list.push(stock[position]); quantityById.set(recipeIds[recipePosition], list);
      }
    }
  }
  recipe.ingredients.forEach((item, position) => {
    if (item.optional) return;
    const needed = validQuantity(item.quantity);
    const recipeUnit = normalizedUnit(item.unit);
    const recipeUnitInfo = dimensions[recipeUnit];
    const candidates = (quantityById.get(recipeIds[position]) ?? []).map((stockItem) => ({
      quantity: validQuantity(stockItem.quantity), unit: normalizedUnit(stockItem.unit ?? ""),
    })).filter((candidate) => candidate.quantity !== null && !!dimensions[candidate.unit]);
    if (needed === null || !recipeUnitInfo || !candidates.length) { allComparable = false; return; }
    const compatible = candidates.filter((candidate) => dimensions[candidate.unit].dimension === recipeUnitInfo.dimension);
    if (!compatible.length) { allComparable = false; return; }
    const available = compatible.reduce((sum, candidate) => sum + candidate.quantity! * dimensions[candidate.unit].factor, 0) / recipeUnitInfo.factor;
    const scaledNeeded = needed * (recipe.servings && neededServings ? neededServings / recipe.servings : 1);
    if (available + 1e-9 < scaledNeeded) quantityShortages.push({ ingredientId: item.ingredientId, needed: scaledNeeded, available, unit: item.unit });
  });
  return { quantityShortages, quantitiesComparable: allComparable };
}

function makeReasons(recipe: EngineRecipe, matched: string[], missing: string[], quantity: ReturnType<typeof classifyQuantities>, urgencyNames: string[], labels: Map<string, string>) {
  const reasons: string[] = [];
  if (matched.length) reasons.push(`Bạn đang có ${matched.map((id) => labels.get(id) ?? id).join(", ")}.`);
  if (missing.length) reasons.push(`Còn thiếu ${missing.map((id) => labels.get(id) ?? id).join(", ")}.`);
  else if (matched.length) reasons.push("Đã có đủ loại nguyên liệu bắt buộc theo danh sách công thức.");
  if (quantity.quantityShortages.length) reasons.push("Có nguyên liệu hiện có chưa đủ định lượng theo công thức.");
  else if (!quantity.quantitiesComparable) reasons.push("Chưa thể xác nhận đủ số lượng vì thiếu định lượng tương thích trong dữ liệu.");
  if (urgencyNames.length) reasons.push(`Ưu tiên dùng sớm: ${urgencyNames.join(", ")}.`);
  if (recipe.dataStatus === "ingredients_only") reasons.push("Nguồn chỉ có danh sách nguyên liệu, chưa có cách nấu.");
  if (recipe.dataStatus === "catalog_only") reasons.push("Nguồn chỉ có tên món, chưa có danh sách nguyên liệu hoặc hướng dẫn.");
  if (!reasons.length) reasons.push("Chưa có nguyên liệu khớp trong tủ lạnh; có thể xem món trong thư viện.");
  return reasons;
}

export function recommendRecipes(input: RecommendationInput): RecipeRecommendation[] {
  const now = input.now ?? new Date();
  const index = buildIngredientIndex(input.ingredients);
  const activeStock = input.stock.filter((item) => !isExpired(item, now));
  const stockIds = activeStock.map((item) => stockCanonicalId(item, index));
  const urgencyIds = new Set<string>();
  activeStock.forEach((item, position) => {
    if (item.fresh === "soon" || item.fresh === "urgent") urgencyIds.add(stockIds[position]);
    if (item.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(item.expiresAt)) {
      const until = new Date(`${item.expiresAt}T23:59:59`).getTime() - now.getTime();
      if (until >= 0 && until <= 3 * 86400000) urgencyIds.add(stockIds[position]);
    }
  });
  const labels = new Map(input.ingredients.map((ingredient) => [ingredient.id, ingredient.name]));
  activeStock.forEach((item, position) => {
    if (!labels.has(stockIds[position])) labels.set(stockIds[position], item.name ?? (item.id.startsWith("custom-") ? item.id.slice(7).replace(/-/g, " ") : item.id));
  });
  for (const recipe of input.recipes) for (const item of recipe.ingredients) {
    const id = recipeCanonicalId(item, index);
    if (!labels.has(id)) labels.set(id, item.sourceName ?? item.ingredientId);
  }
  const ranked = input.recipes.flatMap((recipe) => {
    const recipeIds = recipe.ingredients.map((item) => recipeCanonicalId(item, index));
    const requiredPositions = recipe.ingredients.map((item, position) => !item.optional ? position : -1).filter((position) => position >= 0);
    const fullInstructions = recipe.dataStatus === "full_recipe" && (recipe.steps?.length ?? 0) > 0;
    const usableIngredients = recipe.dataStatus !== "catalog_only" && recipe.ingredients.length > 0;
    const matchedPositions = usableIngredients ? requiredPositions.filter((position) => stockIds.some((stockId) => isMatch(recipeIds[position], stockId, recipe.method, index))) : [];
    const missingPositions = usableIngredients ? requiredPositions.filter((position) => !matchedPositions.includes(position)) : [];
    const matchedIngredients = [...new Set(matchedPositions.map((position) => recipeIds[position]))];
    const actualMatchedIds = [...new Set(matchedPositions.flatMap((position) => stockIds.filter((stockId) => isMatch(recipeIds[position], stockId, recipe.method, index))))];
    const missingIngredients = [...new Set(missingPositions.map((position) => recipeIds[position]))];
    const requiredRecipeIds = [...new Set(requiredPositions.map((position) => recipeIds[position]))];
    const substitutions = input.preferences.allowSubstitutions
      ? getRecipeSubstitutions(recipe, activeStock, input.preferences, index, now)
      : [];
    const availableByOriginal = new Map<string, string>();
    for (const suggestion of substitutions) if (suggestion.availability === "in_fridge" && !availableByOriginal.has(suggestion.originalIngredientId)) {
      availableByOriginal.set(suggestion.originalIngredientId, suggestion.substituteIngredientId);
    }
    if (usableIngredients && !isAllowed(recipe, input.preferences, requiredRecipeIds, activeStock, stockIds, index, availableByOriginal)) return [];
    const totalImportance = requiredPositions.reduce((sum, position) => sum + ingredientWeight(recipe.ingredients[position], recipeIds[position], index), 0);
    const matchedImportance = matchedPositions.reduce((sum, position) => sum + ingredientWeight(recipe.ingredients[position], recipeIds[position], index), 0);
    const completeness = totalImportance ? matchedImportance / totalImportance : 0;
    const matchPercentage = Math.round(completeness * 100);
    const urgencyNames = actualMatchedIds.filter((id) => urgencyIds.has(id)).map((id) => labels.get(id) ?? id);
    const quantity = classifyQuantities(recipe, activeStock, stockIds, recipeIds, input.preferences.servings, index);
    const coveragePoints = completeness * 68;
    const dataPoints = fullInstructions ? 10 : recipe.dataStatus === "ingredients_only" ? 2 : 0;
    const quantityPoints = quantity.quantitiesComparable ? 8 : 0;
    const urgencyPoints = urgencyNames.length ? Math.min(8, urgencyNames.length * 4) : 0;
    const time = recipe.minutes ?? recipe.totalTime ?? 0;
    const timePoints = time > 0 ? Math.max(0, 3 - time / 40) : 0;
    const difficultyPoints = recipe.difficulty === "Dễ" || recipe.difficulty === "easy" ? 2 : 0;
    const missingPenalty = Math.min(16, missingIngredients.length * 2);
    const preferencePoints = input.preferences.quick && time > 0 && time <= 25 ? 2 : 0;
    const quantityPenalty = Math.min(20, quantity.quantityShortages.length * 10);
    const score = Math.max(0, Math.min(100, Math.round(coveragePoints + dataPoints + quantityPoints + urgencyPoints + timePoints + difficultyPoints + preferencePoints - missingPenalty - quantityPenalty)));
    const canCookWithSubstitutions = missingIngredients.length > 0
      && missingIngredients.every((id) => availableByOriginal.has(id))
      && [...availableByOriginal.keys()].every((id) => missingIngredients.includes(id));
    const category: RecipeRecommendation["category"] = !fullInstructions || !usableIngredients
      ? "discover"
      : missingIngredients.length === 0 && quantity.quantityShortages.length === 0
        && urgencyNames.length > 0
        ? "use_soon"
        : missingIngredients.length === 0 && quantity.quantityShortages.length === 0
          ? "ready"
          : canCookWithSubstitutions && quantity.quantityShortages.length === 0
            ? "substitution"
            : urgencyNames.length > 0
              ? "use_soon"
              : (missingIngredients.length <= 2 && matchedIngredients.length > 0 && missingIngredients.length > 0)
                || (missingIngredients.length === 0 && quantity.quantityShortages.length <= 2 && matchedIngredients.length > 0)
                ? "almost"
                : "discover";
    const reasons = makeReasons(recipe, actualMatchedIds, missingIngredients, quantity, urgencyNames, labels);
    const quantityStatus: RecipeRecommendation["quantityStatus"] = quantity.quantityShortages.length ? "shortage" : quantity.quantitiesComparable ? "sufficient" : "unknown";
    if (category === "substitution") reasons.push("Có thể cân nhắc thay nguyên liệu còn thiếu bằng lựa chọn đang có trong tủ lạnh.");
    return [{ recipeId: recipe.id, score, matchedIngredients, missingIngredients, quantityShortages: quantity.quantityShortages, matchPercentage, category, urgent: urgencyNames.length > 0, substitutions, reasons, hasFullInstructions: fullInstructions, quantityStatus }];
  });
  const categoryOrder = { ready: 0, substitution: 1, use_soon: 2, almost: 3, discover: 4 };
  const nameById = new Map(input.recipes.map((recipe) => [recipe.id, recipe.name]));
  return ranked.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]
    || b.matchPercentage - a.matchPercentage
    || a.missingIngredients.length - b.missingIngredients.length
    || b.score - a.score
    || (nameById.get(a.recipeId) ?? "").localeCompare(nameById.get(b.recipeId) ?? "", "vi")
    || a.recipeId.localeCompare(b.recipeId));
}

export const defaultRecommendationPreferences: RecommendationPreferences = {
  avoid: [], vegan: false, vegetarian: false, avoidMeat: false, avoidSeafood: false,
  noRice: false, noFry: false, noOven: false, noDefrost: false, quick: false, maxTime: 60, allowSubstitutions: true,
};
