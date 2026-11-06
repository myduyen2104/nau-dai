import test from "node:test";
import assert from "node:assert/strict";
import { parseSupportedVideoUrl } from "../src/utils/trending.ts";
import { migrateLocalStorage } from "../src/utils/storageMigration.ts";

test("chỉ chấp nhận URL HTTP(S) từ host video đã hỗ trợ", () => {
  assert.equal(parseSupportedVideoUrl("javascript:alert(1)"), null);
  assert.equal(parseSupportedVideoUrl("https://attacker.example/video"), null);
  assert.equal(parseSupportedVideoUrl("https://www.youtube.com/"), null);
  assert.equal(parseSupportedVideoUrl("https://youtu.be/abc")?.platform, "youtube");
  assert.equal(parseSupportedVideoUrl("https://www.tiktok.com/@chef/video/123")?.platform, "tiktok");
});

test("migration giữ nguyên dữ liệu legacy và ghi version", () => {
  const entries = new Map([["fridge-stock", "[{\"id\":\"egg\"}]" ]]);
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  assert.equal(migrateLocalStorage(storage), true);
  assert.equal(entries.get("fridge-storage-version"), undefined);
  assert.equal(entries.get("fresh-storage-version"), "1");
  assert.equal(entries.get("fridge-stock"), "[{\"id\":\"egg\"}]");
});
