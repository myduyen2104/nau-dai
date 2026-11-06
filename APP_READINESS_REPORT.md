# APP READINESS REPORT

Audit date: 2026-11-05 (Asia/Ho_Chi_Minh)

## 1. Product overview

The repository is a React 18 + TypeScript + Vite client app with localStorage persistence and a static Vercel configuration. Source inspection and a browser session confirmed the fridge list, ingredient picker, quantity/unit and expiration/freshness controls, recommendation categories, recipe detail and ingredient status, Explore filters/search, dietary settings, local backup controls, trending links, and PWA shell. The browser pass directly exercised a fresh empty state, adding an egg, viewing recommendations, spoiled-food exclusion, vegetarian filtering, Explore search without diacritics (`pho bo`), and an ingredient-only Copper recipe detail. The egg remained present after a page reload.

No paid backend or AI API is required by package dependencies. Recipe data are bundled locally. The trending list starts empty; links can be stored locally. The app should be treated as a local-data beta, not a finished recipe authority.

## 2. Data audit

| Measure | Observed |
|---|---:|
| Internal ingredients | 113 |
| Internal recipes | 41 |
| Copper recipes imported | 3 |
| Total Explore items | 44 |
| Full instructions | 41 internal; none independently verified |
| Ingredients-only | 3 Copper entries |
| Catalog-only | 0 in current sources |
| Verified recipes | 0 |
| Recipes with measured ingredient quantities | 0 internal and 0 Copper |
| Copper terms / mapped | 32 / 23 |
| Copper recipe ingredient terms still unmapped | 10 across 3 recipes |

All internal recipe records have nonempty steps, source attribution identifying them as unverified internal recipes, valid ingredient references, and null quantities. The 3 Copper records are clearly `ingredients_only`, carry CC BY 4.0 attribution, and have no instructions or quantities. Existing `validate:dataset` passes. The general inventory has the declared category for each current record; deeper semantic review of all 113 ingredient names, aliases, units, and parent-child relations is not fully automated. Obvious supported aliases include thịt heo/lợn, dứa/thơm/khóm, rau mùi/ngò rí, đậu phụ/đậu hũ, and lạc/đậu phộng. Matching uses normalized exact aliases and avoids arbitrary substring matches.

Copper has unlinked names such as mixed herbs, bird's-eye chili, star anise, cinnamon stick, black cardamom, coriander seeds, cloves, and Thai basil. They remain visible by sourceName and are not silently mapped to a different ingredient. This reduces dietary-filter certainty for those records; they are not recommendation candidates because they lack cooking instructions.

The 41 internal recipes have simple, short methods but no quantities, serving baselines, independent verification, or recipe-level external citations. As a result, users cannot reliably scale portions, and instructions often use subjective seasoning language. The current collection covers some basic everyday dishes (egg/tomato, tofu, stir-fries, soups, noodles and rice) but is narrow for a Vietnamese household library.

## 3. Recommendation engine audit

`src/services/recommendationEngine.ts` is the production engine used by the app with the combined `libraryRecipes` source that also feeds Explore. Ingredient matching resolves exact normalized names and aliases; child-to-parent substitutions are explicitly constrained by method and compatibility rules. Required/main/seasoning/optional roles influence a deterministic weighted match percentage. Optional items are excluded from the required denominator. Expired, explicitly expired, and spoiled inventory is excluded. Quantity comparison handles compatible mass, volume, and count units and scales measured needs by servings. Dietary avoidance covers listed ingredients and selected metadata such as meat/seafood-containing seasonings. Sorting uses category, match coverage, missing count, score and stable Vietnamese name/ID tie breaks.

A correctness gap was fixed: result records now state quantity confidence as `sufficient`, `shortage`, or `unknown`, and cards explicitly say “Đủ loại nguyên liệu · chưa xác định đủ số lượng” for unmeasured recipes. The group label also says “Đủ loại · chưa rõ lượng”; preview text no longer implies that all amounts are sufficient. Quantity shortages are separated in the result. Copper entries without full instructions remain in Explore/Discover and never appear as ready-to-cook recipes.

Automated coverage includes empty stock, single/complete/missing inputs, seasoning-heavy false confidence, optional items, regional aliases, unaccented names, exact matching, constrained substitutions, quantity conversions and serving scaling, expiry/spoilage, urgency, vegan/vegetarian/seafood filters, cooking constraints, incomplete recipes, stable ordering, and 1,000-recipe ranking. Tests also include the actual internal plus Copper source data.

Known limits: the `ready` category means full instructions plus all required ingredient types, not measured quantity sufficiency; the UI now makes this distinction explicit. Quantity data are absent across the current recipe set. Urgency freshness is a user-entered date/status signal, not a food safety assessment. Safety cannot be inferred from date alone; app messaging advises discarding items marked spoiled and does not assert that non-expired food is safe.

## 4. Test results

Environment: local Vite development server (`http://localhost:5173`), isolated Chrome context; Node package scripts. No production deployment was performed.

