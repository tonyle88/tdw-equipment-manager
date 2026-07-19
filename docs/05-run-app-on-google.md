# Apps Script chỉ dùng làm backend

Giao diện chạy trực tiếp bằng Apps Script đã ngừng sử dụng vì không còn phù hợp với ranh giới bảo mật của hệ thống.

- Frontend duy nhất: domain Vercel.
- Apps Script Web App: chỉ nhận `POST` từ Vercel proxy có `TDW_API_PROXY_SECRET` hợp lệ.
- Mở URL Apps Script bằng trình duyệt chỉ trả metadata API, không trả dữ liệu Google Sheet và không nhận token trên query string.
- Không tạo hoặc deploy `Index.html`, `Client.html`, `Styles.html` trong Apps Script.

Quy trình deploy hiện hành nằm tại `docs/06-github-vercel-deploy.md`.
