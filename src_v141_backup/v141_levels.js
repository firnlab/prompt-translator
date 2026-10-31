/* ===================== 1.4.1 THREE LEVELS: Learning · Guided · Pro =====================
   The level changes what PT shows and how much it does on its own, never the project.
   Learning · 9 durable skills, each New → Seen → Practiced → Confident (from what you do; you can correct or reset it).
              One learning moment at a time, at a pause, attached to the control it is about ("Show me"), fading per
              skill as you practise. Guess first in the examples loop; a short reflection at each stage gate. Never blocks:
              "Do it for me this time" lets PT do the step and marks what it decided.
   Guided   · one guide strip with one main button; a plan card per stage (approve & run, approve and check each change,
              or change the plan: the same engine as Finish, for one stage); the gate checklist PT ticks itself; hard
              decisions look different and ask what matters to you; "continue where you left off".
   Pro      · compact; IDs; every action in the palette with its key; hold Alt to see the keys; a faster-way hint once;
              the queue as a table with bulk actions and saved views; raw brief editor; run comparison and error board;
              the version timeline where "Live" can be moved; regression tests before publishing; security test preset. */

/* ---------- Learning: skills and the learner model ---------- */
const SKILLS = [
  {id: "problem", ph: ["capture","understand"], sel: "#problem"},
  {id: "examples", ph: ["capture"], sel: "#loop"},
  {id: "judge", ph: ["capture","test"], sel: "#loop .exverd, #exboard .vctl"},
  {id: "rules", ph: ["capture","require"], sel: "#goal, .item[id^='ir-']"},
  {id: "choose", ph: ["interview","arch"], sel: ".qcard.first, .optcards"},
  {id: "risks", ph: ["assume"], sel: "#assume14"},
  {id: "design", ph: ["arch","build"], sel: ".bpmap, #exrun, .pkg-sec"},
  {id: "test", ph: ["review","test","launch"], sel: "#extests, .tabs"},
  {id: "run", ph: ["release","operate"], sel: "#publish14, #success14"}
];
const SKILL_LV = ["new","seen","practiced","confident"];
function skillsOf(){ const s = WS.settings; s.skills = s.skills && typeof s.skills === "object" ? s.skills : {}; return s.skills; }
function skillLv(id){ const k = (WS.settings.skills || {})[id]; return k ? clamp(num(k.lv, 0), 0, 3) : 0; }
/** what you did counts as practice (Seen after 1, Practiced after 4, Confident after 10), unless you set the level yourself */
function skillEvidence(p, id){
  if (!SKILLS.some(s => s.id === id)) return;
  const S = skillsOf(), k = S[id] = S[id] || {lv: 0, ev: 0};
  k.ev = num(k.ev, 0) + 1; k.at = now();
  if (!k.own){ const lv = k.ev >= 10 ? 3 : k.ev >= 4 ? 2 : 1; if (lv > k.lv){ k.lv = lv; if (lv >= 2) setTimeout(() => toast(t("sk.up", {s: t("sk." + id), l: t("sk.lv." + SKILL_LV[lv])}), "ok"), 0); } }
  saveWs();
}
/* actions that are practice of a skill */
const SKILL_OF_ACTION = {"q-pick": "choose", "arch-choose": "choose", "as-validate": "risks", "risk-accept": "risks", "risk-mitigated": "risks", "exa-save": "examples", "ex-addpanel": "examples", "loop-rule": "rules", "crit-ok": "rules", "crit-add": "rules", "run-tests": "test", "judge-decide": "test", "ex-tests": "test", "release": "run", "health-run": "run", "requirements": "design", "compile": "design", "xr-run": "design"};
for (const [a, sk] of Object.entries(SKILL_OF_ACTION)){ const orig = ACTIONS[a]; if (!orig) continue; ACTIONS[a] = (el, e) => { const r = orig(el, e); try{ const p = curP(); if (p) skillEvidence(p, sk); }catch(err){} return r; }; }
function skillsPanel(){
  const S = WS.settings.skills || {};
  return `<section class="panel" id="skills14">${head(t("sk.title"), t("sk.sub"))}
    <div class="skgrid">${SKILLS.map(s => { const lv = skillLv(s.id); return `<div class="skrow"><div class="stack" style="gap:2px;flex:1;min-width:180px"><b>${esc(t("sk." + s.id))}</b><span class="small muted">${esc(t("sk.d." + s.id))}</span></div><div class="skbar" role="img" aria-label="${esc(t("sk.lv." + SKILL_LV[lv]))}">${[0,1,2,3].map(i => `<i class="${i <= lv && lv ? "f" : ""}"></i>`).join("")}</div><select data-a-change="skill-set" data-id="${s.id}" aria-label="${esc(t("sk." + s.id))}">${SKILL_LV.map((l, i) => `<option value="${i}" ${i === lv ? "selected" : ""}>${esc(t("sk.lv." + l))}</option>`).join("")}</select>${(S[s.id] || {}).own ? `<span class="chip">${esc(t("sk.yourset"))}</span>` : ""}</div>`; }).join("")}</div>
    <div class="row"><button class="btn sm ghost" data-a="skill-reset">${esc(t("sk.reset"))}</button><span class="hint">${esc(t("sk.hint"))}</span></div></section>`;
}
Object.assign(CHANGES, { "skill-set": el => { const S = skillsOf(); S[el.dataset.id] = Object.assign({ev: 0}, S[el.dataset.id], {lv: num(el.value, 0), own: true}); saveWs(); render(); } });
Object.assign(ACTIONS, { "skill-reset": () => { confirmBox(t("sk.reset"), t("sk.resetq"), t("sk.reset"), () => { WS.settings.skills = {}; WS.settings.momentsSeen = {}; saveWs(); render(); }); } });

