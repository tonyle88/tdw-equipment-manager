# PROJECT DOCUMENTATION

## Mục tiêu hệ thống

TDW Equipment Manager là ứng dụng quản lý thiết bị nội bộ TDW: máy tính, máy in, màn hình, ổ cứng, thiết bị vận hành, bảo trì, phần mềm/license, phòng ban, báo cáo và người dùng.

## Kiến trúc hiện tại

```text
Browser
  -> Vercel static app trong app/
  -> Vercel API proxy api/google-script.js
  -> Google Apps Script google-apps-script/Code.gs
  -> Google Sheet
```

Vercel cần biến môi trường:

```text
GOOGLE_SCRIPT_URL
```

Apps Script cần Script Property khi bootstrap admin đầu tiên:

```text
TDW_BOOTSTRAP_ADMIN_PASSWORD
```

## Nguồn dữ liệu

Google Sheet là database chính. Các tab đang dùng:

- `Assets`: danh sách thiết bị.
- `Settings`: dropdown cấu hình cho nhóm, loại, tình trạng, phòng ban, phần mềm.
- `Users`: tài khoản, role, quyền, password hash.
- `Departments`: danh mục phòng ban chi tiết.
- `MaintenanceLogs`: lịch sử bảo trì.
- `InventoryMovements`: lịch sử bàn giao/điều chuyển.
- `SoftwareLicenses`: license phần mềm.

Schema chi tiết nằm ở `docs/02-google-sheet-schema.md`.

## Module giao diện

- `Tổng quan`: thống kê, biểu đồ, lọc và danh sách thiết bị.
- `Thiết bị`: quản lý thiết bị.
- `Bảo trì`: theo dõi thiết bị cần xử lý và log bảo trì.
- `Phần mềm`: quản lý license phần mềm.
- `Phòng ban`: quản lý danh mục phòng ban.
- `Báo cáo`: biểu đồ, bảng tổng hợp, xuất CSV/PDF.
- `Cấu hình`: quản lý dropdown.
- `Người dùng`: admin quản lý user, reset mật khẩu, phân quyền.

## API được phép qua Vercel proxy

`api/google-script.js` chỉ cho gọi các action trong danh sách an toàn:

```text
getAppData
getSoftwareLicenseKey
loginUser
logoutUser
saveAsset
deleteAsset
saveSetting
deleteSetting
listUsers
saveUser
deleteUser
resetUserPassword
changeOwnPassword
saveMaintenanceLog
saveMovementLog
saveSoftwareLicense
deleteSoftwareLicense
saveDepartment
deleteDepartment
deleteMaintenanceLog
```

Khi thêm action backend mới trong `Code.gs`, phải thêm action tương ứng vào `ALLOWED_FUNCTIONS` nếu frontend cần gọi qua Vercel.

## Quy tắc triển khai

- Đổi frontend hoặc proxy: commit lên GitHub, Vercel redeploy.
- Đổi Apps Script: copy `google-apps-script/Code.gs` lên Apps Script, tạo version mới và deploy lại Web App.
- Không lưu mật khẩu, token, Script URL riêng tư vào source.
- Không sửa thủ công `password_hash` trừ khi biết đúng format hash hiện tại.

## Kiểm tra tối thiểu trước khi deploy

```bash
node --check app/app.js
node --check api/google-script.js
cp google-apps-script/Code.gs /tmp/tdw-code-gs-check.js
node --check /tmp/tdw-code-gs-check.js
```

Sau deploy:

- Đăng nhập admin.
- Tải Dashboard.
- Kiểm tra một thao tác thêm/sửa/xóa ít rủi ro.
- Kiểm tra dữ liệu cập nhật đúng trong Google Sheet.

## Ghi chú hiện trạng

- `.DS_Store` đang là file tracked cũ trong repo, không nên sửa hoặc commit thêm nếu không xử lý cleanup riêng.
- Google Sheet đang là nguồn thật; mọi thay đổi schema cần cân nhắc dữ liệu hiện hữu.
