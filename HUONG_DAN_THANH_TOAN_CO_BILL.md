# Grand Hotel - Yêu cầu thanh toán kèm ảnh bill

- Khách hàng: Chọn phòng và phương thức thanh toán, chọn ảnh bill JPG/PNG/WebP (bắt buộc), sau đó gửi yêu cầu.
- Ảnh được thu nhỏ trong trình duyệt, tối đa 650 KB sau xử lý. Ảnh gốc tối đa 12 MB.
- Admin và Lễ tân: Vào phần **Yêu cầu** > **Yêu cầu thanh toán từ khách thuê**, chọn **Xem ảnh bill**, đối soát giao dịch thực tế rồi xác nhận hoặc từ chối.
- Khách hàng: Xem lại trạng thái và ảnh bill trong **Lịch sử thanh toán**.
- Server lưu yêu cầu và ảnh trong `backend/data/payment-requests.json`. Không xóa thư mục `backend/data` khi cập nhật. Đừng commit file dữ liệu nhạy cảm lên GitHub.
- Giữ file `backend/.env` hiện có (không đóng gói API key vào ZIP). Mở terminal tại thư mục dự án và chạy `node --env-file=backend/.env backend/server.js`. Chỉ chạy **một** server trên cổng 4000.
- Phiên bản này dành cho localhost/demo: API thanh toán hiện chưa có bảo vệ session/role phía server. Không triển khai công khai hoặc xử lý tiền thật cho đến khi bổ sung xác thực, phân quyền và lưu ảnh an toàn.
- Lịch sử thanh toán và hóa đơn cũ không có bill vẫn hiển thị nhưng đánh dấu thiếu chứng từ.
