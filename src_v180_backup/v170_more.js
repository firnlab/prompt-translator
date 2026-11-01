/* ===================== 1.7.0 SHOW DON'T DESCRIBE · THE DESIGN PASS · LEARN FROM USE · PT HEALTH · KIT DEFAULTS =====================
   Decided with the owner on 25 Oct 2026.
   - Tappable mock (Try page): a clickable HTML mock of the tool in a phone frame, from the first version; "yes, that's it" is a decision,
     "no, like this" regenerates with the note. Rendered in a sandboxed frame; nothing in it reaches PT.
   - The design pass (cover): one run — the picks PT can answer itself (marked as assumptions), the first version, the design, the review;
     stops at the decisions only the owner can make. One screen back: what PT assumed.
   - Learn from use (Run page): the collected run records and problem reports become proposals in the one queue.
   - PT health (Settings): what ran, what failed, usage, versions — local data only.
   - Kit defaults editable in Settings (sharing, AI inside, repository, media cap). */

/* ---------- the tappable mock ---------- */
COST_EST["mock"] = 8;
function mockOf(p){ return p.mock || null; }
async function aiMock(p, note = ""){
  const k = pickRead(p), tr = k.tried, home = (p.tool && p.tool.home) || {};
  const reqs = arr(p.requirements).slice(0, 25).map(r => `- ${r.id} ${r.title}: ${r.then}`).join("\n");
  const prev = p.mock && note ? `\n<previous_mock>\n${str(p.mock.html).slice(0, 6000)}\n</previous_mock>\n<what_the_person_said>${esc(note)}</what_the_person_said>` : "";
  const prompt = buildPrompt("mock", {proj: p, rules: ["simple"], platform: false, userLang: true, context: projectContext(p, {only: ["ns", "req", "arch"]}),
    body: `Make a tappable mock of this tool's main screens as ONE self-contained HTML document for a 390 px wide phone: real labels in the audience's language, the main path clickable (2 to 5 screens, switched with plain inline JavaScript that shows and hides sections), realistic sample content (no "lorem ipsum"), no external resources, no forms that submit, no links that leave the page. Keep the HTML under 12,000 characters. It lives in: ${str(home.where) || "an artifact page"}; parts: ${str(home.parts) || "—"}.\n<requirements>\n${reqs || "(none yet — use the goal)"}\n</requirements>${tr ? "\n<first_version_made>v" + tr.v + "</first_version_made>" : ""}${prev}`,
    schema: `{"html":"<!doctype html>…","screens":["name of each screen"],"note":"one line on what the mock shows and leaves out"}`});
  const r = await runAI("mock", t("mock.running"), prompt, {pid: p.id, step: "arch", validate: o => o && /<html|<body|<div|<section/i.test(str(o.html)) && str(o.html).length < 60000});
  if (!r) return null;
  snapshot(p, t("rp.before", {x: t("mock.title")}));
  p.mock = {html: str(r.html), screens: arr(r.screens).map(str), note: str(r.note), at: now(), v: (p.mock ? num(p.mock.v, 0) : 0) + 1, status: "open", notes: [...arr(p.mock && p.mock.notes), ...(note ? [note] : [])]};   // ok:field  mock persists with the project; snapshot before, Undo covers the decision (e2e17 part 12)
  touch(p); render();
  return p.mock;
}
function mockQueue(p, add){
  const m = mockOf(p); if (!m || m.status !== "open") return;
  add({kind: "mock", ref: "mock", ph: "require", cls: "should", who: "you", hard: false, title: t("mock.q", {v: m.v}), why: t("mock.q.why")});
}
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); mockQueue(p, add); }; }
{ const orig = qOptions; qOptions = function(p, x){
    if (x && x.kind === "mock"){ const m = mockOf(p); if (!m) return [];
      return [{label: t("mock.yes"), star: true, why: t("mock.yes.why"), run: () => mockDecide(p, true)}, {label: t("mock.no"), why: t("mock.no.why"), run: () => { UI.mockNote = p.id; render(); }, opens: true}]; }
    return orig(p, x); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ return ref === "mock" ? t("mock.title") : orig(p, ref, full); }; }
