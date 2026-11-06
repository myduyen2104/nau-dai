export const CURRENT_STORAGE_VERSION = 1;

export function migrateLocalStorage(storage: Pick<Storage, "getItem" | "setItem">) {
  const version = Number(storage.getItem("fresh-storage-version") || 0);
  if (!Number.isFinite(version) || version > CURRENT_STORAGE_VERSION) return false;
  if (version < 1) {
    // Version 1 preserves the existing legacy keys and their values as-is.
    storage.setItem("fresh-storage-version", "1");
  }
  return true;
}
