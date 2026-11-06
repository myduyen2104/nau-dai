# Báo cáo tự kiểm thử app nấu ăn

**Cập nhật:** 06/11/2026  
**Môi trường:** `http://localhost:5173/`, Chromium, dữ liệu test trong browser context cô lập.

## Kết luận sau sửa

**SHIP WITH FIXES; chưa production ready.** Các hạn chế trong luồng tránh nguyên liệu, lịch sử xem, khả năng điều chỉnh khẩu phần và các lỗi tương phản đã được xử lý ở giao diện/code. Browser regression xác nhận lọc nguyên liệu và gợi ý thay thế phản hồi đúng. Tuy vậy toàn bộ 44 món hiện có vẫn thiếu định lượng và số phần gốc, vì vậy tính toán khẩu phần chưa thể phát huy trên dữ liệu thật. Nội dung công thức cũng chưa được xác minh độc lập.

Theo yêu cầu mới nhất, mục xuất/nhập JSON đã được gỡ khỏi Cài đặt; dữ liệu tiếp tục lưu trên trình duyệt hiện tại, không đồng bộ hay sao lưu ra tệp.

## Các phát hiện cũ và kết quả

| Phát hiện | Kết quả hiện tại |
|---|---|
| Chỉ hiện khoảng 24 nguyên liệu cần tránh | Đã sửa: tìm toàn bộ 132 nguyên liệu trong database theo tên/alias, không dấu; hỗ trợ nguyên liệu tự tạo đang có trong tủ và hiển thị lựa chọn thành chip bỏ riêng. |
| Bộ lọc tránh có thể bỏ sót tên biến thể/quan hệ cha-con | Đã sửa: alias và tên vùng miền được chuẩn hóa về ID; khi chọn nguyên liệu cha, các món dùng con bị loại; chọn nguyên liệu con cũng loại công thức dùng tên cha. Test riêng xác nhận. |
| Có thể hiểu tùy chọn tránh là đảm bảo dị ứng | Đã làm rõ trên giao diện rằng đây không phải công cụ xác nhận dị ứng/nhiễm chéo; chi tiết món và thay thế cũng yêu cầu tự kiểm tra thành phần khi có dị ứng. Nhãn “nguyên liệu an toàn” đổi thành “nguyên liệu còn dùng được”. |
| Lịch sử xem chỉ lưu, không xem lại | Đã sửa: “Đã xem gần đây” trong Đã lưu, mới nhất trước, mở lại đúng món. Xem lại không tạo ID trùng; ID món đã bị xóa khỏi database được ẩn; trạng thái rỗng và nút xóa có xác nhận. Xóa lịch sử không xóa “Món đã nấu”. |
| Số khẩu phần chưa tác động lên dữ liệu | Hỗ trợ phép điều chỉnh khi có lượng, đơn vị được hỗ trợ và số phần gốc; hiển thị tối đa 2 chữ số, không chỉnh sửa recipe gốc. Thiếu lượng/phần gốc/đơn vị hỗ trợ thì không nhân/chia và ghi rõ “Chưa có định lượng để điều chỉnh khẩu phần”. Hiện 44/44 recipe đều thiếu lượng và số phần gốc, nên đây vẫn là giới hạn dữ liệu. |
| Bốn vị trí chữ độ tương phản thấp | Đã tăng tương phản nhãn, mô tả và trạng thái trong hero, empty suggestion; lần Lighthouse sau sửa không còn cảnh báo màu tương phản. Audit cũng phát hiện thêm chữ điều khiển tủ lạnh thiếu tương phản; đã chỉnh tiếp. |
| Nút tim luôn báo “Lưu yêu thích” | Đã sửa: đổi nhãn theo trạng thái và phát `aria-pressed`. |
| Các nút JSON cứ nằm trong Cài đặt | Đã gỡ toàn bộ giao diện và mã xuất/nhập JSON theo yêu cầu. App tiếp tục lưu localStorage trên thiết bị; nếu xóa dữ liệu trình duyệt hoặc đổi thiết bị, dữ liệu không có bản sao khôi phục. |

## Regression đã chạy

