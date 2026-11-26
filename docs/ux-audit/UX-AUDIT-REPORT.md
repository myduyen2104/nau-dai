# Comprehensive UI/UX Audit — Nấu Đại Đi

**Audit date:** 25 November 2026 (Asia/Ho_Chi_Minh)
**Target:** Local Vite app at `http://127.0.0.1:5173/`, clean isolated Chrome context
**Verdict:** **SHIP WITH FIXES** for a limited beta; **not ready to call fully trustworthy as a cooking assistant** until recipe quantities/instructions and modal layering are corrected.

## A. Executive summary

The app’s purpose is clear within a few seconds after the first-launch prompt: find a meal, manage ingredients, and cook from a guided recipe. The mobile interface is cohesive, Vietnamese copy is generally understandable, the pantry search and expiry calendar work, and core flows for saving recipes, building a shopping list, and using the cooking timer are discoverable.

The largest risk is trust in cooking guidance. In one directly inspected “Trứng hấp mềm” recipe, the ingredient list showed **4 eggs** for the chosen serving count while a step said to beat **2 eggs**. The recipe card also labeled the recipe “internal/unverified” while its detail showed a named external reference. These contradictions make it hard to know which instructions to follow. On the fridge screen, a fixed “Gợi ý món từ tủ” action and bottom navigation remain above the recipe modal; they visibly compete with the modal’s own fixed actions.

The mobile layouts fit the tested widths without horizontal overflow. At 1440px, however, the home hero remains a square image spanning the 1120px content width, taking up almost the full initial viewport and pushing useful content below the fold. Performance measurement under a local 4× CPU slowdown and Slow 3G produced **LCP 1.11s, CLS 0.01, and a single-trace interaction latency of 1.73s**. Treat that INP-like trace result as a warning from one lab run, not a field metric or a prediction for Vercel.

### Highest-priority findings

1. Recipe servings can contradict quantities written in steps (P1).
2. Fixed fridge and navigation actions overlap the recipe modal (P1).
3. The home feature rotates on a timer while its detail overlay can remain open, so the visible feature and open recipe can diverge (P2).
4. Recipe source/verification labels vary between cards and details (P2).
5. Desktop home is dominated by the square mobile hero (P2).
6. One recorded interaction took 1.73s under CPU 4× / Slow 3G conditions (P2; single run).

## B. Screen inventory

| Screen / state | Status | Notes |
|---|---|---|
| First launch / PWA install prompt | Tested | Prompt appears over the home screen in a clean context; continue-to-web works. |
| Home / meal suggestions | Tested | Hero, rotating suggestions, recipe detail entry, pantry shortcut, tip area. |
| Fridge / empty and populated | Tested | Search, quick ingredient groups, add ingredient, stock cards and fridge suggestions. |
| Fridge item editor | Tested | Expiry calendar opens; storage and quantity controls were visible. No date was committed. |
| Explore / fridge recommendations | Tested | Readiness tabs, missing-ingredient recipes, recipe details. |
| Explore / all recipes | Tested | Search, quick filters, category selection and “show more.” |
| Recipe details | Tested | Ingredient list, portions, source information, save, shopping-list action. |
| Cooking guide | Tested | Step navigation, sound/vibration settings, one-minute timer start and pause behavior. |
| Shopping list | Tested | Missing ingredients added; one item marked purchased and remaining count updated. |
| Saved recipes | Tested | Favorite appears in the saved list; metadata mismatch observed. |
| Video feed | Partially tested | Loading state and feed visible; pull-to-refresh gesture and playback on a physical phone were not verified. |
| Settings / preferences | Partially tested | Preference controls and ingredient exclusion search inspected; no full persistence/reload check. |
| Authentication, real-device installation, offline behavior | Not tested | Not part of the local anonymous browser journey. |

## C. UX scorecard

Scores reflect only the journeys and viewports exercised; 10 means strong evidence of an excellent experience, not merely a working control.

