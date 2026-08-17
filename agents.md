# AGENTS.md

## Architecture

EE Scholer AI is a static HTML, CSS, and JavaScript app deployed on Netlify. Its `/api/auth`, `/api/chat`, and `/api/materials` routes are modern Netlify Functions in `netlify/functions/`.

- AI requests use the official Google Gen AI SDK with a Gemini API key set in the `GEMINI_API_KEY`
  environment variable (see readme.md). No browser-side API key is used; billing is directly on the
  Google Cloud project tied to that key, not through Netlify.
- Persistent users and study materials use Netlify Database with Drizzle ORM.
- The schema source is `db/schema.ts`; deploy-time migrations live in `netlify/database/migrations/`.
- The frontend has no build step and calls the friendly `/api/*` paths configured in each function.
- A downloadable source archive is published at `/downloads/ee-scholer-ai-web-app.zip`.
- The shared AI system prompt / curriculum logic lives in `netlify/functions/lib/ee-brain.mts` and is
  used by both `/api/chat` (text) and the Voice Tutor (see below), so there is one source of truth.
- The 🎙️ Voice Tutor button uses the browser's own built-in speech engine — no third-party voice
  service or API key required. See "Voice Tutor" below.

## Admin access

The Admin passcode is a real server-side secret (Netlify environment variable `ADMIN_PASSCODE`), not
a value in the shipped frontend JS. `netlify/functions/lib/admin-auth.mts` exports `isAdminRequest(req)`,
which every admin-only write in `materials.mts` and `announcements.mts` calls before touching the
database; requests without a matching `x-admin-passcode` header are rejected with 401. The Admin login
modal calls `/api/admin-auth` to verify a passcode attempt before storing it in memory for the tab.

The Admin button itself is hidden (`class="hidden"` in index.html) and is only revealed client-side
when the page is loaded with `?admin=1` in the URL — this keeps it out of sight for ordinary students,
though the server-side passcode check remains the actual security boundary.

Materials can be added either as pasted text or as an uploaded PDF (`pdf-parse` extracts the text
server-side in `materials.mts`); PDFs over ~6MB or with no extractable text are rejected with a clear
error, since scanned/image-only PDFs have no text layer to extract.

Announcements (`announcements.mts` + the `announcements` table) let the admin broadcast short messages
to every user — shown in a banner at the top of the chat screen for guests and logged-in students alike.
Posting/removing announcements is admin-only; reading them is public.

## Conventions

- Use modern `.mts` Netlify Functions with standard `Request` and `Response` objects.
- Use Netlify platform primitives for AI and persistent data.
- Keep database column names snake_case and frontend JSON fields camelCase.
- Generate a migration after every schema change.
- Do not put shared/helper modules directly under `netlify/functions/` with a leading underscore
  (e.g. `_shared/`) — Netlify's function bundler excludes underscore-prefixed paths entirely, which
  breaks imports from real functions. Use `netlify/functions/lib/` instead.

## Voice Tutor

The 🎙️ Voice Tutor button (`js/voice.js`) works out of the box with no setup, no API keys, and no
third-party account:

- **Speech-to-text**: the browser's Web Speech API (`SpeechRecognition`) turns the student's spoken
  question into text. In Chrome this sends audio to Google's speech service to transcribe (it needs
  an internet connection, same as any other page load — it does not work fully offline).
- **Brain**: the transcript is sent to the same `/api/chat` endpoint the text chat uses, with a
  `voiceMode: true` flag so replies are phrased for speaking aloud (no markdown, no bullet lists,
  shorter turns) instead of for reading — see `VOICE_STYLE_ADDENDUM` in `netlify/functions/lib/ee-brain.mts`.
- **Text-to-speech**: the browser's Web Speech API (`speechSynthesis`) reads the reply back aloud.

Browser support: works well in Chrome (Android and desktop). `SpeechRecognition` is not supported in
Firefox and is limited in Safari — those browsers show a clear "not supported" message in the modal
rather than a dead button.

Language: if the student says "speak Hausa" / "in Hausa", recognition and speech switch to `ha-NG`;
"speak English" switches back to `en-US`. Actual Hausa speech-recognition/voice quality depends on
the browser/OS's installed voices and language packs — this can vary by device. The underlying text
chat's Hausa support (via the system prompt) is unaffected either way.

This feature needs zero configuration to deploy — no environment variables, no external dashboard
setup. It's ready as soon as the site is live.
