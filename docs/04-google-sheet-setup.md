# Giai doan 2: Ket noi Google Sheet

## Ket qua cua giai doan nay

- App co the doc du lieu tu Google Sheet thong qua Google Apps Script Web App.
- Khi chua co endpoint, app tu dong dung `data/assets_seed.json`.
- Co bo CSV de import nhanh cac tab Google Sheet.
- Co backend Apps Script mau trong `google-apps-script/Code.gs`.

## Buoc 1: Tao Google Sheet database

Tao Google Sheet moi, dat ten goi y:

```text
TDW Equipment Manager Database
```

Tao cac tab:

```text
Assets
Users
Departments
MaintenanceLogs
SoftwareLicenses
InventoryMovements
Settings
```

## Buoc 2: Import CSV

Thu muc CSV da tao:

```text
data/google_sheet_import/
```

Import tung file vao tab cung ten:

```text
Assets.csv -> Assets
Users.csv -> Users
Departments.csv -> Departments
MaintenanceLogs.csv -> MaintenanceLogs
SoftwareLicenses.csv -> SoftwareLicenses
InventoryMovements.csv -> InventoryMovements
Settings.csv -> Settings
```

`Assets.csv` co 72 thiet bi tu file Excel mau. Cac tab con lai co header san de dung cho giai doan sau.

## Buoc 3: Tao Apps Script endpoint

Trong Google Sheet:

1. Chon Extensions > Apps Script.
2. Dan noi dung file `google-apps-script/Code.gs`.
3. Deploy > New deployment.
4. Type: Web app.
5. Execute as: Me.
6. Who has access: Anyone with the link hoac tai khoan Google trong cong ty.
7. Copy Web app URL.

Test endpoint:

```text
https://script.google.com/macros/s/WEB_APP_ID/exec?sheet=Assets
```

Neu dung se tra ve JSON co `ok: true`, `count`, va `data`.

## Buoc 4: Cau hinh app doc Google Sheet

Mo file:

```text
app/config.js
```

Doi thanh:

```js
window.TDW_ASSET_CONFIG = {
  dataSource: "google-sheet",
  googleSheetApiUrl: "https://script.google.com/macros/s/WEB_APP_ID/exec",
  localSeedUrl: "../data/assets_seed.json",
};
```

Reload app:

```text
http://127.0.0.1:8000/app/index.html
```

Neu thanh trang thai hien `Google Sheet` la app dang doc tu Google Sheet. Neu endpoint loi, app se fallback ve `Local seed`.

