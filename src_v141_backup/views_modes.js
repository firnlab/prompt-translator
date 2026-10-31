/* ===================== 1.0 PROJECT FRAME AND THE FIVE MODES ===================== */
const MODE_ICON = {steps:"log", blueprint:"layers", journey:"route", swimlanes:"lanes", express:"bolt"};
const ST_DOT = {done:"ok", attn:"warn", cur:"cur", todo:"todo"};
function guided(){ return levelOf(UI.view === "project" ? curP() : null) !== "pro"; }

/* ---------- small shared pieces ---------- */
function askToggle(key){ return `<button class="iconbtn" data-a="ask-section" data-k="${esc(key)}" title="${esc(t("ask.section"))}" aria-label="${esc(t("ask.section"))}">${ic("ask")}</button>`; }
function reportToggle(key){ return `<button class="iconbtn" data-a="tool-report" data-k="${esc(key)}" title="${esc(t("tr.here"))}" aria-label="${esc(t("tr.here"))}">${ic("flag")}</button>`; }
function askSectionBox(key){
  const a = UI.askSec && UI.askSec.k === key ? UI.askSec : null; if (!a) return "";
  return `<div class="askbox" data-ask="${esc(key)}"><div class="row" style="gap:6px"><input type="text" id="ask-sec-in" placeholder="${esc(t("ask.ph"))}" value="${esc(a.q || "")}" style="flex:1;min-width:180px"><button class="btn sm primary" data-a="ask-section-send" data-k="${esc(key)}">${esc(t("ask.send"))}</button>${guided() ? "" : `<span class="chip model">${esc(t("tier.quick"))}</span>`}<button class="btn sm ghost" data-a="ask-section-close">${esc(t("btn.close"))}</button></div>${busyHTML("ask-" + key)}${a.answer ? `<div class="answer">${mdLite(a.answer)}</div>` : ""}</div>`;
}
/* item tools (Edit · Refine… · More) and the inline box live in views13.js (1.3) */
/** one-line item card that opens: used by Express, Blueprint, Journey details and part panels */
function itemRow(p, it){
  const isF = p.focus && p.focus.id === it.ref, open = isF || UI.open.has(it.ref);
  const stillOk = it.flag ? `<button class="btn sm primary" data-a="item-unflag" data-ref="${esc(it.ref)}" title="${esc(t("it.stillok.tip"))}">${ic("check")}${esc(t("it.stillok"))}</button>` : "";
  const confirmBtn = stillOk + (it.st === "as" && it.kind === "assumption" ? `<button class="btn sm primary" data-a="as-validate" data-id="${esc(it.obj ? it.obj.id : "")}" title="${esc(t("as.validate.tip"))}">${ic("check")}${esc(t("as.validate"))}</button>` : it.st === "as" ? `<button class="btn ${guided() ? "primary" : "sm primary"}" data-a="item-confirm" data-ref="${esc(it.ref)}">${ic("check")}${esc(t("btn.confirm"))}</button>` : "");
  const prim = it.kind === "finding" ? findingPrimary(p, it.obj) : it.kind === "test" && it.st === "bad" ? `<button class="btn sm primary" data-a="improve">${esc(t("test.improve"))}</button>` : it.kind === "pq" ? `<button class="btn sm primary" data-a="goto" data-ph="interview">${esc(t("int.answer"))}</button>` : "";
  let body = "";
  if (open){
    const main = it.g ? `<div class="gwt"><b>${esc(t("req.given"))}</b><span>${esc(it.g)}</span><b>${esc(t("req.when"))}</b><span>${esc(it.w)}</span><b>${esc(t("req.then"))}</b><span>${esc(it.th)}</span></div>` : it.kind === "qa" ? `<div class="answer">${esc(it.body)}</div>` : it.body ? clampHTML(it.body, "body:" + it.ref, {lines: 10, cls: "small prew", tag: "div"}) : "";
    const parts = !guided() && it.parts.length ? `<div class="row">${it.parts.map(cid => { const c = arr(p.arch.components).find(x => x.id === cid); return c ? `<button class="chip tap" data-a="selpart" data-v="${esc(cid)}">${esc(c.name)}</button>` : ""; }).join("")}</div>` : "";
    const fl = it.flag ? `<p class="small" style="color:var(--warn)">${ic("flag")} ${esc(t("flags.this", {x: (arr(p.flags).find(f => f.ref === it.ref) || {}).because || ""}))}</p>` : "";
    body = `<div class="ibody">${main}${fl}${parts}<div class="row">${confirmBtn}${prim}${["intake","nsdraft","pq","choice"].includes(it.kind) ? "" : itemTools(it.ref)}</div>${itemBox(it.ref)}</div>`;
  }
  return `<div class="irow ${open ? "open" : ""} ${UI.xSel === it.ref ? "ksel" : ""}" ${isF ? "data-focus" : ""} id="ir-${esc(it.ref)}"><div class="ihead-wrap">${stSlot(it.st)}<button class="ihead" data-a="item-open" data-ref="${esc(it.ref)}" aria-expanded="${!!open}"><span class="iid mono">${esc(it.id)}</span><span class="ititle">${esc(it.title || "—")}</span></button><span class="chips">${markChip(p, it.ref)}</span>${open ? "" : quickPrimary(it)}${inspBtn(it.ref, it.id)}</div>${body}</div>`;
}
function itemList(p, list){ return list.length ? `<div class="ilist">${list.map(i => itemRow(p, i)).join("")}</div>` : `<p class="small muted">${esc(t("nothing.yet"))}</p>`; }

