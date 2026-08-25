import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial().primaryKey(),
  email: text("email").notNull().unique(),
  regNumber: text("reg_number").notNull().unique(),
  name: text().notNull(),
  level: text().notNull(),
  semester: text().notNull(),
  courses: text().notNull().default("[]"),
  passwordHash: text("password_hash").notNull(),
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materials = pgTable("materials", {
  id: serial().primaryKey(),
  courseCode: text("course_code").notNull(),
  title: text().notNull(),
  content: text().notNull(),
  contentType: text("content_type").notNull().default("text"), // "text" (pasted/PDF-extracted) or "image" (content holds base64 image data)
  mimeType: text("mime_type"), // set for contentType "image", e.g. "image/jpeg"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const announcements = pgTable("announcements", {
  id: serial().primaryKey(),
  message: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