- Thêm cà rốt qua tìm kiếm tên không dấu; chỉnh số lượng từ 2 lên 3 và xác nhận localStorage cập nhật.
- Thêm nguyên liệu tự tạo “nấm bào ngư”; tìm tên không dấu trong phần tránh, chọn và xác nhận ID được lưu.
- Chọn tránh cà rốt; trang Tìm món không còn gợi ý món chứa cà rốt.
- Chọn alias “thit lon”; danh sách hiển thị Thịt heo. Test unit bao gồm alias, ID custom và quan hệ cha-con.
- Seed gà, cà rốt, khoai lang trong phiên test; nhóm “Có thể thay” đưa Canh gà rau củ. Chi tiết nêu khoai lang là lựa chọn có điều kiện, ảnh hưởng vị/kết cấu và không tự đổi tỷ lệ; thao tác “Chọn cho kế hoạch” đổi trạng thái.
- Mở món, yêu thích và xem lại trong Đã lưu; nút tim báo “Bỏ yêu thích”. Đánh dấu món đã nấu vẫn giữ riêng với lịch sử xem. Nút xóa lịch sử có hộp xác nhận.
- Trước khi gỡ theo yêu cầu mới, đã kiểm tra thử xuất/nhập JSON hợp lệ trong phiên cô lập; phiên bản cuối đã xóa hẳn khả năng này khỏi UI và production code, nên không còn luồng sao lưu JSON để regression.
- Responsive kiểm tra ở 320×640, 393×852, 768×1024 và 1440×900; `scrollWidth` không vượt chiều rộng cửa sổ. Ở desktop, chênh lệch 15px do scrollbar dọc.
- Ảnh giao diện mobile Cài đặt: [qa-artifacts/fresh-settings-mobile.png](qa-artifacts/fresh-settings-mobile.png).

## Accessibility và giao diện

Lighthouse snapshot sau khi sửa đạt **Accessibility 100, Best Practices 100** trên màn Cài đặt mobile (393×852). Audit trên màn chính cũng đạt Accessibility 100 sau khi sửa contrast các điều khiển tồn kho. Trước đó audit Cài đặt phát hiện thứ tự heading nhảy từ H1 sang H3; đã chuyển tiêu đề nhóm sang H2 và audit lại được 100.

Đây là kiểm tra tự động trên một số trạng thái giao diện, không phải chứng nhận WCAG. Chưa hoàn tất rà soát thủ công bằng screen reader. App hiện không có dark mode theo `prefers-color-scheme`, nên không có dark mode để kiểm thử.

Lighthouse còn báo SEO 80 và Agentic Browsing 33 do `robots.txt`, `llms.txt` và `ai-catalog.json`; đây không ảnh hưởng luồng nấu ăn nhưng chưa xử lý trong phạm vi này.

## File đã thay đổi

- `src/main.tsx`, `src/style.css`: tìm/chọn tránh nguyên liệu, lịch sử xem, trạng thái yêu thích, khẩu phần và contrast; gỡ sao lưu JSON.
- `src/services/recommendationEngine.ts`, `src/utils/ingredientMatcher.ts`: khớp alias/custom và quan hệ nguyên liệu cha-con.
- `src/utils/recipeHistory.ts`, `src/utils/servings.ts`: helper mới, kèm test.
- Tests recommendation, history, servings, recipe data và security/storage được cập nhật.
- `src/utils/backup.ts` đã xóa vì chức năng JSON không còn trong sản phẩm.

## Kiểm tra kỹ thuật

- `npm test` — đạt, 8 test files.
- `npm run validate:dataset` — đạt: 3 món nhập được phép, 32 term nguồn, 41 công thức nội bộ.
- `npm run validate:substitutions` — đạt: 7 quy tắc, 132 ingredient IDs, 44 recipe IDs.
- `npm run build` — đạt (`tsc -b` và Vite production build).

## Hạn chế còn lại

- Dataset có 41 công thức nội bộ và 3 mục Copper; tất cả đều chưa có định lượng/số phần gốc. Không thể kiểm chứng khẩu phần thực tế hoặc độ đủ lượng của món hiện có; không tự bịa lượng.
- Nội dung công thức nội bộ chưa xác minh độc lập; tính chính xác nấu ăn/dinh dưỡng không được kiểm định toàn diện ở QA này.
- Tránh nguyên liệu chỉ lọc theo thông tin nguyên liệu mà recipe khai báo. Danh sách tránh không thể xác nhận nhiễm chéo hay an toàn dị ứng.
- Dữ liệu chỉ ở localStorage sau khi bỏ xuất/nhập JSON; đổi trình duyệt/thiết bị hoặc xóa site data sẽ mất dữ liệu.
- Trang Món hot chưa có feed xu hướng; vẫn báo trạng thái trống.
- Không có screenshot baseline để đánh giá pixel regression.
