export type SourceRecipeCatalogItem = {
  id: string;
  canonical_recipe_id?: string;
  name: string;
  source_url: string | null;
  category: string | null;
  age_group: string | null;
  ingredients: string[] | null;
  quality_status: "complete" | "needs_review" | "missing_at_source" | "unmatched";
  warnings?: string[];
  has_instructions: boolean;
  has_ingredients: boolean;
  detail_shard: string;
  category_labels?: string[];
  available_age_groups?: string[];
  variant_count?: number;
  source_record_count?: number;
  ingredient_list_conflict?: boolean;
  variants?: { id: string; ageGroup: string | null; portion: string | null; qualityStatus: string; detailShard: string }[];
  legacy_canonical_ids?: string[];
  serving_options?: {
    sourceRecipeId: string;
    detailShard: string;
    sourceRecipeIds: string[];
    weightGrams: number | null;
    servingUnit: string | null;
    size: "small" | "medium" | "large" | null;
    servingRaw: string | null;
    sourceTitle: string;
    nutrition: Record<string, number | null> | null;
    nutritionConflict: boolean;
    sourceRecipeConflict: boolean;
    ageGroups: string[];
    ageScopeIncomplete: boolean;
    label: string;
  }[];
  serving_search_terms?: string[];
};

export type SourceFridgeIndexItem = Omit<SourceRecipeCatalogItem, "ingredients"> & {
  ingredients: { name: string; quantity_raw: string | null; quantity_value: number | null; quantity_unit: string | null }[];
};

export function sourceFridgeIndexToCatalogItem(item: SourceFridgeIndexItem): SourceRecipeCatalogItem {
  return { ...item, ingredients: item.ingredients.map((ingredient) => ingredient.name) };
}

export function sourceFridgeIndexToEngineRecipe(item: SourceFridgeIndexItem) {
  const hasSourceMethod = item.has_instructions;
  return {
    id: `dinhduong2598:${item.canonical_recipe_id ?? item.id}`,
    name: item.name,
    ingredients: item.ingredients.map((ingredient) => ({
      ingredientId: ingredient.name,
      sourceName: ingredient.name,
      quantity: ingredient.quantity_value,
      unit: ingredient.quantity_unit ?? "",
      optional: false,
    })),
    method: "",
    steps: [],
    hasFullInstructions: hasSourceMethod,
    dataStatus: hasSourceMethod ? "full_recipe" as const : "ingredients_only" as const,
    servings: null,
    source: { title: "Dinh dưỡng 2598", url: item.source_url ?? undefined },
  };
}

