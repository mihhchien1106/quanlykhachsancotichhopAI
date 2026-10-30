# GRAND HOTEL — giao diện mới + xác nhận tài khoản + Gemini

## Chạy trên Windows

1. Giải nén ZIP. Mở Terminal tại thư mục `quanlykhachsancotichhopAI-develop`.
2. Tạo `backend/.env` bằng cách copy `backend/.env.example`. Giữ API key Gemini thật trong `.env` (không đưa lên Git); **thu hồi key đã xuất hiện trong ảnh chụp**.
3. Nếu muốn gửi email xác nhận/quên mật khẩu thật, chạy `cd backend; npm install; cd ..` và đặt SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM trong `.env`. Dùng mật khẩu ứng dụng SMTP, không dùng mật khẩu Gmail thông thường.
4. Tắt mọi server cũ đang dùng cổng 4000 trước khi chạy.
5. Chạy `node backend/server.js` hoặc nhấp đúp `RUN_GRAND_HOTEL.bat`.
6. Truy cập http://localhost:4000 ; trạng thái AI ở http://localhost:4000/api/ai/status.

## Tài khoản / tính năng

- Khách mới: **Đăng ký** -> kiểm tra email -> **Xác nhận** -> **Đăng nhập**.
- Nếu chưa cấu hình SMTP, mở Terminal chạy backend, copy liên kết ở dòng `[DEV EMAIL]` để xác nhận. Đây chỉ là phương án kiểm thử localhost, không phải xác nhận email thật.
- **Quên mật khẩu**: nhập email, mở liên kết email (hoặc Terminal demo), đặt mật khẩu mới. Liên kết xác nhận có hiệu lực 24 giờ, đặt lại mật khẩu 30 phút; chỉ sử dụng được một lần.
- Mật khẩu tài khoản mới được băm bằng `scrypt`, lưu ở `backend/data/accounts.json` (đã được `.gitignore` loại trừ).
- Hai tài khoản nhân viên demo cũ vẫn tồn tại để không làm hỏng các màn hình quản lý. Chưa đủ an toàn để triển khai internet.
- Giao diện dashboard, phòng, booking, doanh thu, dịch vụ, thông báo, phân trang, chatbot vẫn giữ nguyên.

## Giới hạn / bảo mật cần hoàn thiện trước khi dùng thật

- Đây là bản cải tiến **chạy localhost / demo**. Những phân quyền cũ, phiên nhân viên lưu trong sessionStorage và API `/api/state` **chưa được ràng buộc với session backend**. Không đưa website lên mạng công cộng, không dùng cho dữ liệu khách hàng thật trước khi hoàn thiện kiểm tra quyền của mọi API, CSRF, session và phân quyền toàn hệ thống.
- Tài khoản khách hàng cũ lưu trong localStorage **chưa được di chuyển tự động** sang backend; hãy tạo tài khoản mới và kiểm tra dữ liệu trước khi sử dụng.
- Gemini cần API key hợp lệ và internet; `/api/ai/status` báo configured chỉ chứng minh khóa được đọc, không đảm bảo dịch vụ đang đáp ứng.
- SMTP không được cấu hình: link sẽ in ra Terminal ở chế độ local để bạn có thể kiểm thử ngay.
