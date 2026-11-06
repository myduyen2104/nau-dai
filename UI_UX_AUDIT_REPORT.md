# UI/UX Audit Report

Audit date: 2026-11-05 · Local app at `http://localhost:5173/`

## Design direction

**Modern Vietnamese Cooking App — Fresh, Warm, Premium, Minimal.** The fridge is the daily workspace, so the interface prioritizes stock status and one obvious action. Recipe discovery uses a compact editorial grid on wide screens and readable single-column cards on phones. Recipe visuals use the recipe's existing emoji placeholder; no unlicensed or unrelated dish photos were introduced.

## What changed

- Added a shared visual token layer for palette, type, spacing-related radii, touch height, and shadow in `src/style.css`.
- Widened desktop content to a bounded 1120px canvas; recipe discovery uses responsive grids instead of a long narrow list.
- Raised text sizes and contrast for supporting copy, improved input, chip, card and button hierarchy, and added consistent visible keyboard focus and reduced-motion handling.
- Reworked the phone viewport into a fixed app shell: main content scrolls independently; the cook CTA sits above the bottom navigation, and neither covers content at 320px.
- Changed the fridge CTA to “Xem hôm nay nấu gì”, and the recipe page title to “Hôm nay nấu gì?”.
- Recipe cards and Explore entries distinguish ingredient-only records from recipes with instructions. The UI keeps emoji placeholders where the data has no licensed recipe image.
- Added dialog semantics and modal keyboard behavior: labelled dialog, focus containment, Escape to close, body scroll lock, and focus return to the opening card.
- Ingredient picker now shows category quick picks without unrelated popular ingredients mixed into a selected category.

## Visual evidence

Before screenshot: [Fridge, 1440 × 900](design-audit/before/fridge-desktop.png). This was captured with the original visual CSS before the redesign tokens were applied.

After screenshots:

- Fridge, [320 × 640](design-audit/after/fridge-mobile-320.png), [375 × 812](design-audit/after/fridge-mobile-375.png), [390 × 844](design-audit/after/fridge-mobile-390.png), [768 × 1024](design-audit/after/fridge-tablet-768.png), [1024 × 768](design-audit/after/fridge-tablet-1024.png), [1440 × 900](design-audit/after/fridge-desktop-1440.png).
- [Explore grid, 1440 × 900](design-audit/after/explore-desktop-1440.png).
- [Recommendation card, 1440 × 900](design-audit/after/recommendation-desktop-1440.png).
- Recipe detail, [390 × 844](design-audit/after/detail-mobile-390.png), [1440 × 900](design-audit/after/detail-desktop-1440.png).

## Visual QA and interaction results

| Check | Result | Evidence |
|---|---|---|
| Empty fridge | Pass | Empty prompt, picker, fridge count, CTA and navigation rendered. |
| Ingredient picker | Pass after fix | Category quick-pick no longer mixes unrelated popular results into the selected group. |
| Add/edit/remove stock | Pass | Added a test egg, viewed quantity/unit/status controls, then removed it; fridge returned to empty. |
| Recommendation card | Pass | Egg input surfaced “Trứng luộc”; card said quantity was unknown rather than claiming measured sufficiency. |
| Recipe detail | Pass | Full-screen mobile detail displayed unverified status, known ingredients, no invented amounts, steps and source. |
| Modal keyboard | Pass | Dialog role/label present; Escape closed it and focus returned to the recipe card. |
| Invalid backup file | Pass | Importing malformed JSON showed a clear alert (“Tệp sao lưu thiếu dữ liệu hoặc có cấu trúc không hợp lệ.”); dismissing it returned to Settings and the fridge remained empty. |
| Explore | Pass | 44 records rendered; Copper entries were visibly labelled “Chỉ có nguyên liệu · chưa có hướng dẫn”. |
| Mobile/tablet/desktop width | Pass | At 320, 375, 390, 768, 1024 and 1440 CSS pixels, `documentElement.scrollWidth` equalled viewport width. No horizontal overflow detected. |
| Bottom navigation overlap | Pass after fix | At 320 × 640, nav and CTA occupy their own app-shell rows; main content scrolls in a separate region. |
| Contrast/accessibility | Pass for automated Lighthouse checks | Final mobile Lighthouse: Accessibility 100/100, Best Practices 100/100; contrast audit passed. Modal keyboard behavior was also exercised manually. |
| Favorite/history, video save, backup round-trip, PWA offline/install | Not re-exercised in this visual pass | Existing controls remain in source. This pass focused browser interaction on fridge, recommendations, Explore and recipe detail; no claim of full regression E2E coverage. |

