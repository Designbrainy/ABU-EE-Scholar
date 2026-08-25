# EE Scholar AI Material Seeding Script

This script recursively scans the material drives for 200L, 300L, and 400L materials, maps legacy or variant course codes to their official curriculum codes, extracts content (from PDFs, PPTX, Images), and seeds them into the local database via the `/api/materials` endpoint.

## Prerequisites

1. Ensure you have the `adm-zip` package installed (used for extracting text from PPTX files):
   ```bash
   npm install adm-zip
   ```
2. The EE Scholar AI app must be running locally via Netlify Dev on port `8889`. Start it in a separate terminal:
   ```bash
   npm run dev
   ```
   *(Ensure the local Postgres database is connected and migrated).*

3. The source materials must be accessible at `E:\Materials\...`.

## Features
- **Idempotency:** Tracks successfully processed files in `scripts/.seed-progress.json`. Re-running the script will skip already processed files.
- **Smart Mapping:** Converts legacy codes (e.g., `EEEN201` -> `ENGG205`).
- **File Parsing:**
  - PDFs are sent as Base64 to let the server's `pdf-parse` extract them.
  - PPTX files are unzipped on the fly to extract plain text content.
  - Images (JPEG, PNG, WebP) are encoded as Base64.
- **Rate Limiting:** Small 200ms delay between requests to avoid overloading the local server.

## Usage

Run the script from the project root:

```bash
node scripts/seed-materials.mjs
```

### Dry Run

To see what the script *would* do without actually making API POST requests or updating the progress file, use the `--dry-run` flag:

```bash
node scripts/seed-materials.mjs --dry-run
```

## Logs and Progress
- Skipped files (videos, unsupported formats, lock files) will be logged as `[SKIPPED]`.
- Failed API calls will be logged as `[ERROR]` and can be retried automatically on the next run.
- Successful uploads are logged as `[SUCCESS]` and marked in `.seed-progress.json`.

---

# Clear Users & Saved Passwords Script

To reset all student user accounts and passwords from the database (forcing all users to create fresh accounts with the new email schema):

```bash
# Default (local Netlify dev on port 8888 or custom port):
node scripts/clear-users.mjs --api-url=http://localhost:8888/api/auth

# Against production deployment:
node scripts/clear-users.mjs --api-url=https://your-site.netlify.app/api/auth --passcode=YOUR_ADMIN_PASSCODE
```

