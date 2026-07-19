# Release Checklist

Thuc hien checklist nay truoc moi lan deploy TDW Equipment Manager.

## Truoc khi push

1. Chay `npm test` tai thu muc du an.
2. Kiem tra `git status --short` de chac chan chi co file lien quan trong commit.
3. Khong commit `.env`, `GOOGLE_SCRIPT_URL`, `APPS_SCRIPT_PROXY_SECRET`, `TDW_API_PROXY_SECRET`, `TDW_BOOTSTRAP_ADMIN_PASSWORD`, mat khau, token hay license key.

## Deploy Apps Script

1. Cap nhat `google-apps-script/Code.gs` neu backend co thay doi.
2. Chon `Deploy > Manage deployments > Edit > New version > Deploy`.
3. Kiem tra URL Web App dang dung trong bien `GOOGLE_SCRIPT_URL` cua Vercel.
4. Xac nhan `TDW_API_PROXY_SECRET` tren Apps Script trung voi `APPS_SCRIPT_PROXY_SECRET` cua dung moi truong Vercel.
5. Khi schema thay doi, chay `migrateSchema()` va kiem tra version trong `Kiem tra ket noi`.

## Deploy Vercel

1. Push commit da kiem tra len nhanh `main`.
2. Kiem tra deployment tren Vercel da dung commit moi nhat.
3. Xac nhan `GOOGLE_SCRIPT_URL` va `APPS_SCRIPT_PROXY_SECRET` co o Production va Preview; Preview phai dung backend staging rieng.

## Kiem tra sau deploy

1. Dang nhap bang admin.
2. Vao `CAU HINH` va chay `Kiem tra ket noi`.
3. Kiem tra Dashboard tai du lieu.
4. Thuc hien mot thao tac mau phu hop, sau do xem tab `AuditLogs` co dong nhat ky moi va khong co du lieu nhay cam.
5. Neu release co anh thiet bi, tai mot anh thu va xac nhan file nam trong thu muc Drive rieng, tab `MediaFiles` co metadata va QR mo dung thiet bi.
6. Chay backup thu, mo ban sao Sheet va it nhat mot anh trong thu muc `media` de kiem tra phuc hoi thuc te.

## Rollback

1. Neu frontend/proxy loi, promote deployment Vercel truoc do hoac redeploy commit truoc.
2. Neu Apps Script loi, chon phien ban Web App truoc do trong `Manage deployments` va deploy lai.
3. Ghi ro commit, thoi gian va nguyen nhan rollback vao ghi chu van hanh noi bo.