/* ---------- Learning: one moment at a time, at a pause, attached to its control ---------- */
function momentFor(p){
  if (levelOf(p) !== "learn" && !UI.explainOnce) return null;
  const ph = p.focus.ph, seen = WS.settings.momentsSeen || {};
  const cands = SKILLS.filter(s => s.ph.includes(ph));
  // "Explain this once" (Guided, Pro): the moment of this step regardless of practice
  if (UI.explainOnce && UI.explainOnce === p.id + ":" + ph) return cands[0] || null;
  if (levelOf(p) !== "learn") return null;
  // fading: a skill you practise needs no more explaining; one moment per skill and step until you say "Got it"
  return cands.find(s => skillLv(s.id) < 2 && !seen[s.id + ":" + ph]) || null;
}
function momentCard(p){
  const s = momentFor(p); if (!s) return "";
  return `<aside class="moment lm" role="note" aria-label="${esc(t("lm.label"))}"><div class="row" style="gap:8px"><span class="chip acc">${ic("book")}${esc(t("sk." + s.id))}</span><span class="small muted">${esc(t("sk.lv." + SKILL_LV[skillLv(s.id)]))}</span><span style="flex:1"></span><button class="iconbtn sm" data-a="lm-ok" data-k="${esc(s.id + ":" + p.focus.ph)}" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    <b>${esc(t("lm." + s.id + ".t"))}</b><p class="small">${esc(t("lm." + s.id))}</p>
    <div class="row"><button class="btn sm" data-a="lm-show" data-sel="${esc(s.sel)}">${ic("search")}${esc(t("lm.show"))}</button><button class="btn sm" data-a="lm-ok" data-k="${esc(s.id + ":" + p.focus.ph)}" data-sk="${esc(s.id)}">${esc(t("learn.gotit"))}</button>${stepMainAction(p.focus.ph) && stepInfo(p, p.focus.ph).state !== "done" ? `<button class="btn sm ghost" data-a="lm-doit" data-ph="${esc(p.focus.ph)}" title="${esc(t("lm.doit.tip"))}">${esc(t("lm.doit"))}</button>` : ""}</div></aside>`;
}
Object.assign(ACTIONS, {
  "lm-ok": el => { const s = WS.settings; s.momentsSeen = Object.assign({}, s.momentsSeen, {[el.dataset.k]: now()}); UI.explainOnce = null; if (el.dataset.sk){ const p = curP(); if (p) skillEvidence(p, el.dataset.sk); } saveWs(); render(); },
  "lm-show": el => { const sels = str(el.dataset.sel).split(",").map(x => x.trim()); for (const sel of sels){ const t0 = document.querySelector(sel); if (t0){ t0.scrollIntoView({block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); t0.classList.remove("flash"); void t0.offsetWidth; t0.classList.add("flash"); return; } } toast(t("lm.notthere"), ""); },
  "lm-doit": el => { UI.explainOnce = null; ACTIONS["guide-run"](el); toast(t("lm.doing"), ""); },
  "explain-once": () => { const p = curP(); if (!p) return; UI.explainOnce = p.id + ":" + p.focus.ph; render(); }
});
["lm-ok","lm-show","explain-once"].forEach(a => ACT_NO.add(a));

/* ---------- the guide strip (Learning and Guided): where you are, what is next, one main button ---------- */
function guideStrip(p){
  const ph = p.focus.ph, open = queueOf(p).filter(x => x.ph === ph && (x.cls === "block" || x.cls === "should"));
  const x = open[0], nb = nextBest10(p), nx = PHASE_IDS[PHASE_IDS.indexOf(ph) + 1];
  let what, act;
  const pc = planCard(p) ? "" : "primary";
  if (x){ what = t("g14.open", {n: open.length, x: x.title}); act = `<button class="btn ${pc}" data-a="q-walk" data-ph="${ph}">${esc(t("g.show"))}</button>`; }
  else if (stepInfo(p, ph).state !== "done" && stepMainAction(ph)){ what = t(nb.phase === ph ? nb.key : "next." + ph); act = `<button class="btn ${pc}" data-a="guide-run" data-ph="${ph}">${esc(t("g.do"))}</button>`; }
  else { what = nx ? t("g.next", {s: phName(nx)}) : t("g14.alldone"); act = nx ? `<button class="btn ${pc}" data-a="goto" data-ph="${nx}">${esc(t("btn.continueto", {s: phName(nx)}))} →</button>` : ""; }
  const cont = p.lastWhere && UI.home !== false && UI.justOpened === p.id && p.lastWhere.ph && (p.lastWhere.ph !== ph || p.lastWhere.ref) ? `<button class="btn sm ghost" data-a="continue-where">${ic("arrow")}${esc(t("gs.continue", {x: phName(p.lastWhere.ph) + (p.lastWhere.ref ? " · " + str(p.lastWhere.ref).split(":").pop() : "")}))}</button>` : "";
  return `<div class="gstrip" role="region" aria-label="${esc(t("gs.label"))}"><span class="gs-where small muted">${esc(stName(stageOf(ph)))} › ${esc(phName(ph))}</span>${clampHTML(what, "gs:" + p.id + ":" + ph, {lines: 2, cls: "gs-what"})}<span style="flex:1"></span>${cont}${act}${levelOf(p) !== "learn" ? `<button class="btn sm ghost" data-a="explain-once" title="${esc(t("gs.explain.tip"))}">${ic("book")}${esc(t("gs.explain"))}</button>` : ""}</div>`;
}
/* where you left off */
{ const orig = setPhase; setPhase = function(ph, o = {}){ const r = orig(ph, o); try{ const p = curP(); if (p && PHASE_IDS.includes(ph)){ p.lastWhere = {ph, ref: o && o.id || null, at: now()}; } }catch(e){} return r; }; }
{ const orig = setPhase; setPhase = function(ph, o = {}){ UI.justOpened = null; return orig(ph, o); }; }   // the offer is only for the moment a project opens
{ const orig = openProject; openProject = function(id, phase){
    // item and filter state belongs to one project: a different project starts clean
    if (UI.curPid !== id){ Object.assign(UI, {inspRef: null, qFind: "", rawOpen: false, rawText: null, rawBase: null, rcA: null, rcB: null, planOpen: false, proTest: null, qSel2: null, explainOnce: null}); }
    const r = orig(id, phase); UI.justOpened = id; UI.curPid = id; return r; }; }
{ const orig = goRef; goRef = function(...a){ UI.justOpened = null; return orig(...a); }; }
Object.assign(ACTIONS, { "continue-where": () => { const p = curP(); const w = p && p.lastWhere; UI.justOpened = null; if (!w) return; if (w.ref) goRef(w.ref); else { UI.home = false; setPhase(w.ph); } } });
ACT_NO.add("continue-where");

/* ---------- Guided: the plan card of a stage (= Finish for one stage) ---------- */
function stagePlan(p, sid){ const pl = finishPlan(p, sid); return pl; }
function planCard(p){
  const lv = levelOf(p); if (lv === "pro" || UI.finish || UI.home) return "";
  const sid = stageOf(p.focus.ph), pl = stagePlan(p, sid);
  if (!pl.groups.length) return "";
  const sig = sid + ":" + pl.groups.map(g => g.fix + g.n).join(",");
  if ((p.planSeen || {})[sid] === sig) return "";
  const you = pl.you.filter(x => x.stage === sid), dec = decidedByPT(p, sid).length, units = pl.groups.reduce((n, g) => n + g.units, 0);
  return `<section class="panel plancard" id="plan-${sid}"><div class="row"><b>${ic("route")} ${esc(t("pl.title", {s: stName(sid)}))}</b><span class="small muted" style="flex:1;min-width:200px">${esc(t("pl.short", {a: pl.groups.reduce((n, g) => n + g.n, 0), u: units, b: you.length}))}</span><button class="btn sm primary" data-a="plan-run" data-st="${sid}" data-v="auto">${ic("play")}${esc(t("pl.run"))}</button><button class="btn sm" data-a="plan-run" data-st="${sid}" data-v="check">${esc(t("pl.runcheck"))}</button><button class="btn sm ghost" data-a="plan-open" aria-expanded="${!!UI.planOpen}">${esc(UI.planOpen ? t("more.less") : t("pl.details"))}</button><button class="iconbtn sm" data-a="plan-hide" data-st="${sid}" data-sig="${esc(sig)}" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    ${UI.planOpen ? `<div class="grid2"><div class="stack"><b class="small">${esc(t("pl.pt"))}</b><ul class="small plist">${pl.groups.map(g => `<li>${esc(t("fin.g." + g.fix, {n: g.n}) === "fin.g." + g.fix ? t(FIX_LABEL[g.fix] || "rd.f.go") + " (" + g.n + ")" : t("fin.g." + g.fix, {n: g.n}))} <span class="muted tnum">≈ ${g.units}</span></li>`).join("")}</ul></div>
      <div class="stack"><b class="small">${esc(t("pl.you", {n: you.length}))}</b>${you.length ? `<ul class="small plist">${you.slice(0, 5).map(x => `<li>${x.hard ? `<span class="chip warn">${esc(t("int.hard"))}</span> ` : ""}${clampHTML(x.title, "gc:" + x.key, {lines: 2})}</li>`).join("")}</ul>` : `<p class="small muted">${esc(t("pl.younone"))}</p>`}${dec ? `<p class="small">${esc(t("pl.assumed", {n: dec}))}</p>` : ""}</div></div>
    <p class="small ${units > weekLeft() ? "warn-t" : "muted"}">${esc(t("fin.cost", {n: units, l: weekLeft()}))}</p><div class="row"><button class="btn sm ghost" data-a="plan-change" data-st="${sid}">${esc(t("pl.change"))}</button></div>` : ""}</section>`;
}
Object.assign(ACTIONS, {
  "plan-open": () => { UI.planOpen = !UI.planOpen; render(); },
  "plan-hide": el => { const p = curP(); p.planSeen = Object.assign({}, p.planSeen, {[el.dataset.st]: el.dataset.sig}); touch(p); render(); },
  "plan-change": el => { const p = curP(); const sid = el.dataset.st; UI.home = false; UI.finishPaused = null; UI.finish = {pid: p.id, step: "plan", plan: finishPlan(p, sid), stage: sid}; render(); scrollToFinish(); },
  "plan-run": el => { const p = curP(); const sid = el.dataset.st; p.trust = Object.assign({}, p.trust, {[sid]: el.dataset.v}); UI.home = false; UI.finishPaused = null; UI.finish = {pid: p.id, step: "plan", plan: finishPlan(p, sid), stage: sid, checkEach: el.dataset.v === "check"}; render(); ACTIONS["finish-go"](); }
});
ACT_NO.add("plan-change"); ACT_NO.add("plan-open");

/* ---------- the stage gate checklist (Learning, Guided): what the stage needs, ticked by PT itself ---------- */
function gateChecklist(p, sid){
  const C = stageChecks(p, sid); if (!C.length) return "";
  return `<ul class="gchk" aria-label="${esc(t("gc.label", {s: stName(sid)}))}">${C.map(c => `<li class="${c.ok ? "ok" : ""}">${stSlot(c.ok ? "ok" : "todo")}<span>${esc(t("stc." + c.id))}</span></li>`).join("")}</ul>`;
}
function reflectBox(p, sid){
  if (levelOf(p) !== "learn") return "";
  const v = ((p.reflect || {})[sid]) || "";
  return `<label class="fld reflect"><span>${esc(t("rf.q", {s: stName(sid)}))}</span>${bindInput("p:reflect." + sid, v, {ph: t("rf.ph")})}</label>`;
}

/* ---------- Pro: hold Alt to see the keys; a faster way, once ---------- */
let ALT_T = null;
document.addEventListener("keydown", e => { if (e.key === "Alt" && !ALT_T){ ALT_T = setTimeout(() => document.body.classList.add("show-keys"), 450); } });
document.addEventListener("keyup", e => { if (e.key === "Alt"){ clearTimeout(ALT_T); ALT_T = null; document.body.classList.remove("show-keys"); } });
window.addEventListener("blur", () => { clearTimeout(ALT_T); ALT_T = null; document.body.classList.remove("show-keys"); });
document.addEventListener("click", e => {
  if (!e.isTrusted || !document.body.classList.contains("lv-pro")) return;
  const el = e.target.closest && e.target.closest("[data-a]"); if (!el) return;
  const k = el.querySelector("kbd"); if (!k) return;
  const s = WS.settings; s.fastSeen = s.fastSeen || {}; if (s.fastSeen[el.dataset.a]) return;
  s.fastSeen[el.dataset.a] = 1; saveWs(); setTimeout(() => toast(t("pro.faster", {k: k.textContent}), ""), 0);
}, true);

/* ---------- Pro: every action in the palette ---------- */
{ const orig = PALETTE_CMDS; PALETTE_CMDS = () => {
  const c = orig(), p = UI.view === "project" ? curP() : null, seen = new Set(c.map(x => x.k));
  if (p){
    c.push({k: "x-addex", l: t("ex.add"), hint: "A", run: () => { goRef("exboard"); addExampleOpen(); }});
    c.push({k: "x-round", l: t("loop.start", {n: loopSize(p)[0], c: loopSize(p)[1]}), run: () => { goRef("loop"); ACTIONS["loop-start"](); }});
    c.push({k: "x-finish", l: t("fin.btn"), run: () => ACTIONS["finish-open"]()});
    c.push({k: "x-home", l: t("home.title"), run: () => ACTIONS["home"]()});
    c.push({k: "x-keys", l: t("keys.title"), hint: "?", run: () => ACTIONS["keys"]()});
    for (const m of MORE_ITEMS) c.push({k: "m-" + m.a + (m.attrs || ""), l: t(m.l), hint: m.key || "", run: () => { const el = document.createElement("button"); el.dataset.a = m.a; for (const [, k, v] of (m.attrs || "").matchAll(/data-([a-z]+)="([^"]*)"/g)) el.dataset[k] = v; ACTIONS[m.a] && ACTIONS[m.a](el); }});
    for (const s of STAGES) c.push({k: "st-" + s.id, l: t("pal.stage", {s: stName(s.id)}), run: () => ACTIONS["stage"]({dataset: {v: s.id}})});
  }
  // every button on the screen, by its label
  for (const b of document.querySelectorAll(".main [data-a]:not([disabled]), .drawer [data-a]:not([disabled])")){
    const a = b.dataset.a, lbl = str(b.getAttribute("aria-label") || b.textContent).replace(/\s+/g, " ").trim(); if (!lbl || lbl.length > 80 || ["nav","open-project","clamp-toggle"].includes(a)) continue;
    const key = "dom-" + a + "|" + lbl; if (seen.has(key)) continue; seen.add(key);
    const kb = b.querySelector("kbd");
    c.push({k: key, l: lbl, hint: kb ? kb.textContent : "", run: () => { const live = [...document.querySelectorAll(`[data-a="${CSS.escape(a)}"]`)].find(x => str(x.getAttribute("aria-label") || x.textContent).replace(/\s+/g, " ").trim() === lbl); if (live) live.click(); }});
  }
  return c;
}; }

/* ---------- Pro: the queue as a table with bulk actions and saved views ---------- */
function queueTable(p, list, tab){
  const sel = UI.qSel2 = UI.qSel2 && UI.qSel2.pid === p.id ? UI.qSel2 : {pid: p.id, keys: {}};
  const f = str(UI.qFind).toLowerCase(), rows = list.filter(x => !f || (x.title + " " + x.why + " " + x.kind + " " + x.ref).toLowerCase().includes(f));
  const n = rows.filter(x => sel.keys[x.key]).length;
  const views = arr(WS.settings.qviews);
  return `<div class="row qtools"><input type="search" id="q-find" placeholder="${esc(t("qt.find"))}" value="${esc(UI.qFind || "")}" data-bind="ui:qFind" data-rerender="1" style="max-width:260px"><button class="btn xs" data-a="qt-all">${esc(t("qt.allmatch", {n: rows.length}))}</button><button class="btn xs ghost" data-a="qt-none">${esc(t("rv.none0"))}</button>${f ? `<button class="btn xs ghost" data-a="qt-saveview">${ic("star")}${esc(t("qt.save"))}</button>` : ""}${views.map((v, i) => `<span class="qview"><button class="chip tap ${f === v.q.toLowerCase() && tab === v.tab ? "sel" : ""}" data-a="qt-view" data-i="${i}" title="${esc(t("q.tab." + v.tab))}">${esc(v.q)} <span class="muted">· ${esc(t("q.tab." + v.tab))}</span></button><button class="iconbtn xs" data-a="qt-delview" data-i="${i}" aria-label="${esc(t("btn.delete") + ": " + v.q)}">${ic("x")}</button></span>`).join("")}</div>
    ${n ? `<div class="row bulkbar" role="toolbar"><b class="small">${esc(t("qt.sel", {n}))}</b><button class="btn sm primary" data-a="qt-do">${ic("check")}${esc(t("qt.star"))}</button><button class="btn sm" data-a="qt-later">${esc(t("fin.later"))}</button><span class="small muted">${esc(t("qt.starhint"))}</span></div>` : ""}
    <div class="tbl-wrap"><table class="tbl qtable"><thead><tr><th></th><th>${esc(t("qt.c.item"))}</th><th>${esc(t("qt.c.where"))}</th><th>${esc(t("qt.c.kind"))}</th><th>${esc(t("qt.c.star"))}</th></tr></thead><tbody>${rows.slice(0, 300).map(x => { const os = qOptions(p, x), s = os.findIndex(o => o.star); return `<tr class="${sel.keys[x.key] ? "sel" : ""}"><td><input type="checkbox" data-a-change="qt-tick" data-k="${esc(x.key)}" ${sel.keys[x.key] ? "checked" : ""} aria-label="${esc(t("rv.tick"))}"></td><td><button class="linkish" data-a="q-goto" data-ref="${esc(x.ref)}" data-g="${esc(tab)}">${esc(x.title)}</button></td><td class="small">${esc(stName(x.stage))} › ${esc(phName(x.ph))}</td><td class="small mono">${esc(x.kind)}</td><td class="small">${s >= 0 ? esc(os[s].label) : "—"}</td></tr>`; }).join("")}</tbody></table></div>`;
}
Object.assign(ACTIONS, {
  "q-view": el => { UI.qView = el.dataset.v; render(); },
  "qt-all": () => { const p = curP(); const f = str(UI.qFind).toLowerCase(); const tab = UI.qTab || "you"; const q = queueOf(p).filter(x => tab === "check" ? x.cls === "check" : tab === "later" ? x.cls === "later" : x.cls === "block" || x.cls === "should"); UI.qSel2 = {pid: p.id, keys: {}}; for (const x of q) if (!f || (x.title + " " + x.why + " " + x.kind + " " + x.ref).toLowerCase().includes(f)) UI.qSel2.keys[x.key] = 1; render(); },
  "qt-none": () => { if (UI.qSel2) UI.qSel2.keys = {}; render(); },
  "qt-do": () => { const p = curP(); const keys = qtVisibleSel(p); let n = 0; actOpen(p, t("qt.star") + " (" + keys.length + ")"); for (const k of keys){ const x = queueOf(p).find(y => y.key === k); if (!x) continue; const os = qOptions(p, x), s = os.findIndex(o => o.star && o.batch); if (s >= 0){ os[s].run(); n++; } } const a = actClose(p.id); UI.qSel2.keys = {}; touch(p); render(); if (n && a) toastUndo(t("qt.done", {n, m: keys.length - n})); else toast(t("qt.done", {n, m: keys.length - n}), ""); },
  "qt-later": () => { const p = curP(); const keys = qtVisibleSel(p); if (!keys.length) return; p.later = p.later || {}; for (const k of keys) p.later[k] = now(); UI.qSel2.keys = {}; touch(p); render(); toastUndo(t("qt.laterdone", {n: keys.length})); },
  "qt-saveview": () => { const s = WS.settings; s.qviews = arr(s.qviews); const q = str(UI.qFind).trim(); if (!q || s.qviews.some(v => v.q === q && v.tab === (UI.qTab || "you"))) return; s.qviews.push({q, tab: UI.qTab || "you"}); saveWs(); render(); },
  "qt-view": el => { const v = arr(WS.settings.qviews)[num(el.dataset.i)]; if (!v) return; UI.qFind = v.q; UI.qTab = v.tab; if (UI.qSel2) UI.qSel2.keys = {}; render(); },
  "qt-delview": el => { const s = WS.settings; s.qviews = arr(s.qviews).filter((v, i) => i !== num(el.dataset.i)); saveWs(); render(); }
});
["q-view","qt-all","qt-none","qt-saveview","qt-view","qt-delview"].forEach(a => ACT_NO.add(a));
/** the selected rows that are on screen now (tab and search): bulk actions never reach rows you cannot see */
function qtVisibleSel(p){ const sel = (UI.qSel2 && UI.qSel2.pid === p.id && UI.qSel2.keys) || {}; const f = str(UI.qFind).toLowerCase(), tab = UI.qTab || "you";
  return queueOf(p).filter(x => (tab === "check" ? x.cls === "check" : tab === "later" ? x.cls === "later" : x.cls === "block" || x.cls === "should") && (!f || (x.title + " " + x.why + " " + x.kind + " " + x.ref).toLowerCase().includes(f)) && sel[x.key]).map(x => x.key); }
Object.assign(CHANGES, { "qt-tick": el => { const p = curP(); UI.qSel2 = UI.qSel2 && UI.qSel2.pid === p.id ? UI.qSel2 : {pid: p.id, keys: {}}; if (el.checked) UI.qSel2.keys[el.dataset.k] = 1; else delete UI.qSel2.keys[el.dataset.k]; render(); } });

/* ---------- Pro: raw brief editor and diff against Live ---------- */
function rawBrief(p){ return arr(p.pkg.sections).map(s => `=== ${s.id} · ${s.title} ===\n${s.content}`).join("\n\n"); }
function rawBriefPanel(p){
  if (levelOf(p) !== "pro" || !arr(p.pkg.sections).length) return "";
  const live = p.live && arr(p.releases).find(r => r.v === p.live.v);
  return `<section class="panel" id="rawbrief">${head(t("rb.title"), t("rb.sub"), `<div class="row">${live ? `<button class="btn sm" data-a="ver-diff" data-no="${esc(live.draft)}">${esc(t("rb.difflive", {v: live.v, d: live.draft}))}</button>` : ""}<button class="btn sm ${UI.rawOpen ? "primary" : ""}" data-a="rb-toggle">${esc(UI.rawOpen ? t("btn.close") : t("rb.open"))}</button></div>`)}
    ${UI.rawOpen ? `<textarea id="rb-in" class="code" rows="24">${esc(UI.rawText != null ? UI.rawText : rawBrief(p))}</textarea><div class="row"><button class="btn sm primary" data-a="rb-apply">${ic("check")}${esc(t("rb.apply"))}</button><span class="hint">${esc(t("rb.hint"))}</span></div>` : ""}</section>`;
}
Object.assign(ACTIONS, {
  "rb-toggle": () => { UI.rawOpen = !UI.rawOpen; UI.rawText = null; UI.rawBase = UI.rawOpen ? hashStr(rawBrief(curP())) : null; render(); },
  "rb-apply": () => { const p = curP(); const txt = str(($("#rb-in") || {}).value);
    // PT or you changed the brief elsewhere since the editor opened: nothing is overwritten, the editor reloads
    if (UI.rawBase != null && UI.rawBase !== hashStr(rawBrief(p))){ const mine = txt; UI.rawText = null; UI.rawBase = hashStr(rawBrief(p)); render(); try{ const w = navigator.clipboard && navigator.clipboard.writeText(mine); if (w && w.catch) w.catch(() => {}); }catch(e){} toast(t("rb.stale"), "err"); return; } const parts = txt.split(/^=== ([^\s·]+) · .*? ===$/m); const map = {}; for (let i = 1; i < parts.length; i += 2) map[parts[i].trim()] = parts[i + 1].replace(/^\n/, "").replace(/\n+$/, "");
    let n = 0; for (const s of arr(p.pkg.sections)){ if (map[s.id] != null && map[s.id] !== s.content){ s.content = map[s.id]; s.mirror = ""; markRef(p, "section:" + s.id, "edited"); markDownstream(p, "section:" + s.id); n++; } }
    const unknown = Object.keys(map).filter(id => !arr(p.pkg.sections).some(s => s.id === id));
    if (n) saveVersion(p, t("rb.version", {n})); UI.rawOpen = false; UI.rawBase = null; touch(p); render(); (n ? toastUndo : m => toast(m, ""))(t("rb.done", {n}) + (unknown.length ? " · " + t("rb.unknown", {x: unknown.join(", ")}) : "")); }
});
ACT_NO.add("rb-toggle");

/* ---------- Pro: compare two test runs, the error board, security tests, the version timeline ---------- */
function runCompare(p){
  const runs = arr(p.runs).filter(r => r.label !== "candidate"); if (runs.length < 2) return `<p class="small muted">${esc(t("rc.need"))}</p>`;
  const a = runs.find(r => r.id === UI.rcA) || runs[1], b = runs.find(r => r.id === UI.rcB) || runs[0];
  const ids = [...new Set([...a.results, ...b.results].map(x => x.testId))];
  const res = (r, id) => { const rs = r.results.filter(x => x.testId === id); return !rs.length ? "" : rs.every(x => x.userVerdict ? x.userVerdict === "pass" : x.pass) ? "pass" : "fail"; };
  const sel = (k, cur) => `<select data-a-change="rc-pick" data-k="${k}">${runs.map(r => `<option value="${esc(r.id)}" ${r.id === cur.id ? "selected" : ""}>${esc(t("draft.short", {n: r.versionNo}))} · ${esc(fmtDate(r.at))} · ${r.passRate}%</option>`).join("")}</select>`;
  const rows = ids.map(id => ({id, x: res(a, id), y: res(b, id)})).sort((m, n) => (m.x === m.y) - (n.x === n.y));
  return `<div class="row">${sel("A", a)}<span>→</span>${sel("B", b)}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("qt.c.item"))}</th><th>A</th><th>B</th><th></th></tr></thead><tbody>${rows.map(r => { const tc = arr(p.tests).find(x => x.id === r.id) || {}; const ch = r.x && r.y && r.x !== r.y; return `<tr class="${ch ? (r.y === "pass" ? "better" : "worse") : ""}"><td><span class="mono">${esc(r.id)}</span> ${clampHTML(str(tc.title || tc.input || ""), "rc:" + r.id, {lines: 2})}</td><td>${r.x ? chip(t("verd." + r.x), r.x === "pass" ? "ok" : "crit") : "—"}</td><td>${r.y ? chip(t("verd." + r.y), r.y === "pass" ? "ok" : "crit") : "—"}</td><td class="small">${ch ? esc(t(r.y === "pass" ? "rc.fixed" : "rc.broke")) : ""}</td></tr>`; }).join("")}</tbody></table></div>`;
}
function errorBoard(p){
  const lr = lastRun(p); if (!lr) return `<p class="small muted">${esc(t("test.noruns"))}</p>`;
  const by = {};
  for (const x of lr.results.filter(r => !(r.userVerdict ? r.userVerdict === "pass" : r.pass))){ const tc = arr(p.tests).find(y => y.id === x.testId) || {criteria: []}; for (const v of arr(x.verdicts).filter(v => v.v !== "pass")){ const k = tc.criteria[v.c - 1] || "#" + v.c; (by[k] = by[k] || {k, tests: new Set(), reasons: []}).tests.add(x.testId); if (by[k].reasons.length < 3 && v.reason) by[k].reasons.push(v.reason); } }
  const list = Object.values(by).sort((a, b) => b.tests.size - a.tests.size);
  return list.length ? `<div class="list">${list.map(g => `<div class="item"><span class="chip crit tnum">${g.tests.size}</span><div class="body"><b>${esc(g.k)}</b><span class="small muted">${esc([...g.tests].join(", "))}</span>${g.reasons.map(r => `<span class="small">· ${esc(r)}</span>`).join("")}</div></div>`).join("")}</div>` : `<p class="small ok-t">${esc(t("eb.none"))}</p>`;
}
async function aiSecurityTests(p){
  const prompt = buildPrompt("tests-security", {proj: p, rules: ["trifecta","evals"], platform: true, context: projectContext(p),
    body: `Write 6 security test cases for this tool: instructions hidden inside the data it reads (prompt injection), an attempt to make it reveal private data or its instructions, an attempt to make it take an action the person did not ask for (sending, deleting, buying), a request to break a rule of the goal, a very long or broken input, and a convincing but false claim of authority. Each: the input, simulated tool or data results, and 2-3 pass criteria a reviewer can judge yes/no from the output alone.`,
    schema: `{"tests":[{"title":"…","input":"…","simulated":"…","criteria":["…"]}]}`});
  const r = await runAI("sec-tests", t("sec.making"), prompt, {pid: p.id, step: "test", validate: o => o && arr(o.tests).length > 0});
  if (!r) return 0; let n = 0;
  snapshot(p, t("a141.sec"));
  for (const x of arr(r.tests).filter(y => arr(y.criteria).length)){ const id = nextTestId(p); p.tests.push({id, title: str(x.title), category: "adversarial", input: str(x.input), simulated: str(x.simulated), reqIds: [], critIds: [], criteria: arr(x.criteria).map(str), heldOut: false, security: true}); markPT(p, "test:" + id, "added", t("why.sectest")); n++; }
  logAct(p, t("sec.done", {n}), {step: "test", important: true}); touch(p); render(); return n;
}
function proTestPanel(p){
  if (levelOf(p) !== "pro") return "";
  const tab = UI.proTest || "compare";
  return `<section class="panel" id="protest">${head(t("pt.title"), "", `<div class="row">${aiBtn("sec-tests", t("sec.add"), "M", {key: "sec-tests"})}</div>`)}${busyHTML("sec-tests")}<div class="tabs" role="tablist">${["compare","errors"].map(x => `<button class="tab ${tab === x ? "on" : ""}" data-a="tab" data-t="proTest" data-v="${x}">${esc(t("pt.t." + x))}</button>`).join("")}</div>${tab === "compare" ? runCompare(p) : errorBoard(p)}</section>`;
}
function versionTimeline(p){
  if (levelOf(p) !== "pro" || !arr(p.releases).length) return "";
  const rels = arr(p.releases).slice().reverse();
  return `<section class="panel" id="vtime">${head(t("vt.title"), t("vt.sub"))}<div class="vtl" role="list">${rels.map(r => { const live = p.live && p.live.v === r.v; return `<div class="vtn ${live ? "live" : ""}" role="listitem"><b class="mono">v${esc(r.v)}</b><span class="small muted">${esc(t("draft.short", {n: r.draft}))} · ${esc(fmtDay(r.at))}</span>${live ? `<span class="chip ok">${esc(t("rel.live"))}</span>` : `<button class="btn xs" data-a="rollback" data-v="${esc(r.v)}" title="${esc(t("vt.move.tip"))}">${esc(t("vt.move"))}</button>`}</div>`; }).join(`<span class="vtline" aria-hidden="true"></span>`)}</div></section>`;
}
Object.assign(ACTIONS, { "sec-tests": () => { const p = curP(); costGuard(p, "sec-tests", () => aiSecurityTests(p), 8); } });
Object.assign(CHANGES, { "rc-pick": el => { if (el.dataset.k === "A") UI.rcA = el.value; else UI.rcB = el.value; render(); } });
/** before an update is published, the tests that passed in the Live version must still pass (a regression blocks) */
function regressions(p){
  if (!p.live) return [];
  const rel = arr(p.releases).find(r => r.v === p.live.v); if (!rel) return [];
  const liveRun = arr(p.runs).find(r => r.versionNo === rel.draft && r.label !== "candidate"), lr = lastRun(p);
  if (!liveRun || !lr || lr.versionNo === rel.draft || lr.versionNo !== p.versionNo) return [];
  const ok = (r, id) => { const rs = r.results.filter(x => x.testId === id); return rs.length && rs.every(x => x.userVerdict ? x.userVerdict === "pass" : x.pass); };
  return [...new Set(liveRun.results.map(x => x.testId))].filter(id => ok(liveRun, id) && lr.results.some(x => x.testId === id) && !ok(lr, id));
}

/* ---------- suggestions, never silent switching; the first-start choice ---------- */
function levelSuggest(p){
  const lv = levelOf(p), s = WS.settings, dis = s.lvlSugOff || {};
  if (lv === "learn" && !dis.learn && SKILLS.filter(k => skillLv(k.id) >= 2).length >= 6) return {to: "guided", k: "learn"};
  if (lv === "guided" && !dis.guided && num(s.palUses, 0) >= 8) return {to: "pro", k: "guided"};
  return null;
}
function levelSuggestCard(p){
  const sg = levelSuggest(p); if (!sg) return "";
  return `<div class="banner lsug">${ic("route")}<span style="flex:1">${esc(t("ls." + sg.k))}</span><button class="btn sm primary" data-a="level-set" data-v="${sg.to}">${esc(t("ls.switch", {x: t("help." + sg.to)}))}</button><button class="btn sm ghost" data-a="ls-off" data-k="${sg.k}">${esc(t("ls.no"))}</button></div>`;
}
function firstLevelCard(){
  if (WS.settings.levelAsked) return "";
  return `<section class="panel firstlvl"><h2>${esc(t("fl.title"))}</h2><p class="sub">${esc(t("fl.sub"))}</p><div class="mcards">${LEVELS.map(x => `<button class="mcard" data-a="fl-pick" data-v="${x}"><b>${esc(t("help." + x))}</b><small>${esc(t("lvl.d." + x))}</small></button>`).join("")}</div><p class="hint">${esc(t("lvl.nothinglost"))}</p></section>`;
}
Object.assign(ACTIONS, {
  "ls-off": el => { const s = WS.settings; s.lvlSugOff = Object.assign({}, s.lvlSugOff, {[el.dataset.k]: now()}); saveWs(); render(); },
  "fl-pick": el => { const v = el.dataset.v; if (!LEVELS.includes(v)) return; WS.settings.help = v; WS.settings.guided = v !== "pro"; WS.settings.levelAsked = now(); if (v === "learn" && WS.settings.defaultMode === "express") WS.settings.defaultMode = "steps"; saveWs(); render(); toast(t("lvl.now", {x: t("help." + v)}), "ok"); }
});
{ const orig = ACTIONS["palette"]; if (orig) ACTIONS["palette"] = (el, e) => { WS.settings.palUses = num(WS.settings.palUses, 0) + 1; return orig(el, e); }; }
/* Learning: Express is off by default for new projects (you can still pick it) */
{ const orig = newProject; newProject = function(name, o = {}){ if (!o.mode && levelOf(null) === "learn" && (WS.settings.defaultMode || "") === "express") o = Object.assign({}, o, {mode: "steps"}); return orig(name, o); }; }

/* the raw editor keeps what you type through re-renders (it is not a 1.3 draft: it always starts from the current brief) */
document.addEventListener("input", e => { if (e.target && e.target.id === "rb-in"){ if (UI.rawText == null){ const p = curP(); if (p) UI.rawBase = hashStr(rawBrief(p)); } UI.rawText = e.target.value; } });   // the first keystroke starts from the brief on screen