| Dimension | Score | Evidence |
|---|---:|---|
| First impression | 7/10 | Clear food-oriented home after dismissing the PWA prompt; first-launch prompt temporarily obscures the task. |
| Learnability | 7/10 | Ingredient search and “Xem công thức” are familiar; status labels and serving mismatch require interpretation. |
| Navigation | 7/10 | Bottom navigation is consistent on mobile; fridge recipe modal layering creates competing actions. |
| Discoverability | 7/10 | Quick ingredients, fridge suggestion tabs and recipe filters are visible; some empty states provide only indirect next steps. |
| Task completion | 7/10 | Add, save, shop and timer journeys completed; correctness/trust of generated cooking instructions is the limiting factor. |
| Interaction efficiency | 6/10 | Core flows work, but shopping requires traversing a recipe detail; one throttled pointer interaction was slow. |
| Visual design | 7/10 | Warm, consistent mobile styling; desktop hero proportions and modal overlap reduce polish. |
| Consistency | 5/10 | Recipe provenance/status differs between cards and detail; quantity and step text differ in one recipe. |
| Accessibility | 6/10 | Lighthouse accessibility score 95 on one mobile navigation run; contrast issue and unlabeled Explore search remain. No full screen-reader audit. |
| Responsive design | 7/10 | No horizontal overflow at 360/390/430px; 768px and 1440px are centered, but desktop composition is not well adapted. |
| Error handling | 6/10 | Empty states explain missing ingredients, but canceled external images and browser console warnings were present. Invalid-input recovery was not comprehensively tested. |
| Performance perception | 6/10 | LCP/CLS were good in this lab run; interaction latency reached 1.73s under the requested slowdown. |
| Trust and confidence | 4/10 | Step/ingredient quantity conflict and source-label mismatch affect the core promise of usable recipes. |

**Automated Lighthouse (single mobile navigation run):** Accessibility 95, Best Practices 96, SEO 92, Agentic Browsing 50. Lighthouse flagged a low-contrast count badge (2.76:1), console errors/warnings, invalid `robots.txt`, non-Markdown `llms.txt` heading, and invalid `ai-catalog.json` / ARD schema. These SEO/agent-discovery findings are secondary to the user-facing cooking issues. The automated audit covered one navigation state, not every screen; it does not establish WCAG conformance.

## D. User journey results

Operation counts below are approximate counts of user-facing clicks/keyboard actions observed in the browser, not a usability-lab timing study. `PASS` means the requested action completed; it does not certify the quality or accuracy of recipe content.

| # | Goal and actions | Result / friction | Status | Evidence |
|---:|---|---|---|---|
| 1 | First-time visitor: open app, understand purpose, continue past install prompt (1 click) | PWA prompt covers the home content; “Tiếp tục vào web” reveals the cooking homepage. Purpose is clear after dismissal. | PASS, with interruption | [First launch](evidence/01-first-launch-install-prompt.png) |
| 2 | Choose today’s meal: inspect home hero and open a recipe (1 click) | Recipe details open. During the broader session, the home hero changed while a detail overlay remained open; rotating content can visually diverge from the open item. | PARTIAL | [Mobile home](evidence/02-home-mobile-360.png) |
| 3 | Add an ingredient by search: open fridge, search “trứng,” select “Trứng gà” (about 3 actions) | Search suggestions appeared and the ingredient was added. Fridge recommendations correctly showed that one egg was insufficient for the recipe sample. | PASS | [Fridge with ingredient](evidence/04-fridge-one-ingredient.png) |
| 4 | Add an ingredient using quick selection (about 2 actions) | Quick picker expanded into grouped vegetables, meat/eggs and starch; selecting an item updated the selected state. | PASS | — |
| 5 | Set or inspect an expiry date: open item editor and calendar (2 clicks) | Calendar opened and exposed month/day controls; no date was saved, so persistence was not evaluated. | PARTIAL | [Expiry calendar](evidence/06-expiry-calendar.png) |
| 6 | Find a fridge-compatible meal: choose the “Thiếu” recommendation and open it (2 clicks) | A recipe card and detail were available, but the quantities and instructions contradicted one another; provenance wording also changed. | FAIL for confidence | [Recipe detail](evidence/05-recipe-serving-and-sticky-overlap.png) |
| 7 | Search all recipes for “miến” and narrow results (about 3 actions) | Search, quick filter and “Xem thêm” worked. The “Món < 30 phút” filter includes recipes at exactly 30 minutes, matching a ≤30 interpretation rather than the literal “<30” label. | PARTIAL | — |
| 8 | Add missing ingredients to shopping list (1 action from detail) | List was created and grouped; quantities were shown as unknown even for ingredients whose source detail had quantities. | PARTIAL | — |
| 9 | Mark a shopping item purchased (1 click) | Remaining-item count changed from 12 to 11 and a clear remove-checked action appeared. | PASS | — |
| 10 | Save a recipe and find it later (2 clicks plus tab switch) | Favorite action and Saved screen worked. Saved card labeled the recipe internal/unverified while detail cited an external source. | PARTIAL | — |
| 11 | Start cooking and use timer / next step (about 4 actions) | Guide loaded, timer counted down and next-step action worked. “Chưa có thời lượng trong dữ liệu” remained visible even after setting a manual timer, which can be read as a contradictory status. | PASS with unclear feedback | — |
| 12 | Change a cooking preference (1 click) | Preference controls were reachable; persistence after reload and their effect on recommendations were not verified. | PARTIAL | — |
| 13 | Open the video feed (1 click) | Initial loading message was followed by video cards/embedded content. Pull-to-refresh, media-data usage and physical-device playback were not tested. | PARTIAL | — |

