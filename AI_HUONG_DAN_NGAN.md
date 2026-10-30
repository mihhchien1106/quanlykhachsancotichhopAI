# Grand Hotel AI — hướng dẫn ngắn

Bản này chỉ sửa kết nối và thông báo lỗi AI; không thay giao diện, nghiệp vụ hay cơ chế tài khoản.

1. Sao lưu dự án hiện tại trước khi thay file. Có thể chỉ sao chép `backend/server.js` và `frontend/assets/script-03.js` từ ZIP mới vào dự án của bạn.
2. Trong `backend/.env`: đặt `AI_PROVIDER=gemini`, `AI_MODEL=gemini-2.5-flash`, `GEMINI_API_KEY=...` bằng **key mới**. Không đăng key hoặc file `.env`.
3. Đóng server cũ đang chiếm cổng 4000, rồi chạy từ thư mục gốc: `node --env-file=backend/.env backend/server.js`. Chỉ chạy một server.
4. Mở `http://127.0.0.1:4000/api/ai/status` để xem đã nhận key. Sau đó mở Grand Hotel, làm mới mạnh Ctrl+Shift+R, bật AI trực tuyến trong cài đặt chatbot với endpoint `/api/ai/chat` và gửi câu hỏi.
5. Nếu lỗi quota, key, mô hình hoặc mạng, chatbot sẽ hiển thị nguyên nhân dễ hiểu và nội dung tư vấn dự phòng.

`configured: true` chỉ xác nhận backend đã đọc key, không bảo đảm dịch vụ Gemini có phản hồi.

**Bảo mật:** Thu hồi mọi key từng gửi lên chat hoặc ảnh và tạo key khác trước khi sử dụng. AI không tự thực hiện thay đổi đặt phòng, thanh toán hoặc dữ liệu khách sạn.
