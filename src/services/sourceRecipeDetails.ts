import type { SourceRecipeDetail } from "./sourceRecipeCatalog.ts";
import { applySourceInstructionSupplement } from "./sourceInstructionSupplements.ts";

const shardCache = new Map<string, Promise<SourceRecipeDetail[]>>();

export function loadSourceRecipeDetail(item: { id: string; detail_shard: string; warnings?: string[] }, fetcher: typeof fetch = fetch): Promise<SourceRecipeDetail> {
  let shard = shardCache.get(item.detail_shard);
  if (!shard) {
    shard = fetcher(`/data/recipes/${item.detail_shard}.json`).then(async (response) => {
      if (!response.ok) throw new Error(`Tải dữ liệu công thức thất bại (${response.status})`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Dữ liệu công thức không đúng định dạng");
      return data as SourceRecipeDetail[];
    });
    shardCache.set(item.detail_shard, shard);
    shard.catch(() => shardCache.delete(item.detail_shard));
  }
  return shard.then((items) => {
    const detail = items.find((entry) => entry.id === item.id);
    if (!detail) throw new Error("Không tìm thấy chi tiết món trong dữ liệu nguồn");
    const supplemented = applySourceInstructionSupplement(detail);
    return { ...supplemented, warnings: [...new Set([...(supplemented.warnings ?? []), ...(item.warnings ?? [])])] };
  });
}

export function clearSourceRecipeDetailCache() { shardCache.clear(); }
