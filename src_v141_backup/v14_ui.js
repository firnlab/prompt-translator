/* ===================== 1.4 SHELL: status slot, activity tray, still screen, take me there, stage bar =====================
   The screen stays still: running work is shown in one fixed tray at the bottom (live text, Stop, "Done · Show result"),
   never as boxes that push the page; a render keeps what you were looking at in place. Every count and badge takes you to
   exactly the items it counts ("1 of N", Back). */

/* ---------- 1. the status slot: one fixed place left of every title; shape + colour + name ---------- */
const ST_SHAPE = {
  ok: '<circle cx="9" cy="9" r="7.2"/><path d="M5.6 9.2l2.3 2.3 4.6-4.8" fill="none" stroke-width="1.8"/>',
  as: '<circle cx="9" cy="9" r="7.2" fill="none" stroke-dasharray="3 2.2" stroke-width="1.7"/><path d="M7.1 7.2a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.7.6-.7 1.1M9 12.4v.1" fill="none" stroke-width="1.6"/>',
  warn: '<path d="M9 2.2l7.2 12.6H1.8z" fill="none" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 7v3.6M9 12.6v.1" fill="none" stroke-width="1.8"/>',
  bad: '<rect x="2.4" y="2.4" width="13.2" height="13.2" rx="3"/><path d="M6.4 6.4l5.2 5.2M11.6 6.4l-5.2 5.2" fill="none" stroke-width="1.8"/>',
  todo: '<circle cx="9" cy="9" r="6.8" fill="none" stroke-width="1.6"/>',
  cur: '<circle cx="9" cy="9" r="7.2" fill="none" stroke-width="1.6"/><circle cx="9" cy="9" r="3.6"/>',
  done: '<circle cx="9" cy="9" r="7.2"/><path d="M5.6 9.2l2.3 2.3 4.6-4.8" fill="none" stroke-width="1.8"/>',
  attn: '<circle cx="9" cy="9" r="7.2" fill="none" stroke-width="1.7"/><path d="M9 5.2v4.6M9 12.4v.1" fill="none" stroke-width="1.8"/>'
};
function stSlot(st, label = ""){
  const s = ST_SHAPE[st] ? st : "todo";
  const name = label || (["done","attn","cur"].includes(s) ? t("ph.state." + s) : t("ist." + s));
  return `<span class="sslot ss-${s}" role="img" aria-label="${esc(name)}" title="${esc(name)}"><svg viewBox="0 0 18 18" aria-hidden="true">${ST_SHAPE[s]}</svg></span>`;
}
function stLegend(){ return `<div class="legend14" aria-label="${esc(t("lg.title"))}">${["ok","as","warn","bad","todo"].map(s => `<span>${stSlot(s)}${esc(t("ist." + s))}</span>`).join("")}</div>`; }

/* ---------- 2. the activity tray ---------- */
const TRAY = {done: []};
const KEY_PH = {clarify: "capture", goal: "capture", "goal-ex": "capture", "goal-link": "require", interview: "interview", "notes-ans": "interview", require: "require", arch: "arch", mockup: "arch", trial: "arch", "trial-judge": "arch", mini: "arch", "mini-judge": "arch", frontier: "understand", compile: "build", mirror: "build", lintfix: "build", review: "review", fix: "review", confirm: "review", affected: "build", tests: "test", sim: "test", judge: "test", judge2: "test", improve: "test", trace: "launch", recap: "", guide: "", impact: "", translate: ""};
function keyPhase(k){ const b = String(k || "").split("|").pop(); return KEY_PH[b] != null ? KEY_PH[b] : b.startsWith("und-") ? "understand" : b.startsWith("check-") ? b.slice(6) : b.startsWith("mit-") ? "assume" : b.startsWith("item-") ? "" : ""; }
function trayInline(){ return ""; }   // running work is never shown as a box inside the page (it would push the page)
function trayDone(key, job){
  TRAY.done = TRAY.done.filter(d => d.key !== key);
  TRAY.done.push({key, label: job.label, pid: job.pid, ph: keyPhase(job.k || key), at: Date.now()});
  if (TRAY.done.length > 3) TRAY.done.shift();
  clearTimeout(TRAY.timer); TRAY.timer = setTimeout(() => { TRAY.done = TRAY.done.filter(d => Date.now() - d.at < 8000); render(); }, 8200);
}
function updateStream(key, text){ for (const el of document.querySelectorAll(`[data-stream="${CSS.escape(key)}"]`)){ el.textContent = el.classList.contains("tstream") ? trunc(String(text).replace(/\s+/g, " ").slice(-220), 220) : trunc(text, 1600); if (!el.classList.contains("tstream")) el.scrollTop = el.scrollHeight; } }

