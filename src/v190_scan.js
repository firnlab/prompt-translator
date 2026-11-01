/* ===================== 1.9 self-scan: the owner's own repeated steps, proposed in the Sunday note (PLAN-1.9 D, PLAN-1.8 video round 6) =====================
   Code only, no AI, names only (DESIGN-1.8-rev2 §17 "self-scan = code, sequence counting").
   1. What is kept: the 1.7.1 day document (<workspace>/metrics-<day>/<tab id>) gets a list "seq" of the action names you tapped, in
      order — PT's own names (a [data-a] action, "set:<field>" for a changed choice, "form:<name>" for a sent form), never text. A
      button that goes to a fixed place keeps that place's id with it ("nav:settings", "tab:health", "goto:review", "pg-open:run"), so a
      shortcut can find the same button again. A pause of ten minutes or more is the mark "." (a sequence never runs across it). At
      most SCAN19_CAP names per document; after that the day's list stops growing.
   2. The scan: each Saturday at 22:00 Zürich, or the first time PT is open after it, PT counts the step sequences of 3 to 6 names you
      repeated over the 28 days up to that Saturday. Closing, folding and scrolling steps are noise and are left out; a sequence made
      only of moving around (navigation) is ignored, as is one action repeated. Occurrences that overlap count once. Kept: the two most
      repeated with at least 4 repetitions (a longer sequence wins a tie; the same workflow seen from another step — one inside the other, or the same steps in a loop started elsewhere — is not proposed twice). Stored as
      <workspace>/scan/<Saturday>: names and counts only.
   3. The Sunday note proposes them: "You did A → B → C 9 times in 4 weeks. Make it one tap?" — Yes (a shortcut row in the Inbox runs
      the same steps in order with one tap; offered ONLY when every step is on SCAN19_SAFE: steps that look, move around or copy, never
      ones that change, delete, publish, send or spend; otherwise "Note it as an idea" instead) · No (an optional reason; not proposed
      again unless its count doubles) · Later (asked again in a later note). Proposals only: nothing runs by itself, ever.
   4. Each workspace has its own documents, scans and answers (the owner's and the second owner's notes stay separate). */
const SCAN19_CAP = 500, SCAN19_MIN = 3, SCAN19_MAX = 6, SCAN19_REP = 4, SCAN19_DAYS = 28, SCAN19_PAUSE = 10 * 60000, SCAN19_BREAK = ".";
/* a button that goes to a fixed place keeps the place's id (a PT value, never text) */
const SCAN19_QUAL = new Set(["nav", "tab", "goto", "pg-open"]);
/* noise: closing, folding, scrolling and pointing steps carry no intent of their own; the scan's own buttons never become steps */
const SCAN19_NOISE = new Set(["modal-close", "close-overlay", "top", "fold14", "toggle-exp", "xp-more", "xp-fold", "qa-fold", "tray-close", "tray-show", "item-box-close",
  "rc-close", "clearsel", "map-zoom", "map-full", "nav-back", "nav-close", "help-seg", "set-help", "bm-toggle", "selpart", "flags-show", "mark-show", "pg-details", "rows-hist",
  "ib18-more", "scan19-run", "scan19-yes", "scan19-no", "scan19-later", "scan19-idea", "scan19-del", "scan19-delidea", "radio", "checkbox", "select-one"]);
/* navigation: moving between screens, steps and pages; a sequence of only these is ignored */
const SCAN19_NAV = new Set(["nav", "tab", "goto", "home", "pg-open", "pg-step", "open-project", "stage", "phase", "mode", "nav-step", "q-goto", "goto-ref", "item-open",
  "wk18-open", "wk18-pick", "wk18-go", "wk18-rows", "rows-open", "ib18-open", "lfu18-open", "q-tab", "fin-nav", "cmap"]);
/* the allow-list for shortcuts: steps that only look, move around or copy (each is also in PT's own list of actions that change no
   project, ACT_NO). Never a step that changes, deletes, publishes, sends, buys or spends. */
const SCAN19_SAFE = new Set(["nav", "tab", "goto", "home", "pg-open", "q-goto", "goto-ref", "item-open", "q-tab", "q-more",
  "wk18-open", "wk18-pick", "wk18-go", "wk18-rows", "rows-open", "rows-verify", "ib18-open", "ib18-tell", "lfu18-open", "bld18-copy-cmd", "bld18-copy-title",
  "whatsnew", "palette", "panel", "toggle-drawer", "dock-toggle", "card-open", "fs-all", "ex-open", "q-show", "q-walk", "dc-open"]);
