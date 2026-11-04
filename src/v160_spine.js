/* ===================== 1.6.0 THE SPINE: one way to work =====================
   Decided with the owner on 24 Oct 2026 after reading the DG project's record (what he did in PT vs how the same design went in chat):
   1. The weekly budget never throttles anything (on Max there is no per-call cost; the budget had switched the automatic steps off
      while the message said "nothing is blocked"). It stays as one information line.
   2. Gaps make cards: every readiness item that is missing (idea, result, measure) gets its pick by itself; the deck is never empty
      while something is missing. Research findings are screened on arrival and flow into cards and a short "what the research found" strip.
   3. PT's own drafts are PT's step: one "look / fine" card per batch, never one per item.
   4. Own words are confirmed on screen: while PT reads them the card says so and keeps the text; afterwards a strip shows what was
      recorded (and how PT read it) with Undo and Change; a failed read keeps the text and says so.
   5. The spine: Idea → Picks → Try it → Design → Review → Build brief → Run — always visible, always one next step. Hard picks ride along
      as marked assumptions instead of blocking a first version.
   6. Pick is the one way to work; Blueprint, Journey, Swimlanes and Steps are read-only maps of the same project under one Map button;
      every project opens in Pick (one-time move, m160). Session sizes, rounds and the second-opinion button leave the surface. */

/* ---------- 1. no throttling ---------- */
autoOK = function(){ return !!(WS && WS.settings && WS.settings.autoJobs !== false); };
costGuard = function(p, name, run){ return run(); };

/* ---------- 5a. readiness: hard picks do not block a first version (they are carried as assumptions) ---------- */
{ const orig = pickReady; pickReady = function(p){ const r = orig(p); const h = r.find(x => x.id === "hard"); if (h) h.ok = !queueOf(p).some(x => x.hard && x.cls === "block" && ["nsdecide","audience","gatefired"].includes(x.kind)); return r; }; }
/* no session sizes: every deck runs until the design is done */
{ const orig = pickRead; pickRead = function(p){ const k = orig(p); if (k && k.size) k.size = 0; return k; }; }

/* ---------- 2. gaps make cards ---------- */
const SP_GAP = {idea: ["ns.goal", "idea"], result: ["result", "home", "example"], measure: ["measure", "crit", "ns.success"]};
function pickGaps(p){
  const k = pickRead(p), open = pickOpenCards(p);
  return pickReady(p).filter(x => !x.ok && SP_GAP[x.id]).map(x => x.id).filter(id => !open.some(c => SP_GAP[id].includes(c.target)));
}
/** the picks the first version still needs, made by themselves (never counted against the automatic rounds) */
function pickGapCards(p){
  if (!p || !str(p.northStar.goal).trim() && !str(p.intake.raw).trim()) return false;
  if (aiBusy("pick") || AI.running.has(akey("pick", p.id)) || !autoOK()) return false;
  const gaps = pickGaps(p); if (!gaps.length) return false;
  const k = pickRead(p); if (k.gapAt && Date.now() - Date.parse(k.gapAt) < 60000) return false;   // once a minute at most: a round that returns nothing must not loop
  pickOf(p).gapAt = now();
  aiPickNext(p, {n: Math.min(3, gaps.length), need: gaps.flatMap(g => SP_GAP[g])});
  return true;
}
{ const orig = pickAfter; pickAfter = function(p){ orig(p); if (!pickOpenCards(p).length) pickGapCards(p); }; }
/* research in: screened, then the pre-research cards are re-checked and the gaps filled — all by itself */
{ const orig = aiPickScreen; aiPickScreen = async function(p){ const r = await orig(p); try{ const q = pickLive(p, WS.id); if (q && !pickRead(q).findings.some(f => !f.screened)){ if (pickRead(q).cards.some(c => c.preRes) && !aiBusy("pk-refresh")) await aiPickRefresh(q); const q2 = pickLive(q, WS.id); if (q2) pickGapCards(q2); } }catch(e){ onAppError(e && e.message, "spineScreen"); } return r; }; }
/** the three findings most likely to change a decision */
function pickInsights(p){
  const k = pickRead(p); if (!k.research || k.research.state !== "done") return "";
  const f = k.findings.filter(x => x.screened && !x.flagged && ["ceiling","missing","frontier"].includes(x.kind)).slice(0, 3);
  if (!f.length) return "";
  return `<div class="pk-insights"><span class="small"><b>${esc(t("sp.research.title"))}</b></span><ul class="small">${f.map(x => `<li>${clampHTML(x.text, "pki:" + x.id, {lines: 2, tag: "span"})}${x.src ? ` <a class="chip tap" href="${esc(x.src)}" target="_blank" rel="noopener">${ic("link")}</a>` : ""}</li>`).join("")}</ul><button class="btn xs ghost" data-a="goto-ref" data-ref="#pk-research">${esc(t("sp.research.all", {n: k.findings.filter(x => x.screened && !x.flagged).length}))}</button></div>`;
}

