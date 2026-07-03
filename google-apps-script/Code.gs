const SHEET_NAMES = {
  assets: "Assets",
  users: "Users",
  departments: "Departments",
  maintenanceLogs: "MaintenanceLogs",
  softwareLicenses: "SoftwareLicenses",
  inventoryMovements: "InventoryMovements",
  settings: "Settings",
};

function doGet(event) {
  try {
    if (!event.parameter.api && !event.parameter.sheet) {
      return HtmlService.createTemplateFromFile("Index")
        .evaluate()
        .setTitle("TDW Equipment Manager")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const sheetName = (event.parameter.sheet || SHEET_NAMES.assets).trim();
    const rows = readSheetAsObjects_(sheetName);
    return jsonResponse_({
      ok: true,
      sheet: sheetName,
      count: rows.length,
      data: rows,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getAssets() {
  return {
    ok: true,
    sheet: SHEET_NAMES.assets,
    data: readSheetAsObjects_(SHEET_NAMES.assets),
    updated_at: new Date().toISOString(),
  };
}

function getSettings() {
  return {
    ok: true,
    sheet: SHEET_NAMES.settings,
    data: readSheetAsObjects_(SHEET_NAMES.settings),
    updated_at: new Date().toISOString(),
  };
}

function getAppData() {
  return {
    ok: true,
    assets: readSheetAsObjects_(SHEET_NAMES.assets),
    settings: readSheetAsObjects_(SHEET_NAMES.settings),
    updated_at: new Date().toISOString(),
  };
}

function saveAsset(asset) {
  try {
    const normalized = normalizeAsset_(asset || {});
    const saved = upsertObject_(SHEET_NAMES.assets, "asset_id", normalized);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteAsset(assetId) {
  try {
    if (!assetId) throw new Error("Missing asset_id");
    const sheet = getSheet_(SHEET_NAMES.assets);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map((header) => String(header).trim());
    const keyIndex = headers.indexOf("asset_id");
    if (keyIndex === -1) throw new Error("Missing asset_id column");

    const rowIndex = values.findIndex((row, index) => index > 0 && row[keyIndex] === assetId);
    if (rowIndex < 1) throw new Error("Không tìm thấy thiết bị để xóa");
    sheet.deleteRow(rowIndex + 1);
    return { ok: true, asset_id: assetId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveSetting(setting) {
  try {
    const normalized = normalizeSetting_(setting || {});
    const saved = upsertObject_(SHEET_NAMES.settings, "setting_id", normalized);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteSetting(settingId) {
  try {
    if (!settingId) throw new Error("Missing setting_id");
    const sheet = getSheet_(SHEET_NAMES.settings);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map((header) => String(header).trim());
    const keyIndex = headers.indexOf("setting_id");
    if (keyIndex === -1) throw new Error("Missing setting_id column");
    const rowIndex = values.findIndex((row, index) => index > 0 && row[keyIndex] === settingId);
    if (rowIndex < 1) throw new Error("Không tìm thấy cấu hình để xóa");
    sheet.deleteRow(rowIndex + 1);
    return { ok: true, setting_id: settingId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function doPost(event) {
  try {
    const body = JSON.parse(event.postData.contents || "{}");
    const action = body.action;
    const args = body.args || [];

    if (action === "saveAsset" || action === "upsertAsset") {
      return jsonResponse_(saveAsset(args[0] || body.asset || {}));
    }
    if (action === "deleteAsset") {
      return jsonResponse_(deleteAsset(args[0] || body.asset_id || ""));
    }
    if (action === "saveSetting") {
      return jsonResponse_(saveSetting(args[0] || body.setting || {}));
    }
    if (action === "deleteSetting") {
      return jsonResponse_(deleteSetting(args[0] || body.setting_id || ""));
    }

    throw new Error("Unsupported action");
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message });
  }
}

function readSheetAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  ensureSheetHeaders_(sheetName, sheet);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map((header) => String(header).trim());
  return values
    .slice(1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row, index) => {
      const item = {};
      headers.forEach((header, colIndex) => {
        item[header] = row[colIndex] || "";
      });
      if (!item.source_row) item.source_row = index + 2;
      return item;
    });
}

function upsertObject_(sheetName, keyField, object) {
  const sheet = getSheet_(sheetName);
  ensureSheetHeaders_(sheetName, sheet);
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0].map((header) => String(header).trim());
  const keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) throw new Error(`Missing key field: ${keyField}`);

  if (!object[keyField]) {
    object[keyField] = Utilities.getUuid();
  }

  object.updated_at = new Date().toISOString();
  const row = headers.map((header) => object[header] || "");
  const existingIndex = values.findIndex((valueRow, index) => index > 0 && valueRow[keyIndex] === object[keyField]);

  if (existingIndex >= 1) {
    sheet.getRange(existingIndex + 1, 1, 1, headers.length).setValues([row]);
  } else {
    object.created_at = object.created_at || object.updated_at;
    sheet.appendRow(headers.map((header) => object[header] || ""));
  }

  return object;
}

function normalizeAsset_(asset) {
  const now = new Date().toISOString();
  const normalized = Object.assign({}, asset);
  normalized.asset_id = normalized.asset_id || Utilities.getUuid();
  normalized.asset_name = String(normalized.asset_name || "").trim();
  if (!normalized.asset_name) throw new Error("Tên thiết bị là bắt buộc");
  normalized.asset_group = normalized.asset_group || "MAY_TINH_LAPTOP";
  normalized.asset_group_label = normalized.asset_group_label || groupLabel_(normalized.asset_group);
  normalized.status = normalized.status || "CON_SU_DUNG";
  normalized.quantity = normalized.quantity || "1";
  normalized.purchase_year = normalized.purchase_year || "";
  normalized.asset_type = normalized.asset_type || "";
  normalized.brand = normalized.brand || "";
  normalized.updated_at = now;
  normalized.created_at = normalized.created_at || now;
  normalized.asset_code = normalized.asset_code || nextAssetCode_(normalized.asset_group, normalized.purchase_year);
  return normalized;
}

function normalizeSetting_(setting) {
  const normalized = Object.assign({}, setting);
  const type = String(normalized.setting_type || "").trim();
  const value = String(normalized.setting_value || "").trim();
  if (!type) throw new Error("Loại cấu hình là bắt buộc");
  if (!value) throw new Error("Giá trị cấu hình là bắt buộc");
  normalized.setting_id = normalized.setting_id || `${type}_${Utilities.getUuid()}`;
  normalized.setting_type = type;
  normalized.setting_value = value;
  normalized.display_name = String(normalized.display_name || value).trim();
  normalized.sort_order = normalized.sort_order || "999";
  normalized.active = normalized.active || "TRUE";
  return normalized;
}

function groupLabel_(groupCode) {
  const labels = {
    MAY_TINH_LAPTOP: "Máy tính - Laptop",
    SCADA_LOGGER_DATA: "SCADA - Logger - Data TDW",
    O_CUNG_THIET_BI_DIEN_TU: "Ổ cứng - Thiết bị điện tử",
    MAY_IN_PHOTOCOPY_MAY_CHIEU_TV_DIEN_THOAI: "Máy in - Photocopy - Máy chiếu - TV - Điện thoại",
    LUU_KHO_KEM_PHAM_CHAT: "Thiết bị lưu kho - Kém phẩm chất",
  };
  return labels[groupCode] || groupCode || "";
}

function groupPrefix_(groupCode) {
  const prefixes = {
    MAY_TINH_LAPTOP: "LAP",
    SCADA_LOGGER_DATA: "SCA",
    O_CUNG_THIET_BI_DIEN_TU: "DEV",
    MAY_IN_PHOTOCOPY_MAY_CHIEU_TV_DIEN_THOAI: "PRN",
    LUU_KHO_KEM_PHAM_CHAT: "STO",
  };
  return prefixes[groupCode] || "AST";
}

function nextAssetCode_(groupCode, year) {
  const prefix = groupPrefix_(groupCode);
  const codeYear = String(year || new Date().getFullYear()).replace(/\D/g, "") || String(new Date().getFullYear());
  const rows = readSheetAsObjects_(SHEET_NAMES.assets);
  const nextNumber =
    rows.filter((row) => String(row.asset_code || "").startsWith(`TDW-${prefix}-`)).length + 1;
  return `TDW-${prefix}-${codeYear}-${String(nextNumber).padStart(3, "0")}`;
}

function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  return sheet;
}

function ensureSheetHeaders_(sheetName, sheet) {
  if (sheetName !== SHEET_NAMES.settings) return;
  const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const headers = firstRow.map((header) => String(header).trim()).filter(Boolean);
  if (headers.indexOf("setting_id") !== -1) return;
  const desired = ["setting_id", "setting_type", "setting_value", "display_name", "sort_order", "active"];
  if (!headers.length) {
    sheet.getRange(1, 1, 1, desired.length).setValues([desired]);
    return;
  }
  sheet.insertColumnBefore(1);
  sheet.getRange(1, 1).setValue("setting_id");
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const values = sheet.getRange(2, 2, lastRow - 1, Math.max(sheet.getLastColumn() - 1, 1)).getValues();
    const ids = values.map((row, index) => {
      const type = row[0] || "setting";
      const value = row[1] || index + 1;
      return [`${type}_${value}_${index + 1}`.replace(/[^A-Za-z0-9_]/g, "_")];
    });
    sheet.getRange(2, 1, ids.length, 1).setValues(ids);
  }
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
