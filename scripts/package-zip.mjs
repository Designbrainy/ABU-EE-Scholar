import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const outputZip = path.join(process.env.USERPROFILE || 'C:/Users/USER', 'Downloads', 'ee-scholar-ai-updated.zip');

if (fs.existsSync(outputZip)) {
  fs.unlinkSync(outputZip);
}

try {
  execSync(
    `tar.exe -a -cf "${outputZip}" --exclude="node_modules" --exclude=".netlify" --exclude=".git" --exclude="scripts/*.log" --exclude="scripts/*.txt" --exclude="scripts/.seed-progress.json" *`,
    { stdio: 'inherit' }
  );
  console.log(`[SUCCESS] Cross-platform deployment ZIP created with full POSIX permissions at: ${outputZip}`);
} catch (err) {
  console.error('[ERROR] Failed to package zip:', err.message);
}
