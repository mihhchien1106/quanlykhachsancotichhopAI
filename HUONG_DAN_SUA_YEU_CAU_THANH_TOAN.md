# Sửa đồng bộ yêu cầu thanh toán Grand Hotel

- Khách thuê gửi yêu cầu ở **Thanh toán**; yêu cầu được lưu vào `backend/data/payment-requests.json` trên localhost.
- Admin xem tại **Trung tâm quản trị / Yêu cầu đang chờ**; Lễ tân xem tại **Yêu cầu / Yêu cầu thanh toán từ khách thuê**.
- Cả hai vai trò đều nhìn thấy yêu cầu và có thể xác nhận/từ chối. Chỉ xác nhận khi đã kiểm tra tiền thực nhận.
- Các giao diện đang mở tự tải lại yêu cầu từ backend khoảng 4 giây/lần. Khách xem kết quả ở lịch sử thanh toán.
- Không đưa file `backend/data/*.json` hoặc `.env` lên GitHub. Nếu đang nâng cấp từ một bản cũ, hãy sao lưu dữ liệu hiện có; các yêu cầu cũ chỉ lưu trong localStorage không tự chuyển lên server.
- Bản này để **trình diễn trên localhost**: các endpoint yêu cầu thanh toán chưa có xác thực phiên/quyền backend, không phù hợp triển khai Internet hoặc xử lý tiền thật. Cần bổ sung xác thực và đối soát hóa đơn trên server trước khi đưa vào vận hành.

## Chạy

```powershell
cd "C:\Users\FPT\Downloads\Grand_Hotel_Payment_Request_Fix\quanlykhachsancotichhopAI-develop"
Copy-Item .\backend\.env.example .\backend\.env
notepad .\backend\.env
node --env-file=backend/.env backend/server.js
```

Nếu trước đó đã có `.env`, hãy **sao chép file cũ sang thư mục backend mới** thay vì tạo từ mẫu. Không dán key vào chat. Dừng server cũ ở cổng 4000 trước khi chạy. Mở `http://127.0.0.1:4000`.
