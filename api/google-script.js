const ALLOWED_FUNCTIONS = new Set([
  "getAppData",
  "loginUser",
  "logoutUser",
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
  "saveMovementLog",
  "saveSoftwareLicense",
]);

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

function send(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))).toString("utf8");
}

async function callGoogleScript(fn, args = []) {
  if (!SCRIPT_URL) throw new Error("Thiếu biến môi trường GOOGLE_SCRIPT_URL trên Vercel.");

  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: fn, args }),
  });

  const responseText = await response.text();
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    const compactText = responseText.replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(`Apps Script không trả JSON. Hãy deploy lại Web App mới. Phản hồi: ${compactText || response.status}`);
  }

  if (!response.ok || payload.ok === false) throw new Error(payload.error || `Apps Script lỗi ${response.status}`);
  return payload;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const bodyText = await readBody(req);
    const body = bodyText ? JSON.parse(bodyText) : {};
    if (!ALLOWED_FUNCTIONS.has(body.fn)) {
      send(res, 400, { ok: false, error: "Hàm API không được phép." });
      return;
    }
    if (body.args && !Array.isArray(body.args)) {
      send(res, 400, { ok: false, error: "Tham số API không hợp lệ." });
      return;
    }
    const payload = await callGoogleScript(body.fn, body.args || []);
    send(res, 200, payload);
  } catch (error) {
    send(res, 500, { ok: false, error: error.message });
  }
};
