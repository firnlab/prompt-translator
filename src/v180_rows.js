/* ===================== 1.8 decision rows (projection, ids <Branch>.<Stage>.<Step>), events (append-only, hash chain), tiers + undo =====================
   DESIGN-1.8-rev2 §1, §2, §4, §10 and the owner's decisions in PLAN-1.8 (where they differ, PLAN wins).
   1. Rows are a PROJECTION: worked out from the project as it is (Pick cards and log, kit decisions, p.decisions, the p.arch choice,
      p.tool.versions, plus rows other 1.8 parts add through ROW_SOURCES) every time they are needed. Nothing in the project is
      rewritten for them; Undo and queueOf stay exactly as they are.
   2. Ids <Branch>.<Stage>.<Step> (TREE-1.8 §7): Branch = U (universal) or the direction letter a kit decision belongs to (TREE-1.8 §1),
      Stage = one of the eleven stages (1 Wish … 11 Years 2–3), Step = the next free number in that Branch.Stage. A number is handed
      out once, written into the event log with the row it names, and never handed out again (also not after the row is gone).
   3. Events: append-only, one small document per event under <project>/events-<YYYY-MM>[-n]/<ulid> (a new collection after 900
      documents, so one listing always sees them all; every document stays far below the 256 KiB limit). Each event carries
      schemaVersion, the hash of its own content and the hash of the event before it, so the chain can be checked at any time.
      Events come from comparing the projection with the state the events describe: every decision taken, changed or taken back is
      written, whoever made it (a click, Undo, a restore, PT). Tier changes, conditions and PT's own ★ takes are events too.
      Events are never deleted; an event can only be written once the log of its project was read.
   4. Tiers by consequence (how reversible): auto "I do it" · notify "I do it and tell you" · block "I wait for you". In 1.8 PT takes ★
      by itself ONLY on rows explicitly set to auto — never on block rows, never on check rows (O4a: every gate of a private tool
      needs the owner's tap), never on a row a changed fact touched. Block waits without a timeout.
   5. Undo of PT's own step = the restore point made right before it (PT never deletes restore points) + the list of what a restore
      cannot take back.
   6. Migration: 1.7 projects get their rows from the projection without any change to their data; the first event of each project
      says "migrated from 1.7" and points at a restore point made then. */
const ROW_SCHEMA = 1, ROW_EPOCH = "2026-10", ROW_ROLL = 900, ROW_MAX = 200000, ROW_CHUNK = 120;
const ROWS = {L: {}, hint: new Map(), timers: new Map(), auto: new Set(), chk: {}, bootAt: Date.now(), busy: false, fails: 0};
/* other 1.8 parts add rows here: fn(p, add) with add({src, question, options:[{label, why}], star:{label, why, conf}, decided, val, chosen, by, at,
   stage, branch, ref, hard, gate, tier, tierExplicit}); a row with gate: true is a check row and is never taken by PT */
const ROW_SOURCES = [];
/* fn(p, row) → true when a changed fact touches the row (PT then never takes its ★ by itself) */
const ROW_FACT = [];
const ROW_STAGE_OF_TARGET = {name: 1, idea: 1, example: 1, "ns.problem": 1, "ns.goal": 1, "ns.success": 1, "ns.users": 1, "ns.constraints": 1, result: 1, measure: 1, crit: 1,
  audience: 2, scope: 3, lang: 3, decision: 3, data: 3, design: 3, home: 3, platform: 4, legal: 4, money: 4, risk: 4};
/* "your call first" (owner, 31 Oct 2026): money, who can see it, where data lives — these rows wait for the owner */
const ROW_HIGH = new Set(["money", "legal", "audience", "data", "platform"]);
/* kit decisions: [branch, stage, tier] — the branch is the direction the kit belongs to (B page, C scheduled, E web app, F phone, G media, H company, I existing product) */
const ROW_KIT = {storage: ["B", 3, "block"], engine: ["C", 3, "notify"], results: ["C", 3, "notify"], host: ["E", 4, "block"], pay: ["E", 4, "block"], backend: ["E", 3, "block"], login: ["E", 4, "block"],
  path: ["F", 3, "notify"], store: ["F", 4, "block"], img: ["G", 4, "notify"], voice: ["G", 4, "notify"], design: ["G", 3, "notify"], record: ["H", 2, "notify"], rebuild: ["I", 2, "block"]};
const ROW_DEC_STAGE = [["ns.title", 1], ["ns.problem", 1], ["und.reframe", 1], ["test.adopt", 6], ["launch.launchver", 8], ["ver.save", 7]];
const ROW_GATE_SRC = /^(gate|check|lens|proof):/;
const ROW_B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let ROW_ULID_LAST = {t: 0, r: []};

