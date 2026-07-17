# Anh thiet bi, anh bao tri va QR

## Luu tru

- Frontend chuyen JPEG, PNG va WebP sang WebP, canh dai toi da 1600 px, chat luong 82%.
- Moi thiet bi va moi lan bao tri co toi da 4 anh; moi file WebP phai nho hon 2 MB.
- Apps Script luu file trong thu muc Drive rieng `TDW Equipment Manager Media`.
- Tab `MediaFiles` chi luu metadata. File Drive khong duoc chia se cong khai.
- Anh duoc doc qua API sau khi xac thuc token va kiem tra quyen module.

## QR va deep-link

QR chua URL Vercel theo mau `/?asset=<asset_id>`. Neu chua dang nhap, user dang nhap truoc; sau do ung dung tu mo popup ho so dung thiet bi. QR khong chua serial, gia, bao hanh hay thong tin nguoi dung.

## Deploy

1. Cap nhat `google-apps-script/Code.gs` trong Apps Script.
2. Deploy mot Web App version moi, chon chay voi quyen cua chu so huu script.
3. Chap nhan quyen Google Drive neu Google yeu cau.
4. Push frontend va proxy len Vercel.
5. Dang nhap admin, them mot anh thu, mo lightbox va quet QR.
6. Kiem tra tab `MediaFiles`, thu muc Drive va `AuditLogs`.

Khong doi thu muc Drive sang che do cong khai hoac `Anyone with the link`.
