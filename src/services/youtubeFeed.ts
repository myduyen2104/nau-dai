import type { TrendingVideo } from "../types/trending";

export type VideoModerationStatus = "accepted" | "rejected" | "needs_review";
export type VideoAvailabilityStatus = "available" | "non_embeddable" | "unavailable" | "unknown";

export interface YouTubeCatalogVideo extends TrendingVideo {
  videoId: string;
  channelId?: string;
  durationSeconds?: number;
  categoryTags: string[];
  language: string;
  discoveredAt: string;
  lastValidatedAt: string;
  moderationStatus: VideoModerationStatus;
  rejectionReason?: string;
  reviewReason?: string;
  availabilityStatus: VideoAvailabilityStatus;
  metadataConfidence?: "high" | "medium" | "low";
}

export interface VideoWatchRecord {
  videoId: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  startedAt?: string;
  watchedSeconds: number;
  completedAt?: string;
  skippedAt?: string;
}

const DB_NAME = "nau-dai-video-history";
const STORE_NAME = "videos";
const LEGACY_STORAGE_KEY = "nau-dai-video-watch-history";
const HISTORY_LIMIT = 1200;
const MAX_METADATA_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function freshYoutubeCatalogVideos(
  videos: YouTubeCatalogVideo[],
  now = Date.now(),
): YouTubeCatalogVideo[] {
  return videos.filter((video) => {
    if (!video?.videoId || !video.title || video.moderationStatus === "rejected") return false;
    if (video.availabilityStatus === "unavailable" || video.availabilityStatus === "non_embeddable") return false;
    const validatedAt = Date.parse(video.lastValidatedAt ?? "");
    return Number.isFinite(validatedAt) && now - validatedAt >= 0 && now - validatedAt < MAX_METADATA_AGE_MS;
  });
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function newVideoSessionSeed(): number {
  const values = new Uint32Array(1);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 0xffffffff);
  return values[0];
}

export function inferYoutubeFeedInterests(
  videos: YouTubeCatalogVideo[],
  history: VideoWatchRecord[],
  savedVideoUrls: string[] = [],
): string[] {
  const byId = new Map(videos.map((video) => [video.videoId, video]));
  const tagWeights = new Map<string, number>();
  const recentHistory = [...history]
    .filter((record) => record.startedAt || record.completedAt || record.watchedSeconds >= 20)
    .sort((a, b) => (Date.parse(b.lastSeenAt ?? b.startedAt ?? "") || 0) - (Date.parse(a.lastSeenAt ?? a.startedAt ?? "") || 0))
    .slice(0, 40);
  for (const record of recentHistory) {
    const video = byId.get(record.videoId);
    for (const tag of video?.categoryTags ?? []) tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + (record.completedAt || record.watchedSeconds >= 20 ? 2 : 1));
  }
  const savedUrls = new Set(savedVideoUrls);
  for (const video of videos) if (savedUrls.has(video.videoUrl)) {
    for (const tag of video.categoryTags) tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + 3);
  }
  return [...tagWeights.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi")).slice(0, 8).map(([tag]) => tag);
}

/** Keeps all not-yet-started clips ahead of watched clips, then ranks within each group. */
export function rankYoutubeFeed(
  videos: YouTubeCatalogVideo[],
  history: VideoWatchRecord[],
  seed: number,
  interests: string[] = [],
  now = Date.now(),
): YouTubeCatalogVideo[] {
  const random = seededRandom(seed);
  const watchById = new Map(history.map((record) => [record.videoId, record]));
  const normalizedInterests = interests.map((tag) => tag.toLocaleLowerCase("vi"));
  const pool = [...new Map(videos.map((video) => [video.videoId, video])).values()]
    .filter((video) => video.moderationStatus !== "rejected" && video.availabilityStatus !== "unavailable" && video.availabilityStatus !== "non_embeddable")
    .map((video) => {
      const record = watchById.get(video.videoId);
      const watched = Boolean(record?.startedAt || (record?.watchedSeconds ?? 0) >= 20 || record?.completedAt);
      const ageDays = Math.max(0, (now - (Date.parse(video.publishedAt ?? "") || now)) / 86_400_000);
      const freshness = Math.exp(-ageDays / 150);
      const tags = video.categoryTags.map((tag) => tag.toLocaleLowerCase("vi"));
      const interest = normalizedInterests.length
        ? tags.some((tag) => normalizedInterests.some((item) => tag.includes(item))) ? 1 : 0
        : 0.5;
      return {
        video,
        watched,
        baseScore: 0.4 * Number(!watched) + 0.25 * freshness + 0.2 * interest + 0.15 * random(),
        lastSeen: Date.parse(record?.lastSeenAt ?? "") || 0,
      };
    });

  const ranked: YouTubeCatalogVideo[] = [];
  const recentChannels: string[] = [];
  while (pool.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    const hasUnseenVideos = pool.some((candidate) => !candidate.watched);
    for (let index = 0; index < pool.length; index++) {
      const candidate = pool[index];
      // Do not replay a started clip while any unseen clip remains in the feed.
      if (hasUnseenVideos && candidate.watched) continue;
      const channel = candidate.video.creatorName ?? candidate.video.channelId ?? candidate.video.videoId;
      const repeatPenalty = recentChannels.includes(channel) ? 0.22 : 0;
      const recentlySeenPenalty = candidate.lastSeen && now - candidate.lastSeen < 7 * 86_400_000 ? 0.15 : 0;
      const score = candidate.baseScore - repeatPenalty - recentlySeenPenalty;
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    }
    const [selected] = pool.splice(bestIndex, 1);
    ranked.push(selected.video);
    recentChannels.push(selected.video.creatorName ?? selected.video.channelId ?? selected.video.videoId);
    if (recentChannels.length > 3) recentChannels.shift();
  }
  return ranked;
}

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB is unavailable")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "videoId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open video history"));
  });
}

