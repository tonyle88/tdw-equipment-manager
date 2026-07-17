"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Readable } = require("node:stream");

const root = path.resolve(__dirname, "..");
const proxyPath = path.join(root, "api", "google-script.js");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertSyntax(relativePath) {
  new vm.Script(read(relativePath), { filename: relativePath });
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

async function invokeProxy(body) {
  const originalFetch = global.fetch;
  const originalUrl = process.env.GOOGLE_SCRIPT_URL;
  let requestToAppsScript = null;
  process.env.GOOGLE_SCRIPT_URL = "https://example.test/apps-script";
  delete require.cache[require.resolve(proxyPath)];
  global.fetch = async (url, options) => {
    requestToAppsScript = { url, options };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, data: { connected: true } }),
    };
  };

  try {
    const handler = require(proxyPath);
    const req = Readable.from([JSON.stringify(body)]);
    req.method = "POST";
    const res = createResponse();
    await handler(req, res);
    return { res, requestToAppsScript };
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.GOOGLE_SCRIPT_URL;
    else process.env.GOOGLE_SCRIPT_URL = originalUrl;
    delete require.cache[require.resolve(proxyPath)];
  }
}

async function run() {
  assertSyntax("app/app.js");
  assertSyntax("app/assets/qrcode.js");
  assertSyntax("google-apps-script/Code.gs");
  assertSyntax("api/google-script.js");

  const appsScript = read("google-apps-script/Code.gs");
  const app = read("app/app.js");
  const index = read("app/index.html");
  const styles = read("app/styles.css");
  const assetForm = index.match(/id="assetForm"[\s\S]*?<\/form>/)?.[0] || "";
  const assetFormFields = [...assetForm.matchAll(/name="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((name) => !["pending_images", "primary_responsible_id", "secondary_responsible_ids"].includes(name));
  const assetHeaderBlock = appsScript.match(/const ASSET_HEADERS = \[([\s\S]*?)\];/)?.[1] || "";
  const assetHeaders = [...assetHeaderBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(assetFormFields.filter((name) => !assetHeaders.includes(name)), []);
  assert.ok(appsScript.includes('softwareLicenses: hasPermission_(user, "software.view") ? readSheetAsObjects_(SHEET_NAMES.softwareLicenses).map(publicSoftwareLicense_) : []'));
  assert.ok(appsScript.includes('maintenanceLogs: hasPermission_(user, "maintenance.view") ? readSheetAsObjects_(SHEET_NAMES.maintenanceLogs) : []'));
  assert.ok(appsScript.includes('maintenancePlans: hasPermission_(user, "maintenance.view") ? readSheetAsObjects_(SHEET_NAMES.maintenancePlans) : []'));
  assert.ok(appsScript.includes("function normalizeMaintenancePlan_(plan, activeAssets)"));
  assert.ok(appsScript.includes("function ensureMaintenancePlansSheet_(sheet)"));
  assert.ok(appsScript.includes("function sendMaintenancePlanReminders(token)"));
  assert.ok(appsScript.includes("function saveMaintenancePlans(plans, token)"));
  assert.ok(appsScript.includes("function nextMaintenanceDueDate_(currentDueDate, frequency, completionDate)"));
  assert.ok(appsScript.includes("function ensureMaintenanceLogsSheet_(sheet)"));
  assert.ok(appsScript.includes("plans.length > 200"));
  assert.ok(appsScript.includes("function runMaintenancePlanReminders()"));
  assert.ok(appsScript.includes("function installMaintenancePlanReminderTrigger()"));
  assert.ok(appsScript.includes("function saveMediaFile(payload, token)"));
  assert.ok(appsScript.includes("function getMediaFile(mediaId, token)"));
  assert.ok(appsScript.includes("function ensureMediaFilesSheet_(sheet)"));
  assert.ok(appsScript.includes("function deleteObject_(sheetName, keyField, keyValue)"));
  assert.ok(appsScript.includes("function assertMediaOwnerExists_(media)"));
  assert.ok(appsScript.includes("function checkMediaFolderConfiguration()"));
  assert.ok(appsScript.includes("const ASSET_HEADERS = ["));
  assert.ok(appsScript.includes("Assets: ASSET_HEADERS"));
  assert.ok(appsScript.includes("ASSET_HEADERS.forEach"));
  assert.ok(appsScript.includes("function getSoftwareLicenseKey(licenseId, token)"));
  assert.ok(appsScript.includes("function requirePermission_(token, permission)"));
  assert.ok(appsScript.includes("Object.assign({}, existing, user || {})"));
  assert.ok(appsScript.includes("Tên tài khoản không được phép thay đổi"));
  assert.ok(appsScript.includes("function normalizeAssetResponsibles_(responsibles, assetId)"));
  assert.ok(appsScript.includes("function getReadableSheetRows_(user, sheetName)"));
  assert.ok(appsScript.includes("function assertUserCanRemainResponsible_(user)"));
  assert.ok(!app.includes("license.license_key)"));

  const permissions = vm.createContext();
  vm.runInContext(appsScript, permissions, { filename: "google-apps-script/Code.gs" });
  assert.equal(vm.runInContext('normalizeMediaFolderId_("https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp?usp=sharing")', permissions), "1AbCdEfGhIjKlMnOp");
  assert.equal(vm.runInContext('normalizeMediaFolderId_("1AbCdEfGhIjKlMnOp")', permissions), "1AbCdEfGhIjKlMnOp");
  assert.throws(() => vm.runInContext('normalizeMediaFolderId_("not-an-id")', permissions), /phải là ID hoặc URL/);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "edit,report" }, "assets.manage")', permissions), true);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "edit,report" }, "reports.assets.export")', permissions), true);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "reports.export" }, "reports.assets.export")', permissions), true);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "edit,report" }, "software.delete")', permissions), false);
  assert.equal(vm.runInContext('hasPermission_({ role: "viewer", permissions: "view" }, "assets.manage")', permissions), false);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "assets.manage,reports.assets.export" }, "assets.manage")', permissions), true);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "assets.manage,reports.assets.export" }, "maintenance.manage")', permissions), false);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "maintenance.manage" }, "maintenance.view")', permissions), true);
  assert.equal(vm.runInContext('hasPermission_({ role: "manager", permissions: "movement.manage" }, "movement.view")', permissions), true);
  assert.equal(vm.runInContext('hasPermission_({ role: "user", permissions: "view" }, "assets.view")', permissions), true);
  assert.equal(vm.runInContext('hasPermission_({ role: "user", permissions: "view" }, "reports.assets.export")', permissions), false);
  assert.equal(vm.runInContext('hasPermission_({ role: "admin", permissions: "all" }, "settings.manage")', permissions), true);
  assert.equal(vm.runInContext('normalizeUser_({ user_id: "user-id", username: "user", role: "user", password_salt: "salt", password_hash: "hash" }).password_hash', permissions), "hash");
  assert.equal(vm.runInContext('normalizeUser_({ user_id: "user-id", username: "user", email: "TDW@Example.com", role: "user", password_salt: "salt", password_hash: "hash" }).email', permissions), "tdw@example.com");
  assert.throws(() => vm.runInContext('normalizeEmail_("not-an-email")', permissions), /Email không đúng định dạng/);
  assert.equal(vm.runInContext('isNotificationReadyUser_({ active: "TRUE", email: "notice@example.com" })', permissions), true);
  assert.equal(vm.runInContext('isNotificationReadyUser_({ active: "FALSE", email: "notice@example.com" })', permissions), false);
  vm.runInContext('readActiveAssets_ = () => [{ asset_id: "asset-id" }];', permissions);
  assert.equal(vm.runInContext('normalizeMaintenancePlan_({ plan_id: "plan-id", asset_id: "asset-id", title: "Kiểm tra định kỳ", frequency: "monthly", next_due_date: "2026-08-01" }).frequency', permissions), "MONTHLY");
  assert.equal(vm.runInContext('normalizeMaintenancePlan_({ plan_id: "plan-id", asset_id: "asset-id", title: "Kiểm tra định kỳ", frequency: "monthly", next_due_date: "2026-08-01" }).repeat_enabled', permissions), "TRUE");
  assert.equal(vm.runInContext('normalizeMaintenancePlan_({ plan_id: "plan-id", asset_id: "asset-id", title: "Kiểm tra định kỳ", frequency: "monthly", next_due_date: "2026-08-01", repeat_enabled: "FALSE" }).repeat_enabled', permissions), "FALSE");
  assert.throws(() => vm.runInContext('normalizeMaintenancePlan_({ plan_id: "plan-id", asset_id: "asset-id", title: "Kiểm tra", frequency: "weekly", next_due_date: "2026-08-01" })', permissions), /Chu kỳ bảo trì không hợp lệ/);
  assert.equal(vm.runInContext('nextMaintenanceDueDate_("2026-01-31", "MONTHLY", "2026-01-31")', permissions), "2026-02-28");
  assert.equal(vm.runInContext('nextMaintenanceDueDate_("2026-01-31", "MONTHLY", "2026-03-05")', permissions), "2026-03-31");
  vm.runInContext('upsertObject_ = (_sheet, _key, object) => object;', permissions);
  assert.equal(vm.runInContext('(() => { const plan = { plan_id: "p1", next_due_date: "2026-07-17", frequency: "MONTHLY", repeat_enabled: "TRUE", active: "TRUE" }; completeMaintenancePlan_(plan, "2026-07-17"); return plan.next_due_date; })()', permissions), "2026-08-17");
  assert.equal(vm.runInContext('(() => { const plan = { plan_id: "p2", next_due_date: "2026-07-17", frequency: "MONTHLY", repeat_enabled: "FALSE", active: "TRUE" }; completeMaintenancePlan_(plan, "2026-07-17"); return plan.active; })()', permissions), "FALSE");
  assert.equal(vm.runInContext('maintenanceReminderType_("2026-07-17", "2026-07-10")', permissions), "DUE_7");
  assert.equal(vm.runInContext('maintenanceReminderType_("2026-07-03", "2026-07-10")', permissions), "OVERDUE_7");
  assert.equal(vm.runInContext('maintenanceReminderType_("2026-07-15", "2026-07-10")', permissions), "");
  assert.equal(vm.runInContext('normalizeIsoDate_("01/08/2026")', permissions), "2026-08-01");
  vm.runInContext('requirePermission_ = () => ({ username: "tester" }); readActiveAssets_ = () => [{ asset_id: "asset-id" }];', permissions);
  assert.equal(vm.runInContext('saveMediaFile({ owner_type: "ASSET", owner_id: "wrong-id", asset_id: "asset-id" }, "token").ok', permissions), false);
  assert.match(vm.runInContext('saveMediaFile({ owner_type: "ASSET", owner_id: "wrong-id", asset_id: "asset-id" }, "token").error', permissions), /Liên kết ảnh thiết bị không hợp lệ/);
  assert.ok(index.includes('name="permission_code" value="assets.manage"'));
  assert.ok(index.includes('name="permission_code" value="reports.maintenance.export"'));
  assert.ok(index.includes('name="permission_code" value="movement.view"'));
  assert.ok(index.includes('name="primary_responsible_id"'));
  assert.ok(index.includes('name="email" type="email"'));
  assert.ok(app.includes('function setUserPermissionCodes(rawPermissions, role)'));
  assert.ok(app.includes("function canAccessView(view)"));
  assert.ok(app.includes("async function exportTabularExcel(kind)"));
  assert.ok(app.includes("function printTabularReport(kind)"));
  assert.ok(app.includes("function openMaintenancePlanModal(planId = null)"));
  assert.ok(app.includes('callServer("sendMaintenancePlanReminders")'));
  assert.ok(app.includes("function bindModalCloseGuard(modal, form, closeModal, buttons)"));
  assert.ok(app.includes('"BỎ NỘI DUNG ĐANG SOẠN?"'));
  assert.ok((app.match(/bindModalCloseGuard\(/g) || []).length >= 9);
  assert.ok(index.includes('id="maintenancePlanModal"'));
  assert.ok(index.includes('name="scope_type"'));
  assert.ok(index.includes('id="maintenancePlanGroupField"'));
  assert.ok(index.includes('id="maintenancePlanTypeField"'));
  assert.ok(index.includes('name="repeat_enabled"'));
  assert.ok(index.includes('name="plan_id"'));
  assert.ok(app.includes('callServer("saveMaintenancePlans", plans)'));
  assert.ok(index.includes('id="assetProfileModal"'));
  assert.ok(index.includes('src="assets/qrcode.js"'));
  assert.ok(app.includes('data-download-qr='));
  assert.ok(app.includes('event.key === "ArrowLeft"'));
  assert.ok(app.includes('data-upload-index='));
  assert.ok(app.includes('"Hoàn tất", "done"'));
  assert.ok(index.includes('capture="environment"'));
  assert.ok(app.includes("function printAssetQrLabel(asset)"));
  assert.ok(app.includes('async function printAssetQrLabels(assets, paperSize = "a4")'));
  assert.ok(app.includes("async function waitForPrintImages(container)"));
  assert.ok(app.includes("await waitForPrintImages(el)"));
  assert.ok(app.includes('Bảo trì: ${escapeHtml(formatDate(asset.last_maintenance_date)'));
  assert.ok(app.includes('Năm: ${escapeHtml(asset.purchase_year'));
  assert.equal((app.match(/labelFor\("asset_type", asset\.asset_type\)/g) || []).length, 2);
  assert.ok(app.includes('if (configuredLabel && configuredLabel !== departmentValue) return configuredLabel'));
  assert.ok(app.includes('function softwareLabel(softwareValue)'));
  assert.ok(app.includes("normalizeAssets(payload.assets || []).map"));
  assert.ok(app.includes('paperSize === "label"'));
  assert.ok(app.includes("function openQrLabelModal()"));
  assert.ok(index.includes('id="qrLabelDeviceList"'));
  assert.ok(index.includes('id="qrLabelPaperSize"'));
  assert.ok(index.includes('name="software_license" multiple'));
  assert.ok(app.includes("data.software_license = [...els.form.elements.software_license.selectedOptions]"));
  assert.ok(styles.includes("@page qr-labels-single"));
  assert.ok(styles.includes("size: 100mm 140mm"));
  assert.ok(styles.includes(".qr-label:nth-child(2n)"));
  assert.ok(app.includes('data-edit-maintenance='));
  assert.ok(app.includes('class="mini-table maintenance-history-table"'));
  assert.ok(app.includes('<th>THAO TÁC</th>'));
  assert.ok(styles.includes('.maintenance-history-scroll'));
  assert.ok(styles.includes('.maintenance-history-actions-col'));
  assert.ok(app.includes("async function convertImageToWebp(file)"));
  assert.ok(app.includes("async function renderMaintenanceExistingImages(logId)"));
  assert.ok(app.includes("async function deleteMaintenanceMedia(mediaId, logId)"));
  assert.ok(app.includes("data-delete-maintenance-media="));
  assert.ok(app.includes('mediaFor("MAINTENANCE", logId)'));
  assert.ok(index.includes('id="maintenanceExistingImagePreview"'));
  assert.ok(styles.includes(".maintenance-edit-gallery"));
  assert.ok(app.includes('url.searchParams.set("asset", assetId)'));
  assert.ok(!app.includes("function exportMaintenanceCsv()"));

  const qrContext = vm.createContext({});
  vm.runInContext(read("app/assets/qrcode.js"), qrContext, { filename: "app/assets/qrcode.js" });
  const qrDataUrl = vm.runInContext('(() => { const code = qrcode(0, "M"); code.addData("https://example.test/?asset=asset-id"); code.make(); return code.createDataURL(4, 2); })()', qrContext);
  assert.ok(qrDataUrl.startsWith("data:image/gif;base64,"));

  const vercel = JSON.parse(read("vercel.json"));
  assert.equal(vercel.version, 2);
  assert.ok(vercel.rewrites.some((rule) => rule.source === "/" && rule.destination === "/app/index.html"));

  const allowed = await invokeProxy({ fn: "healthCheck", args: ["session-token"] });
  assert.equal(allowed.res.statusCode, 200);
  assert.deepEqual(JSON.parse(allowed.res.body), { ok: true, data: { connected: true } });
  assert.equal(allowed.requestToAppsScript.url, "https://example.test/apps-script");
  assert.deepEqual(JSON.parse(allowed.requestToAppsScript.options.body), {
    action: "healthCheck",
    args: ["session-token"],
  });

  const licenseKey = await invokeProxy({ fn: "getSoftwareLicenseKey", args: ["license-id", "session-token"] });
  assert.equal(licenseKey.res.statusCode, 200);
  assert.deepEqual(JSON.parse(licenseKey.requestToAppsScript.options.body), {
    action: "getSoftwareLicenseKey",
    args: ["license-id", "session-token"],
  });

  const maintenancePlan = await invokeProxy({ fn: "saveMaintenancePlan", args: [{ asset_id: "asset-id" }, "session-token"] });
  assert.equal(maintenancePlan.res.statusCode, 200);
  assert.deepEqual(JSON.parse(maintenancePlan.requestToAppsScript.options.body), {
    action: "saveMaintenancePlan",
    args: [{ asset_id: "asset-id" }, "session-token"],
  });

  const maintenancePlans = await invokeProxy({ fn: "saveMaintenancePlans", args: [[{ asset_id: "asset-id" }], "session-token"] });
  assert.equal(maintenancePlans.res.statusCode, 200);
  assert.deepEqual(JSON.parse(maintenancePlans.requestToAppsScript.options.body), {
    action: "saveMaintenancePlans",
    args: [[{ asset_id: "asset-id" }], "session-token"],
  });

  const reminders = await invokeProxy({ fn: "sendMaintenancePlanReminders", args: ["session-token"] });
  assert.equal(reminders.res.statusCode, 200);
  assert.deepEqual(JSON.parse(reminders.requestToAppsScript.options.body), {
    action: "sendMaintenancePlanReminders",
    args: ["session-token"],
  });

  const media = await invokeProxy({ fn: "saveMediaFile", args: [{ owner_type: "ASSET" }, "session-token"] });
  assert.equal(media.res.statusCode, 200);
  assert.deepEqual(JSON.parse(media.requestToAppsScript.options.body), {
    action: "saveMediaFile",
    args: [{ owner_type: "ASSET" }, "session-token"],
  });

  const denied = await invokeProxy({ fn: "notAllowed", args: [] });
  assert.equal(denied.res.statusCode, 400);
  assert.equal(denied.requestToAppsScript, null);
  assert.equal(JSON.parse(denied.res.body).error, "Hàm API không được phép.");

  console.log("Smoke test passed.");
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
