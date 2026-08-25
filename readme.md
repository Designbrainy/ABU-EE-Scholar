# EE Scholar AI

EE Scholar AI is a Netlify-hosted AI tutor for Electrical Engineering students at Ahmadu Bello University, Zaria. It includes guest and account chat, course-specific study materials, file attachments, and a Nigerian 5-point GPA/CGPA calculator.

## Stack

- Static HTML, CSS, and vanilla JavaScript frontend
- Modern Netlify Functions under `netlify/functions/`
- Google Gen AI SDK calling Gemini directly with your own API key
- Netlify Database with Drizzle ORM

## Local development

Install dependencies and start Netlify Dev on the project port:

```bash
npm install
npm run dev
```

Netlify Dev serves the site and emulates the `/api/*` functions. Netlify Database is configured by the Netlify project environment.

### AI setup (your own Gemini API key)

Get a key from [Google AI Studio](https://aistudio.google.com/apikey), then set it as an environment variable:

- Locally: add `GEMINI_API_KEY=your-key-here` to a `.env` file (or export it in your shell) before `npm run dev`.
- On Netlify: Site configuration → Environment variables → add `GEMINI_API_KEY`.

Billing happens directly on your Google Cloud project (pay-as-you-go for Gemini API usage), not through Netlify credits.

## Deployment

### 1. Deploying to Vercel

EE Scholar AI natively supports Vercel Serverless Functions and Vercel Postgres / Neon.

1. **Push or Import Repository**: Import the repository on [Vercel](https://vercel.com).
2. **Framework Preset**: Choose **Other** (Root directory: `./`).
3. **Environment Variables**:
   - `GEMINI_API_KEY`: Your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) *(Required)*.
   - `POSTGRES_URL` or `DATABASE_URL`: PostgreSQL connection string from Neon / Supabase / Vercel Postgres *(Required for persistent accounts & materials)*.
   - `RESEND_API_KEY`: API key from [Resend](https://resend.com) for password reset emails *(Optional)*.
   - `ADMIN_PASSCODE`: Passcode for admin materials upload & user resets *(Optional, default: `eescholarai-admin-2026`)*.
4. **Deploy CLI**:
   ```bash
   npx vercel --prod
   ```

### 2. Deploying to Netlify

1. Deploy the repository to Netlify (or run `npx netlify deploy --prod`).
2. Add `GEMINI_API_KEY` (and optionally `RESEND_API_KEY`) in Netlify Site Configuration → Environment Variables.

## Project structure

```text
index.html                         App entry page
css/style.css                      Interface styling
js/app.js                          Frontend behavior
assets/                            Static assets & icons
db/schema.ts                       Drizzle database schema
db/index.ts                        Universal Database client (Neon / Postgres / Netlify DB)
api/*.ts                           Vercel serverless API routes
netlify/functions/*.mts            Netlify serverless functions
netlify/database/migrations/       Deploy-time database migrations
vercel.json                        Vercel platform routing & security headers
netlify.toml                       Netlify platform configuration
```
