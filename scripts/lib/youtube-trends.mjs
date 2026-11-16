export function newestVideosFirst(videos) {
  return [...videos].sort((a, b) => {
    const dateA = Date.parse(a.publishedAt ?? "") || 0;
    const dateB = Date.parse(b.publishedAt ?? "") || 0;
    return dateB - dateA || a.title.localeCompare(b.title, "vi");
  });
}

const normalize = (value) => value.toLocaleLowerCase("vi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

const COOKING_INTENT = /\b(cach lam|cach nau|huong dan|vao bep|nau an|cong thuc|recipe|cooking|how to cook|cach che bien|che bien|lam mon|bi quyet nau|day nau|nau mon|kitchen|tutorial|mon ngon de lam)\b/;
const EXCLUDED_CONTENT = /\b(mukbang|review|food review|an thu|thu mon|thu thach an|thu thach|rating|danh gia|di cho|an lau|di an|quan an|restaurant|asmr eating|an cung|ăn gì|nhat ky|cuoc song|reaction|phan ung|stream|livestream|trailer|phim|anime|gameplay|story|tinh yeu|drama|short film)\b/;
const INSTRUCTION_SIGNAL = /\b(cach|huong dan|cong thuc|recipe|cooking|nau|lam|che bien|ingredients|nguyen lieu|buoc [0-9]|how to cook|tutorial)\b/;

export function isCookingInstructionVideo(video) {
  const title = normalize(video?.title ?? "");
  const description = normalize(video?.description ?? "");
  if (!title || EXCLUDED_CONTENT.test(title)) return false;
  return COOKING_INTENT.test(title) || (INSTRUCTION_SIGNAL.test(title) && !EXCLUDED_CONTENT.test(description.slice(0, 1200)));
}

export function cookingInstructionVideos(videos) {
  return newestVideosFirst(videos.filter(isCookingInstructionVideo));
}
