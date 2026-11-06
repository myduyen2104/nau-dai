import { Component, StrictMode, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  Apple,
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  Flame,
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
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { ingredients, recipes, nameFor, type Recipe } from "./data";
import trendingData from "./data/trending.json";
import copperCatalog from "./data/recipes/copper-vietnam.json";
import type { SavedVideo, TrendingVideo } from "./types/trending";
import { formatRecipeQuantity, isScalableRecipeUnit, scaleRecipeQuantity } from "./utils/servings";
import { recordRecentRecipe, visibleRecentRecipes } from "./utils/recipeHistory";
import { isValidDateOnly } from "./utils/dateOnly";
import { normalizeVietnamese, resolveIngredientId, buildIngredientIndex, canonicalIngredientPreference } from "./utils/ingredientMatcher";
import { parseSupportedVideoUrl } from "./utils/trending";
import { defaultRecommendationPreferences, recommendRecipes } from "./services/recommendationEngine";
import { migrateLocalStorage } from "./utils/storageMigration";
import "./style.css";
  type Stock = {
  id: string;
  name?: string;
  quantity: string;
  unit: string;
  fresh: "fresh" | "soon" | "urgent" | "spoiled";
  expiresAt?: string;
  frozen?: boolean;
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
type Page = "home" | "fridge" | "recipes" | "explore" | "trending" | "favorites" | "settings";
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
function IngredientVisual({ name, emoji, className }: { name: string; emoji: string; className: string }) {
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
    if (key === "fridge-stock" && (!Array.isArray(value) || value.some((row) => !row || typeof row.id !== "string" || (row.name !== undefined && typeof row.name !== "string") || typeof row.quantity !== "string" || typeof row.unit !== "string" || !["fresh", "soon", "urgent", "spoiled"].includes(row.fresh) || (row.frozen !== undefined && typeof row.frozen !== "boolean") || (row.expiresAt !== undefined && row.expiresAt !== "" && !isValidDateOnly(row.expiresAt))))) return fallback;
    if (["fridge-favorites", "fridge-history", "fridge-cooked"].includes(key) && (!Array.isArray(value) || value.some((item) => typeof item !== "string"))) return fallback;
    if (key === "fridge-prefs" && (!value || typeof value !== "object" || Array.isArray(value))) return fallback;
    if (key === "fridge-saved-videos" && (!Array.isArray(value) || value.some((row) => !row || typeof row.id !== "string" || typeof row.note !== "string" || typeof row.savedAt !== "string" || !Number.isFinite(Date.parse(row.savedAt)) || parseSupportedVideoUrl(row.url)?.platform !== row.platform))) return fallback;
    return value as T;
  } catch {
    return fallback;
  }
};
const canonical = normalizeVietnamese;
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
const importedTrending = trendingData as { updatedAt: string | null; videos: TrendingVideo[] };
const copperRecipes: Recipe[] = copperCatalog.recipes.map((item) => {
  const ids = item.ingredients.map((ingredient) => ingredient.ingredientId ?? ingredient.sourceName);
  const time = item.totalTimeMinutes;
  return {
    id: item.id, slug: item.slug, name: item.name, emoji: "🍲", description: "", category: "Món Việt", cuisine: "vietnamese",
    method: "", minutes: time, preparationTime: null, cookingTime: null, totalTime: time,
    difficulty: item.difficulty === "easy" ? "Dễ" : item.difficulty === "medium" ? "Vừa" : item.difficulty === "hard" ? "Khó" : "Chưa đánh giá",
    servings: null, required: ids, optional: [], ingredients: item.ingredients.map((ingredient) => {
      const ingredientId = ingredient.ingredientId ?? ingredient.sourceName;
      const category = ingredients.find((entry) => entry.id === ingredientId)?.category;
      const role = category === "Gia vị" ? "seasoning" as const : ["Thịt", "Hải sản", "Trứng", "Tinh bột"].includes(category ?? "") ? "main" as const : "required" as const;
      return { ingredientId, sourceName: ingredient.sourceName, quantity: null, unit: "", optional: false, role };
    }),
    steps: [], equipment: [], tips: [], tags: ["Món Việt"], source: { type: "website", url: item.source.recipeUrl, title: `${item.source.name} · ${item.source.license}` },
    verificationStatus: "unverified", dataStatus: "ingredients_only",
  };
});
const libraryRecipes = [...recipes, ...copperRecipes];
function App() {
  const qrInstallRequested = new URLSearchParams(window.location.search).get("install") === "1";
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.matchMedia("(max-width: 699px)").matches);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(qrInstallRequested && !isStandalone());
  const [installCheckComplete, setInstallCheckComplete] = useState(!qrInstallRequested || isIOSDevice() || !window.isSecureContext);
  const [storageWarning, setStorageWarning] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [videoUrlDraft, setVideoUrlDraft] = useState("");
  const [videoNoteDraft, setVideoNoteDraft] = useState("");
  const [videoFormError, setVideoFormError] = useState("");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("Tất cả");
  const [libraryStatus, setLibraryStatus] = useState("Tất cả");
  const [libraryDiet, setLibraryDiet] = useState(false);
  const [avoidQuery, setAvoidQuery] = useState("");
  useEffect(() => {
    const media = window.matchMedia("(max-width: 699px)");
    const updateLayout = () => setIsMobileLayout(media.matches);
    media.addEventListener("change", updateLayout);
    return () => media.removeEventListener("change", updateLayout);
  }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname.startsWith("127."))) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const onInstalled = () => { setInstallPrompt(null); setShowInstallHelp(false); };
    window.addEventListener("appinstalled", onInstalled);
    const installCheckTimer = qrInstallRequested && window.isSecureContext && !isIOSDevice()
      ? window.setTimeout(() => setInstallCheckComplete(true), 1800)
      : undefined;
    if (qrInstallRequested && isIOSDevice()) setInstallCheckComplete(true);
    const capturePrompt = (event: Event) => { onPrompt(event); setInstallCheckComplete(true); };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    if (qrInstallRequested) window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (installCheckTimer !== undefined) window.clearTimeout(installCheckTimer);
    };
  }, []);
  const [stock, setStock] = useState<Stock[]>(() => load("fridge-stock", [])),
    [prefs, setPrefs] = useState<Pref>(loadPrefs),
    [query, setQuery] = useState(""),
    [pickerOpen, setPickerOpen] = useState(false),
    [category, setCategory] = useState("Tất cả"),
    [page, setPage] = useState<Page>("home"),
    [tab, setTab] = useState<"ready" | "substitution" | "almost" | "use_soon" | "discover">("ready"),
    [modal, setModal] = useState<Recipe | null>(null),
    [favorites, setFavorites] = useState<string[]>(() =>
      load("fridge-favorites", []),
    ),
    [history, setHistory] = useState<string[]>(() =>
      load("fridge-history", []),
    ),
    [cooked, setCooked] = useState<string[]>(() => load("fridge-cooked", [])),
    [savedVideos, setSavedVideos] = useState<SavedVideo[]>(() => load("fridge-saved-videos", [])),
    [done, setDone] = useState<number[]>([]),
    [selectedSubstitutions, setSelectedSubstitutions] = useState<Record<string, string>>({});
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
  useEffect(() => { if (canPersist && !persist("fridge-saved-videos", savedVideos)) setStorageWarning("Không thể lưu danh sách video trên thiết bị."); }, [savedVideos, canPersist]);
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
  const isExpired = (item: Stock) => item.fresh === "spoiled" || (!!item.expiresAt && (!isValidDateOnly(item.expiresAt) || new Date(`${item.expiresAt}T23:59:59`).getTime() < Date.now()));
  const ids = new Set(stock.filter((item) => !isExpired(item)).map((x) => x.id));
  const useSoonItems = useMemo(() => stock.filter((item) => !isExpired(item) && (
    item.fresh === "soon" || item.fresh === "urgent" || (!!item.expiresAt && (() => {
      const until = new Date(`${item.expiresAt}T23:59:59`).getTime() - Date.now();
      return until >= 0 && until <= 3 * 86400000;
    })())
  )).sort((a, b) => (a.expiresAt ?? "9999-12-31").localeCompare(b.expiresAt ?? "9999-12-31")).slice(0, 4), [stock]);
  const ingredientIndex = useMemo(() => buildIngredientIndex(ingredients), []);
  const recommendations = useMemo(() => recommendRecipes({ stock, recipes: libraryRecipes, preferences: { ...defaultRecommendationPreferences, ...prefs }, ingredients, now: new Date() }), [stock, prefs]);
  const recommendationById = useMemo(() => new Map(recommendations.map((item) => [item.recipeId, item])), [recommendations]);
  const recommendationsByCategory = useMemo(() => ({
    ready: recommendations.filter((item) => item.category === "ready"),
    substitution: recommendations.filter((item) => item.category === "substitution"),
    almost: recommendations.filter((item) => item.category === "almost"),
    use_soon: recommendations.filter((item) => item.category === "use_soon"),
    discover: recommendations.filter((item) => item.category === "discover"),
  }), [recommendations]);
  const shown = recommendationsByCategory[tab];
  const previewRecommendations = recommendationsByCategory.ready.length ? recommendationsByCategory.ready : recommendationsByCategory.substitution.length ? recommendationsByCategory.substitution : recommendationsByCategory.use_soon.length ? recommendationsByCategory.use_soon : recommendationsByCategory.almost;
  const homeGreeting = new Date().getHours() < 11 ? "Chào buổi sáng" : new Date().getHours() < 17 ? "Chào buổi chiều" : "Chào buổi tối";
  const homeDate = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const recipeById = useMemo(() => new Map(libraryRecipes.map((recipe) => [recipe.id, recipe])), []);
  const recentRecipeIds = useMemo(() => visibleRecentRecipes(history, new Set(recipeById.keys())), [history, recipeById]);
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
  const categories = ["Tất cả", ...Array.from(new Set(ingredients.map((i) => i.category)))];
  const pickerItems = ingredients.filter((i) => !ids.has(i.id) && (category === "Tất cả" || i.category === category));
  const searchItems = ingredients.filter(
    (i) =>
      canonical(i.name + " " + i.aliases.join(" ")).includes(
        canonical(query),
      ) && !ids.has(i.id),
  );
  function add(id: string) {
    setStock((s) =>
      s.some((x) => x.id === id)
        ? s
      : [...s, { id, quantity: "1", unit: "phần", fresh: "fresh", expiresAt: "", frozen: false }],
    );
    setQuery("");
  }
  function addCustom() {
    const name = query.trim();
    if (!name) return;
    const id = "custom-" + canonical(name).replace(/[^a-z0-9]+/g, "-");
    if (!stock.some((item) => item.id === id))
      setStock((s) => [
        ...s,
        { id, name, quantity: "1", unit: "phần", fresh: "fresh", expiresAt: "", frozen: false },
      ]);
    setQuery("");
  }
  function openRecipe(r: Recipe) {
    setModal(r);
    setDone([]);
    setHistory((h) => recordRecentRecipe(h, r.id));
  }
  function saveVideoLink() {
    const parsed = parseSupportedVideoUrl(videoUrlDraft);
    if (!parsed) { setVideoFormError("Dán link https hợp lệ từ YouTube, TikTok hoặc Facebook."); return; }
    if (savedVideos.some((video) => video.url === parsed.url)) { setVideoFormError("Link này đã có trong danh sách."); return; }
    setSavedVideos((items) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, platform: parsed.platform, url: parsed.url, note: videoNoteDraft.trim(), savedAt: new Date().toISOString() }, ...items]);
    setVideoUrlDraft(""); setVideoNoteDraft(""); setVideoFormError("");
  }
  function toggleFavorite(id: string) {
    setFavorites((f) =>
      f.includes(id) ? f.filter((x) => x !== id) : [id, ...f],
    );
  }
  function showTab(t: "ready" | "substitution" | "almost" | "use_soon" | "discover") {
    setTab(t);
    setPage("recipes");
  }
  function showBestTab() {
    const best = ["ready", "substitution", "use_soon", "almost", "discover"].find((candidate) => recommendationsByCategory[candidate as keyof typeof recommendationsByCategory].length) as "ready" | "substitution" | "almost" | "use_soon" | "discover" | undefined;
    showTab(best ?? "ready");
  }
  const label =
    page === "home"
      ? "Trang chủ"
      : page === "fridge"
        ? "Tủ lạnh của tôi"
      : page === "recipes"
        ? "Tìm món"
        : page === "favorites"
          ? "Đã lưu"
          : page === "explore"
            ? "Khám phá món Việt"
          : page === "trending"
            ? "Món đang hot 🔥"
          : "Sở thích nấu";
  const pageEyebrow = page === "recipes" ? "TỪ TỦ LẠNH NHÀ MÌNH" : page === "explore" ? "THƯ VIỆN CÔNG THỨC" : page === "trending" ? "VIDEO MÓN ĂN" : page === "favorites" ? "BỘ SƯU TẬP CỦA BẠN" : "TÙY CHỌN CÁ NHÂN";
  const libraryCategories = ["Tất cả", ...new Set(libraryRecipes.map((recipe) => recipe.category))];
  const libraryResults = libraryRecipes.filter((recipe) => {
    const recipeIngredients = recipe.ingredients.map((item) => `${item.ingredientId} ${nameFor(item.ingredientId)}`).join(" ");
    const matchesQuery = canonical(`${recipe.name} ${recipeIngredients}`).includes(canonical(libraryQuery));
    const matchesCategory = libraryCategory === "Tất cả" || recipe.category === libraryCategory;
    const matchesStatus = libraryStatus === "Tất cả" || recipe.dataStatus === libraryStatus;
    const mappedCategories = recipe.required.map((id) => ingredients.find((ingredient) => ingredient.id === id)?.category);
    const matchesDiet = !libraryDiet || (recipe.dataStatus === "full_recipe" && mappedCategories.every((category) => category && !["Thịt", "Hải sản"].includes(category)));
    return matchesQuery && matchesCategory && matchesStatus && matchesDiet;
  });
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><div className="brandicon"><Leaf size={18}/></div><span>fresh<span className="branddot">.</span></span></div>
        <button className="avatar" onClick={() => setPage("settings")} aria-label="Sở thích"><Settings size={18}/></button>
      </header>
      <main>
        {storageWarning && <div className="storage-alert" role="status">{storageWarning}</div>}
        {page === "home" && (
          <>
            <section className="home-hero">
              <div className="home-hero-copy">
                <span className="hero-eyebrow"><span /> {homeDate}</span>
                <h1>{homeGreeting},<br />hôm nay ăn gì?</h1>
                <p>{stock.length ? `Có ${stock.length} nguyên liệu trong tủ. Mình tìm món hợp với những gì bạn đang có nhé.` : "Thêm nguyên liệu trong tủ lạnh, Fresh sẽ gợi ý món phù hợp cho hôm nay."}</p>
                <div className="hero-actions">
                  <button className="hero-primary" onClick={() => stock.length ? showBestTab() : setPage("fridge")}><Sparkles size={16}/> {stock.length ? "Xem món phù hợp" : "Thêm nguyên liệu"}</button>
                  <button className="hero-secondary" onClick={() => stock.length ? setPage("fridge") : setPage("explore")}>{stock.length ? <><Plus size={16}/> Thêm nguyên liệu</> : <><BookOpen size={16}/> Khám phá món</>}</button>
                </div>
              </div>
              <div className="home-hero-image" role="img" aria-label="Rau thơm, cà chua, hành lá, trứng và gạo tươi trên bàn bếp" />
              <span className="hero-note">Nấu ngon từ nguyên liệu sẵn có <Sparkles size={13}/></span>
            </section>
            {stock.length > 0 && <section className="home-summary" aria-label="Tóm tắt bếp nhà">
              <button onClick={() => setPage("fridge")}><span className="summary-icon">🥬</span><span><b>{stock.length}</b><small>nguyên liệu</small></span><ChevronRight size={16}/></button>
              <button onClick={() => useSoonItems.length ? showTab("use_soon") : setPage("fridge")}><span className="summary-icon warm">⏰</span><span><b>{useSoonItems.length}</b><small>cần dùng sớm</small></span><ChevronRight size={16}/></button>
              <button onClick={() => showTab("ready")}><span className="summary-icon">🍲</span><span><b>{recommendationsByCategory.ready.length}</b><small>đủ loại</small></span><ChevronRight size={16}/></button>
            </section>}
            {stock.length > 0 && <button className="mobile-pantry-summary" onClick={() => setPage("fridge")}>
              <span className="mobile-pantry-count">{stock.length}</span>
              <span className="mobile-pantry-copy"><b>nguyên liệu trong tủ</b><small>{recommendationsByCategory.ready.length ? `${recommendationsByCategory.ready.length} món đã có đủ nhóm nguyên liệu` : "Xem và cập nhật tủ lạnh"}</small></span>
              <ChevronRight size={17}/>
            </button>}
            <section className={`home-use-soon${useSoonItems.length ? "" : " no-priority"}`}>
              <div className="section-title-row"><div><span className="section-kicker">ƯU TIÊN HÔM NAY</span><h2>Cần dùng sớm</h2></div>{useSoonItems.length > 0 && <button className="text-button" onClick={() => showTab("use_soon")}>Xem món <ChevronRight size={15}/></button>}</div>
              {useSoonItems.length ? <div className="use-soon-list">{useSoonItems.map((item) => {
                const ingredient = ingredients.find((entry) => entry.id === item.id);
                const name = ingredient?.name ?? item.name ?? item.id.replace(/^custom-/, "").replace(/-/g, " ");
                return <div className="use-soon-item" key={item.id}><span>{ingredient?.emoji ?? "🥣"}</span><div><b>{name}</b><small>{item.fresh === "urgent" ? "Nên dùng hôm nay" : item.fresh === "soon" ? "Sắp hết hạn" : `Hạn dùng ${item.expiresAt}`}</small></div><span className="use-soon-qty">{item.quantity} {item.unit}</span></div>;
              })}</div> : <div className="use-soon-empty"><span>✓</span><div><b>{stock.length ? "Chưa có nguyên liệu cần ưu tiên" : "Theo dõi hạn dùng trong tủ lạnh"}</b><small>{stock.length ? "Đánh dấu món sắp hết hạn để ưu tiên trong gợi ý." : "Thêm nguyên liệu và ngày hết hạn để sắp xếp món nên dùng trước."}</small></div></div>}
            </section>
          </>
        )}
        {page !== "home" && page !== "fridge" && <div className="greeting">
          <div className="eyebrow">{pageEyebrow}</div>
          <h1>
            {page === "recipes" ? "Hôm nay nấu gì?" : label}
          </h1>
        </div>}
        {page === "fridge" && (
          <>
            <section className="page-lead fridge-lead">
              <span className="section-kicker">KHO NHÀ MÌNH</span>
              <h1>Tủ lạnh</h1>
              <p>Thêm những nguyên liệu đang có, kể cả món tự tạo.</p>
            </section>
            <section className="input-card">
              <div className="add-heading"><div><b>Thêm vào tủ lạnh</b><small>Chọn nguyên liệu bạn đang có</small></div><button className={pickerOpen ? "picker-toggle active" : "picker-toggle"} onClick={() => setPickerOpen((v) => !v)}><Grid2X2 size={16}/>{pickerOpen ? "Thu gọn" : "Chọn nguyên liệu"}</button></div>
              <label className="searchbox">
                <Search size={19} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
              {(query || pickerOpen) && (
                <div className="suggestions">
                  {pickerOpen && !query && <div className="category-strip">{categories.map((c) => <button key={c} className={category === c ? "chosen" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div>}
                  {query && searchItems.slice(0, 5).map((i) => (
                    <button key={i.id} onClick={() => add(i.id)}>
                      <IngredientVisual name={i.name} emoji={i.emoji} className="ingredient-emoji" />
                      {i.name}
                      <Plus size={16} />
                    </button>
                  ))}
                  {pickerOpen && !query && <div className="quick-ingredients">{pickerItems.slice(0, 18).map((i) => <button key={i.id} onClick={() => add(i.id)}><IngredientVisual name={i.name} emoji={i.emoji} className="quick-ingredient-visual"/><small>{i.name}</small><Plus size={13}/></button>)}</div>}
                  {query && !searchItems.some((i) =>
                    canonical(i.name + " " + i.aliases.join(" ")).includes(
                      canonical(query),
                    ),
                  ) && (
                    <button onClick={addCustom}>
                      <span>✨</span>Thêm “{query}” của riêng bạn
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              )}
              <div className="input-hint">
                <Sparkles size={14} /> Chọn nhanh theo nhóm hoặc tìm bằng tên
              </div>
            </section>
            <section className="pantry-head">
              <div>
                <span className="section-kicker">KHO NGUYÊN LIỆU</span>
                <h2>
                  Tủ lạnh <span className="count">{stock.length}</span>
                </h2>
              </div>
              <button
                className="text-button"
                onClick={() => setPage("settings")}
              >
                <SlidersHorizontal size={15} /> Tùy chỉnh
              </button>
            </section>
            {stock.length === 0 ? (
              <div className="empty-pantry">
                <span className="empty-icon">🧺</span>
                <div>
                  <b>Tủ lạnh đang chờ bạn</b>
                  <p>Thêm vài nguyên liệu để tìm món ngon nhé.</p>
                </div>
              </div>
            ) : (
              <div className="pantry">
                {stock.map((item) => {
                  const ing = ingredients.find((x) => x.id === item.id);
                  const nm =
                    ing?.name ??
                    item.id.replace("custom-", "").replace(/-/g, " ");
                  return (
                    <article className="ingredient" key={item.id}>
                      <IngredientVisual name={nm} emoji={ing?.emoji ?? "✨"} className="ingredient-emoji" />
                      <div className="ingredient-info">
                        <b>{nm}</b>
                        <div className="stock-controls"><input type="number" min="0" step="any" aria-label={`Số lượng ${nm}`} value={item.quantity} onChange={(event) => setStock((items) => items.map((x) => x.id === item.id ? { ...x, quantity: event.target.value } : x))}/><select aria-label={`Đơn vị ${nm}`} value={item.unit} onChange={(event) => setStock((items) => items.map((x) => x.id === item.id ? { ...x, unit: event.target.value } : x))}>{["phần", "g", "kg", "ml", "l", "củ", "quả", "bó", "gói", "con"].map((unit) => <option key={unit}>{unit}</option>)}</select></div>
                        <label className="expiry-control">Hết hạn <input type="date" aria-label={`Ngày hết hạn ${nm}`} value={item.expiresAt ?? ""} onChange={(event) => setStock((items) => items.map((x) => x.id === item.id ? { ...x, expiresAt: event.target.value } : x))}/></label>
                        <label className="frozen-control"><input type="checkbox" checked={item.frozen ?? false} onChange={(event) => setStock((items) => items.map((x) => x.id === item.id ? { ...x, frozen: event.target.checked } : x))}/> Ngăn đông</label>
                        {isExpired(item) && <small className="expired-label">Đã quá hạn · không đưa vào gợi ý</small>}
                      </div>
                      <select
                        aria-label={`Tình trạng ${nm}`}
                        value={item.fresh}
                        onChange={(e) =>
                          setStock((s) =>
                            s.map((x) =>
                              x.id === item.id
                                ? {
                                    ...x,
                                    fresh: e.target.value as Stock["fresh"],
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <option value="fresh">Tươi</option>
                        <option value="soon">Sắp hết hạn</option>
                        <option value="urgent">Dùng ngay</option>
                        <option value="spoiled">Đã hỏng · loại khỏi gợi ý</option>
                      </select>
                      <button
                        className="icon-button delete"
                        onClick={() =>
                          setStock((s) => s.filter((x) => x.id !== item.id))
                        }
                        aria-label={`Xóa ${nm}`}
                      >
                        <X size={17} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="expiry-note">
              <span>⏰</span>
              <p>
                <b>Gợi ý:</b> Thêm ngày hết hạn hoặc chọn “Sắp hết hạn” để ưu tiên dùng trước.
              </p>
            </div>
          </>
        )}
        {page === "home" && (
          <>
            <section className={`suggestion-preview${stock.length === 0 ? " empty-home-preview" : ""}`}>
              <div className="suggestion-preview-head"><div><span className="section-kicker">GỢI Ý CHO BẠN</span><h2>{previewRecommendations.length ? "Có thể nấu hôm nay" : "Bắt đầu với món đầu tiên"}</h2></div><button onClick={() => showTab("ready")}>Xem tất cả <ChevronRight size={15}/></button></div>
              {previewRecommendations.length ? (
                <div className="preview-scroll">
                  {previewRecommendations.slice(0, 3).map((item) => {
                    const recipe = recipeById.get(item.recipeId)!;
                    return <RecipeCard key={recipe.id} compact={isMobileLayout} recipe={recipe} missing={item.missingIngredients} owned={item.matchedIngredients} ratio={item.matchPercentage} urgent={item.urgent} quantityStatus={item.quantityStatus} score={item.score} reasons={item.reasons} substitutions={item.substitutions} ingredientName={(id) => recommendationName(recipe, id)} onClick={() => openRecipe(recipe)} />;
                  })}
                </div>
              ) : <div className="preview-empty"><span className="preview-empty-mark">🍳</span><div><b>Gợi ý sẽ cá nhân hóa theo tủ lạnh</b><p>Thêm nguyên liệu thật có trong bếp để tìm món phù hợp.</p></div><button onClick={() => setPage("fridge")}>Mở tủ lạnh <ChevronRight size={15}/></button></div>}
            </section>
            <section className="home-explore">
              <div className="section-title-row"><div><span className="section-kicker">THÊM CẢM HỨNG</span><h2>Khám phá món Việt</h2></div><button className="text-button" onClick={() => { setLibraryCategory("Tất cả"); setPage("explore"); }}>Tất cả món <ChevronRight size={15}/></button></div>
              <div className="home-category-list">{libraryCategories.filter((item) => item !== "Tất cả").slice(0, 5).map((item) => <button key={item} onClick={() => { setLibraryCategory(item); setPage("explore"); }}><span aria-hidden="true">{item === "Món xào" ? <CookingPot size={17}/> : item === "Món chính" ? <ChefHat size={17}/> : item === "Món ăn nhẹ" ? <Leaf size={17}/> : item === "Món nước" ? <UtensilsCrossed size={17}/> : <CookingPot size={17}/>}</span>{item}<ChevronRight size={15}/></button>)}</div>
              <button className="trending-entry" onClick={() => setPage("trending")}><span className="trending-entry-icon"><Flame size={20}/></span><span><b>Món hot</b><small>{importedTrending.videos.length ? `${importedTrending.videos.length} video đang nổi bật` : "Xem video món ăn và lưu món muốn thử"}</small></span><ChevronRight size={17}/></button>
            </section>
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
        {page === "recipes" && (
          <>
            <section className="recipe-intro">
              <div className="recipe-intro-icon">🍽️</div>
              <div>
                <b>Gợi ý từ tủ lạnh nhà mình</b>
                <p>
                  {stock.length
                    ? `${ids.size} nguyên liệu còn dùng được · alias khớp chính xác, có xét hạn dùng · định lượng chỉ báo khi cùng đơn vị`
                    : "Thêm nguyên liệu để cá nhân hóa gợi ý."}
                </p>
              </div>
            </section>
            <div className="tabs">
              <button className={tab === "ready" ? "active" : ""} onClick={() => setTab("ready")}>Đủ loại · chưa rõ lượng <span>{recommendationsByCategory.ready.length}</span></button>
              <button className={tab === "substitution" ? "active" : ""} onClick={() => setTab("substitution")}>Có thể thay <span>{recommendationsByCategory.substitution.length}</span></button>
              <button className={tab === "almost" ? "active" : ""} onClick={() => setTab("almost")}>Thiếu ít <span>{recommendationsByCategory.almost.length}</span></button>
              <button className={tab === "use_soon" ? "active" : ""} onClick={() => setTab("use_soon")}>Cứu đồ sớm <span>{recommendationsByCategory.use_soon.length}</span></button>
              <button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}>Khám phá <span>{recommendationsByCategory.discover.length}</span></button>
            </div>
            {shown.length === 0 ? (
              <div className="no-results">
                <span>🍳</span>
                <h3>
                  {stock.length
                    ? "Chưa tìm thấy món phù hợp"
                    : "Tủ lạnh cần thêm nguyên liệu"}
                </h3>
                <p>
                  {stock.length
                    ? "Thử thêm nguyên liệu hoặc nới điều kiện nấu một chút nhé."
                    : "Quay lại thêm nguyên liệu đang có để khám phá món ăn."}
                </p>
                <button
                  className="primary-small"
                  onClick={() => setPage(stock.length ? "settings" : "fridge")}
                >
                  {stock.length ? "Chỉnh sở thích" : "Thêm nguyên liệu"}
                </button>
              </div>
            ) : (
              <div className="recipe-list">
                {shown.map((item) => {
                  const recipe = recipeById.get(item.recipeId);
                  if (!recipe) return null;
                  return <RecipeCard key={recipe.id} recipe={recipe} missing={item.missingIngredients} owned={item.matchedIngredients} ratio={item.matchPercentage} urgent={item.urgent} quantityStatus={item.quantityStatus} score={item.score} reasons={item.reasons} substitutions={item.substitutions} ingredientName={(id) => recommendationName(recipe, id)} onClick={() => openRecipe(recipe)} />;
                })}
              </div>
            )}
          </>
        )}
        {page === "explore" && (
          <>
            <section className="recipe-intro">
              <div className="recipe-intro-icon"><BookOpen size={22}/></div>
              <div><b>Thư viện món ăn độc lập</b><p>Tìm món theo tên hoặc nguyên liệu, kể cả khi tủ lạnh đang trống.</p></div>
            </section>
            <button className="trending-entry explore-trending" onClick={() => setPage("trending")}><span className="trending-entry-icon"><Flame size={20}/></span><span><b>Món hot</b><small>{importedTrending.videos.length ? `${importedTrending.videos.length} video món ăn nổi bật` : "Video món ăn nổi bật và link bạn muốn thử"}</small></span><ChevronRight size={17}/></button>
            <div className="library-tools">
              <label className="searchbox library-search"><Search size={17}/><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="Tìm món hoặc nguyên liệu…"/></label>
              <select aria-label="Lọc trạng thái hướng dẫn" value={libraryStatus} onChange={(event) => setLibraryStatus(event.target.value)}><option>Tất cả</option><option value="full_recipe">Có hướng dẫn</option><option value="ingredients_only">Chỉ có nguyên liệu</option><option value="catalog_only">Chỉ có tên món</option></select>
              <label className="library-diet"><input type="checkbox" checked={libraryDiet} onChange={(event) => setLibraryDiet(event.target.checked)}/> Chỉ món không có thịt/hải sản (dữ liệu đủ)</label>
            </div>
            <div className="category-strip library-categories">{libraryCategories.map((category) => <button key={category} className={libraryCategory === category ? "chosen" : ""} onClick={() => setLibraryCategory(category)}>{category}</button>)}</div>
            <p className="library-count">{libraryResults.length} món · {recipes.length} công thức nội bộ chưa xác minh, {copperRecipes.length} mục Copper có danh sách nguyên liệu nhưng chưa có hướng dẫn.</p>
            {libraryResults.length ? <div className="recipe-list library-list">{libraryResults.map((recipe) => <button className="library-card" key={recipe.id} onClick={() => openRecipe(recipe)}><span className="library-emoji">{recipe.emoji}</span><span className="library-card-content"><span className="library-card-title">{recipe.name}</span><span className="library-card-meta">{recipe.dataStatus === "full_recipe" ? "Có hướng dẫn · chưa xác minh" : "Chỉ có nguyên liệu · chưa có hướng dẫn"}{recipe.totalTime ? ` · ${recipe.source.title.startsWith("Copper") ? "" : "~"}${recipe.totalTime} phút` : ""} · {recipe.ingredients.length} nguyên liệu</span></span><ChevronRight size={17}/></button>)}</div> : <div className="no-results"><span>🔎</span><h3>Không tìm thấy món phù hợp</h3><p>Thử tên nguyên liệu khác hoặc bỏ một bộ lọc.</p></div>}
            <p className="dataset-attribution">Dữ liệu Copper: <a href="https://copperapp.app/study/what-the-world-cooks.html" target="_blank" rel="noreferrer">CC BY 4.0 · Copper — Cook the World</a>. Các mục chỉ có nguyên liệu chưa được trình bày như công thức hoàn chỉnh.</p>
          </>
        )}
        {page === "trending" && (
          <>
            <section className="trending-intro">
              <div className="recipe-intro-icon"><Flame size={22}/></div>
              <div><b>Video món ăn nổi bật trên YouTube</b><p>{importedTrending.updatedAt ? `Dữ liệu đồng bộ ${new Date(importedTrending.updatedAt).toLocaleString("vi-VN")}.` : "Chưa có dữ liệu xu hướng. Có thể thêm link video bạn muốn thử bên dưới."}</p></div>
            </section>
            {importedTrending.videos.length > 0 && <>
              <p className="trend-data-note">Metadata lấy từ YouTube Data API tại lần đồng bộ gần nhất; lượt xem không thể hiện mức tăng trưởng.</p>
              <div className="trending-list">{importedTrending.videos.map((video) => {
                const linkedRecipe = video.recipeId ? recipes.find((recipe) => recipe.id === video.recipeId) : undefined;
                return <article className="trend-card" key={video.id}>
                  <a className="trend-thumb" href={video.videoUrl} target="_blank" rel="noreferrer"><img src={video.thumbnailUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}/><span><ExternalLink size={16}/></span></a>
                  <div className="trend-card-body"><small>{video.creatorName || "YouTube"} · {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("vi-VN") : "Ngày đăng không có"}</small><h3>{video.title}</h3><p>{video.viewCount !== undefined ? `${video.viewCount.toLocaleString("vi-VN")} lượt xem tại lần đồng bộ` : "Chưa có số liệu lượt xem"}</p>{linkedRecipe ? <button className="text-button" onClick={() => openRecipe(linkedRecipe)}>Xem cách nấu: {linkedRecipe.name}</button> : <a className="trend-original" href={video.videoUrl} target="_blank" rel="noreferrer">Xem video gốc <ExternalLink size={14}/></a>}</div>
                </article>;
              })}</div>
            </>}
            <section className="pref-section add-video-section"><h3>Lưu video muốn thử</h3><p className="pref-help">Dán liên kết YouTube, TikTok hoặc Facebook Reel. Link chỉ lưu trên thiết bị này.</p><label className="video-field">Liên kết video<input value={videoUrlDraft} onChange={(event) => { setVideoUrlDraft(event.target.value); setVideoFormError(""); }} placeholder="https://…" inputMode="url" /></label><label className="video-field">Ghi chú (không bắt buộc)<input value={videoNoteDraft} onChange={(event) => setVideoNoteDraft(event.target.value)} placeholder="Món muốn thử, thay đổi nguyên liệu…" /></label>{videoFormError && <p className="form-error" role="alert">{videoFormError}</p>}<button className="primary-small" onClick={saveVideoLink}>Lưu link video</button></section>
          </>
        )}
        {page === "favorites" && (
          <>
            <p className="page-subtitle">Những món bạn muốn nấu lại.</p>
            {favorites.length === 0 ? (
              <div className="no-results">
                <span>♡</span>
                <h3>Chưa có món đã lưu</h3>
                <p>Chạm vào biểu tượng trái tim ở món bạn thích.</p>
              </div>
            ) : (
              <div className="recipe-list">
                {favorites.map((id) => {
                  const r = libraryRecipes.find((x) => x.id === id);
                  return r ? (
                    <RecipeCard
                      key={id}
                      recipe={r}
                      missing={r.required.filter((x) => !ids.has(x))}
                      owned={r.required.filter((x) => ids.has(x))}
                      ratio={r.required.length ? Math.round((r.required.filter((x) => ids.has(x)).length / r.required.length) * 100) : 0}
                      urgent={r.required.some((id) => stock.some((item) => item.id === id && item.fresh !== "fresh"))}
                      onClick={() => openRecipe(r)}
                    />
                  ) : null;
                })}
              </div>
            )}
            <section className="history-box recently-viewed">
              <div className="section-heading-inline"><h3><History size={17} /> Đã xem gần đây <span>{recentRecipeIds.length}</span></h3>{history.length > 0 && <button className="text-button" onClick={() => { if (window.confirm("Xóa toàn bộ lịch sử xem món? Danh sách món đã nấu sẽ được giữ nguyên.")) setHistory([]); }}>Xóa lịch sử xem</button>}</div>
              {recentRecipeIds.length > 0 ? <div className="recent-recipe-list">{recentRecipeIds.map((id) => {
                const recipe = recipeById.get(id)!;
                const required = recipe.required ?? [];
                const owned = required.filter((ingredientId) => ids.has(ingredientId));
                return <RecipeCard key={id} recipe={recipe} missing={required.filter((ingredientId) => !ids.has(ingredientId))} owned={owned} ratio={required.length ? Math.round(owned.length / required.length * 100) : 0} urgent={false} onClick={() => openRecipe(recipe)} />;
              })}</div> : <p>Những món bạn mở gần đây sẽ hiện ở đây.</p>}
            </section>
            <section className="history-box saved-video-box"><h3>Video muốn thử <span>{savedVideos.length}</span></h3>{savedVideos.length ? savedVideos.map((video) => <article className="saved-video" key={video.id}><div><small>{video.platform === "youtube" ? "YouTube" : video.platform === "tiktok" ? "TikTok" : "Facebook"} · đã lưu {new Date(video.savedAt).toLocaleDateString("vi-VN")}</small>{video.note && <p>{video.note}</p>}<a href={video.url} target="_blank" rel="noreferrer">Mở video <ExternalLink size={13}/></a></div><button className="icon-button" onClick={() => setSavedVideos((items) => items.filter((item) => item.id !== video.id))} aria-label="Xóa link video"><X size={16}/></button></article>) : <p>Link video đã lưu sẽ hiện ở đây.</p>}</section>
            <section className="history-box">
              <h3>
                <History size={17} /> Món đã nấu
              </h3>
              {cooked.length ? (
                cooked.map((id) => (
                  <p key={id}>{libraryRecipes.find((r) => r.id === id)?.name}</p>
                ))
              ) : (
                <p>Những món đã nấu sẽ hiện ở đây.</p>
              )}
            </section>
          </>
        )}
        {page === "settings" && (
          <>
            <p className="page-subtitle">
              Tùy chọn được lưu trên thiết bị và áp dụng ngay khi tìm món.
            </p>
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
              <p className="pref-help">Đánh dấu “Ngăn đông” ở nguyên liệu trong tủ lạnh để lọc món cần rã đông.</p>
              <PrefRow icon="🔁" title="Cho phép gợi ý nguyên liệu thay thế" checked={prefs.allowSubstitutions} onChange={(v) => setPrefs((p) => ({ ...p, allowSubstitutions: v }))} />
              <p className="pref-help">Chỉ dùng quy tắc có nguồn tham khảo; món thay thế được xếp riêng, không tính là đủ nguyên liệu gốc.</p>
              <PrefRow
                icon="🍚"
                title="Không muốn nấu cơm"
                checked={prefs.noRice}
                onChange={(v) => setPrefs((p) => ({ ...p, noRice: v }))}
              />
              <p className="pref-help">Lọc món có gạo là nguyên liệu bắt buộc; chưa nhận diện món ăn kèm cơm.</p>
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
                <p className="pref-help">Chưa có định lượng để điều chỉnh khẩu phần trong dữ liệu công thức hiện tại. Khi có công thức kèm định lượng và số phần gốc, app sẽ kiểm tra lượng trong tủ lạnh; không sửa công thức gốc.</p>
            </section>
            <section className="pref-section">
              <h2>Không muốn dùng</h2>
              <p className="pref-help">Chọn nguyên liệu cần loại khỏi gợi ý. Đây không phải công cụ xác nhận an toàn dị ứng hoặc nhiễm chéo.</p>
              {prefs.avoid.length > 0 && <div className="avoid-selected" aria-label="Nguyên liệu đang tránh">{prefs.avoid.map((value) => {
                const id = canonicalIngredientPreference(value, ingredientIndex);
                const ingredient = ingredients.find((entry) => entry.id === id);
                const label = ingredient?.name ?? (value.startsWith("custom-") ? value.slice(7).replace(/-/g, " ") : value);
                return <button key={value} className="avoid-chip" onClick={() => setPrefs((p) => ({ ...p, avoid: p.avoid.filter((entry) => entry !== value) }))} aria-label={`Bỏ tránh ${label}`}>{ingredient?.emoji ?? "🥣"} {label}<X size={13} /></button>;
              })}</div>}
              <label className="avoid-search"><Search size={16}/><input value={avoidQuery} onChange={(event) => setAvoidQuery(event.target.value)} placeholder="Tìm nguyên liệu, tên khác…" /><span>{ingredients.length} nguyên liệu</span></label>
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
          </>
        )}
      </main>
      {page === "fridge" && (
        <div className="find-dock">
          <button className="find-button" onClick={showBestTab}>
            <Sparkles size={18} />
            <span>Xem hôm nay nấu gì</span>
            <span className="find-count">{stock.length}</span>
          </button>
        </div>
      )}
      <nav className="bottom-nav" aria-label="Điều hướng chính">
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
          className={page === "recipes" ? "nav-active" : ""}
          onClick={() => setPage("recipes")}
        >
          <ChefHat size={19} />
          <span>Tìm món</span>
        </button>
        <button
          className={page === "explore" || page === "trending" ? "nav-active" : ""}
          onClick={() => setPage("explore")}
        >
          <BookOpen size={19} />
          <span>Khám phá</span>
        </button>
        <button
          className={page === "favorites" ? "nav-active" : ""}
          onClick={() => setPage("favorites")}
        >
          <Heart size={19} />
          <span>Đã lưu</span>
        </button>
      </nav>
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
              <button
                onClick={() => toggleFavorite(modal.id)}
                aria-label={favorites.includes(modal.id) ? "Bỏ yêu thích" : "Lưu yêu thích"}
                aria-pressed={favorites.includes(modal.id)}
              >
                <Heart
                  size={20}
                  fill={favorites.includes(modal.id) ? "currentColor" : "none"}
                />
              </button>
            </header>
            <div className="modal-scroll">
              <div className="hero-food">{modal.emoji}</div>
              <div className="confidence">
                {modal.dataStatus === "ingredients_only"
                  ? "Danh sách nguyên liệu · chưa có hướng dẫn"
                  : modal.verificationStatus === "verified"
                  ? "✓ Công thức đã xác minh"
                  : "◇ Công thức nội bộ · chưa xác minh"}
              </div>
              <h2 id="recipe-title">{modal.name}</h2>
              {modal.description && <p className="modal-description">{modal.description}</p>}
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
              {modal.dataStatus === "ingredients_only" ? <div className="honesty-note">Nguồn chỉ cung cấp danh sách nguyên liệu và thông tin tổng quan, chưa có định lượng hoặc hướng dẫn nấu. Không coi đây là công thức hoàn chỉnh.</div> : modal.verificationStatus !== "verified" && <div className="honesty-note">Công thức nội bộ, chưa được xác minh độc lập. Hãy đảm bảo nguyên liệu chín kỹ và phù hợp với bạn.</div>}
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
                {modal.ingredients.map((item) => {
                  const id = item.ingredientId;
                  const canonicalId = ingredientIndex.byId.has(id) ? id : resolveIngredientId(item.sourceName ?? id, ingredientIndex) ?? `custom:${normalizeVietnamese(item.sourceName ?? id)}`;
                  const recipeRecommendation = recommendationById.get(modal.id);
                  const have = ids.has(id) || !!recipeRecommendation?.matchedIngredients.includes(canonicalId);
                  const shortage = recipeRecommendation?.quantityShortages.find((entry) => entry.ingredientId === id);
                  const scaledQuantity = scaleRecipeQuantity(item.quantity, item.unit, modal.servings, prefs.servings);
                  const neededText = item.quantity === null ? null : `${formatRecipeQuantity(scaledQuantity ?? item.quantity)} ${item.unit}${scaledQuantity === null ? " · lượng gốc, chưa điều chỉnh" : ""}`.trim();
                  return (
                    <div key={id}>
                      <span className="detail-emoji">{ingredients.find((ingredient) => ingredient.id === id)?.emoji ?? "🥣"}</span>
                      <span>
                        {ingredients.some((ingredient) => ingredient.id === id) ? nameFor(id) : item.sourceName ?? nameFor(id)}
                        <small className="ingredient-role">{item.role === "main" ? "Nguyên liệu chính" : item.role === "seasoning" ? "Gia vị theo công thức" : item.optional ? "Tùy chọn" : "Bắt buộc theo công thức"}</small>
                      </span>
                      <span className={have ? "have" : "need"}>
                        {have
                          ? shortage ? `Đang có · thiếu ${formatRecipeQuantity(Math.max(0, shortage.needed - shortage.available))} ${shortage.unit} (có ${formatRecipeQuantity(shortage.available)}, cần ${formatRecipeQuantity(shortage.needed)})` : neededText ? `Đang có · cần ${neededText}` : "Đang có"
                          : item.optional
                            ? "Tùy chọn"
                            : neededText ? `Cần thêm · ${neededText}` : "Cần thêm"}{item.quantity === null && !item.optional ? " · Chưa có định lượng" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
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
              {modal.steps.length > 0 ? <><h3 className="steps-title">Cách làm</h3><div className="steps">
                {modal.steps.map((step, i) => (
                  <button
                    key={i}
                    className={`step${done.includes(i) ? " done" : ""}`}
                    onClick={() =>
                      setDone((d) =>
                        d.includes(i) ? d.filter((x) => x !== i) : [...d, i],
                      )
                    }
                  >
                    <span>
                      {done.includes(i) ? <Check size={16} /> : i + 1}
                    </span>
                    <p>{step.instruction}</p>
                  </button>
                ))}
              </div></> : <div className="no-instructions"><b>Chưa có hướng dẫn chi tiết trong dữ liệu này.</b>{modal.source.url && <a href={modal.source.url} target="_blank" rel="noreferrer">Mở trang nguồn <ExternalLink size={14}/></a>}</div>}
              {modal.equipment.length > 0 && <div className="equipment"><b>Dụng cụ:</b> {modal.equipment.join(" · ")}</div>}
              {modal.tips.length > 0 && <div className="tip">
                <b>✨ Mẹo nhỏ</b>
                <p>{modal.tips.join(" ")}</p>
              </div>}
              <p className="source">Nguồn: {modal.source.title}{modal.source.url && <> · <a href={modal.source.url} target="_blank" rel="noreferrer">Mở nguồn</a></>}</p>
            </div>
            <div className="modal-action">
              <button
                className="find-button"
                onClick={() => {
                  setCooked((c) => [
                    modal.id,
                    ...c.filter((x) => x !== modal.id),
                  ]);
                  setModal(null);
                  setPage("favorites");
                }}
              >
                <Check size={18} /> Mình đã nấu món này
              </button>
            </div>
          </section>
        </div>
      )}
      {showInstallHelp && <div className="modal-backdrop install-backdrop" role="dialog" aria-modal="true" aria-labelledby="install-title"><section className="install-card"><button className="close-install" onClick={() => setShowInstallHelp(false)} aria-label="Đóng"><X size={18}/></button><div className="brandicon"><Leaf size={20}/></div><h2 id="install-title">Cài Fresh lên màn hình chính</h2>{!window.isSecureContext ? <><p>Để cài như ứng dụng, trang cần HTTPS. Hãy mở lại đường dẫn QR sau khi triển khai Fresh lên Vercel.</p><button className="qr-link" onClick={() => setShowInstallHelp(false)}>Tiếp tục vào web</button></> : isIOSDevice() ? <><p>Mở trang này bằng Safari, chạm <b>Chia sẻ</b>, chọn <b>Thêm vào Màn hình chính</b>, rồi chạm <b>Thêm</b>.</p><p>iPhone/iPad yêu cầu bạn xác nhận các bước này; website không thể tự thêm biểu tượng thay bạn.</p><button className="qr-link" onClick={() => setShowInstallHelp(false)}>Tiếp tục vào web</button></> : installPrompt ? <><p>Chạm bên dưới để mở hộp thoại cài đặt của trình duyệt. Xác nhận thêm một lần trong hộp thoại để Fresh xuất hiện trên màn hình chính.</p><button className="qr-link install-action" onClick={async () => { const prompt = installPrompt; await prompt.prompt(); const choice = await prompt.userChoice; setInstallPrompt(null); if (choice.outcome === "accepted") setShowInstallHelp(false); }}><Download size={17}/> Cài Fresh</button></> : !installCheckComplete ? <><p>Đang kiểm tra xem trình duyệt có thể cài Fresh trực tiếp không…</p><button className="qr-link" onClick={() => setShowInstallHelp(false)}>Tiếp tục vào web</button></> : <><p>Nếu trình duyệt hỗ trợ cài PWA, lựa chọn cài đặt sẽ xuất hiện trong menu trình duyệt.</p><p><b>Android/Chrome:</b> mở menu ⋮ rồi chọn <b>Cài đặt ứng dụng</b> hoặc <b>Thêm vào màn hình chính</b>.</p><p><b>iPhone/iPad:</b> dùng Safari, chạm <b>Chia sẻ → Thêm vào Màn hình chính → Thêm</b>.</p><button className="qr-link" onClick={() => setShowInstallHelp(false)}>Tiếp tục vào web</button></>}</section></div>}
    </div>
  );
}

function QrPage() {
  const url = `${window.location.origin}/?install=1`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(url)}`;
  return <main className="qr-page"><a className="qr-back" href="/">← Quay lại ứng dụng</a><div className="qr-card"><div className="brand"><div className="brandicon"><Leaf size={18}/></div><span>fresh<span className="branddot">.</span></span></div><h1>Quét để mở và cài Fresh</h1><p>Quét mã sẽ mở trang hướng dẫn cài phù hợp với điện thoại. Android có thể mở hộp thoại cài đặt; iPhone/iPad cần xác nhận qua menu Chia sẻ.</p><img className="qr-image" src={qr} alt={`Mã QR mở trang cài Fresh ${url}`}/><code>{url}</code><small>Để cài ứng dụng, hãy tạo mã QR sau khi triển khai app trên HTTPS (ví dụ tên miền Vercel).</small></div></main>;
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
  return (
    <button className={`recipe-card${compact ? " compact" : ""}`} onClick={onClick}>
      <div className="food-thumb">
        {recipe.emoji}
        {urgent && <span className="urgent-dot">Cần dùng</span>}
      </div>
      <div className="card-content">
        <div className="card-tags">
          <span>{recipe.category}</span>
          {score !== undefined && <span className="score-tag">{score}% phù hợp</span>}
          {substitutions.some((suggestion) => suggestion.availability === "in_fridge") && <span className="substitution-tag">Có thể thay {new Set(substitutions.filter((suggestion) => suggestion.availability === "in_fridge").map((suggestion) => suggestion.originalIngredientId)).size} nguyên liệu</span>}
          {recipe.verificationStatus === "verified" ? (
            <span className="verified-tag">Đã xác minh</span>
          ) : null}
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
          <span>{owned.length ? `Đang có ${owned.map((id) => ingredientName?.(id) ?? nameFor(id)).join(", ")}` : "Chưa có nguyên liệu khớp"}</span>
          <span>{missing.length ? `Còn thiếu ${missing.map((id) => ingredientName?.(id) ?? nameFor(id)).join(", ")}` : quantityStatus === "unknown" ? "Đủ loại nguyên liệu · chưa rõ lượng" : quantityStatus === "sufficient" ? "Đủ nguyên liệu theo lượng đã nhập" : "Chưa xác định đủ lượng"}</span>
          <small>{recipe.verificationStatus === "verified" ? "Đã xác minh" : recipe.dataStatus === "ingredients_only" ? "Chưa có hướng dẫn nấu" : "Công thức nội bộ · chưa xác minh"}</small>
        </div> : <>
          <div className="match-line">
            <div>
              <b>{owned.length}</b> nguyên liệu khớp theo tên
              {missing.length > 0 && (
                <span> · thiếu {missing.map((id) => ingredientName?.(id) ?? nameFor(id)).join(", ")}</span>
              )}
            </div>
            <div className="match-meter">
              <i style={{ width: `${ratio}%` }} />
            </div>
          </div>
          <small className="honest-caption">
            {recipe.dataStatus === "ingredients_only"
              ? "Chỉ có danh sách nguyên liệu · chưa có hướng dẫn"
              : recipe.verificationStatus === "verified"
              ? "Công thức đã xác minh"
              : "Công thức nội bộ · chưa xác minh"}
          </small>
          {quantityStatus === "unknown" && recipe.dataStatus === "full_recipe" ? <small className="honest-caption">Đủ loại nguyên liệu · chưa xác định đủ số lượng</small> : null}
          {quantityStatus === "shortage" ? <small className="honest-caption">Thiếu định lượng một hoặc nhiều nguyên liệu</small> : null}
          {reasons?.length ? <span className="recommendation-reasons">{reasons.slice(0, 3).map((reason, index) => <small className="recommendation-reason" key={index}>{reason}</small>)}</span> : null}
        </>}
      </div>
      <ChevronRight className="card-arrow" size={18} />
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
