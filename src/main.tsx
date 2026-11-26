import { Component, StrictMode, useDeferredValue, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode, type SyntheticEvent, type TouchEvent as ReactTouchEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  Apple,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  Check,
  ChefHat,
  ChevronRight,
  Clock,
  CookingPot,
  Grid2X2,
  Home,
  Heart,
  History,
  Leaf,
  Lightbulb,
  Plus,
  RefreshCw,
  Pause,
  Play,
  RotateCcw,
  Mic,
  Minus,
  Flame,
  Pencil,
  Search,
  ShoppingBasket,
  Settings,
  SlidersHorizontal,
  Sun,
  Trash2,
  UtensilsCrossed,
  Video,
  X,
} from "lucide-react";
import { ingredients as coreIngredients, recipes, nameFor as coreNameFor, type Ingredient, type Recipe } from "./data";
import copperCatalog from "./data/recipes/copper-vietnam.json";
import type { SavedVideo, TrendingVideo } from "./types/trending";
import { freshYoutubeCatalogVideos, inferYoutubeFeedInterests, newVideoSessionSeed, rankYoutubeFeed, readVideoWatchHistory, recordVideoWatchEvent, type YouTubeCatalogVideo, type VideoWatchRecord } from "./services/youtubeFeed";
import { formatRecipeQuantity, isScalableRecipeUnit, scaleRecipeQuantity } from "./utils/servings";
import { recordRecentRecipe, visibleRecentRecipes } from "./utils/recipeHistory";
import { isValidDateOnly } from "./utils/dateOnly";
import { normalizeVietnamese, resolveIngredientId, buildIngredientIndex, canonicalIngredientPreference } from "./utils/ingredientMatcher";
import { parseSupportedVideoUrl } from "./utils/trending";
import { migrateLocalStorage } from "./utils/storageMigration";
import { groupCanonicalRecipeCandidates, recipeSearchRelevance, sourceRecipeCompleteness, sourceRecipeEligibleForFridge, sourceRecipeMissingIngredients, sourceRecipeWarnings, type CanonicalRecipeCandidate, type SourceRecipeCatalogItem, type SourceRecipeDetail } from "./services/sourceRecipeCatalog";
import { getSourceInstructionSupplement } from "./services/sourceInstructionSupplements";
import { filterRecommendationList, RECOMMENDATION_PAGE_SIZE, uniqueRecommendationsByRecipeTitle } from "./services/recommendationList";
import { canonicalShoppingIngredientName, shoppingIngredientCategory, shoppingIngredientIdentity } from "./services/shoppingList";
import { durationMinutes, loadMnnmRecipeDetail, normalizeMnnmInstructionSteps, type MnnmCatalogItem, type MnnmRecipeDetail } from "./services/mnnmCatalog";
import "./style.css";
  type Stock = {
  id: string;
  name?: string;
  quantity: string;
  unit: string;
  fresh: "fresh" | "soon" | "urgent" | "spoiled";
  expiresAt?: string;
  frozen?: boolean;
  storageLocation?: "fridge" | "freezer" | "pantry";
};
type Pref = {
  avoidMeat: boolean;
  avoidSeafood: boolean;
  vegetarian: boolean;
  vegan: boolean;
  noRice: boolean;
  noFry: boolean;
  noOven: boolean;
  noDefrost: boolean;
  quick: boolean;
  allowSubstitutions: boolean;
  maxTime: number;
  servings: number;
  avoid: string[];
};
type Page = "home" | "fridge" | "explore" | "trending" | "favorites" | "settings" | "shopping" | "cook";
type ShoppingItem = { id: string; name: string; quantity: string; unit: string; checked: boolean; recipeId?: string };
type LibraryResultEntry =
  | { kind: "recipe"; key: string; recipe: Recipe; name: string }
  | { kind: "source"; key: string; item: SourceRecipeCatalogItem; name: string }
  | { kind: "mnnm"; key: string; item: MnnmCatalogItem; name: string };
type LibraryResultGroup = CanonicalRecipeCandidate<LibraryResultEntry>;
type RecommendationRuntime = Pick<typeof import("./services/recommendationEngine"), "defaultRecommendationPreferences" | "recommendRecipes">;
type FlexibleSuggestionRuntime = Pick<typeof import("./services/flexibleRecipeSuggestions"), "suggestFlexibleRecipes">;
function pageFromQuery(value: string | null): Page {
  if (value === "recipes") return "explore";
  return value === "home" || value === "fridge" || value === "explore" || value === "trending" || value === "favorites" || value === "settings" || value === "shopping" || value === "cook" ? value : "home";
}
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type VoiceRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type VoiceRecognitionWindow = Window & {
  SpeechRecognition?: new () => VoiceRecognition;
  webkitSpeechRecognition?: new () => VoiceRecognition;
};
type YouTubePlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getIframe: () => HTMLIFrameElement;
};
type YouTubePlayerApi = {
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
  Player: new (element: HTMLElement, options: {
    videoId?: string;
    playerVars?: Record<string, string | number>;
    events: {
      onReady: (event: { target: YouTubePlayer }) => void;
      onStateChange: (event: { target: YouTubePlayer; data: number }) => void;
      onError: (event: { data: number }) => void;
    };
  }) => YouTubePlayer;
};
declare global {
  interface Window {
    YT?: YouTubePlayerApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let youtubePlayerApiPromise: Promise<YouTubePlayerApi> | null = null;
function loadYouTubePlayerApi(): Promise<YouTubePlayerApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubePlayerApiPromise) youtubePlayerApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player API did not initialize"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("YouTube player API could not load"));
    document.head.appendChild(script);
  });
  return youtubePlayerApiPromise;
}
const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
function IngredientVisual({ name, emoji, className }: { name: string; emoji: string; className: string }) {
  if (normalizeVietnamese(name).startsWith("lap xuong")) {
    return <span className={`${className} ingredient-visual-lap-xuong`} role="img" aria-label={name}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <g transform="rotate(-34 24 24)" stroke="#8c3a25" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M13 8c-3 0-5 2-5 5v22c0 3 2 5 5 5h2V8h-2Zm20 0v32h2c3 0 5-2 5-5V13c0-3-2-5-5-5h-2Z" fill="#bd593b"/>
          <rect x="14" y="7" width="20" height="34" rx="10" fill="#d9774f"/>
          <path d="M18 12c-1 6-1 18 0 24" fill="none" stroke="#f2b18a" strokeLinecap="round" strokeWidth="2"/>
          <path d="M10 11h5M10 37h5M33 11h5M33 37h5" fill="none" stroke="#f2c49c" strokeLinecap="round" strokeWidth="1.5"/>
        </g>
      </svg>
    </span>;
  }
  return <span className={className} role="img" aria-label={name}>{emoji}</span>;
}
const defaults: Pref = {
  avoidMeat: false,
  avoidSeafood: false,
  vegetarian: false,
  vegan: false,
  noRice: false,
  noFry: false,
  noOven: false,
  noDefrost: false,
  quick: false,
  allowSubstitutions: true,
  maxTime: 60,
  servings: 2,
  avoid: [],
};
const load = <T,>(key: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    const value: unknown = JSON.parse(s);
    if (key === "fridge-stock" && (!Array.isArray(value) || value.some((row) => !row || typeof row.id !== "string" || (row.name !== undefined && typeof row.name !== "string") || typeof row.quantity !== "string" || typeof row.unit !== "string" || !["fresh", "soon", "urgent", "spoiled"].includes(row.fresh) || (row.frozen !== undefined && typeof row.frozen !== "boolean") || (row.storageLocation !== undefined && !["fridge", "freezer", "pantry"].includes(row.storageLocation)) || (row.expiresAt !== undefined && row.expiresAt !== "" && !isValidDateOnly(row.expiresAt))))) return fallback;
    if (["fridge-favorites", "fridge-history", "fridge-cooked"].includes(key) && (!Array.isArray(value) || value.some((item) => typeof item !== "string"))) return fallback;
    if (key === "fridge-prefs" && (!value || typeof value !== "object" || Array.isArray(value))) return fallback;
    if (key === "fridge-saved-videos" && (!Array.isArray(value) || value.some((row) => !row || typeof row.id !== "string" || typeof row.note !== "string" || typeof row.savedAt !== "string" || !Number.isFinite(Date.parse(row.savedAt)) || parseSupportedVideoUrl(row.url)?.platform !== row.platform))) return fallback;
    if (key === "fresh-shopping-list" && (!Array.isArray(value) || value.some((row) => !row || typeof row.id !== "string" || typeof row.name !== "string" || typeof row.quantity !== "string" || typeof row.unit !== "string" || typeof row.checked !== "boolean"))) return fallback;
    return value as T;
  } catch {
    return fallback;
  }
};
type ActiveCookSession = { recipe: Recipe | null; step: number; done: number[]; timerSeconds: number | null; timerDeadline: number | null; timerRunning: boolean };
function loadActiveCookSession(): ActiveCookSession {
  const empty: ActiveCookSession = { recipe: null, step: 0, done: [], timerSeconds: null, timerDeadline: null, timerRunning: false };
  const saved = load<unknown>("fresh-active-cook-session", null);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return empty;
  const record = saved as Partial<ActiveCookSession>;
  const recipe = record.recipe;
  if (!recipe || typeof recipe !== "object" || typeof recipe.id !== "string" || typeof recipe.name !== "string"
    || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.steps) || recipe.steps.length === 0
    || !recipe.steps.every((step) => step && typeof step.instruction === "string")) return empty;
  const step = Number.isInteger(record.step) ? Math.max(0, Math.min(record.step!, recipe.steps.length - 1)) : 0;
  const done = Array.isArray(record.done) ? record.done.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < recipe.steps.length) : [];
  const deadline = typeof record.timerDeadline === "number" && Number.isFinite(record.timerDeadline) ? record.timerDeadline : null;
  const running = record.timerRunning === true && deadline !== null && deadline > Date.now();
  const storedSeconds = typeof record.timerSeconds === "number" && Number.isFinite(record.timerSeconds) ? Math.max(0, record.timerSeconds) : null;
  const remainingSeconds = running && deadline !== null ? Math.ceil((deadline - Date.now()) / 1000) : storedSeconds;
  return { recipe: recipe as Recipe, step, done, timerSeconds: remainingSeconds, timerDeadline: running ? deadline : null, timerRunning: running };
}
const canonical = normalizeVietnamese;
const ingredientSearchKey = (value: string) => normalizeVietnamese(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const loadPrefs = (): Pref => {
  const stored = load<Partial<Pref>>("fridge-prefs", {});
  const booleanKeys: (keyof Omit<Pref, "avoid" | "maxTime" | "servings">)[] = ["avoidMeat", "avoidSeafood", "vegetarian", "vegan", "noRice", "noFry", "noOven", "noDefrost", "quick", "allowSubstitutions"];
  const merged = { ...defaults };
  for (const key of booleanKeys) if (typeof stored[key] === "boolean") merged[key] = stored[key] as boolean;
  if ([15, 30, 45, 60].includes(Number(stored.maxTime))) merged.maxTime = Number(stored.maxTime);
  if (Number.isInteger(Number(stored.servings)) && Number(stored.servings) >= 1 && Number(stored.servings) <= 12) merged.servings = Number(stored.servings);
  merged.avoid = Array.isArray(stored.avoid) ? stored.avoid.filter((id): id is string => typeof id === "string") : [];
  return merged;
};
const persist = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
};
const coreIngredientDefaults = new Map(coreIngredients.map((ingredient) => [ingredient.id, ingredient.defaultUnit]));
let ingredients: Ingredient[] = coreIngredients;
let sourceIngredientCatalogLoad: Promise<void> | null = null;
function loadSourceIngredientCatalog(): Promise<void> {
  if (!sourceIngredientCatalogLoad) {
    sourceIngredientCatalogLoad = import("./data/source-ingredients.json").then(({ default: data }) => {
      const source = data as { coreIngredients: Ingredient[]; supplementalIngredients: Ingredient[] };
      const core = source.coreIngredients.map((ingredient) => ingredient.defaultUnit
        ? ingredient
        : { ...ingredient, defaultUnit: coreIngredientDefaults.get(ingredient.id) });
      ingredients = core.concat(source.supplementalIngredients);
    });
  }
  return sourceIngredientCatalogLoad;
}
function nameFor(id: string) {
  return ingredients.find((ingredient) => ingredient.id === id)?.name ?? coreNameFor(id);
}
const copperRecipes: Recipe[] = copperCatalog.recipes.map((item) => {
  const ids = item.ingredients.map((ingredient) => ingredient.ingredientId ?? ingredient.sourceName);
  const time = item.totalTimeMinutes;
  const instructionIngredients = new Set(item.addedIngredients ?? []);
  return {
    id: item.id, slug: item.slug, name: item.name, emoji: "🍲", description: "", category: "Món Việt", cuisine: "vietnamese",
    method: "", minutes: time, preparationTime: null, cookingTime: null, totalTime: time,
    difficulty: item.difficulty === "easy" ? "Dễ" : item.difficulty === "medium" ? "Vừa" : item.difficulty === "hard" ? "Khó" : "Chưa đánh giá",
    servings: item.servings ?? null, required: ids, optional: [], addedIngredients: item.addedIngredients ?? [], ingredients: item.ingredients.map((ingredient) => {
      const ingredientId = ingredient.ingredientId ?? ingredient.sourceName;
      const category = ingredients.find((entry) => entry.id === ingredientId)?.category;
      const role = category === "Gia vị" ? "seasoning" as const : ["Thịt", "Hải sản", "Trứng", "Tinh bột"].includes(category ?? "") ? "main" as const : "required" as const;
      return { ingredientId, sourceName: ingredient.sourceName, quantity: null, unit: "", optional: false, role, instructionAdded: instructionIngredients.has(ingredient.sourceName) };
    }),
    steps: (item.instructions ?? []).map((instruction, order) => ({ order: order + 1, instruction })), equipment: [], tips: [], tags: ["Món Việt"], source: { type: "website", url: item.source.recipeUrl, title: `${item.source.name} · ${item.source.license}` },
    instructionReference: item.instructionReference as Recipe["instructionReference"], verificationStatus: (item.verificationStatus ?? "unverified") as Recipe["verificationStatus"], dataStatus: item.instructions?.length ? "full_recipe" : "ingredients_only",
  };
});
const libraryRecipes = [...recipes, ...copperRecipes];
function fallbackMnnmImage(event: SyntheticEvent<HTMLImageElement>, item: MnnmCatalogItem) {
  const image = event.currentTarget;
  const nextIndex = Number(image.dataset.fallbackIndex ?? 0);
  const nextImage = item.image_fallbacks[nextIndex];
  if (nextImage) {
    image.dataset.fallbackIndex = String(nextIndex + 1);
    image.src = nextImage;
    return;
  }
  image.hidden = true;
  image.parentElement?.classList.add("image-unavailable");
}
function shortSourceTip(tip: string) {
  return tip.replace(/\s+/gu, " ").trim();
}

function fallbackRecipeSourceImage(event: SyntheticEvent<HTMLImageElement>, recipe: Recipe) {
  const image = event.currentTarget;
  // If we already failed once or it is a known 403 host, immediately fallback to unavailable to prevent cascade jank
  const nextIndex = Number(image.dataset.fallbackIndex ?? 0);
  const nextImage = recipe.imageFallbacks?.[nextIndex];
  if (nextImage && !nextImage.includes("unileversolutions.com")) {
    image.dataset.fallbackIndex = String(nextIndex + 1);
    image.src = nextImage;
    return;
  }
  image.hidden = true;
  image.parentElement?.classList.add("image-unavailable");
}
function mnnmRecipeFor(item: MnnmCatalogItem, detail?: MnnmRecipeDetail): Recipe {
  const ingredientRows = detail?.ingredients ?? item.ingredient_names.map((name) => ({ name, quantity_raw: null, raw: name, kind: "ingredient" }));
  const recipeIngredients = ingredientRows.map((ingredient, index) => ({
    ingredientId: `${ingredient.name}#${index}`,
    sourceName: ingredient.name,
    quantity: null,
    unit: "",
    optional: false,
    role: "required" as const,
    note: ingredient.quantity_raw ?? ingredient.raw ?? undefined,
  }));
  const steps = normalizeMnnmInstructionSteps(detail?.instruction_sections ?? [])
    .map(({ sectionName, instruction }, index) => ({ order: index + 1, instruction: sectionName ? `${sectionName}: ${instruction}` : instruction }));
  const servings = item.servings?.match(/\d+/)?.[0];
  return {
    id: item.id,
    slug: item.id.split(":").slice(-1)[0] ?? item.id,
    name: item.name,
    emoji: "🍲",
    description: item.description,
    category: item.category,
    cuisine: "vietnamese",
    method: "",
    minutes: durationMinutes(item.total_time),
    preparationTime: durationMinutes(item.prep_time),
    cookingTime: durationMinutes(item.cook_time),
    totalTime: durationMinutes(item.total_time),
    difficulty: "Chưa đánh giá",
    servings: servings ? Number(servings) : null,
    required: recipeIngredients.map((ingredient) => ingredient.ingredientId),
    optional: [],
    ingredients: recipeIngredients,
    steps,
    equipment: [],
    tips: detail?.tips ?? item.tips ?? [],
    tags: item.tags,
    source: { type: "website", url: item.source_url, title: "Món Ngon Mỗi Ngày" },
    imageUrl: item.image_url ?? undefined,
    imageFallbacks: item.image_fallbacks,
    publishedAt: item.published_at ?? undefined,
    verificationStatus: "unverified",
    dataStatus: item.has_instructions ? "full_recipe" : item.has_ingredients ? "ingredients_only" : "catalog_only",
  };
}
type RecipeImage = {
  source: string;
  recipeId: string;
  imagePath: string;
  cardImagePath?: string;
  imageType?: "ai_illustration" | "licensed_photo";
  imageSource?: string;
  promptSummary?: string;
  verificationStatus: string;
  notes?: string;
  lastChecked: string;
  sourcePageUrl?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  fitNotes?: string;
  modifications?: string;
};
type CookingTip = { id: string; title: string; subheading?: string; text: string; source: string; sourceUrl: string | null; imageUrl?: string | null };
type SourceRecipeImageRecord = {
  source: "knorr" | "mnnm";
  recipeId: string;
  thumbPath: string;
  cardImagePath: string;
  imagePath: string;
  sourceUrl?: string;
};
let recipeImages = new Map<string, RecipeImage>();
let sourceRecipeImages = new Map<string, SourceRecipeImageRecord>();
let cachedVideoCatalog: { schemaVersion: number; updatedAt: string; videos: YouTubeCatalogVideo[]; loadedAt: number } | null = null;
void fetch("/data/recipe-image-manifest.json")
  .then((response) => response.ok ? response.json() as Promise<{ records?: RecipeImage[] }> : null)
  .then((manifest) => {
    recipeImages = new Map((manifest?.records ?? []).map((image) => [`${image.source}|${image.recipeId}`, image]));
    window.dispatchEvent(new Event("recipe-images-loaded"));
  })
  .catch(() => {});

void fetch("/data/source-recipe-image-manifest.json")
  .then((response) => response.ok ? response.json() as Promise<{ records?: SourceRecipeImageRecord[] }> : null)
  .then((manifest) => {
    sourceRecipeImages = new Map((manifest?.records ?? []).map((record) => [record.recipeId, record]));
    window.dispatchEvent(new Event("recipe-images-loaded"));
  })
  .catch(() => {});

