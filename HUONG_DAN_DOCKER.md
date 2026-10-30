# Chạy Grand Hotel bằng Docker Desktop

Mở Docker Desktop (Linux containers). Yêu cầu Docker Compose 2.24 trở lên.

Trong PowerShell, tại thư mục có Dockerfile và compose.yaml:

```powershell
docker compose up -d --build
docker compose ps
curl.exe http://localhost:4000/api/health
```

Mở http://localhost:4000. Container phục vụ cả frontend và API; không cần chạy Node hoặc http-server trên Windows. Nếu Node cũ đang chiếm cổng 4000, dừng terminal đó bằng Ctrl+C trước.

## AI và email (tùy chọn)

Ứng dụng chạy được khi chưa có backend/.env. Muốn dùng AI hoặc SMTP:

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
docker compose up -d --force-recreate
```

Điền khóa thật vào backend/.env trên máy, không commit. Nếu file đã tồn tại, chỉ sửa file đó. Không cấu hình SMTP thì liên kết xác nhận/đặt lại mật khẩu xuất hiện trong log:

```powershell
docker compose logs --tail=100 app
```

## Dữ liệu và dừng ứng dụng

Dữ liệu JSON của backend nằm trong volume hotel_data, tồn tại sau khi dừng hoặc tạo lại container. Dữ liệu localStorage vẫn nằm trong trình duyệt và phân biệt localhost với 127.0.0.1 hoặc cổng khác. Volume mới không tự nhập dữ liệu backend/data cũ trên Windows.

```powershell
docker compose down
docker compose up -d
```

Không thêm `-v` vào lệnh down nếu cần giữ dữ liệu volume. Cấu hình này phục vụ bản demo trên máy cá nhân qua localhost.
