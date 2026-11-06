export function normalizeVietnamese(value: string): string {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

const normalizeVietnameseExact = (value: string) => value.toLocaleLowerCase("vi").normalize("NFC").trim();
const hasVietnameseMarks = (value: string) => /[\u0300-\u036f]/.test(value.normalize("NFD"));

export function matchesIngredient(
  query: string,
  name: string,
  aliases: string[],
): boolean {
  const needle = normalizeVietnamese(query);
  return !needle || [name, ...aliases].some((candidate) => normalizeVietnamese(candidate) === needle);
}

export type IngredientIndexEntry = {
  id: string;
  name: string;
  aliases: string[];
  parentId?: string;
  category?: string;
  vegan?: boolean;
  containsMeat?: boolean;
  containsSeafood?: boolean;
  requiresDefrost?: boolean;
};

export function buildIngredientIndex(entries: IngredientIndexEntry[]) {
  const names = new Map<string, string | null>();
  const exactNames = new Map<string, string | null>();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const entry of entries) {
    for (const candidate of [entry.id, entry.name, ...entry.aliases]) {
      const key = normalizeVietnamese(candidate);
      if (!key) continue;
      if (names.has(key) && names.get(key) !== entry.id) names.set(key, null);
      else names.set(key, entry.id);

      const exactKey = normalizeVietnameseExact(candidate);
      if (exactNames.has(exactKey) && exactNames.get(exactKey) !== entry.id) exactNames.set(exactKey, null);
      else exactNames.set(exactKey, entry.id);
    }
  }
  return { names, exactNames, byId };
}

export function resolveIngredientId(value: string, index: ReturnType<typeof buildIngredientIndex>): string | null {
  // Preserve accented distinctions (e.g. "me" vs "mè"). Unaccented input
  // falls back to the folded index and stays unresolved when the alias is ambiguous.
  if (hasVietnameseMarks(value)) return index.exactNames.get(normalizeVietnameseExact(value)) ?? null;
  return index.names.get(normalizeVietnamese(value)) ?? null;
}

/** Resolve a stored preference value, including locally-created ingredient IDs. */
export function canonicalIngredientPreference(value: string, index: ReturnType<typeof buildIngredientIndex>): string {
  if (index.byId.has(value)) return value;
  const resolved = resolveIngredientId(value, index);
  if (resolved) return resolved;
  const customName = value.startsWith("custom-") ? value.slice(7).replace(/-/g, " ") : value;
  return `custom:${normalizeVietnamese(customName)}`;
}
