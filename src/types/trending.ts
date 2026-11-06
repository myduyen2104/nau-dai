export type VideoPlatform = "youtube" | "tiktok" | "facebook";

export interface TrendingVideo {
  id: string;
  platform: VideoPlatform;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  creatorName?: string;
  publishedAt?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  recipeId?: string;
  fetchedAt: string;
}

export interface SavedVideo {
  id: string;
  platform: VideoPlatform;
  url: string;
  note: string;
  savedAt: string;
}
