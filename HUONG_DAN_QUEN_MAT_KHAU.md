# Quên mật khẩu khách hàng

Chọn **Quên mật khẩu?** tại màn hình đăng nhập, nhập email đã đăng ký, mở liên kết đặt lại và nhập mật khẩu mới cùng ô xác nhận. Mật khẩu tối thiểu 8 ký tự. Liên kết có hiệu lực 30 phút, dùng một lần.

Nếu chưa cấu hình SMTP, liên kết chỉ xuất hiện trong log: `docker compose logs --tail=100 app`. Tìm dòng [DEV EMAIL] có email của bạn và URL ?reset=... rồi mở trên trình duyệt. Không chia sẻ log chứa token công khai.

Muốn gửi email thật, cấu hình SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS và SMTP_FROM trong backend/.env theo nhà cung cấp, rồi chạy `docker compose up -d --force-recreate`. Không commit mật khẩu SMTP.

Chỉ áp dụng cho tài khoản khách hàng lưu ở backend. Admin và lễ tân demo đang là tài khoản cố định trong frontend.
