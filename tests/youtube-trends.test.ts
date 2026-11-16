import assert from "node:assert/strict";
import test from "node:test";
import { cookingInstructionVideos, newestVideosFirst } from "../scripts/lib/youtube-trends.mjs";

test("YouTube video list is sorted newest first without mutating source results", () => {
  const videos = [
    { title: "Cũ", publishedAt: "2026-01-01T00:00:00Z" },
    { title: "Mới", publishedAt: "2026-03-01T00:00:00Z" },
    { title: "Không có ngày", publishedAt: undefined },
  ];

  assert.deepEqual(newestVideosFirst(videos).map((video) => video.title), ["Mới", "Cũ", "Không có ngày"]);
  assert.equal(videos[0].title, "Cũ");
});

test("feed only keeps cooking instructions and drops mukbang, reviews, and food outings", () => {
  const videos = [
    { title: "Cách nấu bún bò Huế chuẩn vị", publishedAt: "2026-04-04" },
    { title: "Hướng dẫn làm bánh flan tại nhà", publishedAt: "2026-04-03" },
    { title: "Perfect Vietnamese Beef Pho Recipe" },
    { title: "Mukbang đồ ăn Việt Nam siêu ngon" },
    { title: "Review quán bún bò Huế ngon nhất" },
    { title: "Cuối tuần đi ăn lẩu ở Mỹ" },
    { title: "Vietnamese Beef Noodle Soup" },
    { title: "Em vào bếp cuối tuần nấu món ngon cho cả nhà" },
    { title: "Ngày làm việc của tôi, bữa cơm giản dị" },
    { title: "I Tried New Ingredients in Vietnamese Cooking and Found a New Favorite" },
    { title: "Tạo Video Hướng Dẫn Nấu Ăn Món Bún Bò Huế Bằng GEMINI" },
    { title: "Thịt kho tàu", description: "Cùng xem phim hoạt hình mới" },
  ];

  assert.deepEqual(cookingInstructionVideos(videos).map((video) => video.title), [
    "Cách nấu bún bò Huế chuẩn vị",
    "Hướng dẫn làm bánh flan tại nhà",
    "Perfect Vietnamese Beef Pho Recipe",
  ]);
});
