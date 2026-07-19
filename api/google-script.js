const ALLOWED_FUNCTIONS = new Set([
  "getAppData",
  "getSoftwareLicenseKey",
  "healthCheck",
  "createBackup",
  "listBackups",
  "restoreBackup",
  "loginUser",
  "logoutUser",
  "logoutAllSessions",
  "saveAsset",
  "deleteAsset",
  "saveSetting",
  "deleteSetting",
  "listUsers",
  "saveUser",
  "deleteUser",
  "resetUserPassword",
  "changeOwnPassword",
  "saveMaintenanceLog",
  "saveMaintenancePlan",
  "saveMaintenancePlans",
  "sendMaintenancePlanReminders",
  "saveMediaFile",
  "getMediaFile",
  "deleteMediaFile",
  "saveMovementLog",
  "saveSoftwareLicense",
  "deleteSoftwareLicense",
  "saveDepartment",
  "deleteDepartment",
  "deleteMaintenanceLog",
  "deleteMaintenancePlan",
]);

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const SCRIPT_PROXY_SECRET = process.env.APPS_SCRIPT_PROXY_SECRET;
const MAX_REQUEST_BYTES = 3500000;
const SESSION_COOKIE = "tdw_session";
const SESSION_MAX_AGE = 21600;
const USER_ARG_COUNTS = {
  getAppData: 0, getSoftwareLicenseKey: 1, healthCheck: 0, createBackup: 0, listBackups: 0, restoreBackup: 1,
  loginUser: 1, logoutUser: 0, logoutAllSessions: 0,
  saveAsset: 1, deleteAsset: 1, saveSetting: 1, deleteSetting: 1, listUsers: 0,
  saveUser: 1, deleteUser: 1, resetUserPassword: 2, changeOwnPassword: 1,
  saveMaintenanceLog: 1, saveMaintenancePlan: 1, saveMaintenancePlans: 1,
  sendMaintenancePlanReminders: 0, saveMediaFile: 1, getMediaFile: 1, deleteMediaFile: 1,
  saveMovementLog: 1, saveSoftwareLicense: 1, deleteSoftwareLicense: 1,
  saveDepartment: 1, deleteDepartment: 1, deleteMaintenanceLog: 1, deleteMaintenancePlan: 1,
};

function send(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function sessionCookie(token, maxAge = SESSION_MAX_AGE) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token || "")}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function readSessionToken(req) {
  const cookies = String(req.headers?.cookie || "").split(";");
  const pair = cookies.find((item) => item.trim().startsWith(`${SESSION_COOKIE}=`));
  if (!pair) return "";
  try {
    return decodeURIComponent(pair.trim().slice(SESSION_COOKIE.length + 1));
  } catch (_error) {
    return "";
  }
}

async function readBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += Buffer.byteLength(chunk);
    if (totalBytes > MAX_REQUEST_BYTES) throw new Error("Dữ liệu gửi lên vượt quá giới hạn cho phép.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))).toString("utf8");
}

async function callGoogleScript(fn, args = []) {
  if (!SCRIPT_URL) throw new Error("Thiếu biến môi trường GOOGLE_SCRIPT_URL trên Vercel.");
  if (!SCRIPT_PROXY_SECRET) throw new Error("Thiếu biến môi trường APPS_SCRIPT_PROXY_SECRET trên Vercel.");

  const controller = new AbortController();
  const timeoutMs = fn === "createBackup" || fn === "restoreBackup" ? 120000 : 25000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: fn, args, proxy_secret: SCRIPT_PROXY_SECRET }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    const compactText = responseText.replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(`Apps Script không trả JSON. Hãy deploy lại Web App mới. Phản hồi: ${compactText || response.status}`);
  }

  if (!response.ok || payload.ok === false) {
    const error = new Error(payload.error || `Apps Script lỗi ${response.status}`);
    if (/Phiên đăng nhập|Tài khoản không còn|đã bị thu hồi|mật khẩu không đúng/i.test(error.message)) error.statusCode = 401;
    throw error;
  }
  return payload;
}

module.exports = async function handler(req, res) {
  const startedAt = Date.now();
  const requestId = String(req.headers?.["x-vercel-id"] || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  let requestedFunction = "unknown";
  res.setHeader("X-Request-Id", requestId);
  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const bodyText = await readBody(req);
    const body = bodyText ? JSON.parse(bodyText) : {};
    requestedFunction = String(body.fn || "unknown");
    if (!ALLOWED_FUNCTIONS.has(body.fn)) {
      send(res, 400, { ok: false, error: "Hàm API không được phép." });
      return;
    }
    if (body.args && !Array.isArray(body.args)) {
      send(res, 400, { ok: false, error: "Tham số API không hợp lệ." });
      return;
    }
    const args = body.args || [];
    if (args.length !== USER_ARG_COUNTS[body.fn]) {
      send(res, 400, { ok: false, error: "Số lượng tham số API không hợp lệ." });
      return;
    }
    const token = readSessionToken(req);
    if (body.fn !== "loginUser" && !token) {
      send(res, 401, { ok: false, error: "Phiên đăng nhập không tồn tại hoặc đã hết hạn." });
      return;
    }

    const payload = await callGoogleScript(body.fn, body.fn === "loginUser" ? args : [...args, token]);
    if (payload.token) {
      res.setHeader("Set-Cookie", sessionCookie(payload.token));
      delete payload.token;
    }
    if (body.fn === "logoutUser" || body.fn === "logoutAllSessions") res.setHeader("Set-Cookie", sessionCookie("", 0));
    console.info(JSON.stringify({ event: "api_request", request_id: requestId, fn: requestedFunction, status: 200, duration_ms: Date.now() - startedAt }));
    send(res, 200, payload);
  } catch (error) {
    const statusCode = error.statusCode || (error.name === "AbortError" ? 504 : 500);
    console.error(JSON.stringify({ event: "api_request", request_id: requestId, fn: requestedFunction, status: statusCode, duration_ms: Date.now() - startedAt, error: error.name || "Error" }));
    send(res, statusCode, { ok: false, error: error.name === "AbortError" ? "Apps Script phản hồi quá thời gian cho phép." : error.message });
  }
};
