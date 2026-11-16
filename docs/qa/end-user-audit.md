# Nấu Đại — Beta readiness audit và retest

**Ngày:** 16-11-2026
**Kết luận:** **NEEDS IMPROVEMENT — chưa đạt điều kiện BETA READY theo tiêu chuẩn của sprint.** Không đổi nhãn để che phần chưa kiểm thử.
**Môi trường retest:** production build Vite Preview `127.0.0.1:5174`, Chrome DevTools, browser context cô lập `beta-readiness-final`; mobile 393×852 và desktop 1440×1000 smoke. Tab user app ở 5173 không bị chạm localStorage. Không có CrUX/field user data.

## Phạm vi đã làm

Đọc lại audit gốc, CSV 15 issue, test matrix, before/after và ảnh evidence. Sửa shopping category/identity, canonical grouping của source cards, safety gate cho công thức có warning, deferred source catalogs và compact image manifest. Thêm/điều chỉnh regression tests. Tạo classification CSV cho Dinh dưỡng 2598 và nguồn liên quan, giữ toàn bộ recipe chưa được xác minh độc lập ở trạng thái review/missing.

## Kết quả hành trình thực tế

| Luồng | Kết quả | Evidence |
|---|---|---|
| Tủ lạnh → Khám phá/gợi ý | PASS một mẫu: thêm Trứng gà, Cà chua, Thịt heo; fridge catalog 8.236 nguyên liệu; gợi ý Canh cà chua trứng chỉ một canonical card. | Browser mobile retest; `tests/recommendation-engine.test.ts`. |
| Khám phá/search → chi tiết | PASS một mẫu: search “Canh cà chua trứng” cho 3 tên phù hợp, chỉ 1 exact-title card; nguồn Dinh dưỡng 2598 khác biệt truy cập qua detail. | Browser mobile snapshot; `tests/recipe-search-relevance.test.ts`. |
| Shopping | PASS CRUD mẫu: thêm từ recipe, thêm thủ công, category, sửa quantity, đánh dấu, xóa, reload. Nước mắm → Gia vị; hoa chuối/rau thơm → Rau củ; amount và checked state giữ sau reload. | [Screenshot category](evidence/beta-shopping-categories-mobile.png); `tests/shopping-list.test.ts`. |
| Recipe → Cooking | PASS với recipe nội bộ có hướng dẫn, hiển thị nhãn chưa xác minh; step/timer dùng được và cook step phục hồi sau reload. | Browser UI mobile; tests source detail/cook session. |
| Dinh dưỡng 2598 → Cooking | PASS safety check: variant có `instructions missing from detail` hiển thị warning, link nguồn và trạng thái không cookable; không còn CTA “Bắt đầu nấu”. | Browser snapshot trong test log; `tests/source-recipe-details.test.ts`. |
| Đã lưu | PARTIAL: favorite, recently viewed (cả variant nguồn), cooked list hoạt động và còn sau reload/route changes. Empty video state render đúng; video add/delete chưa chạy. | Browser snapshot; `docs/qa/test-matrix.md`. |
| Desktop | PARTIAL: Home, Explore, Saved, Shopping render và điều hướng ở 1440×1000; không chạy toàn bộ CRUD/recipe/cook desktop. | Browser smoke. |

Không xem browser automation là nghiên cứu người dùng thật. Không kiểm chứng native date picker, VoiceOver/TalkBack, mọi kích cỡ responsive hoặc mọi dữ liệu công thức.

## Ưu tiên và issue

- **P1 đã mitigation:** QA-05 cook safety gate, QA-08 catalog uncertainty. Bản ghi unverified/missing được gắn nhãn và không đi vào luồng nấu nếu có finding/warning.
- **P1 gốc QA-01:** lỗi alias/hàng hết hạn trong gợi ý đã fixed và có regression test.
- **P2 fixed:** QA-02 đơn vị tủ lạnh; QA-03 exact search; QA-04 cook session; QA-06 accessibility label/contrast; QA-09 duplicate Explore cards; QA-10 category shopping.
- **OPEN P2:** QA-07 Bún bò Huế còn dòng “Giá đậu xanh” lặp/variant khác nhau; cần người đối chiếu nguồn và lượng trước khi sửa data.
- **OPEN P2 / partial:** QA-11 hiệu năng đã giảm bundle và request đầu, nhưng field performance chưa có; QA-13 chưa full responsive matrix; QA-14 chưa video add/delete/close-browser; QA-15 native date picker blocked.
- **OPEN P3:** QA-12 Lighthouse discovery metadata (`robots.txt`, `llms.txt`, `ai-catalog.json`).

