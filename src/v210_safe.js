/* 2.1 A1 / A14 / B17 — one safety layer for values that come from outside (an imported backup, AI output, a scan):
   1. safe ids: every item id in a project, note, pattern or research entry is plain letters, digits, "_" or "-" (max 64).
      Anything else ("." "/" "#" quotes, markup) gets a fresh id, so it can never become a storage path, a selector
      or a data-bind path. Ids PT writes itself always pass (uid()).
   2. no prototype keys: "__proto__", "constructor" and "prototype" are dropped from imported data and never walked by
      a data-bind path.
   3. safe HTML at the sink: before the page is put on screen, event-handler attributes, script-like tags and
      script: / non-image data: links are removed. PT's own markup has none of these, so the fast path leaves it unchanged.
   4. no outside images from imports: image fields that point to another site (tracking pixels) are cleared. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SAFE_BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const SAFE_IMG_KEYS = new Set(["image", "thumb", "img", "photo"]);   // "src" and "data" only on an image file: elsewhere "src" is a source link (round trip, 2.1)
function safeIdOk(v){ return typeof v === "string" ? SAFE_ID.test(v) : (typeof v === "number" && Number.isFinite(v)); }
/** walk imported data: fix unsafe item ids, drop prototype keys and (imports only) outside image links. Returns how many things changed. */
function safeDeep(o, {imgs = false} = {}, depth = 0){
  if (!o || typeof o !== "object" || depth > 64) return 0;
  let n = 0;
  if (Array.isArray(o)){
    for (const x of o){
      if (x && typeof x === "object" && !Array.isArray(x) && Object.prototype.hasOwnProperty.call(x, "id") && x.id != null){ if (typeof x.id === "number" && Number.isFinite(x.id)) x.id = String(x.id); if (!safeIdOk(x.id)){ x.id = uid("x"); n++; } }
      n += safeDeep(x, {imgs}, depth + 1);
    }
    return n;
  }
  if (depth > 0 && Object.prototype.hasOwnProperty.call(o, "id") && o.id != null && typeof o.id !== "object"){ if (typeof o.id === "number" && Number.isFinite(o.id)) o.id = String(o.id); if (!safeIdOk(o.id)){ o.id = uid("x"); n++; } }   // ids held in objects (brief, live, report) are storage paths too
  for (const k of Object.keys(o)){
    if (SAFE_BAD_KEYS.has(k)){ delete o[k]; n++; continue; }
    const v = o[k];
    if (imgs && (SAFE_IMG_KEYS.has(k) || ((k === "src" || k === "data") && o.type === "image")) && typeof v === "string" && /^[\s\x00-\x1f]*(https?:|\/\/|\\\\)/i.test(v)){ o[k] = ""; n++; continue; }
    n += safeDeep(v, {imgs}, depth + 1);
  }
  return n;
}
/** an imported top-level record (project, note, pattern, research entry): its own id must be safe too */
function safeRecord(x, prefix, opts){
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  safeDeep(x, opts);
  if (!safeIdOk(x.id) || typeof x.id !== "string") x.id = uid(prefix);
  return x;
}
/** 1–5 scales and counts that pages print as numbers: imported data is coerced like AI output is (2.1, raw-number sink) */
function safeNums(p){
  const n5 = v => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(5, Math.max(1, x)) : 3; };
  for (const a of arr(p.assumptions)){ a.impact = n5(a.impact); a.risk = n5(a.risk); }
  for (const r of arr(p.risks)){ r.likelihood = n5(r.likelihood); r.impact = n5(r.impact); }
  const sc = p.engine && p.engine.scan; if (sc) for (const x of arr(sc.existing)){ const f = Math.round(Number(x.fit)); x.fit = Number.isFinite(f) ? Math.min(100, Math.max(0, f)) : 0; }
  for (const run of arr(p.runs)) for (const r of arr(run.results)) for (const v of arr(r.verdicts)){ const c = Math.round(Number(v.c)); v.c = Number.isFinite(c) ? c : 0; }
  // lists a page maps over must be lists (a hand-edited or older backup may lack them)
  for (const x of arr(p.tests)){ x.reqIds = arr(x.reqIds).map(str); x.criteria = arr(x.criteria).map(str); if (x.critIds != null) x.critIds = arr(x.critIds).map(str); }
  for (const x of arr(p.requirements)){ if (x.reqIds != null) x.reqIds = arr(x.reqIds).map(str); }
}
/** links PT puts in a page: https only (http for nothing, never script: or data:) */
function safeUrl(u){ const s = String(u ?? "").trim(); return /^https:\/\//i.test(s) ? s : ""; }

const SAFE_HTML_TRIGGER = /[\s\/"']on[a-z]+\s*=|script\s*(:|&)|<\s*\/?\s*(script|frame|object|embed|base|meta|link|style|template|noscript)\b|<\s*iframe\b(?:(?![^>]*\bsandbox="(allow-scripts)?")|(?=[^>]*\ssrc\s*=))|(href|src|action|formaction|xlink:href)\s*=\s*["']?[\s\x00-\x1f]*data\s*:(?!image\/(png|jpe?g|gif|webp)[;,])/i;
const SAFE_HTML_DROP = "script,frame,frameset,object,embed,base,meta,link,style,template,noscript";
/** clean a page's HTML before it goes on screen; PT's own markup takes the fast path and comes back unchanged */
function safeHTML(html){
  const s = String(html ?? "");
  if (!SAFE_HTML_TRIGGER.test(s)) return s;
  try{
    const tpl = document.createElement("template"); tpl.innerHTML = s;   // ok:raw (a template is inert: nothing runs, nothing loads)
    const f = tpl.content;
    for (const el of f.querySelectorAll(SAFE_HTML_DROP)) el.remove();
    // PT's own frames stay: the mock phone (sandbox="allow-scripts") and the result mockup (sandbox=""), both srcdoc only, never src; any other frame goes
    for (const el of f.querySelectorAll("iframe")){ const sb = el.getAttribute("sandbox"); if ((sb !== "allow-scripts" && sb !== "") || el.hasAttribute("src")) el.remove(); }
    for (const el of f.querySelectorAll("*")){
      for (const a of Array.from(el.attributes)){
        const nm = a.name.toLowerCase();
        if (nm.startsWith("on")){ el.removeAttribute(a.name); continue; }
        if (["href", "src", "action", "formaction", "xlink:href", "srcset", "poster", "background", "values", "to", "from", "by"].includes(nm)){
          const v = a.value.replace(/[\x00-\x20]/g, "").toLowerCase();
          if (/script:/.test(v) || (v.startsWith("data:") && !/^data:image\/(png|jpe?g|gif|webp)[;,]/.test(v))) el.removeAttribute(a.name);
        }
      }
    }
    return tpl.innerHTML;
  }catch(e){ return `<div class="panel"><p class="lead">${esc(t("safe.err"))}</p><div class="row">${btn("rerender", t("btn.redo"), {cls:"primary"})}</div></div>`; }   // 2.1: never the page as source text
}
/* example photos fall back to their thumbnail without an inline handler (2.1: the page carries no on…= attributes) */
document.addEventListener("error", e => { const im = e.target; if (im && im.classList && im.classList.contains("exphoto") && im.dataset.t && im.src !== im.dataset.t && !im.src.endsWith(im.dataset.t)) im.src = im.dataset.t; }, true);
/* ---- the backup import (2.1): check the whole file, then write; tell what happened; mark where it came from; offer Undo ----
   What a backup restores: projects, notes, patterns, research and these settings: language, theme, default mode, layout, weekly budget,
   warn-at. Never: helpers, reports, events, usage (they belong to the workspace they were made in).
   An imported project is marked "from a backup": nothing automatic acts on it (no scheduled task is switched, no update or collect
   job runs, no page is watched) until the owner re-links it with one click that shows the ids. */
const IMPORT_SETTINGS = ["lang", "theme", "defaultMode", "layout", "weeklyBudget", "warnAt"];
let LAST_IMPORT = null;
function importBackup(d, fname){
  const R = {projects: [], notes: [], patterns: [], research: [], skipped: 0, safe: 0, imgs: 0, settings: 0, remap: {}};
  // 1. read everything into a staging list; one bad record and nothing is written
  for (const p00 of arr(d.projects)){
    if (!p00 || typeof p00 !== "object" || Array.isArray(p00)) throw new Error("record");
    const oldId = str(p00.id); const chg = safeDeep(p00, {imgs: true}); const p0 = safeRecord(p00, "p", {imgs: true}); const p = normalizeProject(p0);
    if (chg){ R.safe += chg; }
    if (oldId !== p.id) R.remap[oldId] = p.id;
    if (WS.projects.some(x => x.id === p.id) || R.projects.some(x => x.id === p.id)){ const nid = uid("p"); R.remap[p.id] = nid; p.id = nid; p.name += " " + t("proj.importsuffix"); }
    p.versions = []; p.versionNo = 0;
    p.imported = {at: now(), from: str(fname).slice(0, 80), relinked: false}; p.watch20Ok = false;   // ok:cut (a file name)
    R.projects.push(p);
  }
  for (const [key, prefix, list] of [["notes", "n", WS.notes], ["patterns", "pat", WS.patterns], ["research", "r", WS.research]]){
    for (const x0 of arr(d[key])){
      const chg = safeDeep(x0, {imgs: true}); const x = safeRecord(x0, prefix, {imgs: true}); if (!x) throw new Error("record");
      if (chg) R.safe += chg;
      if (list.some(y => y.id === x.id) || R[key].some(y => y.id === x.id)){ R.skipped++; continue; }
      if (key === "notes" && x.projectId && R.remap[x.projectId]) x.projectId = R.remap[x.projectId];
      R[key].push(x);
    }
  }
  const st = d.workspace && d.workspace.settings && typeof d.workspace.settings === "object" ? d.workspace.settings : null;
  // 2. write
  for (const p of R.projects){ WS.projects.push(p); touch(p); if (arr(p.pkg.sections).length) saveVersion(p, t("ver.imported")); }
  for (const x of R.notes){ WS.notes.push(x); saveNote(x); }
  for (const x of R.patterns){ WS.patterns.push(x); Store.put(wsPath() + "/patterns/" + x.id, x); }
  for (const x of R.research){ WS.research.push(x); Store.put(wsPath() + "/research/" + x.id, x); }
  if (st) for (const k of IMPORT_SETTINGS) if (st[k] !== undefined && typeof st[k] !== "object"){ WS.settings[k] = st[k]; R.settings++; }
  if (R.settings){ saveWs(); if (st.lang && ["en", "de", "zh"].includes(st.lang)) LANG = st.lang; }
  LAST_IMPORT = {at: now(), pids: R.projects.map(p => p.id), nids: R.notes.map(x => x.id), patids: R.patterns.map(x => x.id), rids: R.research.map(x => x.id)};
  render();
  // 3. tell what happened, in one line; Undo asks once (what it removes is listed)
  const parts = [t("imp21.n", {p: R.projects.length, n: R.notes.length + R.patterns.length + R.research.length})];
  if (R.skipped) parts.push(t("imp21.skipped", {n: R.skipped}));
  if (R.safe) parts.push(t("imp21.safe", {n: R.safe}));
  if (R.settings) parts.push(t("imp21.settings", {n: R.settings}));
  if (R.projects.length) parts.push(t("imp21.marked"));
  let host = $("#toasts"); if (!host){ host = document.createElement("div"); host.id = "toasts"; host.className = "toasts"; document.body.appendChild(host); }
  const el = document.createElement("div"); el.className = "toast " + (R.safe ? "warn" : "ok"); el.setAttribute("role", "status"); el.textContent = parts.join(" · ");
  if (LAST_IMPORT.pids.length + LAST_IMPORT.nids.length + LAST_IMPORT.patids.length + LAST_IMPORT.rids.length){
    const b = document.createElement("button"); b.className = "btn xs ghost"; b.textContent = t("imp21.undo"); b.dataset.undo = "import:" + LAST_IMPORT.at; b.dataset.a = "import-undo"; el.appendChild(b);
  }
  host.appendChild(el); setTimeout(() => el.remove(), 15000);   // long enough to read the counts and decide
  return R;
}
function undoImport(){
  const L = LAST_IMPORT; if (!L) return;
  for (const id of L.pids){ const p = WS.projects.find(x => x.id === id); if (!p) continue; Store.del(projPath(id)); for (let i = 1; i <= (p.versionNo || 0); i++) Store.del(projPath(id) + "/versions/v" + i); clearTimeout(saveTimers.get(id)); saveTimers.delete(id); }
  WS.projects = WS.projects.filter(x => !L.pids.includes(x.id));
  for (const id of L.nids){ clearTimeout(noteTimers.get(id)); Store.del(wsPath() + "/notes/" + id); } WS.notes = WS.notes.filter(x => !L.nids.includes(x.id));
  for (const id of L.patids) Store.del(wsPath() + "/patterns/" + id); WS.patterns = WS.patterns.filter(x => !L.patids.includes(x.id));
  for (const id of L.rids) Store.del(wsPath() + "/research/" + id); WS.research = WS.research.filter(x => !L.rids.includes(x.id));
  if (UI.pid && L.pids.includes(UI.pid)){ UI.pid = null; UI.view = "cockpit"; }
  LAST_IMPORT = null; render(); toast(t("imp21.undone"), "ok");
}
/* an imported project that still carries its old live links: the owner re-links it with one click that shows what it touches */
function importedLocked(p){ return !!(p && p.imported && !p.imported.relinked); }
Object.assign(ACTIONS, {
  "rerender": () => render(),
  "import-undo": () => { const L = LAST_IMPORT; if (!L) return; const n = L.pids.length + L.nids.length + L.patids.length + L.rids.length;
    confirmBox(t("imp21.undo"), t("imp21.undoq", {n, x: L.pids.map(id => (WS.projects.find(p => p.id === id) || {}).name).filter(Boolean).join(", ")}), t("imp21.undo"), undoImport); },
  "relink-imported": () => { const p = curP(); if (!p || !p.imported) return;
    const ids = arr(p.tool.triggers).map(x => x.id).concat(arr(p.tool.artifacts).map(x => str(x.id || x)));
    confirmBox(t("imp21.relink"), t("imp21.relinkq", {x: ids.length ? ids.join(", ") : t("imp21.none")}), t("imp21.relink"), () => { p.imported.relinked = true; logAct(p, t("imp21.relinked"), {important: true}); touch(p); render(); toast(t("imp21.relinked"), "ok"); }); },
  "watch20-ok": el => { const p = WS.projects.find(x => x.id === el.dataset.id); if (!p) return; p.watch20Ok = true; touch(p); render(); toast(t("mc20.watch.on"), "ok"); if (typeof mc20Run === "function"){ const M = mc20Read(); if (M) M.seen = false; mc20Run(); } }
});

