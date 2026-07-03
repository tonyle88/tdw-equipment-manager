const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby0DDY9YqmdnT2YtIvyfZTOB9_jauXUq4V-8W00ymb4Bs4Qh-MuB_sk2Uu3C1t7qcnCHA/exec";

const SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL;

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
  if (fn === "getAppData") {
    const [assetsResponse, settingsResponse] = await Promise.all([
      fetch(`${SCRIPT_URL}?sheet=Assets`),
      fetch(`${SCRIPT_URL}?sheet=Settings`),
    ]);
    const [assetsPayload, settingsPayload] = await Promise.all([assetsResponse.json(), settingsResponse.json()]);
    if (assetsPayload.ok === false) throw new Error(assetsPayload.error || "Không đọc được Assets");
    if (settingsPayload.ok === false) throw new Error(settingsPayload.error || "Không đọc được Settings");
    return {
      ok: true,
      assets: assetsPayload.data || [],
      settings: settingsPayload.data || [],
      updated_at: new Date().toISOString(),
    };
  }

  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: fn, args }),
  });
  const payload = await response.json();
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
    const payload = await callGoogleScript(body.fn, body.args || []);
    send(res, 200, payload);
  } catch (error) {
    send(res, 500, { ok: false, error: error.message });
  }
};