/* ---------- project frame ---------- */
/** the five ways to look at a project: one compact control in the status line (it never pushes the work down) */
function modeBar(p){
  const m = projMode(p), s0 = SUGGEST[p.focus.ph], sug = levelOf(p) === "learn" && s0 === "express" ? null : s0;
  return `<div class="seg modeseg" role="group" aria-label="${esc(t("mode.label"))}">${MODES.map(x => `<button class="${m === x ? "on" : ""}" data-a="mode" data-v="${x}" aria-pressed="${m === x}" title="${esc(t("md." + x) + (sug === x && m !== x ? " · " + t("mode.suggested") : ""))}">${ic(MODE_ICON[x])}<span>${esc(t("m." + x))}</span>${sug === x && m !== x ? `<i class="sugdot" aria-label="${esc(t("mode.suggested"))}"></i>` : ""}</button>`).join("")}</div>`;
}
function stepCard(p, ph){
  const seen = (p.cards || {})[ph];
  const si = stepInfo(p, ph), c = si.c;
  const done = ph === "launch" ? t("sc.ready", {n: readinessScore(p)}) : t("sc.done", {n: c.ok || 0});
  const left = ph === "launch" ? t("sc.left", {n: blockingItems(p).length}) : t("sc.left", {n: si.open});
  if (seen && !UI.cardOpen.has(ph)) return `<button class="stepcard-line" data-a="card-open" data-ph="${ph}">${ic("info")}<span>${esc(t("help." + ph))}</span><span class="muted small">${esc(done)} · ${esc(left)}</span></button>`;
  return `<section class="stepcard"><div class="row" style="justify-content:space-between"><div class="eyebrow">${esc(t("sc.title"))} · ${esc(phName(ph))}</div><button class="btn xs ghost" data-a="card-close" data-ph="${ph}">${esc(t("sc.fold"))}</button></div>
    <p>${esc(t("help." + ph))}</p><div class="row small"><span class="chip st-ok">${esc(done)}</span><span class="chip ${si.open ? "st-warn" : ""}">${esc(left)}</span><span class="chip">${esc(t("sc.time"))}: ${esc(t("time." + ph))}</span></div></section>`;
}
function continueRow(p, ph, where){
  const i = PHASE_IDS.indexOf(ph), prev = PHASE_IDS[i - 1], next = PHASE_IDS[i + 1];
  return `<div class="controw ${where}">${prev ? `<button class="btn ghost" data-a="goto" data-ph="${prev}">← ${esc(phName(prev))}</button>` : "<span></span>"}<span style="flex:1"></span>${where === "bottom" ? `<button class="btn ghost" data-a="top">${ic("up")}${esc(t("btn.top"))}</button>` : ""}${next ? `<button class="btn ${where === "top" ? "" : "primary"}" data-a="goto" data-ph="${next}">${esc(t("btn.continueto", {s: phName(next)}))} →</button>` : ""}</div>`;
}
/** the rich step screen used by every mode */
function stepScreen(p, ph){
  UI.phase = ph;
  return `${stepCard(p, ph)}${viewPhase(p)}`;
}
function modeBody(p){
  const m = projMode(p);
  return {steps: modeSteps, blueprint: modeBlueprint, journey: modeJourney, swimlanes: modeSwimlanes, express: modeExpress}[m](p);
}

