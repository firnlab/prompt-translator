/* ===================== 1.0 PROJECT FRAME AND THE FIVE MODES ===================== */
const MODE_ICON = {steps:"log", blueprint:"layers", journey:"route", swimlanes:"lanes", express:"bolt"};
const ST_DOT = {done:"ok", attn:"warn", cur:"cur", todo:"todo"};
function guided(){ const h = WS.settings.help || (WS.settings.guided ? "guided" : "pro"); return h !== "pro"; }

/* ---------- small shared pieces ---------- */
function stChip(st){ return `<span class="chip st-${st}">${esc(t("ist." + st))}</span>`; }
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
    const main = it.g ? `<div class="gwt"><b>${esc(t("req.given"))}</b><span>${esc(it.g)}</span><b>${esc(t("req.when"))}</b><span>${esc(it.w)}</span><b>${esc(t("req.then"))}</b><span>${esc(it.th)}</span></div>` : it.kind === "qa" ? `<div class="answer">${esc(it.body)}</div>` : it.body ? `<div class="small" style="white-space:pre-wrap">${esc(trunc(it.body, 1200))}</div>` : "";
    const parts = !guided() && it.parts.length ? `<div class="row">${it.parts.map(cid => { const c = arr(p.arch.components).find(x => x.id === cid); return c ? `<button class="chip tap" data-a="selpart" data-v="${esc(cid)}">${esc(c.name)}</button>` : ""; }).join("")}</div>` : "";
    const fl = it.flag ? `<p class="small" style="color:var(--warn)">${ic("flag")} ${esc(t("flags.this", {x: (arr(p.flags).find(f => f.ref === it.ref) || {}).because || ""}))}</p>` : "";
    body = `<div class="ibody">${main}${fl}${parts}<div class="row">${confirmBtn}${prim}${["intake","nsdraft","pq","choice"].includes(it.kind) ? "" : itemTools(it.ref)}</div>${itemBox(it.ref)}</div>`;
  }
  return `<div class="irow ${open ? "open" : ""} ${UI.xSel === it.ref ? "ksel" : ""}" ${isF ? "data-focus" : ""} id="ir-${esc(it.ref)}"><div class="ihead-wrap"><button class="ihead" data-a="item-open" data-ref="${esc(it.ref)}" aria-expanded="${!!open}"><span class="dot ${it.st}"></span>${guided() ? "" : `<span class="iid mono">${esc(it.id)}</span>`}<span class="ititle">${esc(it.title || "—")}</span>${markChip(p, it.ref)}${markOf(p, it.ref) && it.st === "ok" ? "" : stChip(it.st)}</button>${open ? "" : quickPrimary(it)}</div>${body}</div>`;
}
function itemList(p, list){ return list.length ? `<div class="ilist">${list.map(i => itemRow(p, i)).join("")}</div>` : `<p class="small muted">${esc(t("nothing.yet"))}</p>`; }

