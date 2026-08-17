CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
