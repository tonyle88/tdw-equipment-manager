# Google Apps Script Web App

Copy cac file trong thu muc nay vao Apps Script gan voi Google Sheet database cua TDW.

Sau khi deploy, mo Web app URL se hien giao dien TDW Equipment Manager truc tiep tren ha tang Google. App doc/ghi du lieu tu Google Sheet bang `google.script.run`, khong can chay local server.

## Files can tao trong Apps Script

```text
Code.gs
Index.html
Styles.html
Client.html
```

## Deploy

1. Mo Google Sheet database.
2. Extensions > Apps Script.
3. Tao/cap nhat 4 file: `Code.gs`, `Index.html`, `Styles.html`, `Client.html`.
4. Save tat ca file.
5. Deploy > New deployment.
6. Type: Web app.
7. Execute as: Me.
8. Who has access: Anyone with the link hoac tai khoan Google trong cong ty.
9. Copy Web app URL va mo trong trinh duyet.

## URL su dung

Mo app:

```text
https://script.google.com/macros/s/WEB_APP_ID/exec
```

Test API JSON:

```text
https://script.google.com/macros/s/WEB_APP_ID/exec?api=assets
```

Hoac:

```text
https://script.google.com/macros/s/WEB_APP_ID/exec?sheet=Assets
```

Ket qua dung se co dang:

```json
{
  "ok": true,
  "sheet": "Assets",
  "count": 72,
  "data": []
}
```
