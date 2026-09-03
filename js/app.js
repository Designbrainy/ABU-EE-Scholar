(function () {
  "use strict";

  // No admin passcode is stored client-side anymore — see netlify/functions/admin-auth.mts
  // and lib/admin-auth.mts. The real secret lives only in the Netlify ADMIN_PASSCODE
  // environment variable and is checked server-side on every admin request.
  let adminPasscodeValue = null; // held in memory only for this tab, after a verified login

  const COURSES = [
    // ── 100 Level ──
    { code: "CHEM111", label: "CHEM111 — Introductory General Chemistry", level: "100" },
    { code: "CHEM121", label: "CHEM121 — Inorganic Chemistry", level: "100" },
    { code: "CHEM191", label: "CHEM191 — Chemistry Practical I", level: "100" },
    { code: "PHYS111", label: "PHYS111 — Mechanics", level: "100" },
    { code: "PHYS131", label: "PHYS131 — Heat and Properties of Matter", level: "100" },
    { code: "PHYS161", label: "PHYS161 — Physics Practical I", level: "100" },
    { code: "MATH101", label: "MATH101 — Elementary Set Theory", level: "100" },
    { code: "MATH103", label: "MATH103 — Trigonometry & Coordinate Geometry", level: "100" },
    { code: "MATH105", label: "MATH105 — Differential & Integral Calculus", level: "100" },
    { code: "GENS101", label: "GENS101 — Nationalism", level: "100" },
    { code: "GENS103", label: "GENS103 — English & Communication Skills", level: "100" },
    { code: "CHEM112", label: "CHEM112 — Introductory Physical Chemistry", level: "100" },
    { code: "CHEM132", label: "CHEM132 — Introductory Organic Chemistry", level: "100" },
    { code: "CHEM192", label: "CHEM192 — Chemistry Practical II", level: "100" },
    { code: "PHYS122", label: "PHYS122 — Electricity, Magnetism & Modern Physics", level: "100" },
    { code: "PHYS124", label: "PHYS124 — Geometrical & Wave Optics", level: "100" },
    { code: "PHYS162", label: "PHYS162 — Physics Practical II", level: "100" },
    { code: "MATH102", label: "MATH102 — Algebra", level: "100" },
    { code: "MATH104", label: "MATH104 — Conic Sections & Applications of Calculus", level: "100" },
    { code: "MATH106", label: "MATH106 — Vectors", level: "100" },
    { code: "STAT102", label: "STAT102 — Introductory Statistics", level: "100" },
    { code: "COSC102", label: "COSC102 — Programming in BASIC", level: "100" },
    { code: "ENGG102", label: "ENGG102 — Introduction to Engineering", level: "100" },
    { code: "GENS102", label: "GENS102 — Environmental Health", level: "100" },
    { code: "GENS104", label: "GENS104 — History & Philosophy of Science", level: "100" },
    // ── 200 Level (1st Semester) ──
    { code: "ENGG205", label: "ENGG205 — Electric Field & Circuit Theory", level: "200" },
    { code: "ENGG207", label: "ENGG207 — Machines, Power & Installations", level: "200" },
    { code: "ENGG203", label: "ENGG203 — Theory of Structures", level: "200" },
    { code: "ENGG201", label: "ENGG201 — Engineering Graphics", level: "200" },
    { code: "ENGG209", label: "ENGG209 — Material Science", level: "200" },
    { code: "MATH241", label: "MATH241 — Calculus I", level: "200" },
    { code: "MATH243", label: "MATH243 — Algebra I", level: "200" },
    { code: "ENGG211", label: "ENGG211 — Fluid Mechanics", level: "200" },
    // ── 200 Level (2nd Semester) ──
    { code: "ENGG212", label: "ENGG212 — Electronics, Measurement & Transducers", level: "200" },
    { code: "ENGG210", label: "ENGG210 — Introduction to Management", level: "200" },
    { code: "ENGG202", label: "ENGG202 — Engineering Drawing", level: "200" },
    { code: "ENGG204", label: "ENGG204 — Strength of Materials", level: "200" },
    { code: "ENGG206", label: "ENGG206 — Dynamics of Machines", level: "200" },
    { code: "ENGG208", label: "ENGG208 — Basic Thermodynamics", level: "200" },
    { code: "MATH242", label: "MATH242 — Calculus II", level: "200" },
    { code: "MATH244", label: "MATH244 — Algebra II", level: "200" },
    { code: "GENS202", label: "GENS202 — Entrepreneurship & Innovation", level: "200" },
    // ── 300 Level (1st Semester) ──
    { code: "EEEN301", label: "EEEN301 — Circuit Theory & Systems I", level: "300" },
    { code: "EEEN303", label: "EEEN303 — EM Fields & Waves I", level: "300" },
    { code: "EEEN309", label: "EEEN309 — Electrical Machines I", level: "300" },
    { code: "EEEN311", label: "EEEN311 — Laboratory Practical & Project I", level: "300" },
    { code: "EEEN327", label: "EEEN327 — Power Engineering I", level: "300" },
    { code: "COEN303", label: "COEN303 — Control Engineering I", level: "300" },
    { code: "EEEN307", label: "EEEN307 — Digital Electronics Circuit", level: "300" },
    { code: "MATH341", label: "MATH341 — Differential Equations & Transforms", level: "300" },
    { code: "STAT343", label: "STAT343 — Statistics", level: "300" },
    { code: "GENS301", label: "GENS301 — Business Creation & Growth", level: "300" },
    // ── 300 Level (2nd Semester) ──
    { code: "EEEN302", label: "EEEN302 — Circuit Theory & Systems II", level: "300" },
    { code: "EEEN306", label: "EEEN306 — Power Electronics I", level: "300" },
    { code: "EEEN308", label: "EEEN308 — Measurements & Instrumentation", level: "300" },
    { code: "EEEN314", label: "EEEN314 — Laboratory Practical & Project II", level: "300" },
    { code: "EEEN316", label: "EEEN316 — Intro to Programming in MATLAB", level: "300" },
    { code: "EEEN318", label: "EEEN318 — Technical Writing & Presentation", level: "300" },
    { code: "EEEN320", label: "EEEN320 — EM Fields & Waves II", level: "300" },
    { code: "EEEN328", label: "EEEN328 — Physical Electronics", level: "300" },
    { code: "EEEN310", label: "EEEN310 — Electronics Engineering I", level: "300" },
    { code: "EEEN342", label: "EEEN342 — Telecommunication Principles", level: "300" },
    // ── 300 Level (Restricted Electives) ──
    { code: "COSC344", label: "COSC344 — Programming in Java", level: "300" },
    { code: "QTYS309", label: "QTYS309 — Development Economics", level: "300" },
    { code: "COEN305", label: "COEN305 — Intro to Computer Systems", level: "300" },
    // ── 400 Level (1st Semester) ──
    { code: "EEEN409", label: "EEEN409 — Electrical Machines II", level: "400" },
    { code: "EEEN411", label: "EEEN411 — Laboratory Practical II", level: "400" },
    { code: "EEEN415", label: "EEEN415 — Electric Services Design", level: "400" },
    { code: "EEEN427", label: "EEEN427 — Power Engineering II", level: "400" },
    { code: "CMEN401", label: "CMEN401 — Data Communications", level: "400" },
    { code: "EEEN405", label: "EEEN405 — Digital Electronics II", level: "400" },
    { code: "COEN407", label: "COEN407 — Control Engineering II", level: "400" },
    { code: "MATH441", label: "MATH441 — Complex Analysis", level: "400" },
    { code: "MATH443", label: "MATH443 — Numerical Analysis", level: "400" },
    { code: "QTYS421", label: "QTYS421 — Law For Engineers", level: "400" },
    { code: "SIWE498", label: "SIWE498 — SIWES (22 Weeks)", level: "400" },
    // ── 500 Level (1st Semester) ──
    { code: "EEEN509", label: "EEEN509 — Engineering Management & Decision Making", level: "500" },
    { code: "EEEN511", label: "EEEN511 — Reliability and Maintainability", level: "500" },
    { code: "EEEN513", label: "EEEN513 — Advanced Electric Machines", level: "500" },
    { code: "EEEN519", label: "EEEN519 — Programmable Systems for EE Applications", level: "500" },
    { code: "EEEN527", label: "EEEN527 — Power Engineering III", level: "500" },
    { code: "CMEN503", label: "CMEN503 — Telecommunication Networks I", level: "500" },
    { code: "COEN507", label: "COEN507 — Control Engineering III", level: "500" },
    { code: "EEEN599", label: "EEEN599 — Final Year Project (1st Semester)", level: "500" },
    // ── 500 Level (2nd Semester) ──
    { code: "EEEN522", label: "EEEN522 — Introduction to FACT Devices", level: "500" },
    { code: "EEEN524", label: "EEEN524 — Electric Drives", level: "500" },
    { code: "EEEN528", label: "EEEN528 — Power Electronics II", level: "500" },
    { code: "EEEN530", label: "EEEN530 — Advanced Circuit Theory", level: "500" },
    { code: "EEEN532", label: "EEEN532 — Energy System and Management", level: "500" },
    { code: "EEEN550", label: "EEEN550 — High Voltage Engineering", level: "500" },
    { code: "EEEN598", label: "EEEN598 — Final Year Project (2nd Semester)", level: "500" },
    // ── 500 Level (Restricted Electives) ──
    { code: "CMEN504", label: "CMEN504 — Telecommunication Network II", level: "500" },
    { code: "CMEN501", label: "CMEN501 — Integrated Circuits & Systems Design", level: "500" },
    { code: "CMEN517", label: "CMEN517 — Digital Signal Processing", level: "500" },
    { code: "COEN401", label: "COEN401 — Microcomputer & Microcontroller Applications", level: "500" },
    { code: "COEN512", label: "COEN512 — Mechatronics", level: "500" },
  ];

  function $(id) { return document.getElementById(id); }
  function showToast(msg) { $("toastText").textContent = msg; $("toast").classList.remove("hidden"); }
  function hideToast() { $("toast").classList.add("hidden"); }
  function courseLabel(code) { const f = COURSES.find((c) => c.code === code); return f ? f.label : code; }
  function groupByLevel(list) { return list.reduce((a, c) => { (a[c.level] = a[c.level] || []).push(c); return a; }, {}); }

  function normalizeMimeType(mimeType, filename) {
    let m = (mimeType || "").toLowerCase().trim();
    if (m === "image/jpg") m = "image/jpeg";
    if (!m || m === "application/octet-stream") {
      const ext = (filename || "").split(".").pop()?.toLowerCase();
      if (ext === "jpg" || ext === "jpeg") m = "image/jpeg";
      else if (ext === "png") m = "image/png";
      else if (ext === "webp") m = "image/webp";
      else if (ext === "gif") m = "image/gif";
      else if (ext === "pdf") m = "application/pdf";
      else if (ext === "txt") m = "text/plain";
    }
    return m || "application/octet-stream";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderMath(expr, displayMode) {
    if (window.katex && typeof window.katex.renderToString === "function") {
      try {
        return window.katex.renderToString(expr.trim(), {
          displayMode: Boolean(displayMode),
          throwOnError: false,
        });
      } catch (err) {
        console.warn("KaTeX render error:", err);
      }
    }
    // KaTeX not loaded yet — return a placeholder that will be re-rendered
    const delimiter = displayMode ? "$$" : "$";
    return `<span class="katex-pending" data-expr="${escapeHtml(expr)}" data-display="${displayMode}">${delimiter}${escapeHtml(expr)}${delimiter}</span>`;
  }

  /**
   * After messages are rendered, if KaTeX wasn't loaded in time,
   * re-render any .katex-pending spans once KaTeX arrives.
   */
  let katexReadyCallbackRegistered = false;
  function ensureKatexReRender() {
    if (window.katex) return; // already loaded
    if (katexReadyCallbackRegistered) return;
    katexReadyCallbackRegistered = true;
    // katex.min.js has `defer`, so it fires before DOMContentLoaded but after parsing.
    // In case it hasn't loaded yet (slow network), poll briefly then give up.
    const check = setInterval(() => {
      if (window.katex && typeof window.katex.renderToString === "function") {
        clearInterval(check);
        document.querySelectorAll(".katex-pending").forEach((el) => {
          const expr = el.getAttribute("data-expr") || "";
          const display = el.getAttribute("data-display") === "true";
          try {
            el.outerHTML = window.katex.renderToString(expr, {
              displayMode: display,
              throwOnError: false,
            });
          } catch (err) {
            console.warn("KaTeX deferred render error:", err);
          }
        });
      }
    }, 200);
    // Stop polling after 15 seconds
    setTimeout(() => clearInterval(check), 15000);
  }

  /**
   * Parse markdown table lines into an HTML <table>.
   * Expects `lines` to be an array of raw lines (already HTML-escaped),
   * starting at index `startIdx` where a table header row was detected.
   * Returns { html, endIdx } where endIdx is the last consumed line index.
   */
  function parseMarkdownTable(lines, startIdx) {
    // Header row
    const headerLine = lines[startIdx].trim().replace(/^\||\|$/g, "");
    const headers = headerLine.split("|").map((h) => h.trim());

    // Separator row (must follow immediately)
    if (startIdx + 1 >= lines.length) return null;
    const sepLine = lines[startIdx + 1].trim();
    if (!/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(sepLine)) return null;

    // Parse alignment from separator
    const sepCells = sepLine.replace(/^\||\|$/g, "").split("|").map((s) => s.trim());
    const aligns = sepCells.map((s) => {
      if (s.startsWith(":") && s.endsWith(":")) return "center";
      if (s.endsWith(":")) return "right";
      return "left";
    });

    // Body rows
    const bodyRows = [];
    let endIdx = startIdx + 1;
    for (let j = startIdx + 2; j < lines.length; j++) {
      const row = lines[j].trim();
      if (!row.includes("|") || /^(\s*[-*_]\s*){3,}$/.test(row)) break;
      // Must look like a table row (start or end with | or have internal |)
      if (!/\|/.test(row)) break;
      const rowContent = row.replace(/^\||\|$/g, "");
      bodyRows.push(rowContent.split("|").map((c) => c.trim()));
      endIdx = j;
    }

    // Build HTML
    let html = '<table>';
    html += '<thead><tr>';
    headers.forEach((h, i) => {
      const align = aligns[i] || "left";
      html += `<th style="text-align:${align}">${h}</th>`;
    });
    html += '</tr></thead>';
    if (bodyRows.length) {
      html += '<tbody>';
      bodyRows.forEach((cells) => {
        html += '<tr>';
        cells.forEach((c, i) => {
          const align = aligns[i] || "left";
          html += `<td style="text-align:${align}">${c}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }
    html += '</table>';
    return { html, endIdx };
  }

  function formatBotResponse(rawText) {
    if (!rawText) return "";

    const mathTokens = [];
    const codeTokens = [];
    const mermaidTokens = [];

    let text = rawText;

    // ── Step 1: Extract fenced mermaid blocks ──
    text = text.replace(/```mermaid\s*([\s\S]*?)```/gi, (match, code) => {
      const idx = mermaidTokens.length;
      mermaidTokens.push(code.trim());
      return `\n@@MERMAID${idx}@@\n`;
    });

    // ── Step 2: Extract other fenced code blocks ──
    text = text.replace(/```([a-zA-Z0-9_-]*)\s*\n?([\s\S]*?)```/g, (match, lang, code) => {
      const idx = codeTokens.length;
      codeTokens.push({ lang: lang || "", code });
      return `\n@@CODE${idx}@@\n`;
    });

    // ── Step 3: Extract block math $$...$$ and \[...\] ──
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
      const idx = mathTokens.length;
      mathTokens.push({ expr, display: true });
      return `\n@@MATH${idx}@@\n`;
    });
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, expr) => {
      const idx = mathTokens.length;
      mathTokens.push({ expr, display: true });
      return `\n@@MATH${idx}@@\n`;
    });

    // ── Step 4: Extract inline math $...$ and \(...\) ──
    text = text.replace(/(?<!\\)\$((?:\\\$|[^\$\n])+?)\$/g, (match, expr) => {
      const idx = mathTokens.length;
      mathTokens.push({ expr, display: false });
      return `@@MATH${idx}@@`;
    });
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, expr) => {
      const idx = mathTokens.length;
      mathTokens.push({ expr, display: false });
      return `@@MATH${idx}@@`;
    });

    // ── Step 5: Escape HTML in remaining text ──
    text = escapeHtml(text);

    // ── Step 6: Inline markdown (code, bold, italics) ──
    // Process inline code first to protect its contents
    text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
    // Underscore italic: exclude @@ boundaries so placeholders like @@MATH0@@ are never broken
    text = text.replace(/(?<![@_])_([^_@]+)_(?![@_])/g, "<em>$1</em>");

    // ── Step 7: Block markdown — headers, hr, blockquotes, lists, TABLES ──
    const lines = text.split("\n");
    const output = [];
    let inList = false;
    let listType = "ul";
    let lastWasBlank = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // ── Collapse consecutive blank lines ──
      if (trimmed === "") {
        if (!lastWasBlank) {
          output.push("<br>");
          lastWasBlank = true;
        }
        continue;
      }
      lastWasBlank = false;

      // Horizontal rule
      if (/^(\s*[-*_]\s*){3,}$/.test(trimmed)) {
        if (inList) { output.push(`</${listType}>`); inList = false; }
        output.push("<hr>");
        continue;
      }

      // ── Markdown table detection ──
      // A table starts with a pipe-containing line followed by a separator line
      if (trimmed.includes("|") && i + 1 < lines.length) {
        const nextTrimmed = lines[i + 1].trim();
        if (/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(nextTrimmed)) {
          if (inList) { output.push(`</${listType}>`); inList = false; }
          const table = parseMarkdownTable(lines, i);
          if (table) {
            output.push(table.html);
            i = table.endIdx;
            continue;
          }
        }
      }

      // Headings
      if (/^####\s+(.+)$/.test(trimmed)) {
        if (inList) { output.push(`</${listType}>`); inList = false; }
        output.push(`<h4>${trimmed.replace(/^####\s+/, "")}</h4>`);
        continue;
      }
      if (/^###\s+(.+)$/.test(trimmed)) {
        if (inList) { output.push(`</${listType}>`); inList = false; }
        output.push(`<h3>${trimmed.replace(/^###\s+/, "")}</h3>`);
        continue;
      }
      if (/^##\s+(.+)$/.test(trimmed)) {
        if (inList) { output.push(`</${listType}>`); inList = false; }
        output.push(`<h2>${trimmed.replace(/^##\s+/, "")}</h2>`);
        continue;
      }
      if (/^#\s+(.+)$/.test(trimmed)) {
        if (inList) { output.push(`</${listType}>`); inList = false; }
        output.push(`<h1>${trimmed.replace(/^#\s+/, "")}</h1>`);
        continue;
      }

      // Blockquotes
      if (/^&gt;\s*(.+)$/.test(trimmed) || /^>\s*(.+)$/.test(trimmed)) {
        if (inList) { output.push(`</${listType}>`); inList = false; }
        output.push(`<blockquote>${trimmed.replace(/^(?:&gt;|>)\s*/, "")}</blockquote>`);
        continue;
      }

      // Unordered list
      const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (ulMatch) {
        if (!inList || listType !== "ul") {
          if (inList) output.push(`</${listType}>`);
          output.push("<ul>");
          inList = true;
          listType = "ul";
        }
        output.push(`<li>${ulMatch[1]}</li>`);
        continue;
      }

      // Ordered list
      const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (!inList || listType !== "ol") {
          if (inList) output.push(`</${listType}>`);
          output.push("<ol>");
          inList = true;
          listType = "ol";
        }
        output.push(`<li>${olMatch[1]}</li>`);
        continue;
      }

      // Not in a list anymore
      if (inList) {
        output.push(`</${listType}>`);
        inList = false;
      }

      // Placeholder lines (code/mermaid/math on their own line)
      if (/^@@(MATH|CODE|MERMAID)\d+@@$/.test(trimmed)) {
        output.push(trimmed);
      } else {
        output.push(`<p>${trimmed}</p>`);
      }
    }

    if (inList) {
      output.push(`</${listType}>`);
    }

    let html = output.join("\n");

    // ── Step 8: Restore Code blocks ──
    html = html.replace(/@@CODE(\d+)@@/g, (match, idx) => {
      const item = codeTokens[Number(idx)];
      if (!item) return "";
      return `<pre><code>${escapeHtml(item.code)}</code></pre>`;
    });

    // ── Step 9: Restore Mermaid blocks ──
    html = html.replace(/@@MERMAID(\d+)@@/g, (match, idx) => {
      const code = mermaidTokens[Number(idx)];
      if (!code) return "";
      return `<div class="mermaid-wrap"><div class="mermaid">${escapeHtml(code)}</div></div>`;
    });

    // ── Step 10 (LAST): Restore Math — must be the very last replacement ──
    html = html.replace(/@@MATH(\d+)@@/g, (match, idx) => {
      const item = mathTokens[Number(idx)];
      if (!item) return "";
      return renderMath(item.expr, item.display);
    });

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, "");

    // ── Diagnostic: warn if any placeholders survived ──
    if (/@@(?:MATH|CODE|MERMAID)\d+@@/.test(html)) {
      console.warn(
        "formatBotResponse: unreplaced placeholders remain in rendered HTML!",
        html.match(/@@(?:MATH|CODE|MERMAID)\d+@@/g)
      );
    }

    return html;
  }

  // ---------- server-backed API helpers (replace the artifact's window.storage) ----------
  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function apiGet(path) {
    const res = await fetch(path);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function apiDelete(path) {
    const res = await fetch(path, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // ---------- admin-authenticated variants (attach the passcode header) ----------
  async function apiGetAdmin(path) {
    const res = await fetch(path, { headers: { "x-admin-passcode": adminPasscodeValue || "" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function apiPostAdmin(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-passcode": adminPasscodeValue || "" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function apiDeleteAdmin(path) {
    const res = await fetch(path, { method: "DELETE", headers: { "x-admin-passcode": adminPasscodeValue || "" } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  let account = null;
  let suCourses = [];
  let messages = [];
  let adminCourse = "ENGG205";
  let isAdmin = false;
  let pendingAttachment = null; // { name, mimeType, data (base64, no prefix) }
  const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // ~3MB raw file size cap

  function renderCourseCheckList() {
    const el = $("courseCheckList");
    el.innerHTML = "";
    const level = $("suLevel").value;
    const list = COURSES.filter((c) => c.level === level).sort((a, b) => a.code.localeCompare(b.code));
    if (list.length === 0) {
      el.innerHTML = '<p class="footnote">No listed courses for this level yet — use the box below to add your course codes.</p>';
      return;
    }
    list.forEach((c) => {
      const row = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = suCourses.includes(c.code);
      cb.addEventListener("change", () => {
        suCourses = cb.checked ? [...new Set([...suCourses, c.code])] : suCourses.filter((x) => x !== c.code);
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(c.label));
      el.appendChild(row);
    });
  }

  function renderCustomAddedList() {
    const custom = suCourses.filter((c) => !COURSES.find((k) => k.code === c));
    $("customAddedList").textContent = custom.length ? "Added: " + custom.join(", ") : "";
  }

  let activeResetToken = null;

  async function doSignup(e) {
    e.preventDefault();
    const name = $("suName").value.trim();
    const regNumber = $("suReg").value.trim();
    const email = $("suEmail").value.trim();
    const level = $("suLevel").value;
    const semester = $("suSemester").value;
    const password = $("suPassword").value;
    const confirm = $("suConfirm").value;

    if (!name || !regNumber || !email || !password) {
      showToast("Please fill in your name, registration number, email, and password.");
      return;
    }
    if (password.length < 4) {
      showToast("Password should be at least 4 characters.");
      return;
    }
    if (password !== confirm) {
      showToast("Passwords don't match.");
      return;
    }

    try {
      const { user } = await apiPost("/api/auth", {
        action: "signup",
        name,
        regNumber,
        email,
        level,
        semester,
        courses: suCourses.slice(),
        password,
      });
      account = user;
      enterApp();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function doLogin(e) {
    e.preventDefault();
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;
    if (!email || !password) {
      showToast("Enter your email address and password.");
      return;
    }

    try {
      const { user } = await apiPost("/api/auth", { action: "login", email, password });
      account = user;
      enterApp();
    } catch (err) {
      showToast(err.message);
    }
  }

  function enterGuest() {
    account = { name: "Guest", email: "", level: "-", semester: "-", courses: [], guest: true };
    enterApp();
  }

  function enterApp() {
    $("gate").style.display = "none";
    $("app").classList.add("active");
    $("userLine").textContent = account.name + (account.guest ? "" : ` · ${account.level}L · ${account.semester}`);
    $("userAvatar").classList.remove("hidden");

    const sel = $("courseSelect");
    sel.innerHTML = "";
    const general = document.createElement("option");
    general.value = ""; general.textContent = "General / not specified";
    sel.appendChild(general);
    (account.courses || []).slice().sort((a, b) => a.localeCompare(b)).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code; opt.textContent = courseLabel(code);
      sel.appendChild(opt);
    });

    messages = [{
      role: "assistant",
      content: "Welcome to EE Scholar AI. I'm your personal AI tutor for Electrical Engineering at ABU Zaria. Pick a course above if you want, then ask me anything — or say 'quiz me' for a CBT-style test. There's no limit on how much you can chat.",
    }];
    renderMessages();
    loadAnnouncementsBanner();
  }

  let editSelectedCourses = [];

  function renderEditCourseCheckList() {
    const el = $("editCourseCheckList");
    if (!el) return;
    el.innerHTML = "";
    const level = $("editProfileLevel").value;
    const list = COURSES.filter((c) => c.level === level).sort((a, b) => a.code.localeCompare(b.code));
    if (list.length === 0) {
      el.innerHTML = '<p class="footnote">No listed courses for this level — use the custom code box below to add.</p>';
      return;
    }
    list.forEach((c) => {
      const row = document.createElement("label");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "6px";
      row.style.fontSize = "12px";
      row.style.color = "#d4d4d8";
      row.style.cursor = "pointer";
      row.style.padding = "2px 0";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.width = "auto";
      cb.checked = editSelectedCourses.includes(c.code);
      cb.addEventListener("change", () => {
        if (cb.checked) {
          if (!editSelectedCourses.includes(c.code)) editSelectedCourses.push(c.code);
        } else {
          editSelectedCourses = editSelectedCourses.filter((x) => x !== c.code);
        }
        renderEditSelectedChips();
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(c.label));
      el.appendChild(row);
    });
  }

  function renderEditSelectedChips() {
    const container = $("editSelectedChips");
    if (!container) return;
    container.innerHTML = "";
    if (!editSelectedCourses.length) {
      container.innerHTML = '<span class="footnote" style="margin:0; font-style:italic;">No courses selected yet.</span>';
      return;
    }
    const sorted = editSelectedCourses.slice().sort((a, b) => a.localeCompare(b));
    sorted.forEach((code) => {
      const chip = document.createElement("div");
      chip.className = "course-chip";
      const span = document.createElement("span");
      span.textContent = code;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "✕";
      btn.title = `Remove ${code}`;
      btn.addEventListener("click", () => {
        editSelectedCourses = editSelectedCourses.filter((x) => x !== code);
        renderEditCourseCheckList();
        renderEditSelectedChips();
      });
      chip.appendChild(span);
      chip.appendChild(btn);
      container.appendChild(chip);
    });
  }

  function toggleEditCourses() {
    if (!account || account.guest) return;
    const sec = $("profileEditCoursesSection");
    const isHidden = sec.classList.contains("hidden");
    if (isHidden) {
      editSelectedCourses = (account.courses || []).slice();
      $("editProfileLevel").value = account.level || "100";
      $("editProfileSemester").value = account.semester || "First Semester";
      $("editCustomCode").value = "";
      renderEditCourseCheckList();
      renderEditSelectedChips();
      sec.classList.remove("hidden");
    } else {
      sec.classList.add("hidden");
    }
  }

  async function handleSaveCourses(e) {
    e.preventDefault();
    if (!account || account.guest) return;

    const level = $("editProfileLevel").value;
    const semester = $("editProfileSemester").value;
    const btn = $("saveCoursesBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      const res = await apiPost("/api/auth", {
        action: "update-courses",
        email: account.email,
        regNumber: account.regNumber,
        level,
        semester,
        courses: editSelectedCourses.slice(),
      });

      account = { ...account, ...res.user };
      $("userLine").textContent = account.name + (account.guest ? "" : ` · ${account.level}L · ${account.semester}`);
      $("profileLevel").textContent = `${account.level} Level`;
      $("profileSemester").textContent = account.semester;

      // Update course dropdown in header
      const sel = $("courseSelect");
      const currentSelected = sel.value;
      sel.innerHTML = "";
      const general = document.createElement("option");
      general.value = "";
      general.textContent = "General / not specified";
      sel.appendChild(general);
      (account.courses || []).slice().sort((a, b) => a.localeCompare(b)).forEach((code) => {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = courseLabel(code);
        sel.appendChild(opt);
      });
      if ((account.courses || []).includes(currentSelected)) {
        sel.value = currentSelected;
      }

      // Update profile courses list
      const list = $("profileCourses");
      list.innerHTML = "";
      const courses = (account.courses || []).slice().sort((a, b) => a.localeCompare(b));
      if (!courses.length) {
        list.innerHTML = '<p class="footnote">No courses registered yet.</p>';
      } else {
        courses.forEach((code) => {
          const li = document.createElement("li");
          li.textContent = code;
          list.appendChild(li);
        });
      }

      $("profileEditCoursesSection").classList.add("hidden");
      showToast(res.message || "Courses updated successfully!");
    } catch (err) {
      showToast(err.message || "Failed to update courses.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Changes";
    }
  }

  function openProfileModal() {
    if (!account) return;
    $("profileName").textContent = account.name || "-";
    if (account.guest) {
      $("profileRegRow").classList.add("hidden");
      $("profileEmailRow").classList.add("hidden");
      $("profileSecuritySection").classList.add("hidden");
      $("toggleEditCoursesBtn").classList.add("hidden");
    } else {
      $("profileRegRow").classList.remove("hidden");
      $("profileEmailRow").classList.remove("hidden");
      $("profileSecuritySection").classList.remove("hidden");
      $("toggleEditCoursesBtn").classList.remove("hidden");
      $("profileReg").textContent = (account.regNumber || "-").toUpperCase();
      $("profileEmail").textContent = account.email || "-";
    }
    $("profileLevel").textContent = account.guest ? "-" : `${account.level} Level`;
    $("profileSemester").textContent = account.guest ? "-" : account.semester;
    const list = $("profileCourses");
    list.innerHTML = "";
    const courses = (account.courses || []).slice().sort((a, b) => a.localeCompare(b));
    if (!courses.length) {
      list.innerHTML = '<p class="footnote">No courses registered yet.</p>';
    } else {
      courses.forEach((code) => {
        const li = document.createElement("li");
        li.textContent = code;
        list.appendChild(li);
      });
    }
    $("profileEditCoursesSection").classList.add("hidden");
    $("changePasswordForm").classList.add("hidden");
    $("cpCurrentPassword").value = "";
    $("cpNewPassword").value = "";
    $("cpConfirmPassword").value = "";
    $("profileModal").classList.add("active");
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = $("cpCurrentPassword").value;
    const newPassword = $("cpNewPassword").value;
    const confirm = $("cpConfirmPassword").value;

    if (!currentPassword || !newPassword) {
      showToast("Please fill in current and new password.");
      return;
    }
    if (newPassword.length < 4) {
      showToast("New password should be at least 4 characters.");
      return;
    }
    if (newPassword !== confirm) {
      showToast("New passwords do not match.");
      return;
    }

    try {
      const res = await apiPost("/api/auth", {
        action: "change-password",
        email: account.email,
        regNumber: account.regNumber,
        currentPassword,
        newPassword,
      });
      showToast(res.message || "Password updated successfully!");
      $("changePasswordForm").classList.add("hidden");
      $("cpCurrentPassword").value = "";
      $("cpNewPassword").value = "";
      $("cpConfirmPassword").value = "";
    } catch (err) {
      showToast(err.message);
    }
  }

  function openForgotModal() {
    const loginVal = $("loginEmail").value.trim();
    if (loginVal && loginVal.includes("@")) {
      $("forgotEmail").value = loginVal;
    }
    $("forgotFeedback").classList.add("hidden");
    $("forgotFeedback").textContent = "";
    $("forgotPasswordModal").classList.add("active");
  }

  function closeForgotModal() {
    $("forgotPasswordModal").classList.remove("active");
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    const email = $("forgotEmail").value.trim();
    if (!email) {
      showToast("Please enter your email address.");
      return;
    }

    const btn = $("forgotSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      const res = await apiPost("/api/auth", { action: "request-password-reset", email });
      $("forgotFeedback").textContent = res.message || "A password reset link has been sent to your email address.";
      $("forgotFeedback").classList.remove("hidden");
      showToast("Reset link sent! Please check your email inbox.");
    } catch (err) {
      showToast(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Send Reset Link";
    }
  }

  function openResetModal(token) {
    activeResetToken = token;
    $("newPasswordInput").value = "";
    $("newPasswordConfirmInput").value = "";
    $("resetPasswordModal").classList.add("active");
  }

  function closeResetModal() {
    $("resetPasswordModal").classList.remove("active");
    activeResetToken = null;
  }

  async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    if (!activeResetToken) {
      showToast("Invalid reset token. Please request a new link.");
      return;
    }

    const newPassword = $("newPasswordInput").value;
    const confirm = $("newPasswordConfirmInput").value;

    if (!newPassword || newPassword.length < 4) {
      showToast("Password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirm) {
      showToast("Passwords don't match.");
      return;
    }

    const btn = $("resetPasswordSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      const res = await apiPost("/api/auth", {
        action: "reset-password",
        token: activeResetToken,
        newPassword,
      });
      closeResetModal();
      // Remove reset_token from URL without reload
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      showToast(res.message || "Password reset successful! You can now log in.");
      // Switch to login tab
      $("tabLogin").click();
    } catch (err) {
      showToast(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Save New Password";
    }
  }

  function logout() {
    account = null;
    $("app").classList.remove("active");
    $("gate").style.display = "flex";
    $("userAvatar").classList.add("hidden");
    $("loginPassword").value = "";
  }

  function renderMessages(loadingText) {
    const el = $("messages");
    el.innerHTML = "";
    messages.forEach((m) => {
      const div = document.createElement("div");
      div.className = "msg " + (m.role === "user" ? "user" : "bot");
      if (m.role === "user") {
        div.textContent = m.content;
      } else {
        div.innerHTML = formatBotResponse(m.content);
      }
      el.appendChild(div);
    });
    if (loadingText) {
      const div = document.createElement("div");
      div.className = "msg bot loading";
      div.textContent = loadingText;
      el.appendChild(div);
    }
    el.scrollTop = el.scrollHeight;

    // Trigger Mermaid diagram rendering if present
    if (window.mermaid && typeof window.mermaid.run === "function") {
      try {
        const mermaidNodes = el.querySelectorAll(".mermaid");
        if (mermaidNodes.length > 0) {
          window.mermaid.run({ nodes: mermaidNodes }).catch((err) => {
            console.warn("Mermaid diagram rendering error:", err);
          });
        }
      } catch (err) {
        console.warn("Mermaid error:", err);
      }
    }

    // If KaTeX wasn't loaded when math was rendered, queue a deferred re-render
    if (el.querySelector(".katex-pending")) {
      ensureKatexReRender();
    }
  }

  function clearAttachment() {
    pendingAttachment = null;
    $("fileInput").value = "";
    $("attachmentPreview").classList.add("hidden");
  }

  function handleFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      showToast("File is too large — please pick something under 3MB.");
      $("fileInput").value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result looks like "data:<mime>;base64,<data>" — keep only the base64 part.
      const base64 = String(reader.result).split(",")[1] || "";
      const normalizedMime = normalizeMimeType(file.type, file.name);
      pendingAttachment = { name: file.name, mimeType: normalizedMime, data: base64 };
      $("attachmentPreviewText").textContent = "📎 " + file.name;
      $("attachmentPreview").classList.remove("hidden");
    };
    reader.onerror = () => showToast("Couldn't read that file — please try again.");
    reader.readAsDataURL(file);
  }

  async function sendMessage(e) {
    e.preventDefault();
    const input = $("chatInput");
    const text = input.value.trim();
    if (!text && !pendingAttachment) return;

    hideToast();
    const attachment = pendingAttachment;
    const displayText = text || (attachment ? `📎 ${attachment.name}` : "");
    messages.push({ role: "user", content: displayText });
    input.value = "";
    clearAttachment();
    renderMessages("Thinking...");
    $("sendBtn").disabled = true;

    try {
      const courseCode = $("courseSelect").value;
      const history = messages.slice(-14);
      const studentCourses = (account && !account.guest) ? (account.courses || []) : [];
      const { reply } = await apiPost("/api/chat", { messages: history, courseCode, studentCourses, attachment: attachment || undefined });
      messages.push({ role: "assistant", content: reply });
      renderMessages();
    } catch (err) {
      renderMessages();
      showToast(err.message);
    } finally {
      $("sendBtn").disabled = false;
    }
  }

  // ---------- Admin ----------
  async function renderAdminCourseSelect() {
    const sel = $("adminCourseSelect");
    sel.innerHTML = "";
    const grouped = groupByLevel(COURSES);
    Object.keys(grouped).forEach((level) => {
      const group = document.createElement("optgroup");
      group.label = level + " Level";
      grouped[level].sort((a, b) => a.code.localeCompare(b.code)).forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.code; opt.textContent = c.label;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    });

    // Pull in any custom course codes that already have materials in the
    // database (typed in manually rather than picked from the list above)
    // so they keep showing up here instead of appearing to vanish.
    try {
      const data = await apiGetAdmin("/api/materials");
      const knownCodes = new Set(COURSES.map((c) => c.code));
      const customCodes = (data.courseCodes || []).filter((code) => !knownCodes.has(code));
      if (customCodes.length) {
        const group = document.createElement("optgroup");
        group.label = "Custom / Added courses";
        customCodes.forEach((code) => {
          const opt = document.createElement("option");
          opt.value = code; opt.textContent = code;
          group.appendChild(opt);
        });
        sel.appendChild(group);
      }
    } catch (err) {
      // Non-fatal — the built-in course list still works even if this fails.
    }

    sel.value = adminCourse;
  }

  async function loadMaterials() {
    $("managingLabel").textContent = adminCourse;
    const list = $("materialList");
    let items = [];
    try {
      const data = await apiGetAdmin(`/api/materials?courseCode=${encodeURIComponent(adminCourse)}`);
      items = data.materials || [];
    } catch (err) {
      showToast(err.message);
    }
    list.innerHTML = "";
    if (items.length === 0) { list.innerHTML = "<li>No materials uploaded yet for this course.</li>"; return; }
    items.forEach((item) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      const icon = item.contentType === "image" ? "🖼️ " : "📄 ";
      span.textContent = icon + item.title;
      const btn = document.createElement("button");
      btn.className = "danger"; btn.textContent = "Remove"; btn.style.padding = "4px 8px";
      btn.addEventListener("click", () => removeMaterial(item.id));
      li.appendChild(span); li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = () => reject(new Error("Couldn't read that file — please try again."));
      reader.readAsDataURL(file);
    });
  }

  async function addMaterial(e) {
    e.preventDefault();
    const title = $("materialTitle").value.trim();
    const content = $("materialContent").value.trim();
    const file = $("materialFileInput").files && $("materialFileInput").files[0];
    if (!title) { showToast("Give the material a title."); return; }
    if (!content && !file) { showToast("Paste some text or choose a PDF/image to upload."); return; }

    try {
      const payload = { courseCode: adminCourse, title };
      const mime = normalizeMimeType(file ? file.type : "", file ? file.name : "");
      if (file && (mime === "application/pdf" || (file.name && file.name.toLowerCase().endsWith(".pdf")))) {
        payload.pdfBase64 = await readFileAsBase64(file);
      } else if (file && (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name || ""))) {
        payload.imageBase64 = await readFileAsBase64(file);
        payload.imageMimeType = mime === "image/jpg" ? "image/jpeg" : mime;
      } else if (file) {
        showToast("Unsupported file type. Please choose a PDF, JPG, PNG, or WEBP.");
        return;
      } else {
        payload.content = content;
      }
      await apiPostAdmin("/api/materials", payload);
      $("materialTitle").value = ""; $("materialContent").value = "";
      $("materialFileInput").value = ""; $("materialFileName").textContent = "";
      loadMaterials();
      renderAdminCourseSelect(); // in case this was a new custom course code, add it to the dropdown now
    } catch (err) {
      showToast(err.message);
    }
  }

  async function removeMaterial(id) {
    if (!confirm("Remove this material? This cannot be undone.")) return;
    try {
      await apiDeleteAdmin(`/api/materials?id=${encodeURIComponent(id)}`);
      loadMaterials();
    } catch (err) {
      showToast(err.message);
    }
  }

  // ---------- Announcements ----------
  function timeAgoLabel(iso) {
    const then = new Date(iso).getTime();
    const diffMin = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (diffMin < 60) return diffMin <= 1 ? "just now" : `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.round(diffHr / 24)}d ago`;
  }

  async function loadAnnouncementsBanner() {
    const banner = $("announcementsBanner");
    try {
      const data = await apiGet("/api/announcements");
      const items = data.announcements || [];
      if (!items.length) { banner.classList.add("hidden"); banner.innerHTML = ""; return; }
      banner.innerHTML = "";
      items.forEach((a) => {
        const div = document.createElement("div");
        div.className = "announcement-item";
        div.textContent = "📢 " + a.message;
        const time = document.createElement("span");
        time.className = "announcement-time";
        time.textContent = timeAgoLabel(a.createdAt);
        div.appendChild(time);
        banner.appendChild(div);
      });
      banner.classList.remove("hidden");
    } catch (err) {
      banner.classList.add("hidden");
    }
  }

  async function loadAnnouncementsAdminList() {
    const list = $("announcementAdminList");
    let items = [];
    try {
      const data = await apiGet("/api/announcements");
      items = data.announcements || [];
    } catch (err) {
      showToast(err.message);
    }
    list.innerHTML = "";
    if (items.length === 0) { list.innerHTML = "<li>No announcements posted yet.</li>"; return; }
    items.forEach((a) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = a.message;
      const btn = document.createElement("button");
      btn.className = "danger"; btn.textContent = "Remove"; btn.style.padding = "4px 8px";
      btn.addEventListener("click", () => removeAnnouncement(a.id));
      li.appendChild(span); li.appendChild(btn);
      list.appendChild(li);
    });
  }

  async function postAnnouncement(e) {
    e.preventDefault();
    const message = $("announcementText").value.trim();
    if (!message) return;
    try {
      await apiPostAdmin("/api/announcements", { message });
      $("announcementText").value = "";
      loadAnnouncementsAdminList();
      loadAnnouncementsBanner();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function removeAnnouncement(id) {
    if (!confirm("Remove this announcement?")) return;
    try {
      await apiDeleteAdmin(`/api/announcements?id=${encodeURIComponent(id)}`);
      loadAnnouncementsAdminList();
      loadAnnouncementsBanner();
    } catch (err) {
      showToast(err.message);
    }
  }

  // ---------- Splash screen ----------
  function runSplashAnimation() {
    const lines = [
      "Initializing AI Engine...",
      "Loading Course Curriculum...",
      "Preparing Study Tools...",
      "Almost Ready...",
    ];
    let pct = 0;
    let lineIndex = 0;
    $("splashLine").textContent = lines[0];
    const interval = setInterval(() => {
      pct += Math.floor(Math.random() * 18) + 8;
      if (pct >= 100) pct = 100;
      $("splashFill").style.width = pct + "%";
      $("splashPercent").textContent = pct;
      const nextLine = Math.floor((pct / 100) * lines.length);
      if (nextLine < lines.length && nextLine !== lineIndex) {
        lineIndex = nextLine;
        $("splashLine").textContent = lines[lineIndex];
      }
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => { $("splash").style.display = "none"; }, 700);
      }
    }, 180);
  }

  // ---------- GPA / CGPA Calculator ----------
  const GRADE_POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

  function addGpaRow(prefill) {
    const row = document.createElement("div");
    row.className = "gpa-row";
    row.innerHTML = `
      <input placeholder="Course (optional)" value="${prefill?.course || ""}" />
      <input type="number" min="1" max="6" placeholder="Units" value="${prefill?.units || ""}" style="flex:0.6;" />
      <select>
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
        <option value="D">D</option>
        <option value="E">E</option>
        <option value="F">F</option>
      </select>
      <button type="button">✕</button>
    `;
    const [, unitsInput, gradeSelect] = row.querySelectorAll("input, select");
    row.querySelector("button").addEventListener("click", () => { row.remove(); calcGpa(); });
    unitsInput.addEventListener("input", calcGpa);
    gradeSelect.addEventListener("change", calcGpa);
    $("gpaRows").appendChild(row);
  }

  function calcGpa() {
    let totalUnits = 0;
    let totalPoints = 0;
    document.querySelectorAll("#gpaRows .gpa-row").forEach((row) => {
      const unitsInput = row.querySelectorAll("input")[1];
      const gradeSelect = row.querySelector("select");
      const units = parseFloat(unitsInput.value) || 0;
      const point = GRADE_POINTS[gradeSelect.value] ?? 0;
      totalUnits += units;
      totalPoints += units * point;
    });
    $("gpaUnits").textContent = totalUnits;
    $("gpaResult").textContent = totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : "0.00";
  }

  function openGpaModal() {
    if ($("gpaRows").children.length === 0) {
      addGpaRow(); addGpaRow(); addGpaRow();
    }
    $("gpaModal").classList.add("active");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.mermaid && typeof window.mermaid.initialize === "function") {
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          themeVariables: {
            darkMode: true,
            background: "#0e0e11",
            primaryColor: "#22c55e",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#16a34a",
            lineColor: "#86efac",
            secondaryColor: "#27272a",
            tertiaryColor: "#18181b",
          },
        });
      } catch (err) {
        console.warn("Mermaid init error:", err);
      }
    }

    renderCourseCheckList();
    renderAdminCourseSelect();
    runSplashAnimation();

    // Admin access is fully hidden from students — no visible button.
    // The only way in is tapping the header logo 5 times quickly (see the
    // appLogo listener below), then the server-verified passcode gate
    // (see admin-auth.mts / lib/admin-auth.mts, which requires
    // ADMIN_PASSCODE set in Netlify's environment variables).

    // PWA Install prompt handling
    let deferredInstallPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn1 = $("pwaInstallBtn");
      const btn2 = $("pwaInstallBtn2");
      if (btn1) btn1.classList.remove("hidden");
      if (btn2) btn2.classList.remove("hidden");
    });

    async function promptPwaInstall() {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === "accepted") {
        const btn1 = $("pwaInstallBtn");
        const btn2 = $("pwaInstallBtn2");
        if (btn1) btn1.classList.add("hidden");
        if (btn2) btn2.classList.add("hidden");
      }
      deferredInstallPrompt = null;
    }

    const pwaBtn1 = $("pwaInstallBtn");
    const pwaBtn2 = $("pwaInstallBtn2");
    if (pwaBtn1) pwaBtn1.addEventListener("click", promptPwaInstall);
    if (pwaBtn2) pwaBtn2.addEventListener("click", promptPwaInstall);

    $("gpaToolBtn").addEventListener("click", openGpaModal);
    $("gpaToolBtn2").addEventListener("click", openGpaModal);
    $("closeGpaModal").addEventListener("click", () => $("gpaModal").classList.remove("active"));
    $("addGpaRowBtn").addEventListener("click", () => addGpaRow());

    $("guestBtn").addEventListener("click", enterGuest);

    $("tabLogin").addEventListener("click", () => {
      $("tabLogin").classList.add("active"); $("tabSignup").classList.remove("active");
      $("loginForm").classList.remove("hidden"); $("signupForm").classList.add("hidden");
      hideToast();
    });
    $("tabSignup").addEventListener("click", () => {
      $("tabSignup").classList.add("active"); $("tabLogin").classList.remove("active");
      $("signupForm").classList.remove("hidden"); $("loginForm").classList.add("hidden");
      hideToast();
    });

    $("loginForm").addEventListener("submit", doLogin);
    $("signupForm").addEventListener("submit", doSignup);
    $("suLevel").addEventListener("change", renderCourseCheckList);

    $("addCustomCourseBtn").addEventListener("click", () => {
      const val = $("suCustomCode").value.trim().toUpperCase();
      if (val && !suCourses.includes(val)) suCourses.push(val);
      $("suCustomCode").value = "";
      renderCustomAddedList();
    });

    $("logoutBtn").addEventListener("click", logout);
    $("userAvatar").addEventListener("click", openProfileModal);
    $("closeProfileModal").addEventListener("click", () => $("profileModal").classList.remove("active"));
    $("toggleEditCoursesBtn").addEventListener("click", toggleEditCourses);
    $("cancelEditCoursesBtn").addEventListener("click", () => {
      $("profileEditCoursesSection").classList.add("hidden");
    });
    $("editProfileLevel").addEventListener("change", renderEditCourseCheckList);
    $("editAddCustomBtn").addEventListener("click", () => {
      const val = $("editCustomCode").value.trim().toUpperCase();
      if (val && !editSelectedCourses.includes(val)) {
        editSelectedCourses.push(val);
      }
      $("editCustomCode").value = "";
      renderEditSelectedChips();
    });
    $("editCustomCode").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = $("editCustomCode").value.trim().toUpperCase();
        if (val && !editSelectedCourses.includes(val)) {
          editSelectedCourses.push(val);
        }
        $("editCustomCode").value = "";
        renderEditSelectedChips();
      }
    });
    $("editCoursesForm").addEventListener("submit", handleSaveCourses);

    $("toggleChangePasswordBtn").addEventListener("click", () => {
      $("changePasswordForm").classList.toggle("hidden");
    });
    $("changePasswordForm").addEventListener("submit", handleChangePassword);

    $("forgotPasswordBtn").addEventListener("click", openForgotModal);
    $("closeForgotModal").addEventListener("click", closeForgotModal);
    $("cancelForgotBtn").addEventListener("click", closeForgotModal);
    $("forgotForm").addEventListener("submit", handleForgotSubmit);

    $("closeResetModal").addEventListener("click", closeResetModal);
    $("resetPasswordForm").addEventListener("submit", handleResetPasswordSubmit);

    // Detect reset_token in URL if user arrived via email reset link
    const searchParams = new URLSearchParams(window.location.search);
    const resetTokenParam = searchParams.get("reset_token");
    const hashTokenMatch = window.location.hash.match(/reset_token=([^&]+)/);
    const foundResetToken = resetTokenParam || (hashTokenMatch ? hashTokenMatch[1] : null);
    if (foundResetToken) {
      openResetModal(foundResetToken);
    }

    $("sendBtn").addEventListener("click", sendMessage);
    $("chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(e); });
    $("attachBtn").addEventListener("click", () => $("fileInput").click());
    $("fileInput").addEventListener("change", handleFileSelected);
    $("removeAttachmentBtn").addEventListener("click", clearAttachment);

    // Admin access has no visible button — only the app creator knows this:
    // tap the header logo 5 times in a row (within 2 seconds) to open the
    // admin passcode prompt. Everyone else just sees a normal logo.
    let logoTapCount = 0;
    let logoTapTimer = null;
    $("appLogo").addEventListener("click", () => {
      logoTapCount += 1;
      if (logoTapTimer) clearTimeout(logoTapTimer);
      logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 2000);
      if (logoTapCount >= 5) {
        logoTapCount = 0;
        clearTimeout(logoTapTimer);
        if (isAdmin) {
          $("adminPanel").classList.toggle("active");
          if ($("adminPanel").classList.contains("active")) { renderAdminCourseSelect(); loadMaterials(); loadAnnouncementsAdminList(); }
        } else {
          $("adminGateModal").classList.add("active");
        }
      }
    });
    $("closeAdminGate").addEventListener("click", () => $("adminGateModal").classList.remove("active"));
    $("adminGateForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const attempt = $("adminPasscode").value;
      try {
        await apiPost("/api/admin-auth", { passcode: attempt });
        adminPasscodeValue = attempt;
        isAdmin = true;
        $("adminGateModal").classList.remove("active");
        $("adminPasscode").value = "";
        $("adminPanel").classList.add("active");
        renderAdminCourseSelect();
        loadMaterials();
        loadAnnouncementsAdminList();
      } catch (err) {
        showToast(err.message || "Wrong admin passcode.");
      }
    });
    $("closeAdminPanel").addEventListener("click", () => $("adminPanel").classList.remove("active"));

    $("adminCourseSelect").addEventListener("change", (e) => { adminCourse = e.target.value; loadMaterials(); });
    $("adminCustomCode").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const code = e.target.value.trim().toUpperCase();
        if (code) { adminCourse = code; loadMaterials(); }
        e.target.value = "";
      }
    });
    $("addMaterialForm").addEventListener("submit", addMaterial);
    $("materialFileInput").addEventListener("change", () => {
      const f = $("materialFileInput").files && $("materialFileInput").files[0];
      $("materialFileName").textContent = f ? "📎 " + f.name : "";
    });
    $("addAnnouncementForm").addEventListener("submit", postAnnouncement);
    $("toastClose").addEventListener("click", hideToast);
  });
})();