/* ---------- 3. render keeps what you were looking at in place ---------- */
function viewAnchor(){
  const m = document.querySelector(".main"); if (!m) return null;
  const top = m.getBoundingClientRect().top + 8;
  const cands = m.querySelectorAll("[id^='ir-'], .panel[id], section[id], .qcard[id], .xcard[id], [data-anchor]");
  for (const el of cands){ const r = el.getBoundingClientRect(); if (r.bottom > top && r.height > 0){ return {id: el.id || el.dataset.anchor, top: r.top}; } }
  return null;
}
function keepAnchor(a){
  if (!a || !a.id) return;
  const m = document.querySelector(".main"); if (!m) return;
  const el = document.getElementById(a.id) || m.querySelector(`[data-anchor="${CSS.escape(a.id)}"]`); if (!el) return;
  const d = el.getBoundingClientRect().top - a.top; if (Math.abs(d) > 1) m.scrollTop += d;
}

/* ---------- 4. take me there: one way to every item, with "1 of N" and Back ---------- */
const SPECIAL_ANCHOR = {loop: ["capture", "loop"], exboard: ["capture", "exboard"], extests: ["test", "extests"], audience: ["capture", "audience"], goal: ["capture", "goal"], interview: ["interview", ""], "check:require": ["require", "chk-require"], "check:arch": ["arch", "chk-arch"], trace: ["launch", "trace14"], review: ["review", ""], test: ["test", ""], build: ["build", ""], "build:lint": ["build", ""], "build:lintw": ["build", ""], cost: ["build", ""], require: ["require", ""], arch: ["arch", ""], notes: ["", ""], "test:cand": ["test", ""], "engine:scan": ["understand", "engine-scan"]};
function refPhase(p, ref){
  if (SPECIAL_ANCHOR[ref]) return SPECIAL_ANCHOR[ref][0] || p.focus.ph;
  if (ref.startsWith("engine:G")) return ["G1","G2"].includes(ref.slice(7)) ? "understand" : "arch";
  if (ref.startsWith("crit:") || ref.startsWith("ex:")) return "capture";
  if (ref.startsWith("pq:") || ref.startsWith("oq:")) return "interview";
  if (ref.startsWith("fs:")){ const f = activeForesight(p).find(x => x.id === ref.slice(3)); return f && PHASE_IDS.includes(f.phase) ? f.phase : "arch"; }
  if (ref.startsWith("finding:")){ const f = arr(p.findings).find(x => x.id === ref.slice(8)); return f && f.stage === "early" ? f.step || "require" : "review"; }
  const it = itemByRef(p, ref); if (it) return it.ph;
  return PHASE_OF[ref.split(":")[0]] || p.focus.ph;
}
function goRef(ref, {list = null} = {}){
  const p = curP(); if (!p || !ref) return;
  if (ref === "notes"){ go("notes"); return; }
  pushNav();
  const ph = refPhase(p, ref);
  // looking at an item from Finish pauses it: "Back to Finish" returns to the same decision
  if (UI.finish && UI.finish.pid === p.id && (UI.finish.step === "decide" || UI.finish.step === "done")) UI.finishPaused = UI.finish;
  UI.home = false; UI.finish = null;
  if (ref.startsWith("finding:")){ const f = arr(p.findings).find(x => x.id === ref.slice(8)); if (f){ UI.revTab = OPEN_F.includes(f.status) ? "open" : f.status; UI.expanded.add("f-" + f.id); } }
  if (ref.startsWith("test:") && ref !== "test:cand"){ UI.testTab = "cases"; UI.expanded.add("t-" + ref.slice(5)); }
  if (ref === "test:cand") UI.testTab = "improve";
  if (ref.startsWith("assumption:") || ref.startsWith("risk:")) UI.open.add(ref);
  setPhase(ph, {id: /:/.test(ref) ? ref : null, keepScroll: true});
  UI.open.add(ref); UI.flashRef = SPECIAL_ANCHOR[ref] && SPECIAL_ANCHOR[ref][1] ? "#" + SPECIAL_ANCHOR[ref][1] : ref;
  if (list){ const i = list.indexOf(ref); UI.nav = {list, i: Math.max(0, i), pid: p.id}; }
  render();
}
/* Back: the browser's Back button and the "Back" in the navigator return to where you were */
const NAV_STACK = [];
function pushNav(){ const p = curP(); const m = document.querySelector(".main"); NAV_STACK.push({view: UI.view, pid: UI.pid, ph: p && p.focus ? p.focus.ph : null, id: p && p.focus ? p.focus.id : null, home: !!UI.home, scroll: m ? m.scrollTop : 0}); if (NAV_STACK.length > 40) NAV_STACK.shift(); try{ history.pushState({pt: NAV_STACK.length}, ""); }catch(e){} }
function popNav(){
  const s = NAV_STACK.pop(); if (!s) return false;
  UI.view = s.view; UI.pid = s.pid; UI.home = s.home; UI.nav = null;
  const p = curP(); if (p && s.ph){ p.focus = {ph: s.ph, id: s.id}; UI.phase = s.ph; }
  render(); const m = document.querySelector(".main"); if (m) m.scrollTop = s.scroll; return true;
}
window.addEventListener("popstate", () => { popNav(); });
function navBar(p){
  const fp = UI.finishPaused && UI.finishPaused.pid === p.id && !UI.finish ? `<div class="navbar14 finpause" role="navigation"><button class="btn xs primary" data-a="finish-resume">← ${esc(t("fin.resume", {i: num(UI.finishPaused.i, 0) + 1, n: arr(UI.finishPaused.list).length}))}</button></div>` : "";
  return fp + navBar0(p);
}
function navBar0(p){
  const n = UI.nav; if (!n || n.pid !== p.id || !n.list.length) return "";
  const i = n.i, ref = n.list[i];
  return `<div class="navbar14" role="navigation" aria-label="${esc(t("nav14.label"))}"><button class="btn xs" data-a="nav-back">← ${esc(t("btn.back"))}</button><span class="small">${esc(t("nav14.of", {i: i + 1, n: n.list.length}))} · <b>${esc(refLabel(p, ref))}</b></span><span style="flex:1"></span><button class="btn xs" data-a="nav-step" data-d="-1" ${i ? "" : "disabled"} aria-label="${esc(t("nav14.prev"))}">‹</button><button class="btn xs" data-a="nav-step" data-d="1" ${i < n.list.length - 1 ? "" : "disabled"} aria-label="${esc(t("nav14.next"))}">›</button><button class="iconbtn" data-a="nav-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>`;
}

