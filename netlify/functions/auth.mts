import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

// ABU EE registration numbers look like u22ee1234 — a "u", a 2-digit intake
// year, "ee", then a serial number. ADD THE NEW YEAR CODE HERE each admission
// season (e.g. add "26" once u26ee students are admitted). Do not remove old
// codes — students from earlier intakes still need to log in.
const ALLOWED_INTAKE_YEARS = ["21", "22", "23", "24", "25"];

function normalizeRegNumber(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "");
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

function publicUser(user: typeof users.$inferSelect) {
  let courses: string[] = [];
  try {
    courses = JSON.parse(user.courses);
  } catch {
    courses = [];
  }
  return { name: user.name, regNumber: user.regNumber, level: user.level, semester: user.semester, courses };
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "signup") {
      const { name, regNumber, level, semester, courses, password } = body;
      if (typeof name !== "string" || !name.trim() || typeof regNumber !== "string" || !regNumber.trim()) {
        return Response.json({ error: "Full name and registration number are required." }, { status: 400 });
      }
      if (typeof password !== "string" || !password) {
        return Response.json({ error: "Password is required." }, { status: 400 });
      }
      if (password.length < 4) {
        return Response.json({ error: "Password should be at least 4 characters." }, { status: 400 });
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

      const existing = await db.select({ id: users.id }).from(users).where(eq(users.regNumber, normalizedReg)).limit(1);
      if (existing.length) {
        return Response.json(
          { error: "That registration number is already registered. Log in instead." },
          { status: 409 },
        );
      }

      const [user] = await db
        .insert(users)
        .values({
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

    if (action === "login") {
      const { regNumber, password } = body;
      if (typeof regNumber !== "string" || !regNumber.trim() || typeof password !== "string" || !password) {
        return Response.json({ error: "Registration number and password are required." }, { status: 400 });
      }

      const normalizedReg = normalizeRegNumber(regNumber);
      const [user] = await db.select().from(users).where(eq(users.regNumber, normalizedReg)).limit(1);
      if (!user) {
        return Response.json({ error: "No account found with that registration number. Sign up first." }, { status: 404 });
      }
      if ((await sha256Hex(password)) !== user.passwordHash) {
        return Response.json({ error: "Wrong password." }, { status: 401 });
      }

      return Response.json({ user: publicUser(user) });
    }

    return Response.json({ error: "Unknown action. Use 'signup' or 'login'." }, { status: 400 });
  } catch (error) {
    console.error("Auth request failed", error);
    return Response.json({ error: "Account service is temporarily unavailable." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/auth" };
