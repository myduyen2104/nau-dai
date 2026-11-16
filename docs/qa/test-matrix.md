# Ma trận kiểm thử Nấu Đại — Beta readiness retest

**Ngày:** 16-11-2026. **Build:** production `vite preview` trên `127.0.0.1:5174`; Chrome DevTools; browser context cô lập `beta-readiness-final`. Không đụng localStorage tab thật cổng 5173. Persona là kịch bản QA, không phải nghiên cứu người dùng.

## Hành trình

| Persona | Luồng | Kết quả | Bằng chứng / phạm vi |
|---|---|---|---|
| A — Người mới | Hôm nay → Khám phá → tìm Canh cà chua trứng → chi tiết → bắt đầu nấu nội bộ | PASS | Mobile 393×852; đúng một card canonical, chi tiết có cảnh báo “chưa xác minh độc lập”, bước nấu mở được. |
| B — Mua sắm | Thêm món vào sổ → sửa lượng → đánh dấu → xóa → refresh | PASS | Mobile UI: nước mắm vào Gia vị; hoa chuối/rau thơm vào Rau củ; sửa lượng giữ qua reload; dấu mua giữ qua reload; xóa hoạt động. |
| C — Gợi ý từ tủ lạnh | Thêm trứng/cà chua/thịt heo → gợi ý → khám phá | PASS | Kịch bản audit trước đây và test regression; tủ lạnh nạp 8.236 nguyên liệu. Exact-title recommendations hiển thị một card. |
| D — Công thức nguồn | Mở variant Dinh dưỡng 2598 có warning → thử nấu | PASS | Warning hiển thị; CTA Bắt đầu nấu vắng mặt; thông báo “Nguồn còn cảnh báo dữ liệu nên chưa thể bắt đầu nấu” và link nguồn hiện rõ. |
| E — Đang nấu | Bắt đầu món nội bộ → đặt timer 1 phút → qua bước → reload | PASS | Timer hiện 01:00, bước 2 còn đúng sau reload. Không suy diễn thời lượng nếu nguồn không nêu. |
| F — Đã lưu | Favorite → mở variant nguồn → đã nấu → rời trang/reload → xem saved | PARTIAL | Favorite 1, lịch sử 2 (cả variant Dinh dưỡng), món đã nấu 1 vẫn hiện sau reload. Video empty state có; tạo/xóa video lưu chưa kiểm thử. |
| Desktop smoke | Home → Explore → Saved → Shopping trên 1440×1000 | PARTIAL | Route/controls render; document width không vượt viewport khi đo. Không chạy CRUD đầy đủ desktop. |

## Tính năng, regression, quality gates

| ID | Kiểm tra | Kết quả | Ghi chú |
|---|---|---|---|
| T01 | Home empty state, navigation | PASS | Browser production preview; không có dữ liệu nguồn recipe dư tải ở Home. |
| T02 | Tủ lạnh add/default units | PASS | Audit/browser test trước: trứng quả, cà chua quả, thịt heo g. |
| T03 | Alias không tạo tồn kho trùng | PASS | Regression test + browser retest ở audit. |
| T04 | Hỏng/hết hạn không được gợi ý là còn dùng | PASS | `recommendation-engine` regression suite. |
| T05 | Hạn dùng native date picker + persistence | BLOCKED | Automation không chứng minh được chọn và lưu ngày native. |
| T06 | Search exact title/variant dedupe | PASS | Tìm “Canh cà chua trứng”: một canonical card, hai tên riêng khác vẫn giữ; nguồn Dinhduong ở detail. |
| T07 | Filter, browser back, recipe deep link | PARTIAL | Search và nav routes được dùng; chưa kiểm thử mọi filter/back; không có deep-link recipe riêng được xác nhận. |
| T08 | Warning recipe cook gate | PASS | Warning/finding chặn CTA nấu; source link thay thế. |
| T09 | Shopping CRUD + persistence | PASS | Add, edit, check, delete, recipe-derived additions và reload đã kiểm tra ở mobile. |
| T10 | Shopping category/identity | PASS | Nước mắm → Gia vị; hoa chuối/rau thơm → Rau củ; unit tests giữ nguyên nguyên liệu khác nhau. |
| T11 | Cook step/timer | PASS | Bước và timer sử dụng được; nguồn nội bộ luôn gắn nhãn chưa xác minh. |
| T12 | Cook session restore | PASS | Sau reload ở step 2 vẫn còn món/bước; test trước cũng xác nhận timer deadline. |
| T13 | Favorites/history/cooked/video saved | PARTIAL | Favorite, lịch sử, cooked và empty-video UI chạy; chưa lưu/xóa video thật hoặc test browser đóng/mở hoàn toàn. |
| T14 | Responsive overflow | PASS sampled | Mobile width 393: scrollWidth 393. Desktop smoke 1440: content width không vượt viewport. Các width 360/430/768 chưa retest sprint này. |
| T15 | Reduced motion/dark mode | BLOCKED | Chưa audit toàn app; dark mode chưa biết có nằm trong product scope. |
| T16 | Keyboard/screen reader thực | BLOCKED | Chưa test VoiceOver/TalkBack/keyboard-only. |
| T17 | Lighthouse accessibility/best practices | PASS | Home mobile navigation audit sau sửa: 100/100 và 100/100. |
| T18 | Lighthouse SEO/agent discovery | OPEN P3 | Mobile/desktop: SEO 92; Agentic Browsing 50. Còn robots.txt (26 parse errors), llms.txt thiếu H1, ai-catalog schema invalid. |
| T19 | Unit/regression | PASS | `npm test`: 122 pass / 0 fail. |
| T20 | Typecheck/build | PASS | `npx tsc -b`, `npm run build` đều pass; Vite vẫn cảnh báo dynamic source-ingredients chunk >500KB. |
| T21 | Lint | BLOCKED | Không có lint script/config hoặc eslint/biome binary trong repo/dependencies; không cài thêm package. |
| T22 | Performance | PASS lab / field unknown | Main JS 443.28KB minified/125.04KB gzip; runtime image manifest 803,151B (trước 2,830,647B); Home resource requests chỉ main JS, compact manifest, canonical aliases. Trace mobile Home LCP 396ms, CLS 0.00, 1x CPU/no network throttling; CrUX/field n/a. |

## Screenshots/logs

- [Mobile Home](evidence/beta-home-mobile.png)
- [Shopping category groups](evidence/beta-shopping-categories-mobile.png)
- [Mobile Lighthouse report](lighthouse-mobile.html) · [JSON](lighthouse-mobile.json)
- [Desktop Lighthouse report](lighthouse-desktop.html) · [JSON](lighthouse-desktop.json)
- [Recipe classification](recipe-quality-classification.csv)
- Original audit screenshots remain in [evidence/](evidence/).

## Kết luận kiểm thử

P0/P1 lỗi sản phẩm đã nhận diện trong luồng đã retest được xử lý hoặc giảm thiểu: recipe source warnings chặn nấu, danh sách mua nhóm lại, duplicate title được canonicalize. Tuy nhiên video saved CRUD, native expiry picker, lint toolchain và một phần responsive matrix còn chưa kiểm chứng. Kết luận phát hành tổng thể xem [end-user-audit.md](end-user-audit.md).
