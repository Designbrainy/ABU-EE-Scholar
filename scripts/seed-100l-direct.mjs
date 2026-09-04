import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import pdfParse from 'pdf-parse';
import AdmZip from 'adm-zip';

// Prevent pdf-parse internal worker errors from crashing Node
process.on('unhandledRejection', (reason) => {
  console.warn(`[!] Intercepted unhandledRejection from PDF parser: ${reason?.message || reason}`);
});

const S1_DIR = 'D:/Materials/100L_Extracted/1st_Semester';
const S2_DIR = 'D:/Materials/100L_Extracted/2nd_Semester';

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) results = results.concat(walk(full));
      else results.push(full);
    }
  } catch (e) {}
  return results;
}

const SKIP_EXTENSIONS = new Set([
  '.mp4', '.webm', '.avi', '.smi', '.apk', '.vcf', '.ini', '.nomedia', '.tmp', '.lnk'
]);

const SKIP_PATTERNS = [
  /time\s*table|timetable/i,
  /postponement/i,
  /receipt/i,
  /animal sacrifice/i,
  /cashflow/i,
  /proposal_template/i,
  /contact gain/i,
  /recharge & get paid/i,
  /fx-570/i,
  /faq en/i,
  /^null\.pdf$/i,
  /draft.*timetable/i,
];

function determineCourseCode(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return null;

  const base = path.basename(filePath);
  for (const pat of SKIP_PATTERNS) {
    if (pat.test(base)) return null;
  }

  const lower = filePath.toLowerCase();
  const name = base.toLowerCase();

  // ── Chemistry ──
  if (/chem\s*121|chm\s*121|tutorial questions 121/i.test(name) || /inorganic\s*chem/i.test(name)) return 'CHEM121';
  if (/chem\s*161|chm\s*161|chem.*practical\s*1|chemistry\s*practical\s*1/i.test(name)) return 'CHEM161';
  if (/chem\s*112|chm\s*112|physical\s*chem|haneefah.*chem|haneefah.*principal|taimulah/i.test(name)) return 'CHEM112';
  if (/chem\s*162|chm\s*162|chem.*practical\s*2|chemistry\s*practical\s*2/i.test(name)) return 'CHEM162';
  if (/chem\s*101|chm\s*101|introductory\s*general\s*chem|hydrocarbon/i.test(name)) return 'CHEM101';
  if (/chem\s*132|chm\s*132|chm\s*103|organic\s*chem/i.test(name)) {
    return lower.includes('2nd_semester') ? 'CHEM112' : 'CHEM101';
  }
  if (/acid\s*bases\s*and\s*salt/i.test(name)) return 'CHEM112';

  // ── Physics ──
  if (/phys\s*111|phy\s*111|p111/i.test(name)) return 'PHYS111';
  if (/phys\s*131|phy\s*131|heat.*properties|transfer of heat/i.test(name)) return 'PHYS131';
  if (/phys\s*161|phy\s*161|physis\s*161/i.test(name)) return 'PHYS161';
  if (/phys\s*122|phy\s*122|phy\s*102|electricity/i.test(name)) return 'PHYS122';
  if (/phys\s*124|phy\s*124|curved\s*mirrors|optics/i.test(name)) return 'PHYS124';
  if (/phys\s*162|phy\s*162/i.test(name)) return 'PHYS162';

  if (/purcell|electricity.*magnetism|basic\s*electricity|capacitance|modern\s*physics/i.test(name)) return 'PHYS122';
  if (/heat\s*transfer|calorimetry|kinetic\s*theory|gas\s*laws/i.test(name)) return 'PHYS131';
  if (/mechanics|nelkon.*parker|dimensional\s*analysis|elasticity|rotational\s*motion|college\s*physics|shaum.*physics|engineering-physics|intro_physics/i.test(name)) return 'PHYS111';
  if (/physics-learning-material|physics.*pass\s*question|physics-101/i.test(name)) return 'PHYS111';

  // ── Mathematics ──
  if (/math\s*101|maths\s*101|mth\s*101/i.test(name)) return 'MATH101';
  if (/math\s*103|maths\s*103|mth\s*103/i.test(name)) return 'MATH103';
  if (/math\s*105|maths\s*105|mth\s*105|mth!105/i.test(name)) return 'MATH105';
  if (/math\s*102|maths\s*102|mth\s*102/i.test(name)) return 'MATH102';
  if (/math\s*104|maths\s*104|mth\s*104/i.test(name)) return 'MATH104';
  if (/math\s*106|maths\s*106|mth\s*106/i.test(name)) return 'MATH106';

  if (/set\s*relation|set\s*theory|pure\s*mathematics/i.test(name)) return 'MATH101';
  if (/trigonometry|coordinate\s*geom|maths_103/i.test(name)) return 'MATH103';
  if (/calculus|derivative|integration|limits/i.test(name)) {
    if (/conic|applications.*calculus/i.test(name)) return 'MATH104';
    return 'MATH105';
  }
  if (/conic|blitzer/i.test(name)) return 'MATH104';
  if (/permutation\s*and\s*combination|algebra/i.test(name)) return 'MATH102';
  if (/vectors?/i.test(name)) {
    return lower.includes('2nd_semester') ? 'MATH106' : 'PHYS111';
  }
  if (/mathematics\s*for\s*fresh\s*undergraduate/i.test(name)) {
    if (/vol\s*3/i.test(name)) return 'MATH105';
    return 'MATH101';
  }
  if (/maths-booklet/i.test(name)) return 'MATH101';
  if (/stroud|engineering\s*mathematics/i.test(name)) return 'MATH105';

  // ── Statistics & Computing & Engineering ──
  if (/stat\s*102|statistics|stat.*tutorial/i.test(name)) return 'STAT102';
  if (/cosc\s*102|cosc\s*101|computing|programming\s*in\s*basic|cssnotes/i.test(name)) return 'COSC102';
  if (/engg\s*102|engg\s*101|introduction\s*to\s*engineering|history\s*of\s*engineering|namets|colensma|what every electrical/i.test(name)) return 'ENGG102';

  // ── GENS ──
  if (/gens\s*101|gen\s*paper|nationalism/i.test(name)) return 'GENS101';
  if (/gens\s*102|environmental/i.test(name)) return 'GENS102';
  if (/gens\s*103|gen103|english|grammar/i.test(name)) return 'GENS103';
  if (/gens\s*104|philosophy\s*of\s*science/i.test(name)) return 'GENS104';
  if (/gens\s*202/i.test(name)) return 'GENS202';
  if (/math\s*243/i.test(name)) return 'MATH243';
  if (/circuits?|sadiku/i.test(name)) return 'ENGG205';

  // Fallbacks by folder
  if (/chem/i.test(lower)) return lower.includes('2nd_semester') ? 'CHEM112' : 'CHEM101';
  if (/phys/i.test(lower)) return lower.includes('2nd_semester') ? 'PHYS122' : 'PHYS111';
  if (/math/i.test(lower)) return lower.includes('2nd_semester') ? 'MATH102' : 'MATH101';

  return null;
}