/* ---------- 3. one card per batch of PT drafts ---------- */
const SP_BATCH = {crit: "goal", req: "require", qa: "interview"};
{ const orig = pickQueueCards; pickQueueCards = function(p){
    const out = orig(p), groups = {};
    // PT's own drafts (criteria, requirements, answers marked "to check") were one Finish decision each; now one card per batch, in the deck
    for (const x of queueOf(p).filter(x => x.cls === "check" && SP_BATCH[x.kind] && qOptions(p, x).some(o => o.batch))) (groups[x.kind] = groups[x.kind] || []).push(x);
    for (const kind of Object.keys(groups)){ const g = groups[kind];
      out.unshift({qkey: "batch|" + kind, id: "q-batch-" + kind, ref: SP_BATCH[kind], anchor: SP_BATCH[kind], q: t("sp.batch.q", {n: g.length, x: t("sp.batch." + kind)}), why: t("sp.batch.why"), hard: false, kind: "batch", items: g,
        options: [{k: "A", label: t("sp.batch.fine"), text: t("sp.batch.finewhy"), i: 0}, {k: "B", label: t("sp.batch.look"), text: g.map(c => trunc(c.title, 60)).join(" · ") /* ok:trunc  a preview; each item is shown in full where it lives */, i: 1, opens: true}], rec: 0}); }
    return out; }; }
{ const orig = ACTIONS["pk-q"]; ACTIONS["pk-q"] = async el => {
    const key = str(el.dataset.key); if (!key.startsWith("batch|")) return orig(el);
    const p = curP(); if (!p) return; const kind = key.slice(6), items = queueOf(p).filter(x => x.kind === kind && x.cls === "check");
    if (num(el.dataset.i) === 1){ goRef(SP_BATCH[kind]); return; }
    await actGroup(async () => { for (const x of items){ const opts = qOptions(p, x), i = opts.findIndex(o => o.batch); if (i >= 0) await qDo(p, x, i); } }, {pid: p.id});
    render(); toastUndo(t("sp.batch.done", {n: items.length})); }; }

/* ---------- 4. own words, confirmed on screen ---------- */
{ const orig = FORMS["pk-own"]; FORMS["pk-own"] = async f => {
    const id = f.dataset.id, inp = f.querySelector("[data-pkown]"), own = str(inp && inp.value).trim(), p = curP();
    const c0 = p && !f.dataset.key ? pickCard(p, id) : null, direct = c0 && arr(UI.pkSel[id]).length;
    if (own && c0 && !direct){ UI.pkReading = {id, text: own}; render(); }
    try{ await orig(f); }
    finally{ UI.pkReading = null; }
    const q = curP(), c = q && pickCard(q, id);
    if (own && c && !c.reading && UI.qDraft["pk-" + id] === own){ toast(t("sp.own.kept"), "err"); render(); }   // the read failed: the words stay in the box
  }; }
{ const orig = pickCardHTML; pickCardHTML = function(p, c, host = "main", first = false){
    let h = orig(p, c, host, first);
    if (UI.pkReading && UI.pkReading.id === c.id){ const i = h.indexOf(">"); h = h.slice(0, i + 1) + `<p class="small pk-reading">${ic("clock")} ${esc(t("sp.own.reading"))} <i>“${esc(UI.pkReading.text)}”</i></p>` + h.slice(i + 1); }
    return h; }; }
