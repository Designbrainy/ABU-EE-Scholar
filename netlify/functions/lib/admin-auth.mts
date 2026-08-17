// Server-side admin check. This code lives in your project source, not the
// public browser bundle, so it's fine to keep a default here — it's still
// never visible to students the way the old client-side passcode was.
//
// Works with ZERO setup out of the box: drop the zip, deploy, and this
// default passcode works immediately. For real production security once
// this is live for 500 students, set your OWN value in Netlify under
// Site configuration > Environment variables > ADMIN_PASSCODE — that
// automatically overrides this default, no code change needed.
const DEFAULT_ADMIN_PASSCODE = "eescholarai-admin-2026";

export function getEffectiveAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE || DEFAULT_ADMIN_PASSCODE;
}

export function isAdminRequest(req: Request): boolean {
  const provided = req.headers.get("x-admin-passcode");
  return typeof provided === "string" && provided === getEffectiveAdminPasscode();
}

export function adminAuthErrorResponse(): Response {
  return Response.json({ error: "Admin authentication required." }, { status: 401 });
}