/* ---------- project frame ---------- */
function modeBar(p){
  const m = projMode(p), sug = SUGGEST[p.focus.ph];
  return `<div class="modebar" role="group" aria-label="${esc(t("mode.label"))}">${MODES.map(x => `<button class="modebtn" data-a="mode" data-v="${x}" aria-pressed="${m === x}">${sug === x && m !== x ? `<span class="sug">${esc(t("mode.suggested"))}</span>` : ""}<span class="mname">${ic(MODE_ICON[x])}${esc(t("m." + x))}</span>${guided() ? "" : `<span class="mdesc">${esc(t("md." + x))}</span>`}</button>`).join("")}
    <div class="modeopts">${helpSeg()}${miniMapToggle()}</div></div>`;
}
function guideBox(p){
  const ph = p.focus.ph, its = SPECIAL.includes(ph) ? [] : itemsOf(p, ph);
  const as = its.filter(i => i.st === "as"), bad = its.filter(i => i.st === "bad");
  let what, act;
  if (ph === "launch"){ const n = beforeCopy(p).filter(x => x.block).length; what = n ? t("g.fixleft", {n}) : t("g.copy"); act = n ? `<button class="btn primary lg" data-a="fix-all">${esc(t("rd.fixall", {n}))}</button>` : `<button class="btn primary lg" data-a="goto" data-ph="launch" data-scroll="brief">${ic("copy")}${esc(t("brief.copyline"))}</button>`; }
  else if (as.length){ what = t("g.confirm", {x: trunc(as[0].title, 60)}); act = `<button class="btn primary lg" data-a="focus-item" data-ref="${esc(as[0].ref)}">${esc(t("g.show"))}</button>`; }
  else if (bad.length){ what = t("g.fix", {x: trunc(bad[0].title, 60)}); act = `<button class="btn primary lg" data-a="focus-item" data-ref="${esc(bad[0].ref)}">${esc(t("g.show"))}</button>`; }
  else { const nb = nextBest10(p); const nx = nb.phase !== ph ? nb.phase : PHASE_IDS[PHASE_IDS.indexOf(ph) + 1]; what = nb.phase === ph ? t(nb.key) : t("g.next", {s: phName(nx || ph)}); act = nb.phase === ph ? `<button class="btn primary lg" data-a="guide-run" data-ph="${ph}">${esc(t("g.do"))}</button>` : nx ? `<button class="btn primary lg" data-a="goto" data-ph="${nx}">${esc(t("btn.continueto", {s: phName(nx)}))}</button>` : ""; }
  return `<div class="guide"><div class="where">${esc(t("g.where", {x: phName(ph)}))}</div><div class="what">${esc(what)}</div><p>${esc(t("help." + ph))}</p><div class="row">${act}<button class="btn ghost" data-a="panel" data-v="guide">${ic("ask")}${esc(t("g.ask"))}</button></div></div>`;
}
function bannersHTML(p){
  let h = "";
  const fl = arr(p.flags);
  if (fl.length){ const bec = [...new Set(fl.map(f => f.because).filter(Boolean))].slice(0, 3).join(", "); h += `<div class="banner warnb"><span class="dot warn"></span><span style="flex:1;min-width:220px">${esc(t("flags.banner", {n: fl.length, x: bec || "—"}))}</span>${aiBtn("update-affected", t("flags.update"), "M", {key:"upd-req"})}<button class="btn sm ghost" data-a="flags-show">${esc(t("flags.show"))}</button></div>${busyHTML("upd-req")}${busyHTML("upd-sec")}${busyHTML("upd-test")}`; }
  const as = assumedItems(p);
  if (as.length && projMode(p) !== "express") h += `<div class="banner asb"><span class="dot as"></span><span style="flex:1;min-width:220px">${UI.prevMode === "express" ? "<b>" + esc(t("as.fromexpress")) + "</b> " : ""}${esc(t("as.banner", {n: as.length}))}</span><button class="btn sm" data-a="focus-item" data-ref="${esc(as[0].ref)}">${esc(t("g.showfirst"))}</button>${as.length > 1 ? `<button class="btn sm ghost" data-a="confirm-all-assumed">${esc(t("as.confirmall"))}</button>` : ""}</div>`;
  if (UI.express) h += `<div class="banner"><span class="pulse"></span><span>${esc(t("xp.step", {i: UI.express.step, n: UI.express.of}))}</span></div>`;
  return h;
}
function stepCard(p, ph){
  const seen = (p.cards || {})[ph];
  const its = SPECIAL.includes(ph) ? [] : itemsOf(p, ph), c = countSt(its);
  const done = ph === "launch" ? t("sc.ready", {n: readinessScore(p)}) : t("sc.done", {n: c.ok});
  const left = ph === "launch" ? t("sc.left", {n: beforeCopy(p).filter(x => x.block).length}) : t("sc.left", {n: c.bad + c.as + c.warn + c.todo});
  if (seen && !UI.cardOpen.has(ph)) return `<button class="stepcard-line" data-a="card-open" data-ph="${ph}">${ic("info")}<span>${esc(t("help." + ph))}</span><span class="muted small">${esc(done)} · ${esc(left)}</span></button>`;
  return `<section class="stepcard"><div class="row" style="justify-content:space-between"><div class="eyebrow">${esc(t("sc.title"))} · ${esc(phName(ph))}</div><button class="btn xs ghost" data-a="card-close" data-ph="${ph}">${esc(t("sc.fold"))}</button></div>
    <p>${esc(t("help." + ph))}</p><div class="row small"><span class="chip st-ok">${esc(done)}</span><span class="chip ${c.bad + c.as + c.warn + c.todo ? "st-warn" : ""}">${esc(left)}</span><span class="chip">${esc(t("sc.time"))}: ${esc(t("time." + ph))}</span></div></section>`;
}
function continueRow(p, ph, where){
  const i = PHASE_IDS.indexOf(ph), prev = PHASE_IDS[i - 1], next = PHASE_IDS[i + 1];
  return `<div class="controw ${where}">${prev ? `<button class="btn ghost" data-a="goto" data-ph="${prev}">← ${esc(phName(prev))}</button>` : "<span></span>"}<span style="flex:1"></span>${where === "bottom" ? `<button class="btn ghost" data-a="top">${ic("up")}${esc(t("btn.top"))}</button>` : ""}${next ? `<button class="btn primary" data-a="goto" data-ph="${next}">${esc(t("btn.continueto", {s: phName(next)}))} →</button>` : ""}</div>`;
}
/** the rich step screen used by every mode */
function stepScreen(p, ph){
  UI.phase = ph;
  return `${stepCard(p, ph)}${viewPhase(p)}`;
}
function modeBody(p){
  const m = projMode(p);
  const body = {steps: modeSteps, blueprint: modeBlueprint, journey: modeJourney, swimlanes: modeSwimlanes, express: modeExpress}[m](p);
  if (WS.settings.layout === "map" && m !== "blueprint") return `<div class="homeB"><aside class="mini">${miniMap(p)}</aside><div style="min-width:0">${body}</div></div>`;
  return body;
}

