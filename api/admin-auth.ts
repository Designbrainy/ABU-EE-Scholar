import { getEffectiveAdminPasscode } from "./lib/admin-auth.js";
import { createVercelHandler } from "./lib/adapter.js";

export const config = { maxDuration: 60 };

async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    if (passcode !== getEffectiveAdminPasscode()) {
      return Response.json({ error: "Wrong admin passcode." }, { status: 401 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Admin auth check failed", error);
    return Response.json({ error: "Admin service is temporarily unavailable." }, { status: 500 });
  }
}

const vercelHandler = createVercelHandler(handler);
export const POST = vercelHandler;
export default vercelHandler;

