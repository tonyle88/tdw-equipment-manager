# Google Sheet Schema

Tao mot Google Sheet voi cac tab duoi day. Dong 1 la header, khong doi ten cot sau khi app da ket noi.

## Assets

```text
asset_id
asset_code
asset_name
asset_group
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
warranty_until
last_maintenance_date
next_check_date
note
source_row
created_at
updated_at
```

## Users

```text
user_id
full_name
title
department
phone
email
status
note
```

## Departments

```text
department_id
department_name
manager
location
note
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
```

## Settings

```text
setting_type
setting_value
display_name
sort_order
active
```

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
KHONG_SU_DUNG
LUU_KHO_THANH_LY
CAN_KIEM_TRA
```