function mockDecide(p, yes, note = ""){
  const m = mockOf(p); if (!m) return;
  actOpen(p, t(yes ? "mock.act.yes" : "mock.act.no"));
  m.status = yes ? "ok" : "no"; if (note) m.notes = [...arr(m.notes), note];
  logDecision(p, t("mock.title") + " v" + m.v, yes ? t("mock.yes") : t("mock.no") + (note ? ": " + note : ""), t("mock.dec.why"));
  markRef(p, "mock", "decided"); touch(p); actCloseSoon(p.id);
}
function mockCard(p){
  const m = mockOf(p), k = pickRead(p);
  const can = !!((str(p.northStar.goal).trim() || str(p.intake.raw).trim()) && (arr(p.requirements).length || k.tried));
  const frame = m ? `<div class="mock-phone"><iframe class="mock-frame" sandbox="allow-scripts" referrerpolicy="no-referrer" title="${esc(t("mock.title"))}" srcdoc="${esc(m.html)}"></iframe></div>` : "";
  const noteBox = UI.mockNote === p.id ? `<form class="stack mock-note" data-form="mock-note"><label class="fld"><span>${esc(t("mock.no.label"))}</span><textarea id="mock-note-in" rows="3" placeholder="${esc(t("mock.no.ph"))}"></textarea></label><div class="row"><button class="btn sm primary ai" type="submit" data-cost="${esc(t("cost.m"))}">${ic("spark")}${esc(t("mock.redo"))}</button><button class="btn sm ghost" type="button" data-a="mock-note-close">${esc(t("btn.cancel"))}</button></div></form>` : "";
  return `<section class="panel pg-mock" data-anchor="mock"><div class="row"><h3 style="flex:1 1 12em">${ic("play")} ${esc(t("mock.title"))}</h3>${m ? `<span class="small muted">v${m.v} · ${esc(fmtDate(m.at))}${m.status === "ok" ? " · " + esc(t("mock.st.ok")) : m.status === "no" ? " · " + esc(t("mock.st.no")) : ""}</span>` : ""}${can ? aiBtn("mock", t(m ? "mock.again" : "mock.go"), "M", {key: "mock", primary: !m}) : ""}</div>
    <p class="small muted">${esc(can ? t("mock.sub") : t("mock.needs"))}</p>${busyHTML("mock")}
    ${m ? `${frame}${m.note ? `<p class="small">${esc(m.note)}</p>` : ""}<div class="row">${m.status === "open" ? `<button class="btn primary" data-a="mock-yes">${ic("check")}${esc(t("mock.yes"))}</button><button class="btn" data-a="mock-note-open">${ic("edit")}${esc(t("mock.no"))}</button>` : `<button class="btn sm ghost" data-a="mock-reopen">${esc(t("mock.reopen"))}</button>`}${m.screens.length ? `<span class="small muted">${esc(t("mock.screens", {x: m.screens.join(" · ")}))}</span>` : ""}</div>${noteBox}` : noteBox}</section>`;
}
Object.assign(ACTIONS, {
  "mock": () => { const p = curP(); if (p) return costGuard(p, "mock", () => aiMock(p)); },
  "mock-yes": () => { const p = curP(); if (!p) return; mockDecide(p, true); render(); toastUndo(t("mock.yes")); },
  "mock-note-open": () => { UI.mockNote = UI.pid; render(); setTimeout(() => { const i = document.getElementById("mock-note-in"); if (i) i.focus(); }, 50); },
  "mock-note-close": () => { UI.mockNote = null; render(); },
  "mock-reopen": () => { const p = curP(); if (!p || !p.mock) return; actOpen(p, t("mock.title")); p.mock.status = "open"; touch(p); actCloseSoon(p.id); render(); }
});
for (const a of ["mock-note-open", "mock-note-close"]) ACT_NO.add(a);
FORMS["mock-note"] = async f => { const p = curP(); if (!p) return; const i = f.querySelector("#mock-note-in"); const note = str(i && i.value).trim(); if (!note){ toast(t("acc.need"), "err"); return; } UI.mockNote = null; mockDecide(p, false, note); render(); return costGuard(p, "mock", () => aiMock(p, note)); };