/** Split only explicit source structure (blank lines or numbered steps). */
export function sourceInstructionParagraphs(raw: string): string[] {
  const normalized = raw.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;
  const lines = normalized.split("\n").map((part) => part.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  const numbered = normalized.split(/(?=(?:^|\s)(?:-\s*)?(?:Bước\s+\d+\s*[:.)-]|\d+[.)]\s+))/i).map((part) => part.trim().replace(/^-\s*/, "")).filter(Boolean);
  if (numbered.length > 1 && numbered.every((part) => /^(?:Bước\s+\d+|\d+[.)])/i.test(part))) return numbered;
  const bullets = normalized.split(/(?=\s+(?:[*•]\s+|[-–]\s*(?:Bước\s+\d+)))/i).map((part) => part.trim().replace(/^[*•]\s*/, "")).filter(Boolean);
  if (bullets.length > 1) return bullets;
  // A paragraph can still contain real, ordered actions. Full sentence
  // boundaries are safe to expose as steps because the original text remains
  // stored verbatim in `instructions_raw`.
  const sentences = normalized.split(/(?<=[.!?])\s+(?=[\p{Lu}0-9"“*•])/u).map((part) => part.trim()).filter(Boolean);
  if (sentences.length > 1) return sentences;
  // Only split a comma/semicolon when the next clause starts with a cooking
  // action. Ingredient lists and descriptive commas therefore remain intact.
  const actions = ["sơ chế", "làm sạch", "rửa", "gọt", "cắt", "thái", "băm", "đập", "ngâm", "vắt", "phi", "ướp", "xào", "chiên", "rán", "rang", "nướng", "hấp", "luộc", "trộn", "khuấy", "đun", "nấu", "kho", "rim", "cho", "thêm", "đổ", "nêm", "vớt", "bắc", "xếp", "chan", "rưới", "cuốn", "cuộn", "thưởng thức", "ăn kèm", "bày"];
  const actionPattern = actions.map((action) => action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const actionClauses = normalized.split(new RegExp(`[;,]\\s*(?=(?:${actionPattern})(?:\\s|$))`, "iu")).map((part) => part.trim()).filter(Boolean);
  return actionClauses.length > 1 ? actionClauses : [normalized];
}

export type SourceRecipeDetail = {
  id: string;
  name: string;
  detail_name: string | null;
  category: string | null;
  age_group: string | null;
  serving: { raw: string | null; quantity_value: number | null; quantity_unit: string | null; portion_label: string | null } | null;
  ingredients: { name: string; quantity_raw: string | null; quantity_value: number | null; quantity_unit: string | null; instruction_added?: boolean; instruction_usage_status?: "mentioned" | "not_mentioned" | "optional" }[] | null;
  source_ingredients?: { name: string; quantity_raw: string | null; quantity_value: number | null; quantity_unit: string | null }[] | null;
  instruction_added_ingredients?: { name: string; quantity_raw: null; quantity_value: null; quantity_unit: null; usage_status: "mentioned" | "not_mentioned" | "optional"; role: "seasoning" | "aromatic_or_garnish" | "cooking_liquid" | "core_or_variant" }[];
  instructions_raw: string | null;
  nutrition: Record<string, number | null> | null;
  source_url: string | null;
  quality_status: "complete" | "needs_review" | "missing_at_source" | "unmatched";
  warnings: string[];
  integrity_findings: string[];
  source_categories: { id: string; label: string }[];
  source_age_group: { id: string; label: string } | null;
  source_tag_evidence_status: string;
  instruction_authorship?: "independently_authored";
  instruction_review_status?: "needs_review";
  instruction_reference_url?: string;
  instruction_reference_title?: string;
};

export type SourceCatalogFilters = {
  query?: string;
  category?: string;
  ageGroup?: string;
  pantryIngredients?: string[];
  pantryMode?: "any" | "all";
  recipeReadyOnly?: boolean;
};

const aliases: Record<string, string[]> = {
  "thit heo": ["thit lon", "thit nac", "thit ba chi", "thit heo nac"],
  "thit bo": ["bo", "thit bo nac"],
  "thit ga": ["ga", "thit uc ga"],
  "tom": ["tom bien", "tom su"],
  "ngao": ["ngheu", "ngao bien trang", "thit ngao"],
  "gia do": ["gia", "gia dau xanh"],
  "hanh la": ["hanh hoa"],
  "rau xa lach": ["xa lach", "rau sa lach"],
  "dau an": ["dau thuc vat"],
  "duong": ["duong cat", "duong kinh"],
  "bot nem": ["hat nem", "hat nem knorr"],
};

function ingredientTerms(value: string): string[] {
  const normalized = normalizeCatalogText(value);
  const terms = new Set([normalized]);
  for (const [canonical, variants] of Object.entries(aliases)) {
    if (normalized === canonical || variants.includes(normalized)) {
      terms.add(canonical);
      for (const variant of variants) terms.add(variant);
    }
  }
  return [...terms].filter(Boolean);
}

function ingredientsMatch(a: string, b: string): boolean {
  const left = ingredientTerms(a);
  const right = ingredientTerms(b);
  const padded = (value: string) => ` ${value} `;
  return left.some((leftTerm) => right.some((rightTerm) => leftTerm === rightTerm || padded(leftTerm).includes(padded(rightTerm)) || padded(rightTerm).includes(padded(leftTerm))));
}

export const normalizeCatalogText = (value: string) => value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();

/** Rank exact/title matches above incidental matches in ingredients or metadata. */
export function recipeSearchRelevance(name: string, query: string): number {
  const normalizedName = normalizeCatalogText(name);
  const normalizedQuery = normalizeCatalogText(query);
  if (!normalizedQuery) return 0;
  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.includes(normalizedQuery)) return 1;
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (terms.length && terms.every((term) => normalizedName.includes(term))) return 2;
  return 3;
}

export type CanonicalRecipeCandidate<T> = {
  primary: T;
  variants: T[];
};

/** Group same-title cards; exact same-source ingredient copies collapse, source/ingredient variants remain available in detail. */
export function groupCanonicalRecipeCandidates<T>(
  items: T[],
  getName: (item: T) => string,
  getIngredients: (item: T) => string[],
  getSource: (item: T) => string,
): CanonicalRecipeCandidate<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = normalizeCatalogText(getName(item));
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map((entries) => {
    const primary = entries[0];
    const seen = new Set<string>([`${getSource(primary)}|${ingredientSignature(getIngredients(primary))}`]);
    const variants: T[] = [];
    for (const entry of entries.slice(1)) {
      const signature = `${getSource(entry)}|${ingredientSignature(getIngredients(entry))}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      variants.push(entry);
    }
    return { primary, variants };
  });
}

function ingredientSignature(names: string[]): string {
  return [...new Set(names.map(normalizeCatalogText).filter(Boolean))].sort().join("|");
}

/** Match source catalog recipes by query and cooking constraints. */
export function filterSourceRecipeCatalog(items: SourceRecipeCatalogItem[], filters: SourceCatalogFilters): SourceRecipeCatalogItem[] {
  const query = normalizeCatalogText(filters.query ?? "");
  const queryTerms = query.split(/\s+/).filter(Boolean);
  const pantry = (filters.pantryIngredients ?? []).map(normalizeCatalogText).filter(Boolean);
  return items.filter((item) => {
    if (filters.category && !(item.category_labels ?? [item.category]).includes(filters.category)) return false;
    if (filters.ageGroup && !(item.available_age_groups ?? [item.age_group]).includes(filters.ageGroup)) return false;
    if (query) {
      const searchable = normalizeCatalogText(`${item.name} ${(item.ingredients ?? []).join(" ")} ${(item.serving_search_terms ?? []).join(" ")}`);
      if (!searchable.includes(query) && !queryTerms.every((term) => searchable.includes(term))) return false;
    }
    if (filters.recipeReadyOnly && (!item.has_instructions || !item.has_ingredients || item.quality_status === "unmatched")) return false;
    if (pantry.length) {
      if (!item.ingredients?.length) return false;
      if (filters.recipeReadyOnly && !item.has_instructions) return false;
      const ingredientNames = item.ingredients;
      const matches = pantry.map((stockName) => ingredientNames.some((ingredient) => ingredientsMatch(ingredient, stockName)));
      if (filters.pantryMode === "all" ? !matches.every(Boolean) : !matches.some(Boolean)) return false;
    }
    return true;
  });
}

export function sourceRecipeMissingIngredients(item: SourceRecipeCatalogItem, pantryIngredients: string[]): string[] | null {
  if (!item.ingredients?.length) return null;
  return item.ingredients.filter((ingredient) => !pantryIngredients.some((stock) => ingredientsMatch(ingredient, stock)));
}

export function sourceRecipeWarnings(detail: SourceRecipeDetail): string[] {
  const warnings = [...detail.warnings];
  if (detail.quality_status === "needs_review" && !warnings.length) warnings.push("needs_review");
  if (detail.quality_status === "unmatched") warnings.push("unmatched_catalog_mapping");
  return [...new Set(warnings)];
}

export function sourceRecipeCompleteness(detail: SourceRecipeDetail): "cookable" | "recipe_with_warnings" | "method_only" | "ingredients_only" | "no_recipe_content" {
  const hasMethod = !!detail.instructions_raw?.trim();
  const hasIngredients = !!detail.ingredients?.length;
  if (hasMethod && hasIngredients) {
    const hasReviewFlags = detail.quality_status !== "complete"
      || sourceRecipeWarnings(detail).length > 0
      || detail.integrity_findings.length > 0
      || detail.instruction_review_status === "needs_review";
    return hasReviewFlags ? "recipe_with_warnings" : "cookable";
  }
  if (hasMethod) return "method_only";
  if (hasIngredients) return "ingredients_only";
  return "no_recipe_content";
}

export function sourceRecipeEligibleForFridge(detail: Pick<SourceRecipeDetail, "instructions_raw" | "ingredients" | "quality_status">): boolean {
  return !!detail.instructions_raw?.trim() && !!detail.ingredients?.length && detail.quality_status === "complete";
}
