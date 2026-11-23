import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { refreshYoutubeCatalog, classifyCookingVideo, selectYoutubeIdsForRefresh, videoDurationSeconds } from "../scripts/lib/youtube-trends.mjs";
import { freshYoutubeCatalogVideos, inferYoutubeFeedInterests, rankYoutubeFeed, type YouTubeCatalogVideo, type VideoWatchRecord } from "../src/services/youtubeFeed.ts";

const now = new Date("2026-11-16T00:00:00.000Z");
function video(videoId: string, overrides: Partial<YouTubeCatalogVideo> = {}): YouTubeCatalogVideo {
  return {
    videoId,
    id: videoId,
    platform: "youtube",
    title: `Cách nấu món ${videoId}`,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    creatorName: `Kênh ${videoId}`,
    publishedAt: "2026-11-01T00:00:00Z",
    categoryTags: ["món Việt"],
    language: "vi",
    discoveredAt: now.toISOString(),
    lastValidatedAt: now.toISOString(),
    fetchedAt: now.toISOString(),
    moderationStatus: "accepted",
    availabilityStatus: "available",
    ...overrides,
  };
}

test("metadata classifier rejects reviews and keeps metadata-only cases in review", () => {
  assert.equal(classifyCookingVideo({ title: "Review quán ăn: Cách nấu bún bò" }).status, "rejected");
  assert.equal(classifyCookingVideo({ title: "Cách nấu bún bò", description: "Cách nấu từng bước, sơ chế và nêm nếm." }).status, "accepted");
  assert.equal(classifyCookingVideo({ title: "Cách nấu bún bò", description: "Món ngon cuối tuần." }).status, "needs_review");
});

test("refresh catalog deduplicates by video ID, validates embeddability, and updates all retained metadata", () => {
  const previous = { videos: [{ videoId: "old", discoveredAt: "2026-10-01T00:00:00Z", categoryTags: ["món nước"] }] };
  const details = [
    { id: "old", snippet: { title: "Cách nấu bún bò", description: "Cách nấu từng bước", channelTitle: "Bếp A", channelId: "a", publishedAt: "2026-10-01T00:00:00Z" }, status: { privacyStatus: "public", embeddable: true }, contentDetails: { duration: "PT1H2M3S" } },
    { id: "old", snippet: { title: "Cách nấu bún bò", description: "Cách nấu từng bước", channelTitle: "Bếp A", channelId: "a", publishedAt: "2026-10-01T00:00:00Z" }, status: { privacyStatus: "public", embeddable: true }, contentDetails: { duration: "PT1H2M3S" } },
    { id: "blocked", snippet: { title: "Cách làm bánh", description: "Cách làm tại nhà" }, status: { privacyStatus: "public", embeddable: false }, contentDetails: { duration: "PT10M" } },
    { id: "review", snippet: { title: "Review quán ăn cách nấu", description: "" }, status: { privacyStatus: "public", embeddable: true }, contentDetails: { duration: "PT5M" } },
  ];
  const result = refreshYoutubeCatalog(previous, details, new Map([["old", ["món nước"]]]), now, 800);
  assert.equal(result.catalog.videos.length, 1);
  assert.equal(result.catalog.videos[0].videoId, "old");
  assert.equal(result.catalog.videos[0].discoveredAt, "2026-10-01T00:00:00Z");
  assert.equal(result.catalog.videos[0].lastValidatedAt, now.toISOString());
  assert.equal(result.catalog.videos[0].durationSeconds, 3723);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.unavailableCount, 1);
});

test("daily YouTube refresh replaces yesterday's set with up to 200 new IDs and repeat runs retain today's set", () => {
  const yesterday = new Set(["old-1", "old-2"]);
  const searchResults = ["old-1", "new-1", "new-2", "new-1"];
  assert.deepEqual(selectYoutubeIdsForRefresh(yesterday, searchResults, false), ["new-1", "new-2"]);
  assert.deepEqual(selectYoutubeIdsForRefresh(yesterday, searchResults, true), ["old-1", "old-2"]);

  const candidates = Array.from({ length: 205 }, (_, index) => ({
    id: `new-${index}`,
    snippet: { title: `Cách nấu món ${index}`, description: "Cách nấu từng bước", publishedAt: now.toISOString() },
    status: { privacyStatus: "public", embeddable: true },
    contentDetails: { duration: "PT5M" },
  }));
  const snapshot = refreshYoutubeCatalog({ videos: [{ videoId: "yesterday" }] }, candidates, new Map(), now, 200);
  assert.equal(snapshot.catalog.videos.length, 200);
  assert.ok(snapshot.catalog.videos.every((item) => item.videoId !== "yesterday"));
});

