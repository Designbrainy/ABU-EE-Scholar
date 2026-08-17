import type { Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { announcements } from "../../db/schema.js";
import { isAdminRequest, adminAuthErrorResponse } from "./lib/admin-auth.mts";

const MAX_ANNOUNCEMENTS_RETURNED = 20;
const MAX_MESSAGE_LENGTH = 2000;

export default async (req: Request) => {
  const url = new URL(req.url);

  try {
    // Reading announcements is public — every signed-in and guest user sees them.
    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(announcements)
        .orderBy(desc(announcements.createdAt))
        .limit(MAX_ANNOUNCEMENTS_RETURNED);
      return Response.json({ announcements: rows });
    }

    // Posting and removing announcements is admin-only.
    if (req.method === "POST") {
      if (!isAdminRequest(req)) return adminAuthErrorResponse();
      const body = await req.json();
      const message = typeof body?.message === "string" ? body.message.trim() : "";
      if (!message) {
        return Response.json({ error: "message is required." }, { status: 400 });
      }
      const [announcement] = await db
        .insert(announcements)
        .values({ message: message.slice(0, MAX_MESSAGE_LENGTH) })
        .returning();
      return Response.json({ announcement }, { status: 201 });
    }

    if (req.method === "DELETE") {
      if (!isAdminRequest(req)) return adminAuthErrorResponse();
      const id = Number(url.searchParams.get("id"));
      if (!Number.isInteger(id) || id < 1) {
        return Response.json({ error: "A valid id query param is required." }, { status: 400 });
      }
      await db.delete(announcements).where(eq(announcements.id, id));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Announcements request failed", error);
    return Response.json({ error: "Announcements service is temporarily unavailable." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/announcements" };
