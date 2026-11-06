/* ===================== 1.7.0 THE COVER AND THE SEVEN PAGES =====================
   Decided with the owner on 25 Oct 2026: the seven stations of the 1.6 spine become seven pages, one human question each, every page
   with the same three blocks — what PT did · what you decide · next. Above them one cover: what the tool is, the open questions,
   the build-stage track, the quality spider, one next step. The mode bar (steps / Bauplan / journey / swimlanes) leaves the main
   path: the Bauplan is the body of the Design page, the steps are the "all details" of each page. Nothing is deleted: the phases
   stay the data model, the old views stay reachable for items and tests. */
const PG_PAGES = SP_STATIONS;   // idea · picks · try · design · review · build · run
const PG_PHASES = {idea: ["capture", "understand"], picks: ["interview", "assume"], try: [], design: ["require", "arch"], review: ["review", "test"], build: ["build", "launch"], run: ["release", "operate"]};
const PG_OF_PHASE = {}; for (const [pg, phs] of Object.entries(PG_PHASES)) for (const ph of phs) PG_OF_PHASE[ph] = pg;
/* a step ref the old screens use → the page it lives on */
const PG_OF_REF = {goal: "idea", "#pk-deck": "picks", "#pk-research": "picks", "#pk-summary": "picks", "#pk-try": "try", arch: "design", review: "review", test: "review", build: "build", release: "run", run: "run"};
const PG_ICON = {idea: "target", picks: "list", try: "play", design: "layers", review: "shield", build: "bolt", run: "heart"};
function pgOn(p){ return !!p && MODES.includes(projMode(p)); }   // 2.0: the pages are the structure of both faces (Pick Mode and Chat Mode)
/** the station of the one next step */
function pgNextPage(s){ const nx = s.next || {}; return nx.a === "pk-try" ? "try" : nx.a === "pk-gaps" ? "picks" : PG_OF_REF[nx.ref] || (nx.ref === "goal" ? "idea" : "run"); }
/** the track: done stations stay filled, exactly one station is current (the one of the next step), the rest is to do */
function pgStates(p){
  const s = spineState(p), cur = pgNextPage(s), st = {};
  for (const id of PG_PAGES) st[id] = s.st[id] === "done" && id !== cur ? "done" : id === cur ? "cur" : "todo";
  return {st, cur, next: s.next, open: s.open};
}
/** the page that is open, or the station PT is at */
function pgCur(p){
  if (UI.pg && UI.pg.pid === p.id && PG_PAGES.includes(UI.pg.id)) return UI.pg.id;
  return pgStates(p).cur;
}
function pgOpen(p, id, {flash = null} = {}){
  if (!PG_PAGES.includes(id)) return;
  pushNav();
  if (UI.finish && UI.finish.pid === p.id && (UI.finish.step === "decide" || UI.finish.step === "done")) UI.finishPaused = UI.finish;
  UI.pg = {pid: p.id, id}; UI.home = false; UI.finish = null; UI.nav = null;
  if (flash){ UI.flashRef = flash; UI.navRef = flash; UI.navTry = 0; }
  render(); const m = document.querySelector(".main"); if (m) m.scrollTop = 0;
}
/* 2.0 gate (cause 98): with the Steps view gone, a page's open details are the only way into a step. Their render moved the cursor
   to the page's step without setPhase, so reaching a step that way was not a visit: no automatic step (the frontier scan at the
   interview, the engine suggestion and the trial at the architecture), no "step done" restore point, the project's phase not moved on.
   A person's click that opens a page with its details, or the details themselves, now visits that step like its tab does. */
function pgVisit(p, id){
  const phs = PG_PHASES[id] || [], key = "pg:" + p.id + ":" + id;
  if (!phs.length || !(UI.pgDetails && UI.pgDetails[key]) || pgCur(p) !== id) return false;
  const ph = phs.includes(p.focus.ph) ? p.focus.ph : phs[0];
  if (ph === UI.phase) return false;
  setPhase(ph, {keepScroll: true}); return true;
}
ACTIONS["pg-open"] = el => { const p = curP(); if (!p) return; pgOpen(p, str(el.dataset.v), {flash: el.dataset.ref || null}); pgVisit(p, str(el.dataset.v)); };
ACTIONS["pg-step"] = el => { const p = curP(); if (!p) return; const i = PG_PAGES.indexOf(pgCur(p)) + num(el.dataset.d); if (PG_PAGES[i]){ pgOpen(p, PG_PAGES[i]); pgVisit(p, PG_PAGES[i]); } };
ACTIONS["pg-details"] = el => { UI.pgDetails = UI.pgDetails || {}; const k = str(el.dataset.v); UI.pgDetails[k] = !UI.pgDetails[k];
  const p = curP(), m = /^pg:([^:]+):(\w+)$/.exec(k);
  if (UI.pgDetails[k] && p && m && m[1] === p.id && pgVisit(p, m[2])) return;
  render(); };
