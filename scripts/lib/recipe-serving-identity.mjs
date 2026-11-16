const textFold = (value) => String(value ?? "")
  .normalize("NFC")
  .toLocaleLowerCase("vi")
  .replace(/\s+/g, " ")
  .trim();
const fold = (value) => textFold(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

const gramPattern = /\b(\d+(?:[.,]\d+)?)\s*(?:g|gr|gram|grams|gramme|grammes)\b/i;
const milliliterPattern = /\b(\d+(?:[.,]\d+)?)\s*ml\b/i;
const sizePattern = /\b(?:size\s*)?(?:s|m|l|xl|xxl|small|medium|large|nho|be|vua|lon)\b/i;
const servingWordPattern = /\b(?:cai|phan|suat|ly|chen|to|o|dia|mieng|qua|trai|goi|hop)\b/i;

function looksLikeServingDescriptor(value) {
  const text = fold(value);
  const hasWeight = gramPattern.test(text);
  const hasVolume = milliliterPattern.test(text);
  const hasExplicitSize = /\bsize\s*(?:s|m|l|xl|xxl)\b|\b(?:nho|be|vua|lon|small|medium|large)\b/i.test(text);
  const hasServingUnit = servingWordPattern.test(text) || /\d+(?:\/\d+)?\s*(?:cai|phan|suat|ly|chen|to|o|dia|mieng|qua|trai|goi|hop)\b/i.test(text);
  const hasCountedServingUnit = /\d+\s*cuon\s*\/\s*(?:dia|phan)\b/i.test(text);
  return hasWeight || hasVolume || hasCountedServingUnit || /\bsize\s*(?:s|m|l|xl|xxl)\b/i.test(text) || (hasExplicitSize && hasServingUnit);
}

function parseServingDescriptor(value) {
  const text = fold(value);
  const weightMatch = text.match(gramPattern);
  const weight = weightMatch ? Number(weightMatch[1].replace(",", ".")) : null;
  const sizeMatch = text.match(/\b(?:size\s*)?(xxl|xl|s|m|l|small|medium|large|nho|be|vua|lon)\b/i);
  const sizeToken = sizeMatch?.[1] ?? "";
  const size = /^(?:s|small|nho|be)$/i.test(sizeToken) ? "small"
    : /^(?:m|medium|vua)$/i.test(sizeToken) ? "medium"
      : /^(?:l|xl|xxl|large|lon)$/i.test(sizeToken) ? "large" : null;
  const unitMatch = text.match(/\b(cai|phan|suat|ly|chen|to|o|dia|mieng|qua|trai|goi|hop)\b/i)
    ?? text.match(/\d+(?:\/\d+)?\s*(cai|phan|suat|ly|chen|to|o|dia|mieng|qua|trai|goi|hop)\b/i);
  const unit = unitMatch?.[1] ?? null;
  return { weightGrams: Number.isFinite(weight) ? weight : null, servingUnit: unit, size, sourceLabel: String(value ?? "").trim() || null };
}

/** Strip only parenthesized or terminal fragments that clearly describe portion/size. */
export function servingTitleIdentity(title) {
  const sourceTitle = String(title ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  let baseName = sourceTitle;
  const descriptors = [];
  baseName = baseName.replace(/\(([^()]*)\)/g, (full, inner) => {
    if (!looksLikeServingDescriptor(inner)) return full;
    descriptors.push(parseServingDescriptor(inner));
    return " ";
  });

  // Source titles occasionally omit parentheses or contain an extra closing bracket.
  const terminal = baseName.match(/\s*(?:[-–,/]+\s*)?(?:\d+(?:[.,]\d+)?\s*(?:g|gr|grams?)(?:\s*\/\s*(?:(?:cái|cai|phần|phan|suất|suat)\s*)?(?:size\s*)?(?:s|m|l|xl|xxl|nhỏ|nho|bé|be|vừa|vua|lớn|lon|to|small|medium|large)?)?|\d+(?:[.,]\d+)?\s*ml(?:\s*\/\s*(?:ly|chén|chen|tô|to|hộp|hop|chai|bịch|bich))?|\d+\s*cuốn\s*\/\s*(?:dĩa|dia|phần|phan)|size\s*(?:s|m|l|xl|xxl)|(?:\d+(?:\/\d+)?\s*)?(?:cái|cai|phần|phan|suất|suat|ly|chén|chen|tô|to|ổ|o|dĩa|dia|miếng|mieng|quả|qua|trái|trai|gói|goi|hộp|hop)\s*(?:size\s*)?(?:s|m|l|xl|xxl|nhỏ|nho|bé|be|vừa|vua|lớn|lon|small|medium|large)?)\s*\)?\s*$/i);
  if (terminal && looksLikeServingDescriptor(terminal[0])) {
    descriptors.push(parseServingDescriptor(terminal[0]));
    baseName = baseName.slice(0, terminal.index);
  }
  baseName = baseName.replace(/[\s([,;/–-]+$/g, "").replace(/[)]+$/g, "").replace(/\s+/g, " ").trim();
  return {
    sourceTitle,
    canonicalName: baseName || sourceTitle,
    normalizedCanonicalName: textFold(baseName || sourceTitle).replace(/[.,;:!?()[\]{}\-/]+/g, " ").replace(/\s+/g, " ").trim(),
    hasServingDescriptor: descriptors.length > 0,
    serving: descriptors.at(-1) ?? { weightGrams: null, servingUnit: null, size: null, sourceLabel: null },
    servingDescriptors: descriptors,
  };
}

export function normalizeIngredientSignature(record) {
  if (!Array.isArray(record?.ingredients) || record.ingredients.length === 0) return "ingredients-unspecified";
  return [...new Set(record.ingredients.map((item) => textFold(item?.name).replace(/[.,;:!?()[\]{}\-/]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean))].sort().join("+");
}

export function normalizeSourceMethod(value) {
  const text = fold(value);
  const terms = ["ap chao", "xao", "chien", "ran", "hap", "luoc", "kho", "nuong", "rim", "ham", "tron", "goi", "nau", "quay"];
  return terms.filter((term) => new RegExp(`(?:^|\\W)${term}(?:$|\\W)`).test(text)).join("+") || "method-unspecified";
}

export { fold as normalizeVietnameseIdentity, looksLikeServingDescriptor };