const SCAN19 = {ev: null, lastAt: 0, running: false, busy: null, last: null, ws: "", timer: 0};

/* ---------- 1. the names, in order, in the day document ---------- */
function scan19Base(s){ const a = str(s).split(":")[0]; return SCAN19_QUAL.has(a) || a === "set" || a === "form" ? a : str(s); }
function scan19Qual(name){
  const e = SCAN19.ev, el = e && e.target && e.target.closest ? e.target.closest("[data-a]") : null;
  if (!SCAN19_QUAL.has(name) || !el || el.dataset.a !== name) return name;
  const v = str(el.dataset.v || el.dataset.ph);
  return /^[a-z][a-z0-9_-]{0,23}$/.test(v) ? name + ":" + v : name;
}
function scan19Push(name){
  if (typeof metDoc !== "function") return;
  const d = metDoc(); if (!d) return;
  if (!Array.isArray(d.seq)) d.seq = [];
  if (d.seq.length >= SCAN19_CAP) return;   // capped per day (one document per day and page load)
  const n = scan19Qual(str(name).slice(0, 40) || "?").slice(0, 40), t0 = Date.now();
  if (SCAN19.lastAt && t0 - SCAN19.lastAt >= SCAN19_PAUSE && d.seq.length && d.seq[d.seq.length - 1] !== SCAN19_BREAK) d.seq.push(SCAN19_BREAK);
  if (d.seq.length < SCAN19_CAP) d.seq.push(n);
  SCAN19.lastAt = t0; MET.dirty = true;
}
/* the window sees the click before the 1.7.1 counter on the document does: the button's place id is read from the same click */
window.addEventListener("click", e => { if (e.isTrusted) SCAN19.ev = e; }, true);
{ const orig = metTap; metTap = function(name){ const r = orig.apply(this, arguments); try{ scan19Push(name); }catch(e){ onAppError(e && e.message, "scan19:push"); } return r; }; }

/* ---------- 2. counting (pure functions: the tests call them directly) ---------- */
/** a stream of names → the parts between pauses, without noise */
function scan19Parts(stream){
  const out = [[]];
  for (const x of arr(stream)){
    const s = str(x);
    if (s === SCAN19_BREAK){ if (out[out.length - 1].length) out.push([]); continue; }
    if (!s || SCAN19_NOISE.has(scan19Base(s)) || SCAN19_NOISE.has(s)) continue;
    out[out.length - 1].push(s);
  }
  return out.filter(x => x.length >= SCAN19_MIN);
}
function scan19Pure(w){ return w.every(x => SCAN19_NAV.has(scan19Base(x))); }
/** every sequence of 3–6 names with how often it was done (overlapping occurrences count once) */
function scan19Count(streams){
  const C = new Map();
  for (const st of arr(streams)) for (const part of scan19Parts(st)) for (let len = SCAN19_MIN; len <= SCAN19_MAX; len++){
    const end = new Map();
    for (let i = 0; i + len <= part.length; i++){
      const w = part.slice(i, i + len);
      if (new Set(w).size < 2 || scan19Pure(w)) continue;   // one action repeated, or only moving around
      const k = w.join(" > ");
      if (end.has(k) && end.get(k) > i) continue;           // overlaps the occurrence counted before
      end.set(k, i + len);
      const c = C.get(k) || {sig: k, seq: w, n: 0}; c.n++; C.set(k, c);
    }
  }
  return [...C.values()].sort(scan19Order);
}
function scan19Order(a, b){ return b.n - a.n || b.seq.length - a.seq.length || (a.sig < b.sig ? -1 : a.sig > b.sig ? 1 : 0); }
function scan19Inside(a, b){ if (a.length > b.length) return false; for (let i = 0; i + a.length <= b.length; i++) if (a.every((x, j) => x === b[i + j])) return true; return false; }
/** the same workflow seen from another step: one inside the other, one a part of the other done again and again ("A B C t" and
    "C t A B"), or both share all steps but one in a row */