for (const a of ["pg-open", "pg-step", "pg-details"]) ACT_NO.add(a);
/* a step ref from a page opens the page it lives on; an item ref opens its page with the details open and the item in view */
function pgShowPhase(p, ph){ const id = PG_OF_PHASE[ph]; if (!id) return false; UI.pg = {pid: p.id, id}; UI.pgDetails = UI.pgDetails || {}; UI.pgDetails["pg:" + p.id + ":" + id] = true; return true; }
{ const orig = goRef; goRef = function(ref, o = {}){
    const p = curP();
    if (p && pgOn(p) && !UI.finish && PG_OF_REF[ref]){ const id = PG_OF_REF[ref]; pgOpen(p, id); const ph = ref.startsWith("#") ? "" : refPhase(p, ref); if (ph && PG_PHASES[id].includes(ph)){ p.focus = {ph, id: null}; UI.phase = ph; pgShowPhase(p, ph); }   // ok:field  focus is the existing cursor field
      UI.flashRef = ref; UI.navRef = ref; UI.navTry = 0;
      if (o && Array.isArray(o.list) && o.list.length){ const i = o.list.indexOf(ref); UI.nav = {list: o.list, i: Math.max(0, i), pid: p.id}; }   // 2.0 gate (cause 101): the walk through a list ("1 of N", next, Back) on the pages too; pgOpen had cleared it
      render(); return; }
    const was = p && pgOn(p);
    const r = orig(ref, o);
    if (p && was && pgOn(p) && UI.view === "project" && !UI.home && ref && /:/.test(ref)){ const ph = refPhase(p, ref); if (pgShowPhase(p, ph)){ UI.flashRef = UI.flashRef || ref; UI.navRef = UI.flashRef; render(); } }
    return r; }; }
/* a step button inside a page stays on the page: the details open on that step */
/* 2.0 gate (cause 98): a step's tab is a visit (automatic steps, step done), as the Steps view's was */
{ const orig = ACTIONS["goto"]; ACTIONS["goto"] = function(el){ const p = curP(); const ph = el && el.dataset ? el.dataset.ph : ""; if (p && pgOn(p) && !UI.home && PG_OF_PHASE[ph] && PHASE_IDS.includes(ph)){ pgShowPhase(p, ph); if (UI.phase === ph){ p.focus = {ph, id: null}; render(); return; } setPhase(ph, {keepScroll: true}); return; } return orig.apply(this, arguments); }; }   // ok:field  focus is the existing cursor field (DIFF_SKIP)
{ const orig = openProject; openProject = function(id, phase){ if (UI.pg && UI.pg.pid !== id) UI.pg = null; const r = orig(id, phase); const p = curP(); if (p && p.id === id && phase && pgOn(p) && PG_OF_PHASE[phase] && !window.__ptNoHome){ UI.pg = {pid: id, id: PG_OF_PHASE[phase]}; } return r; }; }

/* ---------- the queue, per page ---------- */
function pgQueue(p, id){
  const phs = PG_PHASES[id];
  return queueOf(p).filter(x => phs.includes(x.ph) || (id === "picks" && /^(pq|oq|dim):/.test(str(x.ref))));
}
function pgYou(p, id){ return pgQueue(p, id).filter(x => youOpen(x)); }
function pgRow(p, x){
  const opts = qOptions(p, x), star = opts.findIndex(o => o.star);
  return `<div class="qrow pg-row" id="pq-${esc(x.key)}">${stSlot(x.cls === "block" ? "bad" : x.cls === "check" ? "as" : "warn")}<div class="qbody"><button class="qtitle linkish" data-a="q-goto" data-ref="${esc(x.ref)}" data-clamp="q:${esc(x.key)}" style="--cl:2">${esc(x.title)}</button>${x.why ? clampHTML(x.why, "qw:" + x.key, {lines: 2, cls: "small muted"}) : ""}${star >= 0 ? clampHTML(t("q.starline", {x: opts[star].label}), "qs:" + x.key, {lines: 2, cls: "small qstar"}) : ""}</div>
    <div class="qacts">${star >= 0 ? `<button class="btn xs primary" data-a="q-do" data-key="${esc(x.key)}" data-i="${star}" title="${esc(opts[star].label)}">${esc(t("q.usestar"))}</button>` : opts.length ? `<button class="btn xs" data-a="q-goto" data-ref="${esc(x.ref)}">${esc(t("q.decide"))}</button>` : ""}</div></div>`;
}

