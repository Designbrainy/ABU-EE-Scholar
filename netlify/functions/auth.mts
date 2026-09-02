import type { Config } from "@netlify/functions";
import { eq, or, and, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ensureTables } from "../../db/init.js";
import { users } from "../../db/schema.js";
import { sendPasswordResetEmail } from "./lib/email.mts";
import { getEffectiveAdminPasscode, isAdminRequest } from "./lib/admin-auth.mts";

// ABU EE registration numbers look like u22ee1234 — a "u", a 2-digit intake
// year, "ee", then a serial number. ADD THE NEW YEAR CODE HERE each admission
// season (e.g. add "26" once u26ee students are admitted). Do not remove old
// codes — students from earlier intakes still need to log in.
const ALLOWED_INTAKE_YEARS = ["21", "22", "23", "24", "25", "26"];

function normalizeRegNumber(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidRegNumber(regNumber: string): boolean {
  const yearGroup = ALLOWED_INTAKE_YEARS.join("|");
  const pattern = new RegExp(`^u(${yearGroup})ee\\d{2,6}$`);
  return pattern.test(regNumber);
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.URL) return process.env.URL.replace(/\/$/, "");

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "localhost:8889";
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");

  return `${protocol}://${host}`;
}

function publicUser(user: typeof users.$inferSelect) {
  let courses: string[] = [];
  try {
    courses = JSON.parse(user.courses);
  } catch {
    courses = [];
  }
  return {
    name: user.name,
    email: user.email || "",
    regNumber: user.regNumber,
    level: user.level,
    semester: user.semester,
    courses,
  };
}