/* what was just recorded stays on screen until the next pick (or you close it) */
{ const orig = pickAnswer; pickAnswer = function(p, cid, o = {}){ const e = orig(p, cid, o); if (e && e.id && !o.assumed && !o.fromSaid) UI.pkLast = {pid: p.id, eid: e.id, at: Date.now()}; return e; }; }
function pickLastStrip(p){
  const L = UI.pkLast; if (!L || L.pid !== p.id) return "";
  const e = pickRead(p).log.find(x => x.id === L.eid); if (!e){ UI.pkLast = null; return ""; }
  return `<div class="pk-last" data-anchor="pe:${esc(e.id)}"><div class="body"><span class="small muted">${esc(t("sp.last.title"))}</span> <b>${esc(e.q)}</b> → ${clampHTML(e.answer, "pkl:" + e.id, {lines: 2, tag: "span"})}${e.meaning && e.own ? `<div class="small muted">${esc(t("sp.last.read", {x: e.own}))}</div>` : ""}</div>
    <div class="row" style="gap:4px"><button class="btn xs ghost" data-a="pk-undo-last">${ic("undo")}${esc(t("btn.undo"))}</button><button class="btn xs ghost" data-a="pk-change" data-id="${esc(e.id)}">${ic("edit")}${esc(t("sp.last.change"))}</button><button class="iconbtn" data-a="pk-last-close" title="${esc(t("btn.close"))}" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div></div>`;
}
Object.assign(ACTIONS, {
  "pk-undo-last": () => { const p = curP(); if (!p) return; const a = lastAct(p); if (a) undoAct(p, a.id); UI.pkLast = null; render(); },
  "pk-last-close": () => { UI.pkLast = null; render(); },
  "pk-gaps": () => { const p = curP(); if (p && !pickGapCards(p)) toast(t("sp.gaps.none"), ""); }
});