/* ---------- small helpers ---------- */
/** a stored text that was written in any of the three languages (titles in p.decisions are stored in the language of that day) */
function rowAny(key, s){ const r = STR[key]; return !!r && r.some(x => x === str(s)); }
function rowAnyStart(key, s){ const r = STR[key]; return r ? r.find(x => str(s).startsWith(x)) || "" : ""; }
function rowCut(s, n = 300){ s = str(s); return s.length > n ? s.slice(0, n) : s; }
function rowNorm(s){ return str(s).trim().toLowerCase().replace(/\s+/g, " "); }
function rowQueue(p){ try{ return queueOf(p); }catch(e){ return []; } }   // ok:catch a broken queue item never stops the rows; the queue shows its own error
function rowOrder(a, b){ const x = str(a.at) || "9999", y = str(b.at) || "9999"; return x < y ? -1 : x > y ? 1 : a.src < b.src ? -1 : a.src > b.src ? 1 : 0; }
function rowIdKey(id){ const m = /^([A-Z]+)\.(\d+)\.(\d+)$/.exec(str(id)); return m ? [m[1], +m[2], +m[3]] : ["~", 99, 0]; }
function rowIdOrder(a, b){ const x = rowIdKey(a.id), y = rowIdKey(b.id); return x[1] - y[1] || (x[0] === y[0] ? 0 : x[0] === "U" ? -1 : y[0] === "U" ? 1 : x[0] < y[0] ? -1 : 1) || x[2] - y[2]; }
/** sortable, unique event ids (ULID: 48-bit time + 80 random bits, Crockford base 32; strictly increasing within one window) */
function rowUlid(){
  let ts = Date.now(), r;
  if (ts <= ROW_ULID_LAST.t){ ts = ROW_ULID_LAST.t; r = ROW_ULID_LAST.r.slice(); for (let i = 15; i >= 0; i--){ if (r[i] < 31){ r[i]++; break; } r[i] = 0; } }
  else { try{ r = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b & 31); }catch(e){ r = Array.from({length: 16}, () => Math.floor(Math.random() * 32)); } }   // ok:catch no crypto: Math.random is enough for uniqueness inside one window
  ROW_ULID_LAST = {t: ts, r};
  let head = ""; for (let i = 0, x = ts; i < 10; i++){ head = ROW_B32[x % 32] + head; x = Math.floor(x / 32); }
  return head + r.map(i => ROW_B32[i]).join("");
}
/** the same object always gives the same text (keys sorted), so a hash can be checked anywhere */
function rowCanon(v){
  if (Array.isArray(v)) return "[" + v.map(rowCanon).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ":" + rowCanon(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}
async function rowHash(e){ const o = Object.assign({}, e); delete o.hash; return sha256(rowCanon(o)); }
function rowYm(iso){ return str(iso).slice(0, 7); }
function rowNextYm(ym){ let [y, m] = ym.split("-").map(Number); m++; if (m > 12){ m = 1; y++; } return y + "-" + String(m).padStart(2, "0"); }
function rowColl(base, ym, n){ return base + "/events-" + ym + (n > 1 ? "-" + n : ""); }
function rowsOn(){ return !!(typeof WS !== "undefined" && WS && WS.id && UI.wsReady && !UI.fatal); }
/** schemaVersion 1 is the current shape; a later version adds its upcaster here (old events are read, never rewritten) */
function rowUpcast(e){ return e; }

/* ---------- 1. the projection ---------- */
function rowsFromPick(p, add){
  if (typeof pickRead !== "function") return;
  const k = pickRead(p), byE = new Map(k.log.map(e => [e.id, e])), reask = new Map();
  for (const c of k.cards){ const e = byE.get(c.replaces) || byE.get(c.late); if (e) reask.set(e.id, c); }
  for (const e of k.log){
    const c = e.card || {}, opts = arr(c.options), again = reask.get(e.id);
    add({src: "pick:" + (e.cid || e.id), ref: again ? "pick:" + again.id : "", branch: "U", stage: ROW_STAGE_OF_TARGET[e.target] || 3, target: e.target, question: str(e.q || c.q),
      options: opts.map(o => ({label: str(o.label), why: str(o.text)})), star: c.rec >= 0 && opts[c.rec] ? {label: str(opts[c.rec].label), why: str(c.recWhy), conf: c.conf || ""} : null, hard: !!c.hard,
      decided: true, val: str(e.answer), chosen: str(e.answer), by: e.assumed ? "star-batched" : "owner", at: str(e.at), reopen: !!again, fact: !!(again && (again.late || again.mindHit)), history: arr(e.changed)});
  }
  const linked = new Set([...reask.values()].map(c => c.id));
  for (const c of k.cards){
    if (linked.has(c.id)) continue;
    const opts = arr(c.options);
    add({src: "pick:" + c.id, ref: "pick:" + c.id, branch: "U", stage: ROW_STAGE_OF_TARGET[c.target] || 3, target: c.target, question: str(c.q),
      options: opts.map(o => ({label: str(o.label), why: str(o.text)})), star: c.rec >= 0 && opts[c.rec] ? {label: str(opts[c.rec].label), why: str(c.recWhy), conf: c.conf || ""} : null, hard: !!c.hard,
      decided: false, at: str(c.at), fact: !!(c.late || c.mindHit),
      autoOK: !c.hard && c.rec >= 0 && !c.late && !c.reading && c.target !== "example" && !ROW_HIGH.has(c.target) && !/^ns\./.test(str(c.target))});
  }
}
/** the options and ★ of a decision waiting in the queue, as PT shows them there */
function rowOpts(p, x){
  let O = []; try{ O = qOptions(p, x).filter(o => !o.opens); }catch(e){ O = []; }   // ok:catch a decision without options still shows as a row
  const s = O.find(o => o.star);
  return {options: O.map(o => ({label: str(o.label), why: str(o.why)})), star: s ? {label: str(s.label), why: str(s.why)} : null};
}
function rowsFromKit(p, add){
  if (typeof kitRead !== "function") return;
  const k = kitRead(p), Q = rowQueue(p), pkg = arr(p.pkg && p.pkg.sections).length > 0;
  const tx = (key, vars) => { const v = t(key, vars); return v === key ? "" : v; };
  for (const [key, d] of Object.entries(k)){
    if (!d || !d.kind) continue;
    const m = ROW_KIT[key] || ["U", 3, "notify"], qk = d.qKey || "kit.q." + key, ok = d.optKey || "kit.o.";
    add({src: "kit:" + key, ref: "kit:" + key, branch: m[0], stage: m[1], base: m[2], question: tx(qk, {x: typeof kit7Product === "function" ? kit7Product(p) : ""}) || key,
      options: [], star: d.rec ? {label: tx(ok + d.rec) || d.rec, why: ""} : null, decided: true, val: str(d.kind), chosen: tx(ok + d.kind) || str(d.kind), by: !d.by || d.by === "you" ? "owner" : "star-taken", at: str(d.at)});
  }
  for (const x of Q.filter(y => /^kit-/.test(str(y.kind)) && str(y.ref).startsWith("kit:"))){
    const key = str(x.ref).slice(4); if (k[key] && k[key].kind) continue;
    const m = ROW_KIT[key] || ["U", 3, "notify"], o = rowOpts(p, x);
    add({src: "kit:" + key, ref: x.ref, branch: m[0], stage: m[1], base: x.hard ? "block" : m[2], question: str(x.title), options: o.options, star: o.star, hard: !!x.hard, decided: false,
      autoOK: m[2] !== "block" && !x.hard && !pkg});
  }
}
function rowsFromArch(p, add){
  const a = p.arch || {}, os = arr(a.options); if (!os.length && !a.chosen) return;
  const ch = os.find(o => o.id === a.chosen), rec = os.find(o => o.id === a.recommended), decs = arr(p.decisions).filter(d => d && rowAny("arch.title", d.title)), last = decs[decs.length - 1];
  add({src: "arch:choice", ref: "arch:choice", branch: "U", stage: 2, question: t("arch.title"), options: os.map(o => ({label: str(o.name), why: str(o.summary)})), star: rec ? {label: str(rec.name), why: str(a.why)} : null, hard: true,
    decided: !!a.chosen, val: str(a.chosen), chosen: ch ? str(ch.name) : str(a.chosen), by: a.chosenAssumed ? "star-taken" : "owner", at: last ? str(last.at) : ""});
}
let ROW_KITQ = null;
function rowKitTitles(){ if (!ROW_KITQ){ ROW_KITQ = new Set(); for (const k of Object.keys(STR)) if (k.startsWith("kit.q.")) for (const s of STR[k]) ROW_KITQ.add(s); } return ROW_KITQ; }
function rowMockV(title){ const s = rowAnyStart("mock.title", title); if (!s) return 0; const m = /^ v(\d+)$/.exec(str(title).slice(s.length)); return m ? +m[1] : 0; }
function rowDecStage(title){ for (const [k, s] of ROW_DEC_STAGE) if (rowAny(k, title)) return s; return 3; }
function rowsFromDecisions(p, add){
  const log = typeof pickRead === "function" ? pickRead(p).log : [], pickQA = new Set(log.map(e => str(e.q) + "\u0001" + str(e.answer))), kitQ = rowKitTitles();
  const list = arr(p.decisions).filter(d => d && d.id && !d.pick && !rowAny("arch.title", d.title) && !kitQ.has(str(d.title)) && !pickQA.has(str(d.title) + "\u0001" + str(d.choice)));
  const lastOf = new Map(); for (const d of list) lastOf.set(rowMockV(d.title) ? "mock" : rowNorm(d.title), d);
  const mocks = list.filter(d => rowMockV(d.title)).sort((a, b) => rowMockV(a.title) - rowMockV(b.title));
  for (const d of list){
    const v = rowMockV(d.title), later = lastOf.get(v ? "mock" : rowNorm(d.title));
    const no = v ? rowAnyStart("mock.no", d.choice) : "", note = no ? str(d.choice).slice(no.length).replace(/^:\s*/, "") : "";
    const nextMock = v ? mocks.find(x => rowMockV(x.title) > v) : null;
    add({src: v ? "mock:v" + v : "dec:" + d.id, ref: "", branch: "U", stage: v ? 5 : rowDecStage(d.title), question: str(d.title), options: [], star: null, why: str(d.reason),
      decided: true, val: str(d.choice), chosen: str(d.choice), by: "owner", at: str(d.at), decline: note,
      supersededSrc: v ? (nextMock ? "mock:v" + rowMockV(nextMock.title) : "") : later && later !== d ? "dec:" + later.id : "", replaced: !!d.replaced});
  }
  const m = typeof mockOf === "function" ? mockOf(p) : null;
  if (m && m.status === "open" && m.v) add({src: "mock:v" + m.v, ref: "mock", branch: "U", stage: 5, base: "notify", question: t("mock.q", {v: m.v}), options: [{label: t("mock.yes"), why: t("mock.yes.why")}, {label: t("mock.no"), why: t("mock.no.why")}],
    star: {label: t("mock.yes"), why: t("mock.yes.why")}, decided: false});
}
function rowsFromVersions(p, add){
  const by = new Map();
  for (const x of arr(p.tool && p.tool.versions)){ if (!x || !x.url || !x.version) continue; if (!by.has(x.url)) by.set(x.url, []); by.get(x.url).push(x); }
  let n = 0;
  for (const [url, list] of by){ n++;
    list.forEach((x, i) => { const next = list[i + 1];
      add({src: "ver:" + url + "@" + x.version, ref: "", branch: "U", stage: 8, base: "block", hard: true, question: t("row.q.version", {n}), options: [], star: null,
        decided: true, val: str(x.version), chosen: (x.v ? "v" + x.v + " · " : "") + str(x.version), by: "owner", at: str(x.at), supersededSrc: next ? "ver:" + url + "@" + next.version : ""}); }); }
}
/** every row of a project, without numbers (the numbers come from the event log). Read as a render reads: the readers PT already
    has (queueOf, goalOf, …) never fill in missing parts of the project then, so working out the rows changes nothing in it
    (outside a render they would, and the next action would get a phantom "other changes" Undo step). */
function rowsCompute(p){
  if (RENDERING) return rowsComputeNow(p);
  RENDERING = true; SI_CACHE = null; Q_CACHE = null; IT_CACHE = null; DEP_CACHE = null;
  try{ return rowsComputeNow(p); } finally { RENDERING = false; PR_CACHE = null; SI_CACHE = null; Q_CACHE = null; IT_CACHE = null; DEP_CACHE = null; }
}
function rowsComputeNow(p){
  const R = [], seen = new Set();
  const add = r => { if (!r || !r.src) return; let s = str(r.src); for (let i = 2; seen.has(s); i++) s = str(r.src) + "#" + i; seen.add(s); r.src = s; r.branch = /^[A-Z]$/.test(str(r.branch)) ? r.branch : "U"; r.stage = clamp(num(r.stage, 3), 1, 11); R.push(r); };
  for (const f of [rowsFromPick, rowsFromKit, rowsFromArch, rowsFromDecisions, rowsFromVersions, ...ROW_SOURCES]){
    try{ f(p, add); }catch(e){ onAppError(e && e.message, "rows:" + (f.name || "source")); }
  }
  return R;
}
/** numbers for these rows: registered ones from the log; new ones as the log will number them (in time order), not yet written */
function rowNumber(L, raw){
  const max = Object.assign({}, L ? L.max : {}), out = new Map();
  for (const r of raw) if (L && L.reg.has(r.src)) out.set(r.src, {id: L.reg.get(r.src), prov: false});
  for (const r of raw.filter(x => !out.has(x.src)).sort(rowOrder)){ const k = r.branch + "." + r.stage; max[k] = (max[k] || 0) + 1; out.set(r.src, {id: k + "." + max[k], prov: true}); }
  return {out, max};
}
function rowTierBase(r){ if (r.gate || ROW_GATE_SRC.test(r.src)) return "block"; if (r.tier && ["auto", "notify", "block"].includes(r.tier)) return r.tier; if (r.base) return r.base; if (r.hard || ROW_HIGH.has(str(r.target))) return "block"; return "notify"; }
/** the tier a row has now: its consequence class, or the owner's own setting where allowed (block can never be lowered; auto only where an undo is cheap) */
function rowTier(L, r){
  const base = rowTierBase(r), set = L && L.tier.get(r.src);
  if (r.tier && r.tierExplicit && !set) return {tier: base, by: "source"};
  if (!set || base === "block" || r.gate) return {tier: base, by: "pt"};
  if (set === "auto" && !r.autoOK) return {tier: base, by: "pt"};
  return {tier: set, by: "owner"};
}
function rowFact(p, r){
  if (r.fact) return true;
  if (r.ref && arr(p.flags).some(f => f && f.ref === r.ref)) return true;
  for (const f of ROW_FACT){ try{ if (f(p, r)) return true; }catch(e){ return true; } }   // ok:catch when in doubt a fact counts as changed (PT then waits for you)
  return false;
}
/** the rows of a project: id, question, options, ★ + why (+ confidence), decision {chosen, by, at, superseded_by}, condition, tier */
function rowsOf(p){
  if (!p) return [];
  const L = ROWS.L[p.id] && ROWS.L[p.id].ready ? ROWS.L[p.id] : null, raw = rowsCompute(p), {out} = rowNumber(L, raw);
  const idOf = src => (out.get(src) || {}).id || (L && L.reg.get(src)) || "";
  return raw.map(r => {
    const n = out.get(r.src), tr = rowTier(L, r), st = L && L.st.get(r.src);
    const by = st && st.val === rowCut(r.val) && st.by ? st.by : r.by;
    const sup = r.supersededSrc ? idOf(r.supersededSrc) : "";
    return {id: n.id, prov: n.prov, src: r.src, ref: r.ref || "", branch: r.branch, stage: r.stage, question: r.question, options: arr(r.options), star: r.star || null, why: r.why || "",
      hard: !!r.hard, gate: !!(r.gate || ROW_GATE_SRC.test(r.src)), target: r.target || "", reopen: !!r.reopen, history: arr(r.history),
      decision: r.decided ? {chosen: str(r.chosen), val: str(r.val), by: by || "owner", asserted_by: by || "owner", at: str(r.at), superseded_by: sup || (r.replaced ? "—" : "")} : null,
      decline: (L && L.decl.get(r.src)) || str(r.decline), tier: tr.tier, tierBy: tr.by, baseTier: rowTierBase(r), autoOK: !!r.autoOK, fact: rowFact(p, r), noAuto: !L || L.noAuto.has(r.src),
      status: !r.decided ? "open" : sup || r.replaced ? "superseded" : "decided"};
  });
}
function rowById(p, id){ return rowsOf(p).find(r => r.id === id) || null; }

/* ---------- 2. the event log ---------- */
function rowLedger(base){ return {ready: false, failed: false, loading: null, base, list: [], reg: new Map(), used: new Set(), max: {}, st: new Map(), tier: new Map(), decl: new Map(), noAuto: new Set(), counts: {}, tail: null, chain: Promise.resolve()}; }
function rowReg(L, src, id){
  if (!src || L.reg.has(src)) return;
  let m = /^([A-Z]+)\.(\d+)\.(\d+)$/.exec(str(id));
  if (!m) return;
  if (L.used.has(id)){ const k = m[1] + "." + m[2]; id = k + "." + ((L.max[k] || 0) + 1); m = /^([A-Z]+)\.(\d+)\.(\d+)$/.exec(id); }   // two windows numbered at once: the later event gets the next free number
  L.reg.set(src, id); L.used.add(id);
  const k = m[1] + "." + m[2]; L.max[k] = Math.max(L.max[k] || 0, +m[3]);
}
/** replay one event into the ledger (the state the events describe) */
function rowApply(L, e){
  for (const [src, id] of arr(e.ids)) rowReg(L, src, id);
  const d = e.data || {};
  for (const r of arr(d.rows)){ rowReg(L, r.src, r.row); if (r.val != null) L.st.set(r.src, {val: r.val, chosen: r.chosen, by: r.by, at: r.at}); }
  if (e.src && e.row) rowReg(L, e.src, e.row);
  if (e.type === "taken" || e.type === "changed") L.st.set(e.src, {val: d.val, chosen: d.chosen, by: e.by, at: d.at || e.at});
  if (e.type === "undone") L.st.delete(e.src);
  // the owner took a decision back (Undo, a restore, or PT's step undone): PT does not take that ★ again until the owner sets the row again
  if ((e.type === "undone" && e.cause) || e.type === "undo") L.noAuto.add(e.src);
  if (e.type === "tier"){ L.tier.set(e.src, d.tier); L.noAuto.delete(e.src); }
  if (e.type === "decline") L.decl.set(e.src, str(d.text));
}
async function rowLoad(p, base){
  const first = [rowYm(p.createdAt), ROW_EPOCH].filter(x => /^\d{4}-\d\d$/.test(x)).sort().pop();
  const end = rowYm(new Date(Date.now() + 32 * 86400000).toISOString());   // this month and the next (two windows' clocks may differ)
  const list = [], counts = {};
  for (let ym = first, i = 0; ym <= end && i < 600; ym = rowNextYm(ym), i++){
    for (let n = 1; n <= 50; n++){ const c = rowColl(base, ym, n), docs = await Store.rawList(c); counts[c] = docs.length; list.push(...docs); if (docs.length < ROW_ROLL) break; }
  }
  return {list: list.filter(e => e && e.id && e.type).map(rowUpcast).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), counts};
}
/** read the event log of a project once (numbers, decisions, tiers, conditions); a project without one gets its first event */
function rowsEnsure(p){
  if (!p || !p.id || !rowsOn()) return Promise.resolve(null);
  const have = ROWS.L[p.id];
  if (have && (have.ready || have.loading)) return have.loading || Promise.resolve(have);
  if (have && have.failed && Date.now() - have.failedAt < 30000) return Promise.resolve(have);
  const ws = WS.id, L = ROWS.L[p.id] = rowLedger(projPath(p.id));
  L.loading = (async () => {
    try{
      const got = await rowLoad(p, L.base);
      if (WS.id !== ws || ROWS.L[p.id] !== L) return L;   // another workspace opened meanwhile: nothing is written
      L.counts = got.counts; L.list = got.list; for (const e of got.list) rowApply(L, e);
      L.tail = got.list[got.list.length - 1] || null; L.ready = true;
      const q = WS.projects.find(x => x.id === p.id);
      if (!got.list.length && q) rowsMigrate(q, L);
    }catch(e){ L.failed = true; L.failedAt = Date.now(); console.warn("rows: the event log could not be read", e); }   // ok:catch nothing is written while the log is unread; the view says so and retries
    finally{ L.loading = null; }
    return L;
  })();
  return L.loading;
}
/** write events in order: each gets its id, its parent's hash and its own hash; one small document per event */
function rowAppend(L, evs){
  if (!evs.length || !L.ready) return L.chain;
  for (const e of evs){ e.schemaVersion = ROW_SCHEMA; e.id = rowUlid(); e.at = now(); e.pid = L.base.split("/").pop(); L.list.push(e); }
  L.chain = L.chain.then(async () => {
    for (const e of evs){
      e.parent = L.tail ? str(L.tail.hash) : ""; e.hash = await rowHash(e);
      if (byteLen(JSON.stringify(e)) > ROW_MAX){ e.data = {cut: true, q: rowCut(e.data && e.data.q, 200)}; e.hash = await rowHash(e); }   // never reached by the chunked writes; a guard for the 256 KiB limit
      const ym = rowYm(e.at); let n = 1; while (n < 50 && (L.counts[rowColl(L.base, ym, n)] || 0) >= ROW_ROLL) n++;
      const c = rowColl(L.base, ym, n);
      Store.put(c + "/" + e.id, e); L.counts[c] = (L.counts[c] || 0) + 1; L.tail = e;
    }
  }).catch(err => { ROWS.fails++; onAppError(err && err.message, "rows:append"); });
  return L.chain;
}
/** the first event of a project: every row numbered, the decisions as they are; a 1.7 project also gets a restore point */
function rowsMigrate(p, L){
  const old = Date.parse(p.createdAt || 0) < ROWS.bootAt;
  const raw = rowsCompute(p), {out, max} = rowNumber(L, raw);
  const rows = raw.slice().sort(rowOrder).map(r => Object.assign({row: out.get(r.src).id, src: r.src}, r.decided ? {val: rowCut(r.val), chosen: rowCut(r.chosen), by: r.by, at: str(r.at)} : {}));
  let rp = null;
  if (old){ rp = rowRestore(p, t("row.rp.migrate"), "migrate"); if (rp) saveProject(p); }   // the project's data stays as it is; only the restore point is added to its list
  const evs = [];
  for (let i = 0; i === 0 || i * ROW_CHUNK < rows.length; i++){
    const part = rows.slice(i * ROW_CHUNK, (i + 1) * ROW_CHUNK);
    evs.push(i === 0 ? Object.assign({type: old ? "migrated" : "started", data: {from: old ? "1.7" : "", pt: PT_VERSION, rows: part}}, rp ? {rp: rp.id} : {}) : {type: "rows", data: {rows: part}});
  }
  for (const e of evs) rowApply(L, e);
  L.max = Object.assign(L.max, max);
  return rowAppend(L, evs);
}
function rowRestore(p, label, kind = "auto"){
  try{ return addRestore(p, {kind, label}) || arr(p.restore).slice(-1)[0] || null; }catch(e){ onAppError(e && e.message, "rows:restore"); return null; }
}
/** what happened since the events: decisions taken, changed or taken back become events (with who and why, when PT knows it) */
async function rowsPass(p){
  if (!p || !rowsOn()) return;
  const L = await rowsEnsure(p); if (!L || !L.ready) return;
  const q = WS.projects.find(x => x.id === p.id); if (!q || ROWS.L[q.id] !== L) return;
  p = q;
  const raw = rowsCompute(p), {out, max} = rowNumber(L, raw), hint = rowHintTake(p.id), evs = [], fresh = new Map();
  for (const r of raw){ const n = out.get(r.src); if (n.prov){ fresh.set(r.src, n.id); rowReg(L, r.src, n.id); } }
  L.max = Object.assign(L.max, max);
  const live = new Set();
  let used = false;
  for (const r of raw.slice().sort(rowOrder)){
    if (!r.decided) continue; live.add(r.src);
    const was = L.st.get(r.src), val = rowCut(r.val), chosen = rowCut(r.chosen);
    if (was && was.val === val) continue;
    const h = hint && (!hint.src || hint.src === r.src) ? hint : null, mine = !!(h && h.src === r.src);
    if (h) used = true;
    const e = {type: was ? "changed" : "taken", row: L.reg.get(r.src), src: r.src, by: h && h.by ? h.by : r.by || "owner",
      data: Object.assign({val, chosen, at: str(r.at), q: rowCut(r.question, 200)}, was ? {from: rowCut(was.chosen)} : {}, r.star ? {star: rowCut(r.star.label, 160)} : {}, mine && h.auto ? {auto: true, tier: h.tier || "auto"} : {})};
    if (h && h.cause) e.cause = h.cause;
    if (mine && h.rp) e.rp = h.rp;
    if (fresh.has(r.src)){ e.ids = [[r.src, fresh.get(r.src)]]; fresh.delete(r.src); }
    evs.push(e);
  }
  for (const [src, was] of L.st) if (!live.has(src)){ if (hint && hint.cause) used = true; evs.push(Object.assign({type: "undone", row: L.reg.get(src), src, by: "owner", data: {from: rowCut(was.chosen)}}, hint && hint.cause ? {cause: hint.cause} : {})); }
  if (hint && !used && !ROWS.hint.has(p.id)) ROWS.hint.set(p.id, hint);   // the change it announces has not happened yet (an AI step, a restore still loading): it waits for the next comparison
  const ids = [...fresh.entries()];
  for (let i = 0; i * 200 < ids.length; i++) evs.unshift({type: "rows", ids: ids.slice(i * 200, (i + 1) * 200)});
  for (const e of evs) rowApply(L, e);
  rowAppend(L, evs);
  if (evs.length && UI.rowsView === p.id && !RENDERING) render();
  rowsAutoPass(p);
}
function rowsSoon(p, ms = 400){
  if (!p || !p.id || !rowsOn()) return;
  clearTimeout(ROWS.timers.get(p.id));
  const ws = WS.id, pid = p.id;
  ROWS.timers.set(pid, setTimeout(() => { ROWS.timers.delete(pid); if (WS.id !== ws) return; const q = WS.projects.find(x => x.id === pid); if (q) rowsPass(q).catch(e => onAppError(e && e.message, "rows:pass")); }, ms));
}
/* who made the next change and why (set by the wrappers below just before the change; read by the next comparison) */
function rowHint(p, o){ if (p && p.id) ROWS.hint.set(p.id, Object.assign({}, o, {until: Date.now() + (o.ms || 5000)})); }
function rowHintTake(pid){ const h = ROWS.hint.get(pid); ROWS.hint.delete(pid); return h && h.until >= Date.now() ? h : null; }
/** the row a queue ref belongs to */
function rowSrcOfRef(p, ref){
  ref = str(ref);
  if (ref.startsWith("pick:") && typeof pickRead === "function"){ const k = pickRead(p), c = k.cards.find(x => x.id === ref.slice(5)), e = c && k.log.find(x => x.id === (c.replaces || c.late)); return e ? "pick:" + (e.cid || e.id) : ref; }
  if (ref === "mock"){ const m = typeof mockOf === "function" ? mockOf(p) : null; return m ? "mock:v" + m.v : ""; }
  return ref;
}
/** check the chain as it is stored: every hash recomputed, every parent found; a fork (two windows at once) is named, not counted as a change */
async function rowsVerify(p){
  const L = ROWS.L[p.id]; if (L && L.chain) await L.chain;
  if (typeof storeIdle === "function") await storeIdle(4000);
  const got = await rowLoad(p, projPath(p.id)), bad = [], forks = [], seen = new Set();
  let prev = null;
  for (const e of got.list){
    if (await rowHash(e) !== e.hash) bad.push({id: e.id, why: "hash"});
    const par = str(e.parent);
    if (prev ? par !== str(prev.hash) : par !== ""){ if (par && seen.has(par)) forks.push(e.id); else bad.push({id: e.id, why: "parent"}); }
    if (e.schemaVersion !== ROW_SCHEMA) bad.push({id: e.id, why: "schema"});
    seen.add(str(e.hash)); prev = e;
  }
  return {ok: bad.length === 0, n: got.list.length, bad, forks, at: now()};
}