function cleanTitle(filename) {
  return filename
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/\(\d+\)/g, '')  // remove (1), (2)
    .replace(/-\s*\d+$/, '')  // remove trailing - 1
    .replace(/_/g, ' ')       // underscores to spaces
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    try {
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer, { max: 80 });
      return parsed?.text ? parsed.text.replace(/\0/g, '').trim() : '';
    } catch (err) {
      console.warn(`[!] PDF parse error on ${path.basename(filePath)}: ${err.message}`);
      return '';
    }
  } else if (ext === '.docx') {
    try {
      const zip = new AdmZip(filePath);
      const xml = zip.readAsText('word/document.xml');
      return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/\0/g, '').trim();
    } catch (err) {
      console.warn(`[!] DOCX parse error on ${path.basename(filePath)}: ${err.message}`);
      return '';
    }
  } else if (ext === '.pptx') {
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
      return text.replace(/\0/g, '').trim();
    } catch (err) {
      console.warn(`[!] PPTX parse error on ${path.basename(filePath)}: ${err.message}`);
      return '';
    }
  } else if (ext === '.txt') {
    try {
      return fs.readFileSync(filePath, 'utf8').replace(/\0/g, '').trim();
    } catch (err) {
      return '';
    }
  }
  return '';
}

async function main() {
  const dbUrl = process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.error('Missing POSTGRES_URL environment variable.');
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: 'require' });
  console.log('Connected to Postgres database.');

  // Fetch existing materials to prevent duplicates
  const existingRows = await sql`SELECT course_code, title FROM materials`;
  const existingSet = new Set(existingRows.map(r => `${r.course_code}:::${r.title.toLowerCase().trim()}`));
  console.log(`Loaded ${existingRows.length} existing materials from database.`);

  const allFiles = [...walk(S1_DIR), ...walk(S2_DIR)];
  console.log(`Discovered ${allFiles.length} candidate files in 100L extracted folders.`);

  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const courseCounts = {};

  for (const file of allFiles) {
    const courseCode = determineCourseCode(file);
    if (!courseCode) {
      skippedCount++;
      continue;
    }

    const title = cleanTitle(path.basename(file));
    const dedupKey = `${courseCode}:::${title.toLowerCase().trim()}`;
    if (existingSet.has(dedupKey)) {
      skippedCount++;
      continue;
    }

    try {
      const ext = path.extname(file).toLowerCase();
      let content = '';
      let contentType = 'text';
      let mimeType = null;

      if (['.pdf', '.docx', '.pptx', '.txt'].includes(ext)) {
        content = await extractText(file);
        if (!content || content.length < 30) {
          content = `Lecture material for ${courseCode}: ${title}. Consult textbook and departmental handouts.`;
        }
        if (content.length > 60000) {
          content = content.slice(0, 60000) + '\n\n[Content truncated for storage]';
        }
      } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const buf = fs.readFileSync(file);
        if (buf.length > 2 * 1024 * 1024) {
          skippedCount++;
          continue;
        }
        content = buf.toString('base64');
        contentType = 'image';
        mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      } else {
        skippedCount++;
        continue;
      }

      await sql`
        INSERT INTO materials (course_code, title, content, content_type, mime_type, created_at)
        VALUES (${courseCode}, ${title}, ${content}, ${contentType}, ${mimeType}, NOW())
      `;

      existingSet.add(dedupKey);
      insertedCount++;
      courseCounts[courseCode] = (courseCounts[courseCode] || 0) + 1;
      console.log(`[+] [${courseCode}] "${title}" (${contentType}, ${content.length} chars)`);
    } catch (err) {
      console.error(`[-] Error inserting "${title}" for ${courseCode}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log(`SEEDING COMPLETE!`);
  console.log(`Newly inserted: ${insertedCount}`);
  console.log(`Skipped / duplicates: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('Breakdown of newly inserted materials:');
  console.table(courseCounts);

  // Final summary of all materials in DB
  const summary = await sql`SELECT course_code, count(*) as count FROM materials GROUP BY course_code ORDER BY course_code`;
  console.log('\nFinal Database Materials Breakdown:');
  console.table(summary);
  const total = await sql`SELECT count(*) as total FROM materials`;
  console.log(`Total Materials in DB: ${total[0].total}`);

  await sql.end();
}

main().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