- `npm test`: PASS, 44 tests across 5 test files.
- `npm run build`: PASS, TypeScript project build and Vite production bundling.
- `npm run validate:dataset`: PASS, 3 importable Copper recipes, 32 ingredient terms, 41 internal recipes.
- `npm run report:dataset`: PASS; unlicensed/permission-required sources remain excluded.
- Browser: PASS for empty state, ingredient add, recommendation explanation, reload persistence, spoiled ingredient exclusion, vegetarian filtering, Explore browse, no-diacritic search, and ingredient-only Copper detail/source attribution.
- Browser console: no runtime error after the corrected source was reloaded. During implementation an invalid JSX edit was caught by Vite HMR and immediately corrected; final build and browser reload passed.
- Mobile viewport widths 320, 375, 390, 768, and 1024px: NOT VERIFIED. DevTools could not resize the maximized browser window in this environment. CSS includes mobile and desktop breakpoints, but that is source evidence only.
- Full end-to-end backup download/import round trip: NOT VERIFIED in browser. Unit tests cover valid/invalid backup parsing and migration, and the controls are present.
- Real iPhone installation: NOT TESTED. Manifest, icon and service worker files are present; this does not establish native device installation or complete offline behavior.
- `npm ci` was not rerun because dependencies were already installed; no dependency changes were made.

## 5. UI/UX, accessibility and PWA

The observed desktop browser view exposes labeled buttons, inputs and comboboxes. Recipe detail distinguishes missing instructions and missing quantities, shows Copper source attribution, and does not fabricate cooking steps. PWA metadata include a manifest, SVG icon and service worker with a small shell cache and navigation fallback. PWA files were inspected, but install flow and offline interactions were not exhaustively exercised. Mobile behavior and a formal screen-reader/accessibility audit remain unverified. Image URLs point at Wikimedia Commons with an emoji fallback, so image availability depends on the network.

## 6. Product readiness score

Scores use the requested weights. Unverified criteria are excluded from the weighted denominator; this is not a complete score.

| Criterion | Weight | Score | Evidence |
|---|---:|---:|---|
| Fridge management usability | 10% | 7/10 | Browser add, edit fields, spoiled state, reload persistence observed |
| Recommendation accuracy | 20% | 7/10 | Engine unit coverage and browser checks; quantity absence limits confidence |
| Recipe variety | 15% | 4/10 | Only 41 unverified internal recipes and 3 ingredient-only entries |
| Cooking instruction quality | 15% | 4/10 | Internal steps exist but are brief, unverified, and often subjective |
| Quantity accuracy | 10% | 1/10 | No recipe measurements in current internal or Copper data |
| UI and UX | 10% | 6/10 | Desktop flows observed; target mobile widths not verified |
| Persistence and backup | 5% | 6/10 | localStorage persistence observed; parser tested; browser round trip not verified |
| Performance | 5% | 7/10 | 1,000 recipe deterministic unit fixture completes in ~11 ms in test runtime; no field/device benchmark |
| Stability | 5% | 8/10 | Build, 44 unit tests, dataset validation pass; limited browser flows pass |
| Safety and data transparency | 5% | 7/10 | Spoiled exclusion, unverified/source labels and Copper attribution present; no verified food-safety/recipe authority |

Weighted total among the 10 criteria with provisional evidence: **5.2/10** (100% included, but several scores are based on limited local evidence). This score is not evidence of production readiness.

## 7. Conclusion

**PROTOTYPE**

The app supports useful local inventory tracking and deterministic recipe discovery, and the core recommendation flow is coherent. It is not yet suitable to rely on daily as a trusted cooking guide: all internal recipes are unverified and lack quantities; Copper only provides ingredient lists; search coverage is limited; and mobile, complete backup round trip, offline mode and physical-device installation are not fully verified. There is no confirmed indication of a paid runtime requirement.

## 8. Remaining work

### P0

- None identified in the verified code paths.

### P1

- Obtain reviewed, redistributable Vietnamese recipes with reliable measurements, serving sizes, clear method steps, and source/verification metadata before positioning the app as a dependable daily recipe guide.
- Complete mobile viewport checks and browser backup import/export round-trip before beta distribution.

### P2

- Map or retain source labels for the 10 unmapped Copper ingredient terms with clearer Vietnamese presentation, only where the mapping is unambiguous.
- Perform a formal accessibility and offline/PWA audit on supported mobile devices.

## 9. Source changes and validation

- `src/services/recommendationEngine.ts`: returned explicit quantity confidence status.
- `src/main.tsx`: clarifies quantity status in preview/card UI and in the ready group label.
- `tests/recommendation-engine.test.ts`: added regression coverage for quantity confidence, spoiled/urgent incomplete recipes, unrelated meat cuts, and avoidance aliases.
- `APP_READINESS_REPORT.md`: this evidence-based readiness assessment.

Final validation: build PASS; 44/44 unit tests PASS; dataset validation PASS. No cloud service, paid API, or production deployment was added.
