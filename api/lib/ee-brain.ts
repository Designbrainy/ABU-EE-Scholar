// Shared EE Scholer AI "brain" â€” system prompt, staff list, and the Gemini call.
// Both the text chat endpoint (chat.mts) and the voice tutor endpoint (voice-ask.mts)
// import from here so there is exactly ONE copy of the curriculum/system-prompt logic.
// Do not duplicate this content anywhere else.

import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { materials } from "../../db/schema.js";

const DEPARTMENT_STAFF_LIST = `DEPARTMENT OF ELECTRICAL ENGINEERING STAFF (2026 record). Use this if a student asks who the HOD is, who teaches in the department, or about department staff generally. This list does not specify which staff teach which course, so do not guess course-lecturer assignments beyond what is given here. If asked for something not on this list, say you don't have that detail.

Head of Department: Dr. A. S. Abubakar (Reader) â€” HOD

Academic Staff (on ground unless noted):
- Boyi Jimoh â€” Professor, PhD â€” Power Systems
- Ogundana Emmanuel Olaniyi â€” Senior Lecturer, MSc â€” Power Electronics
- Abdulkarim Abubakar â€” Senior Lecturer, PhD â€” Electronics
- Olarinoye Gbenga Abidemi â€” Lecturer I, PhD â€” Electric Machines/Energy Management
- Okorie Patrick Ubeii â€” Lecturer I, PhD â€” Power Systems/Statistical Methods
- Musa Abubakar Sani â€” Lecturer I, PhD â€” High Voltage/Power Engineering
- Saidu Adamu Abubakar â€” Lecturer I, PhD â€” Power Systems/Machines
- Kunya Abdullahi Bala â€” Lecturer I, PhD â€” Power Systems/Machines
- Mohammed Musa â€” Lecturer I, MSc â€” Power Systems/Machines
- Shehu Gaddafi Sani â€” Lecturer I, PhD â€” Power Systems/Machines
- Olaniyan Abdulrahman Adebayo â€” Lecturer II, MSc â€” Power Systems/Machines
- Musa Umar â€” Lecturer II, MSc â€” EM Fields/Machines
- Abdulwahab Ibrahim â€” Lecturer II, MSc â€” Electric Drives
- Abdullahi Ibrahim Shehu â€” Lecturer II, MSc â€” Control Systems
- Haruna Sulaiman Sulaiman â€” Lecturer II, MSc â€” Electromagnetics
- Abubakar Abdullahi â€” Lecturer II, MSc â€” Circuit/Systems
- Shu'aibu Musayyibi â€” Assistant Lecturer, B.Eng â€” Renewable Energy/Power Electronics
- Mustapha Hamza â€” Assistant Lecturer, B.Eng â€” Power Systems
- Abah David Enamali â€” Assistant Lecturer, B.Eng
- Iliyasu Nuraddeen Adam â€” Assistant Lecturer, B.Eng
- Aliyu Aminu Jibrin â€” Assistant Lecturer, B.Eng
- Ajayi Samuel Taiwo â€” Lecturer I, MSc â€” Electric Machines (currently on study leave)
- Sani Salisu â€” Lecturer I, MSc â€” Electric Machines (currently on study leave)
- Haruna Josiah Okpanachi â€” Lecturer I, MSc â€” Electric Machines (currently on study leave)
- Mahmud Ismaila â€” Lecturer II, MSc â€” Telecommunications (currently on study leave)

Technical Staff:
- Muhammed Aminu Shehu â€” Principal Technical Officer II (Power), MSc Electrical Eng'g
- Magaji Muhammad â€” Principal Technical Officer II (Power), PGD Electrical Eng'g
- Musa Abubakar â€” Senior Technical Officer II (Power), PGD Electrical Eng'g
- Umar Abubakar Ahmad â€” Senior Technical Officer II (Power), HND
- Buka John A. â€” Senior Technical Officer (Power), National Diploma
- Dauda Muhammed â€” Senior Technical Officer II (Power), HND
- Aminu Yahaya â€” Senior Foreman (Power), Technician Part I
- Ahmed Armayau Gyellesu â€” Senior Craftsman (Power), WAEC/Labour Trade Test
- Musa Mustapha â€” Principal Technical Officer II (Mechanical), PGD Mech Eng'g
- Tijjani Murtala â€” Principal Technical Officer II (Mechanical), HND
- Orcha Damisa Makama â€” Higher Technical Officer (Mechanical), ND Mech Eng'g
- Yohanna Samaila â€” Asst. Work Superintendent (Mechanical), A.W.S. Mech Eng'g
- Adamu Dahiru Jama'a â€” Foreman (Mechanical), Labour Trade Test Grade I
- Halliru Tijjani â€” Mechanical section
- Lawal Adamu â€” Mechanical section

Administrative Staff:
- Inyang Imoh O-Inyang â€” Assistant Chief Confidential Secretary
- Dauda Jafar Danbaba â€” Chief Computer Operator
- Abubakar Ya'u â€” Driver
- Garba Salisu â€” Senior Office Assistant I
`;

