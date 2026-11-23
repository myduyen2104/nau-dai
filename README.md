# Nấu Đại Đi

Nấu Đại Đi giúp bạn lưu nguyên liệu trong tủ lạnh, tìm món phù hợp và xem video nấu ăn. Tủ lạnh, danh sách mua sắm, lịch sử nấu và video đã xem được lưu trên thiết bị; app không cần tài khoản hay backend cho các tính năng này.

**Mở app:** [naudaidi.vercel.app](https://naudaidi.vercel.app/)

![Giao diện Nấu Đại Đi trên điện thoại](docs/screenshots/home-mobile.png)

Ảnh chụp giao diện mobile 390 × 844, cập nhật ngày 23-11-2026.

## Chạy local

Yêu cầu Node.js 22.6 trở lên.

```bash
npm ci
npm run dev
```

## Build và kiểm tra

```bash
npm test
npm run validate:recipes
npm run build
```

Các công thức tự phối được ghi nhãn chưa thử nghiệm; công thức thiếu định lượng nguồn không được xem là đã xác nhận đủ khẩu phần. Recipe QA trong [`docs/qa/`](docs/qa/) là các báo cáo có ngày, mô tả đúng phạm vi retest tại thời điểm lập báo cáo; chúng không tự cập nhật khi source đổi.

## Triển khai Vercel

Production hiện chạy tại [naudaidi.vercel.app](https://naudaidi.vercel.app/). Repository đã kết nối Vercel; mỗi commit mới trên `main` sẽ tạo deployment.

- Build command: `npm run build`
- Output directory: `dist`
- Cấu hình: [`vercel.json`](vercel.json)
- App tủ lạnh và gợi ý món không cần API key hoặc biến môi trường.

## Video YouTube

Production catalog được kiểm tra ngày **23-11-2026**: có **374** bản ghi, gồm **239** được chấp nhận tự động và **135** cần review. Bản ghi cần review được đánh dấu trong feed; con số này có thể đổi sau lần đồng bộ tiếp theo. Người dùng có lịch sử xem riêng trên thiết bị; video chưa xem được xếp trước video đã xem.

GitHub Actions chạy workflow **Update YouTube food videos** hằng ngày lúc 09:17 giờ Việt Nam; có thể chạy thủ công bằng **Actions → Update YouTube food videos → Run workflow**. Khi catalog thay đổi, workflow commit file catalog; Vercel tự build lại từ commit đó.

Thiết lập lần đầu:

1. Bật **YouTube Data API v3** trong Google Cloud project.
2. Tạo API key và giới hạn key cho YouTube Data API v3.
3. Thêm key vào GitHub repository secret tên `YOUTUBE_API_KEY` tại **Settings → Secrets and variables → Actions**.

> Key chỉ được dùng ở GitHub Actions; không đưa vào `VITE_*` hoặc frontend. Workflow giới hạn tối đa 24 lệnh tìm kiếm `search.list` mỗi lần chạy. API key miễn phí vẫn chịu quota Google Cloud; theo dõi quota trong Cloud Console. Nếu thiếu key hoặc API lỗi, catalog hiện tại được giữ lại. Thông tin và lịch sử kiểm thử feed nằm trong [`docs/qa/evidence/videos/feed-smoke-test.md`](docs/qa/evidence/videos/feed-smoke-test.md).

TikTok và Facebook không được crawl tự động. Người dùng có thể lưu link video để xem sau từ ứng dụng.

## Dữ liệu ứng dụng

Tại source hiện tại có **37 công thức nội bộ** và **140 nguyên liệu** dùng cho tủ lạnh/gợi ý. Recommendation engine chạy trong trình duyệt. Ba công thức Copper trong thư viện Khám phá (Bánh xèo, Bún chả, Phở bò) được ghi attribution và license trong app; các món chỉ có tên/nguyên liệu được gắn nhãn tương ứng.

Tình trạng nguồn, giấy phép và lý do nhận/loại được ghi trong [`source-audit.json`](source-audit.json). Không coi trang công khai là giấy phép tái sử dụng. Hướng dẫn thêm công thức nằm trong [`src/data.ts`](src/data.ts); chạy `npm run validate:recipes` để kiểm tra ID và trường công thức.

Recommendation engine ở [`src/services/recommendationEngine.ts`](src/services/recommendationEngine.ts) đối chiếu alias đã chuẩn hóa, xét hạn dùng/trạng thái hỏng, và hỗ trợ đánh dấu nguyên liệu trong ngăn đông. Dữ liệu tủ lạnh, sở thích, danh sách mua sắm và lịch sử video được lưu cục bộ; trong **Sở thích → Sao lưu dữ liệu trên thiết bị**, người dùng có thể tải hoặc nhập bản sao lưu JSON. Xóa dữ liệu trình duyệt có thể làm mất các dữ liệu này nếu chưa sao lưu.

## Cập nhật dữ liệu Copper

```bash
npm run import:recipes
npm run import:ingredients
npm run normalize:ingredients
npm run dedupe:recipes
npm run validate:dataset
npm run index:recipes
npm run report:dataset
npm run audit:sources
```

Script kiểm tra license, attribution và schema trước khi ghi dữ liệu; nếu kiểm tra không đạt, script dừng thay vì ghi đè dữ liệu hiện tại.