/* ---------- mode 1: Steps ---------- */
function spineHTML(p, {compact = false} = {}){
  const ph = p.focus.ph;
  return `<nav class="spine2" aria-label="${esc(t("nav.phases"))}">${STAGES.map(g => ({id: g.id, phases: g.steps})).map(g => `<div class="sgroup"><div class="sglabel">${esc(stName(g.id))}</div>${g.phases.map(o => { const s = phaseState(p, o); const c = stepInfo(p, o).c; return `<button data-a="goto" data-ph="${o}" aria-current="${o === ph ? "step" : "false"}">${stSlot(s)}<span class="sl">${esc(phName(o))}</span>${c.bad ? `<span class="badge bad" title="${esc(t("ist.bad"))}">${c.bad}</span>` : ""}${c.warn ? `<span class="badge warn" title="${esc(t("ist.warn"))}">${c.warn}</span>` : ""}${c.as ? `<span class="badge as" title="${esc(t("ist.as"))}">${c.as}</span>` : ""}</button>`; }).join("")}</div>`).join("")}</nav>`;
}
function modeSteps(p){
  const ph = p.focus.ph;
  return `<div class="steps2">${spineHTML(p)}<section class="stepmain">${continueRow(p, ph, "top")}${stepScreen(p, ph)}${gateCard(p, ph)}</section></div>`;
}

function fullStep(p, ph){
  return `<section class="fullstep"><div class="row" style="justify-content:space-between"><h2>${esc(phName(ph))}</h2>${continueRow(p, ph, "top")}</div>${stepScreen(p, ph)}${gateCard(p, ph)}</section>`;
}

