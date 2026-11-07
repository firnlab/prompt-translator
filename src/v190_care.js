/* ===================== 1.9 care: the owner's reminders R1, R2, R3, R5, R7 (PLAN-1.9 "E", decided 1 Nov 2026) =====================
   R1a  A full export every three months: PT records the time of every successful full export (per workspace); the Sunday note and one
        Inbox line say "Save a full export" while the last one is older than 90 days (or there is none), with the button that starts it.
   R1b  Outside claude.ai (no runtime at all: the built file opened in a plain browser) PT is a read-only viewer: "Open an export", the
        projects and each project's main content, no AI, no runs, no publishing, nothing written anywhere. Inside claude.ai nothing changes.
        Check: test/plain_browser.py (a gate suite).
   R2   "How customers get AI" for a customer tool with AI at run time (a direction-E row, waits for the owner): code only (★ where fixed
        rules can do the AI parts) · each customer's own Claude login (today's way) · a server-backed key (a small server + a key that may
        serve only this tool) with its cost as a monthly range and a REQUIRED hard monthly limit. Choosing it records the decision and adds
        the owner's steps (provider key with a spending limit, GitHub's secret store only, hosting) to that tool's build steps. Built only
        for that tool; nothing automatic; PT pays nothing.
   R3   A monthly ceiling for PT's own AI calls: from the first Sunday note on or after 1 Feb 2027, once 60 days of counts exist, the note
        proposes average × 1.25 rounded up (with the figures); Use this · Change · Not now (asks again next week). Stored per workspace
        (WS.settings.aiCeiling). Above it autoOK() is false and no automatic AI call runs; an AI step the owner starts asks once a day
        (in the page, never answered by itself). Health › Economy and the note say so.
   R5   Settings: "Push to my phone when something needs me", off by default, the owner's login only, never in a preview copy. The
        service cannot change notifications on an existing task, so "on" = a NEW Sunday task (Runner.create, push, same cron, a prompt with
        the noteworthy-only rule), the old one paused, both ids kept; "off" = the reverse. PT never deletes a scheduled task; Health lists
        the paused ones the owner may delete in claude.ai. With the Sunday run off the switch is only stored and applied when it is turned on.
   R7   From 4 Oct 2027 the Sunday note shows "Renew 2 keys" every week until ticked done (then again 11 months later), with the steps
        click by click. The owner's login only. PT never shows, asks for or stores a key. From 1.9.4 each key goes into
        prompt-translator and into the build repository (buildRepo(), firnlab/tools by default) before the next is copied. */
const CARE19 = {full: false, gesture: 0, chain: 0, chainEnd: 0, stopped: 0, ask: null, month: null, mLoading: null, mTried: 0, sent: null, pushBusy: false};
const CARE19_EXP_DAYS = 90, CARE19_CEIL_FROM = "2027-02-01", CARE19_CEIL_MIN_DAYS = 60, CARE19_CEIL_MARGIN = 1.25, CARE19_KEYS_FROM = "2027-10-04", CARE19_KEYS_MONTHS = 11;
const CARE19_GESTURE_MS = 6000, CARE19_CHAIN_MS = 4000;   // a call that starts this soon after your click (or inside a chain of calls you started) is yours

/* ---------- small helpers ---------- */
function care19On(){ return typeof run18On === "function" && run18On(); }
function care19Day(ms = Date.now()){ const z = run18Parts(ms); return z.y + "-" + run18Pad(z.m) + "-" + run18Pad(z.d); }   // the Zürich calendar day
function care19DayAdd(day, n){ const d = new Date(day + "T12:00:00"); d.setDate(d.getDate() + n); return metDay(d); }
function care19DayList(from, to){ const out = []; for (let d = from, i = 0; d <= to && i < 400; d = care19DayAdd(d, 1), i++) out.push(d); return out; }
function care19AddMonths(day, n){ const [y, m, d] = str(day).slice(0, 10).split("-").map(Number); const x = new Date(Date.UTC(y, m - 1 + n, d)); return x.toISOString().slice(0, 10); }
function care19NextMonth(){ const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1, 12).toISOString(); }
function care19Month(ym){ try{ return new Date(ym + "-15T12:00:00Z").toLocaleDateString(LANG === "de" ? "de-CH" : LANG === "zh" ? "zh-CN" : "en-GB", {month: "short", year: "numeric"}); }catch(e){ return ym; } }   // ok:catch an odd month shows as written
function care19Latest(n){ const L = typeof wk18Sorted === "function" ? wk18Sorted() : []; return !!(n && L.length && L[0].key === n.key); }

/* ===================== R1a · a full export every three months ===================== */
function care19ExpLast(){ const e = WS && WS.settings && WS.settings.exp19; return e ? str(e.last) : ""; }
function care19ExpDue(ms = Date.now()){ const l = care19ExpLast(); if (!l) return true; const x = Date.parse(l); return isNaN(x) || ms - x > CARE19_EXP_DAYS * RUN18_DAY; }
function care19Exported(){
  if (!WS || !WS.settings) return;
  const was = care19ExpDue(), e = WS.settings.exp19 || {};
  WS.settings.exp19 = {last: now(), n: num(e.n, 0) + 1}; saveWs();
  if (was) setTimeout(() => toast(t("care.exp.saved"), "ok"), 0);
  render();
}
/* the full export (Settings › Data & backup, the yearly restore check, the lines below) is recorded once its file was handed over */
{ const orig = saveFile; saveFile = function(filename, data){ const full = CARE19.full; CARE19.full = false; const r = orig.apply(this, arguments); if (full) Promise.resolve(r).then(ok => { if (ok === true) care19Exported(); }, () => null); return r; }; }
{ const orig = ACTIONS["export-ws"]; ACTIONS["export-ws"] = function(){ CARE19.full = true; try{ return orig.apply(this, arguments); } finally { CARE19.full = false; } }; }
function care19ExpHTML(cls){
  const l = care19ExpLast();
  return `<div class="item care19-exp ${cls}">${stSlot("attn")}<div class="body"><b class="small">${esc(t("care.exp.t"))}</b><span class="small">${esc(l ? t("care.exp.old", {d: fmtDay(l)}) : t("care.exp.never"))}</span><span class="small muted">${esc(t("care.exp.how"))}</span></div><div class="qacts"><button class="btn xs primary" data-a="export-ws">${ic("dl")}${esc(t("care.exp.btn"))}</button></div></div>`;
}
/* one line in the Inbox (next to the Sunday-run switch) while the export is due */
{ const orig = wk18SwitchHTML; wk18SwitchHTML = function(){ const h = orig.apply(this, arguments); let mine = ""; try{ if (care19On() && care19ExpDue()) mine = care19ExpHTML("care19-ib"); }catch(e){ onAppError(e && e.message, "care19:inbox"); } return h + mine; }; }

