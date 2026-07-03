from __future__ import annotations

import csv
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = DATA_DIR / "google_sheet_import"

SHEETS = {
    "Assets": [
        "asset_id",
        "asset_code",
        "asset_name",
        "asset_group",
        "asset_group_label",
        "asset_type",
        "brand",
        "model",
        "serial_number",
        "purchase_year",
        "purchase_date",
        "quantity",
        "unit_price",
        "total_price",
        "assigned_to",
        "department",
        "location",
        "software_license",
        "status",
        "quality_level",
        "warranty_until",
        "last_maintenance_date",
        "next_check_date",
        "note",
        "source_row",
        "created_at",
        "updated_at",
    ],
    "Users": ["user_id", "full_name", "title", "department", "phone", "email", "status", "note"],
    "Departments": ["department_id", "department_name", "manager", "location", "note"],
    "MaintenanceLogs": [
        "log_id",
        "asset_id",
        "date",
        "action_type",
        "description",
        "cost",
        "vendor",
        "warranty_months",
        "performed_by",
        "note",
        "created_at",
    ],
    "SoftwareLicenses": [
        "license_id",
        "software_name",
        "version",
        "license_key_or_note",
        "assigned_asset_id",
        "assigned_user",
        "expiry_date",
        "status",
        "note",
    ],
    "InventoryMovements": [
        "movement_id",
        "asset_id",
        "movement_date",
        "from_user",
        "to_user",
        "from_location",
        "to_location",
        "reason",
        "approved_by",
        "note",
        "created_at",
    ],
    "Settings": ["setting_id", "setting_type", "setting_value", "display_name", "sort_order", "active"],
}

SETTINGS_ROWS = [
    ["asset_group_MAY_TINH_LAPTOP", "asset_group", "MAY_TINH_LAPTOP", "Máy tính - Laptop", 1, "TRUE"],
    ["asset_group_SCADA_LOGGER_DATA", "asset_group", "SCADA_LOGGER_DATA", "SCADA - Logger - Data TDW", 2, "TRUE"],
    ["asset_group_O_CUNG_THIET_BI_DIEN_TU", "asset_group", "O_CUNG_THIET_BI_DIEN_TU", "Ổ cứng - Thiết bị điện tử", 3, "TRUE"],
    [
        "asset_group_MAY_IN_PHOTOCOPY_MAY_CHIEU_TV_DIEN_THOAI",
        "asset_group",
        "MAY_IN_PHOTOCOPY_MAY_CHIEU_TV_DIEN_THOAI",
        "Máy in - Photocopy - Máy chiếu - TV - Điện thoại",
        4,
        "TRUE",
    ],
    ["asset_group_LUU_KHO_KEM_PHAM_CHAT", "asset_group", "LUU_KHO_KEM_PHAM_CHAT", "Thiết bị lưu kho - Kém phẩm chất", 5, "TRUE"],
    ["status_CON_SU_DUNG", "status", "CON_SU_DUNG", "Còn sử dụng", 1, "TRUE"],
    ["status_MOI_100", "status", "MOI_100", "Mới 100%", 2, "TRUE"],
    ["status_KEM_PHAM_CHAT", "status", "KEM_PHAM_CHAT", "Kém phẩm chất", 3, "TRUE"],
    ["status_CAN_KIEM_TRA", "status", "CAN_KIEM_TRA", "Cần kiểm tra", 4, "TRUE"],
    ["status_KHONG_SU_DUNG", "status", "KHONG_SU_DUNG", "Không sử dụng", 5, "TRUE"],
    ["status_LUU_KHO_THANH_LY", "status", "LUU_KHO_THANH_LY", "Lưu kho/thanh lý", 6, "TRUE"],
    ["asset_type_Laptop", "asset_type", "Laptop", "Laptop", 1, "TRUE"],
    ["asset_type_Desktop_PC", "asset_type", "Desktop PC", "Desktop PC", 2, "TRUE"],
    ["asset_type_Server_SCADA", "asset_type", "Server/SCADA", "Server/SCADA", 3, "TRUE"],
    ["asset_type_May_in", "asset_type", "Máy in", "Máy in", 4, "TRUE"],
    ["asset_type_O_cung", "asset_type", "Ổ cứng", "Ổ cứng", 5, "TRUE"],
    ["department_HCNS", "department", "HCNS", "Phòng HCNS", 1, "TRUE"],
    ["department_Ke_toan", "department", "Ke_toan", "Phòng Kế toán", 2, "TRUE"],
    ["department_KHKT", "department", "KHKT", "Phòng KHKT", 3, "TRUE"],
    ["department_San_xuat", "department", "San_xuat", "Phòng Sản xuất", 4, "TRUE"],
    ["software_OFFICE_2016", "software_name", "OFFICE 2016", "OFFICE 2016", 1, "TRUE"],
    ["software_OFFICE_2019", "software_name", "OFFICE 2019", "OFFICE 2019", 2, "TRUE"],
    ["software_WINDOW_10", "software_name", "WINDOW 10", "WINDOW 10", 3, "TRUE"],
    ["software_WINDOW_11", "software_name", "WINDOW 11", "WINDOW 11", 4, "TRUE"],
]


def read_assets():
    assets_path = DATA_DIR / "assets_seed.csv"
    with assets_path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_sheet_csv(name, headers, rows):
    path = OUTPUT_DIR / f"{name}.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)
    print(path)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    assets = read_assets()

    for name, headers in SHEETS.items():
      if name == "Assets":
          rows = [[asset.get(header, "") for header in headers] for asset in assets]
      elif name == "Settings":
          rows = SETTINGS_ROWS
      else:
          rows = []
      write_sheet_csv(name, headers, rows)


if __name__ == "__main__":
    main()