/* ---------- 5. the spine ---------- */
const SP_STATIONS = ["idea", "picks", "try", "design", "review", "build", "run"];
function spineState(p){
  const k = pickRead(p), ready = pickReady(p), deck = pickDeck(p), gaps = pickGaps(p);
  const idea = !!str(p.northStar.goal).trim(), tried = !!k.tried, designed = arr(p.arch.components).length > 0, reviewed = arr(p.pkg.sections).length > 0 && p.seal.review === p.versionNo;
  const brief = !!p.brief, live = !!p.live, allReady = ready.every(x => x.ok);
  const st = {idea: idea ? "done" : "cur", picks: !idea ? "todo" : deck.length || gaps.length ? "cur" : "done", try: !idea ? "todo" : tried ? "done" : allReady && !deck.filter(c => !c.qkey).length ? "cur" : "todo",
    design: designed ? "done" : tried ? "cur" : "todo", review: reviewed ? "done" : designed && arr(p.pkg.sections).length ? "cur" : "todo", build: brief ? "done" : reviewed ? "cur" : "todo", run: live ? "done" : brief ? "cur" : "todo"};
  // one next step
  let next;
  if (!idea) next = {label: t("sp.next.idea"), a: "goto-ref", ref: "goal"};
  else if (deck.length) next = {label: t("sp.next.pick", {n: deck.length}), a: "goto-ref", ref: "#pk-deck"};
  else if (!allReady && gaps.length) next = {label: t("sp.next.gaps"), a: "pk-gaps", ai: true};
  else if (!allReady) next = {label: t("sp.next.platform"), a: "goto-ref", ref: "#pk-research"};
  else if (!tried || (k.tried && pickSinceTry(p).length)) next = {label: t(tried ? "pk.try.again" : "pk.try.go"), a: "pk-try", ai: true};
  else if (!reviewed) next = {label: t("sp.next.review"), a: "goto-ref", ref: "review"};
  else if (!brief) next = {label: t("sp.next.build"), a: "goto-ref", ref: "build"};
  else if (!live) next = {label: t("sp.next.release"), a: "goto-ref", ref: "release"};
  else next = {label: t("sp.next.run"), a: "goto-ref", ref: "run"};
  return {st, next, open: queueCounts(p).you};
}
const SP_REF = {idea: "goal", picks: "#pk-deck", try: "#pk-try", design: "arch", review: "review", build: "build", run: "run"};
function pickSpineHTML(p){
  const s = spineState(p);
  const stations = SP_STATIONS.map(id => `<button class="sp-st ${s.st[id]}" data-a="goto-ref" data-ref="${esc(SP_REF[id])}" aria-current="${s.st[id] === "cur"}">${s.st[id] === "done" ? ic("check") : `<span class="sp-dot"></span>`}<span>${esc(t("sp.st." + id))}</span></button>`).join(`<span class="sp-line"></span>`);
  const nx = s.next.ai ? aiBtn(s.next.a, s.next.label, "M", {primary: true, key: s.next.a === "pk-try" ? "compile" : "pick"}) : `<button class="btn sm primary" data-a="${esc(s.next.a)}" ${s.next.ref ? `data-ref="${esc(s.next.ref)}"` : ""}>${ic("arrow")}${esc(s.next.label)}</button>`;
  return `<nav class="pk-spine" aria-label="${esc(t("sp.title"))}"><div class="sp-row">${stations}</div><div class="row sp-next"><span class="chip" data-count="open">${esc(t("sp.open", {n: s.open}))}</span><span style="flex:1 1 1em"></span>${UI.pkTrying === p.id ? `<span class="small">${esc(t("pk.try.busy"))}</span>` : nx}</div></nav>`;
}
/* the top of Pick: the spine, what was just recorded, the research strip, and the few tools that stay (say it all, ★, candidates, refresh) */
pickTop = function(p, k, ready){
  const parked = pickParkedCards(p).length, stars = pickStarable(p).length;
  const cands = k.cands && arr(k.cands.list).length > 1 ? `<button class="chip tap" data-a="pk-cands" aria-expanded="${!!UI.pkCands}">${esc(t("pk.cands.n", {n: k.cands.list.length}))}</button>` : "";
  const fresh = k.cards.some(c => c.preRes) && k.research && k.research.state === "done" ? `<div class="row pk-fresh"><span class="small">${ic("info")} ${esc(t("pk.refresh.hint"))}</span>${aiBtn("pk-refresh", t("pk.refresh.go"), "M", {key: "pk-refresh"})}</div>${busyHTML("pk-refresh")}` : "";
  return `<div class="pk-top">${pickSpineHTML(p)}${pickLastStrip(p)}${pickInsights(p)}
    <div class="row" style="gap:8px">${cands}${parked ? `<button class="chip tap" data-a="goto-ref" data-ref="#pk-parked">${esc(t("pk.parkedn", {n: parked}))}</button>` : ""}<span style="flex:1 1 1em"></span>${stars >= 2 ? `<button class="btn sm" data-a="pk-stars" title="${esc(t("pk.stars.tip"))}">★ ${esc(t("pk.stars", {n: stars}))}</button>` : ""}<button class="btn sm ghost" data-a="pk-dumpopen" aria-expanded="${!!UI.pkDump}">${ic("mic")}${esc(t("pk.dump.go"))}</button></div>
    ${UI.pkDump ? `<form class="stack pk-dump" data-form="pk-dump"><label class="fld"><span>${esc(t("pk.dump.label"))}</span><textarea id="pk-dump-in" rows="4" placeholder="${esc(t("pk.dump.ph"))}">${esc(UI.qDraft["pk-dump"] || "")}</textarea></label><div class="row">${pickMic("pk-dump-in")}<button class="btn sm primary" type="submit">${ic("spark")}${esc(t("pk.dump.do"))}</button><span class="hint">${esc(t("pk.dump.hint"))}</span></div>${busyHTML("pk-dump")}</form>` : ""}
    ${UI.pkCands && cands ? `<div class="pk-cands"><span class="small muted">${esc(t("pk.cands.sub"))}</span><div class="list">${k.cands.list.map((c, i) => `<div class="item"><div class="body"><b class="small">${esc(c.name)}</b><span class="small">${esc(c.summary)}</span></div><button class="btn xs" data-a="pk-cand" data-i="${i}">${esc(t("pk.cands.this"))}</button></div>`).join("")}</div>${k.cands.likelyWrong ? `<p class="small muted">${esc(t("pk.cands.wrong", {x: k.cands.likelyWrong}))}</p>` : ""}</div>` : ""}
    ${fresh}${levelOf(p) === "learn" && !k.log.length ? `<p class="small pk-hint">${ic("info")} ${esc(t("pk.hint"))}</p>` : ""}</div>`;
};
/* the deck has an anchor the spine can jump to; the empty deck offers the gaps instead of a bare "next picks" */
{ const orig = modePick; modePick = function(p){
    let h = orig(p).replace('<div class="pk-deck">', '<div class="pk-deck" id="pk-deck" data-anchor="pk-deck">');
    const gaps = pickGaps(p), k = pickRead(p);
    if (gaps.length && (k.log.length || k.cards.length) && UI.pkTrying !== p.id){   // what a first version still needs, as long as it is missing: PT fetches it by itself, the button is for impatience
      const panel = `<section class="panel pk-empty pk-gaps"><p>${esc(t("sp.gaps.text", {x: gaps.map(g => t("pk.r." + g)).join(", ")}))}</p><div class="row">${aiBusy("pick") ? busyHTML("pick") : aiBtn("pk-gaps", t("sp.next.gaps"), "M", {primary: !pickOpenCards(p).length, key: "pick"})}</div></section>`;
      h = h.includes('class="panel pk-empty"') ? h.replace(/<section class="panel pk-empty">[\s\S]*?<\/section>/, panel) : h.replace('<div class="pk-deck" id="pk-deck" data-anchor="pk-deck">', '<div class="pk-deck" id="pk-deck" data-anchor="pk-deck">' + panel);
    }
    return h; }; }