function scan19Same(a, b){
  if (scan19Inside(a, b) || scan19Inside(b, a) || scan19Inside(a, b.concat(b)) || scan19Inside(b, a.concat(a))) return true;
  const k = Math.min(a.length, b.length) - 1;
  for (let i = 0; i + k <= a.length; i++) if (scan19Inside(a.slice(i, i + k), b)) return true;
  return false;
}
/** may this sequence be proposed (again)? No = only once its count has doubled; Yes / idea = it is already in the Inbox */
function scan19Open(c, dec){
  const d = (dec || {})[c.sig]; if (!d) return true;
  if (d.d === "later") return true;
  if (d.d === "no") return c.n >= 2 * Math.max(1, num(d.n, 1));
  return false;
}
/** the two most repeated (at least 4 times), never one inside the other */
function scan19Pick(cands, dec){
  const out = [];
  for (const c of arr(cands).filter(x => x && x.n >= SCAN19_REP && scan19Open(x, dec)).sort(scan19Order)){
    if (out.length >= 2) break;
    if (out.some(o => scan19Same(c.seq, o.seq))) continue;
    out.push(c);
  }
  return out;
}
function scan19Safe(name){ const b = scan19Base(name); return SCAN19_SAFE.has(b) && ACT_NO.has(b); }
function scan19AllSafe(seq){ return arr(seq).length > 0 && arr(seq).every(scan19Safe); }

/* ---------- 3. Saturday 22:00 Zürich ---------- */
/** the latest Saturday 22:00 Zürich at or before this instant: the scan it belongs to */
function scan19Last(ms = Date.now()){
  const z = run18Parts(ms); let back = (z.wd + 1) % 7;   // Saturday 0, Sunday 1 … Friday 6
  if (back === 0 && z.h < 22) back = 7;
  const day = new Date(Date.UTC(z.y, z.m - 1, z.d - back, 12)), y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
  return {key: y + "-" + run18Pad(m) + "-" + run18Pad(d), at: run18At(y, m, d, 22)};
}
function scan19Path(key){ return wsPath() + "/scan/" + key; }
function scan19Dec(){ const s = (WS.settings || {}).scan19; return s && typeof s === "object" ? s : {}; }
function scan19Set(fn){ const s = Object.assign({dec: {}, cuts: [], ideas: []}, clone(scan19Dec())); s.dec = s.dec || {}; s.cuts = arr(s.cuts); s.ideas = arr(s.ideas); fn(s);
  const keys = Object.keys(s.dec); if (keys.length > 80) for (const k of keys.sort((a, b) => str(s.dec[a].at).localeCompare(str(s.dec[b].at))).slice(0, keys.length - 80)) delete s.dec[k];
  WS.settings.scan19 = s; saveWs(); }
/** the day documents of the 28 days up to the scan (every page load of this workspace; this window's own day as it is now) */
async function scan19Docs(at){
  const days = new Set(); for (let x = at - (SCAN19_DAYS - 1) * RUN18_DAY - RUN18_DAY / 2; x <= at; x += RUN18_DAY / 2) days.add(metDay(new Date(x)));
  const lists = await Promise.all([...days].map(d => Store.list(wsPath() + "/metrics-" + d).catch(() => [])));
  const docs = lists.flat().filter(d => d && d.id !== TAB_ID && (!d.ws || d.ws === WS.id));
  if (MET.doc && MET.doc.ws === WS.id && days.has(MET.doc.day)) docs.push(MET.doc);
  return docs.filter(d => Array.isArray(d.seq) && d.seq.length).sort((a, b) => str(a.day).localeCompare(str(b.day)) || str(a.first).localeCompare(str(b.first)));
}
/** count once per Saturday; the result is kept (names and counts only) */
async function scan19Run(key, at){
  const ws = WS.id, docs = await scan19Docs(at);
  if (WS.id !== ws) return null;
  const cands = scan19Count(docs.map(d => d.seq)), dec = scan19Dec().dec;
  const doc = {v: 1, id: key, key, at: now(), upto: new Date(at).toISOString(), days: SCAN19_DAYS, docs: docs.length, steps: docs.reduce((s, d) => s + d.seq.filter(x => x !== SCAN19_BREAK).length, 0),
    cands: cands.filter(c => c.n >= SCAN19_REP).slice(0, 12).map(c => ({sig: c.sig, seq: c.seq, n: c.n})), top: scan19Pick(cands, dec).map(c => ({sig: c.sig, seq: c.seq, n: c.n, safe: scan19AllSafe(c.seq)})), by: "pt"};
  await Store.putNow(scan19Path(key), doc);
  return doc;
}
async function scan19Ensure(ms = Date.now()){
  if (!run18On()) return null;
  const {key, at} = scan19Last(ms);
  if (SCAN19.last && SCAN19.ws === WS.id && SCAN19.last.key === key) return SCAN19.last;
  if (SCAN19.busy) return SCAN19.busy;
  const ws = WS.id;
  SCAN19.busy = (async () => {
    try{
      let doc = await Store.get(scan19Path(key)).catch(() => null);
      if (WS.id !== ws) return null;
      if (!doc || doc.key !== key) doc = await scan19Run(key, at);
      if (doc && WS.id === ws){ SCAN19.last = doc; SCAN19.ws = ws; }
      return doc;
    }catch(e){ onAppError(e && e.message, "scan19:run"); return null; }
    finally{ SCAN19.busy = null; }
  })();
  return SCAN19.busy;
}
function scan19SatOf(noteKey){ const d = new Date(Date.parse(noteKey + "T12:00:00Z") - RUN18_DAY); return d.toISOString().slice(0, 10); }