## E. Issue register

### UX-01 — Recipe steps contradict serving-scaled ingredient amounts

- **Severity:** P1 · **Confidence:** High · **Screen:** Recipe detail / fridge suggestions, mobile 390px.
- **Reproduction:** Set preferences to two portions, add one egg to the fridge, open the “Trứng hấp mềm” suggestion. The ingredient list indicated four eggs were required; a cooking step instructed beating two eggs.
- **Actual / expected:** Ingredient amounts can be scaled while step text stays at its original serving quantity. The recipe should provide one internally consistent set of quantities, or clearly state that steps have not been scaled.
- **Impact:** Users may waste food or prepare a different dish than the displayed recipe. This directly weakens the main cooking use case.
- **Technical cause verified:** The detail renderer scales ingredient quantities via `scaleRecipeQuantity` (`src/main.tsx`, around lines 2827–2848; `src/utils/servings.ts`), while cooking instructions render the stored step string directly (`src/main.tsx`, around line 2388). No corresponding instruction scaling/template is applied.
- **Suggested fix:** Store quantities as structured step data or avoid scaling unless instructions can be scaled consistently; add data-integrity checks for ingredient-step quantities.
- **Evidence:** [Recipe serving mismatch](evidence/05-recipe-serving-and-sticky-overlap.png).

### UX-02 — Fixed fridge controls overlap the recipe modal

- **Severity:** P1 · **Confidence:** High · **Screen:** Recipe detail opened from Fridge, mobile.
- **Reproduction:** Add an ingredient, open a fridge recommendation, inspect the bottom of the detail overlay.
- **Actual / expected:** The “Gợi ý món từ tủ” dock and bottom navigation remain visible over/alongside the modal’s own sticky actions. The active recipe should have one clear action area and background controls should not be actionable through the overlay.
- **Impact:** Competing controls obscure content and can lead to tapping the wrong action.
- **Technical cause verified:** `.modal-backdrop` uses z-index 20 while `.find-dock` and `.bottom-nav` use 45 and 50 in `src/style.css` (around lines 369, 1717, 1720). The modal backdrop is therefore below those fixed elements.
- **Suggested fix:** Establish a single overlay stacking layer above all page-fixed controls; lock background interaction/scroll while the dialog is open.
- **Evidence:** [Modal and fixed action overlap](evidence/05-recipe-serving-and-sticky-overlap.png).

### UX-03 — Home feature can rotate behind an open recipe

- **Severity:** P2 · **Confidence:** Medium-high · **Screen:** Home and recipe detail overlay.
- **Reproduction:** Leave the home screen open long enough for its one-minute rotation while a detail overlay is open; the underlying hero changes while the open detail remains.
- **Actual / expected:** A recommendation can change during a decision. It should stay stable for the session or pause rotation while a detail is open, and its title/image/detail should remain a single selected recipe.
- **Technical cause verified:** `src/main.tsx` starts a 60-second interval while `page === "home"` (around lines 1314–1327). Opening a recipe sets modal state but does not change `page`, so the interval keeps running.
- **Suggested fix:** Pause the interval while a modal is open; prefer user-triggered refresh or preserve a stable selection through the detail flow.
- **Evidence:** Observed in browser during the home-to-detail journey; sequence is described above.

