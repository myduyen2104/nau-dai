export function newestVideosFirst(videos) {
  return [...videos].sort((a, b) => {
    const dateA = Date.parse(a.publishedAt ?? "") || 0;
    const dateB = Date.parse(b.publishedAt ?? "") || 0;
    return dateB - dateA || a.title.localeCompare(b.title, "vi");
  });
}

const normalize = (value) => value.toLocaleLowerCase("vi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

const COOKING_INTENT = /\b(cach lam|cach nau|huong dan nau|huong dan lam|cong thuc|recipe|how to cook|cach che bien|bi quyet (lam|nau)|day nau|mon ngon de lam)\b/;
const EXCLUDED_CONTENT = /\b(mukbang|review|food review|an thu|thu mon|thu thach an|thu thach|rating|danh gia|di cho|an lau|di an|quan an|restaurant|asmr eating|an cung|ăn gì|nhat ky|cuoc song|reaction|phan ung|stream|livestream|trailer|phim|anime|gameplay|story|tinh yeu|drama|short film|vlog|ngay lam viec|i tried|found a new favorite|cookbook club|thu nghiem|dung cu lam bep|bằng gemini|bang gemini|tao video|tuyen tap|tuyen tap|tiet lo|mot ngay)\b/;
const INSTRUCTION_SIGNAL = /\b(cach lam|cach nau|huong dan nau|huong dan lam|cong thuc|recipe|how to cook|cach che bien|bi quyet nau|day nau|mon ngon de lam)\b/;

export function isCookingInstructionVideo(video) {
  const title = normalize(video?.title ?? "");
  const description = normalize(video?.description ?? "");
  if (!title || EXCLUDED_CONTENT.test(title)) return false;
  const hasExplicitInstructionTitle = COOKING_INTENT.test(title);
  const inKitchenAndDescribed = /\bvao bep\b/.test(title) && INSTRUCTION_SIGNAL.test(description);
  return (hasExplicitInstructionTitle || inKitchenAndDescribed) && !EXCLUDED_CONTENT.test(description.slice(0, 1200));
}

export function cookingInstructionVideos(videos) {
  return newestVideosFirst(videos.filter(isCookingInstructionVideo));
}

export function videoDurationSeconds(isoDuration) {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(isoDuration ?? "");
  if (!match) return 0;
  return Number(match[1] ?? 0) * 86400 + Number(match[2] ?? 0) * 3600 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0);
}

export function classifyCookingVideo(video) {
  const title = normalize(video?.snippet?.title ?? video?.title ?? "");
  const description = normalize(video?.snippet?.description ?? video?.description ?? "").slice(0, 1200);
  const hasExplicitInstructionTitle = COOKING_INTENT.test(title);
  const inKitchenAndDescribed = /\bvao bep\b/.test(title) && INSTRUCTION_SIGNAL.test(description);
  if (!title || EXCLUDED_CONTENT.test(title) || EXCLUDED_CONTENT.test(description) || !(hasExplicitInstructionTitle || inKitchenAndDescribed)) {
    return { status: "rejected", reason: "metadata_not_cooking_instruction", confidence: "low" };
  }
  const descriptionHasInstruction = INSTRUCTION_SIGNAL.test(description);
  return {
    status: descriptionHasInstruction ? "accepted" : "needs_review",
    reason: descriptionHasInstruction ? undefined : "title_matches_but_description_is_not_conclusive",
    confidence: descriptionHasInstruction ? "high" : "medium",
  };
}

export function refreshYoutubeCatalog(previousCatalog, apiVideos, tagsByVideoId = new Map(), now = new Date(), limit = 800) {
  const previousVideos = Array.isArray(previousCatalog?.videos) ? previousCatalog.videos : [];
  const previousById = new Map(previousVideos.map((video) => [video.videoId ?? video.id, video]));
  const refreshed = [];
  let rejectedCount = 0;
  let unavailableCount = 0;
  for (const video of apiVideos) {
    const id = video?.id;
    if (typeof id !== "string" || !id) continue;
    const old = previousById.get(id);
    const classification = classifyCookingVideo(video);
    const status = video.status ?? {};
    if (status.privacyStatus !== "public" || status.embeddable === false) {
      unavailableCount++;
      continue;
    }
    if (classification.status === "rejected") { rejectedCount++; continue; }
    const snippet = video.snippet ?? {};
    const publishedAt = snippet.publishedAt ?? old?.publishedAt;
    const discoveredAt = old?.discoveredAt ?? now.toISOString();
    const tags = [...new Set([...(old?.categoryTags ?? []), ...(tagsByVideoId.get(id) ?? [])])].slice(0, 8);
    const durationSeconds = videoDurationSeconds(video.contentDetails?.duration);
    refreshed.push({
      videoId: id,
      id,
      platform: "youtube",
      title: snippet.title ?? old?.title ?? "Video hướng dẫn nấu ăn",
      videoUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
      creatorName: snippet.channelTitle ?? old?.creatorName ?? "YouTube",
      channelId: snippet.channelId ?? old?.channelId,
      publishedAt,
      durationSeconds,
      categoryTags: tags,
      language: "vi",
      discoveredAt,
      lastValidatedAt: now.toISOString(),
      fetchedAt: now.toISOString(),
      moderationStatus: classification.status,
      ...(classification.status === "needs_review" && classification.reason ? { reviewReason: classification.reason } : {}),
      availabilityStatus: "available",
      metadataConfidence: classification.confidence,
    });
  }
  const seen = new Set();
  const unique = refreshed.filter((video) => !seen.has(video.videoId) && seen.add(video.videoId));
  unique.sort((a, b) => (Date.parse(b.discoveredAt) || 0) - (Date.parse(a.discoveredAt) || 0) || (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0));
  return {
    catalog: { schemaVersion: 1, updatedAt: now.toISOString(), videos: unique.slice(0, limit) },
    rejectedCount,
    unavailableCount,
  };
}