test("duration parser handles common YouTube ISO durations", () => {
  assert.equal(videoDurationSeconds("PT15M33S"), 933);
  assert.equal(videoDurationSeconds("PT1H2M3S"), 3723);
  assert.equal(videoDurationSeconds("P1DT2H"), 93600);
  assert.equal(videoDurationSeconds("invalid"), 0);
});

test("feed sessions are stable within a seed, different across seeds, unique, and favor unseen clips", () => {
  const videos = Array.from({ length: 30 }, (_, index) => video(`v${index}`, { creatorName: `Kênh ${index % 5}` }));
  const history: VideoWatchRecord[] = [{ videoId: "v0", startedAt: now.toISOString(), watchedSeconds: 60 }];
  const first = rankYoutubeFeed(videos, history, 101, ["món Việt"], now.valueOf());
  const repeat = rankYoutubeFeed(videos, history, 101, ["món Việt"], now.valueOf());
  const nextSession = rankYoutubeFeed(videos, history, 202, ["món Việt"], now.valueOf());
  assert.deepEqual(first.map((item) => item.videoId), repeat.map((item) => item.videoId));
  assert.notDeepEqual(first.map((item) => item.videoId), nextSession.map((item) => item.videoId));
  assert.equal(new Set(first.map((item) => item.videoId)).size, videos.length);
  assert.ok(first.findIndex((item) => item.videoId === "v0") > 0);
});

test("feed puts every previously started video after clips the user has not watched", () => {
  const videos = Array.from({ length: 12 }, (_, index) => video(`resume-${index}`, { creatorName: `Kênh ${index}` }));
  const history: VideoWatchRecord[] = videos.slice(0, 4).map((item, index) => ({
    videoId: item.videoId,
    startedAt: new Date(now.valueOf() + index * 1000).toISOString(),
    watchedSeconds: 1,
  }));
  const ranked = rankYoutubeFeed(videos, history, 404, [], now.valueOf());
  assert.deepEqual(ranked.slice(0, 8).map((item) => item.videoId).sort(), videos.slice(4).map((item) => item.videoId).sort());
  assert.deepEqual(ranked.slice(8).map((item) => item.videoId).sort(), videos.slice(0, 4).map((item) => item.videoId).sort());
});

test("catalog ignores unavailable, rejected, and metadata older than 30 days", () => {
  const valid = video("valid");
  const stale = video("stale", { lastValidatedAt: "2026-10-01T00:00:00Z" });
  const hidden = video("hidden", { availabilityStatus: "non_embeddable" });
  const rejected = video("rejected", { moderationStatus: "rejected" });
  assert.deepEqual(freshYoutubeCatalogVideos([valid, stale, hidden, rejected], now.valueOf()).map((item) => item.videoId), ["valid"]);
});

test("feed interests come from videos actually started or saved, not just rendered", () => {
  const videos = [video("vegetarian", { categoryTags: ["món chay"] }), video("dessert", { categoryTags: ["tráng miệng"] })];
  const started = inferYoutubeFeedInterests(videos, [{ videoId: "vegetarian", startedAt: now.toISOString(), watchedSeconds: 0 }]);
  const renderedOnly = inferYoutubeFeedInterests(videos, [{ videoId: "dessert", firstSeenAt: now.toISOString(), watchedSeconds: 0 }]);
  const saved = inferYoutubeFeedInterests(videos, [], [videos[1].videoUrl]);
  assert.deepEqual(started, ["món chay"]);
  assert.deepEqual(renderedOnly, []);
  assert.deepEqual(saved, ["tráng miệng"]);
});

test("YouTube API metadata stays out of service worker cache and has no-store deployment headers", async () => {
  const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(serviceWorker, /\/data\/youtube\/catalog\.json[\s\S]*?fetch\(event\.request, \{ cache: "no-store" \}\)/);
  assert.ok(vercel.headers.some((item: { source: string; headers: { key: string; value: string }[] }) => item.source === "/data/youtube/catalog.json" && item.headers.some((header) => header.key === "Cache-Control" && header.value.includes("no-store"))));
});