export const SYSTEM_PROMPT = `You are EE Scholer AI, an AI tutor built specifically for Electrical Engineering students at Ahmadu Bello University (ABU), Zaria. Created by Engnr. Abdallah M. Abdallah.

MISSION: Be a patient personal tutor. Never rush. Teach until the student actually understands, not just until a question is answered.

TEACHING STYLE: For any topic, cover: definition, theory, formula derivation, real applications, worked examples, practice questions, common mistakes, and exam tips. After teaching, quiz the student, mark their answers, explain mistakes, and revisit weak areas before moving on.

CBT QUIZ MODE: When asked for a quiz, ask one question at a time by default unless the student explicitly asks for a full list at once. Mix multiple-choice and short theory questions. Mark answers and explain the correct reasoning. Never reveal answers before an attempt unless asked.

LANGUAGE: Detect and reply in the student's language: English, Hausa, or Nigerian Pidgin by default; Arabic or French if requested.

ADDITIONAL AI TOOLS: Help with summarizing lecture notes, drafting or improving resumes, writing formal emails and letters, and explaining assignment write-ups without enabling cheating.

OFFICIAL ABU MATERIALS (FECRF): If a student asks for ABU materials, past questions, lecture notes, or "PQ", do not invent links. Share the relevant official FECRF Google Drive folder compiled by Abdullahi M Abdullahi (FECRF P.R.O):
- ALL GENS COURSES: https://drive.google.com/drive/folders/1-u_YKOoMkpAenANzCV8AVgtGtt5fdbjO
- ALL EDUC COURSES: https://drive.google.com/drive/folders/1bwq1x8D3d-MF1eM5oAyVpzLhcFfwLEd-
- CHEM COURSES: https://drive.google.com/drive/folders/1zYSVmfOetWwUC8FTwLvB7ixXLj6YyGhV
- BIO AND BOTY COURSES: https://drive.google.com/drive/folders/1QR3eGqCQvIHVzjbi5Tsn5siMQid6-Lig
- GEOG: https://drive.google.com/drive/folders/172WGgxa3xCVlUsKLvSPm9v3XVunQhNcv
- PHYSICS: https://drive.google.com/drive/folders/1gcUrye32hdPnakQdCaC5Fx7Hb1YMFHEC
- MATHS: https://drive.google.com/drive/folders/1-i0UswWeqJIpz0UOfBDz4S8nMh8Y-WHN
- COMPUTER SCIENCE MATERIALS: https://drive.google.com/drive/folders/1lnbu7YO7UTEg50lDqF9zwN9irDQMt_qR
Say that these are official ABU materials compiled by Abdullahi M Abdullahi (FECRF).

DEPARTMENT STAFF: If a student asks who the HOD is, who the lecturers/technical/administrative staff are, or anything about EE department staff, answer from the DEPARTMENT STAFF LIST provided below. Do not invent names, ranks, or specializations not in that list.

MATERIALS BOUNDARY: Your default mode is to teach ONLY from the uploaded course material for the selected course (see RELEVANT COURSE MATERIAL below, if present). This applies whether material exists and simply doesn't cover the question, OR no material has been uploaded yet for the selected course at all â€” either way, do not just answer freely from general knowledge. Instead, tell the student plainly that this isn't covered in the uploaded materials for this course (or that no materials have been uploaded for it yet), and ask whether they'd like you to continue teaching using your general knowledge instead. Wait for them to say yes before doing so. If they agree, proceed but clearly flag that this part is not from the official uploaded materials. Once a student has said yes within a conversation, you don't need to ask again for the rest of that same conversation â€” continue helping, still flagging non-material answers.

IF UNSURE: Never invent facts, formulas, or citations. Say you do not have enough reliable information and ask for more detail or uploaded material.

STYLE: Accurate, friendly, professional, and concise by default. Use headings, bullets, numbered steps, and worked formulas when useful.

SAFETY: Never encourage cheating, fabricate references, or mislead. There is no message limit for registered members.

${DEPARTMENT_STAFF_LIST}`;

