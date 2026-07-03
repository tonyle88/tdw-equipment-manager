# Ke hoach trien khai TDW Equipment Manager

## Muc tieu

Xay dung ung dung quan ly tai san CNTT/noi bo cho TDW, lien ket Google Sheet lam database. Ung dung thay the cach quan ly Excel thu cong bang mot giao dien de tim kiem, loc, cap nhat tinh trang, bao tri va xuat bao cao.

## Pham vi giai doan

### Giai doan 1: Nen mong du lieu va prototype

- Chuan hoa cau truc du lieu tu file Excel hien tai.
- Tao schema Google Sheet.
- Tao seed data de test.
- Dung giao dien dashboard/danh sach thiet bi chay duoc tren browser.
- Chua yeu cau dang nhap va chua ghi nguoc Google Sheet.

### Giai doan 2: Ket noi Google Sheet

- Tao Google Sheet theo schema.
- Viet adapter doc du lieu tu Google Sheet.
- Them cau hinh Spreadsheet ID/API endpoint.
- Dong bo danh sach thiet bi len giao dien.

### Giai doan 3: Quan ly CRUD

- Them/sua thiet bi.
- Cap nhat tinh trang.
- Ghi lich su bao tri.
- Ghi lich su dieu chuyen.
- Validate du lieu dau vao.

### Giai doan 4: Bao cao va phan quyen

- Xuat bao cao theo phong ban, nhom thiet bi, tinh trang.
- Dashboard nang cao.
- Dang nhap Google.
- Phan quyen Admin, IT Manager, Viewer.

## Luong xu ly du lieu

1. Excel hien tai duoc doc va tach theo cac nhom thiet bi.
2. Moi dong thiet bi duoc gan `asset_id` va `asset_code`.
3. Cac ghi chu sua chua trong ten may/ghi chu se duoc tach dan sang `MaintenanceLogs` o cac giai doan sau.
4. Google Sheet la nguon du lieu chinh.
5. Ung dung web doc/ghi thong qua adapter.

## Nguyen tac thiet ke

- Giao dien uu tien thao tac hang ngay: tim nhanh, loc nhanh, sua nhanh.
- Google Sheet giu vai tro database de de backup va kiem tra thu cong.
- Ma tai san on dinh, khong phu thuoc vao STT Excel.
- Trang chi tiet thiet bi la noi gom lich su bao tri, dieu chuyen, phan mem va ghi chu.

