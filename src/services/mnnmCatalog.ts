export type MnnmCatalogItem = {
  id: string;
  name: string;
  description: string;
  source_url: string;
  published_at?: string | null;
  updated_at?: string | null;
  broadcast_date?: string | null;
  image_url: string | null;
  image_fallbacks: string[];
  category: string;
  tags: string[];
  ingredient_names: string[];
  ingredient_count: number;
  has_ingredients: boolean;
  has_instructions: boolean;
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;
  servings: string | null;
  warnings: string[];
  tips?: string[];
  detail_shard: string;
};

export type MnnmRecipeDetail = {
  id: string;
  ingredients: { name: string; quantity_raw: string | null; raw: string | null; kind: string }[];
  instruction_sections: { name: string; text: string; steps: string[] }[];
  tips?: string[];
  warnings: string[];
};

export function normalizeMnnmInstructionSteps(sections: MnnmRecipeDetail["instruction_sections"]): { sectionName: string; instruction: string }[] {
  return sections.flatMap((section) => {
    const instructions = section.steps.length ? section.steps : section.text.trim() ? [section.text.trim()] : [];
    const normalized: string[] = [];
    for (let index = 0; index < instructions.length; index += 1) {
      const instruction = instructions[index].trim();
      if (/^yêu cầu thành phẩm\s*:\s*$/iu.test(instruction)) {
        const outcomes: string[] = [];
        while (index + 1 < instructions.length && /^(?:trạng thái|màu sắc|hương vị)\s*:/iu.test(instructions[index + 1].trim())) {
          outcomes.push(instructions[index + 1].trim());
          index += 1;
        }
        if (outcomes.length) {
          normalized.push(`${instruction} ${outcomes.join(" ")}`);
          continue;
        }
      }
      normalized.push(instruction);
    }
    return normalized.map((instruction) => ({ sectionName: section.name, instruction }));
  });
}

type MnnmShard = MnnmRecipeDetail[];
const shardCache = new Map<string, Promise<MnnmShard>>();

export function loadMnnmRecipeDetail(item: MnnmCatalogItem, fetcher: typeof fetch = fetch): Promise<MnnmRecipeDetail> {
  let request = shardCache.get(item.detail_shard);
  if (!request) {
    request = fetcher(item.detail_shard)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load MNMN recipe details");
        return response.json() as Promise<MnnmShard>;
      })
      .catch((error) => {
        shardCache.delete(item.detail_shard);
        throw error;
      });
    shardCache.set(item.detail_shard, request);
  }
  return request.then((recipes) => {
    const detail = recipes.find((recipe) => recipe.id === item.id);
    if (!detail) throw new Error("MNMN recipe is missing from its detail shard");
    return detail;
  });
}

export function durationMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
  if (!match) return null;
  const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) + Number(match[3] ?? 0) / 60;
  return minutes > 0 ? Math.round(minutes) : null;
}