/* ---------- mode 1: Steps ---------- */
function spineHTML(p, {compact = false} = {}){
  const ph = p.focus.ph;
  return `<nav class="spine2" aria-label="${esc(t("nav.phases"))}">${PHASE_GROUPS.map(g => `<div class="sgroup"><div class="sglabel">${esc(t("grp." + g.id))}</div>${g.phases.map(o => { const s = phaseState(p, o); const its = SPECIAL.includes(o) ? [] : itemsOf(p, o); const c = countSt(its); const nf = arr(p.flags).filter(f => (itemByRef(p, f.ref) || {}).ph === o).length; return `<button data-a="goto" data-ph="${o}" aria-current="${o === ph ? "step" : "false"}"><span class="dot ${ST_DOT[s]}"></span><span class="sl">${esc(phName(o))}</span>${c.bad ? `<span class="badge bad" title="${esc(t("ist.bad"))}">${c.bad}</span>` : ""}${nf ? `<span class="badge warn" title="${esc(t("ist.warn"))}">${nf}</span>` : ""}${c.as ? `<span class="badge as" title="${esc(t("ist.as"))}">${c.as}</span>` : ""}</button>`; }).join("")}</div>`).join("")}</nav>`;
}
function modeSteps(p){
  const ph = p.focus.ph;
  return `<div class="steps2">${spineHTML(p)}<section class="stepmain" ${p.focus.id ? "" : "data-focus"}>${continueRow(p, ph, "top")}${stepScreen(p, ph)}${continueRow(p, ph, "bottom")}</section></div>`;
}