/* ---------- 4. the Sunday note: two proposals at most ---------- */
{ const orig = wk18Build; wk18Build = async function(key){
    try{ await scan19Ensure(); }catch(e){ onAppError(e && e.message, "scan19:note"); }   // a Sunday note built on its first opening still gets the Saturday scan
    const doc = await orig.apply(this, arguments);
    if (doc){ try{
      const sc = SCAN19.last && SCAN19.ws === WS.id && SCAN19.last.key === scan19SatOf(key) ? SCAN19.last : null;
      doc.scan = sc ? scan19Pick(arr(sc.cands), scan19Dec().dec).map(c => ({sig: c.sig, seq: c.seq, n: c.n, safe: scan19AllSafe(c.seq), key: sc.key})) : [];
      if (doc.scan.length){ await Store.putNow(wk18Path(doc.key), doc); RUN18.notes.set(doc.key, doc); }
    }catch(e){ onAppError(e && e.message, "scan19:note"); } }
    return doc; }; }
if (!WK18_SECS.includes("scan")) WK18_SECS.splice(Math.max(0, WK18_SECS.indexOf("tools")), 0, "scan");
/** an action name in plain words (PT's own labels; an unknown name is shown as it is) */
function scan19Label(name){
  const s = str(name), [a, v] = [scan19Base(s), s.includes(":") ? s.slice(s.indexOf(":") + 1) : ""];
  if (a === "nav") return t("scan.a.nav", {x: STR["nav." + v] ? t("nav." + v) : v === "weekly" ? t("wk.nav") : v || "?"});
  if (a === "tab") return t("scan.a.tab", {x: STR["set.tab." + v] ? t("set.tab." + v) : v || "?"});
  if (a === "goto") return t("scan.a.goto", {x: STR["ph." + v] ? phName(v) : v || "?"});
  if (a === "pg-open") return t("scan.a.pg", {x: STR["sp.st." + v] ? t("sp.st." + v) : v || "?"});
  if (a === "set") return t("scan.a.set", {x: v});
  if (a === "form") return t("scan.a.form", {x: v});
  return STR["scan.a." + s] ? t("scan.a." + s) : s;
}
/** "You did A → B → C 9 times in 4 weeks. Make it one tap?" */
function scan19Ask(x){ return t("scan.q", {x: arr(x.seq).map(scan19Label).join(" → "), n: x.n}); }
function scan19SeqHTML(seq){ return `<span class="scan19-seq">${arr(seq).map(x => `<span class="chip">${esc(scan19Label(x))}</span>`).join(`<span aria-hidden="true"> → </span>`)}</span>`; }
function scan19Unsafe(seq){ return arr(seq).filter(x => !scan19Safe(x)).map(scan19Label); }
function scan19State(sig){ const d = scan19Dec().dec || {}; return d[sig] || null; }
function scan19PropHTML(x){
  const d = scan19State(x.sig), sig = esc(x.sig);
  const ask = `<b class="small">${esc(scan19Ask(x))}</b>`;
  if (d && d.key === x.key){
    const st = d.d === "yes" ? t("scan.st.yes") : d.d === "idea" ? t("scan.st.idea") : d.d === "later" ? t("scan.st.later") : t("scan.st.no") + (d.why ? " — " + d.why : "");
    return `<div class="item scan19-p done" data-sig="${sig}">${stSlot(d.d === "yes" || d.d === "idea" ? "ok" : "todo")}<div class="body">${ask}<span class="small muted">${esc(st)}</span></div></div>`;
  }
  const bad = scan19Unsafe(x.seq);
  const yes = x.safe && !bad.length ? `<button class="btn xs primary" data-a="scan19-yes" data-sig="${sig}">${ic("bolt")}${esc(t("scan.yes"))}</button>` : `<button class="btn xs" data-a="scan19-idea" data-sig="${sig}">${ic("note")}${esc(t("scan.idea"))}</button>`;
  return `<div class="item scan19-p" data-sig="${sig}">${stSlot("attn")}<div class="body">${ask}
    <span class="small muted">${esc(x.safe && !bad.length ? t("scan.yes.what") : t("scan.idea.why", {x: bad.join(", ")}))}</span><span class="small muted">${esc(t("scan.only"))}</span></div>
    <div class="qacts">${yes}<button class="btn xs ghost" data-a="scan19-no" data-sig="${sig}">${esc(t("scan.no"))}</button><button class="btn xs ghost" data-a="scan19-later" data-sig="${sig}">${esc(t("scan.later"))}</button></div></div>`;
}
{ const orig = wk18Entries; wk18Entries = function(n){
    const E = orig(n);
    for (const x of arr(n.scan)) E.push({sec: "scan", secs: wk18Secs(scan19Ask(x) + t("scan.yes.what"), true), html: scan19PropHTML(x)});
    return E; }; }
