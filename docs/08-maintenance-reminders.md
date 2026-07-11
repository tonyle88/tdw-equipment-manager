# Nhac Ke Hoach Bao Tri Qua Email

He thong chi gui email cho nguoi phu trach chinh va phu cua thiet bi, voi dieu kien User dang hoat dong va co email hop le. Email cong ty hoac email ca nhan deu duoc ho tro.

## Moc nhac mac dinh

- Con 7 ngay, 3 ngay, 1 ngay va dung ngay den han.
- Khi qua han: cu moi 7 ngay.
- Moi moc cua mot ke hoach chi gui mot lan cho moi dia chi email. Ket qua duoc luu trong tab `MaintenanceNotificationLogs`.

## Gui thu cong

1. Dang nhap bang tai khoan Admin.
2. Mo tab `Bao tri`.
3. Tai phan `Ke hoach bao tri`, chon `GUI NHAC EMAIL`.
4. Xac nhan hanh dong. He thong chi gui cac ke hoach dang den moc nhac trong ngay.

## Bat lich tu dong hang ngay

Sau khi cap nhat `google-apps-script/Code.gs` va deploy Web App moi:

1. Mo Apps Script Editor cua Google Sheet.
2. Chon ham `installMaintenancePlanReminderTrigger` trong danh sach ham.
3. Bam `Run` va chap thuan quyen gui email/quan ly trigger khi Google hoi.
4. Google Apps Script se kiem tra moi ngay trong khoang 08:00 theo mui gio cua Script Project.

Ham nay xoa trigger cu cung ten truoc khi tao trigger moi, nen co the chay lai khi can cap nhat.