### UX-04 — Recipe provenance labels disagree between cards and details

- **Severity:** P2 · **Confidence:** High · **Screen:** Explore, Fridge, Saved, recipe detail.
- **Actual / expected:** A card/saved entry can say “Công thức nội bộ · chưa xác minh” while detail cites a named external recipe source. The same recipe should use consistent source and verification language across all surfaces.
- **Impact:** Users cannot judge where a recipe came from or how much to trust it.
- **Technical cause:** Card metadata derives from `recipe.verificationStatus` (`src/main.tsx`, `RecipeCard` near line 2979), while source-backed detail paths can resolve and display a separate catalog/source reference (`openRecipe` around lines 1495 onward). The UI does not reconcile these display states for the observed recipe.
- **Suggested fix:** Normalize provenance/status in the recipe model and use one shared display rule for cards, saved results and detail.
- **Evidence:** Journey 6 and 10 observations; screenshot [recipe detail](evidence/05-recipe-serving-and-sticky-overlap.png).

### UX-05 — Desktop home is dominated by a square hero

- **Severity:** P2 · **Confidence:** High · **Screen:** 1440×900.
- **Actual / expected:** The hero is square and spans the 1120px content width; at 1440×900 it occupies more than a viewport height, pushing the meal list and secondary tasks below the fold. A desktop composition should preserve the food image without making the primary content require a large scroll.
- **Technical cause verified:** `.app-page-home .home-feature` sets `aspect-ratio: 1 / 1` (`src/style.css`, around line 1915); desktop styles increase minimum height but do not switch to a compact or two-column hero (`src/style.css`, around line 1728).
- **Suggested fix:** Keep square treatment on mobile; cap hero height or use a two-column desktop card with image and recipe text side by side.
- **Evidence:** [Desktop home](evidence/03-home-desktop-1440.png).

### UX-06 — Slow-device interaction feedback is at risk

- **Severity:** P2 · **Confidence:** Medium · **Screen:** Home, simulated mobile.
- **Measurement:** One local Chrome trace with CPU 4× and Slow 3G measured LCP 1.11s, CLS 0.01, and pointer interaction latency 1.73s. Trace breakdown assigned about 1.68s to input delay. This is a one-run lab trace; no production/CrUX measurements were available.
- **Impact:** Even when initial painting is fast, a delayed response to tapping can feel frozen on older devices.
- **Suggested fix:** Profile main-thread work for the traced pointer event; split/defer expensive updates and avoid broad synchronous rerenders. Repeat several traces and validate on a real low-end Android device before claiming improvement.
- **Evidence:** Raw trace was kept outside the repository at `/tmp/nau-home-slow3g-cpu4x-trace.json.gz`; screenshot context: [mobile home](evidence/02-home-mobile-360.png).

### UX-07 — Contrast and search naming need accessibility follow-up

- **Severity:** P2 · **Confidence:** High for the audited node; limited scope.
- **Actual:** Lighthouse reported a 2.76:1 contrast ratio on the white-on-orange count badge. The Explore “Tìm món hoặc nguyên liệu…” textbox is missing an accessible name in its markup; settings’ “Tìm nguyên liệu…” exclusion field similarly has no explicit label/aria-label. `src/main.tsx` around lines 2260 and 2567.
- **Expected / impact:** Text contrast should meet WCAG AA for normal text (4.5:1), and each input should expose a meaningful accessible name to assistive technology.
- **Suggested fix:** Darken the badge background or change its text treatment; add labels or `aria-label`s. Then run an axe/keyboard/screen-reader check over all screens.

### UX-08 — Recipe-time filter label is stricter than its implementation

- **Severity:** P3 · **Confidence:** High.
- **Actual:** “Món < 30 phút” includes items with `totalTime === 30`; source filter uses `<= 30` (`src/main.tsx`, around line 1844).
- **Impact:** Small expectation mismatch.
- **Suggested fix:** Either change the label to “30 phút trở xuống” or use a strict `< 30` comparison.

### UX-09 — Console and external-image noise

