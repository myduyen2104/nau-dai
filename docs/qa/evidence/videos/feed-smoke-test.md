# Video feed browser smoke test

Date: 2026-11-16 (Asia/Ho_Chi_Minh)

## Scope

Local Vite app at `http://127.0.0.1:5173/?page=trending`. The catalog available for this test contained 14 legacy video entries. They are explicitly marked `needs_review` and `availabilityStatus: unknown`; this run did not establish current embeddability or validate a fresh YouTube API sync.

## Browser scenarios

- Mobile viewport 390 × 844: opened the separate Video page, scrolled through all 14 entries, confirmed 14 unique video IDs, one active embedded player, bottom navigation visible, and no horizontal overflow.
- Desktop viewport 1440 × 900: repeated the feed scroll, uniqueness, player, navigation and overflow checks. Player/footer layout stayed within the viewport.
- Started playback and confirmed watch activity was recorded. Reloaded and confirmed a saved video remained saved; removed the test save afterwards.
- Used “Xóa lịch sử xem” and confirmed watch history was cleared.
- Reloaded the feed and confirmed session ordering changed.
- Browser console showed no video-feed or React DOM errors after the player element fix. One unrelated existing `navigator.vibrate` warning comes from the cooking timer UI.

## Evidence

- `feed-mobile-390.png`
- `feed-desktop-1440.png`

## Automated checks

- `npm test`: 136 passed, 0 failed.
- `npm run build`: passed. Existing Vite warning remains for the 1.6 MB minified `source-ingredients` chunk.
- `git diff --check`: passed.
- `dist/data/youtube/catalog.json` was present in the build; no `YOUTUBE_API_KEY` string was found in `dist`.
- Live `npm run sync:youtube` was not possible because this local environment has no `YOUTUBE_API_KEY`. No live API requests were made by this test.

## Blockers and limits

At the time of this test, the real catalog refresh and the 100-video scroll scenario were unverified; the test fixture had 14 entries. The catalog file is committed to Git, so `no-store` HTTP headers and client-side freshness checks do not erase old metadata from Git history. Keep this limitation attached to the 2026-11-16 test rather than treating it as a current production measurement.

## Production catalog check — 2026-11-23

Read-only check of `https://naudaidi.vercel.app/data/youtube/catalog.json` returned HTTP 200. The catalog had `updatedAt: 2026-11-22T09:48:03.721Z` and 374 records: 239 `accepted` and 135 `needs_review`. This confirms the production data endpoint and snapshot count only; it does not retest every video, measure playback success, or repeat the 100-video scroll scenario. Vercel's deployment list showed production on commit `61b5e44` (`chore: refresh YouTube cooking video catalog`).
