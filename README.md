# What's in My Fridge?

Ứng dụng React + TypeScript + Vite gợi ý món dựa trên nguyên liệu lưu cục bộ trong trình duyệt. Core app và dữ liệu công thức không cần backend hoặc API key.

## Chạy local

Yêu cầu Node.js 22.6 trở lên.

```bash
npm ci
npm run dev
```

## Kiểm tra dữ liệu và build

```bash
npm test
npm run validate:recipes
npm run build
```

Các công thức hiện có được gắn nhãn nội bộ, chưa xác minh độc lập. Định lượng chưa có nguồn xác thực sẽ hiển thị là chưa có; không coi trạng thái “đủ nguyên liệu” là đủ số lượng.

## Triển khai Vercel

Import repository vào Vercel, chọn preset Vite hoặc dùng cấu hình trong `vercel.json`:

- Build command: `npm run build`
- Output directory: `dist`
- Không cần environment variable để chạy tính năng tủ lạnh và gợi ý.

## Đồng bộ video YouTube (tùy chọn)

1. Tạo project trong Google Cloud Console và bật **YouTube Data API v3**.
2. Tạo API key. Hạn chế key chỉ cho YouTube Data API v3; GitHub-hosted runner dùng IP thay đổi nên không giới hạn theo một IP cố định.
3. Trong repository GitHub, vào **Settings → Secrets and variables → Actions**, tạo secret `YOUTUBE_API_KEY`.
4. Mở **Actions → Update YouTube food videos → Run workflow** để chạy thử. Workflow sau đó chạy hằng ngày.

Key chỉ dùng trong GitHub Actions, không đặt trong biến `VITE_*` hay source frontend. Script chạy 8 truy vấn tìm kiếm (mỗi truy vấn dùng quota YouTube đáng kể) và lấy statistics cho kết quả; theo dõi quota dự án Google Cloud. Nếu thiếu key hoặc API lỗi, JSON hiện tại được giữ nguyên và app vẫn hoạt động. Nếu repository bật branch protection chặn bot push, đồng bộ sẽ thất bại an toàn; chạy script trong môi trường tin cậy, xem diff rồi gửi thay đổi qua quy trình PR của repository.

Google, GitHub và Vercel có quota/điều kiện gói miễn phí riêng; dịch vụ miễn phí không bảo đảm chi phí bằng 0 khi quota vượt mức hoặc điều khoản thay đổi.

TikTok và Facebook không được tự động crawl. Có thể lưu link thủ công trong tab **Món hot**; link và ghi chú được lưu ở localStorage.

## Cập nhật công thức

Thêm công thức và nguyên liệu trong `src/data.ts`. Công thức dùng ID nguyên liệu hiện có; chạy `npm run validate:recipes` để tìm ID trùng, trường thiếu, bước nấu trống và tham chiếu nguyên liệu không hợp lệ. Chỉ đánh dấu xác minh khi có quy trình kiểm chứng độc lập và nguồn phù hợp.

## Sao lưu

Trong **Sở thích → Sao lưu dữ liệu trên thiết bị**, tải JSON để backup hoặc nhập lại trên trình duyệt khác. Import thay thế dữ liệu hiện tại sau xác nhận. Ứng dụng không đồng bộ dữ liệu cá nhân lên cloud; xóa dữ liệu trình duyệt có thể làm mất trạng thái nếu chưa tải backup.

## Kho dữ liệu và nguồn

Tình trạng từng nguồn, giấy phép, cấu trúc dữ liệu và lý do chấp nhận/loại trừ được ghi trong [`source-audit.json`](./source-audit.json). Không tự coi trang công khai là giấy phép tái sử dụng. Nguồn chưa có điều khoản tái sử dụng rõ ràng được để ngoài app cho tới khi có quyền phù hợp.

Hiện app có 41 công thức nội bộ chưa xác minh độc lập và 132 nguyên liệu dùng cho tủ lạnh/gợi ý. Recommendation engine chạy trong trình duyệt, không cần API. Công thức đủ loại nguyên liệu được ghi rõ là chưa xác nhận định lượng nếu nguồn không có số lượng; không coi đó là xác nhận đủ khẩu phần. Thư viện **Khám phá** còn có 3 mục món Việt từ Copper (Bánh xèo, Bún chả, Phở bò) theo CC BY 4.0, kèm attribution trong app. Các mục này chỉ có tên, danh sách nguyên liệu và thông tin tổng quan; không có định lượng hay cách làm nên app gắn nhãn “chỉ có nguyên liệu”. Trong 32 tên nguyên liệu nguồn, 23 tên khớp chính xác với catalog hiện có; các tên còn lại được giữ nguyên theo nguồn, không tự dịch hoặc đoán nguyên liệu tương đương.

Recommendation engine ở `src/services/recommendationEngine.ts` chia món thành đủ loại nguyên liệu, thiếu ít, dùng sớm và khám phá. Alias được so khớp chính xác sau khi chuẩn hóa dấu; quan hệ nguyên liệu cha-con chỉ thay thế theo danh sách phương pháp nấu cho phép. Có thể đánh dấu từng món trong ngăn đông. “Không rã đông” lọc món có thành phần được gắn metadata cần rã đông, hoặc nguyên liệu thịt/hải sản đang đông lạnh cần rã đông trước khi chiên, xào, áp chảo hay nướng. Trạng thái đông lạnh là trường tùy chọn, nên dữ liệu localStorage và backup cũ vẫn đọc được. Số khẩu phần mong muốn được lưu cùng sở thích và chỉ dùng scale lượng khi công thức có định lượng và số khẩu phần gốc.

Để cập nhật lại nguồn Copper đã được chấp thuận và tái tạo chỉ mục:

```bash
npm run import:recipes
npm run import:ingredients
npm run normalize:ingredients
npm run dedupe:recipes
npm run validate:dataset
npm run index:recipes
npm run report:dataset
```

Các bước kiểm toán nguồn:

```bash
npm run audit:sources
```

Dữ liệu tải về chỉ được nhập khi script kiểm tra thấy license, attribution và schema đúng như dự kiến; nếu không, script dừng và không ghi đè dữ liệu hiện có. Chỉ mục/ báo cáo được sinh cục bộ để phục vụ phát triển, không làm thay đổi API app.