/* ---------- 5. the status line under the modes: counts that take you there (fixed height, nothing jumps) ---------- */
function statusLine(p){
  const c = queueCounts(p), fl = arr(p.flags).length, dec = decidedByPT(p).length;
  const chips = [];
  chips.push(`<button class="chip tap ${c.block ? "st-bad" : "st-ok"}" data-a="home">${stSlot(c.block ? "bad" : "ok")}${esc(c.block ? t("sl.block", {n: c.block}) : t("sl.noblock"))}</button>`);
  if (dec) chips.push(`<button class="chip tap st-as" data-a="q-show" data-cls="check">${esc(t("sl.check", {n: dec}))}</button>`);
  if (fl) chips.push(`<button class="chip tap st-warn" data-a="q-show" data-cls="flag">${esc(t("sl.flags", {n: fl}))}</button>${aiBtn("update-affected", t("sl.updateall"), "M", {key: "affected"})}`);
  return `<div class="statusline" role="status">${chips.join("")}<span style="flex:1"></span>${!UI.home && !(UI.finish && UI.finish.pid === p.id) ? modeBar(p) : ""}${(c.block || c.should || dec || fl) && !UI.home ? `<button class="btn sm ${levelOf(p) === "pro" ? "primary" : ""}" data-a="finish-open">${ic("bolt")}${esc(t("fin.btn"))}</button>` : ""}</div>`;
}

