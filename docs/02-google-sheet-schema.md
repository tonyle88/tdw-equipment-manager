# Google Sheet Schema

Tao mot Google Sheet voi cac tab duoi day. Dong 1 la header, khong doi ten cot sau khi app da ket noi.

Apps Script co the tu bo sung mot so cot thieu cho `Assets`, `Users`, `Settings`, nhung khi tao sheet moi nen tao dung header ben duoi de tranh lech du lieu.

## Assets

```text
asset_id
asset_code
asset_name
asset_group
asset_group_label
asset_type
brand
model
serial_number
purchase_year
purchase_date
quantity
unit_price
total_price
assigned_to
department
location
software_license
status
quality_level
warranty_end_date
last_maintenance_date
next_check_date
note
source_row
created_at
updated_at
deleted_at
deleted_by
```

## Settings

```text
setting_id
setting_type
setting_value
display_name
sort_order
active
```

Gia tri `setting_type` dang dung:

```text
asset_group
asset_type
department
software_name
status
```

## Users

```text
user_id
username
full_name
role
permissions
active
password_salt
password_hash
must_change_password
created_at
updated_at
last_login_at
```

Gia tri `role` hop le:

```text
admin
manager
user
viewer
```

## Departments

```text
department_id
department_name
manager
location
note
created_at
updated_at
```

## MaintenanceLogs

```text
log_id
asset_id
date
action_type
description
cost
vendor
warranty_months
performed_by
note
created_at
updated_at
```

## InventoryMovements

```text
movement_id
asset_id
movement_date
from_user
to_user
from_location
to_location
reason
approved_by
note
created_at
updated_at
```

## SoftwareLicenses

```text
license_id
software_name
version
license_key_or_note
assigned_asset_id
assigned_user
expiry_date
status
note
created_at
updated_at
```

`license_key_or_note` duoc Apps Script ma hoa khi luu. Du lieu tai ban dau chi co `license_key_masked`; key day du chi duoc tra ve theo yeu cau rieng cho Admin.

## AuditLogs

Tab nay duoc Apps Script tu tao khi phat sinh thao tac ghi du lieu dau tien.

```text
audit_id
created_at
actor_user_id
actor_username
action
entity_type
entity_id
entity_name
```

Nhat ky khong luu token, mat khau hay license key.

## Gia tri dropdown goi y

### asset_group

```text
MAY_TINH_LAPTOP
SCADA_LOGGER_DATA
O_CUNG_THIET_BI_DIEN_TU
MAY_IN_PHOTOCOPY_MAY_CHIEU_TV_DIEN_THOAI
LUU_KHO_KEM_PHAM_CHAT
```

### status

```text
CON_SU_DUNG
MOI_100
KEM_PHAM_CHAT
CAN_KIEM_TRA
KHONG_SU_DUNG
LUU_KHO_THANH_LY
```

## Ghi chu bao mat

- Khong nhap mat khau thuan vao sheet `Users`.
- User moi nen duoc tao tu man hinh Quan ly nguoi dung de he thong sinh `password_salt` va `password_hash`.
- Admin dau tien chi duoc bootstrap khi chua co admin dang hoat dong va Apps Script da co Script Property `TDW_BOOTSTRAP_ADMIN_PASSWORD`.
