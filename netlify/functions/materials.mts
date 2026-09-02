import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ensureTables } from "../../db/init.js";
import { materials } from "../../db/schema.js";
import { isAdminRequest, adminAuthErrorResponse } from "./lib/admin-auth.mts";

const MAX_PDF_BASE64_LENGTH = 8 * 1024 * 1024; // ~6MB raw PDF before base64 overhead
const MAX_IMAGE_BASE64_LENGTH = 8 * 1024 * 1024; // ~6MB raw image before base64 overhead
const MAX_STORED_CONTENT_CHARS = 200000; // keep individual text materials from growing unbounded
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

async function extractPdfText(base64: string): Promise<string> {
  const { default: pdfParse } = await import("pdf-parse");
  const buffer = Buffer.from(base64, "base64");
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

export default async (req: Request) => {
  const url = new URL(req.url);

  try {
    await ensureTables(db);
    if (req.method === "GET") {
      // Reading the raw material list is an admin-panel feature (it shows
      // full titles per course); the tutor itself reads material content
      // straight from the database in ee-brain.mts, not through this route.
      if (!isAdminRequest(req)) return adminAuthErrorResponse();
      const courseCode = url.searchParams.get("courseCode");

      // Special case: no courseCode means "list every course code that has
      // materials". This is how the admin panel remembers custom course
      // codes (ones typed in manually, not from the built-in course list)
      // across reloads — without this, a custom code you'd uploaded to
      // would vanish from the dropdown the moment the page refreshed, even
      // though its materials were still safely in the database.
      if (!courseCode) {
        const rows = await db
          .selectDistinct({ courseCode: materials.courseCode })
          .from(materials);
        return Response.json({ courseCodes: rows.map((r) => r.courseCode).sort() });
      }
      const rows = await db
        .select({
          id: materials.id,
          courseCode: materials.courseCode,
          title: materials.title,
          contentType: materials.contentType,
          mimeType: materials.mimeType,
          createdAt: materials.createdAt,
          // content deliberately omitted from the list view — large base64
          // image/PDF-text payloads aren't needed to render the admin list.
        })
        .from(materials)
        .where(eq(materials.courseCode, courseCode));
      return Response.json({ materials: rows });
    }

    if (req.method === "POST") {
      if (!isAdminRequest(req)) return adminAuthErrorResponse();

      const body = await req.json();
      const { courseCode, title, content, pdfBase64, imageBase64, imageMimeType } = body || {};
      if (!courseCode || !title) {
        return Response.json({ error: "courseCode and title are required." }, { status: 400 });
      }

      // Image upload: stored as-is (base64) and shown directly to the AI as an
      // image when this course's material is used, rather than OCR'd to text —
      // handwritten notes/diagrams/scanned pages often aren't clean OCR targets,
      // and Gemini can read the image directly.
      if (typeof imageBase64 === "string" && imageBase64.length > 0) {
        if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
          return Response.json({ error: "Image is too large. Please upload a file under 6MB." }, { status: 413 });
        }
        let mimeType = typeof imageMimeType === "string" ? imageMimeType.toLowerCase().trim() : "";
        if (mimeType === "image/jpg") mimeType = "image/jpeg";
        if (!mimeType) mimeType = "image/jpeg";
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType) && mimeType !== "image/jpeg") {
          return Response.json(
            { error: "Unsupported image type. Please upload a JPG, PNG, or WEBP file." },
            { status: 400 },
          );
        }
        const [material] = await db
          .insert(materials)
          .values({
            courseCode: String(courseCode),
            title: String(title),
            content: imageBase64,
            contentType: "image",
            mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
          })
          .returning();
        return Response.json({ material }, { status: 201 });
      }

      // PDF upload: text extracted server-side and stored as plain text.
      let finalContent: string;
      if (typeof pdfBase64 === "string" && pdfBase64.length > 0) {
        if (pdfBase64.length > MAX_PDF_BASE64_LENGTH) {
          return Response.json({ error: "PDF is too large. Please upload a file under 6MB." }, { status: 413 });
        }
        try {
          finalContent = (await extractPdfText(pdfBase64)).trim();
        } catch (pdfError) {
          console.error("PDF text extraction failed", pdfError);
          return Response.json(
            { error: "Couldn't read that PDF — it may be scanned/image-only or corrupted." },
            { status: 422 },
          );
        }
        if (!finalContent) {
          return Response.json(
            {
              error:
                "No extractable text found in that PDF (it may be scanned images without a text layer). " +
                "Try converting the pages to JPG/PNG and uploading those instead.",
            },
            { status: 422 },
          );
        }
      } else if (typeof content === "string" && content.trim()) {
        finalContent = content.trim();
      } else {
        return Response.json(
          { error: "Provide content text, a pdfBase64 file, or an imageBase64 file." },
          { status: 400 },
        );
      }

      const sanitizedContent = finalContent.replace(/\0/g, "").slice(0, MAX_STORED_CONTENT_CHARS);

      const [material] = await db
        .insert(materials)
        .values({
          courseCode: String(courseCode),
          title: String(title),
          content: sanitizedContent,
          contentType: "text",
        })
        .returning();
      return Response.json({ material }, { status: 201 });
    }

    if (req.method === "DELETE") {
      if (!isAdminRequest(req)) return adminAuthErrorResponse();
      const id = Number(url.searchParams.get("id"));
      if (!Number.isInteger(id) || id < 1) {
        return Response.json({ error: "A valid id query param is required." }, { status: 400 });
      }
      await db.delete(materials).where(eq(materials.id, id));
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Materials request failed", error);
    return Response.json({ error: "Materials service is temporarily unavailable." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/materials" };
