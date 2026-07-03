# Deploy TDW Equipment Manager lên GitHub và Vercel

## 1. Cập nhật Google Apps Script

Copy các file trong thư mục `google-apps-script/` lên Apps Script:

- `Code.gs`
- `Index.html`
- `Styles.html`
- `Client.html`

Sau đó chọn `Deploy > Manage deployments > Edit > New version > Deploy`.

## 2. Tạo GitHub repository

Tên repo gợi ý:

```text
tdw-equipment-manager
```

Đẩy source từ thư mục dự án này lên GitHub.

## 3. Import vào Vercel

1. Vào https://vercel.com
2. Chọn `Add New > Project`
3. Import repo `tdw-equipment-manager`
4. Framework Preset: `Other`
5. Deploy

Vercel sẽ tạo domain miễn phí dạng:

```text
https://tdw-equipment-manager.vercel.app
```

## 4. Biến môi trường tùy chọn

Proxy mặc định đang dùng Apps Script URL hiện tại. Nếu sau này đổi deployment URL, vào Vercel:

`Project Settings > Environment Variables`

Thêm:

```text
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

Sau đó Redeploy.

## 5. Cấu trúc deploy

- `app/`: giao diện web chạy trên Vercel.
- `api/google-script.js`: proxy Vercel gọi Apps Script để tránh lỗi CORS.
- `google-apps-script/`: backend Apps Script liên kết Google Sheet.
- `vercel.json`: cấu hình route cho Vercel.