function readLegacyHistory(): VideoWatchRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item?.videoId === "string") : [];
  } catch { return []; }
}

export async function readVideoWatchHistory(): Promise<VideoWatchRecord[]> {
  try {
    const database = await openHistoryDb();
    const rows = await new Promise<VideoWatchRecord[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as VideoWatchRecord[]);
      request.onerror = () => reject(request.error ?? new Error("Unable to read video history"));
    });
    database.close();
    return rows;
  } catch { return readLegacyHistory(); }
}

export async function recordVideoWatchEvent(
  videoId: string,
  event: "seen" | "started" | "watched" | "completed" | "skipped",
  watchedSeconds?: number,
): Promise<void> {
  if (!videoId) return;
  const timestamp = new Date().toISOString();
  try {
    const database = await openHistoryDb();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const current = await new Promise<VideoWatchRecord | undefined>((resolve, reject) => {
      const request = store.get(videoId);
      request.onsuccess = () => resolve(request.result as VideoWatchRecord | undefined);
      request.onerror = () => reject(request.error ?? new Error("Unable to update video history"));
    });
    const next: VideoWatchRecord = current ? { ...current } : { videoId, watchedSeconds: 0 };
    if (event === "seen") { next.firstSeenAt ??= timestamp; next.lastSeenAt = timestamp; }
    if (event === "started") { next.startedAt ??= timestamp; next.lastSeenAt = timestamp; }
    if (event === "watched") { next.watchedSeconds = Math.max(next.watchedSeconds, watchedSeconds ?? 0); next.lastSeenAt = timestamp; }
    if (event === "completed") { next.completedAt = timestamp; next.lastSeenAt = timestamp; }
    if (event === "skipped") { next.skippedAt = timestamp; next.lastSeenAt = timestamp; }
    store.put(next);
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const all = (allRequest.result as VideoWatchRecord[]).sort((a, b) => (Date.parse(b.lastSeenAt ?? "") || 0) - (Date.parse(a.lastSeenAt ?? "") || 0));
      for (const obsolete of all.slice(HISTORY_LIMIT)) store.delete(obsolete.videoId);
    };
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Unable to persist video history"));
      transaction.onabort = () => reject(transaction.error ?? new Error("Video history update was aborted"));
    });
    database.close();
  } catch {
    const history = readLegacyHistory().filter((record) => record.videoId !== videoId);
    const current = readLegacyHistory().find((record) => record.videoId === videoId);
    const next: VideoWatchRecord = current ? { ...current } : { videoId, watchedSeconds: 0 };
    if (event === "seen") { next.firstSeenAt ??= timestamp; next.lastSeenAt = timestamp; }
    if (event === "started") { next.startedAt ??= timestamp; next.lastSeenAt = timestamp; }
    if (event === "watched") { next.watchedSeconds = Math.max(next.watchedSeconds, watchedSeconds ?? 0); next.lastSeenAt = timestamp; }
    if (event === "completed") { next.completedAt = timestamp; next.lastSeenAt = timestamp; }
    if (event === "skipped") { next.skippedAt = timestamp; next.lastSeenAt = timestamp; }
    try { localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([next, ...history].slice(0, HISTORY_LIMIT))); } catch { /* Browser storage can be disabled or full. */ }
  }
}

export async function clearVideoWatchHistory(): Promise<void> {
  try {
    const database = await openHistoryDb();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Unable to clear video history"));
    });
    database.close();
  } catch { /* Fall back to local history below. */ }
  try { localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* Storage may be disabled. */ }
}
