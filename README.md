> **Bản nâng cấp 2026:** Xem [HUONG_DAN_CHAY_VA_DANG_NHAP.md](HUONG_DAN_CHAY_VA_DANG_NHAP.md) để dùng giao diện chào mới, đăng ký xác nhận email, quên mật khẩu và Gemini.

# Grand Hotel AI Fusion — frontend / backend

Đây là bản **tách mã nguồn theo thư mục**, xuất phát từ `Grand_Hotel_AI_Fusion_Toi_Uu_Toan_Dien.html`.

## Cấu trúc

- `frontend/index.html` — giao diện HTML gốc, giữ cấu trúc DOM.
- `frontend/assets/style-*.css` — CSS tách khỏi HTML, theo thứ tự ban đầu.
- `frontend/assets/script-*.js` — JavaScript gốc, theo thứ tự ban đầu.
- `backend/server.js` — API Node.js độc lập, lưu/đọc JSON qua `/api/state`.
- `backend/data/` — thư mục dữ liệu runtime, không đưa dữ liệu runtime lên Git.

## Chạy trên Windows PowerShell

Mở hai cửa sổ terminal trong thư mục dự án:

**Terminal 1 — backend (Node.js 18+):**

```powershell
cd backend
node server.js
```

API health: http://127.0.0.1:4000/api/health

**Terminal 2 — frontend (Python 3):**

```powershell
cd frontend
python -m http.server 5500 --bind 127.0.0.1
```

Mở http://127.0.0.1:5500

## Tình trạng chuyển đổi và lưu ý quan trọng

- Việc tách `script`/`style` ra file độc lập **không thay đổi thứ tự thực thi JavaScript**.
- **Nghiệp vụ quản lý phòng, khách, đăng nhập, AI và dữ liệu hiện tại vẫn đang chạy phía browser.** File gốc lưu nhiều giá trị `grandhotel_*` bằng `localStorage`; những giá trị này vẫn được giữ và **chưa tự động chuyển lên API backend**.
- API backend `/api/state` cho phép lưu một object JSON bằng `PUT` và lấy lại bằng `GET`, là phần nền tảng cho lần chuyển đổi tiếp theo. **Chưa có kết nối CRUD theo từng chức năng**, phân quyền hay xác thực backend; không dùng API này để lưu dữ liệu thật trên Internet.
- Những tài khoản/mật khẩu tĩnh có trong JS gốc chưa an toàn cho triển khai công khai. Cần chuyển xác thực và xử lý dữ liệu quan trọng sang backend trước khi đưa lên production.
- Lưu ý `localStorage` phụ thuộc origin. Nếu trước đó chạy qua `file://`, dữ liệu trong browser có thể không tự xuất hiện tại `http://127.0.0.1:5500`; hãy xuất/sao lưu dữ liệu ở ứng dụng cũ trước khi đổi origin.
- Backend mặc định chỉ lắng nghe localhost, hỗ trợ CORS origin `http://127.0.0.1:5500`. Có thể điều chỉnh qua `HOST`, `PORT`, `FRONTEND_ORIGIN`.

## GitHub — push lần đầu lên repository đang trống

```powershell
git init
git switch -c develop
git add .
git commit -m "chore: split Grand Hotel frontend and backend scaffold"
git remote add origin https://github.com/mihhchien1106/quanlykhachsancotichhopAI.git
git push -u origin develop
```

Chỉ đẩy `main` sau khi bạn chủ động quyết định merge. Nếu `git switch -c develop` báo đã có nhánh, dùng `git switch develop`.


## Bản bổ sung tiện ích từ Tro Room

- Chạy bằng `RUN_GRAND_HOTEL.bat` (yêu cầu Node.js 18+) hoặc `cd backend; node server.js`, rồi mở **http://localhost:4000**. Frontend và API cùng một origin, không cần terminal frontend riêng.
- Hộp thông báo hệ thống (biểu tượng hộp thư cạnh chuông yêu cầu khách), đánh dấu đã đọc, xóa đã đọc, thông báo nhanh. Lưu tại `localStorage` của trình duyệt.
- Phân trang bảng danh sách với 5/10/20/50 dòng/trang, theo dõi thay đổi tbody. Không áp dụng cho bảng nằm trong dialog và một số bảng cuộn nhỏ.
- Có thể kích hoạt thông báo theo nghiệp vụ trong mã bằng `GrandHotelUI.notify('Đặt phòng mới', 'Phòng 101 đã được đặt', 'success')` hoặc `GrandHotelUI.toast('Đã lưu')`. Hiện chưa tự đồng bộ thông báo từ server và không sao chép hệ thống phân quyền của Tro Room.
- Lưu ý: dữ liệu cũ ở `http://127.0.0.1:5500` không tự chia sẻ với `http://localhost:4000` vì `localStorage` phân biệt origin. Hãy sao lưu dữ liệu trước khi chuyển.


## Grand Hotel AI — chatbot trực tuyến

1. Cài Node.js 18 trở lên. Copy `backend/.env.example` thành `backend/.env`.
2. Điền `OPENAI_API_KEY` của bạn vào `backend/.env` (không đưa key lên Git). API nhà cung cấp thường mất phí theo mức sử dụng.
3. Chạy `node backend/server.js` từ thư mục gốc hoặc `RUN_GRAND_HOTEL.bat`.
4. Mở `http://localhost:4000`, đăng nhập và chọn **Trợ lý Hotel AI**. Trong **Cấu hình AI**, bật AI trực tuyến, endpoint `/api/ai/chat`.
5. Kiểm tra cấu hình không lộ khóa tại `http://localhost:4000/api/ai/status`.

Chatbot hỗ trợ đối thoại nhiều lượt, hỏi đáp kiến thức chung, giải thích, lập kế hoạch, tư vấn nghiệp vụ khách sạn; lịch sử chat được lưu tại trình duyệt. Chưa hỗ trợ tự động chỉnh sửa dữ liệu, truy cập web theo thời gian thực hoặc xử lý tệp như ChatGPT/Gemini. Khi không có API key, hệ thống sử dụng tư vấn demo. Khi triển khai công khai, cần bổ sung xác thực máy chủ, phân quyền, giới hạn tần suất và kiểm soát dữ liệu gửi đến AI trước khi bật API cho người dùng bên ngoài.


## Gemini chatbot
Sao chép `backend/.env.example` thành `backend/.env`, đặt `GEMINI_API_KEY` mới, giữ `AI_PROVIDER=gemini` và khởi động `node backend/server.js`.
Kiểm tra `http://localhost:4000/api/ai/status` (configured=true) và mở chatbot qua `http://localhost:4000`. Không commit .env lên GitHub.
