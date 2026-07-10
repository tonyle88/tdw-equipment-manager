# TDW Equipment Manager

Ứng dụng quản lý máy tính, máy in, màn hình, ổ cứng và thiết bị nội bộ cho TDW.

Ứng dụng gồm 2 phần:

- `app/`: giao diện web deploy lên Vercel.
- `google-apps-script/`: backend chạy trong Google Apps Script, liên kết Google Sheet.

## Tính năng chính

- Dashboard tổng quan thiết bị.
- Bộ lọc theo nhóm, năm, bộ phận, tình trạng.
- Danh sách thiết bị có phân trang.
- Thêm, sửa, xóa thiết bị.
- Trang Bảo trì.
- Trang Báo cáo có biểu đồ và xuất CSV/PDF.
- Trang Cấu hình quản lý dropdown: phòng ban, tình trạng, loại thiết bị, phần mềm.
- Đăng nhập trước khi vào app.
- Admin quản lý user: thêm, sửa, khóa, reset mật khẩu và phân quyền.

## Deploy lên Vercel

Xem hướng dẫn chi tiết tại:

```text
docs/06-github-vercel-deploy.md
```

Checklist truoc va sau deploy:

```text
docs/07-release-checklist.md
```

## Cấu trúc

```text
app/                  Giao diện web chạy trên Vercel
api/                  Vercel serverless proxy gọi Apps Script
data/                 Dữ liệu seed/import từ Excel
docs/                 Tài liệu triển khai
google-apps-script/   Backend Apps Script cho Google Sheet
tools/                Script import/convert dữ liệu
```
