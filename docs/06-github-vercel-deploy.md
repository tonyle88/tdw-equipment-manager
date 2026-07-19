# Deploy TDW Equipment Manager lên GitHub và Vercel

## 1. Cập nhật Google Apps Script

Copy file backend lên Apps Script:

- `google-apps-script/Code.gs`

Apps Script chỉ là API/backend. Không tạo hoặc deploy `Index.html`, `Styles.html`, `Client.html`; frontend duy nhất chạy trên Vercel.

Sau đó chọn `Deploy > Manage deployments > Edit > New version > Deploy`.

## 2. Cấu hình Script Properties

Vào Apps Script:

`Project Settings > Script Properties`

Thêm property bắt buộc khi cần tạo admin đầu tiên:

```text
TDW_BOOTSTRAP_ADMIN_PASSWORD=<mat-khau-admin-dau-tien>
TDW_API_PROXY_SECRET=<chuoi-ngau-nhien-toi-thieu-32-ky-tu>
TDW_BACKUP_FOLDER_ID=<id-thu-muc-drive-backup>
```

Có thể tạo secret bằng lệnh chạy trên máy quản trị, sau đó nhập trực tiếp vào Apps Script/Vercel (không lưu output vào file hoặc Git):

```text
openssl rand -base64 32
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
APPS_SCRIPT_PROXY_SECRET=<dung-chinh-xac-gia-tri-TDW_API_PROXY_SECRET>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
```

Chọn môi trường `Production and Preview`, lưu lại rồi `Redeploy`.

Nếu thiếu `GOOGLE_SCRIPT_URL` hoặc `APPS_SCRIPT_PROXY_SECRET`, app Vercel sẽ từ chối gọi Apps Script. Ba biến Supabase phải được cấu hình cùng nhau trước khi bắt đầu chuyển đổi tài khoản.

`SUPABASE_SERVICE_ROLE_KEY` chỉ được đặt trong Environment Variables của Vercel. Không đưa khóa này vào `app/`, GitHub, ảnh chụp hoặc tin nhắn. Trước khi bật giao diện đăng nhập email, bảo đảm mọi user đang hoạt động trong Sheet `Users` có email hợp lệ và không trùng nhau.

Trong giai đoạn chuyển đổi, user giữ nguyên mật khẩu cũ. Lần đăng nhập email đầu tiên sẽ xác minh hash cũ, tạo Supabase Auth user và ghi `auth_provider`, `supabase_user_id`, `auth_migrated_at` vào Sheet. Chỉ khi Supabase xác minh lại thành công, tài khoản mới được đánh dấu đã chuyển đổi.

Nên cấu hình URL/secret khác nhau cho `Preview` và `Production` để Preview dùng Apps Script + Google Sheet staging riêng.

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
6. Trong Apps Script editor, chạy `migrateSchema()` một lần sau khi deploy backend mới.
7. Kiểm tra Sheet `Users` đã có các cột `auth_provider`, `supabase_user_id`, `auth_migrated_at`.
8. Đăng nhập thử một user bằng email, xác nhận `auth_provider` chuyển thành `SUPABASE`, đăng xuất rồi đăng nhập lại.
9. Chạy `backupSystemData()` và mở thư mục backup để xác nhận có bản sao Sheet + thư mục `media`.
10. Sau khi kiểm tra backup thủ công, chạy `installDailyBackupTrigger()` để tạo lịch hàng ngày.

Nếu frontend đã đổi nhưng Vercel chưa cập nhật, kiểm tra `Deployments` trong Vercel và hard refresh trình duyệt.

## 8. Kiểm tra trước khi push

Chạy lệnh sau tại thư mục dự án:

```text
npm test
```

Smoke test kiểm tra cú pháp frontend/Apps Script, route Vercel và định dạng request từ proxy sang Apps Script. Test không gọi Google Sheet thật va khong thay doi du lieu.