/* ---------- the design pass ---------- */
function passCost(p){ const k = pickRead(p); return 8 + (k.tried ? 0 : pickTryCost(p)) + (arr(p.arch.components).length ? 0 : 8) + (p.seal.review ? 0 : LENSES.length * TIER_WEIGHT.complex); }
async function designPass(p){
  const P = UI.pass = {pid: p.id, at: now(), assumed: [], steps: [], stop: ""};
  const step = (id, st) => { P.steps.push({id, st}); render(); };
  try{
    if (!str(p.northStar.goal).trim() && !str(p.intake.raw).trim()){ P.stop = t("pass.stop.idea"); return P; }
    // 1. the picks: PT answers what has a recommendation and is not a hard decision; hard ones stay for the owner
    for (let round = 0; round < 3; round++){
      let k = pickRead(p);
      if (!k.log.length && !k.cards.length) await aiPickNext(p, {n: 3});   // ok:undo  every step of the pass records its own actions
      else if (pickGaps(p).length) await aiPickNext(p, {n: 3, need: pickGaps(p)});   // ok:undo  see above
      for (const c of pickOpenCards(p)){ if (c.hard || c.rec == null || c.rec < 0 || !arr(c.options)[c.rec]) continue; const e = pickAnswer(p, c.id, {keys: [c.options[c.rec].k], assumed: true}); if (e) P.assumed.push({q: c.q, a: c.options[c.rec].label}); }
      k = pickRead(p);
      if (!pickGaps(p).length) break;
    }
    step("picks", "done");
    const ready = pickReady(p);
    if (!ready.every(x => x.ok)){ P.stop = t("pass.stop.ready", {x: ready.filter(x => !x.ok).map(x => t("pk.r." + x.id)).join(", ")}); return P; }
    // 2. the first version
    if (!pickRead(p).tried){ await pickTry(p); step("try", pickRead(p).tried ? "done" : "failed"); if (!pickRead(p).tried){ P.stop = t("pass.stop.try"); return P; } }
    else step("try", "done");
    // 3. the design
    if (!arr(p.arch.components).length){ await aiArchitecture(p); step("design", arr(p.arch.components).length ? "done" : "failed"); } else step("design", "done");   // ok:undo  see above
    // 4. the review
    if (!p.seal.review || p.seal.review !== p.versionNo){ await aiReview(p, LENSES.map(l => l.id)); step("review", p.seal.review ? "done" : "failed"); } else step("review", "done");   // ok:undo  see above
    P.done = true;
  }catch(e){ P.stop = str(e && e.message); onAppError(e && e.message, "designPass"); }
  finally{ P.endAt = now(); touch(p); UI.home = true; render(); }
  return P;
}
function passCard(p){
  const P = UI.pass && UI.pass.pid === p.id ? UI.pass : null;
  const running = P && !P.endAt;
  const hard = queueOf(p).filter(x => youOpen(x) && x.hard).length;
  const head0 = `<div class="row"><h3 style="flex:1 1 12em">${ic("bolt")} ${esc(t("pass.title"))}</h3>${running ? `<span class="small">${esc(t("pass.running"))}</span>` : aiBtn("design-pass", t(P ? "pass.again" : "pass.go"), "H", {key: "pass"})}</div>`;
  const steps = P ? `<div class="row" style="gap:6px;flex-wrap:wrap">${["picks", "try", "design", "review"].map(id => { const s = P.steps.find(x => x.id === id); return `<span class="chip ${s ? (s.st === "done" ? "st-ok" : "st-bad") : ""}">${s ? (s.st === "done" ? ic("check") : "✕") : "○"} ${esc(t("pass.s." + id))}</span>`; }).join("")}</div>` : "";
  const after = P && P.endAt ? `<div class="stack" style="gap:4px">${P.stop ? `<p class="small warn-t">${esc(P.stop)}</p>` : `<p class="small">${esc(t("pass.done", {n: P.assumed.length, h: hard}))}</p>`}${P.assumed.length ? `<details><summary class="small">${esc(t("pass.assumed", {n: P.assumed.length}))}</summary><ul class="small">${P.assumed.map(a => `<li><b>${esc(a.q)}</b> → ${esc(a.a)} <button class="btn xs ghost" data-a="q-tab" data-v="check">${esc(t("btn.change"))}</button></li>`).join("")}</ul></details>` : ""}</div>` : `<p class="small muted">${esc(t("pass.sub"))}</p>`;
  return `<section class="panel pg-pass" data-anchor="pass">${head0}${steps}${after}${busyHTML("pass")}</section>`;
}
ACTIONS["design-pass"] = () => { const p = curP(); if (p) return costGuard(p, "pass", () => designPass(p), passCost(p)); };
COST_EST["pass"] = 40;