/* ---------- 6. the stage bar: six stages with their steps inside ---------- */
function stageBar(p){
  const cur = stageOf(p.focus.ph);
  return `<nav class="stagebar" aria-label="${esc(t("stg.label"))}"><button class="stg home ${UI.home ? "on" : ""}" data-a="home" aria-current="${UI.home ? "page" : "false"}">${ic("home")}<span>${esc(t("home.title"))}</span></button>${STAGES.map((s, i) => { const st = stageState(p, s.id), qc = queueCounts(p, s.id);
    return `<div class="stg ${s.id === cur && !UI.home ? "on" : ""}"><button class="stgname" data-a="stage" data-v="${s.id}" aria-current="${s.id === cur && !UI.home ? "step" : "false"}">${stSlot(st === "cur" ? (stageDone(p, s.id) ? "done" : "cur") : st)}<span class="sn">${i + 1}. ${esc(stName(s.id))}</span>${qc.block ? `<span class="badge bad" title="${esc(t("sl.block", {n: qc.block}))}">${qc.block}</span>` : ""}</button><span class="substeps">${s.steps.map(ph => `<button class="sub ${p.focus.ph === ph && !UI.home ? "on" : ""}" data-a="goto" data-ph="${ph}" aria-current="${p.focus.ph === ph && !UI.home ? "step" : "false"}">${esc(phName(ph))}</button>`).join("")}</span></div>`; }).join("")}</nav>`;
}
/** the end of each step: the stage gate. Continue is the main button only when nothing blocks; PT's own decisions are one batch */
function gateCard(p, ph){
  const sid = stageOf(ph), st = stageById(sid), last = st.steps[st.steps.length - 1] === ph;
  const i = PHASE_IDS.indexOf(ph), next = PHASE_IDS[i + 1], prev = PHASE_IDS[i - 1];
  const info = stepInfo(p, ph), c = queueCounts(p, sid), dec = decidedByPT(p, sid);
  const nextLbl = next ? (last ? t("gate.nextstage", {s: stName(stageOf(next))}) : t("btn.continueto", {s: phName(next)})) : "";
  const stepOpen = queueOf(p).filter(x => x.ph === ph && (x.cls === "block" || x.cls === "should"));
  const prim = stepOpen.length ? `<button class="btn primary" data-a="q-walk" data-ph="${ph}">${esc(t("gate.walk", {n: stepOpen.length}))}</button>${next ? `<button class="btn ghost" data-a="goto" data-ph="${next}">${esc(nextLbl)} →</button>` : ""}` : next ? `<button class="btn primary" data-a="goto" data-ph="${next}">${esc(nextLbl)} →</button>` : "";
  const lvG = levelOf(p) !== "pro" && last;
  return `${lvG ? `<section class="panel gchkp"><b class="small">${esc(t("gc.title", {s: stName(sid)}))}</b>${gateChecklist(p, sid)}${reflectBox(p, sid)}</section>` : ""}<section class="gatecard ${stepOpen.length ? "" : "ok"}" data-anchor="gate-${ph}">${prev ? `<button class="btn ghost sm" data-a="goto" data-ph="${prev}">← ${esc(phName(prev))}</button>` : "<span></span>"}
    <div class="gtext">${stSlot(info.state === "done" ? "done" : stepOpen.length ? "attn" : "ok")}<span>${esc(stepOpen.length ? t("gate.open", {n: stepOpen.length, s: phName(ph)}) : t("gate.clear", {s: phName(ph)}))}${last && c.block ? " · " + esc(t("gate.stageblock", {n: c.block, s: stName(sid)})) : ""}</span></div>
    ${last && dec.length ? `<button class="btn sm" data-a="dec-batch" data-st="${sid}">${esc(t("gate.decided", {n: dec.length}))}</button>` : ""}
    <span style="flex:1"></span>${prim}</section>`;
}