function recipeImageFor(recipeId: string) {
  const sourceImageRecord = sourceRecipeImages.get(recipeId);
  if (sourceImageRecord) {
    return {
      source: sourceImageRecord.source,
      recipeId: sourceImageRecord.recipeId,
      imagePath: sourceImageRecord.imagePath,
      cardImagePath: sourceImageRecord.cardImagePath,
      thumbPath: sourceImageRecord.thumbPath,
      verificationStatus: "verified",
      lastChecked: "2026-11-18",
    } as RecipeImage & { thumbPath?: string };
  }
  if (recipeId.startsWith("knorr:") || recipeId.startsWith("monngonmoingay:")) return undefined;
  const source = recipeId.startsWith("copper:") ? "copper" : "internal";
  const keyId = recipeId;
  return recipeImages.get(`${source}|${keyId}`);
}
const revisedFlexibleImageVariants = new Set([
  "tofu-tomato", "lap-xuong-quail-egg", "roast-duck-rice", "frozen-fried-chicken", "roast-duck-bread",
]);
const flexibleCombinationImages: Record<string, string> = {
  "cha lua+gia do+rau lan#xao": "cha-lua-bean-sprout-rau-lan.webp",
  "ha cao+rau lan#chien": "dumpling-rau-lan-crispy.webp",
  "ha cao+rau lan#nau canh": "dumpling-rau-lan-soup.webp",
  "mien dong+rau lan+trung cut#mien xao": "glass-noodle-quail-egg-rau-lan.webp",
  "gia do+mien dong+trung cut#mien xao": "glass-noodle-quail-egg-bean-sprout.webp",
  "dau bap+mien dong kho+trung cut#mien xao": "glass-noodle-dried-quail-egg-okra.webp",
  "dau bap+mien dong kho+tom su#mien xao": "glass-noodle-dried-shrimp-okra.webp",
  "ca vien chien+dau bap+mien dong kho#mien xao": "glass-noodle-dried-fish-ball-okra.webp",
  "bau+thit heo#canh": "canh-bau-thit-heo.webp",
  "ca rot+khoai tay#xao": "carrot-potato-stir-fry.webp",
  "mi tuoi+rau lan+trung cut#mi xao": "fresh-noodle-quail-egg-rau-lan.webp",
  "ca vien chien+gia do#xao": "fish-ball-bean-sprout-stir-fry.webp",
  "cha gio#chien": "cha-gio-fried.webp",
  "com+lap xuong#chien com": "rice-lap-xuong.webp",
  "ca vien chien+gia do+mien dong#mien xao": "glass-noodle-fish-ball-sprout.webp",
  "lap xuong+mi tuoi+rau lan#mi xao": "fresh-noodle-lap-xuong-rau-lan.webp",
  "com+nem chua ran+rau lan+su su#chien va xao rieng": "rice-nem-chua-ran-chayote-rau-lan.webp",
  "cha lua+mi tuoi+rau lan#mi xao": "mi-tuoi-cha-lua-rau-lan.webp",
  "ca chua+rau lan#xao": "rau-lan-ca-chua.webp",
  "ca vien chien+dau hu#xao": "ca-vien-dau-hu.webp",
  "ca vien chien+dau bap+rau lan#xao": "ca-vien-dau-bap-rau-lan.webp",
  "cha lua+dau bap+gia do#xao": "cha-lua-dau-bap-gia-do.webp",
  "ca vien chien+dau bap+gia do#xao": "ca-vien-dau-bap-gia-do.webp",
  "ca chua+cha lua+gia do#xao": "cha-lua-gia-do-ca-chua.webp",
  "ca chua+cha lua+dau bap#xao": "cha-lua-ca-chua-dau-bap.webp",
  "ca chua+ca vien chien+nui#nui sot": "nui-ca-vien-sot-ca-chua.webp",
  "gia do+rau lan#xao": "rau-lan-gia-do.webp",
  "dau bap+rau lan#xao": "rau-lan-dau-bap.webp",
  "ca chua+dau bap#xao": "okra-tomato-stir-fry.webp",
  "ca chua+ca vien chien+rau lan#xao": "ca-vien-rau-lan-ca-chua.webp",
  "ca chua+ca vien chien+gia do#xao": "ca-vien-gia-do-ca-chua.webp",
  "ca chua+ca vien chien+dau bap#xao": "ca-vien-dau-bap-ca-chua.webp",
};
function flexibleCombinationImageFor(recipe: Recipe) {
  const ingredients = recipe.ingredients.map((ingredient) => normalizeVietnamese(ingredient.sourceName ?? ingredient.ingredientId)).sort();
  const key = `${ingredients.join("+")}#${normalizeVietnamese(recipe.method)}`;
  const file = flexibleCombinationImages[key];
  if (!file) return undefined;
  const imagePath = `/images/recipes/flexible/combinations/${file}`;
  return recipeImageFor(`flexible-combination:${key}`) ?? {
    source: "internal",
    recipeId: `flexible-combination:${key}`,
    imagePath,
    cardImagePath: imagePath,
    imageType: "ai_illustration",
  };
}
function flexibleRecipeImageFor(recipe: Recipe) {
  if (!recipe.tags.includes("Gợi ý linh hoạt")) return undefined;
  const combinationImage = flexibleCombinationImageFor(recipe);
  if (combinationImage) return combinationImage;
  const imageVariant = recipe.tags.find((tag) => tag.startsWith("flexible-image:"))?.slice("flexible-image:".length);
  if (imageVariant) {
    const imagePath = revisedFlexibleImageVariants.has(imageVariant)
      ? `/images/recipes/flexible/variants/reviewed-v2/${imageVariant}.webp`
      : `/images/recipes/flexible/variants/${imageVariant}.webp`;
    // Keep a local path available immediately; the manifest is fetched async and
    // should not cause suggested dishes to briefly render without their image.
    return recipeImageFor(`flexible-variant:${imageVariant}`) ?? {
      source: "internal",
      recipeId: `flexible-variant:${imageVariant}`,
      imagePath,
      cardImagePath: imagePath,
      imageType: "ai_illustration",
    };
  }
  const names = recipe.ingredients.map((ingredient) => normalizeVietnamese(ingredient.sourceName ?? ingredient.ingredientId));
  const has = (term: string) => names.some((name) => name === term || name.startsWith(`${term} `));
  const fishTerms = ["ca loc", "ca basa", "ca hoi", "ca thu", "ca ro", "ca chim", "ca trich", "ca tre", "ca lang"];
  const hasFish = names.some((name) => name === "ca" || fishTerms.some((term) => name === term || name.startsWith(`${term} `)));
  const hasTofu = has("dau hu") || has("dau phu");
  const imageTemplate = recipe.method === "canh" ? hasTofu ? "tofu-vegetable-soup" : "prepared-meat-vegetable-soup"
    : has("thit bo") ? "beef-stir-fry"
      : has("thit ga") ? "chicken-stir-fry"
        : has("thit heo") ? "pork-stir-fry"
          : has("tom") ? "shrimp-stir-fry"
            : hasFish ? "fish-stir-fry"
              : hasTofu ? "tofu-stir-fry"
                : has("trung") ? "egg-stir-fry" : "vegetable-stir-fry";
  const imagePath = `/images/recipes/flexible/${imageTemplate}-card.webp`;
  return recipeImageFor(`flexible-template:${imageTemplate}`) ?? {
    source: "internal",
    recipeId: `flexible-template:${imageTemplate}`,
    imagePath,
    cardImagePath: imagePath,
    imageType: "ai_illustration",
  };
}
function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [introMounted, setIntroMounted] = useState(true);
  const introImageRef = useRef<HTMLImageElement | null>(null);
  const [initialCookingSession] = useState(() => loadActiveCookSession());
  const [, setRecipeImagesVersion] = useState(0);
  const [ingredientCatalogVersion, setIngredientCatalogVersion] = useState(0);
  useEffect(() => {
    const update = () => setRecipeImagesVersion((version) => version + 1);
    window.addEventListener("recipe-images-loaded", update);
    update();
    return () => window.removeEventListener("recipe-images-loaded", update);
  }, []);
  const qrInstallRequested = new URLSearchParams(window.location.search).get("install") === "1";
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.matchMedia("(max-width: 699px)").matches);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(() => {
    if (isStandalone()) return false;
    try { return qrInstallRequested || window.sessionStorage.getItem("nau-dai-install-help-dismissed") !== "1"; }
    catch { return qrInstallRequested; }
  });
  const dismissInstallHelp = () => {
    try { window.sessionStorage.setItem("nau-dai-install-help-dismissed", "1"); } catch { /* Session storage may be disabled. */ }
    setShowInstallHelp(false);
  };
  const [storageWarning, setStorageWarning] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [videoUrlDraft, setVideoUrlDraft] = useState("");
  const [videoNoteDraft, setVideoNoteDraft] = useState("");
  const [videoFormError, setVideoFormError] = useState("");
  const [activeTrendingVideoId, setActiveTrendingVideoId] = useState<string | null>(null);
  const [trendingOverlayVisible, setTrendingOverlayVisible] = useState(false);
  const [trendingVideos, setTrendingVideos] = useState<YouTubeCatalogVideo[]>([]);
  const [trendingCatalogStatus, setTrendingCatalogStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [trendingCatalogRetry, setTrendingCatalogRetry] = useState(0);
  const [trendingFeedRefreshing, setTrendingFeedRefreshing] = useState(false);
  const [videoPulling, setVideoPulling] = useState(false);
  const [videoPullReady, setVideoPullReady] = useState(false);
  const [visibleTrendingCount, setVisibleTrendingCount] = useState(12);
  const [failedTrendingVideoIds, setFailedTrendingVideoIds] = useState<string[]>([]);
  const [videoHistoryMessage, setVideoHistoryMessage] = useState("");
  const [libraryQuery, setLibraryQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [libraryCategory, setLibraryCategory] = useState("Tất cả");
  const [libraryStatus, setLibraryStatus] = useState("Tất cả");
  const [librarySourceFilter, setLibrarySourceFilter] = useState<"all" | "internal" | "copper" | "mnnm" | "knorr" | "other">("all");
  const [libraryDiet, setLibraryDiet] = useState(false);
  const [libraryQuickOnly, setLibraryQuickOnly] = useState(false);
  const [libraryLimit, setLibraryLimit] = useState(30);
  const [recommendationRuntime, setRecommendationRuntime] = useState<RecommendationRuntime | null>(null);
  const [flexibleSuggestionRuntime, setFlexibleSuggestionRuntime] = useState<FlexibleSuggestionRuntime | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState<"all" | "fridge">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") === "recipes" || params.get("mode") === "fridge" ? "fridge" : "all";
  });
  const [avoidQuery, setAvoidQuery] = useState("");
  const [shoppingQuery, setShoppingQuery] = useState("");
  const [savedQuery, setSavedQuery] = useState("");
  const [savedFilter, setSavedFilter] = useState<"all" | "ready" | "need">("all");
  const [homeFeatureIndex, setHomeFeatureIndex] = useState(0);
  const [homeFeatureShufflePending, setHomeFeatureShufflePending] = useState(false);
  const [homeMealIndex, setHomeMealIndex] = useState(0);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 699px)");
    const updateLayout = () => setIsMobileLayout(media.matches);
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);
  useEffect(() => {
    const image = introImageRef.current;
    const introStartedAt = performance.now();
    const minimumIntroDuration = 1100;
    let firstFrame = 0;
    let secondFrame = 0;
    let hideTimer = 0;
    let scheduled = false;
    const hideAfterPaint = () => {
      if (scheduled) return;
      scheduled = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setShowIntro(false);
        setIntroMounted(false);
        return;
      }
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          hideTimer = window.setTimeout(() => setShowIntro(false), Math.max(0, minimumIntroDuration - (performance.now() - introStartedAt)));
        });
      });
    };
    const imageTimeout = window.setTimeout(hideAfterPaint, 1800);
    if (!image || (image.complete && image.naturalWidth > 0)) {
      hideAfterPaint();
    } else {
      image.addEventListener("load", hideAfterPaint, { once: true });
      image.addEventListener("error", hideAfterPaint, { once: true });
    }
    return () => {
      if (image) {
        image.removeEventListener("load", hideAfterPaint);
        image.removeEventListener("error", hideAfterPaint);
      }
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(hideTimer);
      window.clearTimeout(imageTimeout);
    };
  }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname.startsWith("127."))) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const onInstalled = () => { setInstallPrompt(null); dismissInstallHelp(); };
    window.addEventListener("appinstalled", onInstalled);
    const capturePrompt = (event: Event) => { onPrompt(event); };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    if (qrInstallRequested) window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const [stock, setStock] = useState<Stock[]>(() => load("fridge-stock", [])),
    [prefs, setPrefs] = useState<Pref>(loadPrefs),
    [query, setQuery] = useState(""),
    [pickerOpen, setPickerOpen] = useState(false),
    [pickerMessage, setPickerMessage] = useState(""),
    [pickerUndoId, setPickerUndoId] = useState(""),
    [undoRemovedStock, setUndoRemovedStock] = useState<Stock | null>(null),
    [toastMessage, setToastMessage] = useState(""),
    [page, setPage] = useState<Page>(() => {
      return pageFromQuery(new URLSearchParams(window.location.search).get("page"));
    }),
    [clockNow, setClockNow] = useState(() => new Date()),
    [tab, setTab] = useState<"ready" | "substitution" | "almost" | "use_soon" | "discover">("ready"),
    [modal, setModal] = useState<Recipe | null>(null),
    [cookReturnPage, setCookReturnPage] = useState<Page>("home"),
    [cookReturnRecipe, setCookReturnRecipe] = useState<Recipe | null>(null),
    [favorites, setFavorites] = useState<string[]>(() =>
      load("fridge-favorites", []),
    ),
    [history, setHistory] = useState<string[]>(() =>
      load("fridge-history", []),
    ),
    [cooked, setCooked] = useState<string[]>(() => load("fridge-cooked", [])),
    [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() => load("fridge-saved-videos", [])),
    [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => load("fresh-shopping-list", [])),
    [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(initialCookingSession.recipe),
    [cookingStep, setCookingStep] = useState(initialCookingSession.step),
    [cookTimerSeconds, setCookTimerSeconds] = useState<number | null>(initialCookingSession.timerSeconds),
    [cookTimerRunning, setCookTimerRunning] = useState(initialCookingSession.timerRunning),
    [cookTimerDeadline, setCookTimerDeadline] = useState<number | null>(initialCookingSession.timerDeadline),
    [cookTimerExpanded, setCookTimerExpanded] = useState(() => initialCookingSession.timerRunning || initialCookingSession.timerSeconds !== null || Boolean(initialCookingSession.recipe?.steps[initialCookingSession.step]?.durationMinutes)),
    [cookSoundOn, setCookSoundOn] = useState(() => load("fresh-cook-sound", true)),
    [cookVibrationOn, setCookVibrationOn] = useState(() => load("fresh-cook-vibration", true)),
    [cookAlarmVisible, setCookAlarmVisible] = useState(false),
    [cookNotificationPermission, setCookNotificationPermission] = useState<NotificationPermission | "unsupported">(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    [cookKeepAwake, setCookKeepAwake] = useState(false),
    [cookVoiceListening, setCookVoiceListening] = useState(false),
    [cookVoiceMessage, setCookVoiceMessage] = useState("Chạm mic để bật lệnh giọng nói"),
    [done, setDone] = useState<number[]>(initialCookingSession.done),
    [selectedSubstitutions, setSelectedSubstitutions] = useState<Record<string, string>>({});
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockDraft, setEditingStockDraft] = useState<Stock | null>(null);
  const [expiryCalendarOpen, setExpiryCalendarOpen] = useState(false);
  const [expiryUnitOpen, setExpiryUnitOpen] = useState(false);
  const [expirySheetClosing, setExpirySheetClosing] = useState(false);
  const expirySheetCloseTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  const toastAfterSheetClose = useRef<string | null>(null);
  const expirySheetTouchStart = useRef<{ x: number; y: number } | null>(null);
  const showToast = (message: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToastMessage(message);
    toastTimer.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimer.current = null;
    }, 3000);
  };
  const closeStockEditor = () => {
    if (!editingStockId || expirySheetCloseTimer.current !== null) return;
    setExpirySheetClosing(true);
    setExpiryCalendarOpen(false);
    setExpiryUnitOpen(false);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
    expirySheetCloseTimer.current = window.setTimeout(() => {
      setEditingStockId(null);
      setEditingStockDraft(null);
      setExpirySheetClosing(false);
      expirySheetCloseTimer.current = null;
      if (toastAfterSheetClose.current) {
        const message = toastAfterSheetClose.current;
        toastAfterSheetClose.current = null;
        showToast(message);
      }
    }, delay);
  };
  const [expiryCalendarMonth, setExpiryCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const deferredIngredientQuery = useDeferredValue(query);
  useEffect(() => {
    if (page !== "explore" && !(stock.length > 0 && (page === "fridge" || page === "home"))) return;
    let cancelled = false;
    void loadSourceIngredientCatalog().then(() => { if (!cancelled) setIngredientCatalogVersion((version) => version || 1); });
    return () => { cancelled = true; };
  }, [page, stock.length]);
  useEffect(() => {
    if (!query.trim() || ingredientCatalogVersion > 0) return;
    const timer = window.setTimeout(() => {
      void loadSourceIngredientCatalog().then(() => setIngredientCatalogVersion((version) => version || 1));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [query, ingredientCatalogVersion]);
  useEffect(() => {
    if (stock.length === 0 || recommendationRuntime || flexibleSuggestionRuntime) return;
    let cancelled = false;
    void Promise.all([
      import("./services/recommendationEngine"),
      import("./services/flexibleRecipeSuggestions"),
    ]).then(([recommendations, flexibleSuggestions]) => {
      if (cancelled) return;
      setRecommendationRuntime(recommendations);
      setFlexibleSuggestionRuntime(flexibleSuggestions);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [stock.length, recommendationRuntime, flexibleSuggestionRuntime]);
  const recipeDetailScrollRef = useRef<HTMLDivElement | null>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const trendingReturnPageRef = useRef<Page>(page === "trending" ? "home" : page);
  const trendingFeedRef = useRef<HTMLDivElement | null>(null);
  const videoPullStartYRef = useRef<number | null>(null);
  const videoPullTriggeredRef = useRef(false);
  const videoFeedPreserveOnRefreshRef = useRef(false);
  const resetVideoFeedScrollRef = useRef(false);
  const youtubePlayerContainerRef = useRef<HTMLElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const trendingWatchHistoryRef = useRef<VideoWatchRecord[]>([]);
  const savedVideosRef = useRef(savedVideos);
  const seenTrendingVideoIdsRef = useRef(new Set<string>());
  const trendingSessionCounterRef = useRef(0);
  const restoredCookSessionRef = useRef(Boolean(initialCookingSession.recipe));
  const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);
  const cookingStepRef = useRef(cookingStep);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const cookWakeLockRef = useRef<WakeLockSentinel | null>(null);
  const alarmDismissButtonRef = useRef<HTMLButtonElement | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);
  const vibrationTimeoutRef = useRef<number | null>(null);
  const alarmFiredForRef = useRef("");
  const timerExpiredForRef = useRef("");
  const persistVideoHistoryEvent = async (videoId: string, event: "seen" | "started" | "watched" | "completed" | "skipped", watchedSeconds?: number) => {
    await recordVideoWatchEvent(videoId, event, watchedSeconds);
    const nextHistory = await readVideoWatchHistory();
    trendingWatchHistoryRef.current = nextHistory;
  };
  const resetVideoPullCard = () => {
    const feed = trendingFeedRef.current;
    const card = feed?.querySelector<HTMLElement>(".trend-feed-card");
    feed?.classList.remove("is-pulling");
    card?.classList.remove("is-pulling");
    card?.style.removeProperty("--video-pull-offset");
  };
  const beginVideoFeedPull = (event: ReactTouchEvent<HTMLElement>) => {
    const feed = trendingFeedRef.current;
    const target = event.target;
    if ((feed && feed.scrollTop > 1) || trendingCatalogStatus === "loading" || (target instanceof Element && target.closest(".video-back, .trend-card-actions, a"))) {
      videoPullStartYRef.current = null;
      return;
    }
    videoPullStartYRef.current = event.touches[0]?.clientY ?? null;
    videoPullTriggeredRef.current = false;
    setVideoPulling(false);
    setVideoPullReady(false);
    resetVideoPullCard();
    feed?.classList.add("is-pulling");
    trendingFeedRef.current?.querySelector<HTMLElement>(".trend-feed-card")?.classList.add("is-pulling");
  };
  const moveVideoFeedPull = (event: ReactTouchEvent<HTMLElement>) => {
    const startY = videoPullStartYRef.current;
    const currentY = event.touches[0]?.clientY;
    if (startY === null || currentY === undefined) return;
    const distance = currentY - startY;
    const pulling = distance >= 12;
    const ready = distance >= 112;
    const feed = trendingFeedRef.current;
    if (feed && feed.scrollTop !== 0) feed.scrollTop = 0;
    const card = trendingFeedRef.current?.querySelector<HTMLElement>(".trend-feed-card");
    card?.style.setProperty("--video-pull-offset", `${Math.min(148, Math.max(0, distance * 0.88))}px`);
    setVideoPulling((previous) => previous === pulling ? previous : pulling);
    setVideoPullReady((previous) => previous === ready ? previous : ready);
  };
  const cancelVideoFeedPull = () => {
    videoPullStartYRef.current = null;
    videoPullTriggeredRef.current = false;
    resetVideoPullCard();
    setVideoPulling(false);
    setVideoPullReady(false);
  };
  const finishVideoFeedPull = (event: ReactTouchEvent<HTMLElement>) => {
    const startY = videoPullStartYRef.current;
    videoPullStartYRef.current = null;
    const feed = trendingFeedRef.current;
    const endY = event.changedTouches[0]?.clientY;
    if (startY === null || endY === undefined || (feed && feed.scrollTop > 1) || endY - startY < 112 || trendingCatalogStatus === "loading") {
      resetVideoPullCard();
      setVideoPulling(false);
      setVideoPullReady(false);
      return;
    }
    videoPullTriggeredRef.current = true;
    window.setTimeout(() => { videoPullTriggeredRef.current = false; }, 400);
    resetVideoPullCard();
    setVisibleTrendingCount(Math.min(12, trendingVideos.length));
    setVideoPulling(false);
    setVideoPullReady(false);
    videoFeedPreserveOnRefreshRef.current = true;
    resetVideoFeedScrollRef.current = true;
    setTrendingFeedRefreshing(true);
    setTrendingCatalogRetry((count) => count + 1);
  };
  useEffect(() => { savedVideosRef.current = savedVideos; }, [savedVideos]);
  const popNavigationRef = useRef(false);
  const lastNavigationRef = useRef({ page, mode: discoveryMode });
  cookingStepRef.current = cookingStep;
  useEffect(() => { if (page === "cook" && !cookingRecipe) setPage("home"); }, [page, cookingRecipe]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("page") === "recipes") setDiscoveryMode("fridge");
    if (params.has("q")) setLibraryQuery(params.get("q") ?? "");
    const onPopState = () => {
      const next = new URLSearchParams(window.location.search);
      const requested = next.get("page");
      popNavigationRef.current = true;
      setPage(pageFromQuery(requested));
      setDiscoveryMode(next.get("mode") === "fridge" || requested === "recipes" ? "fridge" : "all");
      setLibraryQuery(next.get("q") ?? "");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (popNavigationRef.current) {
      popNavigationRef.current = false;
      lastNavigationRef.current = { page, mode: discoveryMode };
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("page", page);
    if (page === "explore") url.searchParams.set("mode", discoveryMode); else url.searchParams.delete("mode");
    if (libraryQuery) url.searchParams.set("q", libraryQuery); else url.searchParams.delete("q");
    const navigationChanged = lastNavigationRef.current.page !== page || lastNavigationRef.current.mode !== discoveryMode;
    if (navigationChanged) window.history.pushState({}, "", url); else window.history.replaceState({}, "", url);
    lastNavigationRef.current = { page, mode: discoveryMode };
  }, [page, discoveryMode, libraryQuery]);
  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    if (page !== "cook") {
      setCookKeepAwake(false);
      return;
    }
    if (!cookKeepAwake || !("wakeLock" in navigator)) return;
    let disposed = false;
    const requestScreenLock = async () => {
      if (document.visibilityState !== "visible" || (cookWakeLockRef.current && !cookWakeLockRef.current.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (disposed) { await lock.release(); return; }
        cookWakeLockRef.current = lock;
        lock.addEventListener("release", () => {
          if (cookWakeLockRef.current === lock) cookWakeLockRef.current = null;
        }, { once: true });
      } catch {
        setCookKeepAwake(false);
      }
    };
    const resumeScreenLock = () => { if (document.visibilityState === "visible") void requestScreenLock(); };
    void requestScreenLock();
    document.addEventListener("visibilitychange", resumeScreenLock);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", resumeScreenLock);
      const lock = cookWakeLockRef.current;
      cookWakeLockRef.current = null;
      if (lock && !lock.released) void lock.release();
    };
  }, [page, cookKeepAwake]);
  useEffect(() => { mainScrollRef.current?.scrollTo({ top: 0 }); }, [page]);
  useEffect(() => { if (page !== "trending") trendingReturnPageRef.current = page; }, [page]);
  useEffect(() => {
    if (modal) recipeDetailScrollRef.current?.scrollTo({ top: 0 });
  }, [modal?.id]);
  useEffect(() => {
    if (restoredCookSessionRef.current) {
      restoredCookSessionRef.current = false;
      return;
    }
    const duration = cookingRecipe?.steps[cookingStep]?.durationMinutes;
    setCookTimerSeconds(typeof duration === "number" && duration > 0 ? Math.round(duration * 60) : null);
    setCookTimerRunning(false);
    setCookTimerDeadline(null);
    setCookTimerExpanded(typeof duration === "number" && duration > 0);
    alarmFiredForRef.current = "";
    timerExpiredForRef.current = "";
  }, [cookingRecipe?.id, cookingStep]);
  useEffect(() => {
    if (!cookTimerRunning || cookTimerDeadline === null) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((cookTimerDeadline - Date.now()) / 1000));
      setCookTimerSeconds(seconds);
      if (seconds === 0) {
        timerExpiredForRef.current = `${cookingRecipe?.id ?? ""}:${cookingStep}`;
        setCookTimerRunning(false);
        setCookTimerDeadline(null);
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [cookTimerRunning, cookTimerDeadline, cookingRecipe?.id, cookingStep]);
  useEffect(() => {
    if (cookTimerSeconds !== 0 || !cookingRecipe) return;
    const key = `${cookingRecipe.id}:${cookingStep}`;
    if (timerExpiredForRef.current !== key) return;
    if (alarmFiredForRef.current === key) return;
    alarmFiredForRef.current = key;
    setCookTimerRunning(false);
    setCookAlarmVisible(true);
    setCookVoiceMessage("Hết giờ hẹn · kiểm tra món ăn");
    const vibrationPattern = [240, 120, 240, 120, 480];
    if (cookSoundOn) playCookAlarm();
    const hiddenWithNotifications = document.visibilityState === "hidden" && cookNotificationPermission === "granted" && "serviceWorker" in navigator;
    if (cookVibrationOn && !hiddenWithNotifications) startCookVibration();
    if (hiddenWithNotifications) {
      navigator.serviceWorker.ready.then((registration) => registration.showNotification("Đã hết giờ hẹn", {
        body: `Đến lúc kiểm tra bước ${cookingStep + 1} của món ${cookingRecipe.name}.`,
        icon: "/icon.svg",
        tag: `fresh-cook-timer-${key}`,
        data: { url: "/" },
        vibrate: cookVibrationOn ? vibrationPattern : [],
      } as NotificationOptions & { vibrate: number[] })).catch(() => {});
    }
  }, [cookTimerSeconds, cookingRecipe?.id, cookingStep, cookSoundOn, cookVibrationOn, cookNotificationPermission]);
  useEffect(() => {
    if (!cookAlarmVisible) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollContainer = mainScrollRef.current;
    const previousOverflow = scrollContainer?.style.overflow ?? "";
    if (scrollContainer) scrollContainer.style.overflow = "hidden";
    alarmDismissButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stopCookAlarm();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (scrollContainer) scrollContainer.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [cookAlarmVisible]);
  useEffect(() => { persist("fresh-cook-sound", cookSoundOn); }, [cookSoundOn]);
  useEffect(() => { persist("fresh-cook-vibration", cookVibrationOn); }, [cookVibrationOn]);
  const timerSecondsToPersist = cookTimerRunning ? null : cookTimerSeconds;
  useEffect(() => {
    if (!cookingRecipe) {
      try { localStorage.removeItem("fresh-active-cook-session"); } catch { /* storage can be unavailable */ }
      return;
    }
    persist("fresh-active-cook-session", {
      recipe: cookingRecipe,
      step: cookingStep,
      done,
      timerSeconds: timerSecondsToPersist,
      timerDeadline: cookTimerRunning ? cookTimerDeadline : null,
      timerRunning: cookTimerRunning,
    });
  }, [cookingRecipe, cookingStep, done, timerSecondsToPersist, cookTimerRunning, cookTimerDeadline]);
  useEffect(() => () => {
    voiceRecognitionRef.current?.stop();
    stopCookVibration();
  }, []);
  useEffect(() => {
    if (!pickerMessage) return;
    const timeout = window.setTimeout(() => { setPickerMessage(""); setPickerUndoId(""); setUndoRemovedStock(null); }, 6000);
    return () => window.clearTimeout(timeout);
  }, [pickerMessage]);
  const [cookingTips, setCookingTips] = useState<CookingTip[] | null>(null);
  const [cookingTipIndex, setCookingTipIndex] = useState(0);
  const [mnnmCatalog, setMnnmCatalog] = useState<MnnmCatalogItem[] | null>(null);
  const [mnnmRecent, setMnnmRecent] = useState<MnnmCatalogItem[]>([]);
  const [knorrRecipes, setKnorrRecipes] = useState<Recipe[] | null>(null);
  const [knorrHomeRecipes, setKnorrHomeRecipes] = useState<Recipe[] | null>(null);
  const [knorrLoad, setKnorrLoad] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [knorrRetry, setKnorrRetry] = useState(0);
  const [mnnmLoad, setMnnmLoad] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [mnnmRetry, setMnnmRetry] = useState(0);
  const [mnnmRecipeSelection, setMnnmRecipeSelection] = useState<MnnmCatalogItem | null>(null);
  const [mnnmRecipeDetail, setMnnmRecipeDetail] = useState<MnnmRecipeDetail | null>(null);
  const [mnnmDetailLoad, setMnnmDetailLoad] = useState<"idle" | "loading" | "error">("idle");
  const [sourceCatalogDetail, setSourceCatalogDetail] = useState<SourceRecipeCatalogItem | null>(null);
  const [activeLibraryResultGroup, setActiveLibraryResultGroup] = useState<LibraryResultGroup | null>(null);
  const [sourceRecipeDetail, setSourceRecipeDetail] = useState<SourceRecipeDetail | null>(null);
  const sourceRecipeLoad = (): "idle" | "loading" | "error" => "idle";
  const [selectedServingSourceId, setSelectedServingSourceId] = useState("");
  const sourceDetailRequest = useRef(0);
  useEffect(() => {
    if (page !== "home" || !cookingTips || cookingTips.length < 2) return;
    const interval = window.setInterval(() => {
      setCookingTipIndex((index) => {
        const next = Math.floor(Math.random() * (cookingTips.length - 1));
        return next >= index % cookingTips.length ? next + 1 : next;
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [page, cookingTips]);
  useEffect(() => {
    if (page !== "home" || cookingTips) return;
    const controller = new AbortController();
    fetch("/data/cooking-tips.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Cooking tips request failed"); return response.json(); })
      .then((data: { tips?: CookingTip[] }) => {
        if (Array.isArray(data.tips) && data.tips.every((tip) => tip.id && tip.title && tip.sourceUrl)) setCookingTips(data.tips);
      }).catch(() => {});
    return () => controller.abort();
  }, [page, cookingTips]);
  const allLibraryRecipes = useMemo(() => [...libraryRecipes, ...(knorrRecipes ?? [])], [knorrRecipes]);
  const [recommendationMatchFilter, setRecommendationMatchFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [recommendationMatchedOnly, setRecommendationMatchedOnly] = useState(false);
  const [recommendationLimit, setRecommendationLimit] = useState(RECOMMENDATION_PAGE_SIZE);
  useEffect(() => {
    const savedNeedsMnnm = page === "favorites" && favorites.some((id) => id.startsWith("monngonmoingay:"));
    if ((page !== "explore" && page !== "fridge" && !(page === "home" && homeFeatureShufflePending) && !savedNeedsMnnm)
      || (page === "fridge" && stock.length === 0 && !homeFeatureShufflePending && !savedNeedsMnnm)
      || mnnmCatalog) return;
    let cancelled = false;
    const controller = new AbortController();
    setMnnmLoad("loading");
    fetch("/data/mnnm/index.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("MNMN catalog request failed"); return response.json(); })
      .then((data: { recipes?: MnnmCatalogItem[] }) => {
        if (!Array.isArray(data.recipes) || !data.recipes.length || data.recipes.some((item) => !item.id || !item.name || !item.detail_shard) || new Set(data.recipes.map((item) => item.id)).size !== data.recipes.length) throw new Error("MNMN catalog validation failed");
        if (!cancelled) { setMnnmCatalog(data.recipes); setMnnmLoad("ready"); }
      })
      .catch(() => { if (!cancelled) setMnnmLoad("error"); });
    return () => { cancelled = true; controller.abort(); };
  }, [page, stock.length, favorites, mnnmCatalog, mnnmRetry, homeFeatureShufflePending]);
  useEffect(() => {
    if (page !== "home" || mnnmRecent.length) return;
    const controller = new AbortController();
    fetch("/data/mnnm/recent.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("MNMN latest recipes request failed"); return response.json(); })
      .then((data: { recipes?: MnnmCatalogItem[] }) => {
        if (Array.isArray(data.recipes)) setMnnmRecent(data.recipes.filter((item) => item.id && item.name && item.detail_shard && item.has_instructions));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [page, mnnmRecent.length]);
  useEffect(() => {
    if (page !== "home" || knorrHomeRecipes !== null) return;
    const controller = new AbortController();
    fetch("/data/knorr/home-recommendations.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Knorr home recommendations request failed"); return response.json(); })
      .then((data: unknown) => {
        if (!Array.isArray(data) || data.length > 24 || data.some((recipe) => recipe?.source?.title !== "Knorr Việt Nam" || !Array.isArray(recipe.steps) || recipe.steps.length === 0)) throw new Error("Knorr home recommendations are invalid");
        setKnorrHomeRecipes(data as Recipe[]);
      })
      .catch(() => { if (!controller.signal.aborted) setKnorrHomeRecipes([]); });
    return () => controller.abort();
  }, [page, knorrHomeRecipes]);
  useEffect(() => {
    const savedNeedsKnorr = page === "favorites" && favorites.some((id) => id.startsWith("knorr:"));
    if ((page !== "explore" && page !== "fridge" && !(page === "home" && homeFeatureShufflePending) && !savedNeedsKnorr)
      || (page === "fridge" && stock.length === 0 && !homeFeatureShufflePending && !savedNeedsKnorr)
      || knorrRecipes) return;
    let cancelled = false;
    const controller = new AbortController();
    setKnorrLoad("loading");
    fetch("/data/knorr/recipes.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Knorr recipe catalog request failed"); return response.json(); })
      .then((data: unknown) => {
        if (!Array.isArray(data) || !data.length || data.some((item) => !item?.id || !item?.name || item?.source?.title !== "Knorr Việt Nam") || new Set(data.map((item) => item.id)).size !== data.length) throw new Error("Knorr catalog validation failed");
        if (!cancelled) { setKnorrRecipes(data as Recipe[]); setKnorrLoad("ready"); }
      })
      .catch(() => { if (!cancelled) setKnorrLoad("error"); });
    return () => { cancelled = true; controller.abort(); };
  }, [page, stock.length, favorites, knorrRecipes, knorrRetry, homeFeatureShufflePending]);
  useEffect(() => { setLibraryLimit(30); }, [libraryQuery, libraryCategory, libraryStatus, librarySourceFilter, libraryDiet, libraryQuickOnly]);
  useEffect(() => {
    try {
      if (!migrateLocalStorage(localStorage)) setStorageWarning("Phiên bản dữ liệu lưu cao hơn ứng dụng này; ứng dụng giữ nguyên dữ liệu để tránh ghi đè.");
      else setCanPersist(true);
    } catch { setStorageWarning("Trình duyệt hiện không cho phép lưu dữ liệu. Thay đổi có thể mất khi đóng trang."); }
  }, []);
  useEffect(
    () => { if (canPersist && !persist("fridge-stock", stock)) setStorageWarning("Không thể lưu dữ liệu tủ lạnh. Hãy xuất bản sao lưu trước khi đóng trang."); },
    [stock, canPersist],
  );
  useEffect(
    () => { if (canPersist && !persist("fridge-prefs", prefs)) setStorageWarning("Không thể lưu tùy chọn trên thiết bị."); },
    [prefs, canPersist],
  );
  useEffect(
    () => { if (canPersist && !persist("fridge-favorites", favorites)) setStorageWarning("Không thể lưu thay đổi trên thiết bị."); },
    [favorites, canPersist],
  );
  useEffect(
    () => { if (canPersist && !persist("fridge-history", history)) setStorageWarning("Không thể lưu lịch sử trên thiết bị."); },
    [history, canPersist],
  );
  useEffect(
    () => { if (canPersist && !persist("fridge-cooked", cooked)) setStorageWarning("Không thể lưu lịch sử nấu trên thiết bị."); },
    [cooked, canPersist],
  );
  useEffect(() => {
    if (page !== "trending") {
      setActiveTrendingVideoId(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const preserveExistingVideos = videoFeedPreserveOnRefreshRef.current;
    videoFeedPreserveOnRefreshRef.current = false;
    setTrendingCatalogStatus("loading");
    if (!preserveExistingVideos) setTrendingVideos([]);
    setActiveTrendingVideoId(null);
    setVideoHistoryMessage("");
    const sessionSeed = (newVideoSessionSeed() + (++trendingSessionCounterRef.current * 0x9e3779b9)) >>> 0;
    void Promise.all([
      !preserveExistingVideos && cachedVideoCatalog && Date.now() - cachedVideoCatalog.loadedAt < 5 * 60 * 1000
        ? Promise.resolve(cachedVideoCatalog)
        : fetch("/data/youtube/catalog.json", { signal: controller.signal, cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`Video catalog unavailable (${response.status})`);
        return response.json() as Promise<{ schemaVersion: number; updatedAt: string; videos: YouTubeCatalogVideo[] }>;
      }),
      readVideoWatchHistory(),
    ]).then(([catalog, history]) => {
      if (cancelled) return;
      if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.videos)) throw new Error("Video catalog has an unsupported format");
      if (!("loadedAt" in catalog)) cachedVideoCatalog = { ...catalog, loadedAt: Date.now() };
      const freshVideos = freshYoutubeCatalogVideos(catalog.videos);
      const interests = [...(prefs.vegetarian ? ["món chay"] : []), ...(prefs.quick ? ["món nhanh"] : []), ...inferYoutubeFeedInterests(freshVideos, history, savedVideosRef.current.map((video) => video.url))];
      const ranked = rankYoutubeFeed(freshVideos, history, sessionSeed, interests);
      trendingWatchHistoryRef.current = history;
      setTrendingVideos(ranked);
      setVisibleTrendingCount(Math.min(12, ranked.length));
      setFailedTrendingVideoIds([]);
      seenTrendingVideoIdsRef.current = new Set();
      setTrendingFeedRefreshing(false);
      setTrendingCatalogStatus("ready");
    }).catch(() => {
      if (!cancelled && !controller.signal.aborted) {
        setTrendingFeedRefreshing(false);
        setTrendingCatalogStatus("error");
      }
    });
    return () => { cancelled = true; controller.abort(); };
  }, [page, prefs.vegetarian, prefs.quick, trendingCatalogRetry]);
  useEffect(() => {
    if (page !== "trending" || !trendingVideos.length || typeof IntersectionObserver === "undefined") return;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const videoId = (entry.target as HTMLElement).dataset.trendVideoId;
        if (!videoId) continue;
        ratios.set(videoId, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      const best = [...ratios.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!best || best[1] < 0.6) return;
      const nextId = best[0];
      setActiveTrendingVideoId((previousId) => {
        if (previousId === nextId) return previousId;
        if (previousId && !trendingWatchHistoryRef.current.some((record) => record.videoId === previousId && record.startedAt)) {
          void persistVideoHistoryEvent(previousId, "skipped");
        }
        if (!seenTrendingVideoIdsRef.current.has(nextId)) {
          seenTrendingVideoIdsRef.current.add(nextId);
          void persistVideoHistoryEvent(nextId, "seen");
        }
        return nextId;
      });
    }, { threshold: [0, 0.25, 0.5, 0.6, 0.8, 1] });
    document.querySelectorAll<HTMLElement>("[data-trend-video-id]").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [page, trendingVideos, visibleTrendingCount]);
  useEffect(() => {
    if (!resetVideoFeedScrollRef.current) return;
    resetVideoFeedScrollRef.current = false;
    requestAnimationFrame(() => trendingFeedRef.current?.scrollTo({ top: 0, behavior: "auto" }));
  }, [trendingVideos]);
  useEffect(() => {
    if (page !== "trending" || !activeTrendingVideoId) {
      setTrendingOverlayVisible(false);
      return;
    }
    setTrendingOverlayVisible(true);
    const timeout = window.setTimeout(() => setTrendingOverlayVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [page, activeTrendingVideoId]);
  useEffect(() => {
    if (page !== "trending" || !activeTrendingVideoId || failedTrendingVideoIds.includes(activeTrendingVideoId)) return;
    const host = youtubePlayerContainerRef.current;
    if (!host) return;
    let disposed = false;
    let player: YouTubePlayer | null = null;
    void loadYouTubePlayerApi().then((api) => {
      if (disposed || !youtubePlayerContainerRef.current) return;
      player = new api.Player(host, {
        events: {
          onReady: (event) => {
            youtubePlayerRef.current = event.target;
            event.target.playVideo();
          },
          onStateChange: (event) => {
            const currentSeconds = Math.max(0, event.target.getCurrentTime() || 0);
            if (event.data === api.PlayerState.PLAYING) void persistVideoHistoryEvent(activeTrendingVideoId, "started");
            if (event.data === api.PlayerState.PAUSED && currentSeconds >= 20) void persistVideoHistoryEvent(activeTrendingVideoId, "watched", currentSeconds);
            if (event.data === api.PlayerState.ENDED) {
              if (currentSeconds >= 20) void persistVideoHistoryEvent(activeTrendingVideoId, "watched", currentSeconds);
              void persistVideoHistoryEvent(activeTrendingVideoId, "completed");
            }
          },
          onError: () => {
            setFailedTrendingVideoIds((ids) => ids.includes(activeTrendingVideoId) ? ids : [...ids, activeTrendingVideoId]);
            setVideoHistoryMessage("YouTube không phát được clip này. Bạn có thể mở video gốc.");
          },
        },
      });
      youtubePlayerRef.current = player;
    }).catch(() => {
      if (!disposed) {
        setFailedTrendingVideoIds((ids) => ids.includes(activeTrendingVideoId) ? ids : [...ids, activeTrendingVideoId]);
        setVideoHistoryMessage("Không tải được trình phát YouTube. Hãy kiểm tra kết nối mạng.");
      }
    });
    return () => {
      disposed = true;
      if (youtubePlayerRef.current === player) youtubePlayerRef.current = null;
      if (player?.getIframe?.().isConnected) player.destroy();
    };
  }, [page, activeTrendingVideoId, failedTrendingVideoIds]);
  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState !== "visible") youtubePlayerRef.current?.pauseVideo();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);
  useEffect(() => { if (canPersist && !persist("fridge-saved-videos", savedVideos)) setStorageWarning("Không thể lưu danh sách video trên thiết bị."); }, [savedVideos, canPersist]);
  useEffect(() => { if (canPersist && !persist("fresh-shopping-list", shoppingItems)) setStorageWarning("Không thể lưu danh sách đi chợ trên thiết bị."); }, [shoppingItems, canPersist]);
  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>(".recipe-modal");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>(".modal-top button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setModal(null); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")]
        .filter((element) => element.offsetParent !== null);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [modal]);
  useEffect(() => {
    if (!editingStockId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeStockEditor();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [editingStockId]);
  const isExpired = (item: Stock) => item.fresh === "spoiled" || (!!item.expiresAt && (!isValidDateOnly(item.expiresAt) || new Date(`${item.expiresAt}T23:59:59`).getTime() < Date.now()));
  const expiryLabel = (item: Stock) => {
    if (!item.expiresAt) return "Chưa đặt hạn";
    if (!isValidDateOnly(item.expiresAt)) return "Ngày không hợp lệ";
    const expiry = new Date(`${item.expiresAt}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
    return days < 0 ? `Quá hạn ${Math.abs(days)} ngày` : days === 0 ? "Hết hạn hôm nay" : days === 1 ? "Còn 1 ngày" : `Còn ${days} ngày`;
  };
  const expiryDateInDays = (days: number) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const daysUntilExpiry = (item: Stock) => {
    if (!item.expiresAt || !isValidDateOnly(item.expiresAt)) return null;
    const expiry = new Date(`${item.expiresAt}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  };
  const stockLocation = (item: Stock): "fridge" | "freezer" | "pantry" => item.storageLocation ?? (item.frozen ? "freezer" : "fridge");
  const toggleStockEditor = (item: Stock) => {
    if (editingStockId === item.id) { closeStockEditor(); return; }
    if (expirySheetCloseTimer.current !== null) {
      window.clearTimeout(expirySheetCloseTimer.current);
      expirySheetCloseTimer.current = null;
    }
    setExpirySheetClosing(false);
    setEditingStockId(item.id);
    setEditingStockDraft({ ...item, storageLocation: stockLocation(item) });
    const initialDate = item.expiresAt && isValidDateOnly(item.expiresAt) ? new Date(`${item.expiresAt}T12:00:00`) : new Date();
    setExpiryCalendarMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setExpiryCalendarOpen(false);
    setExpiryUnitOpen(false);
  };
  const ids = useMemo(() => new Set(stock.filter((item) => !isExpired(item)).map((x) => x.id)), [stock]);
  const useSoonItems = useMemo(() => stock.filter((item) => !isExpired(item) && (
    item.fresh === "soon" || item.fresh === "urgent" || (!!item.expiresAt && (() => {
      const until = new Date(`${item.expiresAt}T23:59:59`).getTime() - Date.now();
      return until >= 0 && until <= 3 * 86400000;
    })())
  )).sort((a, b) => (a.expiresAt ?? "9999-12-31").localeCompare(b.expiresAt ?? "9999-12-31")).slice(0, 4), [stock]);
  const ingredientIndex = useMemo(() => buildIngredientIndex(ingredients), [ingredientCatalogVersion]);
  const sourceEngineRecipes = useMemo(() => [], []);
  const needsRecommendationEngine = stock.length > 0;
  const mnnmEngineRecipes = useMemo(() => !needsRecommendationEngine ? [] : (mnnmCatalog ?? []).filter((item) => item.has_ingredients && item.ingredient_names.length > 0).map((item) => ({
    id: item.id, name: item.name, ingredients: item.ingredient_names.map((name) => ({ ingredientId: name, sourceName: name, quantity: null, unit: "", optional: false })),
    method: "", totalTime: durationMinutes(item.total_time), servings: item.servings ? Number(item.servings.match(/\d+/)?.[0] ?? 0) || null : null,
    dataStatus: item.has_instructions ? "full_recipe" as const : "ingredients_only" as const, hasFullInstructions: item.has_instructions, steps: [],
  })), [mnnmCatalog, needsRecommendationEngine]);
  const allRecommendationRecipes = useMemo(() => needsRecommendationEngine ? [...allLibraryRecipes, ...sourceEngineRecipes, ...mnnmEngineRecipes] : [], [needsRecommendationEngine, sourceEngineRecipes, allLibraryRecipes, mnnmEngineRecipes]);
  const recommendations = useMemo(() => needsRecommendationEngine && recommendationRuntime ? recommendationRuntime.recommendRecipes({ stock, recipes: allRecommendationRecipes, preferences: { ...recommendationRuntime.defaultRecommendationPreferences, ...prefs }, ingredients, now: new Date() }) : [], [needsRecommendationEngine, recommendationRuntime, stock, prefs, allRecommendationRecipes, ingredientCatalogVersion]);
  const flexibleSuggestions = useMemo(() => flexibleSuggestionRuntime?.suggestFlexibleRecipes(
    stock.filter((item) => !isExpired(item)),
    ingredients,
    { avoid: prefs.avoid, vegan: prefs.vegan, vegetarian: prefs.vegetarian, avoidMeat: prefs.avoidMeat, avoidSeafood: prefs.avoidSeafood },
  ) ?? [], [flexibleSuggestionRuntime, stock, prefs, ingredientCatalogVersion]);
  const recommendationById = useMemo(() => new Map(recommendations.map((item) => [item.recipeId, item])), [recommendations]);
  const recommendationsByCategory = useMemo(() => ({
    ready: recommendations.filter((item) => item.category === "ready"),
    substitution: recommendations.filter((item) => item.category === "substitution"),
    almost: recommendations.filter((item) => item.category === "almost"),
    use_soon: recommendations.filter((item) => item.category === "use_soon"),
    discover: recommendations.filter((item) => item.category === "discover"),
  }), [recommendations]);
  const previewRecommendations = recommendationsByCategory.ready.length ? recommendationsByCategory.ready : recommendationsByCategory.substitution.length ? recommendationsByCategory.substitution : recommendationsByCategory.use_soon.length ? recommendationsByCategory.use_soon : recommendationsByCategory.almost;
  const homeGreeting = clockNow.getHours() < 11 ? "Chào buổi sáng" : clockNow.getHours() < 17 ? "Chào buổi chiều" : "Chào buổi tối";
  const isAfternoonSnackTime = clockNow.getHours() >= 13 && clockNow.getHours() < 17;
  const homeMealLabel = clockNow.getHours() < 11 ? "Bữa sáng nhà mình" : isAfternoonSnackTime ? "Bữa xế nhà mình" : clockNow.getHours() < 17 ? "Bữa trưa nhà mình" : "Bữa tối nhà mình";
  const homeDate = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(clockNow);
  const sourceRecommendationCards: Recipe[] = [];
  const mnnmRecipeCards = useMemo(() => (mnnmCatalog ?? []).filter((item) => item.has_ingredients && item.ingredient_names.length > 0).map((item) => mnnmRecipeFor(item)), [mnnmCatalog]);
  const recipeById = useMemo(() => new Map([...allLibraryRecipes, ...sourceRecommendationCards, ...mnnmRecipeCards].map((recipe) => [recipe.id, recipe])), [sourceRecommendationCards, allLibraryRecipes, mnnmRecipeCards]);
  const matchesNonMeatFilter = (names: string[]) => names.length > 0 && names.every((name) => {
    const resolved = resolveIngredientId(name, ingredientIndex);
    const category = ingredients.find((ingredient) => ingredient.id === resolved)?.category;
    return !!category && !["Thịt", "Hải sản"].includes(category);
  });
  const filteredRecommendations = useMemo(() => uniqueRecommendationsByRecipeTitle(filterRecommendationList(recommendationsByCategory[tab], recipeById, {
    query: libraryQuery,
    category: libraryCategory === "Tất cả" ? "" : libraryCategory,
    source: librarySourceFilter,
    match: recommendationMatchFilter,
    matchedOnly: recommendationMatchedOnly,
    quickOnly: libraryQuickOnly,
    status: libraryStatus === "Tất cả" ? "all" : libraryStatus as "full_recipe" | "ingredients_only" | "catalog_only",
  }).filter((item) => {
    if (!libraryDiet) return true;
    const recipe = recipeById.get(item.recipeId);
    return Boolean(recipe && matchesNonMeatFilter(recipe.ingredients.filter((ingredient) => !ingredient.optional).map((ingredient) => ingredient.sourceName ?? nameFor(ingredient.ingredientId))));
  }).sort((a, b) => {
    const priority = (id: string) => { const title = recipeById.get(id)?.source.title; return title === "Món Ngon Mỗi Ngày" ? 0 : title === "Knorr Việt Nam" ? 1 : 2; };
    return priority(a.recipeId) - priority(b.recipeId) || b.score - a.score;
  }), (item) => recipeById.get(item.recipeId)?.name ?? ""), [recommendationsByCategory, tab, recipeById, libraryQuery, libraryCategory, librarySourceFilter, libraryDiet, libraryQuickOnly, libraryStatus, recommendationMatchFilter, recommendationMatchedOnly, ingredientIndex]);
  const visibleRecommendations = filteredRecommendations.slice(0, recommendationLimit);
  const recommendationCategories = useMemo(() => [...new Set(recommendationsByCategory[tab].flatMap((item) => {
    const recipe = recipeById.get(item.recipeId);
    return recipe ? [recipe.category] : [];
  }))].sort((a, b) => a.localeCompare(b, "vi")), [recommendationsByCategory, tab, recipeById]);
  useEffect(() => { setRecommendationLimit(RECOMMENDATION_PAGE_SIZE); }, [tab, libraryQuery, libraryCategory, librarySourceFilter, recommendationMatchFilter, recommendationMatchedOnly, stock]);
  const recentRecipeIds = useMemo(() => visibleRecentRecipes(history, new Set(recipeById.keys())), [history, recipeById]);
  const filteredSavedRecipes = useMemo(() => favorites.map((id) => recipeById.get(id)).filter((recipe): recipe is Recipe => Boolean(recipe)).filter((recipe) => {
    const matchesQuery = canonical(`${recipe.name} ${recipe.ingredients.map((item) => item.sourceName ?? nameFor(item.ingredientId)).join(" ")}`).includes(canonical(savedQuery));
    const matchedCount = recipe.required.filter((id) => ids.has(id)).length;
    const isReadyByName = recipe.required.length > 0 && matchedCount === recipe.required.length;
    return matchesQuery && (savedFilter === "all" || (savedFilter === "ready" ? isReadyByName : !isReadyByName));
  }), [favorites, recipeById, savedQuery, savedFilter, ids]);
  const savedReadyCount = useMemo(() => favorites.map((id) => recipeById.get(id)).filter((recipe): recipe is Recipe => Boolean(recipe)).filter((recipe) => recipe.required.length > 0 && recipe.required.every((id) => ids.has(id))).length, [favorites, recipeById, ids]);
  const sourceFeatureRecipes: Recipe[] = [];
  const homeFeatureSourcesReady = (mnnmCatalog !== null || mnnmLoad === "error")
    && (knorrRecipes !== null || knorrLoad === "error");
  const homeFeatureRecipes = useMemo(() => {
    const sourcePriority = (recipe: Recipe) => recipe.source.title === "Món Ngon Mỗi Ngày" ? 0 : recipe.source.title === "Knorr Việt Nam" ? 1 : 2;
    const allCandidates = [...new Map([
      ...sourceFeatureRecipes,
      ...recipeById.values(),
      ...(mnnmCatalog ?? []).filter((item) => item.has_instructions).map((item) => mnnmRecipeFor(item)),
      ...previewRecommendations.map((item) => recipeById.get(item.recipeId)).filter((recipe): recipe is Recipe => Boolean(recipe)),
      ...favorites.map((id) => recipeById.get(id)).filter((recipe): recipe is Recipe => Boolean(recipe)),
      ...recentRecipeIds.map((id) => recipeById.get(id)).filter((recipe): recipe is Recipe => Boolean(recipe)),
      ...allLibraryRecipes,
    ].filter((recipe) => recipe.steps.length > 0 || (recipe.dataStatus === "full_recipe" && recipe.source.title === "Món Ngon Mỗi Ngày")).map((recipe) => [recipe.id, recipe])).values()]
      .sort((a, b) => sourcePriority(a) - sourcePriority(b));
    const canonicalCandidates = new Map<string, Recipe>();
    for (const recipe of allCandidates) {
      const key = canonical(recipe.name);
      if (key && !canonicalCandidates.has(key)) canonicalCandidates.set(key, recipe);
    }
    const recommended = stock.length ? previewRecommendations.map((item) => recipeById.get(item.recipeId)).filter((recipe): recipe is Recipe => Boolean(recipe)) : [];
    const recommendedNames = new Set(recommended.map((recipe) => canonical(recipe.name)));
    const remaining = [...canonicalCandidates.values()].filter((recipe) => !recommendedNames.has(canonical(recipe.name)));
    return [...recommended, ...remaining]
      .map((recipe) => ({ recipe, rank: Math.random() }))
      .sort((a, b) => b.rank - a.rank)
      .map(({ recipe }) => recipe);
  }, [previewRecommendations, recipeById, favorites, recentRecipeIds, allLibraryRecipes, mnnmCatalog, sourceFeatureRecipes, knorrRecipes, stock.length]);
  const newestMnnmRecipe = useMemo(() => stock.length === 0 && mnnmRecent.length > 0 ? mnnmRecipeFor(mnnmRecent[0]) : null, [stock.length, mnnmRecent]);
  const newestFeaturedName = newestMnnmRecipe ? canonical(newestMnnmRecipe.name) : "";
  const homeFeatureOptions = useMemo(() => [...(newestMnnmRecipe ? [newestMnnmRecipe] : []), ...homeFeatureRecipes.filter((recipe) => recipe.id !== newestMnnmRecipe?.id && canonical(recipe.name) !== newestFeaturedName)], [newestMnnmRecipe, newestFeaturedName, homeFeatureRecipes]);
  const homeFeatureOptionIndex = homeFeatureOptions.length ? homeFeatureIndex % homeFeatureOptions.length : 0;
  const shuffleHomeFeature = () => {
    if (homeFeatureShufflePending || homeFeatureOptions.length < 2) return;
    if (!homeFeatureSourcesReady) {
      setHomeFeatureShufflePending(true);
      return;
    }
    const randomIndex = Math.floor(Math.random() * (homeFeatureOptions.length - 1));
    setHomeFeatureIndex(randomIndex >= homeFeatureOptionIndex ? randomIndex + 1 : randomIndex);
  };
  const shuffleHomeFeatureRef = useRef(shuffleHomeFeature);
  shuffleHomeFeatureRef.current = shuffleHomeFeature;
  useEffect(() => {
    if (page !== "home") return;
    const interval = window.setInterval(() => shuffleHomeFeatureRef.current(), 60_000);
    return () => window.clearInterval(interval);
  }, [page]);
  useEffect(() => {
    if (!homeFeatureShufflePending || !homeFeatureSourcesReady) return;
    if (homeFeatureOptions.length > 1) {
      const randomIndex = Math.floor(Math.random() * (homeFeatureOptions.length - 1));
      setHomeFeatureIndex(randomIndex >= homeFeatureOptionIndex ? randomIndex + 1 : randomIndex);
    }
    setHomeFeatureShufflePending(false);
  }, [homeFeatureShufflePending, homeFeatureSourcesReady, homeFeatureOptions.length, homeFeatureOptionIndex]);
  const homeFeaturedRecipe = homeFeatureOptions[homeFeatureOptionIndex] ?? null;
  const homeFeaturedImage = homeFeaturedRecipe ? recipeImageFor(homeFeaturedRecipe.id) : undefined;
  const homeFeatureHasImage = Boolean(homeFeaturedImage || homeFeaturedRecipe?.imageUrl);
  const homeFeatureDescription = homeFeaturedRecipe?.description
    ?.replace(/(?:cùng\s+)?(?:Món Ngon Mỗi Ngày|Knorr Việt Nam|Knorr|MNMN)/gi, "")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  const homeMealCandidates = useMemo(() => {
    const preferred = previewRecommendations.map((item) => recipeById.get(item.recipeId)).filter((recipe): recipe is Recipe => Boolean(recipe));
    const sourceCatalogRecipes = [...(mnnmCatalog ?? []).filter((item) => item.has_instructions).map((item) => mnnmRecipeFor(item)), ...mnnmRecent.filter((item) => item.has_instructions).map((item) => mnnmRecipeFor(item))];
    const knorrCandidates = knorrRecipes ?? knorrHomeRecipes ?? [];
    const pool = [...new Map([...preferred, ...sourceCatalogRecipes, ...knorrCandidates, ...allLibraryRecipes]
      .filter((recipe) => (recipe.steps.length > 0 || (recipe.source.title === "Món Ngon Mỗi Ngày" && recipe.dataStatus === "full_recipe")) && recipe.id !== homeFeaturedRecipe?.id)
      .map((recipe) => [recipe.id, recipe])).values()];
    const byNewest = (a: Recipe, b: Recipe) => (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0) || a.name.localeCompare(b.name, "vi");
    const mnnmPriority = pool.filter((recipe) => recipe.source.title === "Món Ngon Mỗi Ngày").sort(byNewest);
    const knorrPriority = pool.filter((recipe) => recipe.source.title === "Knorr Việt Nam").sort(byNewest);
    const otherRecipes = pool.filter((recipe) => !["Món Ngon Mỗi Ngày", "Knorr Việt Nam"].includes(recipe.source.title));
    const prioritizedSources: Recipe[] = [];
    for (let index = 0; index < Math.max(mnnmPriority.length, knorrPriority.length); index += 1) {
      if (mnnmPriority[index]) prioritizedSources.push(mnnmPriority[index]);
      if (knorrPriority[index]) prioritizedSources.push(knorrPriority[index]);
    }
    pool.splice(0, pool.length, ...prioritizedSources, ...otherRecipes);
    if (isAfternoonSnackTime) {
      const snackPool = pool.filter((recipe) => recipe.category === "Món ăn nhẹ" || recipe.tags.some((tag) => /ăn vặt|món nhậu|ăn chơi|lai rai/i.test(tag)));
      if (snackPool.length) {
        const start = homeMealIndex % snackPool.length;
        return Array.from({ length: Math.min(3, snackPool.length) }, (_, index) => snackPool[(start + index) % snackPool.length]);
      }
    }
    const isSoup = (recipe: Recipe) => /^(canh|súp)\b/i.test(recipe.name);
    const recipeIngredientCategory = (recipe: Recipe, id: string) => {
      const recipeIngredient = recipe.ingredients.find((entry) => entry.ingredientId === id);
      const canonicalId = ingredientIndex.byId.has(id) ? id : resolveIngredientId(recipeIngredient?.sourceName ?? id, ingredientIndex);
      return ingredients.find((entry) => entry.id === canonicalId)?.category;
    };
    const recipeCanonicalIngredientId = (recipe: Recipe, id: string) => ingredientIndex.byId.has(id) ? id : resolveIngredientId(recipe.ingredients.find((entry) => entry.ingredientId === id)?.sourceName ?? id, ingredientIndex) ?? id;
    const heroProteins = new Set((homeFeaturedRecipe?.required ?? []).filter((id) => ["Thịt", "Hải sản", "Trứng"].includes(recipeIngredientCategory(homeFeaturedRecipe!, id) ?? "")).map((id) => recipeCanonicalIngredientId(homeFeaturedRecipe!, id)));
    const sharesHeroProtein = (recipe: Recipe) => recipe.required.some((id) => heroProteins.has(recipeCanonicalIngredientId(recipe, id)));
    const hasMainProtein = (recipe: Recipe) => recipe.required.some((id) => ["Thịt", "Hải sản", "Trứng"].includes(recipeIngredientCategory(recipe, id) ?? ""));
    const sections = [
      pool.filter((recipe) => recipe.category === "Món chính" && !isSoup(recipe) && !sharesHeroProtein(recipe)),
      pool.filter(isSoup),
      pool.filter((recipe) => recipe.category === "Món xào" && !hasMainProtein(recipe)),
    ];
    const diversifyMainDishes = (recipes: Recipe[]) => {
      const proteinGroup = (recipe: Recipe) => {
        const text = normalizeVietnamese(`${recipe.name} ${recipe.ingredients.map((item) => item.sourceName ?? item.ingredientId).join(" ")}`);
        if (/bo\b|bo xay|bo vien|bo luc lac/.test(text)) return "beef";
        if (/ga\b|vit\b|ngan\b/.test(text)) return "poultry";
        if (/ca\b|tom\b|muc\b|ngheu\b|oc\b|cua\b|hai san/.test(text)) return "seafood";
        if (/heo|lon|ba roi|ba chi|suon|gio heo|cha lua/.test(text)) return "pork";
        if (/trung/.test(text)) return "egg";
        return "other";
      };
      const groups = new Map<string, Recipe[]>();
      recipes.forEach((recipe) => groups.set(proteinGroup(recipe), [...(groups.get(proteinGroup(recipe)) ?? []), recipe]));
      const order = ["beef", "poultry", "seafood", "egg", "other", "pork"];
      const diversified: Recipe[] = [];
      for (let index = 0; diversified.length < recipes.length; index += 1) {
        order.forEach((group) => { const candidate = groups.get(group)?.[index]; if (candidate) diversified.push(candidate); });
      }
      return diversified;
    };
    sections[0] = diversifyMainDishes(sections[0]);
    const picked = sections.map((section) => section.length ? section[homeMealIndex % section.length] : undefined).filter((recipe): recipe is Recipe => Boolean(recipe));
    if (picked.length === 3 && new Set(picked.map((recipe) => recipe.id)).size === 3) return picked;
    const fallback = [...picked, ...pool.filter((recipe) => !picked.some((selected) => selected.id === recipe.id))];
    return fallback.slice(0, Math.min(3, pool.length));
  }, [previewRecommendations, recipeById, homeMealIndex, homeFeaturedRecipe, mnnmCatalog, mnnmRecent, knorrRecipes, knorrHomeRecipes, allLibraryRecipes, ingredientIndex, isAfternoonSnackTime]);
  const selectedAvoidIds = useMemo(() => new Set(prefs.avoid.map((value) => canonicalIngredientPreference(value, ingredientIndex))), [prefs.avoid, ingredientIndex]);
  const avoidCandidates = useMemo(() => {
    const query = canonical(avoidQuery);
    const known = ingredients
      .filter((ingredient) => !selectedAvoidIds.has(canonicalIngredientPreference(ingredient.id, ingredientIndex)))
      .filter((ingredient) => !query || canonical(`${ingredient.name} ${ingredient.aliases.join(" ")}`).includes(query));
    const custom = stock
      .filter((item) => !ingredientIndex.byId.has(item.id))
      .map((item) => ({ id: item.id, name: item.name ?? item.id.replace(/^custom-/, "").replace(/-/g, " "), aliases: [] as string[], emoji: "🥣" }))
      .filter((ingredient) => !selectedAvoidIds.has(canonicalIngredientPreference(ingredient.id, ingredientIndex)))
      .filter((ingredient) => !query || canonical(ingredient.name).includes(query));
    return [...known, ...custom].slice(0, 30);
  }, [avoidQuery, ingredientIndex, selectedAvoidIds, stock]);
  const recommendationName = (recipe: Recipe, id: string) => {
    const known = ingredients.find((ingredient) => ingredient.id === id);
    if (known) return known.name;
    return recipe.ingredients.find((item) => (resolveIngredientId(item.sourceName ?? item.ingredientId, ingredientIndex) ?? `custom:${normalizeVietnamese(item.sourceName ?? item.ingredientId)}`) === id)?.sourceName ?? id.replace(/^custom:/, "");
  };
  const quickPickerGroups = [
    { label: "Rau củ quả", ids: ["bean-sprout", "spinach", "rau-lan", "water-spinach", "potato", "tomato", "pumpkin", "winter-melon", "luffa", "okra", "bottle-gourd", "cucumber", "bok-choy", "cabbage", "carrot", "green-beans", "chayote", "eggplant", "corn", "lettuce", "scallion", "garlic", "onion", "mushroom"] },
    { label: "Thịt, cá & trứng", ids: ["egg", "quail-egg", "chicken", "pork", "beef", "shrimp", "fish", "fish-ball", "ha-cao", "cha-lua", "lap-xuong", "nem-chua-ran", "cha-gio", "tofu"] },
    { label: "Tinh bột", ids: ["rice", "noodle", "vermicelli", "glass-noodle", "nui", "hu-tieu", "fresh-noodle", "pho-noodle", "bread"] },
  ].map((group) => ({ ...group, items: group.ids.map((id) => ingredients.find((item) => item.id === id)).filter((item): item is (typeof ingredients)[number] => Boolean(item)) }));
  const ingredientSearchEntries = useMemo(() => ingredients.map((item) => {
    const nameKey = ingredientSearchKey(item.name);
    const aliasKeys = item.aliases.map(ingredientSearchKey);
    return { item, nameKey, aliasKeys, searchText: [nameKey, ...aliasKeys].join(" ") };
  }), [ingredientCatalogVersion]);
  const searchKey = ingredientSearchKey(deferredIngredientQuery);
  const searchItems = useMemo(() => {
    if (!searchKey) return [];
    const ranked: { item: Ingredient; score: number }[] = [];
    for (const entry of ingredientSearchEntries) {
      if (ids.has(entry.item.id) || !entry.searchText.includes(searchKey)) continue;
      const score = entry.nameKey === searchKey ? 0
        : entry.nameKey.startsWith(searchKey) ? 1
          : entry.aliasKeys.some((alias) => alias === searchKey) ? 2
            : entry.aliasKeys.some((alias) => alias.startsWith(searchKey)) ? 3
              : 4;
      const position = ranked.findIndex((candidate) => score < candidate.score);
      if (position >= 0) ranked.splice(position, 0, { item: entry.item, score });
      else if (ranked.length < 5) ranked.push({ item: entry.item, score });
      if (ranked.length > 5) ranked.pop();
    }
    return ranked.map(({ item }) => item);
  }, [ingredientSearchEntries, ids, searchKey]);
  function add(id: string) {
    setUndoRemovedStock(null);
    const ingredient = ingredients.find((item) => item.id === id);
    const name = ingredient?.name ?? id.replace(/^custom-/, "").replace(/-/g, " ");
    const alreadyAdded = stock.some((item) => {
      if (item.id === id) return true;
      const stockName = item.name ?? (item.id.startsWith("custom-") ? item.id.slice(7).replace(/-/g, " ") : item.id);
      return resolveIngredientId(stockName, ingredientIndex) === id;
    });
    if (!alreadyAdded) {
      setStock((items) => [...items, { id, quantity: "1", unit: ingredient?.defaultUnit ?? "phần", fresh: "fresh", expiresAt: "", frozen: false }]);
      setPickerMessage(`Đã thêm ${name} vào tủ lạnh.`);
      setPickerUndoId(id);
      showToast(`Đã thêm ${name} vào tủ lạnh.`);
    } else {
      setPickerMessage(`${name} đã có trong tủ lạnh.`);
      setPickerUndoId("");
    }
    setQuery("");
  }
  function addCustom() {
    setUndoRemovedStock(null);
    const name = query.trim();
    if (!name) return;
    const knownIngredientId = resolveIngredientId(name, ingredientIndex);
    if (knownIngredientId) {
      add(knownIngredientId);
      return;
    }
    const id = "custom-" + canonical(name).replace(/[^a-z0-9]+/g, "-");
    const alreadyAdded = stock.some((item) => item.id === id);
    if (!alreadyAdded) {
      setStock((s) => [
        ...s,
        { id, name, quantity: "1", unit: "phần", fresh: "fresh", expiresAt: "", frozen: false },
      ]);
      setPickerMessage(`Đã thêm ${name} vào tủ lạnh.`);
      setPickerUndoId(id);
      showToast(`Đã thêm ${name} vào tủ lạnh.`);
    } else {
      setPickerMessage(`${name} đã có trong tủ lạnh.`);
      setPickerUndoId("");
    }
    setQuery("");
  }
  function openRecipe(r: Recipe, preserveVariantGroup = false) {
    if (r.source.title === "Món Ngon Mỗi Ngày") {
      const item = mnnmCatalog?.find((entry) => entry.id === r.id) ?? mnnmRecent.find((entry) => entry.id === r.id);
      if (item) { openMnnmRecipe(item, preserveVariantGroup); return; }
    }
    if (!preserveVariantGroup) setActiveLibraryResultGroup(null);
    sourceDetailRequest.current += 1;
    setSourceCatalogDetail(null);
    setSourceRecipeDetail(null);
    setMnnmRecipeSelection(null);
    setMnnmRecipeDetail(null);
    setMnnmDetailLoad("idle");
    setModal(r);
    setDone([]);
    setHistory((h) => recordRecentRecipe(h, r.id));
  }
  function openMnnmRecipe(item: MnnmCatalogItem, preserveVariantGroup = false) {
    if (!preserveVariantGroup) setActiveLibraryResultGroup(null);
    const requestId = ++sourceDetailRequest.current;
    setSourceCatalogDetail(null);
    setSourceRecipeDetail(null);
    setSelectedServingSourceId("");
    setMnnmRecipeSelection(item);
    setMnnmRecipeDetail(null);
    setMnnmDetailLoad("loading");
    setModal(mnnmRecipeFor(item));
    setDone([]);
    setHistory((items) => recordRecentRecipe(items, item.id));
    loadMnnmRecipeDetail(item).then((detail) => {
      if (sourceDetailRequest.current !== requestId) return;
      setMnnmRecipeDetail(detail);
      setMnnmDetailLoad("idle");
      setModal(mnnmRecipeFor(item, detail));
    }).catch(() => {
      if (sourceDetailRequest.current === requestId) setMnnmDetailLoad("error");
    });
  }
  function openSourceCatalogItem(_item: SourceRecipeCatalogItem, _preserveVariantGroup = false) { return; }
  function selectSourceServingOption(_item: SourceRecipeCatalogItem, _sourceRecipeId: string) { return; }
  function openLibraryCandidate(group: LibraryResultGroup, candidate: LibraryResultEntry = group.primary) {
    setActiveLibraryResultGroup(group);
    if (candidate.kind === "recipe") openRecipe(candidate.recipe, true);
    else if (candidate.kind === "source") openSourceCatalogItem(candidate.item, true);
    else openMnnmRecipe(candidate.item, true);
  }
  function saveVideoLink() {
    const parsed = parseSupportedVideoUrl(videoUrlDraft);
    if (!parsed) { setVideoFormError("Dán link https hợp lệ từ YouTube, TikTok hoặc Facebook."); return; }
    if (savedVideos.some((video) => video.url === parsed.url)) { setVideoFormError("Link này đã có trong danh sách."); return; }
    setSavedVideos((items) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, platform: parsed.platform, url: parsed.url, note: videoNoteDraft.trim(), savedAt: new Date().toISOString() }, ...items]);
    setVideoUrlDraft(""); setVideoNoteDraft(""); setVideoFormError("");
  }
  function toggleSavedTrendingVideo(video: TrendingVideo) {
    const url = video.videoUrl;
    const existing = savedVideos.some((saved) => saved.url === url);
    if (existing) {
      setSavedVideos((items) => items.filter((saved) => saved.url !== url));
      return;
    }
    setSavedVideos((items) => [{ id: video.id, platform: "youtube", url, note: video.title, savedAt: new Date().toISOString() }, ...items]);
  }
  function toggleFavorite(id: string) {
    setFavorites((f) =>
      f.includes(id) ? f.filter((x) => x !== id) : [id, ...f],
    );
  }
  function addShoppingItem(name: string, quantity = "", unit = "", recipeId?: string) {
    const cleanName = canonicalShoppingIngredientName(name, ingredientIndex);
    if (!cleanName) return;
    const key = shoppingIngredientIdentity(cleanName, ingredientIndex);
    setShoppingItems((items) => {
      const existing = items.find((item) => shoppingIngredientIdentity(item.name, ingredientIndex) === key);
      if (existing) return items.map((item) => item.id === existing.id
        ? { ...item, quantity: item.quantity || quantity, unit: item.unit || unit, recipeId: item.recipeId ?? recipeId }
        : item);
      return [...items, { id: `shop-${canonical(cleanName).replace(/[^a-z0-9]+/g, "-")}`, name: cleanName, quantity, unit, checked: false, recipeId }];
    });
    setShoppingQuery("");
  }
  function addMissingRecipesToShopping(recipesToShop: Recipe[]) {
    const pantryKeys = new Set(stock.filter((item) => !isExpired(item)).flatMap((item) => [canonical(item.id), canonical(item.name ?? nameFor(item.id))]));
    const missing = new Map<string, { name: string; quantity: string; unit: string; recipeId: string }>();
    recipesToShop.forEach((recipe) => recipe.ingredients.filter((item) => !item.optional).forEach((item) => {
      const name = item.sourceName ?? nameFor(item.ingredientId);
      const resolved = resolveIngredientId(name, ingredientIndex);
      if (pantryKeys.has(canonical(item.ingredientId)) || pantryKeys.has(canonical(name)) || (resolved && pantryKeys.has(canonical(resolved)))) return;
      const displayName = canonicalShoppingIngredientName(ingredients.find((entry) => entry.id === item.ingredientId)?.name ?? name, ingredientIndex);
      const key = shoppingIngredientIdentity(displayName, ingredientIndex);
      if (!missing.has(key)) missing.set(key, {
        name: displayName,
        quantity: item.quantity === null ? "" : formatRecipeQuantity(item.quantity),
        unit: item.quantity === null ? "" : item.unit,
        recipeId: recipe.id,
      });
    }));
    const additions = [...missing.values()];
    if (additions.length) setShoppingItems((items) => {
      let next = [...items];
      additions.forEach((addition) => {
        const existing = next.find((item) => shoppingIngredientIdentity(item.name, ingredientIndex) === shoppingIngredientIdentity(addition.name, ingredientIndex));
        if (existing) next = next.map((item) => item.id === existing.id ? {
          ...item,
          recipeId: item.recipeId ?? addition.recipeId,
          quantity: item.quantity || addition.quantity,
          unit: item.unit || addition.unit,
        } : item);
        else next.push({ id: `shop-${canonical(addition.name).replace(/[^a-z0-9]+/g, "-")}`, name: addition.name, quantity: addition.quantity, unit: addition.unit, checked: false, recipeId: addition.recipeId });
      });
      return next;
    });
    setShoppingQuery("");
    setModal(null);
    setPage("shopping");
  }
  function addMissingToShopping(recipe: Recipe) {
    addMissingRecipesToShopping([recipe]);
  }
  function startCooking(recipe: Recipe) {
    if (!recipe.steps.length) return;
    const resumeSession = cookingRecipe?.id === recipe.id;
    setCookReturnPage(page);
    setCookReturnRecipe(recipe);
    stopCookAlarm();
    setCookingRecipe(recipe);
    if (resumeSession) setCookingStep((step) => Math.min(step, recipe.steps.length - 1));
    else {
      setCookingStep(0);
      const duration = recipe.steps[0]?.durationMinutes;
      setCookTimerSeconds(typeof duration === "number" && duration > 0 ? Math.round(duration * 60) : null);
      setCookTimerRunning(false);
      setCookTimerDeadline(null);
      setDone([]);
    }
    setCookVoiceListening(false);
    setCookVoiceMessage("Chạm mic để bật lệnh giọng nói");
    voiceRecognitionRef.current?.stop();
    setModal(null);
    setPage("cook");
  }
  function returnToRecipeFromCooking() {
    stopCookAlarm();
    setCookTimerRunning(false);
    setCookTimerDeadline(null);
    voiceRecognitionRef.current?.stop();
    setCookVoiceListening(false);
    setModal(cookReturnRecipe ?? cookingRecipe);
    setPage(cookReturnPage);
  }
  function finishCooking() {
    if (!cookingRecipe) return;
    stopCookAlarm();
    setCooked((items) => [cookingRecipe.id, ...items.filter((id) => id !== cookingRecipe.id)]);
    setCookingRecipe(null);
    setPage("favorites");
  }
  function playCookAlarm() {
    const audio = alarmAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => setCookVoiceMessage("Trình duyệt chặn âm thanh · chạm “Thử âm thanh” để bật"));
  }
  function stopCookVibration() {
    if (vibrationIntervalRef.current !== null) window.clearInterval(vibrationIntervalRef.current);
    if (vibrationTimeoutRef.current !== null) window.clearTimeout(vibrationTimeoutRef.current);
    vibrationIntervalRef.current = null;
    vibrationTimeoutRef.current = null;
    if ("vibrate" in navigator) navigator.vibrate(0);
  }
  function startCookVibration() {
    if (!("vibrate" in navigator)) return;
    stopCookVibration();
    const pulse = () => navigator.vibrate([450, 180, 450]);
    pulse();
    vibrationIntervalRef.current = window.setInterval(pulse, 1250);
    vibrationTimeoutRef.current = window.setTimeout(() => {
      stopCookVibration();
    }, 24_581);
  }
  function stopCookAlarm() {
    const audio = alarmAudioRef.current;
    const wasPlaying = Boolean(audio && !audio.paused) || vibrationIntervalRef.current !== null;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    stopCookVibration();
    setCookAlarmVisible(false);
    if (wasPlaying) setCookVoiceMessage("Đã tắt âm báo");
  }
  function primeCookAudio() {
    const audio = alarmAudioRef.current;
    if (!cookSoundOn || !audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.muted = true;
    void audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(() => { audio.muted = false; });
  }
  function startOrPauseCookTimer() {
    if (cookTimerSeconds === null) {
      setCookVoiceMessage("Chọn thời lượng bằng nút +1 phút để bắt đầu hẹn giờ");
      return;
    }
    if (cookTimerRunning) {
      const remaining = cookTimerDeadline === null ? cookTimerSeconds : Math.max(0, Math.ceil((cookTimerDeadline - Date.now()) / 1000));
      setCookTimerSeconds(remaining);
      setCookTimerDeadline(null);
      setCookTimerRunning(false);
      return;
    }
    if (cookTimerSeconds <= 0) return;
    primeCookAudio();
    setCookTimerDeadline(Date.now() + cookTimerSeconds * 1000);
    setCookTimerRunning(true);
  }
  function addCookTimerMinute() {
    setCookTimerSeconds((seconds) => (seconds ?? 0) + 60);
    if (cookTimerRunning) setCookTimerDeadline((deadline) => deadline === null ? null : deadline + 60_000);
  }
  function resetCookTimer() {
    stopCookAlarm();
    const duration = activeCookStep?.durationMinutes;
    setCookTimerSeconds(typeof duration === "number" && duration > 0 ? Math.round(duration * 60) : null);
    setCookTimerDeadline(null);
    setCookTimerRunning(false);
    alarmFiredForRef.current = "";
  }
  async function enableCookNotifications() {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setCookNotificationPermission("unsupported");
      setCookVoiceMessage("Trình duyệt chưa hỗ trợ thông báo nền");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setCookNotificationPermission(permission);
      setCookVoiceMessage(permission === "granted" ? "Đã bật thông báo khi app còn chạy nền" : "Chưa được cấp quyền thông báo · app đóng sẽ không báo");
    } catch {
      setCookVoiceMessage("Không bật được thông báo · kiểm tra cài đặt trình duyệt");
    }
  }
  function toggleCookVoice() {
    if (cookVoiceListening) {
      voiceRecognitionRef.current?.stop();
      setCookVoiceListening(false);
      setCookVoiceMessage("Lệnh giọng nói đã tắt");
      return;
    }
    const Voice = (window as VoiceRecognitionWindow).SpeechRecognition ?? (window as VoiceRecognitionWindow).webkitSpeechRecognition;
    if (!Voice) {
      setCookVoiceMessage("Trình duyệt chưa hỗ trợ lệnh giọng nói · dùng nút bước bên dưới");
      return;
    }
    const recognition = new Voice();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]?.[0]?.transcript?.trim() ?? "";
      const command = normalizeVietnamese(result);
      if (/tiep theo|qua buoc|xong buoc/.test(command)) {
        stopCookAlarm();
        setDone((steps) => steps.includes(cookingStepRef.current) ? steps : [...steps, cookingStepRef.current]);
        setCookingStep((step) => cookingRecipe ? Math.min(cookingRecipe.steps.length - 1, step + 1) : step);
        setCookVoiceMessage(`Đã nghe “${result}” · chuyển bước`);
      } else if (/hoan tat|xong mon/.test(command)) {
        if (cookingRecipe && cookingStepRef.current >= cookingRecipe.steps.length - 1) {
          setCookVoiceMessage(`Đã nghe “${result}”`);
          finishCooking();
        } else setCookVoiceMessage(`Đã nghe “${result}” · hãy hoàn thành các bước còn lại trước`);
      } else if (/tat mic|dung mic/.test(command)) {
        voiceRecognitionRef.current?.stop();
        setCookVoiceListening(false);
        setCookVoiceMessage("Lệnh giọng nói đã tắt");
      } else if (result) setCookVoiceMessage(`Đã nghe “${result}” · thử nói “tiếp theo”`);
    };
    recognition.onerror = () => {
      setCookVoiceListening(false);
      setCookVoiceMessage("Không nhận được giọng nói · dùng nút bước bên dưới");
    };
    recognition.onend = () => setCookVoiceListening(false);
    voiceRecognitionRef.current = recognition;
    try {
      recognition.start();
      setCookVoiceListening(true);
      setCookVoiceMessage("Đang nghe · nói “tiếp theo” hoặc “hoàn tất món”");
    } catch {
      setCookVoiceListening(false);
      setCookVoiceMessage("Chưa bật được mic · thử lại hoặc dùng nút bước bên dưới");
    }
  }
  function showTab(t: "ready" | "substitution" | "almost" | "use_soon" | "discover") {
    setTab(t);
    setDiscoveryMode("fridge");
    if (page === "fridge") {
      window.requestAnimationFrame(() => document.getElementById("fridge-recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    setPage("explore");
  }
  function showBestTab() {
    if (page === "fridge") {
      showTab("ready");
      return;
    }
    const best = ["ready", "substitution", "use_soon", "almost", "discover"].find((candidate) => recommendationsByCategory[candidate as keyof typeof recommendationsByCategory].length) as "ready" | "substitution" | "almost" | "use_soon" | "discover" | undefined;
    showTab(best ?? "ready");
  }
  const visibleTrendingVideos = trendingVideos.slice(0, visibleTrendingCount);
  const label =
    page === "home"
      ? "Trang chủ"
      : page === "fridge"
        ? "Tủ lạnh của tôi"
        : page === "favorites"
          ? "Đã lưu"
          : page === "explore"
            ? "Khám phá món Việt"
          : page === "trending"
            ? "Video món ăn"
          : page === "shopping"
            ? "Sổ đi chợ"
          : page === "cook"
            ? "Đang nấu"
          : "Sở thích nấu";
  const shoppingCategoryFor = (name: string) => shoppingIngredientCategory(name, ingredientIndex);
  const libraryCategories = useMemo(() => ["Tất cả", ...new Set([
    ...allLibraryRecipes.map((recipe) => recipe.category),
    ...(mnnmCatalog ?? []).map((item) => item.category),
    ...(knorrRecipes ?? []).map((recipe) => recipe.category),
  ])], [allLibraryRecipes, mnnmCatalog, knorrRecipes]);
  const exploreMethodCategories = ["Món canh", "Món kho", "Món xào", "Món nước", "Món ăn nhẹ", "Món chay"]
    .map((name) => libraryCategories.find((category) => category.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")))
    .filter((category): category is string => Boolean(category));
  const libraryResults = useMemo(() => {
    const librarySourceResults = allLibraryRecipes.filter((recipe) => {
      if (librarySourceFilter === "mnnm") return false;
      if (librarySourceFilter === "knorr" && recipe.source.title !== "Knorr Việt Nam") return false;
      if (librarySourceFilter === "internal" && (recipe.id.startsWith("copper:") || recipe.source.title === "Knorr Việt Nam")) return false;
      if (librarySourceFilter === "copper" && !recipe.id.startsWith("copper:")) return false;
      if (librarySourceFilter === "other" && recipe.source.title === "Knorr Việt Nam") return false;
      const recipeIngredients = recipe.ingredients.map((item) => `${item.sourceName ?? item.ingredientId} ${nameFor(item.ingredientId)}`).join(" ");
      const matchesQuery = canonical(`${recipe.name} ${recipeIngredients}`).includes(canonical(libraryQuery));
      const matchesCategory = libraryCategory === "Tất cả" || recipe.category === libraryCategory;
      const matchesStatus = libraryStatus === "Tất cả" || recipe.dataStatus === libraryStatus;
      const matchesQuick = !libraryQuickOnly || (recipe.totalTime != null && recipe.totalTime <= 30);
      const matchesDiet = !libraryDiet || (recipe.dataStatus === "full_recipe" && matchesNonMeatFilter(recipe.ingredients.filter((item) => !item.optional).map((item) => item.sourceName ?? nameFor(item.ingredientId))));
      return matchesQuery && matchesCategory && matchesStatus && matchesDiet && matchesQuick;
    });
    const mnnmCatalogResults = (librarySourceFilter === "all" || librarySourceFilter === "mnnm" ? mnnmCatalog ?? [] : []).filter((item) => {
      const searchText = `${item.name} ${item.description} ${item.ingredient_names.join(" ")} ${item.tags.join(" ")}`;
      if (!canonical(searchText).includes(canonical(libraryQuery))) return false;
      if (libraryCategory !== "Tất cả" && item.category !== libraryCategory) return false;
      const status = item.has_instructions ? "full_recipe" : item.has_ingredients ? "ingredients_only" : "catalog_only";
      if (libraryStatus !== "Tất cả" && status !== libraryStatus) return false;
      const totalMinutes = durationMinutes(item.total_time);
      if (libraryQuickOnly && (totalMinutes === null || totalMinutes > 30)) return false;
      if (libraryDiet && !matchesNonMeatFilter(item.ingredient_names)) return false;
      return true;
    });
    const candidates: LibraryResultEntry[] = [
      ...librarySourceResults.map((recipe) => ({ kind: "recipe" as const, key: recipe.id, recipe, name: recipe.name })),
      ...mnnmCatalogResults.map((item) => ({ kind: "mnnm" as const, key: item.id, item, name: item.name })),
    ];
    candidates.sort((a, b) => {
      const relevance = recipeSearchRelevance(a.name, libraryQuery) - recipeSearchRelevance(b.name, libraryQuery);
      const sourcePriority = (entry: LibraryResultEntry) => entry.kind === "mnnm" ? 0 : entry.kind === "recipe" && entry.recipe.source.title === "Knorr Việt Nam" ? 1 : 2;
      const recipeDate = (entry: LibraryResultEntry) => entry.kind === "mnnm"
        ? Date.parse(entry.item.published_at || entry.item.updated_at || "") || 0
        : entry.kind === "recipe" && entry.recipe.source.title === "Knorr Việt Nam" ? Date.parse(entry.recipe.publishedAt ?? "") || 0 : 0;
      return relevance || sourcePriority(a) - sourcePriority(b) || recipeDate(b) - recipeDate(a) || a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
    });
    return groupCanonicalRecipeCandidates(
      candidates,
      (entry) => entry.name,
      (entry) => entry.kind === "recipe" ? entry.recipe.ingredients.map((item) => item.sourceName ?? item.ingredientId) : entry.kind === "source" ? entry.item.ingredients ?? [] : entry.item.ingredient_names,
      (entry) => entry.kind === "recipe" ? entry.recipe.source.title : entry.kind,
    );
  }, [allLibraryRecipes, librarySourceFilter, libraryQuery, libraryCategory, libraryStatus, libraryQuickOnly, libraryDiet, ingredientCatalogVersion, mnnmCatalog]);
  const visibleLibraryResults = libraryResults.slice(0, libraryLimit);
  const activeCookStep = cookingRecipe?.steps[cookingStep];
  const nextCookStep = cookingRecipe?.steps[cookingStep + 1];
  const activeStepTitle = activeCookStep?.instruction.split(/[.!?\n]/, 1)[0]?.trim() ?? "";
  const cookTimerLabel = cookTimerSeconds === null ? "--:--" : `${String(Math.floor(cookTimerSeconds / 60)).padStart(2, "0")}:${String(cookTimerSeconds % 60).padStart(2, "0")}`;
  const editingStock = editingStockId ? editingStockDraft?.id === editingStockId ? editingStockDraft : stock.find((item) => item.id === editingStockId) ?? null : null;
  const editingStockIngredient = editingStock ? ingredients.find((item) => item.id === editingStock.id) : undefined;
  const editingStockName = editingStock ? editingStockIngredient?.name ?? editingStock.name ?? editingStock.id.replace("custom-", "").replace(/-/g, " ") : "";
  const editingExpiryDays = editingStock ? daysUntilExpiry(editingStock) : null;
  const editingExpiryDateLabel = editingStock?.expiresAt && isValidDateOnly(editingStock.expiresAt)
    ? new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${editingStock.expiresAt}T12:00:00`))
    : "Chưa chọn ngày hết hạn";
  const expiryCalendarYear = expiryCalendarMonth.getFullYear();
  const expiryCalendarMonthIndex = expiryCalendarMonth.getMonth();
  const expiryCalendarFirstOffset = (new Date(expiryCalendarYear, expiryCalendarMonthIndex, 1).getDay() + 6) % 7;
  const expiryCalendarDaysInMonth = new Date(expiryCalendarYear, expiryCalendarMonthIndex + 1, 0).getDate();
  const expiryCalendarMonthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(expiryCalendarMonth);
  const expiryCalendarToday = expiryDateInDays(0);
  const updateEditingStock = (changes: Partial<Stock>) => {
    if (!editingStockId) return;
    setEditingStockDraft((item) => item?.id === editingStockId ? { ...item, ...changes } : item);
  };
  return (
    <div className={`app app-page-${page}`}>
      {introMounted && <div className={`app-intro${showIntro ? "" : " is-exiting"}`} role="status" aria-label="Nấu Đại Đi đang khởi động" aria-hidden={!showIntro} onTransitionEnd={(event) => { if (!showIntro && event.propertyName === "opacity") setIntroMounted(false); }}>
        <div className="approved-intro-art">
          <img ref={(node) => { introImageRef.current = node; node?.setAttribute("fetchpriority", "high"); }} src="/images/intro/kitchen-warm-a-base.webp?v=9" alt="Minh họa nồi súp màu cam cùng rau củ trên nền kem" decoding="async" />
          <img className="intro-sprite-item intro-lid-item" src="/images/intro/lid-sprite.webp?v=5" alt="" aria-hidden="true" />
          <span className="intro-item intro-steam-reveal" aria-hidden="true">
            <img className="intro-steam-item" src="/images/intro/steam-sprite.webp?v=10" alt="" />
            <img className="intro-steam-tint" src="/images/intro/steam-sprite.webp?v=10" alt="" />
          </span>
          <img className="intro-sprite-item intro-tomato-item" src="/images/intro/tomato-sprite.webp?v=5" alt="" aria-hidden="true" />
          <img className="intro-sprite-item intro-scallion-item" src="/images/intro/scallion-sprite.webp?v=5" alt="" aria-hidden="true" />
          <img className="intro-sprite-item intro-carrot-item" src="/images/intro/carrot-sprite.webp?v=5" alt="" aria-hidden="true" />
          <span className="intro-progress-track" aria-hidden="true"><span className="intro-progress-fill" /></span>
        </div>
      </div>}
      <header className={`topbar${page === "cook" ? " cook-topbar" : page === "trending" ? " video-topbar" : ""}`} onTouchStart={page === "trending" ? beginVideoFeedPull : undefined} onTouchMove={page === "trending" ? moveVideoFeedPull : undefined} onTouchEnd={page === "trending" ? finishVideoFeedPull : undefined} onTouchCancel={cancelVideoFeedPull}>
        {page === "cook" ? <>
          <button className="cook-close" onClick={returnToRecipeFromCooking} aria-label="Quay lại chi tiết món ăn"><ArrowLeft size={20}/></button>
          <div className="cook-header-title"><small>{cookingRecipe?.name ?? "Đang nấu"}</small><strong>Đang nấu · Bước {cookingRecipe ? cookingStep + 1 : 0}/{cookingRecipe?.steps.length ?? 0}</strong></div>
          <button className={`cook-awake-toggle${cookKeepAwake ? " is-awake" : ""}`} onClick={() => setCookKeepAwake((awake) => !awake)} disabled={!("wakeLock" in navigator)} aria-pressed={cookKeepAwake} aria-label={cookKeepAwake ? "Tắt giữ màn hình sáng" : "Giữ màn hình sáng"} title={"wakeLock" in navigator ? "Giữ màn hình sáng trong lúc nấu" : "Trình duyệt này chưa hỗ trợ giữ màn hình sáng"}><Sun size={16}/><span>{cookKeepAwake ? "Đang sáng" : "Giữ sáng"}</span></button>
          <button className={`cook-handsfree${cookVoiceListening ? " is-listening" : ""}`} onClick={toggleCookVoice} aria-pressed={cookVoiceListening} aria-label={cookVoiceListening ? "Đang nghe" : "Rảnh tay"}><Mic size={16}/>{cookVoiceListening ? "Đang nghe" : "Rảnh tay"}</button>
        </> : page === "trending" ? <>
          <button className="video-back" onClick={() => setPage(trendingReturnPageRef.current)} aria-label="Quay lại"><ArrowLeft size={20}/></button>
          <span className="video-topbar-title">Video hướng dẫn nấu ăn</span>
          {trendingCatalogStatus === "error" && trendingVideos.length > 0 && <span className="video-refresh-status" role="status">Chưa cập nhật được</span>}
        </> : <>
          <div className="brand"><img className="brand-logo-image" src="/icon.svg" alt=""/><span className="brand-wordmark"><span>Nấu</span><span>Đại</span><span>Đi</span></span></div>
          <div className="topbar-actions">
            <button className={`topbar-action${page === "shopping" ? " is-active" : ""}`} onClick={() => setPage("shopping")} aria-label={`Sổ đi chợ${shoppingItems.filter((item) => !item.checked).length ? `, còn ${shoppingItems.filter((item) => !item.checked).length} món` : ""}`}>
              <ShoppingBasket size={19}/>{shoppingItems.filter((item) => !item.checked).length > 0 && <span className="topbar-count">{shoppingItems.filter((item) => !item.checked).length}</span>}
            </button>
            <button className="avatar" onClick={() => setPage("settings")} aria-label="Sở thích"><Settings size={18}/></button>
          </div>
        </>}
      </header>
      <main ref={mainScrollRef} className={page === "cook" ? "cook-mode-main" : ""}>
        {storageWarning && <div className="storage-alert" role="status">{storageWarning}</div>}
        {page === "home" && (
          <>
            <section className="home-welcome" aria-labelledby="home-title">
              <div className="home-welcome-meta"><span><span className="home-live-dot"/>{homeDate}</span><span className="home-weather-note"><CookingPot size={15}/> {homeMealLabel}</span></div>
              <h1 id="home-title">{homeGreeting}!</h1>
              <p>Hôm nay trong gian bếp nhỏ thơm mùi gì thế?</p>
            </section>
            <form className="home-search" role="search" aria-label="Tìm món ăn" onSubmit={(event) => {
              event.preventDefault();
              setLibraryCategory("Tất cả");
              setLibraryStatus("Tất cả");
              setLibrarySourceFilter("all");
              setLibraryDiet(false);
              setLibraryQuickOnly(false);
              setDiscoveryMode("all");
              setPage("explore");
            }}>
              <Search size={18} aria-hidden="true"/>
              <input aria-label="Tìm món hoặc nguyên liệu" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Tìm món ngon, ví dụ: trứng…" />
              <button type="submit" aria-label="Tìm món"><Search size={18}/></button>
            </form>
            {homeFeaturedRecipe ? <section className={`home-feature${homeFeatureHasImage ? "" : " is-no-image"}`} aria-label="Món ăn gợi ý hôm nay">
              <button className="home-feature-image" data-emoji={homeFeaturedRecipe.emoji} onClick={() => openRecipe(homeFeaturedRecipe)} aria-label={`Mở món ${homeFeaturedRecipe.name}`}>
                {(() => {
                  if (homeFeaturedImage) {
                    return <img ref={(node) => node?.setAttribute("fetchpriority", "high")} src={homeFeaturedImage.cardImagePath ?? homeFeaturedImage.imagePath} alt={`Ảnh món ${homeFeaturedRecipe.name}`} decoding="async" onError={(event) => {
                      event.currentTarget.parentElement?.classList.add("image-unavailable");
                      event.currentTarget.closest(".home-feature")?.classList.add("is-no-image");
                    }}/>;
                  }
                  if (homeFeaturedRecipe.imageUrl) {
                    return <img ref={(node) => node?.setAttribute("fetchpriority", "high")} src={homeFeaturedRecipe.imageUrl} alt={`Ảnh món ${homeFeaturedRecipe.name}`} decoding="async" referrerPolicy="no-referrer" onError={(event) => {
                      fallbackRecipeSourceImage(event, homeFeaturedRecipe);
                      if (event.currentTarget.hidden) event.currentTarget.closest(".home-feature")?.classList.add("is-no-image");
                    }}/>;
                  }
                  return <span aria-hidden="true">{homeFeaturedRecipe.emoji}</span>;
                })()}
              </button>
              <div className="home-feature-topline">
                <span className="home-feature-kicker">ĂN GÌ HÔM NAY</span>
                <div className="home-feature-actions">
                  {homeFeatureOptions.length > 1 && <button type="button" className={`home-feature-refresh${homeFeatureShufflePending ? " is-loading" : ""}`} disabled={homeFeatureShufflePending} onClick={shuffleHomeFeature} aria-label={homeFeatureShufflePending ? "Đang tải món từ các nguồn" : "Đổi món gợi ý ngẫu nhiên"} title={homeFeatureShufflePending ? "Đang tải món từ các nguồn" : "Đổi món ngẫu nhiên"}><RefreshCw size={15}/></button>}
                  <button className="home-feature-save" onClick={() => toggleFavorite(homeFeaturedRecipe.id)} aria-label={favorites.includes(homeFeaturedRecipe.id) ? "Bỏ lưu món" : "Lưu món"} aria-pressed={favorites.includes(homeFeaturedRecipe.id)}><Heart size={19} fill={favorites.includes(homeFeaturedRecipe.id) ? "currentColor" : "none"}/></button>
                </div>
              </div>
              <div className="home-feature-copy">
                <div className="home-feature-meta"><span><Clock size={14}/>{homeFeaturedRecipe.totalTime != null ? `~${homeFeaturedRecipe.totalTime} phút` : homeFeaturedRecipe.difficulty}</span></div>
                <h2>{homeFeaturedRecipe.name}</h2>
                {homeFeatureDescription && <p>{homeFeatureDescription}</p>}
                <button className="home-feature-cta" onClick={() => openRecipe(homeFeaturedRecipe)}>Xem công thức &amp; cách nấu <ArrowRight size={18}/></button>
              </div>
            </section> : <section className="home-feature-empty"><b>Chưa có công thức nổi bật</b><p>Mở thư viện để chọn món hoặc thêm nguyên liệu vào tủ.</p><button onClick={() => { if (stock.length) setDiscoveryMode("fridge"); setPage(stock.length ? "explore" : "fridge"); }}>{stock.length ? "Tìm món" : "Thêm nguyên liệu"}<ArrowRight size={16}/></button></section>}
            <section className="home-meal-section" aria-labelledby="home-meal-title">
              <div className="home-meal-heading"><div><span className="home-section-kicker">GỢI Ý HÔM NAY</span><h2 id="home-meal-title">{isAfternoonSnackTime ? "Món ăn xế hôm nay" : "Mâm cơm hôm nay"}</h2></div>{homeMealCandidates.length > 1 && <button type="button" onClick={() => setHomeMealIndex((index) => index + 1)}><RefreshCw size={14}/> Đổi gợi ý</button>}</div>
              {homeMealCandidates.length ? <div className="home-meal-card">
                <div className="home-meal-list">{homeMealCandidates.map((recipe) => {
                  const image = recipeImageFor(recipe.id);
                  const thumbnail = (image as any)?.thumbPath ?? image?.cardImagePath ?? image?.imagePath ?? recipe.imageUrl;
                  return <article className="home-meal-row" key={recipe.id}>
                    <button className="home-meal-recipe" onClick={() => openRecipe(recipe)}>
                      <span className="home-meal-image">{thumbnail ? <img src={thumbnail} alt={image?.imageType === "ai_illustration" ? `Ảnh minh họa AI cho món ${recipe.name}` : `Ảnh ${recipe.name}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => fallbackRecipeSourceImage(event, recipe)}/> : <span>{recipe.emoji}</span>}</span>
                      <span className="home-meal-copy"><small>{recipe.category}{recipe.totalTime != null ? ` · ${recipe.totalTime} phút` : ""}</small><b>{recipe.name}</b></span>
                    </button>
                    <button className="home-meal-open" onClick={() => openRecipe(recipe)} aria-label={`Xem ${recipe.name}`}><ChevronRight size={18}/></button>
                  </article>;
                })}</div>
                <div className="home-meal-actions"><button className="home-meal-shopping" onClick={() => addMissingRecipesToShopping(homeMealCandidates)}><ShoppingBasket size={16}/> Gom nguyên liệu</button><button className="home-meal-browse" onClick={() => setPage("explore")}>Chọn món khác <ArrowRight size={15}/></button></div>
              </div> : <div className="home-feature-empty"><b>Chưa có món gợi ý</b><button onClick={() => setPage("explore")}>Khám phá món <ArrowRight size={16}/></button></div>}
            </section>
            <section className="home-pantry-board" aria-label="Nguyên liệu nhà đang có">
              <section className="board-pantry" aria-label="Nguyên liệu nhà đang có">
                <div className="board-section-heading">
                  <div><span className="board-kicker">BẾP NHÀ MÌNH</span><h2>Trong tủ lạnh <span>{stock.length}</span></h2></div>
                  {stock.length > 0 && <button className="board-text-action" onClick={() => setPage("fridge")}>Sửa tủ<ChevronRight size={15}/></button>}
                </div>
                {stock.length ? <>
                  <div className="board-ingredients">
                    {stock.slice(0, 5).map((item) => {
                      const ingredient = ingredients.find((entry) => entry.id === item.id);
                      const ingredientName = ingredient?.name ?? item.name ?? item.id.replace(/^custom-/, "").replace(/-/g, " ");
                      return <span className="board-ingredient" key={item.id}><IngredientVisual name={ingredientName} emoji={ingredient?.emoji ?? "🥣"} className="board-ingredient-icon"/><span>{ingredientName}</span></span>;
                    })}
                    {stock.length > 5 && <button className="board-more-ingredients" onClick={() => setPage("fridge")}>+{stock.length - 5}</button>}
                  </div>
                  <button className="board-pantry-footer" onClick={() => setPage("fridge")}>Xem số lượng và hạn dùng <ChevronRight size={14}/></button>
                </> : <div className="board-pantry-empty"><button className="board-add-button" onClick={() => setPage("fridge")}><Plus size={16}/> Thêm nguyên liệu</button></div>}
              </section>
              {stock.length > 0 && <button className="board-match-link" onClick={() => showBestTab()}><span aria-hidden="true"/><span>Tìm cách nấu từ những món này</span><ChevronRight size={15}/></button>}
            </section>
            {cookingTips?.length ? (() => {
              const tip = cookingTips[cookingTipIndex % cookingTips.length];
              return <aside className="kitchen-tip" aria-label="Mẹo hay từ nguồn công thức">
                <span className="kitchen-tip-icon"><Lightbulb size={20}/></span>
                <div className="kitchen-tip-content">
                  <div className="kitchen-tip-title"><b>Mẹo hay</b></div>
                  <strong className="kitchen-tip-heading">{tip.subheading ?? tip.title}</strong>
                  {tip.text && <p>{shortSourceTip(tip.text)}</p>}
                </div>
              </aside>;
            })() : homeFeaturedRecipe?.tips[0] && <aside className="kitchen-tip" aria-label={`Mẹo nấu ${homeFeaturedRecipe.name}`}><span className="kitchen-tip-icon"><Lightbulb size={20}/></span><div><b>Mẹo nhỏ gian bếp</b><p>{shortSourceTip(homeFeaturedRecipe.tips[0])}</p><small>Mẹo từ hướng dẫn món {homeFeaturedRecipe.name}</small></div></aside>}
            {flexibleSuggestions.length > 0 && <FlexibleSuggestionPanel recipes={flexibleSuggestions} onOpen={openRecipe} compact/>}
            {stock.length > 0 && <section className="suggestion-preview">
              <div className="suggestion-preview-head"><div><h2>{previewRecommendations.length ? "Món nấu được ngay" : stock.length ? "Chưa thấy món khớp" : "Tìm món theo nguyên liệu"}</h2></div><button onClick={() => stock.length ? showBestTab() : setPage("explore")}>{stock.length ? "Tất cả món" : "Khám phá"} <ChevronRight size={15}/></button></div>
              {previewRecommendations.length ? (
                <div className="preview-scroll">
                  {previewRecommendations.slice(0, 3).map((item) => {
                    const recipe = recipeById.get(item.recipeId)!;
                    return <RecipeCard key={recipe.id} compact={isMobileLayout} recipe={recipe} missing={item.missingIngredients} owned={item.matchedIngredients} ratio={item.matchPercentage} urgent={item.urgent} quantityStatus={item.quantityStatus} score={stock.length ? item.score : undefined} reasons={item.reasons} substitutions={item.substitutions} ingredientName={(id) => recommendationName(recipe, id)} onClick={() => openRecipe(recipe)} />;
                  })}
                </div>
              ) : <div className="preview-empty"><span className="preview-empty-mark"><CookingPot size={21}/></span><div><b>{stock.length ? "Thêm một nguyên liệu hoặc chọn món khác" : "Gợi ý sẽ dựa trên tủ lạnh của bạn"}</b><p>{stock.length ? "Mở thư viện để chọn món rồi xem nguyên liệu còn thiếu." : "Thêm rau, đạm hoặc món ăn sẵn — không cần đủ một công thức."}</p></div><button onClick={() => stock.length ? setPage("explore") : setPage("fridge")}>{stock.length ? "Tìm món khác" : "Thêm nguyên liệu"}<ChevronRight size={15}/></button></div>}
            </section>}
            {stock.length > 0 && <section className={`home-use-soon${useSoonItems.length ? "" : " no-priority"}`}>
              <div className="section-title-row"><div><h2>Cần dùng sớm</h2></div>{useSoonItems.length > 0 && <button className="text-button" onClick={() => showTab("use_soon")}>Xem món <ChevronRight size={15}/></button>}</div>
              {useSoonItems.length ? <div className="use-soon-list">{useSoonItems.map((item) => {
                const ingredient = ingredients.find((entry) => entry.id === item.id);
                const name = ingredient?.name ?? item.name ?? item.id.replace(/^custom-/, "").replace(/-/g, " ");
                return <div className="use-soon-item" key={item.id}><span>{ingredient?.emoji ?? "🥣"}</span><div><b>{name}</b><small>{item.fresh === "urgent" ? "Nên dùng hôm nay" : item.fresh === "soon" ? "Sắp hết hạn" : `Hạn dùng ${item.expiresAt}`}</small></div><span className="use-soon-qty">{item.quantity} {item.unit}</span></div>;
              })}</div> : <div className="use-soon-empty"><span>✓</span><div><b>Chưa có món cần ưu tiên</b></div></div>}
            </section>}
          </>
        )}
        {page !== "home" && page !== "fridge" && page !== "cook" && page !== "shopping" && <div className={`greeting${page === "explore" ? " explore-lead" : ""}`}>
          <h1>
            {page === "favorites" ? "Sổ tay món ngon" : page === "explore" ? discoveryMode === "fridge" ? "Món hợp với tủ lạnh" : "Chợ hôm nay có gì ngon?" : label}
          </h1>
          {page === "explore" && discoveryMode === "fridge" && <p>Ưu tiên nguyên liệu sắp hết hạn.</p>}
        </div>}
        {page === "explore" && <div className="tabs discovery-mode-tabs" role="tablist" aria-label="Chế độ tìm món">
          <button role="tab" aria-selected={discoveryMode === "all"} className={discoveryMode === "all" ? "active" : ""} onClick={() => setDiscoveryMode("all")}>Tất cả món</button>
          <button role="tab" aria-selected={discoveryMode === "fridge"} className={discoveryMode === "fridge" ? "active" : ""} onClick={() => { setDiscoveryMode("fridge"); setTab(stock.length ? "ready" : "discover"); }}>Theo tủ lạnh <span>{stock.length}</span></button>
        </div>}
        {page === "fridge" && (
          <>
            <section className="page-lead fridge-lead">
              <span className="screen-kicker"><Leaf size={14}/> BẾP NHÀ MÌNH</span>
              <h1>Tủ lạnh</h1>
              <p>Thêm nguyên liệu,<br/>Tìm món và theo dõi hạn dùng.</p>
            </section>
            <section className="input-card">
              <div className="add-heading"><div><b>Thêm vào tủ</b></div><button type="button" className={pickerOpen ? "picker-toggle active" : "picker-toggle"} onClick={() => setPickerOpen((v) => !v)} aria-expanded={pickerOpen} aria-controls="ingredient-picker"><Grid2X2 size={16}/>{pickerOpen ? "Thu gọn" : "Chọn nhanh"}</button></div>
              <label className="searchbox">
                <Search size={19} />
                <input
                  value={query}
                  aria-label="Tìm hoặc nhập nguyên liệu"
                  onChange={(e) => { setQuery(e.target.value); setPickerMessage(""); setPickerUndoId(""); setUndoRemovedStock(null); }}
                  placeholder="Tìm nguyên liệu: cà rốt, thịt gà…"
                />
                <button
                  className="round-add"
                  onClick={addCustom}
                  aria-label="Thêm nguyên liệu"
                >
                  <Plus size={18} />
                </button>
              </label>
              {pickerMessage && <div className="picker-status" role="status" aria-live="polite"><span>{pickerMessage}</span>{(pickerUndoId || undoRemovedStock) && <button type="button" onClick={() => {
                if (undoRemovedStock) {
                  setStock((items) => items.some((item) => item.id === undoRemovedStock.id) ? items : [...items, undoRemovedStock]);
                  setPickerMessage(`Đã khôi phục ${ingredients.find((item) => item.id === undoRemovedStock.id)?.name ?? undoRemovedStock.name ?? undoRemovedStock.id} vào tủ lạnh.`);
                  setUndoRemovedStock(null);
                } else {
                  setStock((items) => items.filter((item) => item.id !== pickerUndoId));
                  setPickerMessage("Đã hoàn tác.");
                }
                setPickerUndoId("");
              }}>Hoàn tác</button>}</div>}
              {deferredIngredientQuery && (
                <div className="suggestions" role="group" aria-label="Kết quả tìm nguyên liệu">
                  {searchItems.slice(0, 5).map((item) => (
                    <button type="button" key={item.id} onClick={() => add(item.id)}>
                      <span>{item.name}</span><Plus size={17} aria-hidden="true" />
                    </button>
                  ))}
                  {!searchItems.length && (
                    <button type="button" onClick={addCustom}>
                      <span>Thêm “{deferredIngredientQuery}” của riêng bạn</span><Plus size={17} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
              {pickerOpen && !query && (
                <div className="ingredient-picker" id="ingredient-picker">
                  <section className="picker-popular" aria-label="Danh mục nguyên liệu chọn nhanh">
                    {quickPickerGroups.map((group) => <section className="quick-ingredient-group" key={group.label} aria-label={group.label}>
                      <h3>{group.label}<span>{group.items.length}</span></h3>
                      <div className="ingredient-chip-list">{group.items.map((item) => {
                        const selected = ids.has(item.id);
                        return <button type="button" key={item.id} className={`ingredient-chip${selected ? " selected" : ""}`} aria-pressed={selected} onClick={() => selected ? setStock((stockItems) => stockItems.filter((stockItem) => stockItem.id !== item.id)) : add(item.id)}><IngredientVisual name={item.name} emoji={item.emoji} className="ingredient-chip-emoji"/><span>{item.name}</span>{selected ? <Check size={13}/> : <Plus size={13}/>}</button>;
                      })}</div>
                    </section>)}
                  </section>
                </div>
              )}
            </section>
            {stock.length > 0 && <section className="pantry-head">
              <h2>Nguyên liệu đang có <span className="count">{stock.length}</span></h2>
              <button className="text-button" onClick={() => setPage("settings")}><SlidersHorizontal size={15} /> Tùy chỉnh</button>
            </section>}
            {stock.length === 0 && !pickerOpen ? (
              <div className="empty-pantry">
                <span className="empty-icon"><CookingPot size={23} aria-hidden="true" /></span>
                <b>Tủ lạnh đang trống</b>
              </div>
            ) : stock.length > 0 ? (
              <div className="pantry">
                {stock.map((item) => {
                  const ing = ingredients.find((x) => x.id === item.id);
                  const nm =
                    ing?.name ??
                    item.id.replace("custom-", "").replace(/-/g, " ");
                  return (
                    <article className={`ingredient visual-food-card${isExpired(item) ? " is-expired" : ""}`} key={item.id}>
                      <div className="visual-food-card-top">
                        <IngredientVisual name={nm} emoji={ing?.emoji ?? "✨"} className="ingredient-emoji" />
                        <div className="visual-food-card-actions">
                          <button type="button" className={`visual-food-edit-toggle${editingStockId === item.id ? " is-open" : ""}`} aria-expanded={editingStockId === item.id} aria-label={`${editingStockId === item.id ? "Đóng chỉnh sửa" : "Sửa thông tin"} ${nm}`} onClick={() => toggleStockEditor(item)}>{editingStockId === item.id ? <Check size={16}/> : <Pencil size={14}/>}</button>
                          <button type="button" className="visual-food-delete-toggle" aria-label={`Xóa ${nm} khỏi tủ lạnh`} title={`Xóa ${nm}`} onClick={() => {
                            setStock((items) => items.filter((stockItem) => stockItem.id !== item.id));
                            setPickerMessage(`Đã xóa ${nm} khỏi tủ lạnh.`);
                            setPickerUndoId("");
                            setUndoRemovedStock(item);
                            showToast(`Đã xóa ${nm} khỏi tủ lạnh.`);
                          }}><Trash2 size={15} aria-hidden="true"/></button>
                        </div>
                      </div>
                      <button type="button" className="visual-food-summary" aria-label={`Sửa số lượng và tình trạng ${nm}`} aria-expanded={editingStockId === item.id} onClick={() => toggleStockEditor(item)}>
                        <b>{nm}</b>
                        <span className="visual-food-divider"/>
                        <span className="visual-food-summary-meta"><span className="visual-food-quantity">{item.quantity} {item.unit}</span><span className={`visual-food-status ${item.fresh}`}><i aria-hidden="true"/>{item.fresh === "fresh" ? "Tươi" : item.fresh === "soon" ? "Sắp hết" : item.fresh === "urgent" ? "Dùng ngay" : "Đã hỏng"}</span></span>
                      </button>
                      <div className={`visual-food-storage-row${isExpired(item) ? " is-expired" : ""}`}>
                        <button type="button" className={`visual-food-expiry${isExpired(item) ? " is-expired" : ""}`} aria-label={`Sửa hạn dùng ${nm}: ${expiryLabel(item)}`} onClick={() => toggleStockEditor(item)}><CalendarDays size={13} aria-hidden="true"/><span>{expiryLabel(item)}</span></button>
                        <button type="button" className={`visual-food-location${stockLocation(item) === "freezer" ? " is-frozen" : ""}`} aria-label={`Chỉnh vị trí bảo quản ${nm}`} onClick={() => toggleStockEditor(item)}><span aria-hidden="true"/>{stockLocation(item) === "pantry" ? "Ngoài" : stockLocation(item) === "freezer" ? "Đông" : "Mát"}</button>
                      </div>
                      {isExpired(item) && <small className="expired-label">Quá hạn · bỏ khỏi gợi ý</small>}
                    </article>
                  );
                })}
                <button type="button" className="visual-food-add" onClick={() => setPickerOpen(true)}><span><Plus size={24}/></span><b>Thêm nguyên liệu</b><small>Chọn món có sẵn hoặc tìm kiếm</small></button>
              </div>
            ) : null}
            {stock.length > 0 && <div className="expiry-note">
              <span>⏰</span>
              <p>Thêm hạn dùng để ưu tiên nguyên liệu sắp hết hạn.</p>
            </div>}
            {stock.length > 0 && <section className="fridge-summary" aria-label="Tóm tắt tủ lạnh">
              <div className="fridge-summary-heading"><span className="fridge-summary-icon"><Apple size={20}/></span><div><b>Trong tủ</b></div></div>
              <div className="fridge-summary-stats">
                <button className="fridge-stat urgent" onClick={() => showTab("use_soon")}><small>CẦN DÙNG SỚM</small><b>{useSoonItems.length}</b><span>{useSoonItems.length ? "nguyên liệu" : "chưa có"}</span></button>
                <button className="fridge-stat ready" onClick={showBestTab}><small>MÓN KHỚP TỦ</small><b>{recommendationsByCategory.ready.length}</b><span>đủ loại nguyên liệu</span></button>
              </div>
              <button className="fridge-summary-cta" onClick={showBestTab}><CookingPot size={18}/> Tìm món từ tủ lạnh <ArrowRight size={17}/></button>
            </section>}
            {useSoonItems.length > 0 && <section className="fridge-rescue-panel"><div><span className="rescue-symbol"><Clock size={18}/></span><span><b>Cần ưu tiên dùng sớm</b><small>Nấu Đại Đi sẽ đưa các món này lên trước trong gợi ý.</small></span></div><div className="rescue-items">{useSoonItems.map((item) => { const name = ingredients.find((entry) => entry.id === item.id)?.name ?? item.name ?? item.id; return <span className="rescue-item" key={item.id}>{name}<small>{item.fresh === "urgent" ? "Dùng ngay" : item.expiresAt ? `Hạn ${item.expiresAt}` : "Sắp hết hạn"}</small></span>; })}</div></section>}
            {stock.length > 0 && <section className="fridge-recommendations" id="fridge-recommendations" aria-labelledby="fridge-recommendations-title">
              <div className="fridge-ready-heading">
                <div><h2 id="fridge-recommendations-title">Món gợi ý từ tủ lạnh</h2><p>Danh sách này dùng nguyên liệu bạn đang có; các món thiếu nguyên liệu sẽ ghi rõ phần còn thiếu.</p></div>
              </div>
              {flexibleSuggestions.length > 0 && <FlexibleSuggestionPanel recipes={flexibleSuggestions} onOpen={openRecipe}/>}
              <div className="tabs fridge-recommendation-tabs" role="tablist" aria-label="Nhóm món gợi ý từ tủ lạnh">
                <button role="tab" aria-selected={tab === "ready"} className={tab === "ready" ? "active" : ""} onClick={() => setTab("ready")}>Đủ nguyên liệu <span>{recommendationsByCategory.ready.length}</span></button>
                <button role="tab" aria-selected={tab === "substitution"} className={tab === "substitution" ? "active" : ""} onClick={() => setTab("substitution")}>Có thể thay <span>{recommendationsByCategory.substitution.length}</span></button>
                <button role="tab" aria-selected={tab === "almost"} className={tab === "almost" ? "active" : ""} onClick={() => setTab("almost")}>Thiếu nguyên liệu <span>{recommendationsByCategory.almost.length}</span></button>
                <button role="tab" aria-selected={tab === "use_soon"} className={tab === "use_soon" ? "active" : ""} onClick={() => setTab("use_soon")}>Cần dùng sớm <span>{recommendationsByCategory.use_soon.length}</span></button>
              </div>
              {recommendationsByCategory[tab].length ? <div className="recipe-list favorites-recipe-list">
                {recommendationsByCategory[tab].slice(0, recommendationLimit).map((item) => {
                  const recipe = recipeById.get(item.recipeId);
                  if (!recipe) return null;
                  return <RecipeCard key={recipe.id} recipe={recipe} missing={item.missingIngredients} owned={item.matchedIngredients} ratio={item.matchPercentage} urgent={item.urgent} quantityStatus={item.quantityStatus} score={item.score} reasons={item.reasons} substitutions={item.substitutions} ingredientName={(id) => recommendationName(recipe, id)} onClick={() => openRecipe(recipe)} />;
                })}
              </div> : <div className="preview-empty fridge-recommendations-empty"><span className="preview-empty-mark"><CookingPot size={21}/></span><div><b>{tab === "ready" ? "Chưa có công thức khớp hoàn toàn" : "Chưa có món trong nhóm này"}</b><p>{tab === "ready" ? "Thử xem nhóm Có thể thay hoặc Thiếu ít để tìm món tận dụng nguyên liệu đang có." : "Danh sách sẽ hiện món phù hợp khi có kết quả trong nhóm này."}</p></div></div>}
              {recommendationsByCategory[tab].length > recommendationLimit && <button className="recommendation-load-more" onClick={() => setRecommendationLimit((current) => current + RECOMMENDATION_PAGE_SIZE)}>Xem thêm {Math.min(RECOMMENDATION_PAGE_SIZE, recommendationsByCategory[tab].length - recommendationLimit)} món</button>}
            </section>}
          </>
        )}
        {page === "home" && (
          <>
            <div className="mini-prefs">
              <button
                className={prefs.vegetarian ? "selected" : ""}
                onClick={() =>
                  setPrefs((p) => ({ ...p, vegetarian: !p.vegetarian }))
                }
              >
                <span>🥬</span>Ăn chay
              </button>
              <button
                className={prefs.noFry ? "selected" : ""}
                onClick={() => setPrefs((p) => ({ ...p, noFry: !p.noFry }))}
              >
                <span>🍳</span>Không chiên
              </button>
              <button
                className={prefs.quick ? "selected" : ""}
                onClick={() => setPrefs((p) => ({ ...p, quick: !p.quick }))}
              >
                <span>⚡</span>Nhanh gọn
              </button>
            </div>
          </>
        )}
        {page === "explore" && discoveryMode === "fridge" && (
          <>
            <section className="recipe-intro">
              <div className="recipe-intro-icon"><CookingPot size={22}/></div>
              <div>
                <b>{stock.length ? "Gợi ý theo tủ lạnh nhà mình" : "Thư viện món, kể cả khi tủ trống"}</b>
              <p>
                  {stock.length
                    ? `${ids.size} nguyên liệu còn dùng được · alias khớp chính xác, có xét hạn dùng · định lượng chỉ báo khi cùng đơn vị`
                    : "Chưa có nguyên liệu trong tủ. Bạn vẫn có thể tìm món và xem công thức."}
                </p>
              </div>
            </section>
            {flexibleSuggestions.length > 0 && <FlexibleSuggestionPanel recipes={flexibleSuggestions} onOpen={openRecipe}/>}
            <div className="tabs">
              {!stock.length && <button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}>Khám phá món <span>{recommendationsByCategory.discover.length}</span></button>}
              <button className={tab === "ready" ? "active" : ""} onClick={() => setTab("ready")}>Đủ loại · chưa rõ lượng <span>{recommendationsByCategory.ready.length}</span></button>
              <button className={tab === "substitution" ? "active" : ""} onClick={() => setTab("substitution")}>Có thể thay <span>{recommendationsByCategory.substitution.length}</span></button>
              <button className={tab === "almost" ? "active" : ""} onClick={() => setTab("almost")}>Thiếu ít <span>{recommendationsByCategory.almost.length}</span></button>
              <button className={tab === "use_soon" ? "active" : ""} onClick={() => setTab("use_soon")}>Cứu đồ sớm <span>{recommendationsByCategory.use_soon.length}</span></button>
              {!!stock.length && <button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}>Khám phá <span>{recommendationsByCategory.discover.length}</span></button>}
            </div>
            <section className="recommendation-tools" aria-label="Lọc danh sách gợi ý">
              <label className="searchbox recommendation-search"><Search size={17}/><input id="fridge-recommendation-search" name="fridge-recommendation-search" aria-label="Tìm theo tên món hoặc nguyên liệu" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Tìm món hoặc nguyên liệu…"/></label>
              <details className="recommendation-filter-details">
                <summary><SlidersHorizontal size={16}/> Bộ lọc <span>{libraryCategory !== "Tất cả" || librarySourceFilter !== "all" || libraryStatus !== "Tất cả" || libraryDiet || libraryQuickOnly || recommendationMatchFilter !== "all" || recommendationMatchedOnly ? "Đang áp dụng" : "Tùy chọn"}</span></summary>
                <div className="recommendation-filter-grid">
                <label><span>Nhóm món</span><select id="fridge-recommendation-category" name="fridge-recommendation-category" aria-label="Lọc gợi ý theo nhóm món" value={libraryCategory} onChange={(event) => setLibraryCategory(event.target.value)}><option value="Tất cả">Tất cả nhóm món</option>{recommendationCategories.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                <label><span>Nguồn công thức</span><select id="fridge-recommendation-source" name="fridge-recommendation-source" aria-label="Lọc gợi ý theo nguồn" value={librarySourceFilter} onChange={(event) => setLibrarySourceFilter(event.target.value as typeof librarySourceFilter)}><option value="all">Tất cả nguồn</option><option value="internal">Nội bộ</option><option value="copper">Copper</option><option value="mnnm">Món Ngon Mỗi Ngày</option><option value="knorr">Knorr</option><option value="other">Nguồn khác</option></select></label>
                <label><span>Hướng dẫn</span><select aria-label="Lọc theo trạng thái hướng dẫn" value={libraryStatus} onChange={(event) => setLibraryStatus(event.target.value)}><option value="Tất cả">Tất cả</option><option value="full_recipe">Có hướng dẫn</option><option value="ingredients_only">Chỉ có nguyên liệu</option><option value="catalog_only">Chỉ có tên món</option></select></label>
                <label><span>Mức khớp nguyên liệu</span><select id="fridge-recommendation-match" name="fridge-recommendation-match" aria-label="Lọc gợi ý theo mức khớp nguyên liệu" value={recommendationMatchFilter} onChange={(event) => setRecommendationMatchFilter(event.target.value as typeof recommendationMatchFilter)}><option value="all">Tất cả mức khớp</option><option value="high">Cao · từ 75%</option><option value="medium">Vừa · 40–74%</option><option value="low">Thấp · dưới 40%</option></select></label>
                <label className="recommendation-matched-toggle"><input id="fridge-recommendation-matched-only" name="fridge-recommendation-matched-only" type="checkbox" checked={recommendationMatchedOnly} onChange={(event) => setRecommendationMatchedOnly(event.target.checked)}/> Có ít nhất 1 nguyên liệu trong tủ</label>
                </div>
              </details>
              <p className="recommendation-result-count" aria-live="polite">{filteredRecommendations.length} món phù hợp</p>
            </section>
            {filteredRecommendations.length === 0 ? (
              <div className="no-results">
                <span>🍳</span>
                <h3>{libraryQuery || libraryCategory !== "Tất cả" || librarySourceFilter !== "all" || libraryStatus !== "Tất cả" || libraryDiet || libraryQuickOnly || recommendationMatchFilter !== "all" || recommendationMatchedOnly ? "Không có món khớp bộ lọc" : stock.length ? "Chưa tìm thấy món phù hợp" : "Chưa có nguyên liệu để gợi ý theo tủ"}</h3>
                <p>{recommendationMatchedOnly && !stock.some((item) => !isExpired(item)) ? "Hãy thêm nguyên liệu vào tủ lạnh hoặc bỏ chọn bộ lọc nguyên liệu khớp." : !stock.length && !libraryQuery ? "Thêm nguyên liệu để xem món phù hợp, hoặc chuyển sang Tất cả món để tìm trong thư viện." : "Thử đổi từ khóa hoặc bộ lọc để xem thêm món."}</p>
                {!stock.length && !libraryQuery && <button className="primary-small" onClick={() => setDiscoveryMode("all")}>Tất cả món</button>}
                {(libraryQuery || libraryCategory !== "Tất cả" || librarySourceFilter !== "all" || libraryStatus !== "Tất cả" || libraryDiet || libraryQuickOnly || recommendationMatchFilter !== "all" || recommendationMatchedOnly) && <button className="primary-small" onClick={() => { setLibraryQuery(""); setLibraryCategory("Tất cả"); setLibrarySourceFilter("all"); setLibraryStatus("Tất cả"); setLibraryDiet(false); setLibraryQuickOnly(false); setRecommendationMatchFilter("all"); setRecommendationMatchedOnly(false); }}>Xóa bộ lọc</button>}
              </div>
            ) : (
              <div className="recipe-list favorites-recipe-list">
                {visibleRecommendations.map((item) => {
                  const recipe = recipeById.get(item.recipeId);
                  if (!recipe) return null;
                  return <RecipeCard key={recipe.id} recipe={recipe} missing={item.missingIngredients} owned={item.matchedIngredients} ratio={item.matchPercentage} urgent={item.urgent} quantityStatus={item.quantityStatus} score={stock.length ? item.score : undefined} reasons={item.reasons} substitutions={item.substitutions} ingredientName={(id) => recommendationName(recipe, id)} onClick={() => openRecipe(recipe)} />;
                })}
              </div>
            )}
            {filteredRecommendations.length > recommendationLimit && <button className="recommendation-load-more" onClick={() => setRecommendationLimit((current) => current + RECOMMENDATION_PAGE_SIZE)}>Xem thêm {Math.min(RECOMMENDATION_PAGE_SIZE, filteredRecommendations.length - recommendationLimit)} món</button>}
          </>
        )}
        {page === "explore" && discoveryMode === "all" && (
          <>
            <div className="library-tools">
              <label className="searchbox library-search"><Search size={17}/><input aria-label="Tìm món hoặc nguyên liệu" value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Tìm món hoặc nguyên liệu…"/>{libraryQuery && <button type="button" className="library-query-clear" onClick={() => setLibraryQuery("")} aria-label="Xóa từ khóa tìm món"><X size={16}/></button>}</label>
              <details className="explore-filter-menu"><summary aria-label="Mở bộ lọc"><SlidersHorizontal size={19}/></summary><div className="explore-filter-popover">
                <label><span>Nguồn công thức</span><select aria-label="Lọc theo nguồn công thức" value={librarySourceFilter} onChange={(event) => setLibrarySourceFilter(event.target.value as typeof librarySourceFilter)}><option value="all">Tất cả nguồn</option><option value="internal">Nội bộ</option><option value="copper">Copper</option><option value="mnnm">Món Ngon Mỗi Ngày</option><option value="knorr">Knorr Việt Nam</option><option value="other">Nguồn khác</option></select></label>
                <label><span>Hướng dẫn</span><select aria-label="Lọc trạng thái hướng dẫn" value={libraryStatus} onChange={(event) => setLibraryStatus(event.target.value)}><option>Tất cả</option><option value="full_recipe">Có hướng dẫn</option><option value="ingredients_only">Chỉ có nguyên liệu</option><option value="catalog_only">Chỉ có tên món</option></select></label>
                <label className="library-diet" title="Chỉ hiện món có dữ liệu hướng dẫn và không có nguyên liệu thuộc nhóm thịt hoặc hải sản."><input type="checkbox" checked={libraryDiet} onChange={(event) => setLibraryDiet(event.target.checked)}/> Không thịt/hải sản</label>
                <button type="button" className="text-button" onClick={() => { setLibraryQuery(""); setLibraryCategory("Tất cả"); setLibrarySourceFilter("all"); setLibraryStatus("Tất cả"); setLibraryDiet(false); setLibraryQuickOnly(false); }}>Xóa bộ lọc</button>
              </div></details>
            </div>
            <div className="explore-quick-chips" aria-label="Lọc nhanh món ăn">{[
              { label: "🥬 Rau muống non", category: "Rau củ" },
              { label: "🐟 Cá tươi", query: "cá" },
              { label: "⏱ Món < 30 phút", quick: true },
              { label: "🌿 Món chay", diet: true },
            ].map((chip) => <button key={chip.label} className={(chip.category && libraryCategory === chip.category || chip.query && libraryQuery === chip.query || chip.quick && libraryQuickOnly || chip.diet && libraryDiet) ? "active" : ""} onClick={() => {
              if (chip.category) setLibraryCategory((current) => current === chip.category ? "Tất cả" : chip.category!);
              if (chip.query) setLibraryQuery((current) => current === chip.query ? "" : chip.query!);
              if (chip.quick) setLibraryQuickOnly((current) => !current);
              if (chip.diet) setLibraryDiet((current) => !current);
            }}>{chip.label}</button>)}</div>
            {!libraryQuery.trim() && <>
            <div className="explore-category-heading"><h2>Món ngon theo cách nấu</h2><button className="text-button" onClick={() => { setLibraryCategory("Tất cả"); setLibraryQuery(""); }}>Tất cả</button></div>
            <div className="category-strip library-categories explore-method-grid">{exploreMethodCategories.map((category) => {
              const Icon = category === "Món xào" ? CookingPot : category === "Món ăn nhẹ" || category === "Món chay" ? Leaf : category === "Món nước" || category === "Món canh" ? UtensilsCrossed : ChefHat;
              const title = category === "Món canh" ? "Canh ngọt mát" : category === "Món kho" ? "Kho đậm đà" : category === "Món xào" ? "Gỏi & Rau xào" : category === "Món nước" ? "Bún & Phở nước" : category === "Món ăn nhẹ" ? "Cuốn & Chấm" : "Món chay thanh";
              const subtitle = category === "Món canh" ? "Canh cua, chua" : category === "Món kho" ? "Cá tộ, kho dừa" : category === "Món xào" ? "Muống xào, rau" : category === "Món nước" ? "Bún bò, phở gà" : category === "Món ăn nhẹ" ? "Gỏi cuốn, xèo" : "Đậu om, nấm";
              return <button key={category} className={libraryCategory === category ? "chosen" : ""} onClick={() => setLibraryCategory((current) => current === category ? "Tất cả" : category)} aria-pressed={libraryCategory === category}><span className={`explore-method-icon explore-method-icon-${category === "Món canh" ? "soup" : category === "Món kho" ? "braise" : category === "Món xào" ? "stir" : category === "Món nước" ? "noodle" : category === "Món ăn nhẹ" ? "roll" : "vegan"}`}><Icon size={19}/></span><span>{title}</span><small>{subtitle}</small></button>;
            })}</div>
            </>}
            {visibleLibraryResults.length ? <div className="recipe-list library-list">{visibleLibraryResults.map((group) => {
              const entry = group.primary;
              if (entry.kind === "recipe") {
                const recipe = entry.recipe;
                const image = recipeImageFor(recipe.id);
                const aiIllustration = image?.imageType === "ai_illustration";
                const recipeStatus = recipe.dataStatus === "full_recipe" ? recipe.verificationStatus === "verified" ? "Đã xác minh" : recipe.verificationStatus === "adapted" ? "Có nguồn · đã điều chỉnh" : "Chưa xác minh" : recipe.dataStatus === "ingredients_only" ? "Thiếu hướng dẫn" : "Thiếu dữ liệu";
                const meta = [recipe.totalTime ? `${recipe.totalTime} phút` : "", `${recipe.ingredients.length} nguyên liệu`, recipeStatus].filter(Boolean).join(" · ");
                return <button className="library-card" key={entry.key} onClick={() => openLibraryCandidate(group)}><span className={`library-emoji${image || recipe.imageUrl ? " has-recipe-image" : ""}`} data-emoji={recipe.emoji}>{image ? <img src={image.cardImagePath ?? image.imagePath} alt={aiIllustration ? `Ảnh minh họa AI cho món ${recipe.name}` : `Ảnh món ${recipe.name}`} loading="lazy" decoding="async" onError={(event) => event.currentTarget.parentElement?.classList.add("image-unavailable")}/> : recipe.imageUrl ? <img src={recipe.imageUrl} alt={`Ảnh món ${recipe.name}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => fallbackRecipeSourceImage(event, recipe)}/> : recipe.emoji}</span><span className="library-card-content"><span className="library-card-title">{recipe.name}</span><span className="library-card-meta">{aiIllustration ? "Ảnh AI · " : ""}{meta}</span><span className="library-card-cta">Xem chi tiết <ChevronRight size={16}/></span></span></button>;
              }
              if (entry.kind === "mnnm") {
                const item = entry.item;
                const image = recipeImageFor(item.id);
                const minutes = durationMinutes(item.total_time);
                const status = item.has_instructions ? "Chưa xác minh" : item.has_ingredients ? "Thiếu hướng dẫn" : "Thiếu dữ liệu";
                const meta = [minutes ? `${minutes} phút` : "", `${item.ingredient_count} nguyên liệu`, status].filter(Boolean).join(" · ");
                return <button className="library-card mnnm-recipe-card" key={entry.key} onClick={() => openLibraryCandidate(group)}><span className={`library-emoji${image || item.image_url ? " has-recipe-image" : ""}`} data-emoji="🍲">{image ? <img src={image.cardImagePath ?? image.imagePath} alt={`Ảnh món ${item.name}`} loading="lazy" decoding="async" onError={(event) => event.currentTarget.parentElement?.classList.add("image-unavailable")}/> : item.image_url ? <img src={item.image_url} alt={`Ảnh món ${item.name}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(event) => fallbackMnnmImage(event, item)}/> : "🍲"}</span><span className="library-card-content"><span className="library-card-title">{item.name}</span><span className="library-card-meta">{meta}</span><span className="library-card-cta">Xem công thức &amp; cách nấu <ChevronRight size={16}/></span></span></button>;
              }
              const item = entry.item;
              const image = recipeImageFor(entry.key);
              const aiIllustration = image?.imageType === "ai_illustration";
              const authoredSupplement = getSourceInstructionSupplement(item.id);
              const status = authoredSupplement ? "Cần rà soát" : item.has_instructions ? "Chưa xác minh" : item.has_ingredients ? "Thiếu hướng dẫn" : "Thiếu dữ liệu";
              const meta = [item.ingredients ? `${item.ingredients.length} nguyên liệu` : "", status].filter(Boolean).join(" · ");
              return <button className="library-card source-recipe-card" key={entry.key} onClick={() => openLibraryCandidate(group)}><span className={`library-emoji${image ? " has-recipe-image" : ""}`} data-emoji="🍲">{image ? <img src={image.cardImagePath ?? image.imagePath} alt={aiIllustration ? `Ảnh minh họa AI cho món ${item.name}` : `Ảnh món ${item.name}`} loading="lazy" decoding="async" onError={(event) => event.currentTarget.parentElement?.classList.add("image-unavailable")}/> : "🍲"}</span><span className="library-card-content"><span className="library-card-title">{item.name}</span><span className="library-card-meta">{aiIllustration ? "Ảnh AI · " : ""}{meta}</span><span className="library-card-cta">Xem chi tiết <ChevronRight size={16}/></span></span></button>;
            })}</div> : mnnmLoad === "loading" || knorrLoad === "loading" ? <p role="status" className="source-catalog-state">Đang tải danh sách món…</p> : <div className="no-results"><span>🔎</span><h3>Không tìm thấy món phù hợp</h3><p>Thử tên món hoặc nguyên liệu khác, hoặc bỏ bớt bộ lọc.</p></div>}
            {libraryResults.length > libraryLimit && <button className="recommendation-load-more" onClick={() => setLibraryLimit((current) => current + 30)}>Xem thêm {Math.min(30, libraryResults.length - libraryLimit)} món</button>}
            <p className="dataset-attribution">Nguồn và tình trạng công thức có trong chi tiết món. Ảnh Copper theo <a href="https://copperapp.app/study/what-the-world-cooks.html" target="_blank" rel="noreferrer">CC BY 4.0</a>.</p>
            {mnnmLoad === "error" && <p role="alert" className="source-catalog-state">Chưa tải được danh sách món MNMN. <button className="text-button" onClick={() => { setMnnmCatalog(null); setMnnmRetry((current) => current + 1); }}>Thử tải lại</button></p>}
            {knorrLoad === "error" && <p role="alert" className="source-catalog-state">Chưa tải được danh sách món Knorr. <button className="text-button" onClick={() => { setKnorrRecipes(null); setKnorrRetry((current) => current + 1); }}>Thử tải lại</button></p>}
          </>
        )}
        {page === "trending" && (
          <>
            <section className="trending-intro">
              <div className="recipe-intro-icon"><BookOpen size={21}/></div>
              <div><b>Video hướng dẫn nấu ăn</b><p>Vuốt để xem · lưu clip để xem lại. Một số clip sẽ mở trên YouTube.</p></div>
            </section>
            {trendingCatalogStatus === "loading" && !trendingVideos.length && <div className="video-feed-state" role="status">Đang tải danh sách video…</div>}
            {trendingCatalogStatus === "error" && !trendingVideos.length && <div className="video-feed-state" role="alert"><p>Chưa tải được video. Kiểm tra kết nối rồi thử lại nhé.</p><button type="button" className="video-retry-button" onClick={() => setTrendingCatalogRetry((count) => count + 1)}>Thử lại</button></div>}
            {trendingCatalogStatus === "ready" && !trendingVideos.length && <div className="video-feed-state"><p>Chưa có video nấu ăn.</p></div>}
            {(trendingCatalogStatus === "ready" || trendingVideos.length > 0) && trendingVideos.length > 0 && <>
              <div ref={trendingFeedRef} className={`trending-list trend-feed${trendingFeedRefreshing ? " is-refreshing" : ""}`} aria-label="Luồng video hướng dẫn nấu ăn. Kéo clip đầu tiên xuống để cập nhật và xáo trộn clip chưa xem." onTouchStart={beginVideoFeedPull} onTouchMove={moveVideoFeedPull} onTouchEnd={finishVideoFeedPull} onTouchCancel={cancelVideoFeedPull} onScroll={(event) => {
                const element = event.currentTarget;
                if (visibleTrendingCount < trendingVideos.length && element.scrollTop + element.clientHeight * 2.5 >= element.scrollHeight) setVisibleTrendingCount((count) => Math.min(trendingVideos.length, count + 12));
              }}><div className={`video-pull-indicator${videoPulling || videoPullReady || trendingFeedRefreshing ? " is-visible" : ""}`} role="status" aria-live="polite"><ArrowDown size={17}/><span>{trendingFeedRefreshing ? "Đang cập nhật clip" : videoPullReady ? "Thả để cập nhật" : "Kéo xuống để cập nhật"}</span></div>{visibleTrendingVideos.map((video, index) => {
                const saved = savedVideos.some((item) => item.url === video.videoUrl);
                const playing = activeTrendingVideoId === video.videoId;
                const failed = failedTrendingVideoIds.includes(video.videoId);
                return <article className="trend-card trend-feed-card" data-trend-video-id={video.videoId} key={video.videoId}>
                  <div className={`trend-player${failed ? " is-failed" : ""}`}>
                    {playing && !failed
                      ? <iframe className="trend-youtube-frame" ref={(element) => { youtubePlayerContainerRef.current = element; }} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?enablejsapi=1&autoplay=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`} title={`Video hướng dẫn nấu ăn: ${video.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
                      : <button className="trend-player-poster" onClick={() => { if (videoPullTriggeredRef.current) { videoPullTriggeredRef.current = false; return; } if (failed) window.open(video.videoUrl, "_blank", "noopener,noreferrer"); else { setVideoHistoryMessage(""); setActiveTrendingVideoId(video.videoId); } }} aria-label={failed ? `Mở video gốc trên YouTube: ${video.title}` : `Phát video: ${video.title}`}><img src={`https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`} alt="" loading={index === 0 ? "eager" : "lazy"} decoding="async" onError={(event) => { const image = event.currentTarget; if (image.dataset.triedStandard !== "1") { image.dataset.triedStandard = "1"; image.src = `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/mqdefault.jpg`; } else image.style.visibility = "hidden"; }}/><span className="trend-play-button">{failed ? <ExternalLink size={25}/> : <Play size={25} fill="currentColor"/>}</span><small>{failed ? "Mở YouTube" : "Chạm để xem"}</small></button>}
                  </div>
                  <div className={`trend-card-body${playing && (trendingOverlayVisible || failed) ? " is-overlay-visible" : ""}`}><div className="trend-card-meta"><small>{video.creatorName || "YouTube"}{video.durationSeconds ? ` · ${video.durationSeconds < 60 ? `${video.durationSeconds} giây` : `${Math.floor(video.durationSeconds / 60)} phút`}` : ""}</small></div><div className="trend-card-copy"><h3>{video.title}</h3>{failed ? <small className="trend-player-error" role="status">Clip không phát được trong ứng dụng · Chạm video để mở YouTube.</small> : null}{videoHistoryMessage && playing && !failed && <small role="status">{videoHistoryMessage}</small>}{index === visibleTrendingVideos.length - 1 && visibleTrendingCount >= trendingVideos.length && <small className="video-end-message">Đã xem hết video.</small>}</div></div>
                  <div className="trend-card-actions"><button className={`trend-save-button${saved ? " is-saved" : ""}`} onClick={() => toggleSavedTrendingVideo(video)} aria-pressed={saved}><Bookmark size={20} fill={saved ? "currentColor" : "none"}/><span>{saved ? "Đã lưu" : "Lưu"}</span></button><a className="trend-original" href={video.videoUrl} target="_blank" rel="noreferrer" aria-label="Mở video trên YouTube"><ExternalLink size={20}/></a></div>
                </article>;
              })}</div>
            </>}
            <section className="pref-section add-video-section"><h3>Lưu video muốn thử</h3><p className="pref-help">Lưu link YouTube, TikTok hoặc Reels để xem sau.</p><label className="video-field">Liên kết video<input value={videoUrlDraft} onChange={(event) => { setVideoUrlDraft(event.target.value); setVideoFormError(""); }} placeholder="https://…" inputMode="url" /></label><label className="video-field">Ghi chú (không bắt buộc)<input value={videoNoteDraft} onChange={(event) => setVideoNoteDraft(event.target.value)} placeholder="Món muốn thử, thay đổi nguyên liệu…" /></label>{videoFormError && <p className="form-error" role="alert">{videoFormError}</p>}<button className="primary-small" onClick={saveVideoLink}>Lưu link video</button></section>
          </>
        )}
        {page === "shopping" && <>
          <section className="shopping-overview">
            <h1>Sổ đi chợ nhà mình</h1>
            {shoppingItems.length > 0 && <div className="shopping-counts"><div><small>CẦN MUA</small><b>{shoppingItems.filter((item) => !item.checked).length}</b></div><div><small>ĐÃ ĐÁNH DẤU</small><b>{shoppingItems.filter((item) => item.checked).length}</b></div></div>}
            <form className="shopping-add-form" onSubmit={(event) => { event.preventDefault(); addShoppingItem(shoppingQuery); }}>
              <label className="searchbox"><Search size={18}/><input aria-label="Thêm nguyên liệu vào sổ đi chợ" value={shoppingQuery} onChange={(event) => setShoppingQuery(event.target.value)} placeholder="Thêm nguyên liệu cần mua…"/></label>
              <button type="submit" disabled={!shoppingQuery.trim()}><Plus size={17}/> Thêm</button>
            </form>
          </section>
          {stock.length > 0 && <p className="shopping-pantry-note"><CheckCircle2 size={16}/> Các nguyên liệu đã có trong tủ được đánh dấu để tránh mua trùng.</p>}
          {shoppingItems.length ? <div className="shopping-groups">
            {[...new Set(shoppingItems.map((item) => shoppingCategoryFor(item.name)))].map((category) => <section className="shopping-group" key={category}>
              <div className="shopping-group-heading"><h2>{category}</h2></div>
              {shoppingItems.filter((item) => shoppingCategoryFor(item.name) === category).map((item) => {
                const itemIngredientId = resolveIngredientId(item.name, ingredientIndex);
                const isInFridge = stock.some((entry) => entry.id === itemIngredientId || canonical(entry.name ?? nameFor(entry.id)) === canonical(item.name));
                return <article className={`shopping-row${item.checked ? " is-checked" : ""}`} key={item.id}>
                  <button className="shopping-check" onClick={() => setShoppingItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, checked: !entry.checked } : entry))} aria-label={item.checked ? `Bỏ đánh dấu ${item.name}` : `Đánh dấu đã mua ${item.name}`} aria-pressed={item.checked}>{item.checked ? <Check size={16}/> : <span/>}</button>
                  <div className="shopping-item-copy"><b>{item.name}</b><small>{item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : item.recipeId && recipeById.get(item.recipeId) ? `Từ ${recipeById.get(item.recipeId)!.name} · chưa rõ lượng` : "Chưa rõ lượng"}{isInFridge ? " · Đã có trong tủ" : ""}</small></div>
                  <details className="shopping-item-edit"><summary aria-label={`Sửa số lượng ${item.name}`}>Sửa</summary><div className="shopping-edit-fields"><label>Số lượng<input inputMode="decimal" aria-label={`Số lượng cần mua ${item.name}`} value={item.quantity} onChange={(event) => setShoppingItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, quantity: event.target.value } : entry))}/></label><label>Đơn vị<input aria-label={`Đơn vị cần mua ${item.name}`} value={item.unit} onChange={(event) => setShoppingItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, unit: event.target.value } : entry))}/></label></div></details>
                  {item.recipeId && <button className="shopping-source-link" onClick={() => { const recipe = recipeById.get(item.recipeId!); if (recipe) openRecipe(recipe); }} aria-label={`Mở món liên quan đến ${item.name}`}><ChevronRight size={17}/></button>}
                  <button className="shopping-remove" onClick={() => setShoppingItems((items) => items.filter((entry) => entry.id !== item.id))} aria-label={`Xóa ${item.name} khỏi sổ đi chợ`}><X size={16}/></button>
                </article>;
              })}
            </section>)}
            <div className="shopping-footer-actions">{shoppingItems.some((item) => item.checked) && <button className="shopping-clear" onClick={() => setShoppingItems((items) => items.filter((item) => !item.checked))}>Xóa món đã đánh dấu</button>}<button className="shopping-fridge-button" onClick={() => setPage("fridge")}><Apple size={17}/> Mở tủ lạnh <ArrowRight size={16}/></button></div>
          </div> : <div className="shopping-empty"><span><ShoppingBasket size={24}/></span><h2>Sổ đi chợ đang trống</h2><button onClick={() => setPage("explore")}>Tìm món để nấu <ArrowRight size={16}/></button></div>}
        </>}
        {page === "cook" && cookingRecipe && <section className="cook-mode-screen" aria-label={`Đang nấu ${cookingRecipe.name}`}>
          <section className="cook-progress-panel" aria-label="Tiến độ nấu">
            <div className="cook-progress-track"><span style={{ width: `${Math.round(((cookingStep + 1) / cookingRecipe.steps.length) * 100)}%` }}/></div>
            <div className="cook-progress-label"><b>Bước {cookingStep + 1}. {activeStepTitle}</b><span>{nextCookStep ? `Tiếp: Bước ${cookingStep + 2}` : "Bước cuối"}</span></div>
            <div className={`cook-voice-status${cookVoiceListening ? " is-listening" : ""}`} role="status" aria-live="polite"><span className="cook-voice-dot"/><span>{cookVoiceMessage}</span></div>
          </section>
          {recipeImageFor(cookingRecipe.id) && <div className="cook-recipe-image"><img src={recipeImageFor(cookingRecipe.id)!.imagePath} alt={recipeImageFor(cookingRecipe.id)!.imageType === "ai_illustration" ? `Ảnh minh họa AI cho món ${cookingRecipe.name}` : `Ảnh ${cookingRecipe.name}`} decoding="async"/><div className="cook-image-shade"/><span className="cook-image-badge"><Flame size={16}/>{activeCookStep?.durationMinutes ? `Bước này · ${activeCookStep.durationMinutes} phút` : "Đang nấu món này"}</span></div>}
          <div className="cook-step-content"><span className="cook-step-tag">HƯỚNG DẪN NẤU · BƯỚC {cookingStep + 1}</span><h1>{activeStepTitle || `Bước ${cookingStep + 1}`}</h1><div className="cook-instruction-copy"><p>{activeCookStep?.instruction}</p></div>{cookingRecipe.verificationStatus !== "verified" && <p className="cook-source-note">Công thức chưa được xác minh độc lập · Nguồn dữ liệu: {cookingRecipe.source.title}{cookingRecipe.source.url && <> · <a href={cookingRecipe.source.url} target="_blank" rel="noreferrer">Mở nguồn <ExternalLink size={12}/></a></>}{cookingRecipe.instructionReference && <> · {cookingRecipe.instructionReference.matchType === "similar" ? "Tham khảo món gần giống (không phải công thức của món này)" : "Tham khảo cách nấu cùng món"}: <a href={cookingRecipe.instructionReference.url} target="_blank" rel="noreferrer">{cookingRecipe.instructionReference.title} <ExternalLink size={12}/></a></>}</p>}</div>
          <details className={`cook-timer-card${cookTimerRunning ? " is-running" : ""}`} aria-label="Hẹn giờ cho bước nấu" open={cookTimerExpanded} onToggle={(event) => setCookTimerExpanded(event.currentTarget.open)}>
            <summary className="cook-timer-summary">
              <span className="cook-timer-summary-label"><Clock size={18}/>{activeCookStep?.durationMinutes ? "Hẹn giờ bước này" : cookTimerSeconds === null ? "Đặt hẹn giờ" : "Hẹn giờ cho bước này"}</span>
              <span className="cook-timer-summary-meta">{activeCookStep?.durationMinutes ? `Khoảng ${activeCookStep.durationMinutes} phút` : cookTimerRunning ? "Đang chạy" : cookTimerSeconds === null ? "Tùy chọn" : "Tùy chỉnh"}</span>
              {cookTimerSeconds !== null && <span className="cook-timer-summary-countdown">{cookTimerLabel}</span>}
              <ChevronRight className="cook-timer-summary-chevron" size={18}/>
            </summary>
            <div className="cook-timer-content">
            <audio ref={alarmAudioRef} src="/audio/timer-end.mp3" preload="auto" aria-hidden="true" onEnded={stopCookVibration}/>
            <div className="cook-timer-heading"><span><Clock size={18}/> {cookTimerSeconds === 0 ? "HẾT GIỜ HẸN" : "HẸN GIỜ BƯỚC NÀY"}</span><small>{activeCookStep?.durationMinutes ? "Theo thời lượng trong hướng dẫn" : "Chưa có thời lượng trong dữ liệu"}</small></div>
            <div className={`cook-timer-display${cookTimerSeconds === 0 ? " is-finished" : ""}`} aria-live="polite"><strong>{cookTimerLabel}</strong><span>{cookTimerSeconds === null ? "Chưa đặt" : "phút : giây"}</span></div>
            <div className="cook-timer-controls">
              <button className="cook-timer-adjust" onClick={addCookTimerMinute}><Plus size={16}/> 1 phút</button>
              <button className="cook-timer-toggle" onClick={startOrPauseCookTimer} disabled={cookTimerSeconds === null || cookTimerSeconds === 0}>{cookTimerRunning ? <><Pause size={19}/> Tạm dừng</> : <><Play size={19}/> {cookTimerSeconds === 0 ? "Hết giờ" : "Bắt đầu"}</>}</button>
              <button className="cook-timer-adjust" onClick={resetCookTimer}><RotateCcw size={16}/> Đặt lại</button>
            </div>
            <div className="cook-alert-settings" aria-label="Tùy chọn báo hết giờ">
              <label><input id="cook-timer-sound" name="cook-timer-sound" type="checkbox" checked={cookSoundOn} onChange={(event) => { const enabled = event.target.checked; setCookSoundOn(enabled); if (!enabled && alarmAudioRef.current) { alarmAudioRef.current.pause(); alarmAudioRef.current.currentTime = 0; } }}/> Âm thanh</label>
              <label><input id="cook-timer-vibration" name="cook-timer-vibration" type="checkbox" checked={cookVibrationOn} onChange={(event) => { const enabled = event.target.checked; setCookVibrationOn(enabled); if (!enabled) stopCookVibration(); }}/> Rung</label>
              <button className="cook-test-sound" onClick={playCookAlarm} disabled={!cookSoundOn}>Thử âm thanh</button>
              {cookNotificationPermission === "granted" ? <span className="cook-notification-enabled">Đã cho phép thông báo</span> : cookNotificationPermission === "unsupported" ? <span className="cook-notification-unavailable">Trình duyệt không hỗ trợ thông báo</span> : <button className="cook-notification-enable" onClick={enableCookNotifications}>{cookNotificationPermission === "denied" ? "Thông báo đang bị chặn" : "Bật báo khi app ẩn"}</button>}
            </div>
            <small className="cook-alert-footnote">Thông báo cần được cấp quyền. Nếu đóng hẳn app, trình duyệt có thể dừng timer web.</small>
            </div>
          </details>
          <section className="cook-ingredients"><div className="cook-ingredients-heading"><h2><CookingPot size={19}/> Nguyên liệu món này</h2><span>{cookingRecipe.ingredients.length} thành phần</span></div>{cookingRecipe.ingredients.map((item) => {
            const name = item.sourceName ?? nameFor(item.ingredientId);
            const targetId = resolveIngredientId(name, ingredientIndex);
            const matchingStock = stock.filter((entry) => {
              const stockName = entry.name ?? (entry.id.startsWith("custom-") ? entry.id.slice(7).replace(/-/g, " ") : nameFor(entry.id));
              return entry.id === item.ingredientId
                || canonical(stockName) === canonical(name)
                || (!!targetId && resolveIngredientId(stockName, ingredientIndex) === targetId);
            });
            const present = matchingStock.length > 0 && !matchingStock.some(isExpired);
            return <div className="cook-ingredient-row" key={item.ingredientId}><span className={present ? "ingredient-present-dot" : "ingredient-needed-dot"}/><span>{name}</span><small>{item.quantity === null ? item.note ?? (item.optional ? "Tùy chọn" : "Chưa rõ lượng") : `${formatRecipeQuantity(item.quantity)} ${item.unit}`.trim()}</small><em>{present ? "Có trong tủ" : "Chưa có trong tủ"}</em></div>;
          })}</section>
          {cookingRecipe.tips.length > 0 && <aside className="cook-tip"><span className="cook-tip-icon"><Lightbulb size={19}/></span><div><h2>Mẹo cho món này</h2>{cookingRecipe.tips.slice(0, 2).map((tip, index) => <p key={`${index}-${tip}`}>{shortSourceTip(tip)}</p>)}</div></aside>}
          <div className="cook-actions"><button className="cook-previous" onClick={() => { stopCookAlarm(); setCookingStep((step) => Math.max(0, step - 1)); }} disabled={cookingStep === 0} aria-label="Về bước trước"><ArrowLeft size={19}/><span>Trước</span></button><button className="cook-next" onClick={() => {
            stopCookAlarm();
            setDone((steps) => steps.includes(cookingStep) ? steps : [...steps, cookingStep]);
            if (cookingStep < cookingRecipe.steps.length - 1) setCookingStep((step) => step + 1); else finishCooking();
          }}>{cookingStep === cookingRecipe.steps.length - 1 ? <><CheckCircle2 size={19}/> Hoàn tất món</> : <><CheckCircle2 size={20}/> Xong bước này <span>→ Bước {cookingStep + 2}</span></>}</button></div>
        </section>}
        {page === "favorites" && (
          <>
            <section className="saved-overview"><span className="saved-overview-icon"><Bookmark size={19}/></span><div><span className="screen-kicker">SỔ TAY MÓN NGON</span><h2>Món bạn muốn nấu lại</h2></div><button onClick={() => setPage("explore")}>Tìm món <ArrowRight size={16}/></button></section>
            {favorites.length > 0 && <section className="saved-controls" aria-label="Tìm và lọc món đã lưu">
              <label className="searchbox saved-search"><Search size={17}/><input aria-label="Tìm trong món đã lưu" value={savedQuery} onChange={(event) => setSavedQuery(event.target.value)} placeholder="Tìm món đã lưu…"/>{savedQuery && <button type="button" onClick={() => setSavedQuery("")} aria-label="Xóa nội dung tìm kiếm"><X size={15}/></button>}</label>
              <div className="saved-filter-tabs" role="group" aria-label="Lọc theo nguyên liệu trong tủ">
                <button className={savedFilter === "all" ? "chosen" : ""} aria-pressed={savedFilter === "all"} onClick={() => setSavedFilter("all")}>Tất cả <span>{favorites.length}</span></button>
                <button className={savedFilter === "ready" ? "chosen" : ""} aria-pressed={savedFilter === "ready"} onClick={() => setSavedFilter("ready")}>Đang có đủ tên <span>{savedReadyCount}</span></button>
                <button className={savedFilter === "need" ? "chosen" : ""} aria-pressed={savedFilter === "need"} onClick={() => setSavedFilter("need")}>Cần xem thêm</button>
              </div>
            </section>}
            {filteredSavedRecipes.length === 0 ? (
              <div className="no-results">
                <span>♡</span>
                <h3>{favorites.length ? "Không tìm thấy món phù hợp" : "Chưa có món đã lưu"}</h3>
                {favorites.length > 0 && <p>Thử đổi từ khóa hoặc bộ lọc.</p>}
              </div>
            ) : (
              <div className="recipe-list saved-recipe-list">
                {filteredSavedRecipes.map((r) => {
                  return (
                    <RecipeCard
                      key={r.id}
                      recipe={r}
                      missing={r.required.filter((x) => !ids.has(x))}
                      owned={r.required.filter((x) => ids.has(x))}
                      ratio={r.required.length ? Math.round((r.required.filter((x) => ids.has(x)).length / r.required.length) * 100) : 0}
                      urgent={r.required.some((id) => stock.some((item) => item.id === id && item.fresh !== "fresh"))}
                      onClick={() => openRecipe(r)}
                    />
                  );
                })}
              </div>
            )}
            {recentRecipeIds.length > 0 && <section className="history-box recently-viewed">
              <div className="section-heading-inline"><h3><History size={17} /> Đã xem gần đây <span>{recentRecipeIds.length}</span></h3>{history.length > 0 && <button className="text-button" onClick={() => { if (window.confirm("Xóa toàn bộ lịch sử xem món? Danh sách món đã nấu sẽ được giữ nguyên.")) setHistory([]); }}>Xóa lịch sử xem</button>}</div>
              <div className="recent-recipe-list">{recentRecipeIds.map((id) => {
                const recipe = recipeById.get(id)!;
                const required = recipe.required ?? [];
                const owned = required.filter((ingredientId) => ids.has(ingredientId));
                return <RecipeCard key={id} recipe={recipe} missing={required.filter((ingredientId) => !ids.has(ingredientId))} owned={owned} ratio={required.length ? Math.round(owned.length / required.length * 100) : 0} urgent={false} onClick={() => openRecipe(recipe)} />;
              })}</div>
            </section>}
            {savedVideos.length > 0 && <section className="history-box saved-video-box"><h3>Video muốn thử <span>{savedVideos.length}</span></h3>{savedVideos.map((video) => <article className="saved-video" key={video.id}><div><small>{video.platform === "youtube" ? "YouTube" : video.platform === "tiktok" ? "TikTok" : "Facebook"} · đã lưu {new Date(video.savedAt).toLocaleDateString("vi-VN")}</small>{video.note && <p>{video.note}</p>}<a href={video.url} target="_blank" rel="noreferrer">Mở video <ExternalLink size={13}/></a></div><button className="icon-button" onClick={() => setSavedVideos((items) => items.filter((item) => item.id !== video.id))} aria-label="Xóa link video"><X size={16}/></button></article>)}</section>}
            {cooked.length > 0 && <section className="history-box">
              <h3><History size={17} /> Món đã nấu</h3>
              {cooked.map((id) => <p key={id}>{recipeById.get(id)?.name}</p>)}
            </section>}
          </>
        )}
        {page === "settings" && (
          <>
            <section className="pref-section">
              <h2>Chế độ ăn</h2>
              <PrefRow
                icon="🥩"
                title="Không ăn thịt"
                checked={prefs.avoidMeat}
                onChange={(v) => setPrefs((p) => ({ ...p, avoidMeat: v }))}
              />
              <PrefRow
                icon="🐟"
                title="Không ăn hải sản"
                checked={prefs.avoidSeafood}
                onChange={(v) => setPrefs((p) => ({ ...p, avoidSeafood: v }))}
              />
              <PrefRow
                icon="🥬"
                title="Ăn chay"
                checked={prefs.vegetarian}
                onChange={(v) => setPrefs((p) => ({ ...p, vegetarian: v }))}
              />
              <PrefRow
                icon="🌱"
                title="Thuần chay"
                checked={prefs.vegan}
                onChange={(v) => setPrefs((p) => ({ ...p, vegan: v }))}
              />
            </section>
            <section className="pref-section">
              <h2>Điều kiện nấu</h2>
              <PrefRow
                icon="❄️"
                title="Không muốn rã đông"
                checked={prefs.noDefrost}
                onChange={(v) => setPrefs((p) => ({ ...p, noDefrost: v }))}
              />
              <p className="pref-help">Ẩn món cần rã đông.</p>
              <PrefRow icon="🔁" title="Cho phép gợi ý nguyên liệu thay thế" checked={prefs.allowSubstitutions} onChange={(v) => setPrefs((p) => ({ ...p, allowSubstitutions: v }))} />
              <p className="pref-help">Món thay thế không tính là đủ nguyên liệu gốc.</p>
              <PrefRow
                icon="🍚"
                title="Không muốn nấu cơm"
                checked={prefs.noRice}
                onChange={(v) => setPrefs((p) => ({ ...p, noRice: v }))}
              />
              <p className="pref-help">Ẩn món có gạo là nguyên liệu chính.</p>
              <PrefRow
                icon="🍳"
                title="Không muốn chiên / xào"
                checked={prefs.noFry}
                onChange={(v) => setPrefs((p) => ({ ...p, noFry: v }))}
              />
              <PrefRow
                icon="🔥"
                title="Không dùng lò nướng"
                checked={prefs.noOven}
                onChange={(v) => setPrefs((p) => ({ ...p, noOven: v }))}
              />
              <PrefRow
                icon="⚡"
                title="Ưu tiên món ít công đoạn"
                checked={prefs.quick}
                onChange={(v) => setPrefs((p) => ({ ...p, quick: v }))}
              />
              <label className="time-limit">
                <span>⏱️ Thời gian tối đa</span>
                <select
                  value={prefs.maxTime}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, maxTime: Number(e.target.value) }))
                  }
                >
                  <option value={15}>15 phút</option>
                  <option value={30}>30 phút</option>
                  <option value={45}>45 phút</option>
                  <option value={60}>Không giới hạn</option>
                </select>
              </label>
            <label className="time-limit">
              <span>🍽️ Số khẩu phần muốn nấu</span>
              <select value={prefs.servings} onChange={(event) => setPrefs((p) => ({ ...p, servings: Number(event.target.value) }))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} phần</option>)}
              </select>
            </label>
                <p className="pref-help">Áp dụng khi công thức có định lượng và khẩu phần gốc.</p>
            </section>
            <section className="pref-section">
              <h2>Không muốn dùng</h2>
              <p className="pref-help">Loại nguyên liệu khỏi gợi ý. Không thay thế kiểm tra dị ứng.</p>
              {prefs.avoid.length > 0 && <div className="avoid-selected" aria-label="Nguyên liệu đang tránh">{prefs.avoid.map((value) => {
                const id = canonicalIngredientPreference(value, ingredientIndex);
                const ingredient = ingredients.find((entry) => entry.id === id);
                const label = ingredient?.name ?? (value.startsWith("custom-") ? value.slice(7).replace(/-/g, " ") : value);
                return <button key={value} className="avoid-chip" onClick={() => setPrefs((p) => ({ ...p, avoid: p.avoid.filter((entry) => entry !== value) }))} aria-label={`Bỏ tránh ${label}`}>{ingredient?.emoji ?? "🥣"} {label}<X size={13} /></button>;
              })}</div>}
              <label className="avoid-search"><Search size={16}/><input value={avoidQuery} onChange={(event) => setAvoidQuery(event.target.value)} placeholder="Tìm nguyên liệu…" /></label>
              <div className="avoid-tags">
                {avoidCandidates.map((i) => (
                    <button
                      key={i.id}
                      className=""
                      onClick={() =>
                        setPrefs((p) => ({
                          ...p, avoid: [...new Set([...p.avoid, i.id])],
                        }))
                      }
                    >
                      {i.emoji} {i.name}
                    </button>
                  ))}
              </div>
            </section>
            <button className="reset-button" onClick={() => setPrefs(defaults)}>
              Đặt lại mặc định
            </button>
            {!isStandalone() && <section className="pref-section install-settings-section">
              <h2>Cài ứng dụng</h2>
              <p className="pref-help">Thêm Nấu Đại Đi vào màn hình chính để mở nhanh như một ứng dụng.</p>
              <button className="primary-small" onClick={() => setShowInstallHelp(true)}><Download size={16}/> Hướng dẫn cài đặt</button>
            </section>}
          </>
        )}
      </main>
      {page === "fridge" && editingStock && <div className={`expiry-modal-backdrop${expirySheetClosing ? " is-closing" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) closeStockEditor(); }}>
        <section className={`expiry-modal-sheet${expirySheetClosing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="expiry-modal-title">
          <div className="expiry-modal-handle" aria-hidden="true" onTouchStart={(event) => {
            const touch = event.touches[0];
            if (touch) expirySheetTouchStart.current = { x: touch.clientX, y: touch.clientY };
          }} onTouchEnd={(event) => {
            const start = expirySheetTouchStart.current;
            const touch = event.changedTouches[0];
            expirySheetTouchStart.current = null;
            if (start && touch && touch.clientY - start.y > 72 && touch.clientY - start.y > Math.abs(touch.clientX - start.x) * 1.2) closeStockEditor();
          }} onTouchCancel={() => { expirySheetTouchStart.current = null; }}/>
          <header className="expiry-modal-header">
            <div className="expiry-modal-ingredient-icon"><IngredientVisual name={editingStockName} emoji={editingStockIngredient?.emoji ?? "✨"} className="expiry-modal-emoji"/></div>
            <div className="expiry-modal-heading"><h2 id="expiry-modal-title">{editingStockName}</h2><p>Chỉnh sửa hạn sử dụng &amp; lưu trữ</p></div>
          </header>

          <section className="expiry-modal-section expiry-date-section" aria-labelledby="expiry-date-title">
            <div className="expiry-section-title"><h3 id="expiry-date-title">Hạn sử dụng (HSD)</h3><i aria-hidden="true"/></div>
            <div className="expiry-counter-card">
              <span className="expiry-counter-caption">Thời gian bảo quản còn lại</span>
              <div className="expiry-counter-row">
                <button type="button" className="expiry-counter-button" aria-label="Giảm một ngày" onClick={() => updateEditingStock({ expiresAt: expiryDateInDays(Math.max(0, (editingExpiryDays ?? 0) - 1)) })}><Minus size={17}/></button>
                <div className="expiry-counter-value"><strong>{editingExpiryDays === null ? "—" : editingExpiryDays < 0 ? `${editingExpiryDays}` : `+${editingExpiryDays}`}</strong><span>{editingExpiryDays === null ? "ngày" : Math.abs(editingExpiryDays) === 1 ? "ngày" : "ngày"}</span></div>
                <button type="button" className="expiry-counter-button is-primary" aria-label="Tăng một ngày" onClick={() => updateEditingStock({ expiresAt: expiryDateInDays(Math.max(0, (editingExpiryDays ?? 0) + 1)) })}><Plus size={18}/></button>
              </div>
              <span className="expiry-counter-date"><i aria-hidden="true"/>{editingStock.expiresAt ? editingExpiryDateLabel : "Chọn ngày hết hạn để theo dõi"}</span>
              <div className="expiry-presets" aria-label="Chọn nhanh hạn sử dụng">
                {[{ days: 0, label: "Hôm nay" }, { days: 2, label: "+2 ngày" }, { days: 3, label: "+3 ngày" }, { days: 7, label: "+7 ngày" }].map(({ days, label }) => <button type="button" key={days} className={editingExpiryDays === days ? "is-selected" : ""} aria-pressed={editingExpiryDays === days} onClick={() => updateEditingStock({ expiresAt: expiryDateInDays(days) })}>{label}</button>)}
              </div>
            </div>
            <div className="expiry-calendar-wrap">
              <button type="button" className="expiry-calendar-row" aria-expanded={expiryCalendarOpen} aria-label={`Chọn ngày hết hạn cho ${editingStockName}`} onClick={() => setExpiryCalendarOpen((open) => !open)}>
                <span className="expiry-calendar-icon"><CalendarDays size={17}/></span>
                <span className="expiry-calendar-copy"><small>Chọn ngày cụ thể trên lịch</small><b>{editingExpiryDateLabel}</b></span>
                <span className="expiry-calendar-change">{expiryCalendarOpen ? "Đóng lịch" : "Chọn ngày"}</span>
              </button>
              {expiryCalendarOpen && <div className="expiry-calendar-popover" aria-label="Lịch chọn hạn sử dụng">
                <div className="expiry-calendar-heading"><strong aria-live="polite">{expiryCalendarMonthLabel}</strong><div><button type="button" aria-label="Tháng trước" onClick={() => setExpiryCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ArrowLeft size={16}/></button><button type="button" aria-label="Tháng sau" onClick={() => setExpiryCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ArrowRight size={16}/></button></div></div>
                <div className="expiry-calendar-grid expiry-calendar-weekdays" aria-hidden="true">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="expiry-calendar-grid">{Array.from({ length: 42 }, (_, index) => {
                  const day = index - expiryCalendarFirstOffset + 1;
                  if (day < 1 || day > expiryCalendarDaysInMonth) return <span className="expiry-calendar-empty" key={`empty-${index}`} aria-hidden="true"/>;
                  const date = `${expiryCalendarYear}-${String(expiryCalendarMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = date === expiryCalendarToday;
                  const isSelected = date === editingStock.expiresAt;
                  return <button type="button" key={date} className={`${isToday ? "is-today " : ""}${isSelected ? "is-selected" : ""}`} aria-label={new Intl.DateTimeFormat("vi-VN", { dateStyle: "full" }).format(new Date(`${date}T12:00:00`))} aria-pressed={isSelected} onClick={() => { updateEditingStock({ expiresAt: date }); setExpiryCalendarOpen(false); }}>{day}</button>;
                })}</div>
                <div className="expiry-calendar-footer"><button type="button" onClick={() => { updateEditingStock({ expiresAt: "" }); setExpiryCalendarOpen(false); }}>Xóa ngày</button><button type="button" onClick={() => { const today = new Date(); setExpiryCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); updateEditingStock({ expiresAt: expiryCalendarToday }); setExpiryCalendarOpen(false); }}>Hôm nay</button></div>
              </div>}
            </div>
            <label className="expiry-freshness-row"><span>Tình trạng nguyên liệu</span><select aria-label={`Tình trạng ${editingStockName}`} value={editingStock.fresh} onChange={(event) => updateEditingStock({ fresh: event.target.value as Stock["fresh"] })}><option value="fresh">Tươi</option><option value="soon">Sắp hết hạn</option><option value="urgent">Dùng ngay</option><option value="spoiled">Đã hỏng</option></select></label>
          </section>

          <section className="expiry-modal-section expiry-storage-section" aria-labelledby="expiry-storage-title">
            <h3 id="expiry-storage-title">Vị trí lưu trữ</h3>
            <div className="expiry-storage-options">
              {[{ id: "fridge", emoji: "❄️", label: "Ngăn mát", detail: "Bảo quản lạnh" }, { id: "freezer", emoji: "🧊", label: "Ngăn đông", detail: "Bảo quản đông" }, { id: "pantry", emoji: "🧺", label: "Ngoài / Khô", detail: "Nhiệt độ phòng" }].map((location) => <button type="button" key={location.id} className={stockLocation(editingStock) === location.id ? "is-selected" : ""} aria-pressed={stockLocation(editingStock) === location.id} onClick={() => updateEditingStock({ storageLocation: location.id as NonNullable<Stock["storageLocation"]>, frozen: location.id === "freezer" })}><span className="expiry-storage-emoji" aria-hidden="true">{location.emoji}</span><b>{location.label}</b><small>{location.detail}</small></button>)}
            </div>
          </section>

          <section className="expiry-quantity-row" aria-label="Khẩu phần" onClick={(event) => { if (!(event.target as HTMLElement).closest(".expiry-unit-picker")) setExpiryUnitOpen(false); }}>
            <h3>Khẩu phần</h3>
            <div className="expiry-quantity-control">
              <button type="button" aria-label="Giảm số lượng" onClick={() => updateEditingStock({ quantity: String(Math.max(0, (Number.parseFloat(editingStock.quantity) || 0) - 1)) })}><Minus size={14}/></button>
              <strong>{editingStock.quantity}</strong>
              <div className="expiry-unit-picker">
                <button type="button" className="expiry-unit-trigger" aria-label={`Đơn vị ${editingStockName}: ${editingStock.unit}`} aria-haspopup="listbox" aria-expanded={expiryUnitOpen} onClick={() => setExpiryUnitOpen((open) => !open)}>{editingStock.unit}</button>
              </div>
              <button type="button" aria-label="Tăng số lượng" onClick={() => updateEditingStock({ quantity: String((Number.parseFloat(editingStock.quantity) || 0) + 1) })}><Plus size={14}/></button>
            </div>
          </section>
          {expiryUnitOpen && <div className="expiry-unit-options" role="listbox" aria-label="Chọn đơn vị">{["phần", "g", "kg", "ml", "l", "củ", "quả", "bó", "gói", "con"].map((unit) => <button type="button" role="option" aria-selected={editingStock.unit === unit} className={editingStock.unit === unit ? "is-selected" : ""} key={unit} onClick={() => { updateEditingStock({ unit }); setExpiryUnitOpen(false); }}>{unit}</button>)}</div>}

          <div className="expiry-modal-actions">
            <button type="button" className="expiry-save-button" onClick={() => { setStock((items) => items.map((item) => item.id === editingStock.id ? editingStock : item)); closeStockEditor(); }}><Check size={16}/> Lưu thông tin</button>
            <button type="button" className="expiry-delete-button" onClick={() => {
              const message = `Đã xóa ${editingStockName} khỏi tủ lạnh.`;
              setStock((items) => items.filter((item) => item.id !== editingStock.id));
              setPickerMessage(message);
              setPickerUndoId("");
              setUndoRemovedStock(editingStock);
              toastAfterSheetClose.current = message;
              closeStockEditor();
            }}>Xóa nguyên liệu này</button>
          </div>
        </section>
      </div>}
      {page === "fridge" && stock.length > 0 && !pickerOpen && !modal && (
        <div className="find-dock">
          <button className="find-button" onClick={showBestTab}>
            <CookingPot size={18} />
            <span>Gợi ý món từ tủ</span>
            <span className="find-count">{stock.length}</span>
          </button>
        </div>
      )}
      {page !== "cook" && !modal && <nav className="bottom-nav" data-testid="bottom-navigation" aria-label="Điều hướng chính">
        <button
          className={page === "home" ? "nav-active" : ""}
          onClick={() => setPage("home")}
        >
          <Home size={19} />
          <span>Hôm nay</span>
        </button>
        <button
          className={page === "fridge" ? "nav-active" : ""}
          onClick={() => setPage("fridge")}
        >
          <Apple size={19} />
          <span>Tủ lạnh</span>
        </button>
        <button
          className={page === "explore" ? "nav-active" : ""}
          onClick={() => setPage("explore")}
        >
          <BookOpen size={19} />
          <span>Khám phá</span>
        </button>
        <button
          className={page === "trending" ? "nav-active" : ""}
          onClick={() => setPage("trending")}
        >
          <Video size={19} />
          <span>Video</span>
        </button>
        <button
          className={page === "favorites" ? "nav-active" : ""}
          onClick={() => setPage("favorites")}
        >
          <Heart size={19} />
          <span>Đã lưu</span>
        </button>
      </nav>}
      {cookAlarmVisible && page === "cook" && cookingRecipe && <div className="cook-alarm-overlay">
        <section className="cook-alarm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cook-alarm-title" aria-describedby="cook-alarm-detail">
          <span className="cook-alarm-icon"><Clock size={32}/></span>
          <span className="cook-alarm-kicker">HẸN GIỜ NẤU</span>
          <h2 id="cook-alarm-title">Hết giờ rồi!</h2>
          <p className="cook-alarm-recipe">{cookingRecipe.name}</p>
          <p id="cook-alarm-detail" className="cook-alarm-step">Bước {cookingStep + 1} · {activeStepTitle || "Kiểm tra món ăn"}</p>
          <button ref={alarmDismissButtonRef} className="cook-alarm-dismiss" onClick={stopCookAlarm}><Check size={20}/> Tắt báo thức</button>
        </section>
      </div>}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section className="recipe-modal" role="dialog" aria-modal="true" aria-labelledby="recipe-title">
            <div className="modal-handle" />
            <header className="modal-top">
              <button onClick={() => setModal(null)} aria-label="Đóng">
                <ArrowLeft size={20} />
              </button>
              <span>CHI TIẾT MÓN ĂN</span>
              {!sourceCatalogDetail && <button
                onClick={() => toggleFavorite(modal.id)}
                aria-label={favorites.includes(modal.id) ? "Bỏ yêu thích" : "Lưu yêu thích"}
                aria-pressed={favorites.includes(modal.id)}
              >
                <Heart
                  size={20}
                  fill={favorites.includes(modal.id) ? "currentColor" : "none"}
                />
              </button>}
            </header>
            <div className="modal-scroll" ref={recipeDetailScrollRef}>
              {(() => {
                const localImage = recipeImageFor(modal.id);
                if (localImage) {
                  const aiIllustration = localImage.imageType === "ai_illustration";
                  return <figure className="recipe-detail-image" data-emoji={modal.emoji}><img src={localImage.imagePath} alt={aiIllustration ? `Ảnh minh họa AI cho món ${modal.name}` : `Ảnh ${modal.name}`} decoding="async" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("image-unavailable"); }}/><figcaption>{aiIllustration ? <><strong>Ảnh minh họa AI</strong> · Không phải ảnh thật của món. {localImage.notes}</> : localImage.source === "knorr" ? <>Ảnh từ <a href={modal.source.url} target="_blank" rel="noreferrer">Knorr Việt Nam</a> (đã tối ưu WebP).</> : localImage.source === "mnnm" ? <>Ảnh từ <a href={mnnmRecipeSelection?.source_url ?? modal.source.url} target="_blank" rel="noreferrer">Món Ngon Mỗi Ngày</a> (đã tối ưu WebP).</> : <>Ảnh: <a href={localImage.sourcePageUrl} target="_blank" rel="noreferrer">{localImage.author} · Wikimedia Commons</a> · <a href={localImage.licenseUrl} target="_blank" rel="noreferrer">{localImage.license}</a>. {localImage.fitNotes}</>}</figcaption></figure>;
                }
                if (mnnmRecipeSelection?.image_url) {
                  return <figure className="recipe-detail-image" data-emoji={modal.emoji}><img src={mnnmRecipeSelection.image_url} alt={`Ảnh món ${modal.name}`} decoding="async" referrerPolicy="no-referrer" onError={(event) => fallbackMnnmImage(event, mnnmRecipeSelection)}/><figcaption>Ảnh từ <a href={mnnmRecipeSelection.source_url} target="_blank" rel="noreferrer">Món Ngon Mỗi Ngày</a>.</figcaption></figure>;
                }
                if (modal.imageUrl) {
                  return <figure className="recipe-detail-image" data-emoji={modal.emoji}><img src={modal.imageUrl} alt={`Ảnh món ${modal.name}`} decoding="async" referrerPolicy="no-referrer" onError={(event) => fallbackRecipeSourceImage(event, modal)}/><figcaption>Ảnh từ <a href={modal.source.url} target="_blank" rel="noreferrer">Knorr Việt Nam</a>.</figcaption></figure>;
                }
                if (flexibleRecipeImageFor(modal)) {
                  const image = flexibleRecipeImageFor(modal)!;
                  const specificImage = flexibleRecipeImageMatches(modal);
                  return <figure className={`recipe-detail-image flexible-detail-image${specificImage ? "" : " flexible-ingredient-detail"}`} data-emoji={modal.emoji}>
                    {specificImage
                      ? <><img src={image.imagePath} alt={`Ảnh minh họa AI cho món ${modal.name}`} decoding="async" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.classList.add("image-unavailable"); }}/><figcaption><strong>Ảnh minh họa AI theo món</strong> · Không phải ảnh chụp thành phẩm thực tế.</figcaption></>
                      : <><FlexibleIngredientBoard recipe={modal}/><figcaption><strong>Nguyên liệu trong gợi ý</strong> · Hình hiển thị các nguyên liệu được phối cho món này, không phải ảnh thành phẩm.</figcaption></>}
                  </figure>;
                }
                return <div className="hero-food">{modal.emoji}</div>;
              })()}
              <div className="confidence">
                {mnnmRecipeSelection
                  ? "Món Ngon Mỗi Ngày · nội dung nguồn, chưa rà soát thủ công"
                  : sourceCatalogDetail
                  ? sourceRecipeDetail?.instruction_authorship === "independently_authored"
                    ? "Hướng dẫn biên soạn độc lập · cần rà soát"
                    : sourceCatalogDetail.quality_status === "complete" && sourceCatalogDetail.has_instructions && sourceCatalogDetail.has_ingredients
                    ? "Dinh dưỡng 2598 · đủ trường theo kiểm tra tự động, chưa xác minh thủ công"
                    : "Danh mục nguồn · bản tóm tắt, chưa xác minh thủ công"
                  : modal.source.title === "Knorr Việt Nam"
                  ? "Knorr Việt Nam · nội dung nguồn, chưa rà soát thủ công"
                  : modal.source.title.startsWith("Gợi ý linh hoạt")
                  ? "Gợi ý tự phối từ tủ lạnh · chưa thử nghiệm"
                  : modal.dataStatus === "ingredients_only"
                  ? "Danh sách nguyên liệu · chưa có hướng dẫn"
                  : modal.verificationStatus === "adapted"
                  ? "Hướng dẫn biên soạn theo nguồn tham khảo · cần rà soát"
                  : modal.verificationStatus === "verified"
                  ? "✓ Công thức đã xác minh"
                  : "◇ Công thức nội bộ · chưa xác minh"}
              </div>
              <h2 id="recipe-title">{modal.name}</h2>
              {modal.description && <p className="modal-description">{modal.description}</p>}
              {mnnmRecipeSelection && <p className="instruction-reference">Nguồn công thức: <a href={mnnmRecipeSelection.source_url} target="_blank" rel="noreferrer">Món Ngon Mỗi Ngày <ExternalLink size={12}/></a></p>}
              {mnnmDetailLoad === "loading" && <p role="status" className="source-catalog-state">Đang tải nguyên liệu và cách làm…</p>}
              {mnnmDetailLoad === "error" && mnnmRecipeSelection && <p role="alert" className="source-catalog-state">Chưa tải được chi tiết món. <button className="text-button" onClick={() => openMnnmRecipe(mnnmRecipeSelection)}>Thử tải lại</button></p>}
              {mnnmRecipeDetail?.warnings.length ? <p className="source-unmatched-warning" role="status">Bản ghi có cảnh báo dữ liệu nguồn: {mnnmRecipeDetail.warnings.join(" · ")}</p> : null}
              {modal.instructionReference && <p className="instruction-reference">{modal.instructionReference.matchType === "similar" ? "Món tham khảo gần giống (không phải công thức của món này)" : "Tham khảo cách nấu cùng món"}: <a href={modal.instructionReference.url} target="_blank" rel="noreferrer">{modal.instructionReference.title} <ExternalLink size={12}/></a></p>}
              <div className="recipe-stats">
                <span>
                  <Clock size={16} />
                  {modal.totalTime !== null ? <>{modal.source.title.startsWith("Copper") ? "" : "~"}{modal.totalTime} phút</> : "Chưa rõ thời gian"}
                </span>
                <span>✦ {modal.difficulty}</span>
                <span>
                  <UtensilsCrossed size={16} />
                  {modal.category}
                </span>
              </div>
              {sourceCatalogDetail && <section className="source-recipe-details">
                {sourceRecipeLoad() === "loading" && <p role="status">Đang tải nguyên liệu và hướng dẫn từ dữ liệu đã thu thập…</p>}
                {sourceRecipeLoad() === "error" && <div role="alert"><b>Không tải được chi tiết món.</b><button className="text-button" onClick={() => openSourceCatalogItem(sourceCatalogDetail)}>Thử tải lại</button></div>}
                {sourceCatalogDetail.quality_status === "unmatched" && <div className="source-unmatched-warning" role="alert"><b>Nguồn chưa xác nhận.</b> Bản ghi catalog chưa ghép chắc chắn với trang chi tiết tương ứng; không coi URL gợi ý dưới đây là xác nhận nội dung.</div>}
                {sourceRecipeDetail?.instruction_authorship === "independently_authored" && <div className="source-unmatched-warning" role="status"><b>Hướng dẫn biên soạn độc lập · cần rà soát.</b> Chưa thử nghiệm thực tế; có thể xem nguồn tham khảo về cách nấu phổ biến tại <a href={sourceRecipeDetail.instruction_reference_url} target="_blank" rel="noreferrer">{sourceRecipeDetail.instruction_reference_title}</a>. Hướng dẫn được viết lại theo nguyên liệu của bản ghi đang mở.</div>}
                {!!sourceCatalogDetail.serving_options?.length && <div className="source-serving-picker"><label htmlFor="source-serving-option">Khẩu phần / kích thước</label><select id="source-serving-option" value={selectedServingSourceId || sourceRecipeDetail?.id || sourceCatalogDetail.serving_options[0].sourceRecipeId} onChange={(event) => selectSourceServingOption(sourceCatalogDetail, event.target.value)}>{sourceCatalogDetail.serving_options.map((option) => <option key={option.sourceRecipeId} value={option.sourceRecipeId}>{option.label}{option.ageGroups.length && !option.ageScopeIncomplete ? ` · ${option.ageGroups.join(", ")}` : ""}</option>)}</select><small>Nguyên liệu và hướng dẫn được đọc theo đúng bản ghi nguồn đã chọn.</small></div>}
                {sourceRecipeLoad() === "idle" && sourceCatalogDetail.serving_options?.some((option) => option.sourceRecipeConflict) && <p className="source-unmatched-warning" role="status">Có bản ghi cùng khẩu phần nhưng khác nội dung nguyên liệu hoặc hướng dẫn; hệ thống giữ từng lựa chọn nguồn riêng.</p>}
                {sourceCatalogDetail.ingredient_list_conflict && <p className="source-unmatched-warning" role="status">Danh sách nguyên liệu khác nhau giữa các biến thể nguồn. Tủ lạnh chỉ đối chiếu danh sách của biến thể canonical đang hiển thị.</p>}
                <p><b>Trạng thái dữ liệu:</b> {sourceCatalogDetail.quality_status === "complete" ? "Đầy đủ theo kiểm tra tự động, chưa xác minh thủ công" : sourceCatalogDetail.quality_status === "needs_review" ? "Có dữ liệu nhưng cần rà soát" : sourceCatalogDetail.quality_status === "unmatched" ? "Chưa ghép chắc chắn với món nguồn" : "Nguồn thiếu trường dữ liệu"}<br/><b>Nhóm món:</b> {sourceRecipeDetail?.category ?? sourceCatalogDetail.category ?? "Không có dữ liệu"}<br/><b>Nhóm tuổi:</b> {sourceRecipeDetail?.age_group ?? sourceCatalogDetail.age_group ?? "Không ghi nhóm tuổi"}<br/><b>Khẩu phần nguồn:</b> {sourceRecipeDetail?.serving?.raw ?? "Không có dữ liệu"}</p>
                {sourceRecipeDetail && sourceRecipeWarnings(sourceRecipeDetail).length > 0 && <div className="source-unmatched-warning" role="alert"><b>Cảnh báo dữ liệu nguồn</b><ul>{sourceRecipeWarnings(sourceRecipeDetail).map((warning) => <li key={warning}>{warning.replace(/_/g, " ")}</li>)}</ul>{sourceRecipeDetail.integrity_findings.length > 0 && <p>Kiểm tra tự động phát hiện khả năng tên nguyên liệu và hướng dẫn không khớp. Đây là cảnh báo cần rà soát, không phải kết luận chắc chắn sai.</p>}</div>}
                {sourceRecipeDetail?.ingredients?.length && stock.length > 0 && <div><b>Đối chiếu tủ lạnh · {sourceRecipeMissingIngredients({ ...sourceCatalogDetail, ingredients: sourceRecipeDetail.ingredients.map((entry) => entry.name) }, stock.map((item) => item.name ?? nameFor(item.id)))?.length ?? 0} nguyên liệu cần thêm hoặc chưa nhận diện</b><p>{sourceRecipeMissingIngredients({ ...sourceCatalogDetail, ingredients: sourceRecipeDetail.ingredients.map((entry) => entry.name) }, stock.map((item) => item.name ?? nameFor(item.id)))?.join(" · ") || "Tên nguyên liệu trong danh sách đang có đã khớp"}</p></div>}
                {sourceRecipeDetail?.ingredients?.length && !sourceRecipeEligibleForFridge(sourceRecipeDetail) && <p role="note">Món này chưa được tính là gợi ý nấu từ tủ lạnh: danh sách/hướng dẫn thiếu hoặc dữ liệu đang cần rà soát.</p>}
                {sourceRecipeLoad() === "idle" && sourceRecipeDetail && sourceRecipeCompleteness(sourceRecipeDetail) === "recipe_with_warnings" && <b>Có hướng dẫn nguồn nhưng cần rà soát; không tính là món sẵn sàng nấu từ tủ lạnh.</b>}
                {sourceRecipeLoad() === "idle" && sourceRecipeDetail && sourceRecipeCompleteness(sourceRecipeDetail) === "method_only" && <b>Có hướng dẫn nhưng thiếu danh sách nguyên liệu; không thể đối chiếu để gợi ý nấu.</b>}
                {sourceRecipeLoad() === "idle" && sourceRecipeDetail && sourceRecipeCompleteness(sourceRecipeDetail) === "ingredients_only" && <b>Chưa có hướng dẫn chế biến trong dữ liệu nguồn.</b>}
                {sourceRecipeLoad() === "idle" && sourceRecipeDetail && sourceRecipeCompleteness(sourceRecipeDetail) === "no_recipe_content" && <b>Chưa có hướng dẫn hoặc danh sách nguyên liệu trong dữ liệu nguồn.</b>}
                {(sourceRecipeDetail?.source_url ?? sourceCatalogDetail.source_url) && <a href={sourceRecipeDetail?.source_url ?? sourceCatalogDetail.source_url!} target="_blank" rel="noreferrer">Mở trang tham khảo nguồn <ExternalLink size={14}/></a>}
              </section>}
              {mnnmRecipeSelection ? <div className="honesty-note">Nguyên liệu, hướng dẫn và ảnh được lấy từ Món Ngon Mỗi Ngày; dữ liệu chưa được rà soát thủ công. Mở liên kết nguồn để đối chiếu nội dung gốc.</div> : sourceCatalogDetail ? <div className="honesty-note">{sourceRecipeDetail?.instruction_authorship === "independently_authored" ? "Hướng dẫn được biên soạn lại, có đối chiếu nguồn tham khảo và chưa được thử nghiệm độc lập. Nguyên liệu bổ sung riêng cho cách nấu được đánh dấu bên dưới; dữ liệu nguồn gốc vẫn được giữ nguyên." : "Nội dung công thức được giữ nguyên từ nguồn và chưa được xác minh thủ công."}</div> : modal.source.title === "Knorr Việt Nam" ? <div className="honesty-note">Nguyên liệu, hướng dẫn và ảnh được lấy từ Knorr Việt Nam; dữ liệu chưa được rà soát thủ công. Mở liên kết nguồn để đối chiếu với trang gốc.</div> : modal.source.title.startsWith("Gợi ý linh hoạt") ? <div className="honesty-note">Đây là cách phối món được tạo từ nguyên liệu bạn đang có, không phải công thức lấy từ website. Hướng dẫn chưa được thử nghiệm; hãy nấu chín kỹ nguyên liệu sống và nêm từng ít một.</div> : modal.verificationStatus === "adapted" ? <div className="honesty-note">Công thức đã được điều chỉnh từ nguồn tham khảo bên dưới; chưa được thử nghiệm độc lập. Nếu nguồn dùng nguyên liệu hoặc cách nấu khác, phần khác biệt được ghi trong mẹo.</div> : modal.dataStatus === "ingredients_only" ? <div className="honesty-note">Nguồn chỉ cung cấp danh sách nguyên liệu và thông tin tổng quan, chưa có định lượng hoặc hướng dẫn nấu. Không coi đây là công thức hoàn chỉnh.</div> : modal.verificationStatus !== "verified" && <div className="honesty-note">Công thức nội bộ, chưa được xác minh độc lập. Hãy đảm bảo nguyên liệu chín kỹ và phù hợp với bạn.</div>}
              {(() => {
                const required = modal.ingredients.filter((item) => !item.optional);
                const canAdjust = modal.servings !== null && required.length > 0 && required.every((item) => item.quantity !== null && isScalableRecipeUnit(item.unit));
                return <div className="servings-row">
                  <div>
                    <h3>Nguyên liệu</h3>
                    <span>{canAdjust ? `${prefs.servings} phần${modal.servings !== prefs.servings ? ` · điều chỉnh từ ${modal.servings} phần` : ""}` : "Chưa có định lượng để điều chỉnh khẩu phần"}</span>
                  </div>
                </div>;
              })()}
              <div className="ingredient-detail">
              {(() => {
                const addedIngredients = sourceRecipeDetail?.instruction_added_ingredients ?? [];
                const addedNames = new Set(addedIngredients.map((entry) => entry.name));
                const renderIngredient = (item: (typeof modal.ingredients)[number]) => {
                  const id = item.ingredientId;
                  const sourceIngredientName = item.sourceName ?? id;
                  const instructionAddition = sourceRecipeDetail?.instruction_added_ingredients?.find((entry) => entry.name === sourceIngredientName);
                  const canonicalId = ingredientIndex.byId.has(id) ? id : resolveIngredientId(item.sourceName ?? id, ingredientIndex) ?? `custom:${normalizeVietnamese(item.sourceName ?? id)}`;
                  const matchedIngredient = ingredients.find((ingredient) => ingredient.id === canonicalId);
                  const recipeRecommendation = recommendationById.get(modal.id);
                  const have = ids.has(id) || !!recipeRecommendation?.matchedIngredients.includes(canonicalId);
                  const shortage = recipeRecommendation?.quantityShortages.find((entry) => entry.ingredientId === id);
                  const scaledQuantity = scaleRecipeQuantity(item.quantity, item.unit, modal.servings, prefs.servings);
                  const embeddedQuantity = sourceIngredientName.match(/(?:\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|½|¼)\s*(?:kg|g|mg|ml|l|m|muỗng(?:\s+(?:canh|cà\s+phê))?|thìa(?:\s+(?:canh|cà\s+phê))?|chén|tô|củ|trái|quả|con|cây|lá|bó|gói|miếng|nhánh)\s*$/iu)?.[0]?.trim();
                  const sourceNote = item.note && normalizeVietnamese(item.note) !== normalizeVietnamese(sourceIngredientName) ? item.note : embeddedQuantity ?? null;
                  const neededText = item.quantity === null ? sourceNote : `${formatRecipeQuantity(scaledQuantity ?? item.quantity)} ${item.unit}${scaledQuantity === null ? " · lượng gốc, chưa điều chỉnh" : ""}`.trim();
                  return (
                    <div key={id}>
                      <span className="detail-emoji">{matchedIngredient?.emoji ?? "🥣"}</span>
                      <span>
                        {modal.source.title === "Knorr Việt Nam" ? sourceIngredientName : matchedIngredient?.name ?? item.sourceName ?? nameFor(id)}
                        <small className="ingredient-role">{mnnmRecipeSelection ? "Theo danh sách nguyên liệu từ nguồn" : instructionAddition?.usage_status === "optional" ? "Tùy khẩu vị theo hướng dẫn tham khảo · chưa có định lượng nguồn" : instructionAddition?.usage_status === "not_mentioned" ? "Có trong danh sách tham khảo nhưng bước nấu chưa nhắc đến · cần xác minh" : instructionAddition?.role === "seasoning" ? "Gia vị bổ sung theo hướng dẫn tham khảo · chưa có định lượng nguồn" : instructionAddition?.role === "aromatic_or_garnish" ? "Rau thơm/hương liệu bổ sung theo hướng dẫn · chưa có định lượng nguồn" : instructionAddition?.role === "cooking_liquid" ? "Nước dùng/chất lỏng bổ sung theo hướng dẫn · chưa có định lượng nguồn" : instructionAddition ? "Nguyên liệu bổ sung theo hướng dẫn tham khảo · chưa có định lượng nguồn" : item.instructionAdded ? "Bổ sung cho hướng dẫn tham khảo · chưa có định lượng trong dữ liệu nguồn" : sourceRecipeDetail?.ingredients?.some((entry) => entry.instruction_added && entry.name === sourceIngredientName) ? "Bổ sung cho hướng dẫn biên soạn · chưa có định lượng trong dữ liệu nguồn" : item.role === "main" ? "Nguyên liệu chính" : item.role === "seasoning" ? "Gia vị theo công thức" : item.optional ? "Tùy chọn" : "Bắt buộc theo công thức"}</small>
                      </span>
                      <span className={mnnmRecipeSelection || have ? "have" : "need"}>
                        {mnnmRecipeSelection || modal.source.title === "Knorr Việt Nam" ? neededText ?? "–" : have
                          ? shortage ? `Đang có · thiếu ${formatRecipeQuantity(Math.max(0, shortage.needed - shortage.available))} ${shortage.unit} (có ${formatRecipeQuantity(shortage.available)}, cần ${formatRecipeQuantity(shortage.needed)})` : neededText ? `Đang có · cần ${neededText}` : "Đang có"
                          : item.optional
                            ? "Tùy chọn"
                          : neededText ? `Cần thêm · ${neededText}` : "Cần thêm"}{item.quantity === null && !item.note && !item.optional && modal.source.title !== "Knorr Việt Nam" ? " · Chưa có định lượng" : ""}
                      </span>
                    </div>
                  );
                };
                if (!addedIngredients.length) return modal.ingredients.map(renderIngredient);
                const sourceIngredients = modal.ingredients.filter((item) => !addedNames.has(item.sourceName ?? item.ingredientId));
                const recipeIngredients = modal.ingredients.filter((item) => addedNames.has(item.sourceName ?? item.ingredientId));
                return <>
                  <div className="ingredient-group-label">Nguyên liệu trong danh mục nguồn</div>
                  {sourceIngredients.map(renderIngredient)}
                  <div className="ingredient-group-label">Bổ sung theo hướng dẫn tham khảo · chưa có định lượng nguồn</div>
                  {recipeIngredients.map(renderIngredient)}
                </>;
              })()}
              </div>
              {modal.ingredients.some((item) => !item.optional) && <button className="modal-shopping-action" onClick={() => addMissingToShopping(modal)}><ShoppingBasket size={17}/> Thêm nguyên liệu còn thiếu vào sổ đi chợ</button>}
              {prefs.allowSubstitutions && (recommendationById.get(modal.id)?.substitutions.length ?? 0) > 0 && <section className="substitution-panel">
                <h3>Nguyên liệu thay thế</h3>
                <p>Chỉ là lựa chọn tham khảo cho món này; công thức gốc và định lượng không bị thay đổi. Nếu có dị ứng, hãy tự kiểm tra nhãn và thành phần trước khi dùng.</p>
                {recommendationById.get(modal.id)!.substitutions.map((suggestion) => {
                  const originalName = recommendationName(modal, suggestion.originalIngredientId);
                  const substituteName = recommendationName(modal, suggestion.substituteIngredientId);
                  const selectionKey = `${modal.id}:${suggestion.originalIngredientId}`;
                  const selected = selectedSubstitutions[selectionKey] === suggestion.substituteIngredientId;
                  return <article className="substitution-option" key={suggestion.rule.id}>
                    <div className="substitution-option-head"><b>Thiếu {originalName}</b><span className={suggestion.availability === "in_fridge" ? "substitution-stock" : "substitution-buy"}>{suggestion.availability === "in_fridge" ? "Có trong tủ" : "Cần mua"}</span></div>
                    <p>Có thể cân nhắc dùng <b>{substituteName}</b> · phù hợp có điều kiện</p>
                    {suggestion.rule.flavorImpact && <small>{suggestion.rule.flavorImpact}</small>}
                    {suggestion.rule.textureImpact && <small>{suggestion.rule.textureImpact}</small>}
                    {suggestion.rule.cookingAdjustment && <small>{suggestion.rule.cookingAdjustment}</small>}
                    <div className="substitution-option-actions">
                      <button className={selected ? "substitution-selected" : ""} onClick={() => setSelectedSubstitutions((current) => ({ ...current, [selectionKey]: selected ? "" : suggestion.substituteIngredientId }))}>{selected ? "Đã chọn cho kế hoạch" : "Chọn cho kế hoạch"}</button>
                      <a href={suggestion.rule.sourceUrl} target="_blank" rel="noreferrer">Nguồn tham khảo <ExternalLink size={13}/></a>
                        {suggestion.rule.supportingSourceUrls?.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">Nguồn về đặc tính nguyên liệu <ExternalLink size={13}/></a>)}
                    </div>
                  </article>;
                })}
              </section>}
              {modal.steps.length > 0 ? <><h3 className="steps-title">{mnnmRecipeSelection ? "Các bước thực hiện" : "Cách làm"}</h3>{mnnmRecipeSelection && <p className="mnnm-steps-summary">{modal.steps.length} bước · theo hướng dẫn gốc</p>}<div className={`steps${mnnmRecipeSelection ? " mnnm-steps" : ""}`}>
                {modal.steps.map((step, i) => {
                  const phaseSeparator = mnnmRecipeSelection ? step.instruction.indexOf(": ") : -1;
                  const phase = phaseSeparator > 0 ? step.instruction.slice(0, phaseSeparator) : "";
                  const instruction = phase ? step.instruction.slice(phaseSeparator + 2) : step.instruction;
                  return <button
                    key={i}
                    className={`step${done.includes(i) ? " done" : ""}${mnnmRecipeSelection ? " mnnm-step" : ""}`}
                    onClick={() => setDone((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i])}
                  >
                    <span>{done.includes(i) ? <Check size={16} /> : i + 1}</span>
                    {mnnmRecipeSelection ? <span className="mnnm-step-copy">{phase && <small>{phase}</small>}<p>{instruction}</p></span> : <p>{step.instruction}</p>}
                  </button>;
                })}
              </div></> : mnnmDetailLoad === "loading" ? null : <div className="no-instructions"><b>Chưa có hướng dẫn chi tiết trong dữ liệu này.</b>{modal.source.url && <a href={modal.source.url} target="_blank" rel="noreferrer">Mở trang nguồn <ExternalLink size={14}/></a>}</div>}
              {modal.equipment.length > 0 && <div className="equipment"><b>Dụng cụ:</b> {modal.equipment.join(" · ")}</div>}
              {modal.tips.length > 0 && <div className="tip">
                <b>✨ Mẹo nhỏ</b>
                {modal.tips.slice(0, 2).map((tip, index) => <p key={`${index}-${tip}`}>{shortSourceTip(tip)}</p>)}
              </div>}
              {mnnmRecipeSelection ? <p className="source">Nguồn Món Ngon Mỗi Ngày · chưa xác minh độc lập · <a href={mnnmRecipeSelection.source_url} target="_blank" rel="noreferrer">Mở nguồn</a></p> : <p className="source">Nguồn: {modal.source.title}{modal.source.url && <> · <a href={modal.source.url} target="_blank" rel="noreferrer">Mở nguồn</a></>}</p>}
              {activeLibraryResultGroup && activeLibraryResultGroup.variants.length > 0 && <section className="library-variants" aria-label="Nguồn và biến thể của món này">
                <h3>Nguồn / biến thể cùng tên</h3>
                <p>Một thẻ món được giữ trong danh sách. Chọn nguồn hoặc thành phần khác để xem bản tương ứng.</p>
                <div>{[activeLibraryResultGroup.primary, ...activeLibraryResultGroup.variants].filter((entry) => entry.key !== modal.id).map((entry) => {
                  const source = entry.kind === "source" ? "Dinh dưỡng 2598" : entry.kind === "mnnm" ? "Món Ngon Mỗi Ngày" : entry.recipe.source.title;
                  const count = entry.kind === "recipe" ? entry.recipe.ingredients.length : entry.kind === "source" ? entry.item.ingredients?.length ?? 0 : entry.item.ingredient_count;
                  return <button key={entry.key} type="button" onClick={() => openLibraryCandidate(activeLibraryResultGroup, entry)}>{source} · {count} nguyên liệu</button>;
                })}</div>
              </section>}
            </div>
            <div className="modal-action">
              <div className="modal-action-row">
                {modal.steps.length > 0 && (sourceCatalogDetail && (!sourceRecipeDetail || sourceRecipeCompleteness(sourceRecipeDetail) !== "cookable")
                  ? <p className="source-cook-blocked" role="status">Nguồn còn cảnh báo dữ liệu nên chưa thể bắt đầu nấu. Hãy mở nguồn để đối chiếu trước.</p>
                  : <button className="modal-cook-action" onClick={() => startCooking(modal)}><CookingPot size={18}/> Bắt đầu nấu</button>)}
                <button className="modal-done-action" onClick={() => {
                  setCooked((c) => [modal.id, ...c.filter((x) => x !== modal.id)]);
                  setModal(null);
                  setPage("favorites");
                }}><Check size={17}/> Đã nấu món này</button>
              </div>
            </div>
          </section>
        </div>
      )}
      {showInstallHelp && <div className="modal-backdrop install-backdrop" role="dialog" aria-modal="true" aria-labelledby="install-title"><section className="install-card"><button className="close-install" onClick={() => dismissInstallHelp()} aria-label="Đóng"><X size={18}/></button><img className="brand-logo-image" src="/icon.svg" alt=""/><h2 id="install-title">Cài Nấu Đại Đi lên màn hình chính</h2><div className="install-instructions">{!window.isSecureContext ? <><p>Để cài như ứng dụng, trang cần HTTPS. Hãy mở lại đường dẫn QR sau khi triển khai Nấu Đại Đi lên Vercel.</p><button className="qr-link" onClick={() => dismissInstallHelp()}>Tiếp tục vào web</button></> : isIOSDevice() ? <><p>Mở trang này bằng Safari, chạm <b>Chia sẻ</b>, chọn <b>Thêm vào Màn hình chính</b>, rồi chạm <b>Thêm</b>.</p><p>iPhone/iPad yêu cầu bạn xác nhận các bước này; website không thể tự thêm biểu tượng thay bạn.</p><button className="qr-link" onClick={() => dismissInstallHelp()}>Tiếp tục vào web</button></> : installPrompt ? <><p>Chạm bên dưới để mở hộp thoại cài đặt của trình duyệt. Xác nhận thêm một lần trong hộp thoại để Nấu Đại Đi xuất hiện trên màn hình chính.</p><button className="qr-link install-action" onClick={async () => { const prompt = installPrompt; await prompt.prompt(); const choice = await prompt.userChoice; setInstallPrompt(null); if (choice.outcome === "accepted") dismissInstallHelp(); }}><Download size={17}/> Cài Nấu Đại Đi</button></> : <><p>Nếu trình duyệt hỗ trợ cài PWA, lựa chọn cài đặt sẽ xuất hiện trong menu trình duyệt.</p><p><b>Android/Chrome:</b> mở menu ⋮ rồi chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>.</p><p><b>iPhone/iPad:</b> dùng Safari, chạm <b>Chia sẻ → Thêm vào Màn hình chính → Thêm</b>.</p><button className="qr-link" onClick={() => dismissInstallHelp()}>Tiếp tục vào web</button></>}</div></section></div>}
      {toastMessage && <div className="app-toast" role="status" aria-live="polite"><CheckCircle2 size={18} aria-hidden="true"/><span>{toastMessage}</span></div>}
    </div>
  );
}

function QrPage() {
  const url = `${window.location.origin}/?install=1`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(url)}`;
  return <main className="qr-page"><a className="qr-back" href="/">← Quay lại ứng dụng</a><div className="qr-card"><div className="brand"><img className="brand-logo-image" src="/icon.svg" alt=""/><span className="brand-wordmark"><span>Nấu</span><span>Đại</span><span>Đi</span></span></div><h1>Quét để mở và cài Nấu Đại Đi</h1><p>Quét mã sẽ mở trang hướng dẫn cài phù hợp với điện thoại. Android có thể mở hộp thoại cài đặt; iPhone/iPad cần xác nhận qua menu Chia sẻ.</p><img className="qr-image" src={qr} alt={`Mã QR mở trang cài Nấu Đại Đi ${url}`}/><code>{url}</code><small>Để cài ứng dụng, hãy tạo mã QR sau khi triển khai app trên HTTPS (ví dụ tên miền Vercel).</small></div></main>;
}
function FlexibleSuggestionPanel({ recipes, onOpen, compact = false }: { recipes: Recipe[]; onOpen: (recipe: Recipe) => void; compact?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const visibleRecipes = compact ? recipes.slice(0, 3) : showAll ? recipes : recipes.slice(0, 15);
  return <section className={`flexible-suggestions${compact ? " flexible-suggestions-compact" : ""}`} aria-labelledby={compact ? "home-flexible-title" : "flexible-title"}>
    <div className="flexible-suggestions-heading">
      <span className="flexible-sparkle"><CookingPot size={17}/></span>
      <div><h2 id={compact ? "home-flexible-title" : "flexible-title"}>Nấu linh hoạt từ tủ lạnh</h2>
        <p>Tự phối từ đồ bạn có, không cần khớp trọn một công thức có sẵn. Các gợi ý này chưa được thử nghiệm.</p></div>
    </div>
    <div className="flexible-suggestion-list">{visibleRecipes.map((recipe) => {
      const image = flexibleRecipeImageFor(recipe);
      const specificImage = flexibleRecipeImageMatches(recipe);
      return <button className="flexible-suggestion-card" key={recipe.id} onClick={() => onOpen(recipe)}>
      <span className={`flexible-card-image${specificImage ? "" : " ingredients-only"}`} aria-label={specificImage ? `Ảnh minh họa ${recipe.name}` : `Minh họa nguyên liệu ${recipe.ingredients.map((item) => item.sourceName ?? item.ingredientId).join(", ")}`}>
        {specificImage && image ? <img src={image.cardImagePath ?? image.imagePath} alt="" loading="lazy" decoding="async"/> : <FlexibleIngredientBoard recipe={recipe} compact/>}
        <small>{specificImage ? "Món minh họa" : "Nguyên liệu"}</small>
      </span>
      <span className="flexible-card-content"><span className="flexible-card-label">GỢI Ý TỰ PHỐI · {recipe.category}</span><b>{recipe.name}</b>
        <span className="flexible-card-ingredients">{recipe.ingredients.map((item) => item.sourceName ?? nameFor(item.ingredientId)).join(" · ")}</span>
        <small>{recipe.totalTime ?? "~15"} phút · {recipe.steps.length} bước · xem cách làm <ChevronRight size={14}/></small>
      </span>
    </button>;
    })}</div>
    {!compact && recipes.length > 15 && <button className="flexible-suggestions-more" type="button" onClick={() => setShowAll((current) => !current)}>
      {showAll ? "Thu gọn" : "Xem tất cả"}
    </button>}
  </section>;
}

function FlexibleIngredientBoard({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) {
  const foods = recipe.ingredients.map((item) => {
    const name = item.sourceName ?? item.ingredientId;
    const normalizedName = normalizeVietnamese(name);
    const ingredient = coreIngredients.find((entry) => entry.id === item.ingredientId
      || normalizeVietnamese(entry.name) === normalizedName
      || entry.aliases.some((alias) => normalizeVietnamese(alias) === normalizedName));
    return { name, emoji: ingredient?.emoji ?? recipe.emoji };
  });
  return <span className={`flexible-ingredient-board${compact ? " is-compact" : ""}`} role="img" aria-label={`Nguyên liệu trong gợi ý: ${foods.map((food) => food.name).join(", ")}`}>
    {foods.map((food, index) => <span className="flexible-ingredient-board-item" key={`${food.name}-${index}`}>
      <span aria-hidden="true">{food.emoji}</span><b>{food.name}</b>
    </span>)}
  </span>;
}

function flexibleRecipeImageMatches(recipe: Recipe) {
  if (flexibleCombinationImageFor(recipe)) return true;
  const variant = recipe.tags.find((tag) => tag.startsWith("flexible-image:"))?.slice("flexible-image:".length);
  if (!variant) return false;
  const expectedByVariant: Record<string, string[]> = {
    "tofu-tomato": ["tofu", "tomato"],
    "tomato-egg": ["egg", "tomato"],
    "potato-egg": ["egg", "potato"],
    "eggplant-pork": ["eggplant", "ground-pork"],
    "tomato-stuffed-pork": ["tomato", "ground-pork"],
    "cabbage-pork-rolls": ["cabbage", "ground-pork"],
    "steamed-egg-mushroom": ["egg", "mushroom"],
    "yam-fish-ball-soup": ["purple-yam", "fish-ball"],
    "cha-lua-sprout-stir": ["cha-lua", "bean-sprout"],
    "crispy-dumpling-greens": ["ha-cao", "bok-choy"],
    "dumpling-soup-greens": ["ha-cao", "bok-choy"],
    "roast-duck-rice": ["roast-duck", "rice"],
    "roast-duck-bread": ["roast-duck", "bread"],
    "pha-lau-bread": ["pha-lau", "bread"],
    "pha-lau-noodle": ["pha-lau", "noodle"],
    "lap-xuong-quail-egg": ["lap-xuong", "quail-egg"],
    "egg-lap-xuong": ["egg", "lap-xuong"],
    "frozen-fried-chicken": ["frozen-fried-chicken"],
    "frozen-fried-chicken-rice": ["frozen-fried-chicken", "rice", "egg"],
  };
  const expected = expectedByVariant[variant];
  if (!expected) return false;
  const actual = recipe.ingredients.map((item) => item.ingredientId).sort();
  return actual.length === expected.length && actual.every((id, index) => id === [...expected].sort()[index]);
}

function RecipeCard({
  recipe,
  missing,
  owned,
  ratio,
  urgent,
  quantityStatus,
  score,
  reasons,
  substitutions = [],
  ingredientName,
  onClick,
  compact = false,
}: {
  recipe: Recipe;
  missing: string[];
  owned: string[];
  ratio: number;
  urgent: boolean;
  quantityStatus?: "sufficient" | "shortage" | "unknown";
  score?: number;
  reasons?: string[];
  substitutions?: import("./services/substitutions.ts").SubstitutionSuggestion[];
  ingredientName?: (id: string) => string;
  onClick: () => void;
  compact?: boolean;
}) {
  const extraReasons = [...new Set((reasons ?? []).filter((reason) => !/công thức nội bộ|đủ loại nguyên liệu|còn thiếu|thiếu định lượng|chưa thể xác nhận đủ số lượng/i.test(reason)))].slice(0, 1);
  const image = recipeImageFor(recipe.id);
  const displayImage = image?.cardImagePath ?? image?.imagePath ?? recipe.imageUrl;
  return (
    <button className={`recipe-card${compact ? " compact" : ""}`} onClick={onClick}>
      <div className={`food-thumb${image || displayImage ? " has-recipe-image" : ""}`} data-emoji={recipe.emoji}>
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt={`Ảnh món ${recipe.name}`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(event) => {
                if (recipe.imageUrl && displayImage === recipe.imageUrl) {
                  fallbackRecipeSourceImage(event, recipe);
                } else {
                  event.currentTarget.parentElement?.classList.add("image-unavailable");
                }
              }}
            />
            <span className={`recipe-card-credit${image?.imageType === "ai_illustration" ? " ai-image-credit" : ""}`}>
              {image ? (image.imageType === "ai_illustration" ? "Ảnh minh họa AI" : `Ảnh: ${image.author || recipe.source.title}`) : `Ảnh: ${recipe.source.title}`}
            </span>
          </>
        ) : recipe.emoji}
        {urgent && <span className="urgent-dot">Cần dùng</span>}
      </div>
      <div className="card-content">
        <div className="card-tags">
          <span>{recipe.category}</span>
          {score !== undefined && <span className="score-tag">Điểm gợi ý {score}%</span>}
          {substitutions.some((suggestion) => suggestion.availability === "in_fridge") && <span className="substitution-tag">Có thể thay {new Set(substitutions.filter((suggestion) => suggestion.availability === "in_fridge").map((suggestion) => suggestion.originalIngredientId)).size} nguyên liệu</span>}
          {recipe.verificationStatus === "verified" ? (
            <span className="verified-tag">Đã xác minh</span>
          ) : <span className="unverified-tag">Chưa xác minh độc lập</span>}
        </div>
        <div className="recipe-card-title">{recipe.name}</div>
        <div className="card-meta">
          <span>
            <Clock size={14} />
            {recipe.totalTime !== null ? `~${recipe.totalTime} phút` : "Thời gian chưa rõ"}
          </span>
          <span>✦ {recipe.difficulty}</span>
        </div>
        {compact ? <div className="home-recipe-summary">
          <span>{owned.length ? `Có ${owned.length} nguyên liệu trong tủ` : "Chưa có nguyên liệu khớp"}</span>
          <span>{missing.length ? `Thiếu: ${missing.map((id) => ingredientName?.(id) ?? nameFor(id)).join(", ")}` : quantityStatus === "unknown" ? "Đủ loại nguyên liệu · chưa rõ lượng" : quantityStatus === "sufficient" ? "Đủ nguyên liệu theo lượng đã nhập" : "Chưa xác định đủ lượng"}</span>
          <small>{recipe.verificationStatus === "verified" ? "Đã xác minh" : recipe.verificationStatus === "adapted" ? "Có nguồn tham khảo · đã điều chỉnh" : recipe.dataStatus === "ingredients_only" ? "Chưa có hướng dẫn nấu" : "Công thức nội bộ · chưa xác minh"}</small>
        </div> : <>
          <div className="match-line">
            <div>
              {owned.length ? <><b>Có:</b> {owned.map((id) => ingredientName?.(id) ?? nameFor(id)).join(", ")}</> : "Chưa có nguyên liệu khớp"}
              {missing.length > 0 && (
                <span> · thiếu {missing.map((id) => ingredientName?.(id) ?? nameFor(id)).join(", ")}</span>
              )}
            </div>
            <div className="match-meter">
              <i style={{ width: `${ratio}%` }} />
            </div>
          </div>
          <small className="honest-caption">
            {recipe.source.title.startsWith("Dinh dưỡng 2598")
              ? "Dinh dưỡng 2598 · đủ trường theo kiểm tra tự động, chưa xác minh thủ công"
              : recipe.dataStatus === "ingredients_only"
              ? "Chỉ có danh sách nguyên liệu · chưa có hướng dẫn"
              : recipe.verificationStatus === "verified"
              ? "Công thức đã xác minh"
              : "Công thức nội bộ · chưa xác minh"}
          </small>
          {quantityStatus === "unknown" && missing.length === 0 && recipe.dataStatus === "full_recipe" ? <small className="honest-caption">Đủ loại nguyên liệu · chưa xác định đủ số lượng</small> : null}
          {quantityStatus === "shortage" ? <small className="honest-caption">Thiếu định lượng một hoặc nhiều nguyên liệu</small> : null}
          {extraReasons.length > 0 && <span className="recommendation-reasons">{extraReasons.map((reason, index) => <small className="recommendation-reason" key={index}>{reason}</small>)}</span>}
        </>}
      </div>
      <span className="recipe-card-cta">Xem chi tiết <ChevronRight size={16} /></span>
    </button>
  );
}
function PrefRow({
  icon,
  title,
  checked,
  onChange,
}: {
  icon: string;
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button className="pref-row" onClick={() => onChange(!checked)}>
      <span className="pref-icon">{icon}</span>
      <span>{title}</span>
      <span className={`switch ${checked ? "on" : ""}`}>
        <i />
      </span>
    </button>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Ứng dụng gặp lỗi giao diện.", error, info.componentStack); }
  render() {
    if (this.state.hasError) return <main className="app-error"><span>🥣</span><h1>Ứng dụng tạm gặp lỗi</h1><p>Dữ liệu đã lưu trên thiết bị vẫn được giữ nguyên. Tải lại trang để thử lại.</p><button className="primary-small" onClick={() => window.location.reload()}>Tải lại ứng dụng</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>{window.location.pathname === "/qr" ? <QrPage /> : <App />}</AppErrorBoundary>
  </StrictMode>,
);