/* ---------- learn from use ---------- */
function learnGroups(p){
  const items = arr(p.inbox).filter(i => !i.done && i.ok === false && (i.src === "run" || i.src === "auto") && factAge(i.at) <= 14);
  const G = {}; for (const i of items){ const key = str(i.title).toLowerCase().replace(/[0-9]+/g, "#").replace(/\s+/g, " ").slice(0, 60); (G[key] = G[key] || {key, title: i.title, items: []}).items.push(i); }
  const groups = Object.values(G).filter(g => g.items.length >= 2).sort((a, b) => b.items.length - a.items.length);
  const kinds = arr(p.inbox).filter(i => !i.done && i.newKind && !i.learned);
  return {groups, kinds};
}
function learnQueue(p, add){
  if (!p.live) return;
  const L = learnGroups(p);
  for (const g of L.groups) add({kind: "learn", ref: "learn:" + g.key, ph: "operate", cls: "should", who: "you", title: t("learn.q", {n: g.items.length, x: trunc(g.title, 70)}), why: t("learn.q.why"), sim: "learn"});   // ok:trunc  the full lines are on the Run page
  for (const i of L.kinds) add({kind: "learn-kind", ref: "learnk:" + i.id, ph: "operate", cls: "should", who: "you", title: t("learn.kind", {x: trunc(i.kindNote || i.input, 70)}), why: t("learn.kind.why"), sim: "learnk"});   // ok:trunc  see above
}
{ const orig = kitQueue; kitQueue = function(p, add){ orig(p, add); learnQueue(p, add); }; }
{ const orig = qOptions; qOptions = function(p, x){
    if (x && x.kind === "learn"){ const g = learnGroups(p).groups.find(g => "learn:" + g.key === x.ref); if (!g) return [];
      return [{label: t("learn.o.req"), star: true, why: t("learn.o.reqwhy"), run: () => { actOpen(p, t("learn.act.req")); const rid = nextReqId(p); p.requirements.push({id: rid, title: trunc(g.title, 80), given: "the tool runs", when: str(g.items[0].input) || g.title, then: t("learn.o.reqthen"), priority: "must", dim: "guard", st: "assumed", manual: true, from: "use"}); for (const i of g.items){ i.done = true; i.learned = rid; } markRef(p, x.ref, "decided"); touch(p); actCloseSoon(p.id); }},   // ok:trunc  requirement title
        {label: t("learn.o.dismiss"), why: t("learn.o.dismisswhy"), run: () => { actOpen(p, t("learn.act.dismiss")); for (const i of g.items) i.done = true; markRef(p, x.ref, "decided"); touch(p); actCloseSoon(p.id); }}]; }
    if (x && x.kind === "learn-kind"){ const i = arr(p.inbox).find(i => "learnk:" + i.id === x.ref); if (!i) return [];
      return [{label: t("learn.o.test"), star: true, why: t("learn.o.testwhy"), run: () => { actOpen(p, t("learn.act.test")); p.tests.push({id: nextTestId(p), category: "edge", title: trunc(i.kindNote || i.input, 80), input: str(i.input), criteria: [t("learn.o.testcrit")], origin: "use", st: "assumed"}); i.learned = true; touch(p); markRef(p, x.ref, "decided"); actCloseSoon(p.id); }},   // ok:trunc  test title
        {label: t("learn.o.ignore"), why: t("learn.o.ignorewhy"), run: () => { actOpen(p, t("learn.act.ignore")); i.learned = true; markRef(p, x.ref, "decided"); touch(p); actCloseSoon(p.id); }}]; }
    return orig(p, x); }; }
{ const orig = refLabel; refLabel = function(p, ref, full = false){ if (str(ref).startsWith("learn:")) return t("learn.title"); if (str(ref).startsWith("learnk:")) return t("learn.kind.title"); return orig(p, ref, full); }; }
function learnCard(p){
  if (!p.live) return "";
  const L = learnGroups(p), n = arr(p.inbox).filter(i => !i.done).length;
  return `<section class="panel pg-learn" data-anchor="learn"><div class="row"><h3 style="flex:1 1 12em">${ic("brain")} ${esc(t("learn.title"))}</h3><span class="small muted">${esc(t("learn.sub", {n}))}</span>${btn("collect", t("op.collect"), {icon: "inbox", cls: "sm"})}</div>
    ${L.groups.length || L.kinds.length ? `<div class="list">${L.groups.map(g => `<div class="item">${stSlot("attn")}<div class="body"><b class="small">${esc(t("learn.q", {n: g.items.length, x: g.title}))}</b><span class="small muted">${esc(g.items.slice(0, 3).map(i => fmtDay(i.at) + (i.input ? " · " + trunc(i.input, 40) : "")).join(" · "))}</span></div><button class="btn xs" data-a="q-goto" data-ref="learn:${esc(g.key)}">${esc(t("q.decide"))}</button></div>`).join("")}${L.kinds.map(i => `<div class="item">${stSlot("as")}<div class="body"><b class="small">${esc(t("learn.kind", {x: i.kindNote || i.input}))}</b><span class="small muted">${esc(fmtDay(i.at))}</span></div><button class="btn xs" data-a="q-goto" data-ref="learnk:${esc(i.id)}">${esc(t("q.decide"))}</button></div>`).join("")}</div>` : `<p class="small muted">${esc(t("learn.none"))}</p>`}</section>`;   // ok:trunc  a preview line per record
}