/* ---------- what PT did, per page: a few plain facts ---------- */
function pgDid(p, id){
  const k = pickRead(p), ns = p.northStar || {}, F = [];
  const yes = (cond, key, vars) => { if (cond) F.push(t(key, vars)); };
  switch (id){
    case "idea":
      yes(str(p.intake.clean).trim() || str(ns.goal).trim(), "pg.did.goal", {x: trunc(str(ns.goal).trim() || str(p.intake.clean).trim(), 90)});
      yes(k.cands && arr(k.cands.list).length > 1, "pg.did.cands", {n: arr(k.cands && k.cands.list).length});
      yes(k.research && k.research.state === "done", "pg.did.research", {n: k.findings.filter(f => !f.flagged).length});
      yes(k.findings.some(f => f.flagged), "pg.did.flagged", {n: k.findings.filter(f => f.flagged).length});
      break;
    case "picks": { const assumed = k.log.filter(e => e.assumed).length;
      yes(k.log.length, "pg.did.picked", {n: k.log.length});
      yes(assumed, "pg.did.assumed", {n: assumed});
      yes(pickGaps(p).length, "pg.did.gaps", {x: pickGaps(p).map(g => t("pk.r." + g)).join(", ")});
      break; }
    case "try": { const tr = k.tried;
      yes(tr, "pg.did.tried", {v: tr ? tr.v : "", d: tr ? fmtDate(tr.at) : ""});
      yes(tr && tr.check, "pg.did.check", {a: tr && tr.check ? tr.check.pass : 0, b: tr && tr.check ? tr.check.total : 0});
      yes(tr && arr(tr.since).length, "pg.did.since", {n: arr(tr && tr.since).length});
      break; }
    case "design": { const a = p.arch || {}, ch = arr(a.options).find(o => o.id === a.chosen);
      yes(arr(a.components).length, "pg.did.parts", {n: arr(a.components).length});
      yes(ch, "pg.did.option", {x: ch ? ch.name : ""});
      yes(typeof kitDecidedList === "function" && kitDecidedList(p).length, "pg.did.kits", {n: typeof kitDecidedList === "function" ? kitDecidedList(p).length : 0});
      yes(p.tool && p.tool.home && p.tool.home.where, "pg.did.home", {x: p.tool && p.tool.home ? p.tool.home.where : ""});
      break; }
    case "review": { const fs = arr(p.findings), open = fs.filter(f => f.status === "open").length, fixed = fs.filter(f => ["fixed", "verified", "signedoff"].includes(f.status)).length;
      yes(p.seal.review, "pg.did.reviewed", {v: p.seal.review});
      yes(fixed, "pg.did.fixed", {n: fixed});
      yes(open, "pg.did.open", {n: open});
      yes(arr(p.tests).length, "pg.did.tests", {n: arr(p.tests).length});
      yes(typeof PROOF_MODES !== "undefined", "pg.did.proof", {n: typeof PROOF_MODES !== "undefined" ? PROOF_MODES.length : 0});
      break; }
    case "build":
      yes(arr(p.pkg.sections).length, "pg.did.sections", {n: arr(p.pkg.sections).length});
      yes(p.brief, "pg.did.brief", {d: p.brief ? fmtDate(p.brief.at || p.updatedAt) : ""});
      yes(arr(p.releases).length, "pg.did.releases", {n: arr(p.releases).length});
      break;
    case "run":
      yes(p.live, "pg.did.live", {v: p.live ? p.live.v : ""});
      yes(arr(p.runs).length, "pg.did.runs", {n: arr(p.runs).length});
      yes(arr(p.versions).length, "pg.did.versions", {n: arr(p.versions).length});
      break;
  }
  return F;
}