/* ---------- 3. tiers: PT takes ★ by itself only where the owner said so ---------- */
function rowAutoOK(p, r){
  return !!r && r.status === "open" && !r.prov && r.tier === "auto" && (r.tierBy === "owner" || r.tierBy === "source") && r.baseTier !== "block"
    && !r.gate && !ROW_GATE_SRC.test(r.src) && !r.hard && !r.fact && !r.noAuto && !!r.star && !!r.ref;
}
async function rowsAutoPass(p){
  if (ROWS.busy || !rowsOn()) return;
  const r = rowsOf(p).find(x => rowAutoOK(p, x) && !ROWS.auto.has(p.id + "|" + x.src)); if (!r) return;
  ROWS.auto.add(p.id + "|" + r.src); ROWS.busy = true;
  try{ await rowsTakeStar(p, r, {auto: true}); }catch(e){ onAppError(e && e.message, "rows:auto"); }
  finally{ ROWS.busy = false; }
}
/** take a row's ★ the way the queue does, with a restore point first; the comparison then writes the event (by "★ taken") */
async function rowsTakeStar(p, r, {auto = false} = {}){
  const x = rowQueue(p).find(y => y.ref === r.ref && youOpen(y)); if (!x || /gate|proof|check|lens/.test(str(x.kind))) return false;
  const opts = qOptions(p, x), i = opts.findIndex(o => o.star && !o.opens); if (i < 0) return false;
  const rp = rowRestore(p, t("row.rp.auto", {x: rowCut(r.question, 60)}));
  rowHint(p, {by: "star-taken", src: r.src, rp: rp ? rp.id : "", auto, tier: r.tier, ms: 8000});
  await qDo(p, x, i);
  touch(p); render();
  toast(t("row.auto.done", {x: rowCut(opts[i].label, 80)}), "ok");
  const host = document.getElementById("toasts"), el = host && host.lastElementChild;
  if (el){ const b = document.createElement("button"); b.className = "btn xs"; b.dataset.undo = "rows:" + r.src; b.textContent = t("btn.undo1"); b.addEventListener("click", () => { el.remove(); rowsUndo(p, r.src); }); el.appendChild(document.createTextNode(" ")); el.appendChild(b); }
  return true;
}
async function rowsSetTier(p, src, tier){
  const L = await rowsEnsure(p); if (!L || !L.ready || !["auto", "notify", "block"].includes(tier)) return false;
  const r = rowsOf(p).find(x => x.src === src); if (!r || (tier === "auto" && (!r.autoOK || r.baseTier === "block" || r.gate))) return false;
  const e = {type: "tier", row: L.reg.get(src) || r.id, src, by: "owner", data: {tier}};
  rowApply(L, e); rowAppend(L, [e]); render(); rowsAutoPass(p);
  return true;
}
async function rowsSetDecline(p, src, text){
  const L = await rowsEnsure(p); if (!L || !L.ready) return false;
  const r = rowsOf(p).find(x => x.src === src); if (!r) return false;
  const e = {type: "decline", row: r.id, src, by: "owner", data: {text: rowCut(str(text).trim(), 400)}};
  rowApply(L, e); rowAppend(L, [e]); render();
  return true;
}

