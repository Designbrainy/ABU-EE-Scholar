// Script to clear all user accounts and saved passwords from the EE Scholar AI database
// Usage: node scripts/clear-users.mjs [--api-url=http://localhost:8888/api/auth] [--passcode=YOUR_ADMIN_PASSCODE]

const args = process.argv.slice(2);
const apiUrlArg = args.find((a) => a.startsWith("--api-url="))?.split("=")[1] ||
  (args.includes("--api-url") ? args[args.indexOf("--api-url") + 1] : null);
const passcodeArg = args.find((a) => a.startsWith("--passcode="))?.split("=")[1] ||
  (args.includes("--passcode") ? args[args.indexOf("--passcode") + 1] : null);

const API_URL = apiUrlArg || process.env.AUTH_API_URL || process.env.API_URL || "http://localhost:8888/api/auth";
const ADMIN_PASSCODE = passcodeArg || process.env.ADMIN_PASSCODE || "eescholarai-admin-2026";

async function clearUsers() {
  console.log(`\n======================================================`);
  console.log(`🗑️  EE Scholar AI — Clearing User Database`);
  console.log(`Target: ${API_URL}`);
  console.log(`======================================================\n`);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-passcode": ADMIN_PASSCODE,
      },
      body: JSON.stringify({
        action: "clear-all-users",
        adminPasscode: ADMIN_PASSCODE,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`❌ Failed to clear database (${res.status}):`, data.error || data);
      process.exit(1);
    }

    console.log(`✅ Success: ${data.message || "All user accounts and passwords have been cleared."}`);
    console.log(`👉 Students will now create fresh accounts upon next visit.\n`);
  } catch (err) {
    console.error(`❌ Network error while connecting to ${API_URL}:`, err.message);
    console.log(`\nTip: If Netlify dev is running on a different port, pass --api-url=http://localhost:PORT/api/auth`);
    process.exit(1);
  }
}

clearUsers();
