import { sql } from "drizzle-orm";

let initialized = false;

export async function ensureTables(db: any) {
  if (initialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "materials" (
        "id" serial PRIMARY KEY,
        "course_code" text NOT NULL,
        "title" text NOT NULL,
        "content" text NOT NULL,
        "content_type" text NOT NULL DEFAULT 'text',
        "mime_type" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY,
        "email" text,
        "reg_number" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "level" text NOT NULL,
        "semester" text NOT NULL,
        "courses" text DEFAULT '[]' NOT NULL,
        "password_hash" text NOT NULL,
        "reset_token_hash" text,
        "reset_token_expires_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text`);
    } catch {}

    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_hash" text`);
    } catch {}

    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamp with time zone`);
    } catch {}

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "announcements" (
        "id" serial PRIMARY KEY,
        "message" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    initialized = true;
  } catch (err) {
    console.error("Failed to initialize database tables:", err);
  }
}
