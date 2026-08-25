DELETE FROM "users";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_hash" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
