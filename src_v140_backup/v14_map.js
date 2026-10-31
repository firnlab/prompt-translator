/* ===================== 1.4 ONE MAP WITH LENSES =====================
   The tool as its parts. Lines run at right angles in the gaps between rows, under the boxes, never through text;
   several lines from one box share a trunk; loops go round the side (dashed); hand-offs to a person are dotted.
   What a box receives is written inside it. Lenses lay information over the same map: Needs you (default), Changed since
   your last visit, Tested, Risks & assumptions, Who decided, Impact, Cost. On a phone the map is a list. */
const LENS14 = ["needs","changed","tested","risks","who","impact","cost"];
function lensOn(id){ UI.lenses = UI.lenses instanceof Set ? UI.lenses : new Set(["needs"]); return UI.lenses.has(id); }
function lensBar(p){
  if (!arr(p.arch.components).length) return "";
  lensOn("needs");
  return `<div class="lensbar" role="group" aria-label="${esc(t("lens.label"))}"><span class="small muted">${esc(t("lens.label"))}</span>${LENS14.map(id => `<button class="chip tap ${UI.lenses.has(id) ? "sel" : ""}" data-a="lens14" data-v="${id}" aria-pressed="${UI.lenses.has(id)}" title="${esc(t("lens.tip." + id))}">${esc(t("lens." + id))}</button>`).join("")}
    <span style="flex:1"></span><div class="seg" role="group" aria-label="${esc(t("map.detail"))}">${["stages","parts","items"].map(d => `<button class="${(UI.mapDetail || "parts") === d ? "on" : ""}" data-a="map-detail" data-v="${d}">${esc(t("map.d." + d))}</button>`).join("")}</div></div>`;
}
/* ---------- what each lens says about one part ---------- */
function compItems(p, cid){ return allItems(p).filter(i => i.kind !== "component" && arr(i.parts).includes(cid)); }
function compRefs(p, cid){ return new Set(["component:" + cid, ...compItems(p, cid).map(i => i.ref)]); }
function lensInfo(p, cid){
  const c = arr(p.arch.components).find(x => x.id === cid) || {}, refs = compRefs(p, cid), q = queueOf(p);
  const needs = q.filter(x => refs.has(x.ref) && (x.cls === "block" || x.cls === "should" || x.cls === "check"));
  const since = (UI.lastVisit || {})[p.id] || "";
  const changed = [...refs].filter(r => { const m = p.marks && p.marks[r]; return m && since && m.at > since; });
  const tests = arr(p.tests).filter(x => arr(x.reqIds).some(r => arr(c.reqIds).includes(r)));
  const lr = lastRun(p); const res = lr ? tests.map(x => testResult(p, x.id)).filter(Boolean) : [];
  const risks = [...arr(p.risks).filter(r => !rHandled(r)).map(r => "risk:" + r.id), ...arr(p.assumptions).filter(a => !aHandled(a)).map(a => "assumption:" + a.id)].filter(r => depsOf(p, r).some(d => d.ref.startsWith("req:") && arr(c.reqIds).includes(d.ref.slice(4))));
  const pt = [...refs].filter(r => { const it = itemByRef(p, r); const m = p.marks && p.marks[r]; return (it && it.st === "as") || (m && m.by === "pt"); });
  const model = str(c.model).toLowerCase();
  const cost = c.kind === "ai" || c.kind === "hybrid" ? (/most capable|opus|fable|mythos|höchst|最强/.test(model) ? 3 : /fast|haiku|schnell|快/.test(model) ? 1 : 2) : 0;
  return {needs, block: needs.some(x => x.cls === "block"), changed, tests: tests.length, pass: res.filter(r => r === "pass").length, fail: res.filter(r => r === "fail").length, risks, pt, cost};
}
/** the parts the selected part or item affects (downstream along the lines, and through shared requirements) */
function impactSet(p){
  const sel = UI.selPart || (p.focus.id ? (itemByRef(p, p.focus.id) || {parts: []}).parts[0] : null); if (!sel) return null;
  const links = arr(p.arch.links), out = new Set([sel]), todo = [sel];
  while (todo.length){ const x = todo.shift(); for (const l of links) if (l.from === x && !out.has(l.to)){ out.add(l.to); todo.push(l.to); } }
  return out;
}
function lensBadges(p, cid){
  if (!(UI.lenses instanceof Set)) lensOn("needs");
  const L0 = lensInfo(p, cid), b = [];
  if (UI.lenses.has("needs") && L0.needs.length) b.push(`<i class="lb ${L0.block ? "bad" : "warn"}" title="${esc(t("lens.b.needs", {n: L0.needs.length}))}">!${L0.needs.length}</i>`);
  if (UI.lenses.has("changed") && L0.changed.length) b.push(`<i class="lb acc" title="${esc(t("lens.b.changed", {n: L0.changed.length}))}">Δ${L0.changed.length}</i>`);
  if (UI.lenses.has("tested") && L0.tests) b.push(`<i class="lb ${L0.fail ? "bad" : L0.pass === L0.tests ? "ok" : ""}" title="${esc(t("lens.b.tested", {a: L0.pass, b: L0.tests}))}">✓${L0.pass}/${L0.tests}</i>`);
  if (UI.lenses.has("risks") && L0.risks.length) b.push(`<i class="lb warn" title="${esc(t("lens.b.risks", {n: L0.risks.length}))}">⚠${L0.risks.length}</i>`);
  if (UI.lenses.has("who") && L0.pt.length) b.push(`<i class="lb as" title="${esc(t("lens.b.who", {n: L0.pt.length}))}">PT ${L0.pt.length}</i>`);
  if (UI.lenses.has("cost") && L0.cost) b.push(`<i class="lb" title="${esc(t("lens.b.cost" + L0.cost))}">${"$".repeat(L0.cost)}</i>`);
  return b.length ? `<span class="bp-badges">${b.join("")}</span>` : "";
}
function lensDim(p, cid){ if (!(UI.lenses instanceof Set) || !UI.lenses.has("impact")) return false; const s = impactSet(p); return s ? !s.has(cid) : false; }

