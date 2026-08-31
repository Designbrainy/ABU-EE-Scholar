import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ensureTables } from "../db/init.js";
import { announcements } from "../db/schema.js";
import { isAdminRequest, adminAuthErrorResponse } from "./lib/admin-auth.js";
import { createVercelHandler } from "./lib/adapter.js";

export const config = { maxDuration: 60 };

const MAX_ANNOUNCEMENTS_RETURNED = 20;
const MAX_MESSAGE_LENGTH = 2000;

async function handler(req: Request) {
  const url = new URL(req.url);

  try {
    await ensureTables(db);
    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(announcements)
        .orderBy(desc(announcements.createdAt))
        .limit(MAX_ANNOUNCEMENTS_RETURNED);
      return Response.json({ announcements: rows });
    }

    if (req.method === "POST") {
      if (!isAdminRequest(req)) return adminAuthErrorResponse();
      const body = await req.json().catch(() => ({}));
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
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
export default createVercelHandler(handler);
