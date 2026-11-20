import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCookingVideo, refreshYoutubeCatalog } from "./lib/youtube-trends.mjs";

const output = new URL("../public/data/youtube/catalog.json", import.meta.url);
const apiKey = process.env.YOUTUBE_API_KEY;
const MAX_SEARCH_CALLS = 24;
const MAX_RESULTS_PER_SEARCH = 25;
const CATALOG_LIMIT = 800;
const SEARCH_DAILY_LIMIT = 100;
const newRecipeQueries = [
  { query: '"cách nấu" món Việt', tags: ["món Việt", "món chính"] },
  { query: '"cách làm" món ngon Việt Nam', tags: ["món Việt", "món chính"] },
  { query: '"hướng dẫn nấu ăn" món Việt', tags: ["hướng dẫn"] },
  { query: '"công thức nấu ăn" món Việt', tags: ["công thức"] },
];
const evergreenQueries = [
  { query: 'cơm gia đình cách nấu món ngon', tags: ["cơm gia đình"] },
  { query: 'món ăn nhanh 15 phút cách làm', tags: ["món nhanh"] },
  { query: 'món chay hướng dẫn nấu ăn Việt Nam', tags: ["món chay"] },
  { query: 'món ăn tiết kiệm dễ làm cho gia đình', tags: ["tiết kiệm"] },
  { query: 'cách nấu bữa sáng món Việt', tags: ["bữa sáng"] },
  { query: 'cách nấu bữa trưa món Việt', tags: ["bữa trưa"] },
  { query: 'cách nấu bữa tối gia đình Việt', tags: ["bữa tối"] },
  { query: 'công thức làm bánh Việt Nam tại nhà', tags: ["làm bánh"] },
  { query: 'cách làm món tráng miệng Việt Nam', tags: ["tráng miệng"] },
  { query: 'cách nấu món cá ngon tại nhà', tags: ["cá"] },
  { query: 'cách nấu món gà ngon tại nhà', tags: ["gà"] },
  { query: 'cách nấu món thịt heo ngon tại nhà', tags: ["thịt heo"] },
  { query: 'cách nấu món bò ngon tại nhà', tags: ["thịt bò"] },
  { query: 'cách nấu món tôm ngon tại nhà', tags: ["hải sản"] },
  { query: 'cách làm món rau củ ngon', tags: ["rau củ"] },
  { query: 'cách nấu món nước Việt Nam', tags: ["món nước"] },
  { query: 'cách làm món ăn bằng nồi chiên không dầu', tags: ["nồi chiên không dầu"] },
  { query: 'cách nấu món ngon bằng nồi cơm điện', tags: ["nồi cơm điện"] },
  { query: 'cách làm nước sốt món ăn', tags: ["nước sốt"] },
  { query: 'bí quyết nấu ăn ngon hướng dẫn', tags: ["mẹo nấu ăn"] },
  { query: 'vào bếp cách làm món ngon', tags: ["hướng dẫn"] },
  { query: 'recipe Vietnamese home cooking how to cook', tags: ["Vietnamese cooking"] },
  { query: 'cách làm món ăn miền Bắc miền Trung miền Nam', tags: ["món vùng miền"] },
  { query: 'cách nấu món ăn cho người mới bắt đầu', tags: ["cơ bản"] },
  { query: 'cách làm món ngon cuối tuần', tags: ["cuối tuần"] },
  { query: 'cách chế biến món ăn truyền thống Việt Nam', tags: ["món truyền thống"] },
  { query: 'cách làm món ăn ít dầu tốt cho gia đình', tags: ["ít dầu"] },
  { query: 'cách nấu lẩu Việt Nam tại nhà', tags: ["món lẩu"] },
];

