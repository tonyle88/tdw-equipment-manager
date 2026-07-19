# Google Apps Script API

Thư mục này chỉ chứa backend `Code.gs` liên kết Google Sheet/Drive. Frontend duy nhất được triển khai trên Vercel.

## Cấu hình bắt buộc

Trong `Project Settings > Script Properties`:

```text
TDW_API_PROXY_SECRET=<chuoi-ngau-nhien-toi-thieu-32-ky-tu>
TDW_BOOTSTRAP_ADMIN_PASSWORD=<chi-can-khi-tao-admin-dau-tien>
TDW_MEDIA_FOLDER_ID=<id-thu-muc-anh>
TDW_BACKUP_FOLDER_ID=<id-thu-muc-backup>
```

`TDW_API_PROXY_SECRET` phải trùng với biến `APPS_SCRIPT_PROXY_SECRET` trên Vercel. Không lưu các giá trị này trong Git.

Sau khi cập nhật và deploy Web App phiên bản mới, chạy thủ công `migrateSchema()`, rồi kiểm tra `backupSystemData()` trước khi cài lịch bằng `installDailyBackupTrigger()`.
