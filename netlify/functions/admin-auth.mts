import type { Config } from "@netlify/functions";
import { getEffectiveAdminPasscode } from "./lib/admin-auth.mts";

// Used only by the admin login modal to check a passcode attempt. Does not
// issue a session — the client re-sends the passcode as the x-admin-passcode
// header on every subsequent admin write, and each endpoint verifies it
// server-side again (see lib/admin-auth.mts). This endpoint just gives the
// login form a fast yes/no without leaking the real passcode value.
export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  try {
    const body = await req.json();
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    if (passcode !== getEffectiveAdminPasscode()) {
      return Response.json({ error: "Wrong admin passcode." }, { status: 401 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Admin auth check failed", error);
    return Response.json({ error: "Admin service is temporarily unavailable." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/admin-auth" };