/* ---------- 4. undo of PT's step: its restore point + what a restore cannot take back ---------- */
function rowsCannot(p, L, e){
  const since = str(e.at), out = [];
  for (const x of arr(p.releases)) if (str(x.at) >= since) out.push({k: "release", text: t("row.undo.c.release", {v: x.v})});
  if (p.live && str(p.live.since) >= since) out.push({k: "live", text: t("row.undo.c.live", {v: p.live.v})});
  for (const x of arr(p.tool && p.tool.versions)) if (str(x.at) >= since) out.push({k: "page", text: t("row.undo.c.page", {v: x.version})});
  const jobs = arr(WS.jobs).filter(j => j && j.projectId === p.id && str(j.createdAt) >= since && j.status !== "notsent");
  if (jobs.length) out.push({k: "jobs", text: t("row.undo.c.jobs", {n: jobs.length})});
  out.push({k: "events", text: t("row.undo.c.events", {n: L.list.filter(x => x.id >= e.id).length})});
  out.push({k: "later", text: t("row.undo.c.later")});
  return out;
}
/** undo one of PT's steps (an event id, or the row it changed last): back to its restore point; returns what could not be taken back */
async function rowsUndo(p, key){
  const L = await rowsEnsure(p); if (!L || !L.ready) return null;
  clearTimeout(ROWS.timers.get(p.id)); await rowsPass(p); await L.chain;   // the step PT just took is in the log before it is looked up
  const e = L.list.find(x => x.id === key && x.rp) || L.list.slice().reverse().find(x => x.src === key && x.rp && x.type !== "undo");
  if (!e || !arr(p.restore).some(r => r.id === e.rp)){ toast(t("row.undo.none"), "err"); return null; }
  const cannot = rowsCannot(p, L, e);
  rowHint(p, {cause: "restore", ms: 20000});
  await doRestore(p, e.rp);
  const q = WS.projects.find(x => x.id === p.id) || p;
  const u = {type: "undo", row: e.row, src: e.src, by: "owner", rp: e.rp, data: {of: e.id, cannot: cannot.map(c => c.k)}};
  rowApply(L, u); rowAppend(L, [u]);
  UI.modal = {kind: "rowsundo", items: cannot.map(c => c.text)}; render();
  rowsSoon(q, 50);
  return cannot;
}
MODAL14.rowsundo = (m, p, hd) => { const head = t("row.undo.title"); return `${hd(head)}<p class="small">${esc(t("row.undo.cannot"))}</p><ul class="small">${arr(m.items).map(x => `<li>${esc(x)}</li>`).join("")}</ul><div class="row end"><button class="btn primary" data-a="modal-close">${esc(t("btn.close"))}</button></div>`; };

