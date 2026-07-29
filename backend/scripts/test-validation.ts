import "dotenv/config";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:4000";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
const ESP32_SECRET = process.env.ESP32_SHARED_SECRET!;

let sessionCookie = "";

async function loginAsAdmin() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`Admin login failed (${res.status}) — check TEST_ADMIN_EMAIL/PASSWORD in .env`);
  }

  // Extract just "pctrl_token=..." from the Set-Cookie header, dropping HttpOnly/SameSite/etc attributes
  const setCookie = res.headers.getSetCookie?.()[0] ?? res.headers.get("set-cookie") ?? "";
  sessionCookie = setCookie.split(";")[0];
  if (!sessionCookie) throw new Error("Login succeeded but no cookie was returned.");
}

interface TestCase {
  name: string;
  method: string;
  path: string;
  body?: object;
  headers?: Record<string, string>;
  expectedStatus: number;
  auth?: boolean;
}

const cases: TestCase[] = [
  // --- auth: public routes, no cookie needed ---
  { name: "login: invalid email format", method: "POST", path: "/api/auth/login", body: { email: "not-an-email", password: "x" }, expectedStatus: 400 },
  { name: "login: missing password", method: "POST", path: "/api/auth/login", body: { email: "a@b.com" }, expectedStatus: 400 },
  { name: "register: short password", method: "POST", path: "/api/auth/register", body: { name: "Test", email: "a@b.com", password: "short" }, expectedStatus: 400 },
  { name: "register: missing name", method: "POST", path: "/api/auth/register", body: { email: "a@b.com", password: "longenough123" }, expectedStatus: 400 },
  { name: "forgot-password: invalid email", method: "POST", path: "/api/auth/forgot-password", body: { email: "nope" }, expectedStatus: 400 },
  { name: "reset-password: missing token", method: "POST", path: "/api/auth/reset-password", body: { newPassword: "longenough123" }, expectedStatus: 400 },
  { name: "reset-password: short password", method: "POST", path: "/api/auth/reset-password", body: { token: "abc", newPassword: "short" }, expectedStatus: 400 },

  // --- admin: needs auth, malformed param ---
  { name: "admin approve: non-UUID id", method: "POST", path: "/api/admin/users/not-a-uuid/approve", expectedStatus: 400, auth: true },
  { name: "admin delete: non-UUID id", method: "DELETE", path: "/api/admin/users/12345/  ", expectedStatus: 400, auth: true },

  // --- sessions: needs auth, malformed param ---
  { name: "session get: non-UUID id", method: "GET", path: "/api/sessions/not-a-uuid", expectedStatus: 400, auth: true },
  { name: "session terminate: non-UUID id", method: "POST", path: "/api/sessions/xyz/terminate", expectedStatus: 400, auth: true },

  // --- esp32: needs shared secret header, not user auth ---
  { name: "esp32 alert: invalid event enum", method: "POST", path: "/api/esp32/alert", body: { event: "TORNADO", voltage: 220 }, headers: { "x-esp32-secret": ESP32_SECRET }, expectedStatus: 400 },
  { name: "esp32 alert: missing voltage", method: "POST", path: "/api/esp32/alert", body: { event: "NORMAL" }, headers: { "x-esp32-secret": ESP32_SECRET }, expectedStatus: 400 },
  { name: "esp32 alert: voltage as string", method: "POST", path: "/api/esp32/alert", body: { event: "NORMAL", voltage: "220" }, headers: { "x-esp32-secret": ESP32_SECRET }, expectedStatus: 400 },

  // --- sunshine: needs auth ---
  { name: "sunshine pair: missing pin", method: "POST", path: "/api/sunshine/pair", body: { name: "Test Device" }, expectedStatus: 400, auth: true },
  { name: "sunshine unpair: non-UUID uuid", method: "POST", path: "/api/sunshine/clients/unpair", body: { uuid: "not-a-uuid" }, expectedStatus: 400, auth: true },
];

async function runCase(tc: TestCase): Promise<boolean> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(tc.headers ?? {}) };
  if (tc.auth) headers["Cookie"] = sessionCookie;

  const res = await fetch(`${BASE_URL}${tc.path}`, {
    method: tc.method,
    headers,
    body: tc.body ? JSON.stringify(tc.body) : undefined,
  });

  const pass = res.status === tc.expectedStatus;
  const icon = pass ? "✅" : "❌";
  console.log(`${icon} ${tc.name} — expected ${tc.expectedStatus}, got ${res.status}`);

  if (!pass) {
    const body = await res.json().catch(() => null);
    console.log(`   response: ${JSON.stringify(body)}`);
  }

  return pass;
}

async function main() {
  console.log("Logging in as admin test account...\n");
  await loginAsAdmin();

  let passed = 0;
  for (const tc of cases) {
    if (await runCase(tc)) passed++;
  }

  console.log(`\n${passed}/${cases.length} passed`);
  if (passed !== cases.length) process.exit(1);
}

main().catch((err) => {
  console.error("[test-validation] Test script failed to run:", err);
  process.exit(1);
});