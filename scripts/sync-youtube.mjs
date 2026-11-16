import { readFile, writeFile } from "node:fs/promises";
import { loadRecipeData } from "./load-recipe-data.mjs";
import { cookingInstructionVideos } from "./lib/youtube-trends.mjs";

const output = new URL("../src/data/trending.json", import.meta.url);
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  console.error("Thiếu YOUTUBE_API_KEY. Không thay đổi dữ liệu xu hướng hiện tại.");
  process.exit(1);
}

const queries = [
  '"cách nấu" món ngon Việt Nam', '"cách làm" món ăn ngon',
  '"hướng dẫn nấu ăn" món Việt', '"công thức nấu ăn" món Việt',
  '"cách chế biến" món ngon', '"nấu món" ngon tại nhà',
  '"recipe" Vietnamese cooking', '"vào bếp" cách làm món ngon',
];
const recipes = (await loadRecipeData()).recipes;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function youtube(path, params, attempt = 0) {
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

try {
  const ids = new Set();
  for (const query of queries) {
    const page = await youtube("search", { part: "snippet", type: "video", order: "date", maxResults: 5, relevanceLanguage: "vi", regionCode: "VN", q: query });
    for (const item of page.items ?? []) if (item.id?.videoId) ids.add(item.id.videoId);
  }
  const videoIds = [...ids];
  const details = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const page = await youtube("videos", { part: "snippet,statistics", id: videoIds.slice(i, i + 50).join(",") });
    details.push(...(page.items ?? []));
  }
  if (details.length === 0) throw new Error("YouTube trả về 0 video; giữ nguyên danh sách hiện tại để tránh xóa nhầm dữ liệu.");
  const fetchedAt = new Date().toISOString();
  const videos = cookingInstructionVideos(details.map((video) => {
    const title = video.snippet?.title ?? "";
    const description = video.snippet?.description ?? "";
    const normalizedTitle = title.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const match = recipes.find((recipe) => {
      const name = recipe.name.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
      return name.length > 3 && normalizedTitle.includes(name);
    });
    const stats = video.statistics ?? {};
    return {
      id: video.id,
      platform: "youtube",
      title,
      description,
      videoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
      thumbnailUrl: video.snippet?.thumbnails?.high?.url ?? video.snippet?.thumbnails?.medium?.url,
      creatorName: video.snippet?.channelTitle,
      publishedAt: video.snippet?.publishedAt,
      ...(stats.viewCount ? { viewCount: Number(stats.viewCount) } : {}),
      ...(stats.likeCount ? { likeCount: Number(stats.likeCount) } : {}),
      ...(stats.commentCount ? { commentCount: Number(stats.commentCount) } : {}),
      ...(match ? { recipeId: match.id } : {}),
      fetchedAt,
    };
  }));
  const data = `${JSON.stringify({ updatedAt: fetchedAt, source: "youtube", videos }, null, 2)}\n`;
  let previous = "";
  try { previous = await readFile(output, "utf8"); } catch {}
  if (previous !== data) {
    await writeFile(output, data);
    console.log(`Đã cập nhật ${videos.length} video metadata từ YouTube.`);
  } else console.log("Dữ liệu không đổi; bỏ qua ghi file.");
} catch (error) {
  console.error(`Đồng bộ YouTube thất bại; giữ nguyên dữ liệu trước đó. ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