/* ---------- the map (Blueprint, Architecture, mini map) ---------- */
function compLevels(p){
  const comps = arr(p.arch.components); const ids = comps.map(c => c.id), level = {}; ids.forEach(i => level[i] = 0);
  const links = arr(p.arch.links).filter(l => ids.includes(l.from) && ids.includes(l.to) && l.from !== l.to);
  for (let k = 0; k < comps.length; k++) for (const l of links) if (level[l.to] < level[l.from] + 1 && level[l.from] + 1 < comps.length) level[l.to] = level[l.from] + 1;
  return {level, links};
}
function mapHTML(p, {id = "bp", compact = false, hl = [], hit = null, sel = null} = {}){
  const comps = arr(p.arch.components);
  if (!comps.length) return `<div class="empty-state"><p>${esc(t("map.empty"))}</p><button class="btn" data-a="goto" data-ph="arch">${esc(t("btn.continueto", {s: phName("arch")}))}</button></div>`;
  const {level, links} = compLevels(p);
  const rows = []; for (const c of comps){ (rows[level[c.id]] = rows[level[c.id]] || []).push(c); }
  const node = c => {
    const s = partState(p, c.id), its = allItems(p).filter(i => i.kind !== "component" && i.parts.includes(c.id)), cnt = countSt(its);
    const cls = [sel === c.id ? "sel" : hl.includes(c.id) ? "lnk" : "", hit ? (hit.includes(c.id) ? "hit" : "dim") : ""].join(" ");
    return `<button class="bp-node k-${esc(c.kind)} ${cls}" data-a="selpart" data-v="${esc(c.id)}" data-node="${esc(c.id)}"><span class="bp-st dot ${s}"></span><b>${esc(c.name)}</b>${compact ? "" : `<span class="bp-k">${esc(t("kind." + c.kind))}${c.model && !guided() ? " · " + esc(c.model) : ""}</span>`}${!compact && (cnt.bad || cnt.warn || cnt.as) ? `<span class="bp-badges">${cnt.bad ? `<i class="b bad">${cnt.bad}</i>` : ""}${cnt.warn ? `<i class="b warn">${cnt.warn}</i>` : ""}${cnt.as ? `<i class="b as">${cnt.as}</i>` : ""}</span>` : ""}</button>`;
  };
  const zoom = compact ? 1 : (UI.mapZoom || 1);
  return `<div class="bpmap ${compact ? "compact" : ""}" data-map="${esc(id)}" data-edges="${esc(JSON.stringify(links.map(l => [l.from, l.to, compact ? "" : l.label])))}" style="zoom:${zoom}"><svg class="bp-edges" aria-hidden="true"></svg>${rows.map((r, i) => `<div class="bp-row">${(r || []).map(node).join("")}</div>`).join("")}</div>`;
}
/* draws the arrows after layout so boxes keep their full text and nothing overlaps.
   1.3: arrow labels are placed where they collide with nothing: PT tries points along each arrow (middle first, then thirds,
   quarters, either side of the line) and keeps the first free one. A label that fits nowhere becomes a small numbered
   marker on its arrow, with the full text in a key under the map. auditMaps() proves it (used by the tests). */
