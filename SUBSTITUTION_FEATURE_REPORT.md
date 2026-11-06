# Báo cáo tính năng nguyên liệu thay thế

## Phạm vi triển khai

- Quy tắc được lưu riêng trong `src/data/ingredient-substitutions.json`; engine đọc dữ liệu thay vì hard-code từng cặp.
- Hiện có **7 quy tắc**, cả 7 có nguồn và được đánh dấu `verified`; cả 7 là `conditional`. Không có tỷ lệ định lượng nào được tự đặt.
- Quy tắc áp dụng thực tế cho công thức đầy đủ hiện tại: **1 món — Canh gà rau củ** (thiếu khoai tây, có khoai lang, đúng phương pháp nấu canh và đúng ID món được cho phép).
- Các quy tắc khác được giữ trong catalog nhưng chưa tạo thêm món “có thể nấu nếu thay” trong bộ công thức đầy đủ hiện tại. Phở bò bị loại khỏi quy tắc hành tây để không thay một nguyên liệu tạo đặc trưng nước dùng; công thức Copper hiện cũng chỉ có danh sách nguyên liệu, chưa có bước nấu.

## Nguồn

- Utah State University Extension, bảng swaps có đề xuất khoai tây ↔ khoai lang và một số nhóm rau củ: [Six Tips for Planning Menus around Farmers Market Selections](https://extension.usu.edu/news_sections/home_family_and_food/six-tips-for-planning-menus-around-farmers-market-selections), [Easy Fruit & Vegetable Swaps (PDF)](https://extension.usu.edu/fscreate/files/2023-26-staff/CHG-Easy-Fruit-Vegetable-Swaps.pdf).
- Utah State University Extension về vị ngọt và đặc tính kết cấu của khoai lang: [Sweet Potatoes](https://extension.usu.edu/nutrition/research/sweet-potatoes).

## Hành vi và an toàn

- Kết quả “Có thể thay” chỉ xuất hiện khi mọi nguyên liệu bắt buộc còn thiếu đều có quy tắc đã xác minh, phù hợp ID món/phương pháp, và nguyên liệu thay thế đang có, còn dùng được, không bị chế độ ăn hoặc danh sách tránh loại bỏ.
- Món có lựa chọn thay thế cần mua vẫn hiện trong chi tiết món, nhưng không được xếp vào nhóm nấu với nguyên liệu thay thế đang có.
- Nguyên liệu hỏng/quá hạn bị loại. Quy tắc một chiều; alias chỉ dùng để nhận diện cùng một nguyên liệu. Công thức gốc và số lượng gốc không bị sửa.
- Không có quy tắc dị ứng riêng và app không khẳng định một nguyên liệu an toàn với mọi dị ứng. Chi tiết món nhắc người dùng kiểm tra nhãn/thành phần.
- Không có backend, cloud database hoặc API trả phí. Bật/tắt gợi ý lưu trong `fridge-prefs` localStorage và đi theo bản backup.

## Cài đặt và giao diện

- Cài đặt có công tắc “Cho phép gợi ý nguyên liệu thay thế”, mặc định bật.
- “Tìm món” có tab riêng, thẻ món báo số nguyên liệu có thể thay; chi tiết hiển thị món thiếu, lựa chọn thay thế, tình trạng trong tủ/cần mua, mức phù hợp có điều kiện, ảnh hưởng vị/kết cấu, điều chỉnh nấu và nguồn.
- Người dùng có thể chọn nguyên liệu thay cho kế hoạch hiện tại trong phiên đang mở. Lựa chọn này không sửa công thức và chưa được lưu sau khi đóng/đổi món.

## Kiểm định

- `npm run validate:substitutions`: pass, 7 rules / 132 ingredient IDs / 44 recipe IDs.
- `npm run validate:dataset`: pass.
- `npm test`: pass, 6 test files.
- `tests/substitution-engine.test.ts`: 22 cases pass, bao gồm alias, một chiều, điều kiện món/phương pháp, hỏng/quá hạn, chế độ ăn, tránh nguyên liệu, thiếu định lượng, tỷ lệ, ranking và không sửa công thức gốc.
- `npm run build`: pass.
- Browser mobile 393×852: đã thêm thịt gà, cà rốt, khoai lang; xác nhận nhóm riêng “Có thể thay”, chi tiết đúng món/nguồn/trạng thái, và nút chọn cập nhật thành “Đã chọn cho kế hoạch”. Đã tắt cài đặt, reload và xác nhận nhóm trở về 0; bật lại, xác nhận localStorage, rồi xóa dữ liệu kiểm thử để tủ lạnh trở lại rỗng. Console không có lỗi/cảnh báo.

## Đánh giá sẵn sàng

Hạ tầng dữ liệu, lọc an toàn, UI và kiểm định đã chạy. Tính năng hiện **sẵn sàng ở mức thử nghiệm có giới hạn**: trong dữ liệu món hiện có chỉ một công thức đầy đủ được hỗ trợ bởi allow-list. Mở rộng thêm quy tắc cần nguồn đáng tin cậy và đối chiếu với vai trò nguyên liệu, phương pháp cùng món cụ thể trước khi bật cho người dùng.
