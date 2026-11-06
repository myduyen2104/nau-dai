# Design Review Report — Fresh

**Date:** 2026-11-06  
**Scope:** UI/UX redesign and interactive browser QA of the current React + TypeScript + Vite app.

## Summary

The app now opens on a dedicated “Hôm nay” dashboard, with separate destinations for Tủ lạnh, Tìm món, Khám phá and Đã lưu. The visual system uses a warm neutral background, fresh green surfaces, orange urgency cues, consistent cards, touch-sized controls and a compact mobile navigation. Personal counts, pantry status and suggestions use the existing local data and recommendation engine. No recipe database entries were changed and no JSON backup prompt/feature was added.

The redesign improves the task flow and mobile layout, but the app is **not production-ready**: 41 current recipes are internal and unverified, current recipe data does not support reliable serving quantity calculations, and local browser QA does not replace domain review or testing with real users.

## Before and after screenshots

Screenshots were captured in a separate browser storage context. The seeded after screenshots contain only temporary QA data (chicken, carrot, sweet potato); they do not come from the user's normal browser storage.

| Page / viewport | Before | After |
|---|---|---|
| Home, 390 px | [Before](qa-artifacts/redesign-before/redesign-before-home-390.png) | [After, seeded](qa-artifacts/redesign-after/redesign-after-home-seeded-390.png) |
| Home, 320 px | — | [After](qa-artifacts/redesign-after/redesign-after-home-320.png) |
| Home, 375 px | — | [After](qa-artifacts/redesign-after/redesign-after-home-375.png) |
| Home, 390 px | — | [After](qa-artifacts/redesign-after/redesign-after-home-390.png) |
| Home, 768 px | — | [After](qa-artifacts/redesign-after/redesign-after-home-768.png) |
| Home, 1440 px | [Before](qa-artifacts/redesign-before/redesign-before-home-1440.png) | [After](qa-artifacts/redesign-after/redesign-after-home-1440.png) |
| Fridge, 390 px | — | [After](qa-artifacts/redesign-after/redesign-after-fridge-390.png) |
| Find recipes, 390 px | [Before](qa-artifacts/redesign-before/redesign-before-recipes-390.png) | [After](qa-artifacts/redesign-after/redesign-after-recipes-390.png) |
| Explore, 390 px | [Before](qa-artifacts/redesign-before/redesign-before-explore-390.png) | [After](qa-artifacts/redesign-after/redesign-after-explore-390.png) |
| Hot videos, 390 px | [Before](qa-artifacts/redesign-before/redesign-before-trending-390.png) | Available from Explore; empty/source state checked in browser |
| Saved, 390 px | [Before](qa-artifacts/redesign-before/redesign-before-favorites-390.png) | [After](qa-artifacts/redesign-after/redesign-after-saved-390.png) |
| Preferences, 390 px | [Before](qa-artifacts/redesign-before/redesign-before-settings-390.png) | [After](qa-artifacts/redesign-after/redesign-after-settings-390.png) |
| Recipe detail, 390 px | — | [After](qa-artifacts/redesign-after/redesign-after-detail-390.png) |

## Changes made

- Added a dedicated home dashboard with time-aware greeting, real pantry counts, upcoming-expiry items, recipe suggestions based on current stock, category shortcuts, and a route into trending videos.
- Split pantry management from Home and exposed five primary destinations in mobile navigation. Hot videos remain reachable from Explore.
- Replaced random remote ingredient images with local emoji markers, avoiding mismatched or unavailable imagery.
- Reworked the visual tokens, responsive layouts, cards, controls, empty states, focus rings and bottom navigation.
- Fixed Explore category chips to scroll horizontally rather than force page overflow.
- Fixed recipe instruction buttons that had fallen back to browser-default styling due to their class name not including `step`.
- Corrected recommendation card title semantics so Lighthouse no longer reports an H1-to-H3 heading-order skip on the Home page.
- Localized page metadata and the PWA manifest.
- Kept recommendation, expiry, substitution, favorites, recently viewed and cooked-history data flows. No recipe dataset changes or JSON backup feature were introduced.