function bez(P, t){ const u = 1 - t; return {x: u*u*u*P[0].x + 3*u*u*t*P[1].x + 3*u*t*t*P[2].x + t*t*t*P[3].x, y: u*u*u*P[0].y + 3*u*u*t*P[1].y + 3*u*t*t*P[2].y + t*t*t*P[3].y}; }
function rectHit(a, b, pad = 3){ return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y; }
function drawMaps(){
  for (const m of $$(".bpmap")){
    const svg = m.querySelector(".bp-edges"); if (!svg) continue;
    m.querySelectorAll(".bp-label, .bp-mark, .bp-nmark").forEach(x => x.remove());
    const key0 = m.parentElement && m.parentElement.querySelector(":scope > .bp-key[data-for='" + m.dataset.map + "']"); if (key0) key0.remove();
    const box = m.getBoundingClientRect(), z = parseFloat(m.style.zoom || 1) || 1;
    const W = m.scrollWidth, H = m.scrollHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    let edges = []; try{ edges = JSON.parse(m.dataset.edges || "[]"); }catch(e){}
    const rect = id => { const n = m.querySelector(`[data-node="${CSS.escape(id)}"]`); if (!n) return null; const r = n.getBoundingClientRect(); return {x: (r.left - box.left) / z, y: (r.top - box.top) / z, w: r.width / z, h: r.height / z}; };
    const nodes = [...m.querySelectorAll("[data-node]")].map(n => rect(n.dataset.node)).filter(Boolean);
    let d = ""; const curves = [];
    for (const [a, b, label] of edges){
      const A = rect(a), B = rect(b); if (!A || !B) continue;
      let P;
      if (B.y > A.y + A.h - 2){ const x1 = A.x + A.w / 2, y1 = A.y + A.h, x2 = B.x + B.w / 2, y2 = B.y; const my = (y1 + y2) / 2; P = [{x: x1, y: y1}, {x: x1, y: my}, {x: x2, y: my}, {x: x2, y: y2 - 2}]; }
      else { const right = B.x >= A.x; const x1 = right ? A.x + A.w : A.x, y1 = A.y + A.h / 2, x2 = right ? B.x + B.w : B.x, y2 = B.y + B.h / 2; const off = right ? 46 : -46; P = [{x: x1, y: y1}, {x: x1 + off, y: y1}, {x: x2 + off, y: y2}, {x: x2 + (right ? 2 : -2), y: y2}]; }
      d += `<path d="M${P[0].x},${P[0].y} C${P[1].x},${P[1].y} ${P[2].x},${P[2].y} ${P[3].x},${P[3].y}" class="bp-edge" marker-end="url(#ah-${m.dataset.map})"/>`;
      if (label) curves.push({P, label, a, b});
    }
    svg.innerHTML = `<defs><marker id="ah-${m.dataset.map}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="bp-ah"/></marker></defs>` + d;
    const placed = [], marks = [], TS = [0.5, 0.38, 0.62, 0.28, 0.72, 0.2, 0.8];
    const free = r => r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H && !nodes.some(n => rectHit(r, n)) && !placed.some(q => rectHit(r, q, 2));
    for (const c of curves){
      const el = document.createElement("span"); el.className = "bp-label"; el.textContent = c.label; el.style.visibility = "hidden"; m.appendChild(el);
      const w = el.offsetWidth, h = el.offsetHeight; let spot = null;
      outer: for (const tt of TS){ const pt = bez(c.P, tt); for (const [dx, dy] of [[0, 0], [w / 2 + 8, 0], [-w / 2 - 8, 0], [0, -h / 2 - 6], [0, h / 2 + 6]]){ const r = {x: pt.x + dx - w / 2, y: pt.y + dy - h / 2, w, h}; if (free(r)){ spot = r; break outer; } } }
      if (spot){ el.style.left = (spot.x + w / 2) + "px"; el.style.top = (spot.y + h / 2) + "px"; el.style.visibility = ""; placed.push(spot); continue; }
      el.remove();
      // no free spot: a numbered marker on the arrow, the text goes into the key under the map
      const n = marks.length + 1; let ms = null;
      outer2: for (let tt = 0.5, k = 0; k < 17; k++, tt = 0.5 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.05){ const pt = bez(c.P, tt); for (const [dx, dy] of [[0, 0], [14, 0], [-14, 0], [0, 14], [0, -14]]){ const r = {x: pt.x + dx - 9, y: pt.y + dy - 9, w: 18, h: 18}; if (free(r)){ ms = r; break outer2; } } }
      if (ms){ const mk = document.createElement("span"); mk.className = "bp-mark"; mk.textContent = n; mk.title = c.label; mk.style.left = (ms.x + 9) + "px"; mk.style.top = (ms.y + 9) + "px"; m.appendChild(mk); placed.push(ms); }
      else { const src = m.querySelector(`[data-node="${CSS.escape(c.a)}"]`); if (src){ const mk = document.createElement("span"); mk.className = "bp-nmark"; mk.textContent = "→" + n; mk.title = c.label; src.appendChild(mk); } }   // no room anywhere: the number sits inside the box the arrow starts from
      marks.push(c);
    }
    if (marks.length && m.parentElement){
      const nm = id => { const n = m.querySelector(`[data-node="${CSS.escape(id)}"] b`); return n ? n.textContent : id; };
      const k = document.createElement("ol"); k.className = "bp-key small"; k.dataset.for = m.dataset.map;
      k.innerHTML = marks.map((c, i) => `<li><span class="bp-mark static">${i + 1}</span> ${esc(c.label)} <span class="muted">(${esc(nm(c.a))} → ${esc(nm(c.b))})</span></li>`).join("");
      m.after(k);
    }
  }
}
/** checks every map: no box text spills out of its box, no label touches a box or another label (the tests call this) */
function auditMaps(){
  const out = [];
  for (const m of $$(".bpmap")){
    const box = m.getBoundingClientRect(), z = parseFloat(m.style.zoom || 1) || 1;
    const R = el => { const r = el.getBoundingClientRect(); return {x: (r.left - box.left) / z, y: (r.top - box.top) / z, w: r.width / z, h: r.height / z}; };
    const nodes = [...m.querySelectorAll("[data-node]")], labels = [...m.querySelectorAll(".bp-label, .bp-mark")];
    for (const n of nodes){ for (const c of n.querySelectorAll("b, .bp-k")) if (c.scrollWidth > c.clientWidth + 1 || c.getBoundingClientRect().right > n.getBoundingClientRect().right + 1) out.push({kind: "overflow", map: m.dataset.map, text: c.textContent.slice(0, 60)}); }
    const nr = nodes.map(R), lr = labels.map(R);
    lr.forEach((l, i) => { if (nr.some(n => rectHit(l, n, 0))) out.push({kind: "label-on-box", map: m.dataset.map, text: labels[i].textContent.slice(0, 60)}); lr.forEach((o, j) => { if (j > i && rectHit(l, o, 0)) out.push({kind: "label-on-label", map: m.dataset.map, text: labels[i].textContent.slice(0, 40) + " / " + labels[j].textContent.slice(0, 40)}); }); });
  }
  return out;
}
function mapLegend(){ return `<div class="legend">${["ok","as","warn","bad","todo"].map(s => `<span><span class="dot ${s}"></span>${esc(t("ist." + s))}</span>`).join("")}</div>`; }
function miniMap(p){ return `<div class="eyebrow">${esc(t("m.blueprint"))}</div><div class="mapwrap">${mapHTML(p, {id:"mini", compact:true, hl: focusParts(p), sel: UI.selPart})}</div>`; }
function focusParts(p){ const it = p.focus.id ? itemByRef(p, p.focus.id) : null; return it ? it.parts : []; }
function partPanel(p, cid){
  const c = arr(p.arch.components).find(x => x.id === cid); if (!c) return "";
  const its = allItems(p).filter(i => i.kind !== "component" && i.parts.includes(cid));
  const phs = PHASE_IDS.filter(o => its.some(i => i.ph === o));
  return `<section class="panel stack" data-focus><div class="row" style="justify-content:space-between"><div class="stack" style="gap:2px"><span class="eyebrow">${esc(t("kind." + c.kind))}${c.model && !guided() ? " · " + esc(c.model) : ""}</span><h3>${esc(c.name)}</h3><span class="small muted">${esc(c.role)}</span></div><button class="btn sm ghost" data-a="clearsel">${esc(t("bp.back"))}</button></div>
    <div class="row">${itemTools("component:" + c.id)}</div>${itemBox("component:" + c.id)}
    <div class="eyebrow">${esc(t("bp.linked"))}</div>
    ${phs.length ? phs.map(o => `<div class="stack" style="gap:6px"><span class="small muted">${esc(phName(o))}</span>${itemList(p, its.filter(i => i.ph === o))}</div>`).join("") : `<p class="small muted">${esc(t("bp.nolinks"))}</p>`}</section>`;
}
function stepStrip(p){ return `<div class="strip">${PHASE_IDS.map(o => `<button data-a="goto" data-ph="${o}" aria-current="${o === p.focus.ph ? "step" : "false"}"><span class="dot ${ST_DOT[phaseState(p, o)]}"></span>${esc(phName(o))}</button>`).join("")}</div>`; }
function fullStep(p, ph){
  return `<section class="fullstep" ${p.focus.id || UI.selPart ? "" : "data-focus"}><div class="row" style="justify-content:space-between"><h2>${esc(phName(ph))}</h2>${continueRow(p, ph, "top")}</div>${stepScreen(p, ph)}${continueRow(p, ph, "bottom")}</section>`;
}

