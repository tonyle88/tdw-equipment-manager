# IMPLEMENTATION ROADMAP

Lộ trình này áp dụng theo template triển khai mới, nhưng điều chỉnh theo hệ thống TDW Equipment Manager hiện tại.

## Sprint 0 - Đồng bộ tài liệu nguồn chuẩn

Mục tiêu:

- Có một tài liệu mô tả đúng kiến trúc, schema, deploy và quy tắc vận hành.
- Loại bỏ hướng dẫn cũ dễ gây lỗi, nhất là admin mặc định và biến môi trường Vercel.

Phạm vi file:

- `PROJECT_DOCUMENTATION.md`
- `IMPLEMENTATION_ROADMAP.md`
- `docs/02-google-sheet-schema.md`
- `docs/06-github-vercel-deploy.md`

Xác minh:

- Tài liệu khớp với `api/google-script.js` và `google-apps-script/Code.gs`.
- Không sửa logic app trong sprint này.

## Sprint 1 - Health check triển khai

Trạng thái: Hoàn tất.

Mục tiêu:

- Admin có thể kiểm tra nhanh Vercel proxy, Apps Script và Google Sheet đang kết nối đúng.
- Giảm tình trạng deploy xong nhưng lỗi chỉ lộ ra khi đăng nhập hoặc thao tác dữ liệu.

Phạm vi dự kiến:

- Thêm action `healthCheck` trong `google-apps-script/Code.gs`.
- Thêm `healthCheck` vào `ALLOWED_FUNCTIONS` trong `api/google-script.js`.
- Thêm nút kiểm tra kết nối trong khu vực admin hoặc cấu hình.

Xác minh:

- Gọi API trả về trạng thái từng sheet chính.
- Nếu thiếu `GOOGLE_SCRIPT_URL`, Vercel báo lỗi rõ.
- Nếu thiếu sheet/header quan trọng, health check chỉ ra tên sheet/cột.

## Sprint 2 - Audit log cho thao tác quan trọng

Trạng thái: Hoàn tất.

Mục tiêu:

- Ghi lại ai đã thêm/sửa/xóa thiết bị, cấu hình, user, phòng ban, license và log bảo trì.
- Có căn cứ kiểm tra khi dữ liệu thay đổi bất thường.

Phạm vi dự kiến:

- Thêm sheet `AuditLogs`.
- Thêm helper `logAudit_` trong Apps Script.
- Ghi log cho các hàm save/delete/reset password/change password.

Xác minh:

- Thêm/sửa/xóa một thiết bị tạo dòng audit tương ứng.
- Reset password user tạo audit nhưng không ghi mật khẩu thô.

## Sprint 3 - Smoke test trước deploy

Trạng thái: Hoàn tất.

Mục tiêu:

- Có checklist tự động tối thiểu để giảm lỗi lặp lại trước khi up GitHub/Vercel.

Phạm vi dự kiến:

- Thêm script kiểm tra cú pháp JS.
- Thêm smoke test cho proxy request shape.
- Ghi hướng dẫn chạy test vào README hoặc docs deploy.

Xác minh:

- Lệnh test pass trên máy local.
- Không cần chạm vào dữ liệu thật khi chạy smoke test cơ bản.

## Sprint 4 - Tối ưu tốc độ và trải nghiệm tải

Trạng thái: Hoàn tất.

Mục tiêu:

- Giảm cảm giác chậm ở Dashboard và Quản lý người dùng.
- Trạng thái loading rõ, không hiện nhấp nháy màn hình đăng nhập khi F5.

Phạm vi dự kiến:

- Rà cache session phía frontend.
- Tối ưu lần gọi `getAppData` và `listUsers`.
- Chỉ thêm loading state ở nơi đang có độ trễ thật.

Xác minh:

- F5 khi còn session hợp lệ không hiện form đăng nhập rồi tự nhảy vào app.
- Danh sách user có trạng thái loading ngắn gọn và không khóa toàn trang.

## Sprint 5 - Cleanup repo và quy trình release

Trạng thái: Hoàn tất.

Mục tiêu:

- Repo sạch hơn, tránh upload file hệ thống hoặc file build thừa.
- Có checklist release ngắn cho lần deploy sau.

Phạm vi dự kiến:

- Kiểm tra `.gitignore`.
- Xử lý `.DS_Store` tracked bằng commit cleanup riêng nếu anh duyệt.
- Viết release checklist.

Xác minh:

- `git status --short` sạch sau commit.
- Vercel deploy đúng commit mới nhất.

## Phân quyền theo module

### Phase 1 - Bảo vệ license và hợp đồng API

Trạng thái: Hoàn tất.

- License key chỉ tải khi Admin bấm xem; dữ liệu tải chung chỉ có bản che.
- Lượt xem key được ghi vào `AuditLogs`.
- Chuẩn hóa request xóa maintenance/license giữa frontend và Apps Script.

### Phase 2 - Chuẩn hóa quyền backend

Trạng thái: Hoàn tất.

- Dùng mã quyền theo module, có kiểm tra tại từng API ghi/xóa/đọc dữ liệu nhạy cảm.
- Hỗ trợ tương thích dữ liệu quyền cũ `all`, `view`, `edit`, `report`.
- Admin luôn toàn quyền; Manager mặc định không quản lý Cấu hình, Phòng ban, User hoặc license key.

### Phase 3 - Ma trận checkbox cho Admin

Trạng thái: Hoàn tất.

- Thay ô nhập quyền tự do bằng checkbox `Xem`, `Thêm/Sửa`, `Xóa` theo từng module.
- Có preset Admin, Manager, User, Viewer và phần tóm tắt quyền đã chọn.

### Phase 4 - Đồng bộ giao diện và xác minh

Trạng thái: Hoàn tất.

- Menu, nút thao tác và dữ liệu trả về chỉ hiển thị khi có quyền tương ứng.
- Bổ sung test cho Admin, Manager, User và Viewer trước khi deploy.