/** the proposal as the newest note that holds it shows it */
function scan19Find(sig){ for (const nt of RUN18.notes ? wk18Sorted() : []) for (const x of arr(nt.scan)) if (x.sig === sig) return x; return null; }
function scan19Answer(sig, d, why = ""){
  const x = scan19Find(sig); if (!x) return;
  if (d === "yes" && !(x.safe && scan19AllSafe(x.seq))) d = "idea";   // a shortcut only of steps on the allow-list, checked again here
  scan19Set(s => {
    s.dec[sig] = {d, n: x.n, at: now(), key: x.key, ...(why ? {why: str(why).trim().slice(0, 300)} : {})};
    if (d === "yes" && !s.cuts.some(c => c.sig === sig)) s.cuts.push({id: uid("sc"), sig, seq: x.seq.slice(0, SCAN19_MAX), n: x.n, at: now()});
    if (d === "idea" && !s.ideas.some(c => c.sig === sig)) s.ideas.push({id: uid("si"), sig, seq: x.seq.slice(0, SCAN19_MAX), n: x.n, at: now(), why: scan19Unsafe(x.seq).slice(0, 6)});
    s.cuts = s.cuts.slice(-12); s.ideas = s.ideas.slice(-20);
  });
  render();
  toast(t(d === "yes" ? "scan.done.yes" : d === "idea" ? "scan.done.idea" : d === "later" ? "scan.done.later" : "scan.done.no"), d === "yes" || d === "idea" ? "ok" : "");
}

/* ---------- 5. the Inbox: your shortcuts (one tap runs the same steps in order) and the ideas ---------- */
function scan19InboxHTML(){
  const s = scan19Dec(), cuts = arr(s.cuts), ideas = arr(s.ideas);
  return cuts.map(c => `<div class="item scan19-cut" data-id="${esc(c.id)}">${stSlot("ok")}<div class="body"><span class="small"><b>${esc(t("scan.cut"))}</b></span>${scan19SeqHTML(c.seq)}<span class="small muted">${esc(t("scan.cut.sub", {n: c.seq.length}))}</span></div>
      <div class="qacts"><button class="btn xs primary" data-a="scan19-run" data-id="${esc(c.id)}" ${SCAN19.running ? "disabled" : ""}>${ic("play")}${esc(t("scan.run"))}</button><button class="btn xs ghost" data-a="scan19-del" data-id="${esc(c.id)}">${esc(t("scan.del"))}</button></div></div>`).join("")
    + ideas.map(c => `<div class="item scan19-idea" data-id="${esc(c.id)}">${stSlot("todo")}<div class="body"><span class="small"><b>${esc(t("scan.idealine"))}</b></span>${scan19SeqHTML(c.seq)}<span class="small muted">${esc(t("scan.idea.why", {x: arr(c.why).join(", ") || "—"}))}</span></div>
      <div class="qacts"><button class="btn xs ghost" data-a="scan19-delidea" data-id="${esc(c.id)}">${esc(t("scan.del"))}</button></div></div>`).join("");
}
{ const orig = ib18HomeHTML; ib18HomeHTML = function(){
    const h = orig.apply(this, arguments); if (!h) return h;
    let add = ""; try{ add = scan19InboxHTML(); }catch(e){ onAppError(e && e.message, "scan19:inbox"); }
    return add ? h.replace('<div class="list">', '<div class="list">' + add) : h; }; }