/* ---------- mode 3: Journey ---------- */
function modeJourney(p){
  const ph = p.focus.ph;
  const st = PHASE_IDS.map((o, k) => { const s = phaseState(p, o); return `<button class="station ${s} ${o === ph ? "sel" : ""}" data-a="goto" data-ph="${o}">${o === p.phase ? `<span class="here">${esc(t("j.here"))}</span>` : `<span class="here" aria-hidden="true">&nbsp;</span>`}<span class="ring">${s === "done" ? "✓" : k + 1}</span><span class="sn">${esc(phName(o))}</span></button>`; }).join("");
  const tiles = PHASE_IDS.map(o => {
    const si = stepInfo(p, o), its = si.its, c = si.c, s = phaseState(p, o);
    let nx = "", pct = 0;
    if (o === "launch"){ pct = readinessScore(p); nx = t("rd.title") + " " + pct + "%"; }
    else if (o === "release"){ pct = p.releases.length ? 100 : 0; nx = p.releases.length ? "v" + p.releases[0].v : t("j.after", {s: phName("launch")}); }
    else if (o === "operate"){ pct = p.live ? 100 : 0; nx = p.live ? t("op.livev", {v: p.live.v}) : "—"; }
    else { pct = its.length ? Math.round(c.ok / its.length * 100) : 0; const first = its.find(i => i.st !== "ok"); nx = first ? t("j.next", {x: trunc(first.title, 50)}) : its.length ? t("ph.state.done") : t("ph.state.todo"); }
    return `<button class="tile ${o === ph ? "sel" : ""}" data-a="goto" data-ph="${o}"><span class="tn"><span>${esc(phName(o))}</span><span class="dot ${ST_DOT[s]}"></span></span><span class="meter"><i style="width:${pct}%"></i></span><span class="tc">${its.length ? `<span class="chip">${esc(t("n.items", {n: its.length}))}</span>` : ""}${c.as ? `<span class="chip st-as">${c.as}</span>` : ""}${c.bad ? `<span class="chip st-bad">${c.bad}</span>` : ""}${c.warn ? `<span class="chip st-warn">${c.warn}</span>` : ""}</span><span class="tnext">${esc(nx)}</span></button>`;
  }).join("");
  return `<div class="stack"><div class="journey"><div class="stations">${st}</div></div><div class="tiles">${tiles}</div>${partInline(p)}${fullStep(p, ph)}</div>`;
}

/* ---------- mode 4: Swimlanes + change map ---------- */
const LANE_OF = {human:"you", platform:"platform", ai:"ai", code:"code", hybrid:"hybrid"};
function modeSwimlanes(p){
  const ph = p.focus.ph, comps = arr(p.arch.components);
  let lanesHTML;
  if (!comps.length) lanesHTML = `<div class="empty-state"><p>${esc(t("map.empty"))}</p><button class="btn" data-a="goto" data-ph="arch">${esc(t("btn.continueto", {s: phName("arch")}))}</button></div>`;
  else {
    const {level} = compLevels(p); const n = Math.max(...comps.map(c => level[c.id])) + 1;
    const lanes = ["you","platform","ai","hybrid","code"].filter(l => comps.some(c => LANE_OF[c.kind] === l));
    const cm = UI.cmap, hit = cm && cm.parts ? cm.parts : null, hl = UI.selPart ? [UI.selPart] : focusParts(p);
    let g = `<div class="lgrid" style="grid-template-columns:120px repeat(${n},minmax(130px,1fr))"><div class="lh"></div>${Array.from({length: n}, (_, k) => `<div class="lh">${esc(t("sl.step", {n: k + 1}))}</div>`).join("")}`;
    for (const l of lanes){
      g += `<div class="ln">${esc(t("lane." + l))}</div>`;
      for (let k = 0; k < n; k++){ const ps = comps.filter(c => LANE_OF[c.kind] === l && level[c.id] === k); g += `<div class="lc">${ps.map(c => `<button class="lpart ${hl.includes(c.id) ? "sel" : ""} ${hit ? (hit.includes(c.id) ? "hit" : "dim") : ""} ${lensDim(p, c.id) ? "dim" : ""}" data-a="selpart" data-v="${esc(c.id)}">${stSlot(partState(p, c.id))}<span class="lpn">${esc(c.name)}</span>${lensBadges(p, c.id)}</button>`).join("")}</div>`; }
    }
    lanesHTML = `<div class="lanes">${g}</div></div>`;
  }
  /* change map: what a change would touch */
  const sources = [];
  const byBecause = {}; for (const f of arr(p.flags)){ (byBecause[f.because || "?"] = byBecause[f.because || "?"] || []).push(f.ref); }
  for (const [b, refs] of Object.entries(byBecause)) sources.push({id: "fl:" + b, name: t("cm.flagged", {x: b}), refs});
  for (const it of arr(p.inbox).filter(x => x.on && arr(x.refs).length)) sources.push({id: "ib:" + it.id, name: it.title, refs: it.refs});
  const cm = UI.cmap;
  const refsParts = refs => [...new Set(refs.flatMap(r => { const i = itemByRef(p, r); return i ? i.parts : r.startsWith("component:") ? [r.slice(10)] : []; }))];
  const cmPanel = `<section class="panel stack"><div class="row" style="justify-content:space-between"><h3>${esc(t("cm.title"))}</h3>${cm ? `<button class="btn sm ghost" data-a="cmap" data-v="">${esc(t("btn.close"))}</button>` : ""}</div><p class="small muted">${esc(t("cm.hint"))}</p>
    <div class="row">${sources.map(s => `<button class="cbtn" data-a="cmap" data-v="${esc(s.id)}" aria-pressed="${cm && cm.id === s.id}">${esc(trunc(s.name, 60))}</button>`).join("")}</div>
    <form class="row" data-form="cmap-ask"><input type="text" id="cm-in" placeholder="${esc(t("cm.ph"))}" style="flex:1;min-width:200px" value="${esc(cm && cm.q || "")}"><button class="btn sm ai" type="submit">${ic("spark")}${esc(t("cm.ask"))}</button></form>${busyHTML("impact")}
    ${cm ? `<div class="stack" style="gap:6px"><div>${esc(t("cm.parts", {p: arr(cm.parts).map(id => (comps.find(c => c.id === id) || {}).name || id).join(", ") || "—"}))}</div>${arr(cm.refs).length && !guided() ? `<div class="small muted">${esc(t("cm.items"))}: ${cm.refs.map(esc).join(", ")}</div>` : ""}<div class="small muted">${esc(t("cm.untouched", {n: comps.length - arr(cm.parts).length}))}</div>${cm.summary ? `<p class="small">${esc(cm.summary)}</p>` : ""}${cm.id && cm.id.startsWith("fl:") ? aiBtn("update-affected", t("flags.update"), "M", {key:"upd-req"}) : ""}</div>` : `<p class="small muted">${esc(t("cm.none"))}</p>`}</section>`;
  if (cm && !cm.parts && cm.refs) cm.parts = refsParts(cm.refs);
  return `<div class="stack">${lensBar(p)}${lanesHTML}${cmPanel}${partInline(p)}${fullStep(p, ph)}</div>`;
}