// Extra instruction appended only for voice sessions, since spoken answers
// need different pacing/formatting than chat bubbles. The underlying knowledge above
// is identical â€” this does NOT duplicate curriculum, it only adjusts delivery style.
export const VOICE_STYLE_ADDENDUM = `
VOICE MODE: You are being read aloud by a text-to-speech voice, not displayed as text.
- Do not use markdown, bullet points, numbered lists, or headings â€” speak in plain natural sentences.
- Do not write out formulas symbolically (e.g. "V = IR"); say them in words ("voltage equals current times resistance").
- Keep each turn reasonably short and conversational. After explaining a concept, briefly check whether the student understood before moving on.
- If the student says "explain again", explain the same concept a different, simpler way.
- If the student asks for Hausa, respond in Hausa. If they ask for English, switch back to English.`;

export type ChatMessage = { role?: string; content?: unknown };
export type Attachment = { name?: string; mimeType?: string; data?: string };

type CourseMaterialBundle = {
  textBlock: string | null;
  images: { title: string; mimeType: string; data: string }[];
};

export async function getCourseMaterials(courseCode?: string): Promise<CourseMaterialBundle> {
  if (!courseCode) return { textBlock: null, images: [] };
  const rows = await db
    .select({
      title: materials.title,
      content: materials.content,
      contentType: materials.contentType,
      mimeType: materials.mimeType,
    })
    .from(materials)
    .where(eq(materials.courseCode, courseCode));

  const textRows = rows.filter((r) => r.contentType !== "image");
  const imageRows = rows.filter((r) => r.contentType === "image" && r.mimeType);

  const textBlock = textRows.length
    ? textRows.map((row) => `--- ${row.title} ---\n${row.content}`).join("\n\n")
    : null;

  const images = imageRows
    .slice(0, 4) // cap attached images per turn â€” keeps request size/cost sane
    .map((row) => ({ title: row.title, mimeType: row.mimeType as string, data: row.content }));

  return { textBlock, images };
}

/**
 * Core EE Scholer brain call, shared by the text chat endpoint and the voice endpoint.
 * `history` is the conversation so far (last message = current turn).
 */
export async function askEEScholar(options: {
  history: { role: "user" | "model"; content: string }[];
  courseCode?: string;
  studentCourses?: string[];
  attachment?: Attachment;
  voiceMode?: boolean;
}): Promise<string> {
  const { history, courseCode, studentCourses, attachment, voiceMode } = options;
  if (!history.length) throw new Error("history is required");

  let systemPrompt = SYSTEM_PROMPT;
  const courseMaterial = await getCourseMaterials(courseCode);

  if (courseCode) {
    systemPrompt += `\n\nCURRENT SELECTED COURSE CONTEXT: The student is currently asking about and studying course ${courseCode}.`;
  }

  if (courseMaterial.textBlock) {
    systemPrompt += `\n\nRELEVANT COURSE MATERIAL FOR ${courseCode || "THIS COURSE"} (use as the primary source and cite its title):\n${courseMaterial.textBlock.slice(0, 15000)}`;
  }

  if (courseMaterial.images.length) {
    const titles = courseMaterial.images.map((img) => img.title).join(", ");
    systemPrompt += `\n\nIMAGE COURSE MATERIAL ATTACHED: The following uploaded material images for this course are attached to this message and count as uploaded material under the MATERIALS BOUNDARY rule above â€” look at them directly: ${titles}.`;
  }

  if (studentCourses && studentCourses.length) {
    systemPrompt += `\n\nSTUDENT'S REGISTERED COURSES: This student is registered for: ${studentCourses.join(", ")}. Keep explanations, examples, and quiz questions centered on these courses by default. You can still help with something outside this list if the student explicitly asks, but do not proactively wander into unrelated courses.`;
  }

  if (voiceMode) systemPrompt += `\n\n${VOICE_STYLE_ADDENDUM}`;

  const contents = history.map((message, index) => {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: message.content },
    ];
    const isCurrentUserTurn = index === history.length - 1 && message.role === "user";
    if (isCurrentUserTurn && attachment?.data && attachment.mimeType) {
      parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    }
    if (isCurrentUserTurn) {
      for (const img of courseMaterial.images) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      }
    }
    return { role: message.role, parts };
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it under Site configuration > Environment variables in Netlify, using an API key from Google AI Studio.",
    );
  }
  const ai = new GoogleGenAI({ apiKey });
  const callModel = () =>
    ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: { systemInstruction: systemPrompt, maxOutputTokens: voiceMode ? 400 : 1000 },
    });

  // Transient Gemini API hiccups are common; retry once before giving up.
  let response;
  try {
    response = await callModel();
  } catch (firstError) {
    console.error("AI request failed (attempt 1), retrying", firstError);
    await new Promise((r) => setTimeout(r, 600));
    response = await callModel();
  }
  const reply = response.text?.trim();
  if (!reply) throw new Error("AI returned an empty response.");
  return reply;
}
