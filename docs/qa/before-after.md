# Nấu Đại — kết quả trước/sau Beta readiness sprint

**Ngày:** 16-11-2026. Retest trên production build trong Chrome context tách biệt, không sửa storage của tab app thật. Ảnh test: [evidence/](evidence/); kết quả audit đầy đủ: [end-user-audit.md](end-user-audit.md).

| Phát hiện trước | Thay đổi | Kết quả retest |
|---|---|---|
| Custom ingredient alias tạo tồn kho trùng và có thể làm item hỏng lọt vào gợi ý. | Resolve alias rõ ràng về canonical identity; recommendation matcher xét mọi dòng cùng ingredient ID. | Regression test pass; browser test trước đó không tăng lượng khi alias đã có; món có trứng hỏng không được tính còn nguyên liệu. |
| Đơn vị mặc định không tự nhiên. | Merge default units từ core catalog. | Trứng/cà chua/thịt heo lần lượt dùng quả/quả/g; regression test pass. |
| Search tên chính xác bị kết quả tương tự chen trước. | Sắp xếp exact/title match trước ưu tiên nguồn. | Search Bún bò Huế exact được ưu tiên; regression suite pass. |
| “Canh cà chua trứng” xuất hiện thành hai card từ hai nguồn. | Group canonical theo title chuẩn hóa; bỏ bản copy cùng nguồn/cùng ingredient signature; giữ variant có nghĩa trong chi tiết. | Mobile browser search cho 1 canonical card; Dinh dưỡng 2598 4 nguyên liệu là lựa chọn trong detail. |
| Dinh dưỡng 2598 record có status auto-complete nhưng warnings/finding vẫn có thể cho CTA nấu. | Cook gate yêu cầu không warnings, integrity findings hoặc instruction review needs_review; hiển thị cảnh báo và link nguồn. | Production browser mở variant có `instructions missing from detail`: CTA nấu vắng mặt, warning rõ; regression test pass. |
| Sổ đi chợ phân loại nước mắm vào Hải sản, hoa chuối/rau thơm vào Trái cây. | Alias-aware identity/category mapping chính xác; không fuzzy merge hai nguyên liệu khác tên. | Browser thêm nước mắm → Gia vị, hoa chuối và rau thơm → Rau củ. Thêm/sửa lượng/đánh dấu/xóa/refresh đều chạy. |
| Shopping/cook session persistence chưa chắc. | Local persistence cho list và cooking timer deadline/step. | Mobile browser: edited amount và bought state giữ sau reload; cook step 2 phục hồi đúng sau reload. |
| Card mâm cơm có aria-label khác text hiển thị. | Bỏ aria-label override dư, để accessible name lấy từ nội dung nút. | Lighthouse mobile sau fix: Accessibility 100; label-content-name-mismatch không còn trong report mới. |
| Main JS 2,036.75KB/378.97KB gzip; image manifest 2,830,647B. Empty Home tải nhiều catalog nguồn. | Lazy-load source ingredients/index và sinh compact public image manifest; gate MNNM/Knorr/DD index theo trang/có stock. | Main JS 443.28KB/125.04KB gzip (giảm ~78% gzip); manifest 803,151B (giảm ~72% raw); Home requests chỉ manifest 803KB + canonical aliases 27.5KB ngoài HTML/CSS/JS. LCP trace 396ms/CLS0 trên local lab, không có field data. |
| Audit trước chưa có classification nhất quán và có nguy cơ coi cờ `has_instructions` là xác minh. | Tạo `recipe-quality-classification.csv`, chỉ cấp VERIFIED khi status nguồn thực sự verified; cờ completeness không tự xác minh nội dung. | 5.056 records: 4.193 NEEDS_REVIEW, 863 SOURCE_MISSING, 0 VERIFIED, 0 REJECTED. Dinh dưỡng 2598 vẫn còn warning và bị chặn nấu. |

## Chưa đóng

- Bún bò Huế Dinh dưỡng 2598 còn duplicate ingredient row “Giá đậu xanh” và các variant khác nhau; không sửa định lượng hoặc gộp hàng loạt nếu chưa kiểm tra nguồn.
- Toàn bộ nguồn chưa được người duyệt nội dung. Classification là triage, không chứng nhận recipe.
- Saved favorite/history/cooked đã kiểm thử qua route và reload; thao tác tạo/xóa video saved chưa xong.
- Native expiry picker chưa được automation xác nhận; test thiết bị thật còn cần.
- Lint chưa cấu hình/cài đặt. Build vẫn cảnh báo `source-ingredients` chunk lớn 1,599KB raw/255KB gzip; tải theo nhu cầu nhưng thao tác khám phá/tủ lạnh sẽ tải chunk này.
- Lighthouse SEO 92 và Agentic 50: robots.txt malformed (26 errors), llms.txt chưa H1, ai-catalog schema invalid. Đây là P3 discovery; chưa ảnh hưởng luồng app được test.

Xem trạng thái issue trong [usability-issues.csv](usability-issues.csv), ma trận thực thi trong [test-matrix.md](test-matrix.md).