/* ===================== R7 · renew the two keys (in prompt-translator and the build repository, 1.9.4) ===================== */
function care19KeysDue(ms = Date.now()){
  if (!Store.isOwner || typeof META === "undefined" || !META) return false;
  const day = care19Day(ms); if (day < CARE19_KEYS_FROM) return false;
  const done = str(META.keys19 && META.keys19.done); if (!done) return true;
  return day >= care19AddMonths(done, CARE19_KEYS_MONTHS);
}
const CARE19_LINKS = {env: "https://github.com/firnlab/prompt-translator/settings/environments", pat: "https://github.com/settings/personal-access-tokens", act: "https://github.com/firnlab/prompt-translator/settings/secrets/actions"};
/* cause 76: the build repository keeps its own copy of both keys; its settings page follows Settings › General (kit defaults) */
function care19Link(k){ return k === "tact" ? `https://github.com/${encodeURI(buildRepo())}/settings/secrets/actions` : CARE19_LINKS[k]; }
const CARE19_KEY_STEPS = {a: ["a1", "a2", "a3", "a4", "a5", "a6"], b: ["b1", "b2", "b3", "b4", "b5"]};
function care19KeysText(){ const r = {r: buildRepo()}; return t("care.keys.sub", r) + " " + CARE19_KEY_STEPS.a.concat(CARE19_KEY_STEPS.b).map(k => t("care.keys." + k, r)).join(" "); }
function care19KeysHTML(){
  const r = {r: buildRepo()}, li = k => `<li>${esc(t("care.keys." + k, r))}</li>`, a = (k, l) => `<a class="chip tap" href="${esc(care19Link(k))}" target="_blank" rel="noopener">${ic("link")}${esc(t("care.keys.l." + l, r))}</a>`;
  return `<div class="item care19-keys">${stSlot("attn")}<div class="body"><b class="small">${ic("shield")} ${esc(t("care.keys.t"))}</b><span class="small">${esc(t("care.keys.sub", r))}</span>
    <b class="small">${esc(t("care.keys.a"))}</b><ol class="small care19-steps">${CARE19_KEY_STEPS.a.map(li).join("")}</ol><div class="row">${a("env", "env")}${a("tact", "tact")}</div>
    <b class="small">${esc(t("care.keys.b"))}</b><ol class="small care19-steps">${CARE19_KEY_STEPS.b.map(li).join("")}</ol><div class="row">${a("pat", "pat")}${a("act", "act")}${a("tact", "tact")}</div>
    <span class="small muted">${esc(t("care.keys.never"))}</span></div><div class="qacts"><button class="btn xs primary" data-a="care19-keys-done">${ic("check")}${esc(t("care.keys.done"))}</button></div></div>`;
}

/* ===================== R3 · the monthly ceiling for PT's AI calls ===================== */
function care19Ceil(){ const C = WS && WS.settings && WS.settings.aiCeiling; return C && Math.floor(num(C.calls, 0)) >= 1 ? C : null; }
/** {day: AI calls} for the days in [from, to] that have counts (Health's day documents <ws>/health18-<day>/<tab>); finished days are
    kept in <ws>/care19/aidays (−1 = no counts that day) so a day is listed once. Today: this page's own count is left out (it is live). */