/* ---------- 7. actions ---------- */
Object.assign(ACTIONS, {
  "as-cell": el => { UI.asCell = el.dataset.v && UI.asCell !== el.dataset.v ? el.dataset.v : null; render(); },
  "ns-more": () => { UI.nsOpen = !UI.nsOpen; render(); },
  "tray-close": el => { TRAY.done = TRAY.done.filter(d => d.key !== el.dataset.key); render(); },
  "tray-show": el => { const pid = el.dataset.pid, ph = el.dataset.ph; TRAY.done = TRAY.done.filter(d => d.pid !== pid || d.ph !== ph); if (UI.pid !== pid || UI.view !== "project") openProject(pid, ph); else { UI.home = false; setPhase(ph); } },
  "goto-ref": el => goRef(el.dataset.ref),
  "nav-back": () => { if (!popNav()) { UI.nav = null; render(); } },
  "nav-close": () => { UI.nav = null; render(); },
  "nav-step": el => { const n = UI.nav; if (!n) return; const i = clamp(n.i + num(el.dataset.d), 0, n.list.length - 1); UI.nav.i = i; const list = n.list; goRef(list[i], {list}); },
  "stage": el => { const p = curP(); const st = stageById(el.dataset.v); const open = st.steps.find(ph => stepInfo(p, ph).state !== "done") || st.steps[0]; UI.home = false; pushNav(); setPhase(open); },
  "home": () => { const p = curP(); pushNav(); UI.home = true; UI.finish = null; render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0; },
  "q-walk": el => { const p = curP(); const list = queueOf(p).filter(x => x.ph === el.dataset.ph && (x.cls === "block" || x.cls === "should")).map(x => x.ref); if (list.length) goRef(list[0], {list}); },
  "q-show": el => { const p = curP(); UI.home = true; UI.qTab = el.dataset.cls === "flag" ? "check" : el.dataset.cls; UI.qFilter = el.dataset.cls === "flag" ? "flag" : null; render(); }
});
/* the old in-page "goto" keeps working and becomes navigation with Back */
{ const orig = ACTIONS["goto"]; ACTIONS["goto"] = (el, e) => { pushNav(); if (UI.finish && (UI.finish.step === "decide" || UI.finish.step === "done")) UI.finishPaused = UI.finish; UI.home = false; UI.finish = null; return orig(el, e); }; }
Object.assign(ACTIONS, {
  "finish-resume": () => { const F = UI.finishPaused; if (!F) return; UI.finishPaused = null; UI.home = false; UI.finish = F; if (F.step === "decide"){ const keys = finishDecisions(curP()).map(x => x.key); F.list = F.list.filter(k => keys.includes(k)).concat(keys.filter(k => !F.list.includes(k))); F.i = Math.min(num(F.i, 0), Math.max(0, F.list.length - 1)); } render(); scrollToFinish(); }
});
ACTIONS["focus-item"] = el => goRef(el.dataset.ref);