## Browser journey exercised

- Opened Home with an empty pantry, then with three QA ingredients; checked actual counts, soon-to-use item, recommendation tabs and suggestion content.
- Opened a conditional substitution suggestion for “Canh gà rau củ”; confirmed the missing ingredient, “Khoai lang” alternative, taste/texture caveats, source links, no invented conversion amount, and “Chọn cho kế hoạch” state update.
- Visited Tủ lạnh and confirmed editing controls and the QA quantity/expiry state.
- Opened Explore, checked the 44-item count and recipe data-status wording, and opened the Món hot page. The trends page accurately reported no source entries rather than inventing trends.
- Visited Saved and confirmed recently viewed history was written and appeared in the list.
- Visited Preferences and confirmed diet/preparation filters and servings preference are visible.
- Used browser screenshots to catch and fix horizontal category overflow, default-styled step buttons, and heading order.
- Browser console had no errors or warnings on the tested page.

## Responsive measurements

Measured `document.documentElement.scrollWidth`, `main` scroll dimensions and navigation placement in browser emulation:

| Viewport | Document width | Main scroll/client height | Content/nav relationship |
|---:|---:|---:|---|
| 320 × 640 | 320 px | 1611 / 506 px | Main ends at nav start (568 px); vertical content scrolls |
| 375 × 812 | 375 px | 1636 / 678 px | Main ends at nav start (740 px); vertical content scrolls |
| 390 × 844 | No horizontal overflow observed | Mobile layout | Mobile route screenshots captured |
| 768 × 1024 | 753 px (15 px scrollbar) | 1412 / 1412 px | Desktop/tablet flow; no horizontal overflow |
| 1440 × 900 | 1425 px (15 px scrollbar) | 1365 / 1365 px | Desktop layout; no horizontal overflow |

## Verification

- `npm test` — passed, 8 test files / 8 passed.
- `npm run validate:dataset` — passed: 3 imported recipes allowed, 32 source terms, 41 internal recipes.
- `npm run validate:substitutions` — passed: 7 substitution rules (7 verified, 7 conditional), 132 ingredient IDs, 44 recipe IDs.
- `npm run build` — passed (`tsc -b` and Vite production build).
- Mobile Lighthouse snapshot on Home — Accessibility 100, Best Practices 100, SEO 80. Accessibility findings from the earlier pass (heading order) were corrected and the final Home snapshot reported no accessibility audit failures. Lighthouse reported `robots.txt`, `llms.txt` and `ai-catalog.json` discovery-related issues; these are not indicators of cooking content quality. A Lighthouse score alone is not a WCAG conformance claim.

## Remaining limits and readiness

- 41 recipes are internal and have not been independently verified. Three Copper entries have ingredient lists but no cooking instructions; they remain visibly labelled and are not presented as complete recipes.
- Current recipe ingredient records generally lack measured amounts and trusted base servings. The app correctly reports “Chưa có định lượng để điều chỉnh khẩu phần” rather than fabricating quantities. Solving this needs curated recipe data, not a presentation-only code change.
- Substitutions remain conditional cooking suggestions. They are not safe allergy determinations; users are told to check ingredients/labels and cross-contact risks.
- Trending content has no populated source data in this test environment; its empty state and user-saved links remain available.
- Storage remains browser-local. There is no cloud sync. No JSON backup prompt was restored, per the user's earlier instruction.
- Screenshots at 390 px cover the primary app routes and detail; Home was additionally checked at 320, 375, 768 and 1440 px. This does not constitute device-lab testing or comprehensive assistive-technology verification.

**Readiness decision:** Improved for a local prototype and user-flow demonstration; **not production-ready** until recipe content is reviewed and serving quantities are supported by reliable data, and a broader accessibility/user validation pass is completed.