/* the overview keeps import and export; the second opinion runs inside the rounds and before every first version */
{ const orig = pickOverview; pickOverview = function(p){ return orig(p).replace(/<button[^>]*data-a="pk-second"[\s\S]*?<\/button>/, ""); }; }

/* ---------- 6. one way to work (1.6: Pick; 2.0: Pick or Chat with structure, v200_modes.js — the 1.x maps Steps, Blueprint, Journey, Swimlanes are gone) ---------- */
ACT_NO.add("pk-last-close"); ACT_NO.add("pk-gaps");
/* every project works in Pick from 1.6.0 on (one-time move; the earlier view is kept as the project's map) */
function spineMoveOnce(){
  if (!WS || !WS.settings || WS.settings.m160) return;
  for (const p of WS.projects || []){ if (p.mode !== "pick"){ p.modeBefore160 = projMode(p); p.mode = "pick"; touch(p); } }
  WS.settings.m160 = now(); saveWs();
}
{ const orig = openWorkspace; openWorkspace = async function(id){ const r = await orig(id); if (UI.wsReady && !UI.fatal && WS.id === id) spineMoveOnce(); return r; }; }
/* opening a project wakes what waits in it: unscreened research is screened, missing picks are fetched (DG had 47 unscreened findings and an empty deck) */
function spineWake(p){
  if (!p || !autoOK()) return;
  const k = pickRead(p);
  if (k.findings.some(f => !f.screened) && !AI.running.has(akey("pk-screen", p.id))){ aiPickScreen(p); return; }   // the screen chains refresh and gaps itself
  if (!pickOpenCards(p).length && (k.log.length || k.cards.length)) pickGapCards(p);
}
{ const orig = openProject; openProject = function(id, phase){ const r = orig(id, phase); setTimeout(() => { const p = curP(); if (p && p.id === id && UI.view === "project") spineWake(p); }, 400); return r; }; }
