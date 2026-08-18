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

Deploy the repository to Netlify. No frontend build command is required. Netlify automatically bundles the functions and applies migrations from `netlify/database/migrations/`.

The live site includes a **Download Web App** link that serves `downloads/ee-scholer-ai-web-app.zip`.

## Project structure

```text
index.html                         app entry page
css/style.css                      interface styling
js/app.js                          frontend behavior
assets/profile.jpg                 app image
db/schema.ts                       Drizzle database schema
db/index.ts                        Netlify Database client
netlify/functions/*.mts            API functions
netlify/database/migrations/       deploy-time database migrations
downloads/                         downloadable web app archive
netlify.toml                       Netlify site configuration
```