- **Severity:** P3 · **Confidence:** High for the observed local run.
- **Actual:** Browser console reported React’s unrecognized `fetchPriority` prop and blocked vibration without a qualifying user gesture. The cold-run network log had no HTTP 4xx/5xx in the captured page’s 86 requests; two external recipe images were aborted (`ERR_ABORTED`) while content was changing/navigating.
- **Impact:** Warnings make real errors harder to distinguish; canceled third-party images can appear as intermittent image failure.
- **Technical cause verified:** `fetchPriority` is passed to the intro and home `<img>` elements (`src/main.tsx`, around lines 1904 and 1950). External recipe images use third-party URLs and may be canceled during navigation.
- **Suggested fix:** Use the React-supported prop casing for image priority or set the DOM attribute explicitly; distinguish intentional request cancellation from failed image fallback in telemetry.

## F. Prioritized improvement roadmap

### Quick wins

1. Move the detail dialog and its backdrop above every fixed page dock/nav; prevent background taps and scrolling.
2. Pause home recommendation rotation while a modal is open; make refresh user-controlled.
3. Unify provenance and verification badges between card, saved and detail views.
4. Fix the `<30` copy/logic mismatch and the count badge contrast.
5. Give all search inputs programmatic labels and clear focus states.

### High-impact improvements

1. Resolve recipe serving consistency. Do not scale displayed ingredients unless associated instructions can stay truthful; validate the tested egg recipe and similar recipes.
2. Preserve ingredient quantities in the shopping list when source quantity parsing is reliable; otherwise explain why the amount is unknown.
3. Profile the 1.73s pointer interaction under repeatable throttled runs and real low-end Android hardware.
4. Redesign the desktop home hero so the 1440px view shows the meal recommendation and its CTA without an oversized image dominating the page.

### Structural UX changes

1. Adopt one canonical recipe provenance/completeness model shared by every list/detail surface.
2. Add automated data quality checks for ingredient, serving and instruction consistency, plus UI regression checks for modal stacking and representative mobile widths.
3. Add field performance monitoring (LCP, CLS, INP) and distinguish lab metrics from production telemetry.
4. Run a complete WCAG 2.2 AA audit, including keyboard-only and screen-reader use. Lighthouse’s score alone is not a certification.

## G. Final verdict

- **Is it easy for a new user?** Mostly, after dismissing the initial install prompt. The meal/fridge purpose and mobile navigation are understandable without instructions.
- **Can users self-serve?** They can find ingredients, save a dish and start cooking. They cannot safely rely on every displayed serving quantity until the recipe inconsistency is fixed.
- **What may make users abandon it?** A recipe that appears to ask for contradictory amounts, an overlay hiding controls, or slow-feeling taps on older phones.
- **What feels unfinished?** Different provenance badges for the same recipe, the oversized desktop hero, and console warnings.
- **If only five fixes are possible:** (1) reconcile ingredients and step quantities; (2) fix modal stacking; (3) stabilize the home featured recipe through detail; (4) unify source/status labels; (5) profile and reduce the long interaction delay.
- **Keep:** Warm Vietnamese visual identity, mobile-first navigation, grouped quick ingredients, visible fridge match/missing states, expiry-calendar interaction, and the cooking timer/step structure.

## Scope and limitations

- All journeys were run against the local app in a fresh, isolated Chrome context. Data created while testing (ingredients, favorite, shopping-list state and one preference) stayed in that isolated context; no production user data was changed.
- Tested viewport widths: 360, 390, 430, 768 and 1440px. No horizontal overflow was observed at the three mobile widths. The larger widths had a 15px document-width difference attributable to the browser scrollbar.
- The app was not audited on a physical Android device, Vercel deployment, screen reader, or actual Slow 3G carrier. Device performance results are simulated and from a single lab trace.
- No committed screenshot baseline was available, so visual regression comparison is **INCONCLUSIVE**. Screenshots document current behavior; they are not a before/after comparison.
- Several flows were only partially tested; see the screen inventory. No code was modified, no tests/build were run, and no commit or push was made.

## Evidence index

- [First-launch install prompt](evidence/01-first-launch-install-prompt.png)
- [Home at 360×800](evidence/02-home-mobile-360.png)
- [Home at 1440×900](evidence/03-home-desktop-1440.png)
- [Fridge with one ingredient](evidence/04-fridge-one-ingredient.png)
- [Recipe serving mismatch and fixed-action overlap](evidence/05-recipe-serving-and-sticky-overlap.png)
- [Expiry calendar](evidence/06-expiry-calendar.png)