if (!apiKey) {
  console.error("Thiếu YOUTUBE_API_KEY. Catalog hiện tại được giữ nguyên.");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let actualApiCalls = 0;
let searchCalls = 0;
let videoDetailsCalls = 0;
async function youtube(path, params, attempt = 0) {
  if (path === "search") {
    if (searchCalls >= MAX_SEARCH_CALLS) throw new Error(`Đã chạm ngân sách search.list ${MAX_SEARCH_CALLS} calls/run.`);
    searchCalls++;
  } else videoDetailsCalls++;
  actualApiCalls++;
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(key, String(value));
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (error) {
    if (attempt < 2) { await sleep(500 * (attempt + 1)); return youtube(path, params, attempt + 1); }
    throw error;
  }
  if (!response.ok) {
    if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
      await sleep(500 * (attempt + 1));
      return youtube(path, params, attempt + 1);
    }
    const detail = await response.text();
    throw new Error(`YouTube API ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
}

function dayIndexUtc(date = new Date()) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

function rotatingQueries(date = new Date()) {
  const start = (dayIndexUtc(date) * 2) % evergreenQueries.length;
  const selected = Array.from({ length: 16 }, (_, offset) => evergreenQueries[(start + offset) % evergreenQueries.length]);
  return [...newRecipeQueries.map((item) => ({ ...item, order: "date", extraPage: true })), ...selected.map((item) => ({ ...item, order: "relevance", extraPage: false }))];
}

try {
  let previousCatalog = { schemaVersion: 1, videos: [] };
  try {
    previousCatalog = JSON.parse(await readFile(output, "utf8"));
    if (!Array.isArray(previousCatalog.videos)) throw new Error("Catalog format is invalid.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const previousIds = new Set(previousCatalog.videos.map((video) => video.videoId ?? video.id).filter(Boolean));
  const todayUtc = new Date().toISOString().slice(0, 10);
  const priorSearchCallCount = previousCatalog.searchQuotaDate === todayUtc ? Number(previousCatalog.searchCallsToday ?? 0) : 0;
  const alreadySearchedToday = priorSearchCallCount > 0;
  const candidateIds = new Set();
  const tagsByVideoId = new Map();
  let duplicateSearchResults = 0;
  const addSearchPage = (page, tags) => {
    for (const item of page.items ?? []) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;
      if (candidateIds.has(videoId)) duplicateSearchResults++;
      candidateIds.add(videoId);
      const videoTags = tagsByVideoId.get(videoId) ?? new Set();
      for (const tag of tags) videoTags.add(tag);
      tagsByVideoId.set(videoId, videoTags);
    }
  };

  for (const item of alreadySearchedToday ? [] : rotatingQueries()) {
    const firstPage = await youtube("search", {
      part: "snippet", type: "video", order: item.order, maxResults: MAX_RESULTS_PER_SEARCH,
      relevanceLanguage: "vi", regionCode: "VN", q: item.query,
    });
    addSearchPage(firstPage, item.tags);
    if (item.extraPage && firstPage.nextPageToken && searchCalls < MAX_SEARCH_CALLS) {
      const secondPage = await youtube("search", {
        part: "snippet", type: "video", order: item.order, maxResults: MAX_RESULTS_PER_SEARCH,
        relevanceLanguage: "vi", regionCode: "VN", q: item.query, pageToken: firstPage.nextPageToken,
      });
      addSearchPage(secondPage, item.tags);
    }
  }

  const allIds = [...new Set([...previousIds, ...candidateIds])];
  if (!allIds.length) throw new Error("YouTube không trả về video ID nào; catalog cũ được giữ nguyên.");
  const apiVideos = [];
  for (let start = 0; start < allIds.length; start += 50) {
    const response = await youtube("videos", {
      part: "snippet,contentDetails,status", id: allIds.slice(start, start + 50).join(","),
    });
    apiVideos.push(...(response.items ?? []));
  }
  if (!apiVideos.length) throw new Error("YouTube trả về 0 video chi tiết; catalog cũ được giữ nguyên.");

  const tags = new Map([...tagsByVideoId].map(([id, value]) => [id, [...value]]));
  const result = refreshYoutubeCatalog(previousCatalog, apiVideos, tags, new Date(), CATALOG_LIMIT);
  result.catalog.searchQuotaDate = todayUtc;
  result.catalog.searchCallsToday = alreadySearchedToday ? priorSearchCallCount : searchCalls;
  const returnedIds = new Set(apiVideos.map((video) => video.id));
  const missingIds = allIds.filter((id) => !returnedIds.has(id)).length;
  const newVideoCount = result.catalog.videos.filter((video) => !previousIds.has(video.videoId)).length;
  await mkdir(dirname(fileURLToPath(output)), { recursive: true });
  await writeFile(output, `${JSON.stringify(result.catalog)}\n`);
  const videoDetailsQuotaUnits = videoDetailsCalls;
  console.log(JSON.stringify({
    catalogSize: result.catalog.videos.length,
    newVideos: newVideoCount,
    duplicateSearchResults,
    rejectedByMetadata: result.rejectedCount,
    unavailableOrNonEmbeddable: result.unavailableCount + missingIds,
    searchCalls,
    searchCallBudget: MAX_SEARCH_CALLS,
    searchDailyLimit: SEARCH_DAILY_LIMIT,
    videoDetailsCalls,
    videoDetailsQuotaUnits,
    totalHttpRequests: actualApiCalls,
    catalogUpdatedAt: result.catalog.updatedAt,
  }, null, 2));
} catch (error) {
  console.error(`Đồng bộ YouTube thất bại; catalog hiện tại được giữ nguyên. ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