/** the button for one step: the same action at the same place, visible and not disabled */
function scan19Button(name){
  const s = str(name), a = scan19Base(s), v = s.includes(":") ? s.slice(s.indexOf(":") + 1) : "";
  if (!/^[a-z0-9-]+$/.test(a) || (v && !/^[a-z][a-z0-9_-]{0,23}$/.test(v))) return null;
  const sel = v ? `[data-a="${a}"][data-v="${v}"], [data-a="${a}"][data-ph="${v}"]` : `[data-a="${a}"]`;
  return [...document.querySelectorAll(sel)].find(el => el.getClientRects().length && !el.disabled && !el.closest("[hidden], .scan19-cut")) || null;
}
/** one tap: the steps in order, each by pressing its own button; stops at the first step that is not on the screen */
async function scan19Go(id){
  const c = arr(scan19Dec().cuts).find(x => x.id === id); if (!c || SCAN19.running) return false;
  if (!scan19AllSafe(c.seq)){ toast(t("scan.run.unsafe"), "err"); return false; }
  SCAN19.running = true;
  try{
    for (let i = 0; i < c.seq.length; i++){
      const el = scan19Button(c.seq[i]);
      if (!el){ toast(t("scan.run.stop", {k: i + 1, n: c.seq.length, x: scan19Label(c.seq[i])}), "err"); return false; }
      el.click();
      await new Promise(r => setTimeout(r, 260));
    }
    toast(t("scan.run.done", {n: c.seq.length}), "ok");
    return true;
  }finally{ SCAN19.running = false; }
}
Object.assign(ACTIONS, {
  "scan19-yes": el => scan19Answer(str(el.dataset.sig), "yes"),
  "scan19-idea": el => scan19Answer(str(el.dataset.sig), "idea"),
  "scan19-later": el => scan19Answer(str(el.dataset.sig), "later"),
  "scan19-no": el => { const sig = str(el.dataset.sig); promptBox(t("scan.no.title"), {ph: t("scan.no.ph"), yes: t("scan.no")}, v => scan19Answer(sig, "no", v)); },
  "scan19-run": el => { scan19Go(str(el.dataset.id)); },
  "scan19-del": el => { const id = str(el.dataset.id); scan19Set(s => { const c = s.cuts.find(x => x.id === id); s.cuts = s.cuts.filter(x => x.id !== id); if (c) s.dec[c.sig] = {d: "no", n: c.n, at: now(), why: t("scan.removed")}; }); render(); },
  "scan19-delidea": el => { const id = str(el.dataset.id); scan19Set(s => { const c = s.ideas.find(x => x.id === id); s.ideas = s.ideas.filter(x => x.id !== id); if (c) s.dec[c.sig] = {d: "no", n: c.n, at: now(), why: t("scan.removed")}; }); render(); }
});
for (const a of ["scan19-yes", "scan19-idea", "scan19-later", "scan19-no", "scan19-run", "scan19-del", "scan19-delidea"]) ACT_NO.add(a);

/* ---------- 6. when: on opening (after Saturday 22:00) and while PT stays open over it ---------- */
{ const orig = run18OnOpen; run18OnOpen = function(){
    const r = orig.apply(this, arguments), ws = WS.id;
    SCAN19.last = null; SCAN19.ws = "";
    setTimeout(() => { if (WS.id === ws && run18On()) scan19Ensure().catch(e => onAppError(e && e.message, "scan19:open")); }, 2600);
    return r; }; }
setInterval(() => { try{ if (run18On() && !SCAN19.busy) scan19Ensure(); }catch(e){ onAppError(e && e.message, "scan19:tick"); } }, 300000);
