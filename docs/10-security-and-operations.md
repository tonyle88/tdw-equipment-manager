# Bảo mật và vận hành

## Ranh giới hệ thống

Luồng duy nhất được hỗ trợ:

`Vercel frontend -> Vercel /api/google-script -> Apps Script -> Google Sheet/Drive`

Apps Script không còn phục vụ HTML và không đọc token từ URL. Vercel giữ session trong cookie `HttpOnly; Secure; SameSite=Strict`; frontend JavaScript không đọc được token.

## Phiên và mật khẩu

- Reset/đổi mật khẩu tăng `session_version`, làm mọi phiên cũ mất hiệu lực.
- Đổi mật khẩu của chính user phát hành lại cookie phiên mới.
- Hash cũ được nâng cấp tự động khi đăng nhập thành công.
- KDF hiện tại là giải pháp chuyển tiếp phù hợp giới hạn Apps Script, chưa thay thế Argon2id/PBKDF2 của một dịch vụ xác thực chuyên dụng. Khi chuyển dữ liệu sang backend PostgreSQL/Supabase/Cloud SQL, ưu tiên dùng managed authentication hoặc Argon2id.

## License key

License mới không lưu trong Google Sheet. Sheet chỉ giữ marker `SCRIPT_PROPERTY_V1`, giá trị thật nằm trong Script Properties theo `license_id`. Dữ liệu `ENC:` cũ được chuyển khi admin đọc khóa hoặc chạy `migrateSchema()`.

Đây là tách bí mật khỏi Sheet, chưa phải AES-GCM bằng KMS. Muốn mã hóa xác thực đầy đủ cần Google Cloud KMS/Secret Manager hoặc backend có dịch vụ khóa; không tự triển khai AES trong Apps Script.

## Backup và phục hồi

1. Tạo thư mục Drive riêng, hạn chế Editor, đặt ID vào `TDW_BACKUP_FOLDER_ID`.
2. Chạy `backupSystemData()` thủ công. Hàm sao chép spreadsheet và toàn bộ thư mục media sang snapshot có timestamp.
3. Mở bản sao Sheet và một số ảnh để xác nhận đọc được.
4. Chạy `installDailyBackupTrigger()` sau khi kiểm tra thành công.
5. Mỗi quý thực hiện diễn tập phục hồi sang Sheet staging và ghi thời gian/kết quả.

Backup media lớn có thể vượt quota/thời gian Apps Script. Khi số ảnh tăng đáng kể, chuyển backup sang Cloud Storage/Drive API job có retry và cảnh báo.

## Theo dõi và staging

- Vercel log ghi `request_id`, tên hàm, status và thời gian; không ghi args, token, mật khẩu hay license.
- Cảnh báo nên dựa trên tỷ lệ 5xx/504, latency và lỗi trigger Apps Script/email.
- Preview Vercel phải có `GOOGLE_SCRIPT_URL` và secret riêng, trỏ tới Sheet/Drive staging.
- Production chỉ promote sau khi `npm test`, migration staging, backup staging và kiểm tra đăng nhập/phân quyền đều đạt.

## Giới hạn xác minh

Smoke test là kiểm tra tĩnh/local với upstream giả lập, không chứng minh môi trường production không có egress ngoài dự kiến. Muốn kết luận về egress cần log Vercel/Google Cloud, proxy hoặc firewall được tổ chức phê duyệt.
