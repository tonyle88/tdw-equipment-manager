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

    requireAuth_(event.parameter.token || "");
    const sheetName = (event.parameter.sheet || SHEET_NAMES.assets).trim();
    const rows = sheetName === SHEET_NAMES.assets ? readActiveAssets_() : readSheetAsObjects_(sheetName);
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

function getAppData() {
  const user = arguments.length ? requireAuth_(arguments[0]) : null;
  return {
    ok: true,
    assets: readActiveAssets_(),
    settings: readSheetAsObjects_(SHEET_NAMES.settings),
    maintenanceLogs: readSheetAsObjects_(SHEET_NAMES.maintenanceLogs),
    inventoryMovements: readSheetAsObjects_(SHEET_NAMES.inventoryMovements),
    softwareLicenses: readSheetAsObjects_(SHEET_NAMES.softwareLicenses),
    currentUser: user ? publicUser_(user) : null,
    updated_at: new Date().toISOString(),
  };
}

function saveAsset(asset) {
  try {
    if (arguments.length > 1) requireEdit_(arguments[1]);
    const normalized = normalizeAsset_(asset || {});
    const saved = upsertObject_(SHEET_NAMES.assets, "asset_id", normalized);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteAsset(assetId) {
  try {
    const user = arguments.length > 1 ? requireEdit_(arguments[1]) : null;
    if (!assetId) throw new Error("Missing asset_id");
    const asset = readSheetAsObjects_(SHEET_NAMES.assets).find((item) => item.asset_id === assetId);
    if (!asset) throw new Error("Không tìm thấy thiết bị để xóa");
    asset.deleted_at = new Date().toISOString();
    asset.deleted_by = user ? user.username : "";
    upsertObject_(SHEET_NAMES.assets, "asset_id", asset);
    return { ok: true, asset_id: assetId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveSetting(setting) {
  try {
    if (arguments.length > 1) requireAdmin_(arguments[1]);
    const normalized = normalizeSetting_(setting || {});
    const saved = upsertObject_(SHEET_NAMES.settings, "setting_id", normalized);
    return { ok: true, data: saved, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function deleteSetting(settingId) {
  try {
    if (arguments.length > 1) requireAdmin_(arguments[1]);
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
    if (action === "saveAsset" || action === "upsertAsset") {
      return jsonResponse_(saveAsset(args[0] || body.asset || {}, args[1] || body.token || ""));
    }
    if (action === "deleteAsset") {
      return jsonResponse_(deleteAsset(args[0] || body.asset_id || "", args[1] || body.token || ""));
    }
    if (action === "saveMaintenanceLog") {
      return jsonResponse_(saveMaintenanceLog(args[0] || body.log || {}, args[1] || body.token || ""));
    }
    if (action === "saveMovementLog") {
      return jsonResponse_(saveMovementLog(args[0] || body.log || {}, args[1] || body.token || ""));
    }
    if (action === "saveSoftwareLicense") {
      return jsonResponse_(saveSoftwareLicense(args[0] || body.license || {}, args[1] || body.token || ""));
    }
    if (action === "saveSetting") {
      return jsonResponse_(saveSetting(args[0] || body.setting || {}, args[1] || body.token || ""));
    }
    if (action === "deleteSetting") {
      return jsonResponse_(deleteSetting(args[0] || body.setting_id || "", args[1] || body.token || ""));
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
    if (token) requireEdit_(token);
    const normalized = normalizeMaintenanceLog_(log || {});
    const saved = upsertObject_(SHEET_NAMES.maintenanceLogs, "log_id", normalized);
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

function saveMovementLog(log, token) {
  try {
    if (token) requireEdit_(token);
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
    if (token) requireEdit_(token);
    const normalized = normalizeSoftwareLicense_(license || {});
    const saved = upsertObject_(SHEET_NAMES.softwareLicenses, "license_id", normalized);
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
  normalized.license_key = normalized.license_key || "";
  normalized.assigned_asset_id = normalized.assigned_asset_id || "";
  normalized.assigned_user = normalized.assigned_user || "";
  normalized.expiry_date = normalized.expiry_date || "";
  normalized.status = normalized.status || "ACTIVE";
  normalized.note = normalized.note || "";
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
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet && sheetName === SHEET_NAMES.users) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  return sheet;
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
  const desired = ["serial_number", "location", "warranty_end_date", "unit_price", "last_maintenance_date", "deleted_at", "deleted_by"];
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map((header) => String(header).trim());
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
    ensureUsersReady_();
    return { ok: true, users: readUsers_().map(publicUser_) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function saveUser(user, token) {
  try {
    requireAdmin_(token);
    ensureUsersReady_();
    const normalized = normalizeUser_(user || {});
    const duplicate = readUsers_().find((item) => item.username === normalized.username && item.user_id !== normalized.user_id);
    if (duplicate) throw new Error("Tên đăng nhập đã tồn tại");
    const saved = upsertObject_(SHEET_NAMES.users, "user_id", normalized);
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
    user.active = "FALSE";
    upsertObject_(SHEET_NAMES.users, "user_id", user);
    return { ok: true, user_id: userId, updated_at: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function resetUserPassword(userId, newPassword, token) {
  try {
    requireAdmin_(token);
    if (!userId) throw new Error("Missing user_id");
    if (String(newPassword || "").length < 6) throw new Error("Mật khẩu mới cần ít nhất 6 ký tự");
    const user = findUserById_(userId);
    if (!user) throw new Error("Không tìm thấy user");
    setPassword_(user, newPassword);
    user.must_change_password = "TRUE";
    upsertObject_(SHEET_NAMES.users, "user_id", user);
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

function requireEdit_(token) {
  const user = requireAuth_(token);
  const permissions = String(user.permissions || "").toLowerCase();
  const role = String(user.role || "").toLowerCase();
  if (role === "admin" || permissions === "all" || permissions.split(",").map((item) => item.trim()).indexOf("edit") !== -1) return user;
  throw new Error("Tài khoản này chỉ có quyền xem, không được chỉnh sửa thiết bị");
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
  const desired = ["user_id", "username", "full_name", "role", "permissions", "active", "password_salt", "password_hash", "must_change_password", "created_at", "updated_at", "last_login_at"];
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
  normalized.role = String(normalized.role || "user").trim().toLowerCase();
  if (["admin", "manager", "user", "viewer"].indexOf(normalized.role) === -1) normalized.role = "user";
  normalized.permissions = String(normalized.permissions || (normalized.role === "admin" ? "all" : "view")).trim();
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
    role: user.role,
    permissions: user.permissions,
    active: String(user.active || "TRUE").toUpperCase() !== "FALSE",
    must_change_password: String(user.must_change_password || "FALSE").toUpperCase() === "TRUE",
    created_at: user.created_at || "",
    updated_at: user.updated_at || "",
    last_login_at: user.last_login_at || "",
  };
}
