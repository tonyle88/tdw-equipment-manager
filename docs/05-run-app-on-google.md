# Chay TDW Equipment Manager truc tiep tren Google Sheet

Muc tieu: khong can chay local server `127.0.0.1`. App se chay bang Google Apps Script Web App va doc du lieu truc tiep tu Google Sheet.

## 1. Chuan bi Google Sheet

Trong Google Sheet database, can co cac tab:

```text
Assets
Users
Departments
MaintenanceLogs
SoftwareLicenses
InventoryMovements
Settings
```

Neu chua co du lieu, import cac file CSV trong:

```text
data/google_sheet_import/
```

Quan trong nhat:

```text
Assets.csv
Settings.csv
```

## 2. Tao source Apps Script

Mo Google Sheet > `Extensions` > `Apps Script`.

Tao/cap nhat 4 file dung ten:

```text
Code.gs
Index.html
Styles.html
Client.html
```

Noi dung lay tu thu muc:

```text
google-apps-script/
```

## 3. Deploy Web App

Trong Apps Script:

1. Bam `Save`.
2. Bam `Deploy` > `New deployment`.
3. Chon type `Web app`.
4. `Execute as`: `Me`.
5. `Who has access`: chon nguoi duoc phep dung app.
6. Bam `Deploy`.
7. Cap quyen truy cap Google Sheet neu Google hoi.
8. Copy `Web app URL`.

Mo URL dang:

```text
https://script.google.com/macros/s/WEB_APP_ID/exec
```

Day chinh la app TDW Equipment Manager chay tren Google.

## 4. Cap nhat source sau nay

Neu sua code trong Apps Script, can deploy lai:

```text
Deploy > Manage deployments > Edit > Version: New version > Deploy
```

Neu khong tao `New version`, URL cu co the van chay code cu.

## 5. Chuc nang hien co

- Dashboard tong quan.
- Danh sach thiet bi hien 9 dong/trang.
- Phan trang khi vuot qua 9 thiet bi.
- Thiet bi moi them hien o dau danh sach.
- Loc theo nhom, tinh trang va tim kiem.
- Them thiet bi moi vao tab `Assets`.
- Sua thiet bi dang co.
- Xoa thiet bi khoi tab `Assets`.
- Trang `Thiet bi` dung de quan ly danh sach va chi tiet.
- Trang `Bao tri` hien cac thiet bi can theo doi va bieu do tinh trang can xu ly.
- Trang `Bao cao` thong ke theo nhom/tinh trang, co bieu do thanh.
- Xuat bao cao dang CSV de mo bang Excel.
- Xuat PDF bang lenh in cua trinh duyet.
- Trang `Cau hinh` quan ly dropdown: phong ban, tinh trang, loai thiet bi, phan mem, nhom thiet bi.

Neu tab `Settings` cu chua co cot `setting_id`, Apps Script se tu them cot nay khi chay. Neu tao Google Sheet moi, nen import lai `data/google_sheet_import/Settings.csv` moi nhat.

## 6. Test nhanh API

Mo:

```text
https://script.google.com/macros/s/WEB_APP_ID/exec?api=assets
```

Ket qua dung:

```json
{
  "ok": true,
  "sheet": "Assets",
  "data": []
}
```
