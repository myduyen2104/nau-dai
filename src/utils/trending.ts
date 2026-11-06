import type { VideoPlatform } from "../types/trending";

const allowedHosts: Record<VideoPlatform, string[]> = {
  youtube: ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"],
  tiktok: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.watch"],
};

export function parseSupportedVideoUrl(input: string): { url: string; platform: VideoPlatform } | null {
  try {
    const parsed = new URL(input.trim());
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || parsed.username || parsed.password) return null;
    for (const [platform, hosts] of Object.entries(allowedHosts) as [VideoPlatform, string[]][]) {
      if (!hosts.includes(parsed.hostname.toLowerCase())) continue;
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.split("/").filter(Boolean);
      const isVideo = platform === "youtube"
        ? (host === "youtu.be" ? path.length > 0 : (parsed.pathname === "/watch" && !!parsed.searchParams.get("v")) || (["shorts", "embed", "live"].includes(path[0] ?? "") && path.length > 1))
        : platform === "tiktok"
          ? (host === "vm.tiktok.com" || host === "vt.tiktok.com" ? path.length > 0 : path.includes("video"))
          : host === "fb.watch" ? path.length > 0 : ((path.includes("watch") && !!parsed.searchParams.get("v")) || (path.some((part) => ["reel", "reels", "videos", "share"].includes(part)) && path.length > 1));
      if (isVideo) return { url: parsed.toString(), platform };
      return null;
    }
  } catch {
    return null;
  }
  return null;
}
