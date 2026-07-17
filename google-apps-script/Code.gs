const SHEET_NAMES = {
  assets: "Assets",
  users: "Users",
  departments: "Departments",
  maintenanceLogs: "MaintenanceLogs",
  maintenancePlans: "MaintenancePlans",
  maintenanceNotificationLogs: "MaintenanceNotificationLogs",
  softwareLicenses: "SoftwareLicenses",
  inventoryMovements: "InventoryMovements",
  assetResponsibles: "AssetResponsibles",
  mediaFiles: "MediaFiles",
  settings: "Settings",
  auditLogs: "AuditLogs",
};

const AUDIT_LOG_HEADERS = ["audit_id", "created_at", "actor_user_id", "actor_username", "action", "entity_type", "entity_id", "entity_name"];
const MAINTENANCE_REMINDER_DAYS = [7, 3, 1, 0];
const MAINTENANCE_OVERDUE_REMINDER_INTERVAL_DAYS = 7;

const LEGACY_PERMISSION_PRESETS = {
  view: ["overview.view", "assets.view", "maintenance.view", "movement.view", "software.view", "reports.view", "settings.view"],
  edit: ["overview.view", "assets.view", "assets.manage", "assets.delete", "maintenance.view", "maintenance.manage", "movement.view", "movement.manage", "software.view", "software.manage", "reports.view"],
  report: ["overview.view", "assets.view", "reports.view", "reports.assets.export"],
  "reports.export": ["reports.assets.export"],
};

const MODULE_PERMISSION_CODES = [
  "assets.view", "assets.manage", "assets.delete",
  "maintenance.view", "maintenance.manage", "maintenance.delete",
  "movement.view", "movement.manage",
  "software.view", "software.manage", "software.delete",
  "reports.view", "reports.assets.export", "reports.maintenance.export", "reports.software.export", "reports.movement.export",
];

const ASSET_HEADERS = [
  "asset_id", "asset_code", "asset_name", "asset_group", "asset_group_label", "asset_type", "brand", "serial_number",
  "purchase_year", "quantity", "unit_price", "location", "assigned_to", "department", "warranty_end_date",
  "last_maintenance_date", "software_license", "status", "note", "created_at", "updated_at", "deleted_at", "deleted_by",
];

const HEALTH_CHECK_HEADERS = {
  Assets: ASSET_HEADERS,
  Users: ["user_id", "username", "email", "role", "active"],
  Departments: ["department_id", "department_name"],
  MaintenanceLogs: ["log_id", "asset_id", "date"],
  MaintenancePlans: ["plan_id", "asset_id", "frequency", "next_due_date"],
  SoftwareLicenses: ["license_id", "software_name"],
  InventoryMovements: ["movement_id", "asset_id", "movement_date"],
  AssetResponsibles: ["responsibility_id", "asset_id", "user_id", "responsibility_role"],
  MediaFiles: ["media_id", "owner_type", "owner_id", "asset_id", "drive_file_id"],
  Settings: ["setting_id", "setting_type", "setting_value", "display_name"],
};