/* ---------- mode 5: Express ---------- */
function modeExpress(p){
  const pi = PHASE_IDS.indexOf(p.phase), ph = p.focus.ph;
  if (!p.intake.raw || !arr(p.qa).length && !arr(p.requirements).length){
    return `<div class="xp"><section class="panel stack"><h2>${esc(t("xp.title"))}</h2><p class="lead">${esc(t("xp.lead"))}</p>${bindArea("p:intake.raw", p.intake.raw, {ph: t("cap.ph"), rows: 9, id: "raw", cls: "bigfield"})}
      <div class="row">${aiBtn("express-draft", t("xp.draft"), "H", {primary: true, key: "express"})}<span class="hint">${esc(t("xp.hint"))}</span></div>${busyHTML("clarify")}${busyHTML("express")}${busyHTML("require")}</section></div>`;
  }
  const shown = PHASE_IDS.filter((o, k) => k <= Math.max(pi, PHASE_IDS.indexOf("require")) && !SPECIAL.includes(o) && o !== "capture" && itemsOf(p, o).length);
  const all = shown.flatMap(o => itemsOf(p, o)), a = all.filter(i => i.st === "as").length;
  /* 1.3: what needs you comes first; everything already settled is folded per step */
  const need = all.filter(i => ["as", "bad", "warn"].includes(i.st) || (p.newRefs && p.newRefs[i.ref]));
  const lim = UI.xMore ? need.length : 15, shownNeed = need.slice(0, lim);
  UI.xList = shownNeed.map(i => i.ref);
  const oneClick = need.filter(i => i.st === "as" && i.kind !== "assumption").length, toCheck = need.filter(i => i.st === "as" && i.kind === "assumption").length;
  const needCard = need.length ? `<div class="xcard xneed" id="xc-need"><header><b>${esc(t("xp.needs", {n: need.length}))}</b><span class="row">${oneClick ? `<button class="btn sm primary" data-a="confirm-all-as">${ic("check")}${esc(t("xp.acceptall", {n: oneClick}))}</button>` : ""}</span></header>
    <p class="small muted" style="padding:0 14px">${esc(t("xp.keys"))}${toCheck ? " · " + esc(t("xp.tocheck", {n: toCheck})) : ""}</p>${itemList(p, shownNeed)}${need.length > lim ? `<div class="row" style="padding:8px 14px">${btn("xp-more", t("xp.more", {n: need.length - lim}), {cls: "sm"})}</div>` : ""}</div>` : `<div class="xcard"><header><b>${ic("check")} ${esc(t("xp.allset"))}</b></header></div>`;
  const cards = shown.map(o => { const its = itemsOf(p, o), c = countSt(its), open = UI.xOpen && UI.xOpen.has(o); return `<div class="xcard" id="xc-${o}"><header><b>${esc(phName(o))}</b><span class="row"><span class="chip st-ok">${ic("check")} ${esc(t("xp.okn", {n: c.ok}))}</span>${c.as ? `<span class="chip st-as">${c.as} ${esc(t("ist.as"))}</span>${its.some(i => i.st === "as" && i.kind !== "assumption") ? `<button class="btn sm" data-a="confirm-step" data-ph="${o}">${esc(t("as.confirmstep"))}</button>` : ""}` : ""}${c.bad || c.warn ? `<span class="chip st-bad">${(c.bad || 0) + (c.warn || 0)} ${esc(t("ist.bad"))}</span>` : ""}<button class="btn sm ghost" data-a="xp-fold" data-ph="${o}" aria-expanded="${!!open}">${esc(open ? t("xp.hideall") : t("xp.showall", {n: its.length}))}</button><button class="btn sm ghost" data-a="goto-steps" data-ph="${o}">${esc(t("xp.openfull"))}</button></span></header>${open ? itemList(p, its) : ""}</div>`; }).join("");
  const nx = PHASE_IDS[pi + 1];
  const special = SPECIAL.includes(ph) ? `<div class="xcard" data-focus><header><b>${esc(phName(ph))}</b></header><div style="padding:14px">${stepScreen(p, ph)}</div></div>` : "";
  const next = nx && !SPECIAL.includes(p.phase) ? `<div class="xnext"><span>${esc(t("xp.next", {s: phName(nx)}))}</span>${SPECIAL.includes(nx) ? `<button class="btn sm primary" data-a="goto" data-ph="${nx}">${esc(t("btn.continueto", {s: phName(nx)}))}</button>` : aiBtn("express-next", t("xp.draftnext", {s: phName(nx)}), "H", {primary: true, key: nx === "arch" ? "arch" : nx === "build" ? "compile" : nx === "review" ? "review" : "sim"})}</div>` : "";
  return `<div class="xp"><div class="bubble you"><div class="eyebrow">${esc(t("xp.you"))}</div>${esc(trunc(p.intake.raw, 400))}</div>
    <div class="bubble ai">${esc(t("xp.ai", {n: all.length, m: shown.length, a}))}</div>
    <form class="askbox" data-form="express-change"><label for="xp-in" class="small muted">${esc(t("xp.change"))}</label><textarea id="xp-in" rows="2" placeholder="${esc(t("xp.changeph"))}"></textarea><div class="row"><button class="btn sm primary" type="submit">${esc(t("ask.send"))}</button><button class="btn sm ghost" type="button" data-a="dc-open">${ic("route")}${esc(t("cm.title"))}</button></div>${busyHTML("guide")}</form>
    ${busyHTML("arch")}${busyHTML("compile")}${busyHTML("review")}${busyHTML("sim")}${busyHTML("judge")}${needCard}${next}${special}${cards}</div>`;
}
