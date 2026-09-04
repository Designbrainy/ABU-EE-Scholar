import fs from 'fs/promises';
import fsSync, { existsSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import pdfParse from 'pdf-parse';

// Constants
const args = process.argv.slice(2);
const apiUrlArg = args.find(a => a.startsWith('--api-url='))?.split('=')[1] || (args.includes('--api-url') ? args[args.indexOf('--api-url') + 1] : null);
const API_URL = apiUrlArg || process.env.API_URL || 'http://localhost:63017/api/materials';
const PROGRESS_FILE = path.join(process.cwd(), 'scripts', `.seed-progress-${API_URL.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'eescholarai-admin-2026';
const DELAY_MS = 100;

const SOURCE_DIRS = [
  'D:\\Materials\\200 L',
  'D:\\Materials\\300L',
  'D:\\Materials\\400L Materials'
];

const IGNORE_EXTENSIONS = new Set([
  '.mp4', '.webm', '.avi', '.mov', '.mkv',
  '.rar', '.zip', '.7z',
  '.docx', '.doc', '.xlsx', '.tmp', '.ppt', '.ini'
]);

const MAP_200L = {
  'eeen201': 'ENGG205', 'eeen 201': 'ENGG205',
  'eeen203': 'ENGG207', 'eeen 203': 'ENGG207',
  'eeen202': 'ENGG212', 'eeen 202': 'ENGG212', 'eeen 202--cmen201': 'ENGG212',
  'cven201': 'ENGG203', 'cven 201': 'ENGG203', 'cven': 'ENGG203',
  'meen201': 'ENGG201', 'meen 201': 'ENGG201',
  'mmen201': 'ENGG209', 'mmen 201': 'ENGG209', 'mmen': 'ENGG209',
  'math241': 'MATH241', 'math 241': 'MATH241', 'maths 241': 'MATH241', 'maths241': 'MATH241', 'mth 241': 'MATH241',
  'math243': 'MATH243', 'math 243': 'MATH243', 'maths 243': 'MATH243', 'maths243': 'MATH243',
  'wren201': 'ENGG211', 'wren 201': 'ENGG211', 'wren': 'ENGG211', 'wreem': 'ENGG211',
  'gens202': 'GENS202', 'gens 202': 'GENS202',
  'meen204': 'ENGG204', 'meen 204': 'ENGG204', 'meeen 204': 'ENGG204',
  'meen206': 'ENGG206', 'meen 206': 'ENGG206',
  'meen208': 'ENGG208', 'meen 208': 'ENGG208', 'meeen 28': 'ENGG208',
  'math242': 'MATH242', 'maths242': 'MATH242', 'maths 242': 'MATH242', 'math 242': 'MATH242',
  'math244': 'MATH244', 'maths244': 'MATH244', 'maths 244': 'MATH244', 'math 244': 'MATH244',
  'chen202': 'ENGG210', 'chen 202': 'ENGG210',
  'meen202': 'ENGG202', 'meen 202': 'ENGG202',
  'phys122': 'PHYS122', 'phys 122': 'PHYS122',
  'theraja': 'ENGG205' // Generic A.K. Theraja fallback for 200L
};

const MAP_300L = {
  'coen333': 'COEN303',
  'coen 333': 'COEN303',
  'theraja': 'EEEN309' // Vol 2 maps to EEEN309
};

const MAP_400L = {
  'eten401': 'CMEN401', 'eten 401': 'CMEN401',
  'cmen401': 'CMEN401', 'cmen 401': 'CMEN401'
};

// Special folder-name overrides (folder names that don't contain course codes)
const FOLDER_OVERRIDES = {
  'eeen materials': 'ENGG205',       // Generic EEEN folder in 200L → defaults to ENGG205
  'eeen': null,                       // Bare "EEEN" folder — ambiguous, rely on filename
  'lecture mat': null,                // Sub of EEEN Materials — rely on filename
  'reference mat': null,              // Sub of EEEN Materials — rely on filename
  'e s d': 'EEEN415',                // Electric Services Design
  'power': 'EEEN427',                // Power Engineering
  'kilos': null,                      // Mixed courses — rely on filename
  'pqs': null,                        // Past questions — rely on filename
  'updated': null,                    // Mixed courses — rely on filename
  'maths 242&244': null,              // Has MATH242 and MATH244 — rely on filename
};

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');

// Utilities
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try {
      const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse progress file, starting fresh.');
    }
  }
  return {};
}

async function saveProgress(progress) {
  if (DRY_RUN) return;
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function cleanTitle(filename) {
  return filename
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/\(\d+\)/g, '')  // remove (1), (2) etc.
    .replace(/-\s*\d+$/, '')  // remove trailing - 1
    .replace(/_/g, ' ')       // underscores to spaces
    .trim();
}

async function extractPdfText(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer, { max: 100 });
    return parsed.text ? parsed.text.replace(/\0/g, '').trim() : '';
  } catch (err) {
    throw new Error(`PDF text extraction failed: ${err.message}`);
  }
}

function extractPptxText(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    let text = '';
    for (const entry of entries) {
      if (entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)) {
        const content = entry.getData().toString('utf8');
        const matches = content.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/g);
        for (const match of matches) {
          text += match[1] + ' ';
        }
        text += '\n\n';
      }
    }
    return text.replace(/\0/g, '').trim() || 'No readable text extracted from PPTX.';
  } catch (err) {
    throw new Error(`PPTX parsing failed: ${err.message}`);
  }
}

// Merged map for fallback lookups (covers all levels)
const ALL_MAPS = { ...MAP_200L, ...MAP_300L, ...MAP_400L };

// Regex: word-boundary course code pattern (3-5 letter prefix + optional separator + 3-digit number)
// Handles: EEEN201, EEEN 201, EEEN_201, eeen-201, MATHS 341, etc.
const CODE_REGEX = /\b([a-z]{3,5})[\s_\-]*(\d{3})\b/gi;

// Normalize common typos/abbreviations in extracted codes
// Maps the PREFIX (lowercase) to the correct prefix
const PREFIX_FIXES = {
  'eee':   'EEEN',   // EEE307 → EEEN307
  'een':   'EEEN',   // EEN309 → EEEN309
  'maths': 'MATH',   // MATHS341 → MATH341
  'mth':   'MATH',   // MTH341 → MATH341
  'stats': 'STAT',   // STATS343 → STAT343
  'phy':   'PHYS',   // PHY122 → PHYS122
  'civen': 'CVEN',   // CIVEN201 → CVEN201
};

// Codes that are not real courses — skip them
const BOGUS_CODES = new Set(['NOTE201', 'EEC232', 'MATH209', 'MATHS209', 'MATH201', 'MATHS102', 'MATH207']);

function tryExtractCode(text, map) {
  const lower = text.toLowerCase();
  
  // Try regex match for standard course codes
  const matches = [...lower.matchAll(CODE_REGEX)];
  CODE_REGEX.lastIndex = 0; // reset global regex
  
  for (const m of matches) {
    const prefix = m[1];
    const num = m[2];
    const key = prefix + num;           // e.g. "eeen201"
    const keySpace = prefix + ' ' + num; // e.g. "eeen 201"
    
    // Check explicit map first
    if (map[key]) return map[key];
    if (map[keySpace]) return map[keySpace];
    
    // Normalize prefix, then check map again
    const fixedPrefix = PREFIX_FIXES[prefix] || prefix.toUpperCase();
    const normalizedCode = fixedPrefix + num;
    
    // Skip bogus codes
    if (BOGUS_CODES.has(normalizedCode)) continue;
    
    // Check ALL_MAPS with normalized code
    const normalizedKey = normalizedCode.toLowerCase();
    if (ALL_MAPS[normalizedKey]) return ALL_MAPS[normalizedKey];
    
    return normalizedCode;
  }
  
  // Keyword fallbacks
  if (lower.includes('theraja')) return '__theraja__';
  if (lower.includes('wreem'))   return map['wreem'] || null;
  if (lower.includes('cven'))    return map['cven'] || null;
  if (lower.includes('mmen'))    return map['mmen'] || null;
  if (lower.includes('wren'))    return map['wren'] || null;
  
  return null;
}

function determineCourseCode(filePath, level) {
  const map = level === '200' ? MAP_200L : level === '300' ? MAP_300L : MAP_400L;
  const parts = filePath.split(path.sep);
  
  // Strategy: check each path component from innermost (filename) outward.
  // Stop as soon as we find a course code. This ensures subfolder names
  // (like "EEEN 301") take priority over ambiguous parent names (like "EEEN Materials").
  
  // 1. First, try the FILENAME — most specific signal
  const filename = parts[parts.length - 1];
  const fromFile = tryExtractCode(filename, map);
  if (fromFile && fromFile !== '__theraja__') return fromFile;
  
  // 2. Then try each FOLDER name, innermost first (skip the filename we already checked)
  for (let i = parts.length - 2; i >= 0; i--) {
    const folder = parts[i];
    const folderLower = folder.toLowerCase();
    
    // Stop walking when we reach the base level dir (e.g. "200 L", "300L", "400L Materials")
    if (/^\d{3}/i.test(folder) && (folderLower.includes('l') || folderLower.includes('material'))) break;
    // Also stop at "materials" root or drive
    if (folderLower === 'materials' || /^[a-z]:$/i.test(folder)) break;
    
    // Check FOLDER_OVERRIDES first for special folder names
    if (folderLower in FOLDER_OVERRIDES) {
      const override = FOLDER_OVERRIDES[folderLower];
      if (override) return override;  // Explicit mapping
      continue;                        // null = skip, keep walking
    }
    
    const fromFolder = tryExtractCode(folder, map);
    if (fromFolder && fromFolder !== '__theraja__') return fromFolder;
    
    // Special: "theraja" in folder name
    if (fromFolder === '__theraja__') {
      return level === '200' ? 'ENGG205' : level === '300' ? 'EEEN309' : null;
    }
  }
  
  // 3. Fallback: if filename had theraja keyword
  if (fromFile === '__theraja__') {
    return level === '200' ? 'ENGG205' : level === '300' ? 'EEEN309' : null;
  }
  
  return null;
}

// Directories to skip entirely (video-only, duplicates, etc.)
const SKIP_DIRS = new Set(['videos', 'ee mindset', 'phys 122', 'latest', '.venv']);

async function processFile(filePath, level) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);
  
  // Skip rules
  if (filename.startsWith('~$') || filename.startsWith('~WRL')) return { status: 'skipped', reason: 'lock file' };
  if (IGNORE_EXTENSIONS.has(ext)) return { status: 'skipped', reason: `ignored extension ${ext}` };
  
  const courseCode = determineCourseCode(filePath, level);
  if (!courseCode) return { status: 'skipped', reason: 'could not determine course code' };
  
  const title = cleanTitle(filename);
  let payload = { courseCode, title };
  
  try {
    if (ext === '.pdf') {
      const text = await extractPdfText(filePath);
      if (!text || text.length === 0) {
        return { status: 'skipped', reason: 'empty or non-text PDF' };
      }
      payload.content = text.slice(0, 200000);
    } else if (ext === '.pptx') {
      const text = extractPptxText(filePath);
      if (!text || text.length === 0) {
        return { status: 'skipped', reason: 'empty PPTX' };
      }
      payload.content = text.slice(0, 200000);
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const buffer = await fs.readFile(filePath);
      if (buffer.length > 4 * 1024 * 1024) {
        return { status: 'skipped', reason: 'image exceeds 4MB' };
      }
      payload.imageBase64 = buffer.toString('base64');
      payload.imageMimeType = `image/${ext.substring(1).replace('jpg', 'jpeg')}`;
    } else {
      return { status: 'skipped', reason: `unsupported format ${ext}` };
    }
    
    if (DRY_RUN) {
      return { status: 'success', dryRun: true, courseCode, title, type: ext };
    }
    
    let response;
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-passcode': ADMIN_PASSCODE
          },
          body: JSON.stringify(payload)
        });
        if (response.ok) break;
        const errText = await response.text();
        lastErr = new Error(`API returned ${response.status}: ${errText}`);
        if (attempt < 3) await wait(300);
      } catch (fetchErr) {
        lastErr = fetchErr;
        if (attempt < 3) await wait(300);
      }
    }
    
    if (!response || !response.ok) {
      throw lastErr || new Error('Request failed after 3 attempts');
    }
    
    return { status: 'success', courseCode, title };
  } catch (err) {
    return { status: 'error', reason: err.message };
  }
}

function walkDirectory(dir) {
  let results = [];
  try {
    const entries = fsSync.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // Skip video-only dirs, duplicates, venvs
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name.toLowerCase())) continue;
      
      if (entry.isDirectory()) {
        results = results.concat(walkDirectory(fullPath));
      } else {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.warn(`[WARN] Could not read directory ${dir}: ${err.message}`);
  }
  return results;
}

async function main() {
  console.log(`Starting Seed Process ${DRY_RUN ? '(DRY RUN)' : ''}...`);
  const progress = await loadProgress();
  
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalSuccess = 0;
  
  for (const rootDir of SOURCE_DIRS) {
    if (!existsSync(rootDir)) {
      console.warn(`[!] Source directory not found: ${rootDir}`);
      continue;
    }
    
    let level = '200';
    if (rootDir.includes('300')) level = '300';
    if (rootDir.includes('400')) level = '400';
    
    console.log(`\nScanning ${rootDir} (Level ${level})...`);
    const files = walkDirectory(rootDir);
    console.log(`Found ${files.length} files.`);
    
    for (const file of files) {
      if (progress[file] === 'success') {
        totalSkipped++;
        continue;
      }
      
      const result = await processFile(file, level);
      
      if (result.status === 'skipped') {
        console.log(`[SKIPPED] ${path.basename(file)} - ${result.reason}`);
        totalSkipped++;
      } else if (result.status === 'error') {
        console.error(`[ERROR] ${path.basename(file)} - ${result.reason}`);
        totalErrors++;
        progress[file] = 'error';
      } else if (result.status === 'success') {
        console.log(`[SUCCESS] ${result.courseCode} | ${result.title} (${DRY_RUN ? result.type : 'Posted'})`);
        totalSuccess++;
        progress[file] = 'success';
      }
      
      await saveProgress(progress);
      
      if (!DRY_RUN) {
        await wait(DELAY_MS);
      }
      totalProcessed++;
    }
  }
  
  console.log('\n--- Seeding Complete ---');
  console.log(`Total Files Checked: ${totalProcessed + totalSkipped}`);
  console.log(`Already Processed/Skipped: ${totalSkipped}`);
  console.log(`Successfully Seeded: ${totalSuccess}`);
  console.log(`Errors: ${totalErrors}`);
}

main().catch(err => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