### Lighthouse

Final mobile navigation audit at 390 × 844: Accessibility **100**, Best Practices **100**, SEO **91**, Agentic Browsing **50**. Contrast passed after the color adjustment. Remaining automated findings are invalid `robots.txt`, missing/nonconforming `llms.txt`, and an invalid `ai-catalog.json` schema; those are crawl/discovery configuration findings, not UI defects.

## Scorecard

Scores are visual judgments based on the before/after fridge screenshots, after screenshots for Explore/detail, viewport checks, and the stated browser interactions. Mobile usability and recipe detail received stronger direct evidence than the pages not exercised in this browser pass.

| Criterion | Before | After | Reason and evidence | Remaining issue |
|---|---:|---:|---|---|
| Visual appeal | 4 | 8 | Warmer cream canvas, richer food-toned placeholders and clear grouping; compare before/after fridge screenshots. | Real licensed recipe photography is not available in the dataset. |
| Color harmony | 5 | 8 | Deep green, warm neutral and restrained amber tokens; contrast adjusted to pass Lighthouse. | Some legacy component colors remain outside the most-used surfaces. |
| Typography | 5 | 7 | Stronger heading/body hierarchy and larger captions across cards/forms. | Dense metadata can still feel small in recipe cards at 320px. |
| Layout | 4 | 8 | Bounded desktop canvas, Explore grid, phone app shell with independently scrolling content. | Explore remains a long catalog; no category-specific editorial collections were added. |
| Spacing | 5 | 8 | Standardized radii and more generous control/card spacing. | Inventory rows become tall when all date and freezer controls are expanded. |
| Consistency | 5 | 8 | Shared palette, surfaces, touch sizing, focus and hover treatment across common controls. | A few legacy utility rules remain earlier in `style.css`. |
| Navigation | 6 | 8 | Five clear destinations, active state, persistent phone navigation and distinct CTA above it. | Preference settings still open from the gear, not a sixth destination. |
| Mobile usability | 4 | 8 | 320–390 layouts tested, no overflow; fixed shell bars no longer cover content; detail fills screen. | Physical iPhone safe-area/keyboard behavior was not tested on hardware. |
| Recipe discoverability | 4 | 8 | Explore grid, search/filter affordances, match state and incomplete-recipe labels are clearer. | 41 internal recipes remain unverified and have no measured quantities. |
| Accessibility | 5 | 8 | Lighthouse Accessibility 100; visible focus, reduced motion, dialog naming, focus loop and Escape. | Formal screen-reader testing and a full WCAG audit were not performed. |
| Overall product polish | 4 | 8 | More coherent daily-use hierarchy across fridge, recipe search, Explore and detail. | Trending/favorites/settings empty and populated states were not all visually captured after the redesign. |

## Remaining limits

- The cookbook has no licensed recipe photography, so cards use the associated emoji rather than guessed images.
- The screenshot evidence includes one before-state (desktop fridge). Before screenshots for every secondary page were not captured; after evidence covers fridge, Explore, recommendations and detail.
- Browser testing used viewport emulation, not physical iOS/Android devices. Touch-target appearance is inspected, but native keyboard and safe-area behavior remain unverified on hardware.
- Valid backup export/import round trip, trending video save, favorites/history persistence, offline mode and installation were not re-run as full browser journeys in this pass. Invalid-backup error feedback was exercised.
- The catalog quality limits from the existing readiness report still apply: 41 internal recipes are unverified and lack quantities; 3 Copper entries are ingredient-only.

## Files changed

- `src/style.css` — design tokens and visual system, responsive grids, mobile app shell, modal styling, contrast/focus/reduced-motion.
- `src/main.tsx` — page title/CTA copy, category picker behavior, recipe dialog semantics and keyboard behavior, CTA/nav order.
- `design-audit/before/` and `design-audit/after/` — rendered screenshots.
- `UI_UX_AUDIT_REPORT.md` — this report.
- `design-audit/evidence.json` — viewport and rendered-state evidence record.

## Validation

- `npm run build`: PASS.
- `npm test`: PASS, 44 tests.
- `npm run validate:dataset`: PASS, 41 internal recipes and 3 permitted Copper records.
- Browser viewport sweep: PASS, no horizontal overflow at all six target widths.
- Lighthouse mobile Accessibility and Best Practices: 100/100 each.
