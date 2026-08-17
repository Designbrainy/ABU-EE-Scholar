ALTER TABLE "materials" ADD COLUMN "content_type" text NOT NULL DEFAULT 'text';
ALTER TABLE "materials" ADD COLUMN "mime_type" text;
