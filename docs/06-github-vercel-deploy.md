# Deploy TDW Equipment Manager lên GitHub và Vercel

## 1. Cập nhật Google Apps Script

Copy file backend lên Apps Script:

- `google-apps-script/Code.gs`

Nếu vẫn chạy giao diện trực tiếp trong Apps Script thì copy thêm:

- `google-apps-script/Index.html`
- `google-apps-script/Styles.html`
- `google-apps-script/Client.html`

Sau đó chọn `Deploy > Manage deployments > Edit > New version > Deploy`.

## 2. Cấu hình Script Properties

Vào Apps Script:

`Project Settings > Script Properties`

Thêm property bắt buộc khi cần tạo admin đầu tiên:

```text
TDW_BOOTSTRAP_ADMIN_PASSWORD=<mat-khau-admin-dau-tien>
```

Lưu ý:

- Property này chỉ dùng khi sheet `Users` chưa có admin đang hoạt động.
- Nếu đã có admin hợp lệ, đăng nhập sẽ dùng `password_hash` trong sheet `Users`.
- Không lưu mật khẩu thật vào source code hoặc GitHub.

## 3. Tạo GitHub repository

Tên repo gợi ý:

```text
tdw-equipment-manager
```

Đẩy source từ thư mục dự án này lên GitHub.

## 4. Import vào Vercel

1. Vào https://vercel.com
2. Chọn `Add New > Project`
3. Import repo `tdw-equipment-manager`
4. Framework Preset: `Other`
5. Root Directory: `./`
6. Deploy

Vercel sẽ tạo domain miễn phí dạng:

```text
https://tdw-equipment-manager.vercel.app
```

## 5. Biến môi trường bắt buộc trên Vercel

Vào:

`Project Settings > Environment Variables`

Thêm:

```text
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

Chọn môi trường `Production and Preview`, lưu lại rồi `Redeploy`.

Nếu thiếu biến này, app Vercel sẽ báo lỗi API proxy khi đăng nhập hoặc tải dữ liệu.

## 6. Cấu trúc deploy

- `app/`: giao diện web chạy trên Vercel.
- `api/google-script.js`: proxy Vercel gọi Apps Script để tránh lỗi CORS và giới hạn danh sách hàm được gọi.
- `google-apps-script/`: backend Apps Script liên kết Google Sheet.
- `vercel.json`: cấu hình route cho Vercel.

## 7. Kiểm tra sau deploy

1. Mở domain Vercel.
2. Đăng nhập bằng admin đã tạo trong sheet `Users`.
3. Kiểm tra Dashboard tải được số liệu.
4. Thêm thử một cấu hình hoặc thiết bị test, sau đó xóa nếu không cần.
5. Kiểm tra lại dữ liệu trong Google Sheet.

Nếu frontend đã đổi nhưng Vercel chưa cập nhật, kiểm tra `Deployments` trong Vercel và hard refresh trình duyệt.

## 8. Kiểm tra trước khi push

Chạy lệnh sau tại thư mục dự án:

```text
npm test
```

Smoke test kiểm tra cú pháp frontend/Apps Script, route Vercel và định dạng request từ proxy sang Apps Script. Test không gọi Google Sheet thật va khong thay doi du lieu.
