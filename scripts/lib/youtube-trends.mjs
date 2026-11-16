export function newestVideosFirst(videos) {
  return [...videos].sort((a, b) => {
    const dateA = Date.parse(a.publishedAt ?? "") || 0;
    const dateB = Date.parse(b.publishedAt ?? "") || 0;
    return dateB - dateA || a.title.localeCompare(b.title, "vi");
  });
}

const normalize = (value) => value.toLocaleLowerCase("vi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

const COOKING_INTENT = /\b(cach lam|cach nau|huong dan nau|huong dan lam|cong thuc|recipe|how to cook|cach che bien|bi quyet nau|day nau|mon ngon de lam)\b/;
const EXCLUDED_CONTENT = /\b(mukbang|review|food review|an thu|thu mon|thu thach an|thu thach|rating|danh gia|di cho|an lau|di an|quan an|restaurant|asmr eating|an cung|ăn gì|nhat ky|cuoc song|reaction|phan ung|stream|livestream|trailer|phim|anime|gameplay|story|tinh yeu|drama|short film|vlog|ngay lam viec|i tried|found a new favorite|cookbook club|thu nghiem|dung cu lam bep|bằng gemini|bang gemini|tao video|tuyen tap|tuyen tap|tiet lo|mot ngay)\b/;
const INSTRUCTION_SIGNAL = /\b(cach lam|cach nau|huong dan nau|huong dan lam|cong thuc|recipe|how to cook|cach che bien|bi quyet nau|day nau|mon ngon de lam)\b/;

export function isCookingInstructionVideo(video) {
  const title = normalize(video?.title ?? "");
  const description = normalize(video?.description ?? "");
  if (!title || EXCLUDED_CONTENT.test(title)) return false;
  return COOKING_INTENT.test(title) && !EXCLUDED_CONTENT.test(description.slice(0, 1200));
}

export function cookingInstructionVideos(videos) {
  return newestVideosFirst(videos.filter(isCookingInstructionVideo));
}