function doGet(event) {
  try {
    if (!event.parameter.api && !event.parameter.sheet) {
      return HtmlService.createTemplateFromFile("Index")
        .evaluate()
        .setTitle("TDW Equipment Manager")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const user = requireAuth_(event.parameter.token || "");
    const sheetName = (event.parameter.sheet || SHEET_NAMES.assets).trim();
    const rows = getReadableSheetRows_(user, sheetName);
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

function getReadableSheetRows_(user, sheetName) {
  if (sheetName === SHEET_NAMES.assets && hasPermission_(user, "assets.view")) return readActiveAssets_();
  if (sheetName === SHEET_NAMES.assetResponsibles && hasPermission_(user, "assets.view")) return readActiveAssetResponsibles_();
  if (sheetName === SHEET_NAMES.maintenanceLogs && hasPermission_(user, "maintenance.view")) return readSheetAsObjects_(SHEET_NAMES.maintenanceLogs);
  if (sheetName === SHEET_NAMES.maintenancePlans && hasPermission_(user, "maintenance.view")) return readSheetAsObjects_(SHEET_NAMES.maintenancePlans);
  if (sheetName === SHEET_NAMES.inventoryMovements && hasPermission_(user, "movement.view")) return readSheetAsObjects_(SHEET_NAMES.inventoryMovements);
  if (sheetName === SHEET_NAMES.softwareLicenses && hasPermission_(user, "software.view")) return readSheetAsObjects_(SHEET_NAMES.softwareLicenses).map(publicSoftwareLicense_);
  if ([SHEET_NAMES.settings, SHEET_NAMES.departments].indexOf(sheetName) !== -1) return readSheetAsObjects_(sheetName);
  throw new Error("Không có quyền đọc sheet này");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getAssets() {
  return {
    ok: true,
    sheet: SHEET_NAMES.assets,
    data: readActiveAssets_(),
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

function getAppData(token) {
  const user = requireAuth_(token);
  return {
    ok: true,
    assets: hasPermission_(user, "assets.view") ? readActiveAssets_() : [],
    settings: readSheetAsObjects_(SHEET_NAMES.settings),
    departments: readSheetAsObjects_(SHEET_NAMES.departments),
    assetResponsibles: hasPermission_(user, "assets.view") ? readActiveAssetResponsibles_() : [],
    responsibleUsers: hasPermission_(user, "assets.view") ? readUsers_().filter(isNotificationReadyUser_).map(publicResponsibleUser_) : [],
    maintenanceLogs: hasPermission_(user, "maintenance.view") ? readSheetAsObjects_(SHEET_NAMES.maintenanceLogs) : [],
    maintenancePlans: hasPermission_(user, "maintenance.view") ? readSheetAsObjects_(SHEET_NAMES.maintenancePlans) : [],
    inventoryMovements: hasPermission_(user, "movement.view") ? readSheetAsObjects_(SHEET_NAMES.inventoryMovements) : [],
    softwareLicenses: hasPermission_(user, "software.view") ? readSheetAsObjects_(SHEET_NAMES.softwareLicenses).map(publicSoftwareLicense_) : [],
    mediaFiles: readableMediaFiles_(user),
    currentUser: publicUser_(user),
    updated_at: new Date().toISOString(),
  };
}

function readableMediaFiles_(user) {
  const activeAssetIds = new Set(readActiveAssets_().map((asset) => asset.asset_id));
  return readSheetAsObjects_(SHEET_NAMES.mediaFiles)
    .filter((item) => activeAssetIds.has(item.asset_id))
    .filter((item) => (item.owner_type === "ASSET" && hasPermission_(user, "assets.view")) || (item.owner_type === "MAINTENANCE" && hasPermission_(user, "maintenance.view")))
    .map(publicMediaFile_);
}

function publicMediaFile_(item) {
  return {
    media_id: item.media_id,
    owner_type: item.owner_type,
    owner_id: item.owner_id,
    asset_id: item.asset_id,
    file_name: item.file_name,
    mime_type: item.mime_type,
    sort_order: item.sort_order,
    created_at: item.created_at,
  };
}

function publicSoftwareLicense_(license) {
  const result = Object.assign({}, license);
  const key = decodeLicenseKey_(result.license_key_or_note || "");
  delete result.license_key_or_note;
  result.license_key_masked = maskLicenseKey_(key);
  return result;
}

function maskLicenseKey_(key) {
  if (!key) return "Chưa có";
  return String(key).length > 4 ? `••••-••••-${String(key).slice(-4)}` : "••••";
}

function getSoftwareLicenseKey(licenseId, token) {
  try {
    const admin = requireAdmin_(token);
    if (!licenseId) throw new Error("Missing license_id");
    const license = readSheetAsObjects_(SHEET_NAMES.softwareLicenses)
      .find((item) => item.license_id === licenseId);
    if (!license) throw new Error("Không tìm thấy bản quyền phần mềm");
    logAudit_(admin, "LICENSE_KEY_VIEWED", "software_license", licenseId, license.software_name);
    return {
      ok: true,
      license_id: licenseId,
      license_key: decodeLicenseKey_(license.license_key_or_note || ""),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function healthCheck(token) {
  try {
    const user = requireAdmin_(token);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = Object.entries(HEALTH_CHECK_HEADERS).map(([name, requiredHeaders]) => {
      const sheet = spreadsheet.getSheetByName(name);
      if (!sheet) {
        return { name, exists: false, headers: [], missing: requiredHeaders };
      }
      const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
        .getDisplayValues()[0]
        .map((header) => String(header).trim())
        .filter(Boolean);
      return {
        name,
        exists: true,
        headers,
        missing: requiredHeaders.filter((header) => !headers.includes(header)),
      };
    });
    return {
      ok: true,
      healthy: sheets.every((sheet) => sheet.exists && sheet.missing.length === 0),
      checked_by: user.username,
      checked_at: new Date().toISOString(),
      sheets,
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveAsset(asset) {
  try {
    const actor = requirePermission_(arguments[1] || "", "assets.manage");
    const action = asset && asset.asset_id ? "ASSET_UPDATED" : "ASSET_CREATED";
    const hasResponsibles = Object.prototype.hasOwnProperty.call(asset || {}, "responsibles");
    const normalized = normalizeAsset_(asset || {});
    const previousResponsibles = hasResponsibles ? readActiveAssetResponsibles_(normalized.asset_id) : [];
    const responsibles = hasResponsibles ? normalizeAssetResponsibles_(asset.responsibles, normalized.asset_id) : [];
    delete normalized.responsibles;
    const saved = upsertObject_(SHEET_NAMES.assets, "asset_id", normalized);
    if (hasResponsibles) {
      replaceAssetResponsibles_(saved.asset_id, responsibles);
      if (responsibilitiesSignature_(previousResponsibles) !== responsibilitiesSignature_(responsibles)) {
        logAudit_(actor, "ASSET_RESPONSIBLES_UPDATED", "asset", saved.asset_id, saved.asset_name);
      }
    }
    logAudit_(actor, action, "asset", saved.asset_id, saved.asset_name);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteAsset(assetId) {
  try {
    const user = requirePermission_(arguments[1] || "", "assets.delete");
    if (!assetId) throw new Error("Missing asset_id");
    const asset = readSheetAsObjects_(SHEET_NAMES.assets).find((item) => item.asset_id === assetId);
    if (!asset) throw new Error("Không tìm thấy thiết bị để xóa");
    asset.deleted_at = new Date().toISOString();
    asset.deleted_by = user ? user.username : "";
    upsertObject_(SHEET_NAMES.assets, "asset_id", asset);
    logAudit_(user, "ASSET_DELETED", "asset", assetId, asset.asset_name);
    return { ok: true, asset_id: assetId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// ==========================================
// THIẾT LẬP HỆ THỐNG
// ==========================================

function encodeLicenseKey_(text) {
  if (!text) return "";
  try {
    const b64 = Utilities.base64Encode(text, Utilities.Charset.UTF_8);
    return "ENC:" + b64.split('').reverse().join('');
  } catch(e) { return text; }
}

function decodeLicenseKey_(encoded) {
  if (!encoded || typeof encoded !== "string" || !encoded.startsWith("ENC:")) return encoded;
  try {
    const b64 = encoded.substring(4).split('').reverse().join('');
    const decoded = Utilities.base64Decode(b64);
    return Utilities.newBlob(decoded).getDataAsString();
  } catch(e) { return encoded; }
}

function saveSetting(setting, token) {
  try {
    const actor = requireAdmin_(token || "");
    const action = setting && setting.setting_id ? "SETTING_UPDATED" : "SETTING_CREATED";
    const normalized = normalizeSetting_(setting || {});
    const saved = upsertObject_(SHEET_NAMES.settings, "setting_id", normalized);
    logAudit_(actor, action, "setting", saved.setting_id, saved.display_name);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteSetting(settingId) {
  try {
    const actor = requireAdmin_(arguments[1] || "");
    if (!settingId) throw new Error("Missing setting_id");
    const sheet = getSheet_(SHEET_NAMES.settings);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map((header) => String(header).trim());
    const keyIndex = headers.indexOf("setting_id");
    if (keyIndex === -1) throw new Error("Missing setting_id column");
    const rowIndex = values.findIndex((row, index) => index > 0 && row[keyIndex] === settingId);
    if (rowIndex < 1) throw new Error("Không tìm thấy cấu hình để xóa");
    const nameIndex = headers.indexOf("display_name");
    const settingName = nameIndex >= 0 ? String(values[rowIndex][nameIndex] || "") : "";
    sheet.deleteRow(rowIndex + 1);
    logAudit_(actor, "SETTING_DELETED", "setting", settingId, settingName);
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

    if (action === "loginUser") {
      return jsonResponse_(loginUser(args[0] || body.credentials || {}));
    }
    if (action === "currentUser") {
      return jsonResponse_(currentUser(args[0] || body.token || ""));
    }
    if (action === "logoutUser") {
      return jsonResponse_(logoutUser(args[0] || body.token || ""));
    }
    if (action === "getAppData") {
      return jsonResponse_(getAppData(args[0] || body.token || ""));
    }
    if (action === "getSoftwareLicenseKey") {
      return jsonResponse_(getSoftwareLicenseKey(args[0] || body.license_id || "", args[1] || body.token || ""));
    }
    if (action === "healthCheck") {
      return jsonResponse_(healthCheck(args[0] || body.token || ""));
    }
    if (action === "saveAsset" || action === "upsertAsset") {
      return jsonResponse_(saveAsset(args[0] || body.asset || {}, args[1] || body.token || ""));
    }
    if (action === "deleteAsset") {
      return jsonResponse_(deleteAsset(args[0] || body.asset_id || "", args[1] || body.token || ""));
    }
    if (action === "saveMaintenanceLog") {
      return jsonResponse_(saveMaintenanceLog(args[0] || body.log || {}, args[1] || body.token || ""));
    }
    if (action === "deleteMaintenanceLog") {
      const logId = args[0] && typeof args[0] === "object" ? args[0].logId : args[0] || body.logId || "";
      return jsonResponse_(deleteMaintenanceLog(logId, args[1] || body.token || ""));
    }
    if (action === "saveMaintenancePlan") {
      return jsonResponse_(saveMaintenancePlan(args[0] || body.plan || {}, args[1] || body.token || ""));
    }
    if (action === "saveMaintenancePlans") {
      return jsonResponse_(saveMaintenancePlans(args[0] || body.plans || [], args[1] || body.token || ""));
    }
    if (action === "deleteMaintenancePlan") {
      const planId = args[0] && typeof args[0] === "object" ? args[0].planId : args[0] || body.planId || "";
      return jsonResponse_(deleteMaintenancePlan(planId, args[1] || body.token || ""));
    }
    if (action === "saveMediaFile") {
      return jsonResponse_(saveMediaFile(args[0] || body.media || {}, args[1] || body.token || ""));
    }
    if (action === "getMediaFile") {
      return jsonResponse_(getMediaFile(args[0] || body.media_id || "", args[1] || body.token || ""));
    }
    if (action === "deleteMediaFile") {
      return jsonResponse_(deleteMediaFile(args[0] || body.media_id || "", args[1] || body.token || ""));
    }
    if (action === "sendMaintenancePlanReminders") {
      return jsonResponse_(sendMaintenancePlanReminders(args[0] || body.token || ""));
    }
    if (action === "saveMovementLog") {
      return jsonResponse_(saveMovementLog(args[0] || body.log || {}, args[1] || body.token || ""));
    }
    if (action === "saveSoftwareLicense") {
      return jsonResponse_(saveSoftwareLicense(args[0] || body.license || {}, args[1] || body.token || ""));
    }
    if (action === "deleteSoftwareLicense") {
      const licenseId = args[0] && typeof args[0] === "object" ? args[0].licenseId : args[0] || body.licenseId || "";
      return jsonResponse_(deleteSoftwareLicense(licenseId, args[1] || body.token || ""));
    }
    if (action === "saveSetting") {
      return jsonResponse_(saveSetting(args[0] || body.setting || {}, args[1] || body.token || ""));
    }
    if (action === "deleteSetting") {
      return jsonResponse_(deleteSetting(args[0] || body.setting_id || "", args[1] || body.token || ""));
    }
    if (action === "saveDepartment") {
      return jsonResponse_(saveDepartment(args[0] || body.department || {}, args[1] || body.token || ""));
    }
    if (action === "deleteDepartment") {
      return jsonResponse_(deleteDepartment(args[0] || body.department_id || "", args[1] || body.token || ""));
    }
    if (action === "listUsers") {
      return jsonResponse_(listUsers(args[0] || body.token || ""));
    }
    if (action === "saveUser") {
      return jsonResponse_(saveUser(args[0] || body.user || {}, args[1] || body.token || ""));
    }
    if (action === "deleteUser") {
      return jsonResponse_(deleteUser(args[0] || body.user_id || "", args[1] || body.token || ""));
    }
    if (action === "resetUserPassword") {
      return jsonResponse_(resetUserPassword(args[0] || body.user_id || "", args[1] || body.new_password || "", args[2] || body.token || ""));
    }
    if (action === "changeOwnPassword") {
      return jsonResponse_(changeOwnPassword(args[0] || body.new_password || "", args[1] || body.token || ""));
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

function readActiveAssets_() {
  return readSheetAsObjects_(SHEET_NAMES.assets).filter((asset) => !String(asset.deleted_at || "").trim());
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
  normalized.serial_number = normalized.serial_number || "";
  normalized.location = normalized.location || "";
  normalized.warranty_end_date = normalized.warranty_end_date || "";
  normalized.unit_price = normalized.unit_price || "";
  normalized.last_maintenance_date = normalized.last_maintenance_date || "";
  normalized.updated_at = now;
  normalized.created_at = normalized.created_at || now;
  normalized.asset_code = normalized.asset_code || nextAssetCode_(normalized.asset_group, normalized.purchase_year);
  return normalized;
}

function normalizeAssetResponsibles_(responsibles, assetId) {
  if (!Array.isArray(responsibles)) throw new Error("Danh sách người phụ trách không hợp lệ");
  const seenUserIds = new Set();
  const normalized = responsibles.map((item) => {
    const userId = String(item.user_id || "").trim();
    const role = String(item.responsibility_role || "").trim().toLowerCase();
    if (!userId || ["primary", "secondary"].indexOf(role) === -1) throw new Error("Người phụ trách không hợp lệ");
    if (seenUserIds.has(userId)) throw new Error("Một user chỉ được chọn một lần cho mỗi thiết bị");
    seenUserIds.add(userId);
    const user = findUserById_(userId);
    if (!isNotificationReadyUser_(user)) throw new Error("Người phụ trách phải đang hoạt động và có email hợp lệ");
    return {
      responsibility_id: Utilities.getUuid(),
      asset_id: assetId,
      user_id: userId,
      responsibility_role: role,
      active: "TRUE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
  const primaryCount = normalized.filter((item) => item.responsibility_role === "primary").length;
  if (primaryCount > 1) throw new Error("Mỗi thiết bị chỉ có một người phụ trách chính");
  if (normalized.length && primaryCount !== 1) throw new Error("Cần chọn một người phụ trách chính trước khi thêm người phụ trách phụ");
  return normalized;
}

function readActiveAssetResponsibles_(assetId) {
  return readSheetAsObjects_(SHEET_NAMES.assetResponsibles)
    .filter((item) => String(item.active || "TRUE").toUpperCase() !== "FALSE")
    .filter((item) => !assetId || item.asset_id === assetId);
}

function replaceAssetResponsibles_(assetId, responsibles) {
  const sheet = getSheet_(SHEET_NAMES.assetResponsibles);
  ensureSheetHeaders_(SHEET_NAMES.assetResponsibles, sheet);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map((header) => String(header).trim());
  const assetIndex = headers.indexOf("asset_id");
  for (let index = values.length - 1; index > 0; index -= 1) {
    if (values[index][assetIndex] === assetId) sheet.deleteRow(index + 1);
  }
  responsibles.forEach((responsibility) => upsertObject_(SHEET_NAMES.assetResponsibles, "responsibility_id", responsibility));
}

function responsibilitiesSignature_(responsibles) {
  return responsibles
    .map((item) => `${item.user_id}:${item.responsibility_role}`)
    .sort()
    .join(",");
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

function saveMaintenanceLog(log, token) {
  try {
    const actor = requirePermission_(token || "", "maintenance.manage");
    const action = log && log.log_id ? "MAINTENANCE_UPDATED" : "MAINTENANCE_CREATED";
    const normalized = normalizeMaintenanceLog_(log || {});
    const saved = upsertObject_(SHEET_NAMES.maintenanceLogs, "log_id", normalized);
    logAudit_(actor, action, "maintenance_log", saved.log_id, saved.action_type || saved.asset_id);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function normalizeMaintenanceLog_(log) {
  const now = new Date().toISOString();
  const normalized = Object.assign({}, log);
  normalized.log_id = normalized.log_id || Utilities.getUuid();
  normalized.asset_id = String(normalized.asset_id || "").trim();
  if (!normalized.asset_id) throw new Error("Thiếu asset_id cho log bảo trì");
  if (!normalized.action_type) throw new Error("Thiếu action_type cho log bảo trì");
  
  normalized.date = normalized.date || now.split("T")[0];
  normalized.action_type = normalized.action_type || "";
  normalized.description = normalized.description || "";
  normalized.cost = normalized.cost || "";
  normalized.vendor = normalized.vendor || "";
  normalized.warranty_months = normalized.warranty_months || "";
  normalized.performed_by = normalized.performed_by || "";
  normalized.note = normalized.note || "";
  normalized.created_at = normalized.created_at || now;
  return normalized;
}

function deleteMaintenanceLog(logId, token) {
  try {
    const actor = requirePermission_(token || "", "maintenance.delete");
    const deleted = deleteObject_(SHEET_NAMES.maintenanceLogs, "log_id", logId);
    if (deleted) deleteMediaForOwner_("MAINTENANCE", logId);
    if (deleted) logAudit_(actor, "MAINTENANCE_DELETED", "maintenance_log", logId, logId);
    return { ok: deleted, deleted_id: logId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveMaintenancePlan(plan, token) {
  try {
    const actor = requirePermission_(token || "", "maintenance.manage");
    const action = plan && plan.plan_id ? "MAINTENANCE_PLAN_UPDATED" : "MAINTENANCE_PLAN_CREATED";
    const normalized = normalizeMaintenancePlan_(plan || {});
    const saved = upsertObject_(SHEET_NAMES.maintenancePlans, "plan_id", normalized);
    logAudit_(actor, action, "maintenance_plan", saved.plan_id, saved.title || saved.asset_id);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveMaintenancePlans(plans, token) {
  try {
    const actor = requirePermission_(token || "", "maintenance.manage");
    if (!Array.isArray(plans) || !plans.length) throw new Error("Danh sách kế hoạch bảo trì đang trống");
    if (plans.length > 200) throw new Error("Mỗi lần chỉ được tạo tối đa 200 kế hoạch bảo trì");
    const activeAssets = readActiveAssets_();
    const normalizedPlans = plans.map((plan) => {
      if (plan && plan.plan_id) throw new Error("Tạo hàng loạt không hỗ trợ cập nhật kế hoạch đã có");
      return normalizeMaintenancePlan_(plan || {}, activeAssets);
    });
    const sheet = getSheet_(SHEET_NAMES.maintenancePlans);
    ensureSheetHeaders_(SHEET_NAMES.maintenancePlans, sheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((header) => String(header).trim());
    const now = new Date().toISOString();
    normalizedPlans.forEach((plan) => {
      plan.created_at = plan.created_at || now;
      plan.updated_at = now;
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, normalizedPlans.length, headers.length)
      .setValues(normalizedPlans.map((plan) => headers.map((header) => plan[header] || "")));
    logAudit_(actor, "MAINTENANCE_PLANS_CREATED", "maintenance_plan", "", `${normalizedPlans.length} kế hoạch`);
    return { ok: true, created: normalizedPlans.length, data: normalizedPlans, updated_at: now };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function normalizeMaintenancePlan_(plan, activeAssets) {
  const now = new Date().toISOString();
  const normalized = Object.assign({}, plan);
  const frequencies = ["MONTHLY", "QUARTERLY", "YEARLY"];
  normalized.plan_id = normalized.plan_id || Utilities.getUuid();
  normalized.asset_id = String(normalized.asset_id || "").trim();
  normalized.title = String(normalized.title || "").trim();
  normalized.frequency = String(normalized.frequency || "").trim().toUpperCase();
  normalized.next_due_date = normalizeIsoDate_(normalized.next_due_date);
  if (!normalized.asset_id) throw new Error("Thiếu thiết bị cho kế hoạch bảo trì");
  if (!(activeAssets || readActiveAssets_()).some((asset) => asset.asset_id === normalized.asset_id)) throw new Error("Thiết bị của kế hoạch không tồn tại hoặc đã bị xóa");
  if (!normalized.title) throw new Error("Nội dung kế hoạch là bắt buộc");
  if (frequencies.indexOf(normalized.frequency) === -1) throw new Error("Chu kỳ bảo trì không hợp lệ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.next_due_date)) throw new Error("Ngày đến hạn phải có định dạng YYYY-MM-DD");
  normalized.note = String(normalized.note || "").trim();
  normalized.active = String(normalized.active || "TRUE").toUpperCase() === "FALSE" ? "FALSE" : "TRUE";
  normalized.created_at = normalized.created_at || now;
  return normalized;
}

function deleteMaintenancePlan(planId, token) {
  try {
    const actor = requirePermission_(token || "", "maintenance.delete");
    const deleted = deleteObject_(SHEET_NAMES.maintenancePlans, "plan_id", planId);
    if (deleted) logAudit_(actor, "MAINTENANCE_PLAN_DELETED", "maintenance_plan", planId, planId);
    return { ok: deleted, deleted_id: planId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveMediaFile(payload, token) {
  try {
    const media = payload || {};
    const ownerType = String(media.owner_type || "").trim().toUpperCase();
    const permission = ownerType === "ASSET" ? "assets.manage" : ownerType === "MAINTENANCE" ? "maintenance.manage" : "";
    if (!permission) throw new Error("Loại ảnh không hợp lệ");
    const actor = requirePermission_(token || "", permission);
    const ownerId = String(media.owner_id || "").trim();
    const assetId = String(media.asset_id || "").trim();
    if (!ownerId || !assetId) throw new Error("Thiếu thông tin liên kết ảnh");
    if (ownerType === "ASSET" && ownerId !== assetId) throw new Error("Liên kết ảnh thiết bị không hợp lệ");
    if (!readActiveAssets_().some((asset) => asset.asset_id === assetId)) throw new Error("Thiết bị không tồn tại hoặc đã bị xóa");
    if (ownerType === "MAINTENANCE" && !readSheetAsObjects_(SHEET_NAMES.maintenanceLogs).some((log) => log.log_id === ownerId && log.asset_id === assetId)) {
      throw new Error("Lịch sử bảo trì không hợp lệ");
    }
    const existing = readSheetAsObjects_(SHEET_NAMES.mediaFiles).filter((item) => item.owner_type === ownerType && item.owner_id === ownerId);
    if (existing.length >= 4) throw new Error("Mỗi mục chỉ được lưu tối đa 4 ảnh");
    if (String(media.mime_type || "") !== "image/webp") throw new Error("Ảnh phải được chuyển sang WebP trước khi tải lên");
    const bytes = Utilities.base64Decode(String(media.data_base64 || ""));
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new Error("Ảnh WebP phải nhỏ hơn 2 MB");

    const mediaId = Utilities.getUuid();
    const fileName = `${ownerType.toLowerCase()}-${ownerId}-${mediaId}.webp`;
    const file = getMediaFolder_().createFile(Utilities.newBlob(bytes, "image/webp", fileName));
    const saved = upsertObject_(SHEET_NAMES.mediaFiles, "media_id", {
      media_id: mediaId,
      owner_type: ownerType,
      owner_id: ownerId,
      asset_id: assetId,
      drive_file_id: file.getId(),
      file_name: fileName,
      mime_type: "image/webp",
      sort_order: String(existing.length + 1),
      created_by: actor.username,
      created_at: new Date().toISOString(),
    });
    logAudit_(actor, "MEDIA_CREATED", "media_file", saved.media_id, fileName);
    return { ok: true, data: publicMediaFile_(saved) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function getMediaFile(mediaId, token) {
  try {
    const user = requireAuth_(token || "");
    const media = readSheetAsObjects_(SHEET_NAMES.mediaFiles).find((item) => item.media_id === mediaId);
    if (!media) throw new Error("Không tìm thấy ảnh");
    const permission = media.owner_type === "MAINTENANCE" ? "maintenance.view" : "assets.view";
    if (!hasPermission_(user, permission)) throw new Error("Không có quyền xem ảnh này");
    assertMediaOwnerExists_(media);
    const blob = DriveApp.getFileById(media.drive_file_id).getBlob();
    return { ok: true, media_id: mediaId, mime_type: "image/webp", data_base64: Utilities.base64Encode(blob.getBytes()) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteMediaFile(mediaId, token) {
  try {
    const media = readSheetAsObjects_(SHEET_NAMES.mediaFiles).find((item) => item.media_id === mediaId);
    if (!media) throw new Error("Không tìm thấy ảnh");
    const permission = media.owner_type === "MAINTENANCE" ? "maintenance.manage" : "assets.manage";
    const actor = requirePermission_(token || "", permission);
    assertMediaOwnerExists_(media);
    DriveApp.getFileById(media.drive_file_id).setTrashed(true);
    deleteObject_(SHEET_NAMES.mediaFiles, "media_id", mediaId);
    logAudit_(actor, "MEDIA_DELETED", "media_file", mediaId, media.file_name || mediaId);
    return { ok: true, deleted_id: mediaId };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function assertMediaOwnerExists_(media) {
  if (!readActiveAssets_().some((asset) => asset.asset_id === media.asset_id)) {
    throw new Error("Thiết bị chứa ảnh không tồn tại hoặc đã bị xóa");
  }
  if (media.owner_type === "MAINTENANCE" && !readSheetAsObjects_(SHEET_NAMES.maintenanceLogs).some((log) => log.log_id === media.owner_id && log.asset_id === media.asset_id)) {
    throw new Error("Lịch sử bảo trì chứa ảnh không còn tồn tại");
  }
  if (["ASSET", "MAINTENANCE"].indexOf(media.owner_type) === -1) throw new Error("Loại ảnh không hợp lệ");
}

function getMediaFolder_() {
  const properties = PropertiesService.getScriptProperties();
  const configuredValue = String(properties.getProperty("TDW_MEDIA_FOLDER_ID") || "").trim();
  if (configuredValue) {
    const folderId = normalizeMediaFolderId_(configuredValue);
    try {
      const folder = DriveApp.getFolderById(folderId);
      if (configuredValue !== folderId) properties.setProperty("TDW_MEDIA_FOLDER_ID", folderId);
      return folder;
    } catch (error) {
      throw new Error("Không truy cập được thư mục ảnh. Hãy cấp quyền Editor cho tài khoản sở hữu Apps Script hoặc kiểm tra TDW_MEDIA_FOLDER_ID");
    }
  }
  const folder = DriveApp.createFolder("TDW Equipment Manager Media");
  properties.setProperty("TDW_MEDIA_FOLDER_ID", folder.getId());
  return folder;
}

function normalizeMediaFolderId_(value) {
  const text = String(value || "").trim();
  const urlMatch = text.match(/\/folders\/([A-Za-z0-9_-]+)/);
  const folderId = urlMatch ? urlMatch[1] : text;
  if (!/^[A-Za-z0-9_-]{10,}$/.test(folderId)) throw new Error("TDW_MEDIA_FOLDER_ID phải là ID hoặc URL thư mục Google Drive");
  return folderId;
}

function checkMediaFolderConfiguration() {
  const folder = getMediaFolder_();
  const result = { ok: true, folder_id: folder.getId(), folder_name: folder.getName(), folder_url: folder.getUrl() };
  console.log(JSON.stringify(result));
  return result;
}

function deleteMediaForOwner_(ownerType, ownerId) {
  readSheetAsObjects_(SHEET_NAMES.mediaFiles)
    .filter((item) => item.owner_type === ownerType && item.owner_id === ownerId)
    .forEach((item) => {
      try { DriveApp.getFileById(item.drive_file_id).setTrashed(true); } catch (error) { console.warn(error.message); }
      deleteObject_(SHEET_NAMES.mediaFiles, "media_id", item.media_id);
    });
}

function sendMaintenancePlanReminders(token) {
  try {
    const admin = requireAdmin_(token || "");
    const result = sendDueMaintenancePlanReminders_();
    logAudit_(admin, "MAINTENANCE_REMINDERS_SENT", "maintenance_plan", "", `${result.sent} email`);
    return Object.assign({ ok: true }, result);
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function runMaintenancePlanReminders() {
  return sendDueMaintenancePlanReminders_();
}

function installMaintenancePlanReminderTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "runMaintenancePlanReminders")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("runMaintenancePlanReminders").timeBased().everyDays(1).atHour(8).create();
  return { ok: true, message: "Đã cài lịch kiểm tra email nhắc bảo trì hằng ngày" };
}

function sendDueMaintenancePlanReminders_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("Hệ thống đang gửi email nhắc, vui lòng thử lại sau ít phút");
  try {
    return sendDueMaintenancePlanRemindersUnlocked_();
  } finally {
    lock.releaseLock();
  }
}

function sendDueMaintenancePlanRemindersUnlocked_() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const assetsById = {};
  readActiveAssets_().forEach((asset) => { assetsById[asset.asset_id] = asset; });
  const usersById = {};
  readUsers_().filter(isNotificationReadyUser_).forEach((user) => { usersById[user.user_id] = user; });
  const responsiblesByAsset = {};
  readActiveAssetResponsibles_().forEach((responsibility) => {
    if (!responsiblesByAsset[responsibility.asset_id]) responsiblesByAsset[responsibility.asset_id] = [];
    responsiblesByAsset[responsibility.asset_id].push(responsibility);
  });

  const sentSignatures = new Set(readSheetAsObjects_(SHEET_NAMES.maintenanceNotificationLogs)
    .filter((item) => item.status === "SENT")
    .map((item) => maintenanceNotificationSignature_(item.plan_id, item.recipient_email, item.notification_type, item.due_date)));
  const result = { checked: 0, sent: 0, skipped: 0, failed: 0, today };

  readSheetAsObjects_(SHEET_NAMES.maintenancePlans)
    .filter((plan) => String(plan.active || "TRUE").toUpperCase() !== "FALSE")
    .forEach((plan) => {
      const dueDate = normalizeIsoDate_(plan.next_due_date);
      const notificationType = maintenanceReminderType_(dueDate, today);
      if (!notificationType) return;
      result.checked += 1;
      const reminderPlan = Object.assign({}, plan, { next_due_date: dueDate });
      const asset = assetsById[plan.asset_id];
      const recipients = (responsiblesByAsset[plan.asset_id] || [])
        .map((responsibility) => usersById[responsibility.user_id])
        .filter(Boolean);
      if (!asset || !recipients.length) {
        result.skipped += 1;
        return;
      }
      recipients.forEach((recipient) => {
        const signature = maintenanceNotificationSignature_(reminderPlan.plan_id, recipient.email, notificationType, reminderPlan.next_due_date);
        if (sentSignatures.has(signature)) {
          result.skipped += 1;
          return;
        }
        try {
          MailApp.sendEmail({
            to: recipient.email,
            subject: `[TDW] Nhắc bảo trì: ${asset.asset_name}`,
            body: maintenanceReminderText_(asset, reminderPlan, notificationType),
            htmlBody: maintenanceReminderHtml_(recipient, asset, reminderPlan, notificationType),
            name: "TDW Equipment Manager",
          });
          writeMaintenanceNotificationLog_(reminderPlan, recipient.email, notificationType, "SENT", "");
          sentSignatures.add(signature);
          result.sent += 1;
        } catch (error) {
          writeMaintenanceNotificationLog_(reminderPlan, recipient.email, notificationType, "FAILED", error.message);
          result.failed += 1;
        }
      });
    });
  return result;
}

function maintenanceReminderType_(dueDate, today) {
  const daysUntil = daysBetweenIsoDates_(today, dueDate);
  if (MAINTENANCE_REMINDER_DAYS.indexOf(daysUntil) !== -1) return `DUE_${daysUntil}`;
  if (daysUntil < 0 && Math.abs(daysUntil) % MAINTENANCE_OVERDUE_REMINDER_INTERVAL_DAYS === 0) return `OVERDUE_${Math.abs(daysUntil)}`;
  return "";
}

function daysBetweenIsoDates_(fromDate, toDate) {
  const from = String(fromDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const to = String(toDate || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!from || !to) return NaN;
  const fromTime = Date.UTC(Number(from[1]), Number(from[2]) - 1, Number(from[3]));
  const toTime = Date.UTC(Number(to[1]), Number(to[2]) - 1, Number(to[3]));
  return Math.round((toTime - fromTime) / 86400000);
}

function normalizeIsoDate_(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return text;
  const vietnamese = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!vietnamese) return text;
  return `${vietnamese[3]}-${String(vietnamese[2]).padStart(2, "0")}-${String(vietnamese[1]).padStart(2, "0")}`;
}

function maintenanceNotificationSignature_(planId, email, type, dueDate) {
  return [planId, String(email || "").toLowerCase(), type, dueDate].join("|");
}

function maintenanceReminderText_(asset, plan, notificationType) {
  return `TDW Equipment Manager\n\nNhắc bảo trì: ${asset.asset_name}\nMã tài sản: ${asset.asset_code || "Chưa có"}\nNội dung: ${plan.title}\nNgày đến hạn: ${formatIsoDate_(plan.next_due_date)}\nTrạng thái: ${maintenanceReminderStatus_(notificationType)}\n\nVui lòng kiểm tra và cập nhật lịch sử bảo trì sau khi thực hiện.`;
}

function maintenanceReminderHtml_(recipient, asset, plan, notificationType) {
  return `<div style="font-family:Arial,sans-serif;color:#17202a;line-height:1.55"><h2 style="color:#176fa6">Nhắc bảo trì thiết bị TDW</h2><p>Chào ${escapeHtml_(recipient.full_name || recipient.username)},</p><p>Thiết bị sau cần được theo dõi:</p><table style="border-collapse:collapse"><tr><td style="padding:4px 12px 4px 0;color:#64748b">Thiết bị</td><td><strong>${escapeHtml_(asset.asset_name)}</strong></td></tr><tr><td style="padding:4px 12px 4px 0;color:#64748b">Mã tài sản</td><td>${escapeHtml_(asset.asset_code || "Chưa có")}</td></tr><tr><td style="padding:4px 12px 4px 0;color:#64748b">Nội dung</td><td>${escapeHtml_(plan.title)}</td></tr><tr><td style="padding:4px 12px 4px 0;color:#64748b">Đến hạn</td><td><strong>${escapeHtml_(formatIsoDate_(plan.next_due_date))}</strong></td></tr><tr><td style="padding:4px 12px 4px 0;color:#64748b">Trạng thái</td><td>${escapeHtml_(maintenanceReminderStatus_(notificationType))}</td></tr></table><p>Vui lòng kiểm tra và cập nhật lịch sử bảo trì sau khi thực hiện.</p></div>`;
}

function formatIsoDate_(value) {
  const match = normalizeIsoDate_(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "");
}

function maintenanceReminderStatus_(type) {
  if (String(type).indexOf("OVERDUE_") === 0) return "Đã quá hạn";
  const days = String(type).replace("DUE_", "");
  return days === "0" ? "Đến hạn hôm nay" : `Còn ${days} ngày đến hạn`;
}

function writeMaintenanceNotificationLog_(plan, email, type, status, error) {
  upsertObject_(SHEET_NAMES.maintenanceNotificationLogs, "notification_id", {
    notification_id: Utilities.getUuid(),
    plan_id: plan.plan_id,
    asset_id: plan.asset_id,
    recipient_email: email,
    notification_type: type,
    due_date: plan.next_due_date,
    sent_at: new Date().toISOString(),
    status,
    error: String(error || "").slice(0, 500),
  });
}

function escapeHtml_(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function saveMovementLog(log, token) {
  try {
    const actor = requirePermission_(token || "", "movement.manage");
    const action = log && log.movement_id ? "MOVEMENT_UPDATED" : "MOVEMENT_CREATED";
    const normalized = normalizeMovementLog_(log || {});
    const saved = upsertObject_(SHEET_NAMES.inventoryMovements, "movement_id", normalized);

    // Tự động cập nhật tài sản
    if (saved.asset_id && saved.to_user) {
      const assets = readActiveAssets_();
      const asset = assets.find(a => a.asset_id === saved.asset_id);
      if (asset) {
        asset.assigned_to = saved.to_user;
        if (saved.to_location) asset.location = saved.to_location;
        upsertObject_(SHEET_NAMES.assets, "asset_id", asset);
      }
    }
    logAudit_(actor, action, "inventory_movement", saved.movement_id, saved.asset_id);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function normalizeMovementLog_(log) {
  const now = new Date().toISOString();
  const normalized = Object.assign({}, log);
  normalized.movement_id = normalized.movement_id || Utilities.getUuid();
  normalized.asset_id = String(normalized.asset_id || "").trim();
  if (!normalized.asset_id) throw new Error("Thiếu asset_id");
  normalized.movement_date = normalized.movement_date || now.split("T")[0];
  normalized.from_user = normalized.from_user || "";
  normalized.to_user = normalized.to_user || "";
  normalized.from_location = normalized.from_location || "";
  normalized.to_location = normalized.to_location || "";
  normalized.reason = normalized.reason || "";
  normalized.approved_by = normalized.approved_by || "";
  normalized.note = normalized.note || "";
  normalized.created_at = normalized.created_at || now;
  return normalized;
}

function saveSoftwareLicense(license, token) {
  try {
    const actor = requirePermission_(token || "", "software.manage");
    const action = license && license.license_id ? "LICENSE_UPDATED" : "LICENSE_CREATED";
    const normalized = normalizeSoftwareLicense_(license || {});
    const saved = upsertObject_(SHEET_NAMES.softwareLicenses, "license_id", normalized);
    logAudit_(actor, action, "software_license", saved.license_id, saved.software_name);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function normalizeSoftwareLicense_(license) {
  const normalized = Object.assign({}, license);
  normalized.license_id = normalized.license_id || Utilities.getUuid();
  normalized.software_name = String(normalized.software_name || "").trim();
  if (!normalized.software_name) throw new Error("Tên phần mềm là bắt buộc");
  normalized.version = normalized.version || "";
  
  const existing = normalized.license_id
    ? readSheetAsObjects_(SHEET_NAMES.softwareLicenses).find((item) => item.license_id === normalized.license_id)
    : null;
  const licenseKey = String(normalized.license_key || "");
  normalized.license_key_or_note = licenseKey
    ? encodeLicenseKey_(licenseKey)
    : existing ? existing.license_key_or_note || "" : "";
  delete normalized.license_key;

  normalized.assigned_asset_id = normalized.assigned_asset_id || "";
  normalized.assigned_user = normalized.assigned_user || "";
  normalized.expiry_date = normalized.expiry_date || "";
  if (!normalized.status) normalized.status = "ACTIVE";
  normalized.note = normalized.note || "";
  return normalized;
}

function deleteSoftwareLicense(licenseId, token) {
  try {
    const actor = requirePermission_(token || "", "software.delete");
    const deleted = deleteObject_(SHEET_NAMES.softwareLicenses, "license_id", licenseId);
    if (deleted) logAudit_(actor, "LICENSE_DELETED", "software_license", licenseId, licenseId);
    return { ok: deleted, deleted_id: licenseId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveDepartment(department, token) {
  try {
    const actor = requireAdmin_(token || "");
    const action = department && department.department_id ? "DEPARTMENT_UPDATED" : "DEPARTMENT_CREATED";
    const normalized = normalizeDepartment_(department || {});
    const saved = upsertObject_(SHEET_NAMES.departments, "department_id", normalized);
    logAudit_(actor, action, "department", saved.department_id, saved.department_name);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function normalizeDepartment_(department) {
  const normalized = Object.assign({}, department);
  normalized.department_id = normalized.department_id || Utilities.getUuid();
  normalized.department_name = String(normalized.department_name || "").trim();
  if (!normalized.department_name) throw new Error("Tên phòng ban là bắt buộc");
  normalized.manager = normalized.manager || "";
  normalized.location = normalized.location || "";
  normalized.note = normalized.note || "";
  return normalized;
}

function deleteDepartment(departmentId, token) {
  try {
    const actor = requireAdmin_(token || "");
    if (!departmentId) throw new Error("Missing department_id");
    const sheet = getSheet_(SHEET_NAMES.departments);
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map((header) => String(header).trim());
    const keyIndex = headers.indexOf("department_id");
    if (keyIndex === -1) throw new Error("Missing department_id column");
    const rowIndex = values.findIndex((row, index) => index > 0 && row[keyIndex] === departmentId);
    if (rowIndex < 1) throw new Error("Không tìm thấy phòng ban để xóa");
    const nameIndex = headers.indexOf("department_name");
    const departmentName = nameIndex >= 0 ? String(values[rowIndex][nameIndex] || "") : "";
    sheet.deleteRow(rowIndex + 1);
    logAudit_(actor, "DEPARTMENT_DELETED", "department", departmentId, departmentName);
    return { ok: true, department_id: departmentId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
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
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet && [SHEET_NAMES.users, SHEET_NAMES.assetResponsibles, SHEET_NAMES.maintenancePlans, SHEET_NAMES.maintenanceNotificationLogs, SHEET_NAMES.mediaFiles].indexOf(sheetName) !== -1) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  return sheet;
}

function logAudit_(actor, action, entityType, entityId, entityName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAMES.auditLogs);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAMES.auditLogs);
      sheet.getRange(1, 1, 1, AUDIT_LOG_HEADERS.length).setValues([AUDIT_LOG_HEADERS]);
    }
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
      .getDisplayValues()[0]
      .map((header) => String(header).trim());
    if (AUDIT_LOG_HEADERS.some((header) => !headers.includes(header))) {
      throw new Error("AuditLogs thiếu cột bắt buộc");
    }
    const entry = {
      audit_id: Utilities.getUuid(),
      created_at: new Date().toISOString(),
      actor_user_id: actor ? actor.user_id : "",
      actor_username: actor ? actor.username : "system",
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
    };
    sheet.appendRow(headers.map((header) => entry[header] || ""));
  } catch (error) {
    console.error(`Không thể ghi AuditLogs: ${error.message}`);
  }
}

function ensureSheetHeaders_(sheetName, sheet) {
  if (sheetName === SHEET_NAMES.users) {
    ensureUsersSheet_(sheet);
    return;
  }
  if (sheetName === SHEET_NAMES.assets) {
    ensureAssetsSheet_(sheet);
    return;
  }
  if (sheetName === SHEET_NAMES.assetResponsibles) {
    ensureAssetResponsiblesSheet_(sheet);
    return;
  }
  if (sheetName === SHEET_NAMES.maintenancePlans) {
    ensureMaintenancePlansSheet_(sheet);
    return;
  }
  if (sheetName === SHEET_NAMES.maintenanceNotificationLogs) {
    ensureMaintenanceNotificationLogsSheet_(sheet);
    return;
  }
  if (sheetName === SHEET_NAMES.mediaFiles) {
    ensureMediaFilesSheet_(sheet);
    return;
  }
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

function ensureAssetsSheet_(sheet) {
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((header) => String(header).trim()).filter(Boolean);
  if (!headers.length) {
    sheet.getRange(1, 1, 1, ASSET_HEADERS.length).setValues([ASSET_HEADERS]);
    return;
  }
  ASSET_HEADERS.forEach((header) => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function ensureAssetResponsiblesSheet_(sheet) {
  const desired = ["responsibility_id", "asset_id", "user_id", "responsibility_role", "active", "created_at", "updated_at"];
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((header) => String(header).trim()).filter(Boolean);
  if (!headers.length) {
    sheet.getRange(1, 1, 1, desired.length).setValues([desired]);
    return;
  }
  desired.forEach((header) => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function ensureMaintenancePlansSheet_(sheet) {
  const desired = ["plan_id", "asset_id", "title", "frequency", "next_due_date", "note", "active", "created_at", "updated_at"];
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((header) => String(header).trim()).filter(Boolean);
  if (!headers.length) {
    sheet.getRange(1, 1, 1, desired.length).setValues([desired]);
    return;
  }
  desired.forEach((header) => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function ensureMaintenanceNotificationLogsSheet_(sheet) {
  const desired = ["notification_id", "plan_id", "asset_id", "recipient_email", "notification_type", "due_date", "sent_at", "status", "error", "created_at", "updated_at"];
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((header) => String(header).trim()).filter(Boolean);
  if (!headers.length) {
    sheet.getRange(1, 1, 1, desired.length).setValues([desired]);
    return;
  }
  desired.forEach((header) => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function ensureMediaFilesSheet_(sheet) {
  const desired = ["media_id", "owner_type", "owner_id", "asset_id", "drive_file_id", "file_name", "mime_type", "sort_order", "created_by", "created_at", "updated_at"];
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((header) => String(header).trim()).filter(Boolean);
  if (!headers.length) {
    sheet.getRange(1, 1, 1, desired.length).setValues([desired]);
    return;
  }
  desired.forEach((header) => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function loginUser(credentials) {
  try {
    const username = String(credentials.username || "").trim().toLowerCase();
    const password = String(credentials.password || "");
    if (!username || !password) throw new Error("Vui lòng nhập tài khoản và mật khẩu");
    enforceLoginThrottle_(username);

    ensureUsersReady_();
    const user = findUserByUsername_(username);
    if (!user || String(user.active || "TRUE").toUpperCase() === "FALSE") throwInvalidLogin_(username);
    if (hashPassword_(password, user.password_salt) !== user.password_hash) throwInvalidLogin_(username);

    user.last_login_at = new Date().toISOString();
    upsertObject_(SHEET_NAMES.users, "user_id", user);

    const token = Utilities.getUuid() + Utilities.getUuid();
    CacheService.getScriptCache().put(`session_${token}`, user.user_id, 21600);
    clearLoginFailures_(username);
    return { ok: true, token, user: publicUser_(user), updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function logoutUser(token) {
  if (token) CacheService.getScriptCache().remove(`session_${token}`);
  return { ok: true };
}

function currentUser(token) {
  try {
    return { ok: true, user: publicUser_(requireAuth_(token)) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function listUsers(token) {
  try {
    requireAdmin_(token);
    return { ok: true, users: readUsers_().map(publicUser_) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveUser(user, token) {
  try {
    const actor = requireAdmin_(token);
    const existing = user && user.user_id ? findUserById_(user.user_id) : null;
    if (user && user.user_id && !existing) throw new Error("Không tìm thấy user để cập nhật");
    const action = existing ? "USER_UPDATED" : "USER_CREATED";
    const normalized = normalizeUser_(existing ? Object.assign({}, existing, user || {}) : user || {});
    if (existing && normalized.username !== existing.username) throw new Error("Tên tài khoản không được phép thay đổi");
    const duplicate = readUsers_().find((item) => item.username === normalized.username && item.user_id !== normalized.user_id);
    if (duplicate) throw new Error("Tên đăng nhập đã tồn tại");
    const duplicateEmail = normalized.email && readUsers_().find((item) => String(item.email || "").trim().toLowerCase() === normalized.email && item.user_id !== normalized.user_id);
    if (duplicateEmail) throw new Error("Email này đã được dùng cho user khác");
    assertUserCanRemainResponsible_(normalized);
    const saved = upsertObject_(SHEET_NAMES.users, "user_id", normalized);
    logAudit_(actor, action, "user", saved.user_id, saved.username);
    return { ok: true, data: publicUser_(saved), updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteUser(userId, token) {
  try {
    const admin = requireAdmin_(token);
    if (!userId) throw new Error("Missing user_id");
    if (userId === admin.user_id) throw new Error("Không thể xóa chính tài khoản đang đăng nhập");
    const user = findUserById_(userId);
    if (!user) throw new Error("Không tìm thấy user");
    assertUserCanRemainResponsible_(Object.assign({}, user, { active: "FALSE" }));
    user.active = "FALSE";
    upsertObject_(SHEET_NAMES.users, "user_id", user);
    logAudit_(admin, "USER_DISABLED", "user", userId, user.username);
    return { ok: true, user_id: userId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function resetUserPassword(userId, newPassword, token) {
  try {
    const admin = requireAdmin_(token);
    if (!userId) throw new Error("Missing user_id");
    if (String(newPassword || "").length < 6) throw new Error("Mật khẩu mới cần ít nhất 6 ký tự");
    const user = findUserById_(userId);
    if (!user) throw new Error("Không tìm thấy user");
    setPassword_(user, newPassword);
    user.must_change_password = "TRUE";
    upsertObject_(SHEET_NAMES.users, "user_id", user);
    logAudit_(admin, "PASSWORD_RESET", "user", userId, user.username);
    return { ok: true, user_id: userId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function changeOwnPassword(newPassword, token) {
  try {
    const user = requireAuth_(token);
    if (String(newPassword || "").length < 6) throw new Error("Mật khẩu mới cần ít nhất 6 ký tự");
    setPassword_(user, newPassword);
    user.must_change_password = "FALSE";
    const saved = upsertObject_(SHEET_NAMES.users, "user_id", user);
    logAudit_(user, "PASSWORD_CHANGED", "user", saved.user_id, saved.username);
    return { ok: true, user: publicUser_(saved), updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function requireAuth_(token) {
  ensureUsersReady_();
  const userId = CacheService.getScriptCache().get(`session_${token || ""}`);
  if (!userId) throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
  const user = findUserById_(userId);
  if (!user || String(user.active || "TRUE").toUpperCase() === "FALSE") throw new Error("Tài khoản không còn hiệu lực");
  return user;
}

function requireAdmin_(token) {
  const user = requireAuth_(token);
  if (String(user.role || "").toLowerCase() !== "admin") throw new Error("Chỉ admin mới được thực hiện thao tác này");
  return user;
}

function permissionCodes_(user) {
  const raw = String(user.permissions || "").trim().toLowerCase();
  if (String(user.role || "").toLowerCase() === "admin" || raw === "all") return ["*"];

  const values = raw.split(",").map((item) => item.trim()).filter(Boolean);
  const codes = new Set();
  values.forEach((value) => {
    (LEGACY_PERMISSION_PRESETS[value] || [value]).forEach((code) => codes.add(code));
  });
  return [...codes];
}

function hasPermission_(user, permission) {
  const codes = permissionCodes_(user);
  if (codes.indexOf("*") !== -1 || codes.indexOf(permission) !== -1) return true;

  const [module, action] = String(permission).split(".");
  if (!module || !action) return false;
  if (action === "view") return codes.indexOf(`${module}.manage`) !== -1 || codes.indexOf(`${module}.delete`) !== -1;
  if (action === "manage") return codes.indexOf(`${module}.delete`) !== -1;
  return false;
}

function requirePermission_(token, permission) {
  const user = requireAuth_(token);
  if (!hasPermission_(user, permission)) throw new Error("Tài khoản không có quyền thực hiện thao tác này");
  return user;
}

function defaultPermissionsForRole_(role) {
  if (role === "admin") return "all";
  if (role === "manager") return "edit,report";
  return "view";
}

function normalizePermissions_(permissions, role) {
  const values = String(permissions || defaultPermissionsForRole_(role))
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowed = values.filter((value) => value === "all" || LEGACY_PERMISSION_PRESETS[value] || MODULE_PERMISSION_CODES.indexOf(value) !== -1);
  return allowed.length ? [...new Set(allowed)].join(",") : defaultPermissionsForRole_(role);
}

function enforceLoginThrottle_(username) {
  const cache = CacheService.getScriptCache();
  const attempts = Number(cache.get(`login_fail_${username}`) || 0);
  if (attempts >= 5) throw new Error("Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút");
}

function throwInvalidLogin_(username) {
  const cache = CacheService.getScriptCache();
  const key = `login_fail_${username}`;
  const attempts = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(attempts), 900);
  throw new Error("Tài khoản hoặc mật khẩu không đúng");
}

function clearLoginFailures_(username) {
  CacheService.getScriptCache().remove(`login_fail_${username}`);
}

function ensureUsersReady_() {
  ensureSheetHeaders_(SHEET_NAMES.users, getSheet_(SHEET_NAMES.users));
}

function ensureUsersSheet_(sheet) {
  const desired = ["user_id", "username", "full_name", "email", "role", "permissions", "active", "password_salt", "password_hash", "must_change_password", "created_at", "updated_at", "last_login_at"];
  const firstRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const headers = firstRow.map((header) => String(header).trim()).filter(Boolean);
  if (!headers.length) {
    sheet.getRange(1, 1, 1, desired.length).setValues([desired]);
  }
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), desired.length)).getValues()[0].map((header) => String(header).trim());
  desired.forEach((header) => {
    if (currentHeaders.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      currentHeaders.push(header);
    }
  });
  ensureDefaultAdmin_(sheet, currentHeaders);
}

function ensureDefaultAdmin_(sheet, headers) {
  const values = sheet.getDataRange().getValues();
  if (values.length > 1) {
    const headerRow = values[0].map((header) => String(header).trim());
    const roleIndex = headerRow.indexOf("role");
    const activeIndex = headerRow.indexOf("active");
    const hasActiveAdmin = values.some((row, index) => {
      if (index === 0) return false;
      const role = String(row[roleIndex] || "").toLowerCase();
      const active = String(row[activeIndex] || "TRUE").toUpperCase();
      return role === "admin" && active !== "FALSE";
    });
    if (hasActiveAdmin) return;
  }

  const admin = normalizeUser_({
    username: "admin",
    full_name: "TDW Admin",
    role: "admin",
    permissions: "all",
    active: "TRUE",
    password: bootstrapAdminPassword_(),
    must_change_password: "TRUE",
  });
  sheet.appendRow(headers.map((header) => admin[header] || ""));
}

function bootstrapAdminPassword_() {
  const password = PropertiesService.getScriptProperties().getProperty("TDW_BOOTSTRAP_ADMIN_PASSWORD");
  if (password && password.length >= 6) return password;
  throw new Error("Thiếu Script Property TDW_BOOTSTRAP_ADMIN_PASSWORD để tạo admin đầu tiên");
}

function normalizeUser_(user) {
  const now = new Date().toISOString();
  const normalized = Object.assign({}, user);
  normalized.user_id = normalized.user_id || Utilities.getUuid();
  normalized.username = String(normalized.username || "").trim().toLowerCase();
  if (!normalized.username) throw new Error("Tên đăng nhập là bắt buộc");
  normalized.full_name = String(normalized.full_name || normalized.username).trim();
  normalized.email = normalizeEmail_(normalized.email);
  normalized.role = String(normalized.role || "user").trim().toLowerCase();
  if (["admin", "manager", "user", "viewer"].indexOf(normalized.role) === -1) normalized.role = "user";
  normalized.permissions = normalizePermissions_(normalized.permissions, normalized.role);
  normalized.active = String(normalized.active || "TRUE").toUpperCase() === "FALSE" ? "FALSE" : "TRUE";
  normalized.must_change_password = String(normalized.must_change_password || "FALSE").toUpperCase() === "TRUE" ? "TRUE" : "FALSE";
  normalized.created_at = normalized.created_at || now;
  normalized.updated_at = now;
  if (normalized.password) setPassword_(normalized, normalized.password);
  else if (!normalized.password_hash) throw new Error("Mật khẩu là bắt buộc khi tạo user mới");
  delete normalized.password;
  return normalized;
}

function readUsers_() {
  return readSheetAsObjects_(SHEET_NAMES.users);
}

function normalizeEmail_(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("Email không đúng định dạng");
  return normalized;
}

function isNotificationReadyUser_(user) {
  return Boolean(user) && String(user.active || "TRUE").toUpperCase() !== "FALSE" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(user.email || "").trim());
}

function assertUserCanRemainResponsible_(user) {
  const assignments = readActiveAssetResponsibles_()
    .filter((item) => item.user_id === user.user_id);
  if (!assignments.length || isNotificationReadyUser_(user)) return;
  const assetNames = readActiveAssets_()
    .filter((asset) => assignments.some((item) => item.asset_id === asset.asset_id))
    .slice(0, 3)
    .map((asset) => asset.asset_name)
    .join(", ");
  throw new Error(`Không thể khóa hoặc bỏ email của user đang phụ trách thiết bị. Hãy chuyển trách nhiệm trước${assetNames ? `: ${assetNames}` : ""}`);
}

function findUserByUsername_(username) {
  return readUsers_().find((user) => String(user.username || "").toLowerCase() === username);
}

function findUserById_(userId) {
  return readUsers_().find((user) => user.user_id === userId);
}

function setPassword_(user, password) {
  user.password_salt = Utilities.getUuid();
  user.password_hash = hashPassword_(password, user.password_salt);
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, `${salt}:${password}`, Utilities.Charset.UTF_8);
  return bytes.map((byte) => (`0${(byte < 0 ? byte + 256 : byte).toString(16)}`).slice(-2)).join("");
}

function publicUser_(user) {
  return {
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    email: user.email || "",
    role: user.role,
    permissions: user.permissions,
    active: String(user.active || "TRUE").toUpperCase() !== "FALSE",
    must_change_password: String(user.must_change_password || "FALSE").toUpperCase() === "TRUE",
    created_at: user.created_at || "",
    updated_at: user.updated_at || "",
    last_login_at: user.last_login_at || "",
  };
}

function publicResponsibleUser_(user) {
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    username: user.username,
  };
}