/* ---------- mode 2: Blueprint ---------- */
function modeBlueprint(p){
  const ph = p.focus.ph;
  const side = UI.selPart ? partPanel(p, UI.selPart) : `<section class="panel stack"><span class="eyebrow">${esc(t("ph.state." + phaseState(p, ph)))}</span><h3>${esc(phName(ph))}</h3>${SPECIAL.includes(ph) ? `<p class="small muted">${esc(t("help." + ph))}</p>` : itemList(p, itemsOf(p, ph))}</section>`;
  return `<div class="stack">${stepStrip(p)}<div class="bp2"><div class="stack"><div class="row" style="justify-content:space-between">${mapLegend()}<div class="row" style="gap:4px"><button class="iconbtn" data-a="map-zoom" data-v="-1" title="${esc(t("map.out"))}">−</button><button class="iconbtn" data-a="map-zoom" data-v="1" title="${esc(t("map.in"))}">+</button><button class="iconbtn" data-a="map-full" title="${esc(t("map.full"))}">${ic("expand")}</button></div></div><div class="mapwrap">${mapHTML(p, {id:"bp", hl: focusParts(p), sel: UI.selPart})}</div><p class="hint">${esc(t("bp.hint"))}</p></div><div>${side}</div></div>${fullStep(p, ph)}</div>`;
}

