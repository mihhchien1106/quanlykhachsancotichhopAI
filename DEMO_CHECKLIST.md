# Kiểm tra bản demo Grand Hotel

## Cập nhật

```powershell
git pull origin develop
docker compose up -d --build
docker compose ps
```

Mở http://localhost:4000 và Ctrl+F5. Không dùng `docker compose down -v` nếu cần giữ dữ liệu backend.

## Luồng demo

1. Đăng nhập khách hàng đã xác nhận, gửi yêu cầu đặt một phòng trống.
2. Mở tab khác cùng trình duyệt, đăng nhập Admin/Lễ tân và duyệt yêu cầu.
3. Quay lại tab khách: phòng chuyển Đã duyệt. Bấm Check-in, xác nhận hộp thoại: chuyển Đang ở.
4. Gửi yêu cầu dịch vụ; nhân viên duyệt; kiểm tra chi phí cộng vào hóa đơn.
5. Khách gửi thanh toán kèm bill. Nhân viên kiểm tra và xác nhận; tổng hóa đơn giữ nguyên sau khi các dòng dịch vụ được chốt.
6. Khách Check-out; phòng trở lại Trống; doanh thu không được ghi thêm lần hai.
7. Admin hỏi so sánh doanh thu theo tháng, xem chi tiết dịch vụ.
8. Xóa cuộc trò chuyện AI; đăng xuất và kiểm tra tài khoản khác không thấy hội thoại cũ.

Phòng, đặt phòng và doanh thu chính vẫn dùng localStorage theo origin. Khi demo nhiều vai trò, dùng các tab trong cùng hồ sơ trình duyệt ở đúng http://localhost:4000. Chế độ ẩn danh hoặc trình duyệt khác không chia sẻ dữ liệu này. Chỉ yêu cầu thanh toán và tài khoản đã có backend; bản này chưa chuyển toàn bộ dữ liệu sang cơ sở dữ liệu dùng chung.

## Kiểm tra tự động

```powershell
node tests/demo-workflows.cjs
node tests/backend-smoke.cjs
```

Các kiểm tra dùng dữ liệu tạm/giả lập và API localhost riêng, không thay đổi dữ liệu đang demo. Kiểm tra nghiệp vụ bằng môi trường JavaScript giả lập DOM, không thay thế kiểm tra hình ảnh/tương tác trực tiếp trên trình duyệt.

Đã kiểm tra: check-in/hủy xác nhận; chặn check-out chưa trả tiền; thanh toán không ghi trùng; check-out khách và nhân viên; bảo trì không làm mất phòng đang có khách; xóa hội thoại; danh mục dịch vụ; so sánh tháng; HTTP đăng ký/xác nhận/đăng nhập/quên mật khẩu/đặt lại; kiểm tra tổng thanh toán và xử lý yêu cầu một lần; tên hàm của nút giao diện và tài nguyên cục bộ.

## Điều kiện ngoài mã nguồn

- AI trực tuyến cần API key và credit/quota hợp lệ. So sánh doanh thu cục bộ không cần API.
- Chưa có SMTP: liên kết xác nhận/đặt lại chỉ xuất hiện trong `docker compose logs --tail=100 app`.
- Tài khoản Admin/Lễ tân là tài khoản demo cố định. Luồng quên mật khẩu áp dụng cho khách hàng backend.
- Đây là cấu hình demo localhost; API nghiệp vụ chưa có đầy đủ xác thực/phân quyền cho triển khai công khai.

## Hộp thoại SweetAlert

SweetAlert2 11.26.25 được đóng gói trong frontend/assets/vendor/sweetalert2 cùng giấy phép. Thông báo, xác nhận, nhập lý do, thông báo nhanh và lỗi kiểm tra biểu mẫu dùng một lớp giao diện chung. Hộp thoại được xếp hàng để không đè mất xác nhận đang mở.

Kiểm tra: `node tests/sweetalert-dialogs.cjs`.
