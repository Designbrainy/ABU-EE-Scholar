import { askEEScholar, type Attachment, type ChatMessage } from "./lib/ee-brain.js";
import { createVercelHandler } from "./lib/adapter.js";

export const config = { maxDuration: 60 };

async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const courseCode = typeof body?.courseCode === "string" ? body.courseCode : undefined;
    const studentCourses: string[] = Array.isArray(body?.studentCourses)
      ? body.studentCourses.filter((c: unknown) => typeof c === "string")
      : [];
    const attachment: Attachment | undefined = body?.attachment;
    const voiceMode = body?.voiceMode === true;

    if (!messages.length) {
      return Response.json({ error: "messages array is required." }, { status: 400 });
    }

    const maxBase64Length = 4 * 1024 * 1024;
    if (attachment?.data && attachment.data.length > maxBase64Length) {
      return Response.json({ error: "Attachment is too large. Please upload a file under 3MB." }, { status: 413 });
    }

    const history = messages.slice(-14).map((message) => ({
      role: (message.role === "user" ? "user" : "model") as "user" | "model",
      content: String(message.content ?? ""),
    }));

    const reply = await askEEScholar({ history, courseCode, studentCourses, attachment, voiceMode });
    return Response.json({ reply });
  } catch (error: any) {
    console.error("AI request failed", error);
    return Response.json(
      { error: error?.message || "The AI tutor is temporarily unavailable. Please try again in a moment." },
      { status: 500 },
    );
  }
}

export const POST = handler;
export default createVercelHandler(handler);