async function care19Scan(from, to){
  if (!care19On()) return null;
  const ws = WS.id, base = wsPath(), today = metDay(), keepTo = care19DayAdd(today, -2), path = base + "/care19/aidays";
  let C = null; try{ C = await Store.get(path); }catch(e){ C = null; }   // ok:catch no cache: every day is listed again
  C = Object.assign({v: 1, days: {}}, C && typeof C === "object" ? C : {}); C.days = Object.assign({}, C.days);
  if (WS.id !== ws) return null;
  const out = {}, need = [];
  for (const d of care19DayList(from, to)){ const v = C.days[d]; if (v !== undefined && d <= keepTo){ if (num(v, -1) >= 0) out[d] = num(v, 0); } else need.push(d); }
  let changed = false;
  for (let i = 0; i < need.length && i < 400; i += 20){
    const part = need.slice(i, i + 20), L = await Promise.all(part.map(d => Store.list(base + "/health18-" + d).catch(() => null)));
    if (WS.id !== ws) return null;
    part.forEach((d, j) => {
      if (!Array.isArray(L[j])) return;   // not readable now: asked again next time, never cached
      const docs = L[j].filter(x => x && x.ai && !(d === today && x.id === TAB_ID));
      if (docs.length) out[d] = docs.reduce((s, x) => s + num(x.ai.calls, 0), 0);
      if (d <= keepTo){ C.days[d] = docs.length ? out[d] : -1; changed = true; }
    });
  }
  if (changed){ const keys = Object.keys(C.days).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete C.days[k]; Store.put(path, C); }
  return out;
}
/** this month's counted AI calls: the stored days of this month + this page's live count */
async function care19MonthLoad(){
  if (!care19On() || !care19Ceil()) return;
  if (CARE19.mLoading) return CARE19.mLoading;
  const ws = WS.id, today = metDay(), ym = today.slice(0, 7);
  CARE19.mTried = Date.now();
  CARE19.mLoading = (async () => {
    try{ const D = await care19Scan(ym + "-01", today); if (!D || WS.id !== ws) return; CARE19.month = {ws, ym, today, base: Object.values(D).reduce((s, n) => s + n, 0), at: Date.now()}; }
    catch(e){ onAppError(e && e.message, "care19:month"); }
    finally{ CARE19.mLoading = null; }
  })();
  return CARE19.mLoading;
}
function care19MonthCalls(){
  const M = CARE19.month, today = metDay();
  if (!M || !WS || M.ws !== WS.id || M.ym !== today.slice(0, 7)){ if (Date.now() - CARE19.mTried > 60000) care19MonthLoad(); return null; }
  if (M.today !== today && Date.now() - CARE19.mTried > 60000) care19MonthLoad();
  const d = typeof HR18 !== "undefined" ? HR18.doc : null, live = d && d.ws === WS.id && d.day === M.today ? num(d.ai && d.ai.calls, 0) : 0;
  return M.base + live;
}
function care19Over(){ const C = care19Ceil(); if (!C) return false; const m = care19MonthCalls(); return m != null && m >= Math.floor(num(C.calls, 0)); }
/** rounded up to two significant digits (at least to the next ten): 381 → 390, 1234 → 1300 */
function care19Round(x){ if (!(x > 0)) return 10; const m = Math.pow(10, Math.max(1, Math.floor(Math.log10(x)) - 1)); return Math.ceil(x / m - 1e-9) * m; }
/** the proposal for the note of Sunday <key>: from 1 Feb 2027, the owner's login, no ceiling yet, ≥ 60 days of counts */
async function care19Proposal(key){
  if (!Store.isOwner || str(key) < CARE19_CEIL_FROM || care19Ceil()) return null;
  const end = care19DayAdd(key, -1), D = await care19Scan(care19DayAdd(key, -120), end); if (!D) return null;
  const ds = Object.keys(D).sort(); if (!ds.length) return null;
  const first = ds[0], days = care19DayList(first, end).length; if (days < CARE19_CEIL_MIN_DAYS) return null;
  const total = ds.reduce((s, d) => s + D[d], 0), avg = total / days * 30.44, months = {};
  for (const d of care19DayList(first, end)){ const m = d.slice(0, 7), x = months[m] = months[m] || {ym: m, calls: 0, days: 0}; x.days++; x.calls += num(D[d], 0); }
  return {first, last: end, days, total, avg: Math.round(avg), margin: CARE19_CEIL_MARGIN, calls: care19Round(avg * CARE19_CEIL_MARGIN), months: Object.values(months), at: now()};
}
function care19SetCeil(n, by){
  const v = Math.floor(num(n, 0)); if (!(v >= 1)){ toast(t("care.ceil.bad"), "err"); return false; }
  WS.settings.aiCeiling = {calls: v, setAt: now(), by}; saveWs();
  CARE19.month = null; CARE19.mTried = 0; care19MonthLoad().then(() => render());
  toast(t("care.ceil.saved", {n: v}), "ok"); render(); return true;
}
function care19CeilHTML(n){
  const P = n && n.care19 && n.care19.ceil;
  if (!P || !Store.isOwner || care19Ceil() || str((WS.settings.care19 || {}).ceilLater) === n.key) return "";
  const list = arr(P.months).map(m => care19Month(m.ym) + " " + num(m.calls, 0)).join(" · ");
  return `<div class="item care19-ceil">${stSlot("attn")}<div class="body"><b class="small">${esc(t("care.ceil.t"))}</b><span class="small">${esc(t("care.ceil.prop", {n: num(P.calls, 0), d: fmtDay(P.first), a: num(P.avg, 0)}))}</span><span class="small muted">${esc(t("care.ceil.fig", {list, t: num(P.total, 0), days: num(P.days, 0)}))}</span><span class="small muted">${esc(t("care.ceil.what"))}</span>
    <div class="row care19-acts"><button class="btn xs primary" data-a="care19-ceil-use" data-n="${num(P.calls, 0)}">${esc(t("care.ceil.use"))}</button><label class="care19-num"><span class="small">${esc(t("care.ceil.num"))}</span><input type="number" min="1" step="1" inputmode="numeric" value="${num(P.calls, 0)}"></label><button class="btn xs" data-a="care19-ceil-set">${esc(t("care.ceil.change"))}</button><button class="btn xs ghost" data-a="care19-ceil-later" data-key="${esc(n.key)}">${esc(t("care.ceil.later"))}</button></div></div></div>`;
}
function care19OverHTML(){
  const C = care19Ceil(); if (!C || !care19Over()) return "";
  return `<div class="item care19-over">${stSlot("warn")}<div class="body"><span class="small">${esc(t("care.ceil.over", {m: care19MonthCalls(), n: Math.floor(num(C.calls, 0)), d: fmtDay(care19NextMonth())}))}</span></div></div>`;
}
/* the enforcement: no automatic AI work above the ceiling */
{ const orig = autoOK; autoOK = function(){ return orig.apply(this, arguments) && !care19Over(); }; }
{ const orig = drill18OnOpen; drill18OnOpen = async function(){ if (care19Over()) return 0; return orig.apply(this, arguments); }; }
{ const orig = lfu18All; lfu18All = async function(){ if (care19Over()) return; return orig.apply(this, arguments); }; }
/* your clicks, keys and forms: an AI call that starts right after one (or inside a chain of calls that one started) is yours */
for (const ev of ["pointerdown", "keydown", "submit"]) document.addEventListener(ev, e => { if (e.isTrusted && !(e.target && e.target.closest && e.target.closest(".care19-ask"))) CARE19.gesture = Date.now(); }, {capture: true, passive: true});
function care19Manual(){ const n = Date.now(); return n - CARE19.gesture < CARE19_GESTURE_MS || CARE19.chain > 0 || n < CARE19.chainEnd; }
/** above the ceiling an AI step you start asks once a day: an in-page question, never answered by itself */
function care19Ask(){
  const C = care19Ceil(); if (!C || str(C.okDay) === metDay()) return Promise.resolve(true);
  if (CARE19.ask) return CARE19.ask;
  CARE19.ask = new Promise(res => {
    const ov = document.createElement("div"); ov.className = "overlay care19-ask";
    ov.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="care19-ask-h" aria-describedby="care19-ask-p"><h2 id="care19-ask-h">${esc(t("care.ask.t"))}</h2><p id="care19-ask-p">${esc(t("care.ask.p", {m: num(care19MonthCalls(), 0), n: Math.floor(num(C.calls, 0)), d: fmtDay(care19NextMonth())}))}</p>
      <div class="row end"><button type="button" class="btn" data-c19="no">${esc(t("care.ceil.later"))}</button><button type="button" class="btn primary" data-c19="yes">${ic("play")}${esc(t("care.ask.yes"))}</button></div></div>`;
    const key = e => { if (e.key === "Escape" && !e.isComposing){ e.preventDefault(); e.stopPropagation(); done(false); } };
    const done = yes => {
      ov.remove(); document.removeEventListener("keydown", key, true); document.removeEventListener("focusin", trap, true);
      if (yes){ const c = care19Ceil(); if (c){ WS.settings.aiCeiling = Object.assign({}, c, {okDay: metDay(), okAt: now()}); saveWs(); } }
      else toast(t("care.ask.skipped"), "");
      res(yes);
    };
    ov.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-c19]"); if (b) done(b.dataset.c19 === "yes"); });
    const trap = e => { if (ov.isConnected && e.target && !ov.contains(e.target)) setTimeout(focusNo, 0); };   // a modal question: the focus stays in it
    document.addEventListener("focusin", trap, true);
    document.addEventListener("keydown", key, true);   // ok:keys only Escape, which answers this question with "Not now" (composition is checked in key)
    document.body.appendChild(ov);
    const no = ov.querySelector('[data-c19="no"]'), focusNo = () => { if (no && ov.isConnected && !ov.contains(document.activeElement)) no.focus(); };
    focusNo(); setTimeout(focusNo, 0); setTimeout(focusNo, 120);   // the safe answer has the focus (a render right after may move it once)
  }).finally(() => { CARE19.ask = null; });
  return CARE19.ask;
}
/** every AI call passes here (outside Health's counting, so a stopped call is not counted) */
function care19WrapSample(s){
  const run = async (fn, input, opts) => {
    const manual = care19Manual();
    if (care19Over()){
      if (!manual){ CARE19.stopped++; throw {code: "cancelled"}; }   // automatic AI work stops above the ceiling (runAI and sampleWith end quietly)
      if (!(await care19Ask())) throw {code: "cancelled"};
    }
    if (manual) CARE19.chain++;
    try{ return await fn.call(s, input, opts); }
    finally{ if (manual){ CARE19.chain--; CARE19.chainEnd = Date.now() + CARE19_CHAIN_MS; } }
  };
  const w = function(input, opts){ return run(s, input, opts); };
  w.json = function(input, opts){ return run(s.json, input, opts); };
  for (const k of Object.keys(s)) if (!(k in w)) w[k] = typeof s[k] === "function" ? (...a) => s[k](...a) : s[k];
  return w;
}
{ const orig = getSample; let base = null, wrapped = null;
  getSample = async function(){ const s = await orig.apply(this, arguments); if (!s || typeof s !== "function") return s; if (s !== base){ base = s; wrapped = care19WrapSample(s); } return wrapped; }; }
/* Health › Economy says it: the ceiling, this month's count, and when it is reached (a red needs a second signal, as everywhere) */
{ const orig = hr18Economy; hr18Economy = function(){
    const r = orig.apply(this, arguments);
    try{
      const C = care19Ceil();
      if (!C){ r.extra = str(r.extra) + `<p class="small muted care19-econ">${esc(t("care.ceil.none"))}</p>`; return r; }
      const m = care19MonthCalls(), n = Math.floor(num(C.calls, 0)), over = care19Over();
      r.signals = arr(r.signals).concat([{id: "ceiling", bad: over, nm: m == null, text: t("care.ceil.sig", {m: m == null ? "…" : m, n})}]);
      r.extra = str(r.extra) + `<div class="stack care19-econ" style="gap:4px"><p class="small">${esc(t("care.ceil.now", {n, d: fmtDay(C.setAt), m: m == null ? "…" : m}))} <button class="btn xs ghost" data-a="care19-ceil-edit">${esc(t("care.ceil.change"))}</button></p>${over ? `<p class="small warn-t">${esc(t("care.ceil.over", {m, n, d: fmtDay(care19NextMonth())}))}</p>` : ""}${CARE19.stopped ? `<p class="small muted">${esc(t("care.ceil.stopped", {n: CARE19.stopped}))}</p>` : ""}</div>`;
    }catch(e){ onAppError(e && e.message, "care19:economy"); }
    return r; }; }

/* ===================== R5 · push to the phone when something needs the owner ===================== */
function care19PushOn(){ return !!(WS && WS.settings && WS.settings.push19 && WS.settings.push19.on); }
const CARE19_NOTEWORTHY = `Push to the owner's phone: this task has push notifications on, so say plainly whether this run needs the owner. A run is noteworthy ONLY when (a) the spec's inputs.failing lists a live tool that failed, or (b) a drill you ran in this run found an attack its package does not defend (an open attack). Then, just before the last two lines, write one line per item that starts with "NEEDS YOU:" and names the tool and what happened, in plain words. Every other run is routine: write exactly "Nothing noteworthy: a routine run." just before the last two lines, and nothing that sounds urgent.`;
function care19PushPrompt(coll){ return wk18Prompt(coll).replace("\nEnd your reply with two lines:", "\n" + CARE19_NOTEWORTHY + "\nEnd your reply with two lines:"); }
/* the spec the Sunday run reads names the live tools that failed (only while push is on; it is data for the noteworthy rule) */
{ const orig = wk18Spec; wk18Spec = function(){
    const s = orig.apply(this, arguments);
    try{ if (care19PushOn() && s && s.inputs) s.inputs.failing = run18Projects().filter(p => p.live && typeof hr18Failing === "function" && hr18Failing(p)).map(p => ({tool: p.id, name: str(p.name), why: "a failed job or update in the last 7 days"})).slice(0, 40); }
    catch(e){ onAppError(e && e.message, "care19:spec"); }
    return s; }; }
/* what PT sent to create a task (the service may have refused push, and Runner.create then tried again without it) */
{ const orig = Runner.call; Runner.call = async function(tool, input){ if (tool === "create_trigger") CARE19.sent = input; return orig.apply(this, arguments); }; }   // ok:preview  it only records what Runner.create sends; create() stops a preview copy
function care19Gone(e){ return !!(e && e.code === "tool_error" && /not.?found|no such|does not exist|unknown trigger|404/i.test(str(e.message))); }
/** make the Sunday task of the wanted kind the active one (push or not): take the kept one or create a new one, then pause the other.
    PT never deletes a task. Returns {id} or {refused: true} when the service would not take push (that new task stays paused). */
async function care19Switch(want){
  if (PT_PREVIEW) throw {code: "preview_blocked"};
  const r = Object.assign({}, WS.settings.wkRun), coll = wk18Coll(), cur = str(r.id);
  if (cur){ if (r.push) r.pushId = cur; else r.plainId = cur; }
  const keep = str(want ? r.pushId : r.plainId);
  let id = "";
  if (keep && keep !== cur){ try{ await Runner.setEnabled(keep, true); id = keep; }catch(e){ if (!care19Gone(e)) throw e; } }   // a task the owner deleted is made again
  if (!id){
    CARE19.sent = null;
    const c = await Runner.create({name: want ? WK18_NAME + " · push" : WK18_NAME, cron_expression: WK18_CRON, prompt: want ? care19PushPrompt(coll) : wk18Prompt(coll), initiation: "human_request", notifications: want ? {push: true} : {}});
    const tr = c && (c.trigger || c.data || c), nid = str(tr && (tr.id || tr.trigger_id)); if (!nid) throw {code: "upstream_error"};
    const sent = CARE19.sent || {};
    if (want && !(sent.notifications && sent.notifications.push === true && sent.create_new_session_on_fire === true)){
      try{ await Runner.setEnabled(nid, false); }catch(e){ onAppError(e && e.message, "care19:pause-refused"); }
      WS.settings.wkRun = Object.assign({}, WS.settings.wkRun, {refused: [...arr((WS.settings.wkRun || {}).refused), nid].slice(-10)}); saveWs();
      return {refused: true, id: nid};
    }
    id = nid;
  }
  if (cur && cur !== id){ try{ await Runner.setEnabled(cur, false); }catch(e){ try{ await Runner.setEnabled(id, false); }catch(e2){ onAppError(e2 && e2.message, "care19:pause-new"); } throw e; } }
  WS.settings.wkRun = Object.assign({}, WS.settings.wkRun, {id, push: want, pushId: want ? id : str(r.pushId), plainId: want ? str(r.plainId) : id}); saveWs();
  return {id};
}
/** the switch in Settings: stored per workspace; applied at once while the Sunday run is on */
async function care19PushSet(want){
  if (PT_PREVIEW){ toast(t("pv.blocked"), "err"); return false; }
  if (!Store.isOwner || Store.mode !== "cloud"){ toast(t("wk.sw.owner"), "err"); return false; }
  if (CARE19.pushBusy) return false;
  CARE19.pushBusy = true;
  const prev = WS.settings.push19 ? Object.assign({}, WS.settings.push19) : null;
  try{
    WS.settings.push19 = {on: !!want, at: now()}; saveWs();
    const r = WS.settings.wkRun || {};
    if (!r.on || !r.id){ toast(t("care.push.waits"), "ok"); return true; }
    if (!!r.push === !!want) return true;
    const res = await care19Switch(!!want);
    if (res.refused){ WS.settings.push19 = {on: false, at: now(), refused: now()}; saveWs(); toast(t("care.push.refused"), "err"); return false; }
    toast(t(want ? "care.push.done.on" : "care.push.done.off") + (want ? " " + t("sched.approve") : ""), "ok");
    return true;
  }catch(e){ if (prev) WS.settings.push19 = prev; else delete WS.settings.push19; saveWs(); throw e; }
  finally{ CARE19.pushBusy = false; }
}
/* turning the Sunday run on applies the stored switch (1.8's way stays exactly as it was while push was never used) */
{ const orig = wk18SwitchOn; wk18SwitchOn = async function(){
    const want = care19PushOn(), r0 = WS.settings.wkRun || {};
    if (!want && !r0.push) return orig.apply(this, arguments);
    if (PT_PREVIEW){ toast(t("pv.blocked"), "err"); return false; }
    if (!Store.isOwner || Store.mode !== "cloud"){ toast(t("wk.sw.owner"), "err"); return false; }
    await Store.putNow(wk18Coll() + "/spec", wk18Spec());
    if (r0.id && !!r0.push === want) await Runner.setEnabled(r0.id, true);
    else {
      const res = await care19Switch(want);
      if (res.refused){
        WS.settings.push19 = {on: false, at: now(), refused: now()}; saveWs(); toast(t("care.push.refused"), "err");
        const r1 = WS.settings.wkRun || {};
        if (!r1.id) return orig.apply(this, arguments);   // nothing to go back to: the Sunday run as in 1.8
        await Runner.setEnabled(r1.id, true);
      }
    }
    WS.settings.wkRun = Object.assign({}, WS.settings.wkRun, {on: true, at: now()}); saveWs();
    return true; }; }
function care19PushHTML(){
  if (!Store.isOwner || Store.mode !== "cloud") return "";
  const on = care19PushOn(), r = WS.settings.wkRun || {};
  const note = PT_PREVIEW ? t("care.push.preview") : on && !r.on ? t("care.push.runoff") : "";
  return `<div class="stack care19-push" data-push="${on ? "on" : "off"}"><h3>${esc(t("care.push.t"))}</h3><p class="small muted">${esc(t("care.push.what"))}</p>
    <div class="row"><span class="chip">${esc(t(on ? "care.push.on" : "care.push.off"))}</span>${PT_PREVIEW ? "" : on ? `<button class="btn sm ghost" data-a="care19-push-off" aria-pressed="true">${esc(t("care.push.turnoff"))}</button>` : `<button class="btn sm" data-a="care19-push-on" aria-pressed="false">${esc(t("care.push.turnon"))}</button>`}</div>
    ${note ? `<p class="small muted">${esc(note)}</p>` : ""}</div>`;
}
{ const orig = viewSettings; viewSettings = function(){
    const h = orig.apply(this, arguments); if (UI.setTab !== "general") return h;
    let mine = ""; try{ mine = care19PushHTML(); }catch(e){ onAppError(e && e.message, "care19:settings"); }
    if (!mine) return h;
    const re = /<div class="stack note18-set">[\s\S]*?<\/select><\/label><\/div>/;
    return re.test(h) ? h.replace(re, m => m + mine) : h.replace(/<div class="stack lg">/, m => m + mine); }; }
/* Health lists the paused Sunday tasks the owner may delete in claude.ai */
function care19PausedTasks(){
  const r = (WS && WS.settings && WS.settings.wkRun) || {}, out = [];
  for (const [id, push] of [[str(r.plainId), false], [str(r.pushId), true]]) if (id && id !== str(r.id)) out.push({id, push, refused: false});
  for (const id of arr(r.refused)) if (id && id !== str(r.id) && !out.some(x => x.id === id)) out.push({id: str(id), push: true, refused: true});
  return out;
}
function care19TasksHTML(){
  if (!Store.isOwner) return "";
  const L = care19PausedTasks(); if (!L.length) return "";
  return `<div class="stack care19-tasks"><h4>${esc(t("care.tasks.t"))}</h4><p class="small muted">${esc(t("care.tasks.sub"))}</p><ul class="hr18-list small">${L.map(x => `<li>${esc(t(x.push ? "care.tasks.push" : "care.tasks.plain"))}${x.refused ? " · " + esc(t("care.tasks.refused")) : ""} · <span class="mono">${esc(x.id)}</span></li>`).join("")}</ul></div>`;
}
{ const orig = hr18HTML; hr18HTML = function(){ const h = orig.apply(this, arguments); let mine = ""; try{ mine = care19TasksHTML(); }catch(e){ onAppError(e && e.message, "care19:tasks"); } return mine ? h.replace(/<\/div>\s*$/, m => mine + m) : h; }; }

/* ===================== the Sunday note: one section "Looking after PT" (only in the newest note) ===================== */
if (!WK18_SECS.includes("care")) WK18_SECS.splice(Math.max(0, WK18_SECS.indexOf("health")), 0, "care");
{ const orig = wk18Build; wk18Build = async function(){
    const doc = await orig.apply(this, arguments);
    if (doc){ try{
      doc.care19 = {exp: care19ExpDue(), keys: care19KeysDue(Date.parse(doc.to) || Date.now()), ceil: await care19Proposal(doc.key)};
      await Store.putNow(wk18Path(doc.key), doc); if (RUN18.notes) RUN18.notes.set(doc.key, doc);
    }catch(e){ onAppError(e && e.message, "care19:note"); } }
    return doc; }; }
function care19Entries(n){
  if (!care19Latest(n)) return [];
  const E = [], add = (html, text) => { if (html) E.push({sec: "care", secs: wk18Secs(text, true), html}); };
  add(care19OverHTML(), t("care.ceil.over"));
  add(care19CeilHTML(n), t("care.ceil.prop") + t("care.ceil.fig") + t("care.ceil.what"));
  if (care19KeysDue()) add(care19KeysHTML(), care19KeysText());
  if (care19ExpDue()) add(care19ExpHTML("care19-wk"), t("care.exp.never") + t("care.exp.how"));
  return E;
}
{ const orig = wk18Entries; wk18Entries = function(n){ const E = orig.apply(this, arguments); try{ E.push(...care19Entries(n)); }catch(e){ onAppError(e && e.message, "care19:entries"); } return E; }; }

/* ===================== R2 · how customers get AI (a direction-E row; a server-backed key only where the owner picks it) ===================== */
if (!KIT18_AI.includes("server")) KIT18_AI.push("server");
STR["kit18.serverlater"] = STR["care.serverrow"];   // 1.9: the server key is a choice now, no longer "later"
/* the AI parts that run at run time; code only is possible where none of them has to write language (fixed rules can score, sort or pick) */
const CARE19_TEXT_WORDS = /\b(writ\w*|draft\w*|summar\w*|explain\w*|answer\w*|repl(y|ies)|translat\w*|understand\w*|chat\w*|convers\w*|describ\w*|generat\w*)\b|schreib|zusammenfass|erklär|antwort|übersetz|beschreib|写|总结|解释|回答|翻译|对话|生成/i;
function care19AiFeats(p){ return kit18Features(p).filter(f => f.runs === "run"); }
function care19CodeOk(p){ const C = kit18Comps(p); return care19AiFeats(p).every(f => { const c = C.find(x => str(x.id) === f.id) || {}; return !CARE19_TEXT_WORDS.test([c.name, c.role].map(str).join(" ")); }); }
function care19AiRec(p){ const x = care19AiFeats(p).map(f => f.name).join(", ") || "—"; return care19CodeOk(p) ? {kind: "none", why: t("care.ai.why.none", {x})} : {kind: "viewer", why: t("care.ai.why.viewer", {x})}; }
/* the cost as a monthly range (estimate): 100–2,000 calls a month per AI part of ~2,000 tokens in and 500 out, the smallest to a middle
   model at the prices PT knows (kit 2 facts, checked KIT_CHECKED), 1 USD ≈ 0.80 CHF, plus a small server at CHF 0–10 */
const CARE19_PRICE = {small: [0.10, 0.50], mid: [2, 10]}, CARE19_CALL = {inTok: 2000, outTok: 500}, CARE19_USD_CHF = 0.8;
function care19SrvCost(p){
  const n = Math.max(1, care19AiFeats(p).length), per = ([i, o]) => (CARE19_CALL.inTok * i + CARE19_CALL.outTok * o) / 1e6, a = 100 * n, b = 2000 * n;
  return {n, a, b, lo: Math.max(1, Math.round(a * per(CARE19_PRICE.small) * CARE19_USD_CHF)), hi: Math.ceil((b * per(CARE19_PRICE.mid) * CARE19_USD_CHF + 10) / 5) * 5};
}
function care19Srv(p){ const s = kitRead(p).aiServer; return s && typeof s === "object" ? s : {}; }
function care19SrvOn(p){ return kit18Customer(p) && kit18AiMode(p) === "server"; }
function care19SecretName(p){ return kitSlug(p).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") + "_AI_KEY"; }
const CARE19_AIKEYS = {qKey: "care.ai.q", optKey: "care.ai."};
/** the owner chose the server-backed key with a hard monthly limit: one decision, one Undo step, nothing created or paid */
function care19SetServer(p, limit){
  const v = Math.floor(num(limit, 0)); if (!p || !(v >= 1)) return false;
  const rec = care19AiRec(p), c = care19SrvCost(p);
  if (!kit18SetAi(p, "server", Object.assign({rec}, CARE19_AIKEYS))) return false;
  if (!ACT.open.has(p.id)) actOpen(p, t("kit18.act.ai"));   // the same Undo step as the decision (kitSet closes it after this tick)
  kitOf(p).aiServer = {limit: v, cur: "CHF", lo: c.lo, hi: c.hi, at: now(), by: "you"};
  touch(p); actCloseSoon(p.id);
  return true;
}
{ const orig = kit18AiMode; kit18AiMode = function(p){ const k = orig.apply(this, arguments); return k === "server" && !kit18Customer(p) ? "split" : k; }; }
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, x => add(x && x.kind === "kit-ai" && kit18Customer(p) ? Object.assign(x, {title: t("care.ai.q"), hard: true, why: t("kit.q.why", {x: t("care.ai." + care19AiRec(p).kind)})}) : x)); }; }
{ const orig = qOptions; qOptions = function(p, x){
    if (x && x.kind === "kit-ai" && p && kit18Customer(p)){
      const rec = care19AiRec(p), c = care19SrvCost(p), xs = care19AiFeats(p).map(f => f.name).join(", ") || "—", set = k => () => kit18SetAi(p, k, Object.assign({rec}, CARE19_AIKEYS));
      return [{k19: "none", label: t("care.ai.none"), run: set("none"), star: rec.kind === "none", why: rec.kind === "none" ? rec.why : t("care.ai.why.nonex", {x: xs})},
        {k19: "viewer", label: t("care.ai.viewer"), run: set("viewer"), star: rec.kind === "viewer", why: rec.kind === "viewer" ? rec.why : t("care.ai.why.viewerx")},
        {k19: "server", label: t("care.ai.server"), run: () => { UI.modal = {kind: "care19srv", pid: p.id}; }, opens: true, star: false, why: t("care.ai.why.server", {lo: c.lo, hi: c.hi})}];
    }
    return orig.apply(this, arguments); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ if (ref === "kit:ai" && p && kit18Customer(p)) return t("care.ai.q"); return orig.apply(this, arguments); }; }
/* the row lists the server option too (it opens the limit dialog, so the queue marks it "opens"), and for a customer tool it is direction E, waiting for you */
{ const orig = rowOpts; rowOpts = function(p, x){ const r = orig.apply(this, arguments); try{ if (x && x.kind === "kit-ai" && kit18Customer(p)){ const s = qOptions(p, x).find(o => o.k19 === "server"); if (s && !r.options.some(o => o.label === s.label)) r.options.push({label: s.label, why: str(s.why)}); } }catch(e){ onAppError(e && e.message, "care19:rowopts"); } return r; }; }
{ const orig = rowsFromKit; rowsFromKit = function(p, add){ return orig(p, kit18Customer(p) ? x => add(x && x.src === "kit:ai" ? Object.assign(x, {branch: "E", stage: 4, base: "block", hard: true}) : x) : add); }; }
MODAL14.care19srv = (m, p0, hd) => {
  const p = WS.projects.find(x => x.id === m.pid); if (!p) return hd(t("care.srv.t"));
  const c = care19SrvCost(p), xs = care19AiFeats(p).map(f => f.name).join(", ") || "—", head = hd(t("care.srv.title", {x: p.name}));
  return `${head}<p>${esc(t("care.srv.lead"))}</p><p class="small">${esc(t("care.srv.cost", {lo: c.lo, hi: c.hi, a: c.a, b: c.b, x: xs, d: fmtDay(KIT_CHECKED)}))}</p>
    <form class="stack" data-form="care19-srv" novalidate><label class="fld"><span>${esc(t("care.srv.limit"))}</span><input type="number" id="care19-limit" min="1" step="1" inputmode="numeric" aria-required="true" placeholder="${c.hi}" value="${m.limit ? esc(String(m.limit)) : ""}"><span class="hint">${esc(t("care.srv.limit.hint", {x: c.hi}))}</span></label>
    ${m.err ? `<p class="small warn-t" role="alert">${esc(t("care.srv.need"))}</p>` : ""}
    <p class="small"><b>${esc(t("care.srv.steps"))}</b></p><ol class="small"><li>${esc(t("care.srv.s1"))}</li><li>${esc(t("care.srv.s2"))}</li><li>${esc(t("care.srv.s3"))}</li></ol><p class="small muted">${esc(t("care.srv.nothing"))}</p>
    <div class="row end"><button class="btn ghost" type="button" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" type="submit">${esc(t("care.srv.go"))}</button></div></form>`;
};
FORMS["care19-srv"] = f => {
  const m = UI.modal || {}, p = WS.projects.find(x => x.id === m.pid), el = f.querySelector("#care19-limit"), v = Math.floor(num(el && el.value, 0));
  if (!p) return;
  if (!(v >= 1)){ m.err = true; m.limit = ""; render(); focusSoon("care19-limit"); return; }
  if (!care19SetServer(p, v)) return;
  UI.modal = null; render(); toast(t("care.srv.saved", {l: v}), "ok");
};
/* what the build session gets: the server only for this tool, its limit, and the owner's steps first */
{ const orig = kit18AiWhere; kit18AiWhere = function(p){ if (care19SrvOn(p)) return `on this tool's own small server (an API key that may serve only this tool; hard monthly limit CHF ${num(care19Srv(p).limit, 0)}); the page holds no key and calls only that server`; return orig.apply(this, arguments); }; }
const CARE19_P_OLD = "A CUSTOMER tool, code only in 1.8: run-time AI only through the viewer's own claude.ai session; no API key, no server-side model call (a server-backed key is a later row, 1.9: do not propose it);";
function care19PromptFix(p, s){
  if (!s || !kit18Customer(p)) return s;
  if (care19SrvOn(p)) return s.replace(CARE19_P_OLD, `A CUSTOMER tool with server-backed AI (the owner chose it for this tool only): run-time AI only through this tool's own small server, whose API key serves only this tool and lives only in GitHub's secret store; hard monthly limit CHF ${num(care19Srv(p).limit, 0)}, at the limit every AI feature shows its manual path; the page itself holds no key and calls no AI provider;`);
  return s.replace("(a server-backed key is a later row, 1.9: do not propose it)", "(a server-backed key is the owner's choice in Prompt Translator and was not chosen for this tool: do not propose it)");
}
{ const i = KIT_PROMPT_PARTS.indexOf(kit18PromptBlock); if (i >= 0){ const f0 = KIT_PROMPT_PARTS[i]; KIT_PROMPT_PARTS[i] = function(p){ return care19PromptFix(p, f0(p)); }; } }
const CARE19_B_OLD = "4. WHO IT IS FOR — A CUSTOMER TOOL, CODE ONLY IN 1.8. Run-time AI only through the viewer's own claude.ai session (ability sample: the viewer's own plan, consent at the first click). No API key, no server-side model call, no AI the owner pays for per customer: a server-backed key is a LATER row (1.9) — do not build it, do not offer it.";
function care19BriefFix(p, s){
  if (!s || !kit18Customer(p)) return s;
  if (!care19SrvOn(p)) return s.replace("a server-backed key is a LATER row (1.9) — do not build it, do not offer it", "a server-backed key is the owner's choice in Prompt Translator and was not chosen for this tool — do not build it, do not offer it");
  const v = num(care19Srv(p).limit, 0), key = care19SecretName(p);
  return s.replace("DECIDED by the person — undefined", "DECIDED by the person — through this tool's own small server with a key only for this tool (P.4)")
    .replace(CARE19_B_OLD, `4. WHO IT IS FOR — A CUSTOMER TOOL WITH SERVER-BACKED AI (the owner's choice, for this tool only; 1.9). The page calls only this tool's own small server; the server holds an API key that may serve only this tool (calls only from this tool's page origin, only its own endpoints) and calls the model. The key lives only in GitHub's secret store (repository secret ${key}) and reaches the server only through the deploy workflow's secrets — never in the page, a chat, an issue, a commit or Prompt Translator. HARD MONTHLY LIMIT: CHF ${v}. The server counts its own spend per calendar month and stops at the limit (it answers "limit reached" and the page shows each AI feature's manual path, never a dead button); the provider key carries the same spending limit. Viewers need no Claude account. Nothing is paid by Prompt Translator; nothing is created by this build that the owner's steps (build steps) have not set up.`);
}
{ const orig = kit18BriefPart; kit18BriefPart = function(p){ const s = orig.apply(this, arguments); try{ return care19BriefFix(p, s); }catch(e){ onAppError(e && e.message, "care19:brief"); return s; } }; }
{ const orig = kit18BriefSteps; kit18BriefSteps = function(p){
    const S = orig.apply(this, arguments);
    try{
      if (!care19SrvOn(p)) return S;
      const v = num(care19Srv(p).limit, 0), key = care19SecretName(p), a = kit18Art50(p);
      const cust = S.find(x => /^Customer tool rules/.test(x.title));
      if (cust){
        cust.body = "Apply PART P.4 and P.7: code everywhere except the AI features of P.3, which call this tool's own small server; the page holds no key and never calls an AI provider directly; the server enforces the hard monthly limit of CHF " + v + (a.disclosure ? "; the Art. 50 notice before the first AI output and the visible label plus machine-readable mark on AI-made content" : "") + ".";
        cust.check = "search the page source: no API key and no direct call to an AI provider (only this tool's own server); the server reads its key only from its host's secret store; with the month's spend set to the limit every AI feature shows its manual path" + (a.disclosure ? "; the AI notice shows before the first AI output; every AI-made output carries the label and data-ai-generated" : "") + ".";
      }
      S.push({title: "Server-backed AI · the owner's steps first · Firnlab 1.9", body: `Built only for this tool because the owner chose it; nothing automatic, nothing paid by Prompt Translator. PERSON STEPS (list them; never do them yourself and never ask for a key in the chat): 1) create an API key at the model provider only for this tool, with a spending limit of at most CHF ${v} a month (the provider's own limit setting); 2) store it only in GitHub's secret store as the repository secret ${key} (never in a chat, an issue, the page, a commit or Prompt Translator); 3) hosting: create the small server's account (free tier first) on the laptop and give the deploy workflow the host's deploy token as a GitHub secret. Then build the server: one endpoint per AI feature of P.3, calls accepted only from this tool's page origin, the key read only from the host's secret store, its spend counted per calendar month and stopped at CHF ${v} (answer "limit reached"; the page then shows the manual path), hashes logged, never text.`,
        check: `the three person steps are listed with the exact secret name ${key}; the server refuses a call from another origin; with the month's spend at the limit every AI feature shows its manual path; no key in the page source or the repository.`});
    }catch(e){ onAppError(e && e.message, "care19:steps"); }
    return S; }; }
{ const orig = kit18Card; kit18Card = function(p){
    const h = orig.apply(this, arguments);
    try{ if (!h || !care19SrvOn(p)) return h; const s = care19Srv(p), c = care19SrvCost(p);
      const line = `<div class="item" data-k18="server">${stSlot("attn")}<div class="body"><b class="small">${esc(t("care.srv.t"))}</b><span class="small">${esc(t("care.srv.line", {l: num(s.limit, 0), lo: num(s.lo, c.lo), hi: num(s.hi, c.hi)}))}</span></div></div>`;
      return h.replace(/<\/div><p class="hint">/, m => line + m); }
    catch(e){ onAppError(e && e.message, "care19:card"); return h; } }; }

/* ===================== R1b · the read-only viewer outside claude.ai ===================== */
/* Only when the page has no runtime at all (window.claude missing after a short wait) and is not served by claude.ai: inside claude.ai
   PT boots exactly as before. The viewer writes nothing (no storage, no network), offers no AI, no runs and no publishing. */
const VIEW19 = {on: false, data: null, sel: -1, err: "", busy: false};
function view19Wanted(){ try{ return typeof window !== "undefined" && !window.claude && !/(^|\.)(claude\.ai|claudeusercontent\.com|anthropic\.com)$/i.test(str(location.hostname)); }catch(e){ return false; } }   // ok:catch no location: never the viewer
{ const orig = boot; boot = async function(){
    if (view19Wanted()){ for (let i = 0; i < 15 && !window.claude; i++) await new Promise(r => setTimeout(r, 100)); if (view19Wanted()) return view19Boot(); }
    return orig.apply(this, arguments); }; }
function view19Boot(){
  VIEW19.on = true;
  LANG = defaultLang(); applyLangAttr(); document.documentElement.setAttribute("data-theme", "light");
  try{ document.title = t("care.v.title"); }catch(e){ console.warn("viewer: title", e); }   // ok:catch the title stays as it was
  care19Css();
  const root = document.getElementById("app");
  if (root && !root.dataset.v19){
    root.dataset.v19 = "1";
    root.addEventListener("click", e => { const el = e.target.closest && e.target.closest("[data-v19]"); if (!el) return; const a = el.dataset.v19;
      if (a === "proj"){ VIEW19.sel = num(el.dataset.i, -1); view19Render(); const h = document.querySelector(".v19 h2"); if (h) h.focus(); }
      else if (a === "back"){ VIEW19.sel = -1; view19Render(); } });
    root.addEventListener("change", e => { const el = e.target; if (el && el.dataset && el.dataset.v19 === "file") view19File(el); });
  }
  view19Render();
}
async function view19File(el){
  const f = el.files && el.files[0]; if (!f || VIEW19.busy) return;
  VIEW19.busy = true; VIEW19.err = ""; view19Render();
  try{
    const d = JSON.parse(await f.text());
    if (!d || d.app !== "prompt-translator" || !Array.isArray(d.projects)) throw new Error("format");
    VIEW19.data = {ws: str(d.workspace && d.workspace.name), at: str(d.exportedAt), projects: d.projects.filter(p => p && typeof p === "object" && !p.deletedAt)};
    VIEW19.sel = -1;
  }catch(e){ VIEW19.err = t("care.v.bad"); }   // ok:catch said on screen; the projects shown before stay
  finally{ VIEW19.busy = false; }
  view19Render();
}
function view19Render(){ const root = document.getElementById("app"); if (root) root.innerHTML = safeHTML(view19HTML()); }
function view19Text(label, s){ s = str(s).trim(); return s ? `<div class="v19-f"><b class="small">${esc(label)}</b><p class="v19-pre">${esc(s)}</p></div>` : ""; }
function view19Proj(p){
  const ns = p.northStar || {}, pick = (p.pick && Array.isArray(p.pick.log)) ? p.pick.log : [];
  const dec = [...pick.map(e => [str(e && e.q), str(e && e.answer), str(e && e.at)]), ...arr(p.decisions).map(d => [str(d && d.title), str(d && d.choice) + (d && d.reason ? " — " + str(d.reason) : ""), str(d && d.at)])].filter(x => x[0] || x[1]);
  const reqs = arr(p.requirements).filter(Boolean), comps = arr(p.arch && p.arch.components).filter(Boolean), secs = arr(p.pkg && p.pkg.sections).filter(Boolean);
  const list = (title, n, body) => `<details class="panel v19-sec" ${n ? "open" : ""}><summary><h3>${esc(title)}</h3></summary>${n ? body : `<p class="small muted">${esc(t("care.v.none"))}</p>`}</details>`;
  const meta = [p.status === "archived" ? t("care.v.archived") : "", p.live && p.live.v ? t("care.v.live", {v: str(p.live.v)}) : "", p.updatedAt ? t("care.v.updated", {d: fmtDay(p.updatedAt)}) : ""].filter(Boolean).join(" · ");
  return `<div class="row"><button class="btn sm" type="button" data-v19="back">${esc(t("care.v.back"))}</button></div>
    <section class="panel v19-proj"><h2 tabindex="-1">${esc(str(p.name) || "—")}</h2>${meta ? `<p class="small muted">${esc(meta)}</p>` : ""}
      ${view19Text(t("care.v.goal"), ns.goal)}${view19Text(t("care.v.problem"), ns.problem)}${view19Text(t("care.v.users"), ns.users)}${view19Text(t("care.v.success"), ns.success)}${view19Text(t("care.v.idea"), p.intake && p.intake.raw)}
      ${arr(p.tests).length ? `<p class="small muted">${esc(t("care.v.tests", {n: arr(p.tests).length}))}</p>` : ""}</section>
    ${list(t("care.v.decisions", {n: dec.length}), dec.length, `<ul class="v19-list">${dec.map(([q, a, at]) => `<li><b class="small">${esc(q)}</b><span class="small v19-pre">${esc(a)}</span>${at ? `<span class="small muted">${esc(fmtDay(at))}</span>` : ""}</li>`).join("")}</ul>`)}
    ${list(t("care.v.reqs", {n: reqs.length}), reqs.length, `<ul class="v19-list">${reqs.map(r => `<li><b class="small">${esc([str(r.id), str(r.title)].filter(Boolean).join(" · "))}</b><span class="small v19-pre">${esc([r.given, r.when, r.then].map(str).filter(Boolean).join(" → "))}</span></li>`).join("")}</ul>`)}
    ${list(t("care.v.parts", {n: comps.length}), comps.length, `<ul class="v19-list">${comps.map(c => `<li><b class="small">${esc(str(c.name) || str(c.id))}</b><span class="small v19-pre">${esc([str(c.kind), str(c.role)].filter(Boolean).join(" · "))}</span></li>`).join("")}</ul>`)}
    ${list(t("care.v.pkg", {n: secs.length}), secs.length, secs.map(s => `<div class="v19-f"><b class="small">${esc([str(s.title) || str(s.id), str(s.dest)].filter(Boolean).join(" · "))}</b><pre class="v19-pre v19-code">${esc(str(s.content))}</pre></div>`).join(""))}`;
}
function view19HTML(){
  const D = VIEW19.data, P = D ? D.projects : [], p = D && VIEW19.sel >= 0 ? P[VIEW19.sel] : null;
  const head = `<header class="panel v19-head"><h1>${esc(t("care.v.title"))}</h1><p>${esc(t("care.v.lead"))}</p><p class="small muted v19-why">${esc(t("care.v.why"))}</p>
    <label class="fld v19-pick"><span>${esc(t(D ? "care.v.other" : "care.v.open"))}</span><input type="file" accept="application/json,.json" data-v19="file"></label>
    ${VIEW19.busy ? `<p class="small muted" role="status">${esc(t("care.v.load"))}</p>` : ""}${VIEW19.err ? `<p class="small warn-t" role="alert">${esc(VIEW19.err)}</p>` : ""}</header>`;
  if (!D) return `<main class="v19">${head}</main>`;
  if (p) return `<main class="v19">${head}${view19Proj(p)}</main>`;
  const rows = P.map((x, i) => { const meta = [x.status === "archived" ? t("care.v.archived") : "", x.live && x.live.v ? t("care.v.live", {v: str(x.live.v)}) : "", x.updatedAt ? t("care.v.updated", {d: fmtDay(x.updatedAt)}) : ""].filter(Boolean).join(" · ");
    return `<li><button type="button" class="v19-row" data-v19="proj" data-i="${i}"><b>${esc(str(x.name) || "—")}</b>${meta ? `<span class="small muted">${esc(meta)}</span>` : ""}</button></li>`; }).join("");
  return `<main class="v19">${head}<section class="panel"><h2 class="small">${esc(t("care.v.head", {n: P.length, w: D.ws || "—", d: fmtDay(D.at) || "—"}))}</h2>${P.length ? `<ul class="v19-projs">${rows}</ul>` : `<p class="small muted">${esc(t("care.v.empty"))}</p>`}</section></main>`;
}

/* ===================== actions ===================== */
Object.assign(ACTIONS, {
  "care19-ceil-use": el => care19SetCeil(el.dataset.n, "proposal"),
  "care19-ceil-set": el => { const box = el.closest(".care19-ceil"), inp = box && box.querySelector("input[type=number]"); care19SetCeil(inp ? inp.value : "", "own"); },
  "care19-ceil-later": el => { WS.settings.care19 = Object.assign({}, WS.settings.care19, {ceilLater: str(el.dataset.key), laterAt: now()}); saveWs(); render(); toast(t("care.ceil.later.done"), ""); },
  "care19-ceil-edit": () => { const C = care19Ceil(); promptBox(t("care.ceil.t"), {value: C ? String(Math.floor(num(C.calls, 0))) : "", type: "number", help: t("care.ceil.prompt")}, v => { care19SetCeil(v, "own"); }); },
  "care19-keys-done": () => { META.keys19 = {done: now()}; saveMeta(); render(); toast(t("care.keys.saved"), "ok"); },
  "care19-push-on": async () => { try{ await care19PushSet(true); }catch(e){ toast(mcpErrText(e), "err"); } render(); },
  "care19-push-off": async () => { try{ await care19PushSet(false); }catch(e){ toast(mcpErrText(e), "err"); } render(); }
});
for (const a of ["care19-ceil-use", "care19-ceil-set", "care19-ceil-later", "care19-ceil-edit", "care19-keys-done", "care19-push-on", "care19-push-off"]) ACT_NO.add(a);

/* ===================== when a workspace opens, and while it stays open ===================== */
{ const orig = openWorkspace; openWorkspace = async function(){
    CARE19.month = null; CARE19.mTried = 0; CARE19.stopped = 0;
    const r = await orig.apply(this, arguments);
    try{ if (care19On() && care19Ceil()) care19MonthLoad(); }catch(e){ onAppError(e && e.message, "care19:open"); }
    return r; }; }
setInterval(() => { try{ if (care19On() && care19Ceil()) care19MonthLoad(); }catch(e){ onAppError(e && e.message, "care19:tick"); } }, 600000);

/* ===================== the look (tokens of the 1.8 look; no new colours) ===================== */
const CARE19_CSS = `
.care19-steps{margin:2px 0 4px;padding-left:20px;display:flex;flex-direction:column;gap:2px}
.care19-steps li{overflow-wrap:break-word;min-width:0}
.care19-acts{gap:6px 8px;align-items:center;margin-top:4px}
.care19-num{display:inline-flex;align-items:center;gap:6px}
.care19-num input{width:7em}
.care19-push,.care19-tasks{border-top:1px solid var(--line);padding-top:10px}
.care19-push h3,.care19-tasks h4{margin:0}
.care19-ask .modal{max-width:520px}
.v19{max-width:920px;margin:0 auto;padding:16px;display:flex;flex-direction:column;gap:14px;min-width:0}
.v19 h1{margin:0;font-size:22px}
.v19 h2{margin:0}
.v19 h3{display:inline;margin:0;font-size:15px}
.v19-pick{max-width:28em}
.v19-projs,.v19-list{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.v19-row{width:100%;text-align:left;display:flex;flex-direction:column;gap:2px;padding:10px 12px;min-height:44px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);color:inherit;font:inherit;cursor:pointer}
.v19-row:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.v19-list li{display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--line);padding-bottom:6px;min-width:0}
.v19-f{display:flex;flex-direction:column;gap:2px;margin-top:8px;min-width:0}
.v19-pre{white-space:pre-wrap;overflow-wrap:break-word;margin:0;min-width:0}
.v19-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:10px;max-height:28em;overflow:auto}
.v19-sec summary{cursor:pointer}
@media (max-width:599px){ .v19{padding:12px} .care19-num input{width:6em} }`;
function care19Css(){ if (typeof document === "undefined" || document.getElementById("care19-css")) return; const s = document.createElement("style"); s.id = "care19-css"; s.textContent = CARE19_CSS; (document.head || document.body).appendChild(s); }
care19Css();