export default async (req: Request) => {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    await ensureTables(db);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ──────────────────────────────────────────
    // 1. SIGNUP
    // ──────────────────────────────────────────
    if (action === "signup") {
      const { name, regNumber, email, level, semester, courses, password } = body;

      if (typeof name !== "string" || !name.trim()) {
        return Response.json({ error: "Full name is required." }, { status: 400 });
      }
      if (typeof regNumber !== "string" || !regNumber.trim()) {
        return Response.json({ error: "Registration number is required." }, { status: 400 });
      }
      if (typeof email !== "string" || !email.trim()) {
        return Response.json({ error: "Email address is required." }, { status: 400 });
      }
      if (typeof password !== "string" || !password) {
        return Response.json({ error: "Password is required." }, { status: 400 });
      }
      if (password.length < 4) {
        return Response.json({ error: "Password should be at least 4 characters." }, { status: 400 });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return Response.json({ error: "Please enter a valid email address (e.g. name@example.com)." }, { status: 400 });
      }

      const normalizedReg = normalizeRegNumber(regNumber);
      if (!isValidRegNumber(normalizedReg)) {
        return Response.json(
          {
            error:
              "That doesn't look like a valid ABU EE registration number (e.g. u22ee1234). Accepted intakes: " +
              ALLOWED_INTAKE_YEARS.map((y) => `u${y}ee`).join(", ") + ".",
          },
          { status: 400 },
        );
      }

      // Check for existing registration number or email
      const existing = await db
        .select({ id: users.id, regNumber: users.regNumber, email: users.email })
        .from(users)
        .where(or(eq(users.regNumber, normalizedReg), eq(users.email, normalizedEmail)))
        .limit(2);

      if (existing.length) {
        const foundReg = existing.find((u) => u.regNumber === normalizedReg);
        if (foundReg) {
          return Response.json(
            { error: "That registration number is already registered. Log in instead." },
            { status: 409 },
          );
        }
        return Response.json(
          { error: "An account with that email address already exists. Log in instead." },
          { status: 409 },
        );
      }

      const [user] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          regNumber: normalizedReg,
          name: name.trim(),
          level: String(level || "100"),
          semester: String(semester || "First Semester"),
          courses: JSON.stringify(Array.isArray(courses) ? courses : []),
          passwordHash: await sha256Hex(password),
        })
        .returning();

      return Response.json({ user: publicUser(user) }, { status: 201 });
    }

    // ──────────────────────────────────────────
    // 2. LOGIN (by Email or Reg Number)
    // ──────────────────────────────────────────
    if (action === "login") {
      const { email, regNumber, password } = body;
      const identifier = String(email || regNumber || "").trim();

      if (!identifier || typeof password !== "string" || !password) {
        return Response.json({ error: "Email address and password are required." }, { status: 400 });
      }

      const normalizedId = identifier.toLowerCase().replace(/\s+/g, "");
      const [user] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, identifier.toLowerCase().trim()), eq(users.regNumber, normalizedId)))
        .limit(1);

      if (!user) {
        return Response.json(
          { error: "No account found with that email address or reg number. Sign up first." },
          { status: 404 },
        );
      }

      if ((await sha256Hex(password)) !== user.passwordHash) {
        return Response.json(
          { error: "Wrong password. If you forgot your password, use 'Forgot password?' to reset it." },
          { status: 401 },
        );
      }

      return Response.json({ user: publicUser(user) });
    }

    // ──────────────────────────────────────────
    // 3. REQUEST PASSWORD RESET (FORGOT PASSWORD)
    // ──────────────────────────────────────────
    if (action === "request-password-reset" || action === "forgot-password") {
      const { email } = body;
      if (typeof email !== "string" || !email.trim()) {
        return Response.json({ error: "Please enter your email address." }, { status: 400 });
      }

      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) {
        return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
      }

      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

      if (user) {
        const rawToken = generateSecureToken();
        const tokenHash = await sha256Hex(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

        await db
          .update(users)
          .set({
            resetTokenHash: tokenHash,
            resetTokenExpiresAt: expiresAt,
          })
          .where(eq(users.id, user.id));

        const baseUrl = getBaseUrl(req);
        const resetUrl = `${baseUrl}/?reset_token=${rawToken}`;

        // Send email asynchronously (logged to console if no third-party key configured)
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl,
        });
      }

      // Always return a generic success message to prevent user email enumeration
      return Response.json({
        message:
          "If an account is associated with that email address, a password reset link has been sent. Please check your inbox and spam folder.",
      });
    }

    // ──────────────────────────────────────────
    // 4. VERIFY RESET TOKEN
    // ──────────────────────────────────────────
    if (action === "verify-reset-token") {
      const { token } = body;
      if (typeof token !== "string" || !token.trim()) {
        return Response.json({ valid: false, error: "Reset token is required." }, { status: 400 });
      }

      const tokenHash = await sha256Hex(token.trim());
      const [user] = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(and(eq(users.resetTokenHash, tokenHash), gt(users.resetTokenExpiresAt, new Date())))
        .limit(1);

      if (!user) {
        return Response.json(
          { valid: false, error: "This password reset link is invalid or has expired." },
          { status: 400 },
        );
      }

      return Response.json({ valid: true, email: user.email, name: user.name });
    }

    // ──────────────────────────────────────────
    // 5. RESET PASSWORD WITH TOKEN
    // ──────────────────────────────────────────
    if (action === "reset-password") {
      const { token, newPassword } = body;

      if (typeof token !== "string" || !token.trim()) {
        return Response.json({ error: "Reset token is required." }, { status: 400 });
      }
      if (typeof newPassword !== "string" || !newPassword) {
        return Response.json({ error: "New password is required." }, { status: 400 });
      }
      if (newPassword.length < 4) {
        return Response.json({ error: "New password should be at least 4 characters." }, { status: 400 });
      }

      const tokenHash = await sha256Hex(token.trim());
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.resetTokenHash, tokenHash), gt(users.resetTokenExpiresAt, new Date())))
        .limit(1);

      if (!user) {
        return Response.json(
          { error: "This password reset link is invalid or has expired. Please request a new one." },
          { status: 400 },
        );
      }

      const newPasswordHash = await sha256Hex(newPassword);

      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        })
        .where(eq(users.id, user.id));

      return Response.json({
        message: "Your password has been successfully reset! You can now log in with your new password.",
      });
    }

    // ──────────────────────────────────────────
    // 6. CHANGE PASSWORD (IN-APP FOR LOGGED-IN USERS)
    // ──────────────────────────────────────────
    if (action === "change-password") {
      const { regNumber, email, currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return Response.json({ error: "Current password and new password are required." }, { status: 400 });
      }
      if (newPassword.length < 4) {
        return Response.json({ error: "New password must be at least 4 characters long." }, { status: 400 });
      }

      const identifier = String(email || regNumber || "").trim();
      if (!identifier) {
        return Response.json({ error: "User identity is required." }, { status: 400 });
      }

      const normalizedId = identifier.toLowerCase().replace(/\s+/g, "");
      const [user] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, identifier.toLowerCase()), eq(users.regNumber, normalizedId)))
        .limit(1);

      if (!user) {
        return Response.json({ error: "User account not found." }, { status: 404 });
      }

      const currentHash = await sha256Hex(currentPassword);
      if (currentHash !== user.passwordHash) {
        return Response.json({ error: "Your current password is incorrect." }, { status: 401 });
      }

      const newPasswordHash = await sha256Hex(newPassword);
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));

      return Response.json({ message: "Password updated successfully." });
    }

    // ──────────────────────────────────────────
    // 7. UPDATE COURSES & PROFILE (IN-APP)
    // ──────────────────────────────────────────
    if (action === "update-courses" || action === "update-profile") {
      const { regNumber, email, level, semester, courses } = body;
      const identifier = String(email || regNumber || "").trim();
      if (!identifier) {
        return Response.json({ error: "User identity is required." }, { status: 400 });
      }

      const normalizedId = identifier.toLowerCase().replace(/\s+/g, "");
      const [user] = await db
        .select()
        .from(users)
        .where(or(eq(users.email, identifier.toLowerCase()), eq(users.regNumber, normalizedId)))
        .limit(1);

      if (!user) {
        return Response.json({ error: "User account not found." }, { status: 404 });
      }

      const validCourses: string[] = Array.isArray(courses)
        ? Array.from(
            new Set(
              courses
                .filter((c: unknown) => typeof c === "string" && (c as string).trim().length > 0)
                .map((c: string) => c.trim().toUpperCase()),
            ),
          )
        : [];

      const updatedLevel = typeof level === "string" && level.trim() ? level.trim() : user.level;
      const updatedSemester = typeof semester === "string" && semester.trim() ? semester.trim() : user.semester;

      const [updatedUser] = await db
        .update(users)
        .set({
          level: updatedLevel,
          semester: updatedSemester,
          courses: JSON.stringify(validCourses),
        })
        .where(eq(users.id, user.id))
        .returning();

      return Response.json({
        success: true,
        message: "Courses updated successfully.",
        user: publicUser(updatedUser),
      });
    }

    // ──────────────────────────────────────────
    // 8. ADMIN: CLEAR ALL SAVED USERS & PASSWORDS
    // ──────────────────────────────────────────
    if (action === "clear-all-users" || action === "clear-users" || action === "wipe-users" || req.method === "DELETE") {
      const headerPasscode = req.headers.get("x-admin-passcode");
      const bodyPasscode = body?.passcode || body?.adminPasscode;
      const effectivePasscode = getEffectiveAdminPasscode();

      if (headerPasscode !== effectivePasscode && bodyPasscode !== effectivePasscode) {
        return Response.json(
          { error: "Admin authentication required to clear the user database." },
          { status: 401 },
        );
      }

      await db.delete(users);

      return Response.json({
        success: true,
        message: "All saved user accounts and passwords have been successfully cleared from the database.",
      });
    }

    return Response.json(
      { error: "Unknown action. Use 'signup', 'login', 'request-password-reset', 'reset-password', 'change-password', or 'clear-all-users'." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Auth request failed", error);
    return Response.json({ error: "Account service is temporarily unavailable. Please try again." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/auth" };