/* ---------- the track: seven stations, filled ---------- */
function pgTrackSVG(p, {w = 640} = {}){
  const s = pgStates(p).st, n = PG_PAGES.length, pad = 36, step = (w - 2 * pad) / (n - 1), y = 28;
  const cx = i => pad + i * step;
  const lines = PG_PAGES.slice(1).map((id, i) => `<line x1="${cx(i)}" y1="${y}" x2="${cx(i + 1)}" y2="${y}" class="tr-line ${s[PG_PAGES[i]] === "done" ? "done" : ""}"/>`).join("");
  const nodes = PG_PAGES.map((id, i) => `<g class="tr-node ${s[id]}" data-a="pg-open" data-v="${id}" role="button" tabindex="0" aria-label="${esc(t("sp.st." + id))}"><rect x="${cx(i) - step / 2 + 2}" y="2" width="${step - 4}" height="68" class="tr-hit"/><circle cx="${cx(i)}" cy="${y}" r="${s[id] === "cur" ? 13 : 10}"/>${s[id] === "done" ? `<path d="M${cx(i) - 5} ${y}l3.5 3.5 6.5 -7" class="tr-check"/>` : s[id] === "cur" ? `<circle cx="${cx(i)}" cy="${y}" r="4" class="tr-core"/>` : ""}<text x="${cx(i)}" y="${y + 32}" text-anchor="middle">${esc(t("sp.st." + id))}</text></g>`).join("");
  return `<svg class="pg-track" viewBox="0 0 ${w} 72" role="img" aria-label="${esc(t("sp.title"))}">${lines}${nodes}</svg>`;
}
/* the quality spider: one axis per review lens, the score falls with the open problems of that lens */
function pgLensScores(p){
  const W = {critical: 40, high: 25, medium: 10, low: 4};
  return LENSES.map(l => { const open = arr(p.findings).filter(f => f.lens === l.id && f.status === "open"); const v = p.reviewVerdicts && p.reviewVerdicts[l.id]; return {id: l.id, label: L(l), has: !!v || open.length > 0, score: !v && !open.length ? null : Math.max(0, 100 - open.reduce((n, f) => n + (W[f.severity] || 10), 0))}; });
}
function pgSpiderSVG(p){
  const S = pgLensScores(p), n = S.length, cx = 110, cy = 110, R = 80;
  if (!S.some(x => x.has)) return "";
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const ring = r => `<polygon points="${S.map((_, i) => pt(i, r).map(v => v.toFixed(1)).join(",")).join(" ")}" class="sp-ring"/>`;
  const poly = S.map((x, i) => pt(i, R * (x.score == null ? 0 : x.score) / 100).map(v => v.toFixed(1)).join(",")).join(" ");
  const labels = S.map((x, i) => { const [lx, ly] = pt(i, R + 16); return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle"}" dominant-baseline="middle" class="${x.score == null ? "na" : ""}">${esc(x.label)}${x.score == null ? "" : " " + x.score}</text>`; }).join("");
  return `<svg class="pg-spider" viewBox="0 0 220 220" role="img" aria-label="${esc(t("pg.spider"))}">${ring(R)}${ring(R * 2 / 3)}${ring(R / 3)}${S.map((_, i) => { const [x, y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="sp-axis"/>`; }).join("")}<polygon points="${poly}" class="sp-area"/>${labels}</svg>`;
}

/* ---------- the cover ---------- */
function pgNextBtn(p, {big = false} = {}){
  const s = spineState(p), nx = s.next;
  if (UI.pkTrying === p.id) return `<span class="small">${esc(t("pk.try.busy"))}</span>`;
  return nx.ai ? aiBtn(nx.a, nx.label, "M", {primary: true, key: nx.a === "pk-try" ? "compile" : "pick"}) : `<button class="btn ${big ? "lg" : "sm"} primary" data-a="${esc(nx.a)}" ${nx.ref ? `data-ref="${esc(nx.ref)}"` : ""}>${ic("arrow")}${esc(nx.label)}</button>`;
}
function coverHTML(p){
  const ns = p.northStar || {}, s = pgStates(p), cur = s.cur;
  const what = str(ns.goal).trim() || str(p.intake.clean).trim() || str(p.intake.raw).trim();
  const you = queueOf(p).filter(x => youOpen(x)), byPage = {}; for (const x of you){ const pg = PG_OF_PHASE[x.ph] || "design"; byPage[pg] = (byPage[pg] || 0) + 1; }
  const openQ = you.slice(0, 6);
  const spider = pgSpiderSVG(p);
  const whatS = trunc(what, 240), usersS = trunc(ns.users, 90), succS = trunc(ns.success, 120);   // ok:trunc  the cover is the short form; the full text is one click away (edit)
  return `<section class="panel pg-cover" data-anchor="cover">
    <div class="pg-sum"><span class="small muted">${esc(t("pg.cover.what"))}</span><p class="lead">${what ? esc(whatS) : `<span class="muted">${esc(t("cock.nogoal"))}</span>`}</p>
      ${str(ns.users).trim() || str(ns.success).trim() ? `<p class="small">${str(ns.users).trim() ? `<b>${esc(t("pg.cover.for"))}</b> ${esc(usersS)}` : ""}${str(ns.users).trim() && str(ns.success).trim() ? " · " : ""}${str(ns.success).trim() ? `<b>${esc(t("pg.cover.success"))}</b> ${esc(succS)}` : ""}</p>` : ""}
      <p class="small"><b>${esc(t("pg.cover.at"))}</b> ${esc(t("sp.st." + cur))} · ${esc(t("pg.cover.open", {n: you.length}))}</p></div>
    ${pgTrackSVG(p)}
    <div class="pg-cover-grid">
      <div class="stack" style="gap:6px"><b class="small">${esc(t("pg.cover.q"))}</b>${openQ.length ? `<div class="qlist">${openQ.map(x => pgRow(p, x)).join("")}</div>${you.length > openQ.length ? `<p class="small muted">${esc(t("pg.cover.more", {x: Object.entries(byPage).map(([pg, n]) => n + " · " + t("sp.st." + pg)).join(", ")}))}</p>` : ""}` : `<p class="small muted">${esc(t("pg.cover.noq"))}</p>`}</div>
      <div class="stack pg-side" style="gap:6px"><b class="small">${esc(t("pg.spider"))}</b>${spider || `<p class="small muted">${esc(t("pg.spider.none"))}</p>`}</div>
    </div>
    <div class="row pg-next"><span class="small muted">${esc(t("sp.next.label"))}</span>${pgNextBtn(p, {big: true})}<span style="flex:1 1 1em"></span><a class="chip tap" href="${esc(PG_INBOX)}" target="_blank" rel="noopener">${ic("inbox")}${esc(t("pg.inbox"))}</a></div>
  </section>`;
}
const PG_INBOX = "https://github.com/firnlab/prompt-translator/issues/new/choose";
{ const orig = homeView; homeView = function(p){ if (!pgOn(p)) return orig(p); return coverHTML(p) + `<details class="pg-all" ${UI.pgDetails && UI.pgDetails["home:" + p.id] ? "open" : ""}><summary class="small" data-a="pg-details" data-v="home:${esc(p.id)}">${esc(t("pg.cover.all"))}</summary>${orig(p)}</details>`; }; }

/* ---------- the pages ---------- */
function pgBar(p){
  const cur = UI.home ? "" : pgCur(p), s = pgStates(p);
  const stations = PG_PAGES.map(id => `<button class="sp-st ${s.st[id]} ${cur === id ? "here" : ""}" data-a="pg-open" data-v="${id}" aria-current="${cur === id}">${s.st[id] === "done" ? ic("check") : `<span class="sp-dot"></span>`}<span>${esc(t("sp.st." + id))}</span></button>`).join(`<span class="sp-line"></span>`);
  return `<nav class="pk-spine pg-bar" aria-label="${esc(t("sp.title"))}"><div class="sp-row"><button class="sp-st cover ${UI.home ? "here" : ""}" data-a="home" aria-current="${!!UI.home}">${ic("home")}<span>${esc(t("pg.cover"))}</span></button><span class="sp-line"></span>${stations}</div></nav>`;
}
pickSpineHTML = function(p){ return pgBar(p); };   // the one bar everywhere: Pick's top row is the page bar
function pgBody(p, id){
  const k = pickRead(p), ready = pickReady(p);
  switch (id){
    case "idea": case "picks": case "try": return modePick(p) + pgDetails(p, id);   // the Pick screen is the heart of the first three pages: start → cards → first version; the steps behind them are the details
    case "design": {
      const comps = arr(p.arch.components);
      const map = comps.length ? `<section class="panel pg-map" data-anchor="bauplan"><div class="row"><h3 style="flex:1 1 12em">${ic("layers")} ${esc(t("m.blueprint"))}</h3></div>${lensBar(p)}${mapBlock(p, {id: "bp"})}<p class="hint">${esc(t("bp.hint141"))}</p></section>` : `<section class="panel pg-map empty" data-anchor="bauplan"><p>${esc(t("map.empty"))}</p>${k.tried ? `<div class="row">${aiBtn("architecture", t("pg.design.go"), "M", {primary: true, key: "arch"})}</div>${busyHTML("arch")}` : `<p class="small muted">${esc(t("pg.design.aftertry"))}</p>`}</section>`;
      return map + pgKitsBlock(p) + pgDetails(p, id);
    }
    case "review": return pgDetails(p, id, {open: true});
    case "build": return pgDetails(p, id, {open: true});
    case "run": return pgDetails(p, id, {open: true});
  }
  return "";
}
/* the kit decisions on the Design page: decided ones as one line each, open ones one row each, the rest as what PT assumes */
function pgKitsBlock(p){
  if (typeof kitDecidedList !== "function") return "";
  const shown = new Set(pgYou(p, "design").slice(0, 8).map(x => x.key)), dec = kitDecidedList(p), open = pgQueue(p, "design").filter(x => /^kit-/.test(x.kind) && !shown.has(x.key)), asm = typeof kitAssumed === "function" ? kitAssumed(p) : [];
  if (!dec.length && !open.length && !asm.length) return "";
  return `<section class="panel pg-kits" data-anchor="kits"><div class="row"><h3 style="flex:1 1 12em">${esc(t("pg.kits"))}</h3><span class="small muted">${esc(t("pg.kits.sub"))}</span></div>
    ${dec.length ? `<div class="list">${dec.map(d => `<div class="item">${stSlot("ok")}<div class="body"><span class="small"><b>${esc(d.q)}</b> → ${esc(d.a)}</span>${d.by === "you" ? "" : `<span class="small muted">${esc(t("pg.kits.bypt"))}</span>`}</div><button class="btn xs ghost" data-a="q-goto" data-ref="${esc(d.ref)}">${esc(t("btn.change"))}</button></div>`).join("")}</div>` : ""}
    ${open.length ? `<div class="qlist">${open.map(x => pgRow(p, x)).join("")}</div>` : ""}
    ${asm.length ? `<p class="small muted">${esc(t("pg.kits.assumed"))} ${asm.map(a => esc(a.q) + " → " + esc(a.a)).join(" · ")}</p>` : ""}</section>`;
}
/* the steps of a page, as its "all details" */
function pgDetails(p, id, {open = false} = {}){
  const phs = PG_PHASES[id]; if (!phs.length) return "";
  const key = "pg:" + p.id + ":" + id, isOpen = UI.pgDetails && UI.pgDetails[key] != null ? !!UI.pgDetails[key] : open;
  const ph = phs.includes(p.focus.ph) ? p.focus.ph : phs[0];
  if (isOpen && p.focus.ph !== ph){ p.focus.ph = ph; UI.phase = ph; }
  const tabs = phs.length > 1 ? `<div class="seg" role="group">${phs.map(x => `<button class="${(isOpen ? ph : "") === x ? "on" : ""}" data-a="goto" data-ph="${x}">${esc(phName(x))}</button>`).join("")}</div>` : "";
  return `<section class="pg-details ${isOpen ? "open" : ""}" data-anchor="details-${id}"><div class="row"><button class="btn sm ${isOpen ? "" : "primary"}" data-a="pg-details" data-v="${esc(key)}" aria-expanded="${isOpen}">${ic(isOpen ? "up" : "arrow")}${esc(isOpen ? t("pg.details.hide") : t("pg.details.show"))}</button>${isOpen ? tabs : `<span class="small muted">${esc(phs.map(phName).join(" · "))}</span>`}</div>${isOpen ? fullStep(p, ph) : ""}</section>`;
}
function pageHTML(p, id){
  const did = pgDid(p, id), you = pgYou(p, id), i = PG_PAGES.indexOf(id), s = pgStates(p);
  const nextHere = s.cur === id;
  const didHTML = `<div class="pg-block pg-did"><b class="small">${esc(t("pg.did"))}</b>${did.length ? `<ul class="small">${did.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="small muted">${esc(t("pg.did.none"))}</p>`}</div>`;
  const youHTML = `<div class="pg-block pg-you"><b class="small">${esc(t("pg.you", {n: you.length}))}</b>${you.length && id !== "picks" ? `<div class="qlist">${you.slice(0, 8).map(x => pgRow(p, x)).join("")}</div>${you.length > 8 ? `<p class="small muted">${esc(t("xp.more", {n: you.length - 8}))}</p>` : ""}` : you.length ? `<p class="small muted">${esc(t("pg.you.deck", {n: you.length}))}</p>` : `<p class="small muted">${esc(t("pg.you.none"))}</p>`}</div>`;
  const nextHTML = `<div class="pg-block pg-nx"><b class="small">${esc(t("sp.next.label"))}</b><div class="row">${nextHere ? pgNextBtn(p) : PG_PAGES[i + 1] ? `<button class="btn sm" data-a="pg-open" data-v="${PG_PAGES[i + 1]}">${ic("arrow")}${esc(t("pg.goto", {x: t("sp.st." + PG_PAGES[i + 1])}))}</button>` : pgNextBtn(p)}${!nextHere && s.next ? `<span class="small muted">${esc(t("pg.next.elsewhere", {x: s.next.label}))}</span>` : ""}</div></div>`;
  return `<div class="pg" data-page="${id}" data-anchor="page-${id}">${pgBar(p)}${pickLastStrip(p)}
    <header class="pg-head"><span class="pg-n">${i + 1}/${PG_PAGES.length}</span><h2>${ic(PG_ICON[id])} ${esc(t("pg.q." + id))}</h2></header>
    <div class="pg-blocks">${didHTML}${youHTML}${nextHTML}</div>
    ${pgBody(p, id)}
    <div class="row pg-foot"><button class="btn sm ghost" data-a="pg-step" data-d="-1" ${i ? "" : "disabled"}>‹ ${esc(i ? t("sp.st." + PG_PAGES[i - 1]) : "")}</button><span style="flex:1"></span><button class="btn sm ghost" data-a="pg-step" data-d="1" ${i < PG_PAGES.length - 1 ? "" : "disabled"}>${esc(i < PG_PAGES.length - 1 ? t("sp.st." + PG_PAGES[i + 1]) : "")} ›</button></div></div>`;
}
/* the page bar inside Pick is the top row already; Pick's own copy of the spine is not drawn twice */
{ const orig = pickTop; pickTop = function(p, k, ready){ return UI.pgInPage ? orig(p, k, ready).replace(/<nav class="pk-spine pg-bar"[\s\S]*?<\/nav>/, "").replace(/<nav class="pk-spine"[\s\S]*?<\/nav>/, "") : orig(p, k, ready); }; }
{ const orig = modeBody; modeBody = function(p){
    if (!pgOn(p)) return orig(p);
    const id = pgCur(p); UI.pgInPage = true;
    try{ return pageHTML(p, id); } finally{ UI.pgInPage = false; } }; }
/* the old stage bar and the mode bar leave the main path: the page bar carries the cover and the seven pages */
{ const orig = stageBar; stageBar = function(p){ return pgOn(p) ? "" : orig(p); }; }
/* the cover shows the page bar too */
{ const orig = statusLine; statusLine = function(p){ return projMode(p) === "pick" && UI.home ? pgBar(p) + orig(p) : orig(p); }; }

/* ---------- kit decisions: at the design station, one at a time in the deck ---------- */
function kitDecidedList(p){
  const k = typeof kitRead === "function" ? kitRead(p) : {}, out = [];
  for (const [key, d] of Object.entries(k || {})){ if (!d || !d.kind) continue; const qk = d.qKey || "kit.q." + key, ok = d.optKey || "kit.o."; const a = t(ok + d.kind), q = t(qk, {x: typeof kit7Product === "function" ? kit7Product(p) : ""}); out.push({key, q: q === qk ? key : q, a: a === ok + d.kind ? d.kind : a, by: d.by || "you", ref: "kit:" + key}); }
  return out;
}
/* before the design station the kits are not asked; what PT would assume is listed on the Design page */
function pgKitsReady(p){ return !!(pickRead(p).tried || arr(p.arch.components).length || arr(p.pkg.sections).length); }
const PG_KIT_EARLY = /^(kit-record|kit-rebuild|co-)/;   // the company record and the existing-product route belong to the idea, not to the design
{ const orig = kitQueue; kitQueue = function(p, add){ if (pgKitsReady(p)) return orig(p, add); return orig(p, x => { if (!/^kit-/.test(str(x && x.kind)) || PG_KIT_EARLY.test(x.kind)) add(x); }); }; }
/* the Pick deck shows one kit decision at a time; the Design page lists them all */
{ const orig = pickQueueCards; pickQueueCards = function(p){ const L = orig(p); let seen = false; return L.filter(c => { if (!/^kit-/.test(str(c.kind))) return true; if (seen) return false; seen = true; return true; }); }; }

/* ---------- "fix automatically" shows what it changed ---------- */
function pgChangeList(p, since){
  const acts = arr(p.acts).filter(a => a.by === "pt" && a.at >= since && !a.undoOf);
  const ok = p.actOK || {}, txt = v => v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 1);
  const rows = acts.map(a => `<div class="item pg-change ${a.undone ? "undone" : ok[a.id] ? "ok" : ""}" data-act="${esc(a.id)}"><div class="body"><div class="row"><b style="flex:1 1 12em">${esc(a.label)}</b><span class="small muted">${esc(arr(a.refs).map(r => refLabel(p, r)).slice(0, 4).join(" · "))}</span></div>
      ${arr(a.patch).length ? a.patch.slice(0, 4).map(e => `<div class="diff small">${lineDiff(txt(e.before), txt(e.after)).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`).join("") + (a.patch.length > 4 ? `<span class="small muted">${esc(t("xp.more", {n: a.patch.length - 4}))}</span>` : "") : `<span class="small muted">${esc(t("pg.change.nodiff"))}</span>`}</div>
      <div class="qacts">${a.undone ? `<span class="small muted">${esc(t("mk.undone"))}</span>` : ok[a.id] ? `<span class="chip st-ok">${ic("check")}${esc(t("pg.change.meant"))}</span>` : `<button class="btn xs primary" data-a="pg-change-ok" data-id="${esc(a.id)}">${ic("check")}${esc(t("pg.change.meant"))}</button><button class="btn xs" data-a="pg-change-no" data-id="${esc(a.id)}">${ic("undo")}${esc(t("pg.change.no"))}</button>`}</div></div>`).join("");
  const sug = queueOf(p).filter(x => (x.cls === "should" || x.cls === "later") && x.who !== "pt").slice(0, 5);
  return `<div class="stack pg-changes" data-anchor="changes"><div class="row"><h3 style="flex:1 1 12em">${esc(t("pg.change.title", {n: acts.length}))}</h3>${acts.some(a => !a.undone && !ok[a.id]) ? `<button class="btn sm" data-a="pg-change-okall">${ic("check")}${esc(t("pg.change.allok"))}</button>` : ""}</div>
    ${acts.length ? `<div class="list">${rows}</div>` : `<p class="small muted">${esc(t("rr.none"))}</p>`}
    ${sug.length ? `<div class="stack" style="gap:4px"><b class="small">${esc(t("pg.change.sug"))}</b><div class="qlist">${sug.map(x => pgRow(p, x)).join("")}</div></div>` : ""}</div>`;
}
Object.assign(ACTIONS, {
  "pg-change-ok": el => { const p = curP(); if (!p) return; p.actOK = p.actOK || {}; p.actOK[el.dataset.id] = now(); touch(p); render(); },   // ok:field  actOK is UI bookkeeping, excluded from the diff (DIFF_SKIP) and never undone
  "pg-change-okall": () => { const p = curP(); if (!p) return; const F = UI.finish; p.actOK = p.actOK || {}; for (const a of arr(p.acts)) if (a.by === "pt" && !a.undone && !a.undoOf && (!F || a.at >= F.startAt)) p.actOK[a.id] = now(); touch(p); render(); },   // ok:field  see pg-change-ok
  "pg-change-no": el => { const p = curP(); if (!p) return; const a = arr(p.acts).find(x => x.id === el.dataset.id); if (!a) return; undoAct(p, a.id); const ref = arr(a.refs)[0]; render(); if (ref){ if (UI.finish && UI.finish.pid === p.id) UI.finishPaused = UI.finish; UI.finish = null; goRef(ref); } }
});
for (const a of ["pg-change-ok", "pg-change-okall"]) ACT_NO.add(a);
{ const orig = finishView; finishView = function(p){ const F = UI.finish, h = orig(p); if (F && UI.finish === F && F.step === "done" && F.startAt) return h.replace(/<\/section>\s*$/, pgChangeList(p, F.startAt) + "</section>"); return h; }; }
{ const orig = DIFF_SKIP; orig.add("actOK"); }
