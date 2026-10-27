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