Trạng thái đầy đủ, repro, expected/actual: [usability-issues.csv](usability-issues.csv). Ma trận: [test-matrix.md](test-matrix.md). Thay đổi trước/sau: [before-after.md](before-after.md).

## Phân loại recipe data

File [recipe-quality-classification.csv](recipe-quality-classification.csv) gồm **5.056 record**:

| Nguồn | Tổng record | VERIFIED | NEEDS_REVIEW | SOURCE_MISSING | REJECTED |
|---|---:|---:|---:|---:|---:|
| Dinh dưỡng 2598 | 1.995 | 0 | 1.137 | 858 | 0 |
| Món Ngon Mỗi Ngày | 2.523 | 0 | 2.518 | 5 | 0 |
| Knorr Việt Nam | 535 | 0 | 535 | 0 | 0 |
| Copper / Cook the World | 3 | 0 | 3 | 0 | 0 |
| **Tổng** | **5.056** | **0** | **4.193** | **863** | **0** |

Các nhãn NEEDS_REVIEW/SOURCE_MISSING là sàng lọc dựa trên metadata/fields, không phải đánh giá chuyên gia. Không record nào được đánh dấu VERIFIED chỉ vì có hướng dẫn. Có thể có record hiển thị để tham khảo kèm cảnh báo; warning/finding chặn CTA nấu. Chưa rà toàn bộ catalog bằng người có chuyên môn và không tự tạo nguyên liệu/lượng/thời gian.

## Hiệu năng và quality gates

- Trước: entry JS 2,036.75KB minified / 378.97KB gzip; image manifest 2,830,647 bytes.
- Sau: entry JS **443.28KB / 125.04KB gzip** (giảm khoảng 78% gzip); compact manifest **803,151 bytes** (giảm khoảng 72% raw). Source ingredient chunk 1,599KB raw / 255KB gzip tải khi vào trang cần catalog lớn; Vite vẫn phát cảnh báo chunk >500KB.
- Home empty, sau hard reload: requests JSON quan sát được là image manifest 803,152 decoded bytes và canonical aliases 27,506 bytes; không tải MNNM/Knorr/DD fridge catalog cho Home rỗng.
- Chrome trace mobile local, 1x CPU/no network throttling: LCP **396ms**, CLS **0.00**. Đây là một lab sample; trace cũ trước thay đổi có LCP 4,456ms ở môi trường audit nhưng cùng app có cache/extension và điều kiện không tương đương; không tuyên bố mức giảm này là kết quả thực địa. CrUX không có dữ liệu.
- `npm test`: **122 pass / 0 fail**. `npx tsc -b`: pass. `npm run build`: pass; cảnh báo chunk nguồn lớn như trên.
- Lighthouse Home mobile sau fix: Accessibility **100**, Best Practices **100**, SEO **92**, Agentic Browsing **50**. Còn 3 discovery issues: robots.txt parser 26 errors, llms.txt thiếu H1, ai-catalog schema sai.
- **Lint BLOCKED:** repo không có lint script/config hay eslint/biome binary. Không cài package mạng trong sprint.

Evidence Lighthouse: [mobile HTML/JSON](lighthouse-mobile.html), [desktop HTML/JSON](lighthouse-desktop.html). Screenshots mới: [Home mobile](evidence/beta-home-mobile.png), [Shopping categories](evidence/beta-shopping-categories-mobile.png); ảnh audit gốc vẫn nằm trong `evidence/`.

## Quyết định Beta

**Chưa đánh dấu BETA READY.** Các luồng chính mobile được kiểm tra và lỗi phân nhóm shopping, trùng card đã sửa; nhưng tiêu chí “Đã lưu hoạt động đầy đủ” chưa đạt vì video saved CRUD chưa test, responsive desktop chỉ smoke chứ không full flow, native expiry picker chưa xác minh và lint chưa có toolchain. QA-07 còn vấn đề dữ liệu P2 ở Bún bò Huế. Không có P0 nào được phát hiện trong phạm vi đã thử; P1 cook safety được sửa và retest, QA-08 đã giảm thiểu bằng cảnh báo/chặn nấu nhưng vẫn cần review hàng đợi.

Trước khi đổi kết luận thành BETA READY, cần: (1) kiểm tra add/remove/persistence/deep-link cho video saved và favorite/history/cooked sau browser close/reopen; (2) hoàn thành responsive journey ở mobile/tablet/desktop; (3) quyết định/tạo lint gate; (4) tiếp tục xử lý QA-07 theo URL nguồn. Đây là phần chưa được browser-verified, không được coi là PASS.