/* ---------- mode 3: Journey ---------- */
function modeJourney(p){
  const ph = p.focus.ph;
  const st = PHASE_IDS.map((o, k) => { const s = phaseState(p, o); return `<button class="station ${s} ${o === ph ? "sel" : ""}" data-a="goto" data-ph="${o}">${o === p.phase ? `<span class="here">${esc(t("j.here"))}</span>` : `<span class="here" aria-hidden="true">&nbsp;</span>`}<span class="ring">${s === "done" ? "✓" : k + 1}</span><span class="sn">${esc(phName(o))}</span></button>`; }).join("");
  const tiles = PHASE_IDS.map(o => {
    const its = SPECIAL.includes(o) ? [] : itemsOf(p, o), c = countSt(its), s = phaseState(p, o);
    let nx = "", pct = 0;
    if (o === "launch"){ pct = readinessScore(p); nx = t("rd.title") + " " + pct + "%"; }
    else if (o === "release"){ pct = p.releases.length ? 100 : 0; nx = p.releases.length ? "v" + p.releases[0].v : t("j.after", {s: phName("launch")}); }
    else if (o === "operate"){ pct = p.live ? 100 : 0; nx = p.live ? t("op.livev", {v: p.live.v}) : "—"; }
    else { pct = its.length ? Math.round(c.ok / its.length * 100) : 0; const first = its.find(i => i.st !== "ok"); nx = first ? t("j.next", {x: trunc(first.title, 50)}) : its.length ? t("ph.state.done") : t("ph.state.todo"); }
    return `<button class="tile ${o === ph ? "sel" : ""}" data-a="goto" data-ph="${o}"><span class="tn"><span>${esc(phName(o))}</span><span class="dot ${ST_DOT[s]}"></span></span><span class="meter"><i style="width:${pct}%"></i></span><span class="tc">${its.length ? `<span class="chip">${esc(t("n.items", {n: its.length}))}</span>` : ""}${c.as ? `<span class="chip st-as">${c.as}</span>` : ""}${c.bad ? `<span class="chip st-bad">${c.bad}</span>` : ""}${c.warn ? `<span class="chip st-warn">${c.warn}</span>` : ""}</span><span class="tnext">${esc(nx)}</span></button>`;
  }).join("");
  return `<div class="stack"><div class="journey"><div class="stations">${st}</div></div><div class="tiles">${tiles}</div>${UI.selPart ? partPanel(p, UI.selPart) : ""}${fullStep(p, ph)}</div>`;
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
      for (let k = 0; k < n; k++){ const ps = comps.filter(c => LANE_OF[c.kind] === l && level[c.id] === k); g += `<div class="lc">${ps.map(c => `<button class="lpart ${hl.includes(c.id) ? "sel" : ""} ${hit ? (hit.includes(c.id) ? "hit" : "dim") : ""}" data-a="selpart" data-v="${esc(c.id)}"><span class="dot ${partState(p, c.id)}"></span>${esc(c.name)}</button>`).join("")}</div>`; }
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
  return `<div class="stack">${stepStrip(p)}${lanesHTML}${cmPanel}${UI.selPart ? partPanel(p, UI.selPart) : ""}${fullStep(p, ph)}</div>`;
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
