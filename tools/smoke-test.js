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
  assertSyntax("google-apps-script/Code.gs");
  assertSyntax("api/google-script.js");

  const appsScript = read("google-apps-script/Code.gs");
  const app = read("app/app.js");
  assert.ok(appsScript.includes("softwareLicenses: readSheetAsObjects_(SHEET_NAMES.softwareLicenses).map(publicSoftwareLicense_)"));
  assert.ok(appsScript.includes("function getSoftwareLicenseKey(licenseId, token)"));
  assert.ok(!app.includes("license.license_key)"));

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