/* ---------- PT health (Settings) and the kit defaults ---------- */
function ptHealthHTML(){
  const week = Date.now() - 7 * 86400000, jobs = arr(WS.jobs), wk = jobs.filter(j => Date.parse(j.createdAt) >= week);
  const failed = wk.filter(j => j.status === "failed" || j.status === "notsent"), errs = ERRS.filter(e => Date.parse(e.at) >= week);
  const lives = WS.projects.filter(p => p.live && p.status !== "archived"), u = WS.settings.usage || {};
  const rt = WS.projects.filter(p => p.redteam).length, due = WS.projects.filter(p => typeof rtDue === "function" && rtDue(p)).length;
  const tile = (n, label, bad = false) => `<div class="pt-tile ${bad ? "bad" : ""}"><b class="tnum">${esc(String(n))}</b><span class="small">${esc(label)}</span></div>`;
  return `<div class="stack lg pt-health"><h3>${esc(t("hp.title"))}</h3><p class="small muted">${esc(t("hp.sub"))}</p>
    <div class="pt-tiles">${tile(wk.length, t("hp.runs"))}${tile(failed.length, t("hp.failed"), failed.length > 0)}${tile(errs.length, t("hp.errors"), errs.length > 0)}${tile(Math.round(num(u.units, 0)), t("hp.units"))}${tile(lives.length, t("hp.live"))}${tile(due, t("hp.rtdue"), due > 0)}</div>
    ${failed.length ? `<div class="stack" style="gap:4px"><b class="small">${esc(t("hp.failedlist"))}</b><div class="list">${failed.slice(0, 8).map(jobLine).join("")}</div></div>` : ""}
    ${errs.length ? `<details><summary class="small">${esc(t("hp.errlist", {n: errs.length}))}</summary><div class="list">${errs.slice(-12).reverse().map(e => `<div class="item"><div class="body"><span class="small mono">${esc(e.msg)}</span><span class="small muted">${esc(fmtDate(e.at))} · ${esc(e.src)} · ${esc(e.v)}</span></div></div>`).join("")}</div></details>` : ""}
    <div class="stack" style="gap:4px"><b class="small">${esc(t("hp.versions"))}</b><p class="small muted">${esc(t("hp.versionsline", {v: PT_VERSION, k: KP_VERSION, f: KIT_CHECKED}))}${typeof factStale === "function" && (factStale(KP_VERSION) || factStale(KIT_CHECKED)) ? " · " + esc(t("fact.stale")) : ""}</p></div>
    <div class="stack" style="gap:4px"><b class="small">${esc(t("hp.radar"))}</b><p class="small muted">${esc(t("hp.radarline"))} <a class="chip tap" href="https://github.com/firnlab/prompt-translator/issues" target="_blank" rel="noopener">${ic("inbox")}${esc(t("pg.inbox"))}</a> <a class="chip tap" href="https://github.com/firnlab/prompt-translator/actions" target="_blank" rel="noopener">${ic("check")}${esc(t("hp.actions"))}</a></p></div>
    ${rt ? `<p class="small muted">${esc(t("hp.rt", {n: rt}))}</p>` : ""}</div>`;
}
function kitDefaultsHTML(){
  WS.settings.kit = WS.settings.kit || {}; const S = kitSettings();
  return `<div class="stack"><h3>${esc(t("set.kit"))}</h3><p class="small muted">${esc(t("set.kit.sub"))}</p><div class="grid3">
    <label class="fld"><span>${esc(t("set.kit.sharing"))}</span>${bindSelect("ws:settings.kit.sharing", S.sharing, [["private", t("set.kit.sharing.private")], ["shared", t("set.kit.sharing.shared")]])}</label>
    <label class="fld"><span>${esc(t("set.kit.ai"))}</span>${bindSelect("ws:settings.kit.ai", S.ai, [["when-needed", t("set.kit.ai.when")], ["never", t("set.kit.ai.never")], ["explicit", t("set.kit.ai.explicit")]])}</label>
    <label class="fld"><span>${esc(t("set.kit.repo"))}</span><input type="text" data-bind="ws:settings.kit.repo" value="${esc(S.repo)}" placeholder="firnlab/tools"></label>
    <label class="fld"><span>${esc(t("set.kit.cap"))}</span><input type="number" min="0" step="1" data-bind="ws:settings.kit.cap" data-num="1" value="${esc(String(S.cap != null ? S.cap : 10))}"></label></div></div>`;
}
{ const orig = viewSettings; viewSettings = function(){ let h = orig();
    h = h.replace(/(<button class="tab[^"]*" data-a="tab" data-t="setTab" data-v="about">[\s\S]*?<\/button>)/, `$1<button class="tab ${UI.setTab === "health" ? "on" : ""}" data-a="tab" data-t="setTab" data-v="health">${esc(t("set.tab.health"))}</button>`);
    if (UI.setTab === "general") h = h.replace(/(<div class="stack lg">)/, "$1" + kitDefaultsHTML());
    if (UI.setTab === "health") h = h.replace(/<section class="panel">([\s\S]*?)<\/section>/, `<section class="panel">${ptHealthHTML()}</section>`);
    return h; }; }
/* the media cap from the settings instead of the fixed CHF 10 */
Object.assign(KIT_DEFAULTS, {cap: 10});

/* ---------- where it all lives ---------- */
{ const orig = pgBody; pgBody = function(p, id){
    const h = orig(p, id);
    if (id === "try") return h + mockCard(p);
    if (id === "run") return learnCard(p) + h;
    return h; }; }
{ const orig = coverHTML; coverHTML = function(p){ return orig(p) + passCard(p); }; }