/* ---------- hooks into PT's existing decision and undo points (wrappers; nothing inside them changes) ---------- */
{ const orig = touch; touch = function(p){ const r = orig.apply(this, arguments); try{ rowsSoon(p); }catch(e){ onAppError(e && e.message, "rows:touch"); } return r; }; }
{ const orig = undoAct; undoAct = function(p, id){ rowHint(p, {cause: "undo"}); return orig.apply(this, arguments); }; }
{ const orig = doRestore; doRestore = function(p, rid){ const h = ROWS.hint.get(p && p.id); if (!(h && h.cause)) rowHint(p, {cause: "restore", ms: 20000}); return orig.apply(this, arguments); }; }
{ const orig = qDo; qDo = function(p, x, i){
    try{ const o = qOptions(p, x)[i], h = ROWS.hint.get(p.id); if (o && o.star && !o.opens && !(h && h.src && h.until >= Date.now())) rowHint(p, {by: "star-taken", src: rowSrcOfRef(p, x.ref)}); }catch(e){ onAppError(e && e.message, "rows:qDo"); }
    return orig.apply(this, arguments); }; }
{ const orig = pickTakeStars; pickTakeStars = function(p){ rowHint(p, {by: "star-batched", ms: 15000}); return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["batch-apply"]; ACTIONS["batch-apply"] = function(el){ const p = curP(); if (p) rowHint(p, {by: "star-batched"}); return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["fin-alllike"]; ACTIONS["fin-alllike"] = function(el){ const p = curP(); if (p) rowHint(p, {by: "star-batched"}); return orig.apply(this, arguments); }; }
{ const orig = openProject; openProject = function(id){
    UI.rowsView = null;
    const r = orig.apply(this, arguments), p = WS.projects.find(x => x.id === id);
    if (p && rowsOn()) rowsEnsure(p).then(L => { if (L && L.ready) rowsSoon(p, 60); });
    return r; }; }
{ const orig = openWorkspace; openWorkspace = function(){ for (const tm of ROWS.timers.values()) clearTimeout(tm); ROWS.timers.clear(); ROWS.L = {}; ROWS.hint.clear(); ROWS.chk = {}; UI.rowsView = null; return orig.apply(this, arguments); }; }

/* ---------- 5. the Decisions page: next to the cover and the seven pages ---------- */
{ const orig = pgBar; pgBar = function(p){
    let h = orig(p); const on = UI.rowsView === p.id;
    if (on) h = h.replace(/(class="sp-st [a-z]+ )here"/g, '$1"').replace(/aria-current="true"/g, 'aria-current="false"');
    const b = `<span class="sp-line"></span><button class="btn xs ghost sp-rows ${on ? "sel" : ""}" data-a="rows-open" aria-current="${on}">${ic("log")}<span>${esc(t("row.view"))}</span></button>`;
    return /<\/div><\/nav>$/.test(h) ? h.replace(/<\/div><\/nav>$/, b + "</div></nav>") : h + b; }; }
{ const orig = pgOpen; pgOpen = function(){ UI.rowsView = null; return orig.apply(this, arguments); }; }
{ const orig = goRef; goRef = function(){ UI.rowsView = null; return orig.apply(this, arguments); }; }
{ const orig = popNav; popNav = function(){ UI.rowsView = null; return orig.apply(this, arguments); }; }
{ const orig = ACTIONS["home"]; ACTIONS["home"] = function(){ UI.rowsView = null; return orig.apply(this, arguments); }; }
{ const orig = modeBody; modeBody = function(p){ return p && UI.rowsView === p.id ? rowsViewHTML(p) : orig(p); }; }
function rowByText(by){ return t("row.by." + str(by || "owner").replace("-", "")); }
function rowEvText(e){
  const d = e.data || {};
  switch (e.type){
    case "migrated": return t("ev.migrated", {n: arr(d.rows).length});
    case "started": return t("ev.started");
    case "rows": return t("ev.rows", {n: arr(e.ids).length + arr(d.rows).length});
    case "taken": return t(d.auto ? "ev.auto" : "ev.taken", {x: str(d.chosen)});
    case "changed": return t("ev.changed", {a: str(d.from), b: str(d.chosen)});
    case "undone": return t("ev.undone", {x: str(d.from)});
    case "tier": return t("ev.tier", {x: t("tier.r." + d.tier)});
    case "decline": return t("ev.decline", {x: str(d.text)});
    case "undo": return t("ev.undo", {n: arr(d.cannot).length});
  }
  return str(e.type);
}
function rowEvLine(p, e){
  const cause = e.cause ? " · " + t("ev.cause." + e.cause) : "", who = e.by && e.type !== "rows" ? " · " + rowByText(e.by) : "";
  const undo = e.rp && e.type === "taken" && e.data && e.data.auto ? `<button class="btn xs" data-a="rows-undo" data-ev="${esc(e.id)}">${ic("undo")}${esc(t("row.undo.btn"))}</button>` : "";
  return `<li class="small"><span class="muted">${esc(fmtDate(e.at))}</span> ${esc(rowEvText(e))}<span class="muted">${esc(who + cause)}</span> ${undo}</li>`;
}
function rowHistHTML(p, r){
  const L = ROWS.L[p.id], evs = L ? L.list.filter(e => e.src === r.src || arr(e.ids).some(x => x[0] === r.src) || arr(e.data && e.data.rows).some(x => x.src === r.src)) : [];
  return `<div class="row-hist" data-hist="${esc(r.id)}">${evs.length ? `<ul class="small">${evs.map(e => rowEvLine(p, e)).join("")}</ul>` : `<p class="small muted">${esc(t("row.hist.none"))}</p>`}</div>`;
}
function rowItemHTML(p, r){
  const d = r.decision, open = r.status === "open", L = ROWS.L[p.id];
  const tiers = ["auto", "notify", "block"].filter(x => x !== "auto" || r.autoOK);
  const tierCtl = r.baseTier === "block" || r.gate || !L || !L.ready ? `<span class="chip ${r.tier === "block" ? "warn" : ""}">${esc(t("tier.r." + r.tier))}</span>`
    : `<select data-a-change="rows-tier" data-src="${esc(r.src)}" aria-label="${esc(t("tier.r.label"))}">${tiers.map(x => `<option value="${x}" ${x === r.tier ? "selected" : ""}>${esc(t("tier.r." + x))}</option>`).join("")}</select>`;
  const notes = [r.gate ? t("row.gate") : "", r.fact ? t("row.fact") : "", r.reopen ? t("row.reopen") : "", r.tier === "block" && !r.gate ? t("tier.r.why.block") : ""].filter(Boolean);
  const starLine = r.star ? `<span class="small qstar">${esc(t("row.star", {x: r.star.label}))}${r.star.why ? " — " + esc(r.star.why) : ""}${r.star.conf ? " · " + esc(t("row.conf", {x: r.star.conf})) : ""}</span>` : "";
  const sup = d && d.superseded_by ? `<span class="small muted">${esc(t("row.replaced", {x: d.superseded_by}))}</span>` : "";
  const declined = d && d.by === "owner" && r.star && rowNorm(r.star.label) !== rowNorm(d.chosen);
  const decl = r.decline ? `<span class="small">${esc(t("row.decline", {x: r.decline}))}</span>` : "";
  const histOn = !!(UI.rowsHist && UI.rowsHist[r.src]);
  const acts = [open && r.ref ? `<button class="btn xs primary" data-a="q-goto" data-ref="${esc(r.ref)}">${esc(t("q.decide"))}</button>` : "",
    declined && L && L.ready ? `<button class="btn xs ghost" data-a="rows-decline" data-src="${esc(r.src)}">${esc(t("row.decline.add"))}</button>` : "",
    `<button class="btn xs ghost" data-a="rows-hist" data-src="${esc(r.src)}" aria-expanded="${histOn}">${ic("clock")}${esc(t("row.hist"))}</button>`].join("");
  return `<div class="item row18 ${esc(r.status)}" data-row="${esc(r.id)}" data-src="${esc(r.src)}">${stSlot(open ? (r.tier === "block" ? "bad" : "warn") : r.status === "superseded" ? "todo" : d.by === "owner" ? "ok" : "as")}
    <div class="body"><div class="row"><span class="mono small">${esc(r.id)}</span><b style="flex:1 1 14em">${esc(r.question)}</b>${tierCtl}</div>
      ${d ? `<span class="small">→ ${clampHTML(d.chosen, "row:" + r.src, {lines: 2})} <span class="muted">· ${esc(rowByText(d.by))}${d.at ? " · " + esc(fmtDate(d.at)) : ""}</span></span>` : ""}
      ${starLine}${sup}${decl}${notes.length ? `<span class="small muted">${esc(notes.join(" · "))}</span>` : ""}
      ${histOn ? rowHistHTML(p, r) : ""}</div>
    <div class="qacts">${acts}</div></div>`;
}
/** the Decisions page: the page bar, a heading, the list (the list alone is rowsBodyHTML, for a drawer tab later) */
function rowsViewHTML(p){
  return `<div class="pg rows-view" data-page="rows" data-anchor="page-rows">${pgBar(p)}<header class="pg-head"><h2>${ic("log")} ${esc(t("row.view"))}</h2></header>${rowsBodyHTML(p)}</div>`;
}
function rowsBodyHTML(p){
  const L = ROWS.L[p.id], wrap = body => body;
  if (!L || !L.ready){
    if (rowsOn() && (!L || (!L.loading && !L.failed))) rowsEnsure(p).then(() => { if (UI.rowsView === p.id) render(); });
    return wrap(L && L.failed ? `<p class="small">${esc(t("row.loadfail"))}</p><div class="row"><button class="btn sm" data-a="rows-retry">${esc(t("row.retry"))}</button></div>` : `<p class="small muted">${esc(t("row.loading"))}</p>`);
  }
  const rows = rowsOf(p).sort(rowIdOrder), open = rows.filter(r => r.status === "open"), done = rows.filter(r => r.status !== "open");
  const ck = ROWS.chk[p.id];
  if (!ck){ ROWS.chk[p.id] = {wait: true}; rowsVerify(p).then(res => { ROWS.chk[p.id] = res; if (UI.rowsView === p.id) render(); }).catch(e => { ROWS.chk[p.id] = {ok: false, n: 0, bad: [{why: "read"}], forks: []}; console.warn("rows verify", e); if (UI.rowsView === p.id) render(); }); }
  const chain = !ck || ck.wait ? `<span class="small muted">${esc(t("row.chain.wait"))}</span>`
    : `<span class="small ${ck.ok ? "" : "warn-t"}">${esc(ck.ok ? t("row.chain.ok", {n: ck.n}) : t("row.chain.bad", {n: arr(ck.bad).length}))}${arr(ck.forks).length ? " " + esc(t("row.chain.fork", {n: ck.forks.length})) : ""}</span><button class="btn xs ghost" data-a="rows-verify">${esc(t("row.chain.again"))}</button>`;
  const recent = L.list.slice(-12).reverse();
  return wrap(`<p class="small muted">${esc(t("row.view.sub"))}</p><p class="small muted">${esc(t("row.legend"))}</p>
    <div class="row rows-chain">${stSlot(!ck || ck.wait ? "todo" : ck.ok ? "ok" : "bad")}${chain}</div>
    ${rows.length ? "" : `<p class="small muted">${esc(t("row.empty"))}</p>`}
    ${open.length ? `<section class="panel rows-open"><h3>${esc(t("row.open"))} · ${open.length}</h3><div class="list">${open.map(r => rowItemHTML(p, r)).join("")}</div></section>` : ""}
    ${done.length ? `<section class="panel rows-done"><h3>${esc(t("row.decided"))} · ${done.length}</h3><div class="list">${done.map(r => rowItemHTML(p, r)).join("")}</div></section>` : ""}
    ${recent.length ? `<details class="rows-recent"><summary class="small">${esc(t("row.recent", {n: L.list.length}))}</summary><ul class="small">${recent.map(e => rowEvLine(p, e).replace("<li class=\"small\">", `<li class="small"><span class="mono">${esc(e.row || "")}</span> `)).join("")}</ul></details>` : ""}`);
}
Object.assign(ACTIONS, {
  "rows-open": () => { const p = curP(); if (!p) return; pushNav(); UI.rowsView = p.id; UI.home = false; UI.finish = null; delete ROWS.chk[p.id]; render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0; },
  "rows-hist": el => { UI.rowsHist = UI.rowsHist || {}; const k = str(el.dataset.src); UI.rowsHist[k] = !UI.rowsHist[k]; render(); },
  "rows-verify": () => { const p = curP(); if (!p) return; delete ROWS.chk[p.id]; render(); },
  "rows-retry": () => { const p = curP(); if (!p) return; delete ROWS.L[p.id]; render(); },
  "rows-decline": el => { const p = curP(); if (!p) return; const src = str(el.dataset.src); const r = rowsOf(p).find(x => x.src === src);
    promptBox(t("row.decline.add"), {value: r ? r.decline : "", ph: t("row.decline.ph"), yes: t("btn.save")}, v => { if (str(v).trim()) rowsSetDecline(p, src, v); }); },
  "rows-undo": el => { const p = curP(); if (!p) return; const id = str(el.dataset.ev); confirmBox(t("row.undo.btn"), t("row.undo.q"), t("btn.undo1"), () => { rowsUndo(p, id); }); }
});
for (const a of ["rows-open", "rows-hist", "rows-verify", "rows-retry", "rows-decline", "rows-undo"]) ACT_NO.add(a);
Object.assign(CHANGES, {
  "rows-tier": el => { const p = curP(); if (p) rowsSetTier(p, str(el.dataset.src), str(el.value)).then(ok => { if (!ok) render(); }); }
});
