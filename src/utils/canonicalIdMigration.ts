/** Remap retired recipe IDs while preserving order and collapsing duplicate favorites/history entries. */
export function migrateCanonicalIdList(ids: string[], aliases: ReadonlyMap<string, string>): string[] {
  const migrated: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const next = aliases.get(id) ?? id;
    if (seen.has(next)) continue;
    seen.add(next);
    migrated.push(next);
  }
  return migrated;
}