/* ---------- layout: rows by depth, ordered to keep lines short ---------- */
function compLevels(p){
  const comps = arr(p.arch.components), ids = comps.map(c => c.id), level = {}; ids.forEach(i => level[i] = 0);
  const links = arr(p.arch.links).filter(l => ids.includes(l.from) && ids.includes(l.to) && l.from !== l.to);
  // longest path, ignoring the lines that go back (loops)
  for (let k = 0; k < comps.length; k++) for (const l of links) if (level[l.to] < level[l.from] + 1 && level[l.from] + 1 < comps.length) level[l.to] = level[l.from] + 1;
  return {level, links};
}
function mapRows(p){
  const comps = arr(p.arch.components), {level, links} = compLevels(p), rows = [];
  for (const c of comps) (rows[level[c.id]] = rows[level[c.id]] || []).push(c);
  // barycentre ordering: a box sits under the boxes that send to it
  for (let r = 1; r < rows.length; r++){ if (!rows[r]) continue; const prev = rows[r - 1] || []; const pos = id => { const i = prev.findIndex(c => c.id === id); return i < 0 ? null : i; };
    rows[r].sort((a, b) => { const avg = c => { const ins = links.filter(l => l.to === c.id).map(l => pos(l.from)).filter(x => x != null); return ins.length ? ins.reduce((s, x) => s + x, 0) / ins.length : 999; }; return avg(a) - avg(b); }); }
  return {rows: rows.filter(Boolean), level, links};
}
function mapHTML(p, {id = "bp", compact = false, sel = null} = {}){
  const comps = arr(p.arch.components);
  if (!comps.length) return `<div class="empty-state"><p>${esc(t("map.empty"))}</p><button class="btn" data-a="goto" data-ph="arch">${esc(t("btn.continueto", {s: phName("arch")}))}</button></div>`;
  const detail = UI.mapDetail || "parts";
  if (detail === "stages" && !compact) return stageMap(p);
  const {rows, links} = mapRows(p), name = cid => (comps.find(c => c.id === cid) || {}).name || cid;
  const imp = UI.lenses instanceof Set && UI.lenses.has("impact") ? impactSet(p) : null;
  const node = c => {
    const s = partState(p, c.id), ins = links.filter(l => l.to === c.id);
    const recv = ins.map(l => l.label ? l.label : t("map.from", {x: name(l.from)})).join(" · ");
    const L0 = lensInfo(p, c.id);
    const cls = [sel === c.id ? "sel" : "", imp ? (imp.has(c.id) ? "hit" : "dim") : "", UI.lenses instanceof Set && UI.lenses.has("who") && L0.pt.length ? "ptd" : "", UI.lenses instanceof Set && UI.lenses.has("needs") && L0.block ? "needb" : ""].join(" ");
    const its = detail === "items" && !compact ? compItems(p, c.id) : [];
    return `<div class="bp-cell"><button class="bp-node k-${esc(c.kind)} ${cls}" data-a="selpart" data-v="${esc(c.id)}" data-node="${esc(c.id)}" aria-pressed="${sel === c.id}">
      <span class="bp-top">${stSlot(s)}<b title="${esc(c.name)}">${esc(c.name)}</b></span>
      ${compact ? "" : `<span class="bp-k">${esc(t("kind." + c.kind))}${c.model && !guided() ? " · " + esc(trunc(c.model, 40)) : ""}</span>`}
      ${!compact && recv ? `<span class="bp-recv" title="${esc(t("map.receives") + ": " + recv)}"><span class="muted">${esc(t("map.receives"))}:</span> ${esc(recv)}</span>` : ""}
      ${lensBadges(p, c.id)}</button>
      ${its.length ? `<div class="bp-items">${its.slice(0, 6).map(i => `<button class="bp-item" data-a="goto-ref" data-ref="${esc(i.ref)}">${stSlot(i.st)}<span>${esc(trunc((guided() ? "" : i.id + " ") + i.title, 60))}</span></button>`).join("")}${its.length > 6 ? `<span class="small muted">${esc(t("map.more", {n: its.length - 6}))}</span>` : ""}</div>` : ""}</div>`;
  };
  const zoom = compact ? 1 : (UI.mapZoom || 1);
  const edges = links.map(l => [l.from, l.to, (comps.find(c => c.id === l.from) || {}).kind === "human" || (comps.find(c => c.id === l.to) || {}).kind === "human" ? 1 : 0]);
  return `<div class="bpmap ${compact ? "compact" : ""}" data-map="${esc(id)}" data-sel="${esc(sel || "")}" data-edges="${esc(JSON.stringify(edges))}" style="zoom:${zoom}"><svg class="bp-edges" aria-hidden="true"></svg>${rows.map(r => `<div class="bp-row">${r.map(node).join("")}</div>`).join("")}</div>`;
}
/** the zoomed-out view: the six stages with what is open in each */
function stageMap(p){
  return `<div class="stagemap">${STAGES.map((s, i) => { const qc = queueCounts(p, s.id), st = stageState(p, s.id);
    return `<button class="stbox ${st}" data-a="stage" data-v="${s.id}">${stSlot(st)}<b>${i + 1}. ${esc(stName(s.id))}</b><span class="small muted">${s.steps.map(phName).join(" · ")}</span><span class="row" style="gap:4px">${qc.block ? `<span class="chip st-bad">${qc.block}</span>` : ""}${qc.should ? `<span class="chip st-warn">${qc.should}</span>` : ""}${qc.check ? `<span class="chip st-as">${qc.check}</span>` : ""}${!qc.block && !qc.should && !qc.check ? (st === "done" ? `<span class="chip st-ok">${esc(t("ist.ok"))}</span>` : st === "todo" ? `<span class="chip">${esc(t("stg.notstarted"))}</span>` : "") : ""}</span></button>`; }).join("")}</div>`;
}
/* ---------- drawing the lines after layout ---------- */
function segRectHit(x1, y1, x2, y2, r){ const minx = Math.min(x1, x2), maxx = Math.max(x1, x2), miny = Math.min(y1, y2), maxy = Math.max(y1, y2); return maxx > r.x + 1 && minx < r.x + r.w - 1 && maxy > r.y + 1 && miny < r.y + r.h - 1; }
function drawMaps(){
  for (const m of document.querySelectorAll(".bpmap")){
    const svg = m.querySelector(".bp-edges"); if (!svg) continue;
    const box = m.getBoundingClientRect(), z = parseFloat(m.style.zoom || 1) || 1;
    const W = m.scrollWidth, H = m.scrollHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    let edges = []; try{ edges = JSON.parse(m.dataset.edges || "[]"); }catch(e){}
    const R = el => { const r = el.getBoundingClientRect(); return {x: (r.left - box.left) / z, y: (r.top - box.top) / z, w: r.width / z, h: r.height / z}; };
    const nodes = {}; for (const n of m.querySelectorAll("[data-node]")) nodes[n.dataset.node] = R(n);
    const rowsEl = [...m.querySelectorAll(":scope > .bp-row")].map(R);
    const rowOf = id => { const r = nodes[id]; if (!r) return -1; return rowsEl.findIndex(x => r.y >= x.y - 2 && r.y < x.y + x.h); };
    const sel = m.dataset.sel || "";
    const outs = {}, ins = {}; for (const [a, b] of edges){ (outs[a] = outs[a] || []).push(b); (ins[b] = ins[b] || []).push(a); }
    const paths = []; let gutter = 0;
    for (const [a, b, hand] of edges){
      const A = nodes[a], B = nodes[b]; if (!A || !B) continue;
      const ra = rowOf(a), rb = rowOf(b), lit = sel && (sel === a || sel === b), dim = sel && !lit;
      const k = ins[b].indexOf(a), nIn = ins[b].length, xIn = B.x + B.w / 2 + (k - (nIn - 1) / 2) * Math.min(14, B.w / (nIn + 1));
      let pts;
      if (rb > ra){
        // down: shared trunk from the sender into the gap below its row, along the gap, down a free corridor, into the receiver
        const yA = A.y + A.h, xA = A.x + A.w / 2;
        const gapA = rowsEl[ra] ? rowsEl[ra].y + rowsEl[ra].h + 9 : yA + 10;
        const gapB = rowsEl[rb] ? rowsEl[rb].y - 9 : B.y - 10;
        let xc = xIn;
        // a corridor through the rows in between that touches no box
        if (rb - ra > 1){
          const between = Object.entries(nodes).filter(([id]) => { const r0 = rowOf(id); return r0 > ra && r0 < rb; }).map(([, r]) => r);
          const free = x => between.every(r => x < r.x - 6 || x > r.x + r.w + 6);
          if (!free(xc)){ let best = null; for (let d = 8; d < W; d += 8){ for (const c of [xIn - d, xIn + d]) if (c > 4 && c < W - 4 && free(c)){ best = c; break; } if (best != null) break; } xc = best != null ? best : W - 6; }
        }
        pts = [[xA, yA], [xA, gapA], [xc, gapA], [xc, gapB], [xIn, gapB], [xIn, B.y - 1]];
      } else {
        // a loop or a line within one row: round the right side, dashed
        gutter++;
        // out of the bottom of the sender into the gap below its row, round the right gutter, along the gap above the receiver's row, into its top:
        // a loop never runs over another box
        const right = Math.max(0, ...Object.values(nodes).map(r => r.x + r.w)), lanes = Math.max(1, Math.floor((W - right - 6) / 6)), xg = Math.min(W - 3, right + 5 + ((gutter - 1) % lanes) * 6), xA = A.x + A.w / 2 + 7, xB = Math.min(B.x + B.w - 8, xIn + 7);
        const gA = rowsEl[ra] ? rowsEl[ra].y + rowsEl[ra].h + 5 : A.y + A.h + 6;
        const gB = Math.max(2, rowsEl[rb] ? rowsEl[rb].y - 5 : B.y - 6);
        pts = [[xA, A.y + A.h], [xA, gA], [xg, gA], [xg, gB], [xB, gB], [xB, B.y - 1]];
      }
      const d = "M" + pts.map(q => q.map(v => Math.round(v * 10) / 10).join(",")).join(" L");
      const cls = ["bp-edge", rb <= ra ? "loop" : "", hand ? "hand" : "", lit ? "lit" : "", dim ? "dim" : ""].join(" ");
      paths.push(`<path d="${d}" class="${cls}" marker-end="url(#ah-${m.dataset.map}${lit ? "-lit" : rb <= ra ? "-loop" : ""})" data-from="${esc(a)}" data-to="${esc(b)}"/>`);
    }
    svg.innerHTML = `<defs>${[["", "bp-ah"], ["-lit", "bp-ah lit"], ["-loop", "bp-ah loop"]].map(([s0, c]) => `<marker id="ah-${m.dataset.map}${s0}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="${c}"/></marker>`).join("")}</defs>` + paths.join("");
  }
}
/** the geometric check the tests use: no text spills out of a box, no line runs through a box it does not belong to */
function auditMaps(){
  const out = [];
  for (const m of document.querySelectorAll(".bpmap")){
    const box = m.getBoundingClientRect(), z = parseFloat(m.style.zoom || 1) || 1;
    const R = el => { const r = el.getBoundingClientRect(); return {x: (r.left - box.left) / z, y: (r.top - box.top) / z, w: r.width / z, h: r.height / z}; };
    const nodes = [...m.querySelectorAll("[data-node]")];
    for (const n of nodes){ const nr = n.getBoundingClientRect(); for (const c of n.querySelectorAll("b, .bp-k, .bp-recv, .sslot")){ const cr = c.getBoundingClientRect(); if (cr.right > nr.right + 1 || cr.left < nr.left - 1 || cr.bottom > nr.bottom + 1) out.push({kind: "overflow", map: m.dataset.map, text: c.textContent.slice(0, 60)}); } }
    const rects = Object.fromEntries(nodes.map(n => [n.dataset.node, R(n)]));
    for (const pth of m.querySelectorAll(".bp-edge")){
      const pts = (pth.getAttribute("d") || "").replace(/^M/, "").split(" L").map(s => s.split(",").map(Number));
      for (let i = 0; i < pts.length - 1; i++) for (const [id, r] of Object.entries(rects)){ if (id === pth.dataset.from || id === pth.dataset.to) continue; if (segRectHit(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r)) out.push({kind: "line-through-box", map: m.dataset.map, text: pth.dataset.from + "→" + pth.dataset.to + " over " + id}); }
    }
  }
  return out;
}
function mapLegend(){ return `${stLegend()}<div class="legend14 lines"><span><svg width="26" height="8"><path d="M1 4h24" class="bp-edge"/></svg>${esc(t("map.lg.line"))}</span><span><svg width="26" height="8"><path d="M1 4h24" class="bp-edge loop"/></svg>${esc(t("map.lg.loop"))}</span><span><svg width="26" height="8"><path d="M1 4h24" class="bp-edge hand"/></svg>${esc(t("map.lg.hand"))}</span></div>`; }
function focusParts(p){ const it = p.focus.id ? itemByRef(p, p.focus.id) : null; return it ? it.parts : []; }
/** the list view of the map (phones, and for reading): each part with what it receives and where it sends */
function mapList(p){
  const comps = arr(p.arch.components), links = arr(p.arch.links), name = id => (comps.find(c => c.id === id) || {}).name || id;
  return `<div class="maplist">${mapRows(p).rows.flat().map(c => `<div class="mlrow ${UI.selPart === c.id ? "sel" : ""}">${stSlot(partState(p, c.id))}<div class="mlbody"><button class="linkish" data-a="selpart" data-v="${esc(c.id)}"><b>${esc(c.name)}</b></button> <span class="small muted">${esc(t("kind." + c.kind))}</span>${lensBadges(p, c.id)}
    <div class="row small" style="gap:4px">${links.filter(l => l.to === c.id).map(l => `<span class="chip">${esc(t("map.from", {x: name(l.from)}))}</span>`).join("")}${links.filter(l => l.from === c.id).map(l => `<button class="chip tap" data-a="selpart" data-v="${esc(l.to)}">${esc(t("map.sendsto"))} → ${esc(name(l.to))}</button>`).join("")}</div></div></div>`).join("")}</div>`;
}
function useMapList(){ return UI.mapList != null ? UI.mapList : (typeof window !== "undefined" && window.innerWidth < 640); }
function mapBlock(p, {id = "bp", tools = true} = {}){
  const list = useMapList();
  return `${tools ? `<div class="row" style="justify-content:space-between">${list ? "" : mapLegend()}<div class="row" style="gap:4px"><button class="btn xs ghost" data-a="map-list" aria-pressed="${list}">${esc(list ? t("map.showdiagram") : t("map.showlist"))}</button>${list ? "" : `<button class="iconbtn" data-a="map-zoom" data-v="-1" title="${esc(t("map.out"))}" aria-label="${esc(t("map.out"))}">−</button><button class="iconbtn" data-a="map-zoom" data-v="1" title="${esc(t("map.in"))}" aria-label="${esc(t("map.in"))}">+</button><button class="iconbtn" data-a="map-full" title="${esc(t("map.full"))}" aria-label="${esc(t("map.full"))}">${ic("expand")}</button>`}</div></div>` : ""}
    ${list ? mapList(p) : `<div class="mapwrap">${mapHTML(p, {id, sel: UI.selPart})}</div>`}`;
}
/* ---------- the thread of one item: idea → criterion → requirement → part → section → test → result ---------- */
const THREAD_ORDER = ["ns","crit","qa","risk","assumption","req","component","section","test"];
function threadOf(p, ref){
  const up = new Set(), down = new Set();
  const walk = (r, fn, set, d) => { if (d > 3) return; for (const x of fn(r)){ if (set.has(x) || x === ref) continue; set.add(x); walk(x, fn, set, d + 1); } };
  walk(ref, r => usesOf(p, r), up, 0);
  walk(ref, r => depsOf(p, r).map(x => x.ref), down, 0);
  if (ref.startsWith("req:")) for (const c of arr(p.arch.components).filter(c => arr(c.reqIds).includes(ref.slice(4)))) down.add("component:" + c.id);
  const k = r => THREAD_ORDER.indexOf(r.split(":")[0]);
  return {up: [...up].sort((a, b) => k(a) - k(b)), down: [...down].sort((a, b) => k(a) - k(b))};
}
function threadHTML(p, ref){
  const th = threadOf(p, ref); if (!th.up.length && !th.down.length) return "";
  const chipOf = r => { const it = r === "ns" ? {id: "NS", title: t("ns.title"), st: p.nsAssumed ? "as" : "ok"} : r.startsWith("crit:") ? (c => c ? {id: c.id, title: critLine(c), st: c.st === "assumed" ? "as" : "ok"} : null)(critById(p, r.slice(5))) : itemByRef(p, r); if (!it) return ""; const res = r.startsWith("test:") ? testResult(p, r.slice(5)) : null; return `<button class="chip tap thr" data-a="goto-ref" data-ref="${esc(r)}">${stSlot(res === "fail" ? "bad" : it.st)}${esc(it.id)} ${esc(trunc(it.title, 36))}${res ? " · " + esc(t("verd." + res)) : ""}</button>`; };
  return `<div class="thread"><span class="small muted">${esc(t("thr.label"))}</span><span class="thrrow">${th.up.map(chipOf).join("<span class='thra'>→</span>")}${th.up.length ? "<span class='thra'>→</span>" : ""}<span class="chip sel">${esc(refLabel(p, ref))}</span>${th.down.length ? "<span class='thra'>→</span>" : ""}${th.down.map(chipOf).join("<span class='thra'>·</span>")}</span></div>`;
}
/* ---------- the part panel ---------- */
function partPanel(p, cid){
  const c = arr(p.arch.components).find(x => x.id === cid); if (!c) return "";
  const its = compItems(p, cid), phs = PHASE_IDS.filter(o => its.some(i => i.ph === o));
  return `<section class="panel stack" id="part-${esc(cid)}"><div class="row" style="justify-content:space-between"><div class="stack" style="gap:2px"><span class="eyebrow">${esc(t("kind." + c.kind))}${c.model && !guided() ? " · " + esc(c.model) : ""}</span><h3>${esc(c.name)}</h3><span class="small muted">${esc(c.role)}</span></div><button class="btn sm ghost" data-a="clearsel">${esc(t("bp.back"))}</button></div>
    <div class="row">${itemTools("component:" + c.id)}</div>${itemBox("component:" + c.id)}
    ${threadHTML(p, "component:" + c.id)}
    <div class="eyebrow">${esc(t("bp.linked"))}</div>
    ${phs.length ? phs.map(o => `<div class="stack" style="gap:6px"><span class="small muted">${esc(phName(o))}</span>${itemList(p, its.filter(i => i.ph === o))}</div>`).join("") : `<p class="small muted">${esc(t("bp.nolinks"))}</p>`}</section>`;
}
/* ---------- Blueprint mode and the overview map ---------- */
function modeBlueprint(p){
  const ph = p.focus.ph;
  const side = UI.selPart ? partPanel(p, UI.selPart) : `<section class="panel stack"><span class="eyebrow">${esc(t("ph.state." + phaseState(p, ph)))}</span><h3>${esc(phName(ph))}</h3>${SPECIAL.includes(ph) ? `<p class="small muted">${esc(t("help." + ph))}</p>` : itemList(p, itemsOf(p, ph))}</section>`;
  return `<div class="stack">${lensBar(p)}<div class="bp2"><div class="stack">${mapBlock(p, {id: "bp"})}<p class="hint">${esc(t("bp.hint14"))}</p></div><div>${side}</div></div>${fullStep(p, ph)}</div>`;
}
function overviewMap(p){
  if (!arr(p.arch.components).length) return `<h2>${esc(t("home.stages"))}</h2>${stageMap(p)}<p class="hint">${esc(t("home.nomap"))}</p>`;
  return `<div class="row"><h2 style="flex:1">${esc(t("home.map"))}</h2></div>${lensBar(p)}${(UI.mapDetail || "parts") === "stages" ? stageMap(p) : mapBlock(p, {id: "ov"})}${UI.selPart ? partPanel(p, UI.selPart) : ""}`;
}
function mapModal(p){ return `<div class="row"><h2 style="flex:1">${esc(t("arch.map"))}</h2><div class="row" style="gap:4px"><button class="iconbtn" data-a="map-zoom" data-v="-1" aria-label="${esc(t("map.out"))}">−</button><button class="iconbtn" data-a="map-zoom" data-v="1" aria-label="${esc(t("map.in"))}">+</button></div><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>${lensBar(p)}${mapLegend()}<div class="mapwrap full">${mapHTML(p, {id: "full", sel: UI.selPart})}</div>`; }
Object.assign(ACTIONS, {
  "lens14": el => { lensOn("needs"); const v = el.dataset.v; if (UI.lenses.has(v)) UI.lenses.delete(v); else { if (UI.lenses.size >= 6) UI.lenses.delete([...UI.lenses][0]); UI.lenses.add(v); } render(); },
  "map-detail": el => { UI.mapDetail = el.dataset.v; render(); },
  "map-list": () => { UI.mapList = !useMapList(); render(); },
  "trace-close": () => aiCloseTraceGaps(curP())
});
