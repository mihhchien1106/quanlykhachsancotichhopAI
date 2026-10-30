# Dữ liệu giả lập Grand Hotel

Chỉ dùng để demo trên localhost. 60 hóa đơn đã thanh toán phân bố trong sáu tháng gần nhất, với tiền phòng, tiền dịch vụ và phương thức thanh toán. Không phải số liệu kinh doanh thật.

## Docker

```powershell
git pull origin develop
docker compose up -d --build
docker compose stop app
docker compose run --rm --no-deps app node seed-demo.js
docker compose up -d
```

Lệnh seed thêm 10 khách hàng đã xác nhận, không thay đổi tài khoản trùng email. Chạy khi app đã dừng để tránh ghi đồng thời. Tài khoản tồn tại trong Docker volume.

- Email: khach01@example.com đến khach10@example.com.
- Mật khẩu chung: DemoHotel@123.
- Quản trị viên hiện có: admin@gmail.com / admin123.
- Lễ tân hiện có: letan@gmail.com / letan123.

Mở http://localhost:4000/?demo=1 để thêm doanh thu mẫu, rồi đăng nhập quản trị viên xem Tổng quan / Báo cáo / Quản trị. Mở lại link không thêm trùng hóa đơn. Dữ liệu cũ được giữ nguyên. Doanh thu mẫu nằm trong localStorage của trình duyệt này; trình duyệt khác cần mở lại link. Khách hàng xuất hiện trong danh sách giao diện sau khi đăng nhập lần đầu. Không tạo đặt phòng đang ở hay thay đổi trạng thái phòng.

Muốn gỡ riêng hóa đơn mẫu, mở DevTools > Console tại localhost:4000 và chạy:

```javascript
const key='grandhotel_revenue_history';
localStorage.setItem(key,JSON.stringify(JSON.parse(localStorage.getItem(key)||'[]').filter(r=>r.demo!==true)));
location.href='/';
```
