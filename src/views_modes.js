/* ===================== 1.0 PROJECT FRAME (2.0: the five 1.x modes are gone; Pick Mode and Chat Mode are the two faces, v200_modes.js) ===================== */
const MODE_ICON = {};
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
/** one-line item card that opens: used by the part panels and the page details */
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
/** the faces of a project (2.0: Pick Mode and Chat Mode; v200_modes.js draws the switch) */
function modeBar(p){ return ""; }
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
function modeBody(p){ return ""; }   // the faces fill it (v150_pick.js: Pick Mode, v200_modes.js: Chat Mode)

/* ---------- the full step (the "all details" of a page) ---------- */
function fullStep(p, ph){
  return `<section class="fullstep"><div class="row" style="justify-content:space-between"><h2>${esc(phName(ph))}</h2>${continueRow(p, ph, "top")}</div>${stepScreen(p, ph)}${gateCard(p, ph)}</section>`;
}
