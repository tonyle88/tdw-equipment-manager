const ALLOWED_FUNCTIONS = new Set([
  "getAppData",
  "getSoftwareLicenseKey",
  "healthCheck",
  "createBackup",
  "listBackups",
  "verifyBackup",
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
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ARG_COUNTS = {
  getAppData: 0, getSoftwareLicenseKey: 1, healthCheck: 0, createBackup: 0, listBackups: 0, verifyBackup: 1, restoreBackup: 1,
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
    if (/Phiên đăng nhập|Tài khoản không còn|đã bị thu hồi|mật khẩu không đúng|sử dụng đăng nhập Supabase/i.test(error.message)) error.statusCode = 401;
    throw error;
  }
  return payload;
}

function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || "POST",
    headers: {
      apikey: options.admin ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
      Authorization: `Bearer ${options.admin ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.msg || payload.message || payload.error_description || "Supabase Auth không phản hồi hợp lệ");
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

function signInSupabase(email, password) {
  return supabaseRequest("/auth/v1/token?grant_type=password", { body: { email, password } });
}

async function migrateLegacyLogin(payload, password) {
  const email = String(payload.user?.email || "").trim().toLowerCase();
  if (!email || !supabaseConfigured()) return payload;
  try {
    let authPayload;
    try {
      authPayload = await signInSupabase(email, password);
    } catch (_signInError) {
      const created = await supabaseRequest("/auth/v1/admin/users", {
        admin: true,
        body: {
          email,
          password,
          email_confirm: true,
          user_metadata: { username: payload.user.username || "", full_name: payload.user.full_name || "" },
        },
      });
      authPayload = await signInSupabase(email, password);
      if (!authPayload.user?.id && created.id) authPayload.user = created;
    }
    if (!authPayload.user?.id) throw new Error("Supabase không trả user ID sau khi chuyển đổi");
    await callGoogleScript("markSupabaseMigration", [email, authPayload.user.id, payload.token]);
    payload.user.auth_provider = "SUPABASE";
  } catch (error) {
    console.error(JSON.stringify({ event: "auth_migration_pending", error: error.name || "Error" }));
    payload.auth_migration_pending = true;
  }
  return payload;
}

async function login(credentials) {
  const identifier = String(credentials.username || credentials.email || "").trim().toLowerCase();
  const password = String(credentials.password || "");
  if (!identifier || !password) throw new Error("Vui lòng nhập email và mật khẩu");

  if (supabaseConfigured() && identifier.includes("@")) {
    try {
      const authPayload = await signInSupabase(identifier, password);
      if (authPayload.user?.id) return callGoogleScript("loginSupabaseUser", [identifier]);
    } catch (_error) {
      // Tài khoản chưa chuyển đổi sẽ được xác minh bằng mật khẩu cũ bên dưới.
    }
  }
  const legacyPayload = await callGoogleScript("loginUser", [{ username: identifier, password }]);
  return migrateLegacyLogin(legacyPayload, password);
}

async function syncSupabasePassword(fn, args, token) {
  if (!supabaseConfigured() || (fn !== "changeOwnPassword" && fn !== "resetUserPassword")) return;
  const authPayload = fn === "changeOwnPassword"
    ? await callGoogleScript("getCurrentAuthLink", [token])
    : await callGoogleScript("getUserAuthLink", [args[0], token]);
  const auth = authPayload.auth || {};
  if (String(auth.auth_provider || "").toUpperCase() !== "SUPABASE") return;
  if (!auth.supabase_user_id) throw new Error("Tài khoản Supabase chưa có user ID");
  const password = fn === "changeOwnPassword" ? args[0] : args[1];
  await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(auth.supabase_user_id)}`, {
    admin: true,
    method: "PUT",
    body: { password },
  });
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

    if (body.fn !== "loginUser") await syncSupabasePassword(body.fn, args, token);
    const payload = body.fn === "loginUser" ? await login(args[0] || {}) : await callGoogleScript(body.fn, [...args, token]);
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
