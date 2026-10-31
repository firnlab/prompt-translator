/* ===================== PHASE: CAPTURE ===================== */
function phCapture(p){
  const it = p.intake;
  const imgs = arr(p._images);
  const draft = p.nsDraft;
  return `
  <section class="panel">
    ${head(t("cap.title"), t("cap.sub"), modelChip("capture"))}
    ${bindArea("p:intake.raw", it.raw, {ph:t("cap.ph"), rows:10, id:"raw"})}
    <div class="row">
      <label class="btn sm" style="cursor:pointer">${ic("plus")}${esc(t("cap.images"))}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple data-a-change="intake-images" hidden></label>
      ${imgs.length ? chip(t("cap.imagesn", {n: imgs.length}), "acc") + btn("clear-images", t("btn.clear"), {cls:"sm ghost"}) : ""}
      <span class="hint" style="flex:1">${esc(t("cap.imghint"))}</span>
      ${aiBtn("clarify", t("cap.clarify"), "M", {primary:true, key:"clarify"})}
    </div>
    ${busyHTML("clarify")}
  </section>
  ${draft ? `<section class="panel" style="border-color:var(--accent)">
    ${head(t("cap.nsproposal"), t("cap.nsproposal.sub"))}
    <div class="grid3">${["problem","goal","success","users","constraints","now"].map(k => `<label class="fld"><span>${esc(t("ns." + k))}</span><textarea data-bind="p:nsDraft.${k}" rows="3">${esc(draft[k])}</textarea></label>`).join("")}</div>
    <div class="row end">${btn("ns-discard", t("btn.discard"), {cls:"ghost"})}${btn("ns-accept", t("cap.nsaccept"), {icon:"check", cls:"primary"})}</div>
  </section>` : ""}
  ${it.clean ? `<section class="panel">
    ${head(t("cap.clean"), t("cap.clean.sub"), confChip(it.confidence))}
    <div class="grid2">
      <label class="fld"><span>${esc(t("cap.yours"))}</span><div class="pkg-col" style="border:1px solid var(--line);border-radius:var(--r-sm);max-height:280px;overflow:auto;white-space:pre-wrap">${esc(it.raw)}</div></label>
      <label class="fld"><span>${esc(t("cap.cleaned"))}</span>${bindArea("p:intake.clean", it.clean, {rows:10})}</label>
    </div>
    <div class="grid3">
      ${issueList(t("cap.contra"), it.contradictions, "crit")}
      ${issueList(t("cap.ambig"), it.ambiguities, "warn")}
      ${issueList(t("cap.missing"), it.missing.map(m => m.item + (m.why ? " — " + m.why : "")), "acc")}
    </div>
    <div class="row end">${btn("phase", t("cap.toUnderstand"), {icon:"arrow", cls:"primary", attrs:'data-ph="understand"'})}</div>
  </section>` : ""}`;
}
function issueList(title, items, cls){
  return `<div class="stack"><h4>${esc(title)} ${chip(String(items.length), cls)}</h4>${items.length ? `<div class="list">${items.map((x, i) => `<div class="item"><div class="body"><span class="small">${esc(x)}</span></div><div class="acts">${ibtn("ask-later","arrow",t("cap.askint"),`data-text="${esc(trunc(x, 300))}"`)}</div></div>`).join("")}</div>` : `<p class="small muted">${esc(t("cap.none"))}</p>`}</div>`;
}

/* ===================== PHASE: UNDERSTAND ===================== */
function phUnderstand(p){
  const u = p.understand;
  const has = {whys: arr(u.whys).length, jtbd: !!u.jtbd, reframe: arr(u.reframes).length, walkthrough: arr(u.walkSteps).length, premortem: arr(u.premortem).length, devil: arr(u.devil).length};
  const card = (kind, title, sub, inner) => `<section class="panel">${head(title, sub, aiBtn("understand", has[kind] ? t("btn.redo") : t("btn.run"), kind === "walkthrough" || kind === "premortem" ? "M" : "L", {attrs:`data-kind="${kind}"`, key:"und-" + kind}))}${busyHTML("und-" + kind)}${inner}</section>`;
  const whys = arr(u.whys).length ? `<div class="list">${u.whys.map((w, i) => `<div class="item"><span class="mono muted">${i+1}</span><div class="body"><span class="title">${esc(w.q)}</span><span class="small">${esc(w.a)} ${w.guess ? chip(t("und.guess"), "warn") : ""}</span></div></div>`).join("")}</div>${u.rootNeed ? `<p><b>${esc(t("und.root"))}:</b> ${esc(u.rootNeed)}</p>` : ""}` : `<p class="small muted">${esc(t("und.whys.empty"))}</p>`;
  const jt = u.jtbd ? `<p style="font-size:15px">${esc(u.jtbd)}</p>${u.jtbdParts ? `<div class="grid3">${["functional","emotional","social"].map(k => `<div class="stack"><h4>${esc(t("und." + k))}</h4><ul class="small" style="margin:0;padding-left:18px">${arr(u.jtbdParts[k]).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}</div>` : ""}` : `<p class="small muted">${esc(t("und.jtbd.empty"))}</p>`;
  const rf = arr(u.reframes).length ? `<div class="list">${u.reframes.map(r => `<div class="item ${r.chosen ? "sev-med" : ""}"><div class="body"><span class="title">${esc(r.text)}</span><span class="small muted">${esc(r.differently)}</span></div><div class="acts">${btn("reframe-pick", r.chosen ? t("und.chosen") : t("und.choose"), {cls:"sm " + (r.chosen ? "primary" : ""), attrs:`data-id="${r.id}"`})}</div></div>`).join("")}</div>` : `<p class="small muted">${esc(t("und.reframe.empty"))}</p>`;
  const wt = arr(u.walkSteps).length ? `<div class="list">${u.walkSteps.map(s => `<div class="item"><span class="mono" style="color:var(--accent);min-width:48px">${esc(s.time)}</span><div class="body"><span>${esc(s.step)}</span></div></div>`).join("")}</div>${arr(u.walkGaps).length ? `<h4>${esc(t("und.gaps"))}</h4><div class="list">${u.walkGaps.map(g => `<div class="item"><div class="body"><span class="small">${esc(g)}</span></div><div class="acts">${ibtn("ask-later","arrow",t("cap.askint"),`data-text="${esc(g)}"`)}</div></div>`).join("")}</div>` : ""}` : `<p class="small muted">${esc(t("und.walk.empty"))}</p>`;
  const pm = arr(u.premortem).length ? `<div class="list">${u.premortem.map(f => `<div class="item"><div class="body"><span class="title">${esc(f.text)}</span><span class="small muted">${esc(t("rk.mitigation"))}: ${esc(f.mitigation)}</span></div><div class="acts">${chip(t("rk.lik") + " " + f.likelihood)}${chip(t("rk.imp") + " " + f.impact, f.likelihood * f.impact >= 12 ? "warn" : "")}</div></div>`).join("")}</div><p class="hint">${esc(t("und.pm.added"))}</p>` : `<p class="small muted">${esc(t("und.pm.empty"))}</p>`;
  const dv = arr(u.devil).length ? `<div class="list">${u.devil.map(d => `<div class="item"><div class="body"><span class="title">${esc(d.point)}</span><span class="small muted">${esc(t("und.settle"))}: ${esc(d.evidence)}</span></div><div class="acts">${researchBtn(d.point)}</div></div>`).join("")}</div>` : `<p class="small muted">${esc(t("und.devil.empty"))}</p>`;
  return `<div class="row" style="justify-content:space-between"><p class="lead">${esc(t("und.lead"))}</p>${modelChip("understand")}</div>
    <div class="grid2">
      ${card("whys", t("und.whys"), t("und.whys.sub"), whys)}
      ${card("jtbd", t("und.jtbd"), t("und.jtbd.sub"), jt)}
    </div>
    ${card("reframe", t("und.reframe"), t("und.reframe.sub"), rf)}
    ${card("walkthrough", t("und.walk"), t("und.walk.sub"), wt)}
    <div class="grid2">
      ${card("premortem", t("und.pm"), t("und.pm.sub"), pm)}
      ${card("devil", t("und.devil"), t("und.devil.sub"), dv)}
    </div>
    <div class="row end">${btn("phase", t("und.toInterview"), {icon:"arrow", cls:"primary", attrs:'data-ph="interview"'})}</div>`;
}

/* ===================== PHASE: INTERVIEW ===================== */
function radarSVG(p){
  const n = DIMS.length, cx = 170, cy = 170, R = 120;
  const pt = (i, r) => { const a = -Math.PI/2 + i * 2*Math.PI/n; return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; };
  let rings = ""; for (const f of [.5, 1]){ rings += `<polygon points="${DIMS.map((d,i) => pt(i, R*f).join(",")).join(" ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`; }
  let spokes = DIMS.map((d,i) => { const [x,y] = pt(i, R); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`; }).join("");
  const val = d => { const s = (p.dims[d.id] || {}).status; return s === "confirmed" ? 1 : s === "assumed" ? .55 : .12; };
  const poly = DIMS.map((d,i) => pt(i, R*val(d)).join(",")).join(" ");
  const dots = DIMS.map((d,i) => { const [x,y] = pt(i, R*val(d)); const s = (p.dims[d.id]||{}).status; return `<circle cx="${x}" cy="${y}" r="3.5" fill="${s === "confirmed" ? "var(--ok)" : s === "assumed" ? "var(--warn)" : "var(--line-2)"}"><title>${esc(L(d))}</title></circle>`; }).join("");
  const labels = DIMS.map((d,i) => { const [x,y] = pt(i, R + 22); const anchor = Math.abs(x - cx) < 10 ? "middle" : x > cx ? "start" : "end"; return `<text x="${x}" y="${y}" font-size="9.5" fill="var(--muted)" text-anchor="${anchor}" dominant-baseline="middle">${esc(trunc(L(d), 22))}</text>`; }).join("");
  return `<svg viewBox="-95 -6 530 352" role="img" aria-label="${esc(t("int.radar"))}">${rings}${spokes}<polygon points="${poly}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>${dots}${labels}</svg>`;
}
function phInterview(p){
  const cov = Math.round(dimCoverage(p) * 100);
  const dimsHTML = DIM_GROUPS.map(g => `<div class="stack"><h4 style="color:var(--muted);letter-spacing:.1em;text-transform:uppercase;font-size:11px">${esc(L(g))}</h4><div class="dimlist">${DIMS.filter(d => d.g === g.id).map(d => { const s = p.dims[d.id] || {}; return `<div class="dim" title="${esc(L(d.cost))}"><div class="dh">${statusDot(s.status)}<span style="flex:1">${esc(L(d))}</span>${noteMark("dim", d.id, L(d))}</div><div class="ds">${esc(s.summary || L(d.cost))}</div><div class="row" style="gap:4px">${bindSelect("p:dims." + d.id + ".status", s.status || "unknown", STATUS3.map(x => [x, t("st." + x)]))}</div></div>`; }).join("")}</div></div>`).join("");
  const qs = p.pendingQs.map(q => {
    const d = DIMS.find(x => x.id === q.dim);
    const sel = UI.qSel[q.id];
    return `<div class="qcard"><span class="qd">${esc(d ? L(d) : q.dim)}</span><div class="qt">${esc(q.text)}</div>${q.why ? `<div class="qw">${esc(t("int.why"))}: ${esc(q.why)}</div>` : ""}
      ${q.options.length ? `<div class="opts">${q.options.map((o, i) => `<button class="opt ${i === q.recommended ? "rec" : ""} ${sel === i ? "on" : ""}" data-a="q-opt" data-q="${q.id}" data-i="${i}">${esc(o)}</button>`).join("")}</div>` : ""}
      <textarea id="qa-${q.id}" rows="2" placeholder="${esc(t("int.answerph"))}" data-qdraft="${q.id}">${esc(UI.qDraft[q.id] || "")}</textarea>
      <div class="row end">${btn("q-skip", t("int.skip"), {cls:"ghost sm", attrs:`data-q="${q.id}"`})}${q.recommended >= 0 && q.options[q.recommended] ? btn("q-rec", t("int.userec"), {cls:"sm", attrs:`data-q="${q.id}"`}) : ""}${btn("q-answer", t("int.answer"), {icon:"check", cls:"primary sm", attrs:`data-q="${q.id}"`})}</div></div>`;
  }).join("");
  const history = p.qa.slice().reverse().map(q => { const d = DIMS.find(x => x.id === q.dim); return `<div class="qa"><span class="q">${esc(d ? L(d) : "")} · ${esc(q.q)}</span><textarea data-bind="p:qa.#${q.id}.answer" rows="2">${esc(q.answer)}</textarea></div>`; }).join("");
  return `
  <section class="panel">
    ${head(t("int.title"), t("int.sub"), `<div class="row"><div class="seg" role="group" aria-label="${esc(t("int.depth"))}">${["quick","standard","deep"].map(x => `<button class="${(p.depth||"standard") === x ? "on" : ""}" data-a="depth" data-d="${x}">${esc(t("depth." + x))}</button>`).join("")}</div>${modelChip("interview")}</div>`)}
    ${p.interviewReady ? `<div class="nextbar" style="border-color:var(--ok);background:var(--ok-soft)"><span class="lbl" style="color:var(--ok)">${esc(t("int.ready"))}</span><span class="txt">${esc(p.interviewReadyReason)}</span>${btn("phase", t("int.toAssume"), {icon:"arrow", cls:"sm primary", attrs:'data-ph="assume"'})}</div>` : ""}
    ${busyHTML("interview")}
    ${qs || `<div class="empty-state"><p>${esc(p.qa.length ? t("int.more") : t("int.start"))}</p>${aiBtn("interview", p.qa.length ? t("int.next") : t("int.begin"), "M", {primary:true, key:"interview"})}</div>`}
    ${qs ? `<div class="row end"><label class="chk small"><input type="checkbox" data-bind="p:autoInterview" ${p.autoInterview !== false ? "checked" : ""}>${esc(t("int.auto"))}</label>${aiBtn("interview", t("int.next"), "M", {key:"interview"})}</div>` : ""}
    ${p.coverageNote ? `<p class="hint">${esc(p.coverageNote)}</p>` : ""}
  </section>
  <section class="panel">
    ${head(t("int.radar"), t("int.radar.sub", {n: cov}))}
    <div class="radar-wrap"><div class="radar">${radarSVG(p)}<div class="row small" style="justify-content:center">${statusDot("confirmed")} ${esc(t("st.confirmed"))} ${statusDot("assumed")} ${esc(t("st.assumed"))} ${statusDot("unknown")} ${esc(t("st.unknown"))}</div></div><div class="stack lg">${dimsHTML}</div></div>
  </section>
  <section class="panel">
    ${head(t("int.history"), t("int.history.sub"), btn("qa-add", t("int.addown"), {icon:"plus", cls:"sm"}))}
    ${history || `<p class="small muted">${esc(t("int.nohistory"))}</p>`}
  </section>`;
}

/* ===================== PHASE: ASSUMPTIONS & RISKS ===================== */
function phAssume(p){
  const as = p.assumptions.slice().sort((a,b) => b.impact*b.risk - a.impact*a.risk);
  const pts = as.map((a, i) => { const x = (a.risk - 1) / 4 * 88 + 6, y = (a.impact - 1) / 4 * 82 + 6; const hot = a.impact * a.risk >= 12; return `<button class="pt" style="left:${x}%;bottom:${y}%;background:${a.status === "validated" ? "var(--ok)" : a.status === "invalid" ? "var(--line-2)" : hot ? "var(--crit)" : "var(--accent)"};color:#fff" title="${esc(a.text)}" data-a="scroll-to" data-id="as-${a.id}">${i+1}</button>`; }).join("");
  const catOpts = ACAT.map(c => [c, t("acat." + c)]);
  const stOpts = ["untested","testing","validated","invalid"].map(s => [s, t("ast." + s)]);
  const num5 = (spec, v) => bindSelect(spec, v, [1,2,3,4,5].map(n => [n, String(n)]));
  const rows = as.map((a, i) => `<div class="item ${a.impact*a.risk >= 12 && a.status === "untested" ? "sev-crit" : ""}" id="as-${a.id}">
      <span class="mono muted" style="min-width:20px">${i+1}</span>
      <div class="body">${bindArea("p:assumptions.#" + a.id + ".text", a.text, {rows:2})}
        <div class="row">${bindSelect("p:assumptions.#" + a.id + ".category", a.category, catOpts)}<span class="small muted">${esc(t("as.impact"))}</span>${num5("p:assumptions.#" + a.id + ".impact", a.impact)}<span class="small muted">${esc(t("as.risk"))}</span>${num5("p:assumptions.#" + a.id + ".risk", a.risk)}${bindSelect("p:assumptions.#" + a.id + ".status", a.status, stOpts)}</div>
        ${bindInput("p:assumptions.#" + a.id + ".test", a.test, {ph:t("as.testph")})}</div>
      <div class="acts" style="flex-direction:column">${noteMark("assumption", a.id, a.text)}${researchBtn(a.text)}${ibtn("del-item","trash",t("btn.delete"),`data-list="assumptions" data-id="${a.id}"`)}</div></div>`).join("");
  const risks = p.risks.slice().sort((a,b) => b.likelihood*b.impact - a.likelihood*a.impact).map(r => `<div class="item ${r.likelihood*r.impact >= 12 && r.status === "open" ? "sev-high" : ""}">
      <div class="body">${bindArea("p:risks.#" + r.id + ".text", r.text, {rows:2})}
        <div class="row"><span class="small muted">${esc(t("rk.lik"))}</span>${num5("p:risks.#" + r.id + ".likelihood", r.likelihood)}<span class="small muted">${esc(t("rk.imp"))}</span>${num5("p:risks.#" + r.id + ".impact", r.impact)}${bindSelect("p:risks.#" + r.id + ".status", r.status, ["open","mitigated","accepted","closed"].map(s => [s, t("rks." + s)]))}${r.source ? chip(t("rksrc." + r.source)) : ""}</div>
        ${bindInput("p:risks.#" + r.id + ".mitigation", r.mitigation, {ph:t("rk.mitigation")})}</div>
      <div class="acts">${noteMark("risk", r.id, r.text)}${ibtn("del-item","trash",t("btn.delete"),`data-list="risks" data-id="${r.id}"`)}</div></div>`).join("");
  return `
  <section class="panel">
    ${head(t("as.title"), t("as.sub"), btn("add-assumption", t("as.add"), {icon:"plus", cls:"sm"}))}
    <div class="grid2" style="align-items:start">
      <div class="stack"><div class="amap"><span class="q tr">${esc(t("as.testfirst"))}</span>${pts}<span class="axis" style="left:50%;bottom:-20px;transform:translateX(-50%)">${esc(t("as.risk"))} →</span></div><p class="hint" style="margin-top:18px">${esc(t("as.maphint"))}</p></div>
      <div class="stack"><h4>${esc(t("as.cats"))}</h4><div class="row">${ACAT.map(c => chip(t("acat." + c) + " · " + p.assumptions.filter(a => a.category === c).length)).join("")}</div><p class="small muted">${esc(t("as.catshint"))}</p>${p.understand.premortem.length ? "" : `<div class="row">${aiBtn("understand", t("und.pm"), "M", {attrs:'data-kind="premortem"', key:"und-premortem"})}</div>`}${busyHTML("und-premortem")}</div>
    </div>
    ${rows ? `<div class="list">${rows}</div>` : empty(t("as.empty"))}
  </section>
  <section class="panel">
    ${head(t("rk.title"), t("rk.sub"), btn("add-risk", t("rk.add"), {icon:"plus", cls:"sm"}))}
    ${risks ? `<div class="list">${risks}</div>` : empty(t("rk.empty"))}
  </section>
  <div class="row end">${btn("phase", t("as.toReq"), {icon:"arrow", cls:"primary", attrs:'data-ph="require"'})}</div>`;
}

/* ===================== PHASE: REQUIREMENTS ===================== */
function phRequire(p){
  const pri = ["must","should","could"].map(x => [x, t("pri." + x)]);
  const reqs = p.requirements.map(r => { const tc = p.tests.filter(x => x.reqIds.includes(r.id)).length; return `<div class="item"><span class="mono" style="color:var(--accent);min-width:28px">${esc(r.id)}</span>
    <div class="body"><div class="row">${bindInput("p:requirements.#" + r.id + ".title", r.title, {ph:t("req.titleph")})}${bindSelect("p:requirements.#" + r.id + ".priority", r.priority, pri)}${chip(tc ? t("req.tests", {n: tc}) : t("req.notests"), tc ? "ok" : "warn")}</div>
      <div class="grid3"><label class="fld"><span>${esc(t("req.given"))}</span>${bindArea("p:requirements.#" + r.id + ".given", r.given, {rows:2})}</label><label class="fld"><span>${esc(t("req.when"))}</span>${bindArea("p:requirements.#" + r.id + ".when", r.when, {rows:2})}</label><label class="fld"><span>${esc(t("req.then"))}</span>${bindArea("p:requirements.#" + r.id + ".then", r.then, {rows:2})}</label></div></div>
    <div class="acts" style="flex-direction:column">${noteMark("req", r.id, r.id + " " + r.title)}${ibtn("del-item","trash",t("btn.delete"),`data-list="requirements" data-id="${r.id}"`)}</div></div>`; }).join("");
  return `
  <section class="panel">
    ${head(t("req.title"), t("req.sub"), `<div class="row">${modelChip("require")}${aiBtn("requirements", p.requirements.length ? t("btn.redo") : t("req.gen"), "M", {primary: !p.requirements.length, key:"require"})}${btn("add-req", t("req.add"), {icon:"plus", cls:"sm"})}</div>`)}
    ${busyHTML("require")}
    ${reqs ? `<div class="list">${reqs}</div>` : empty(t("req.empty"))}
  </section>
  <div class="grid2">
    <section class="panel">${head(t("req.oos"), t("req.oos.sub"))}<textarea rows="6" data-lines="outOfScope" id="oos">${esc(p.outOfScope.join("\n"))}</textarea><p class="hint">${esc(t("req.lines"))}</p></section>
    <section class="panel">${head(t("req.const"), t("req.const.sub"))}<textarea rows="6" data-lines="constitution" id="const">${esc(p.constitution.join("\n"))}</textarea><p class="hint">${esc(t("req.lines"))}</p></section>
  </div>
  <div class="row end">${btn("phase", t("req.toArch"), {icon:"arrow", cls:"primary", attrs:'data-ph="arch"'})}</div>`;
}

/* ===================== PHASE: ARCHITECTURE ===================== */
const KIND_COLOR = {ai:"var(--accent)", code:"var(--ok)", hybrid:"#a37bff", human:"var(--signal)", platform:"var(--muted)"};
function diagramSVG(a){
  const comps = arr(a.components); if (!comps.length) return "";
  const ids = comps.map(c => c.id), level = {}; ids.forEach(i => level[i] = 0);
  const links = arr(a.links).filter(l => ids.includes(l.from) && ids.includes(l.to) && l.from !== l.to);
  for (let k = 0; k < comps.length; k++) for (const l of links) if (level[l.to] < level[l.from] + 1 && level[l.from] + 1 < comps.length) level[l.to] = level[l.from] + 1;
  const cols = {}; for (const c of comps){ (cols[level[c.id]] = cols[level[c.id]] || []).push(c); }
  const W = 190, H = 64, GX = 70, GY = 26;
  const pos = {}; let maxRows = 0;
  Object.keys(cols).forEach(lv => { cols[lv].forEach((c, r) => { pos[c.id] = {x: 20 + lv * (W + GX), y: 20 + r * (H + GY)}; }); maxRows = Math.max(maxRows, cols[lv].length); });
  const width = 40 + (Object.keys(cols).length) * (W + GX) - GX, height = 40 + maxRows * (H + GY) - GY;
  const edges = links.map(l => { const A = pos[l.from], B = pos[l.to]; const x1 = A.x + W, y1 = A.y + H/2, x2 = B.x, y2 = B.y + H/2; const mx = (x1 + x2)/2; const back = x2 <= x1;
    const d = back ? `M${x1},${y1} C${x1+40},${y1+60} ${x2-40},${y2+60} ${x2},${y2}` : `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    return `<path d="${d}" fill="none" stroke="var(--line-2)" stroke-width="1.5" marker-end="url(#ah)"/>${l.label ? `<text x="${mx}" y="${(y1+y2)/2 - 6}" font-size="10" fill="var(--muted)" text-anchor="middle">${esc(trunc(l.label, 26))}</text>` : ""}`; }).join("");
  const nodes = comps.map(c => { const P = pos[c.id]; return `<g><rect x="${P.x}" y="${P.y}" width="${W}" height="${H}" rx="9" fill="var(--surface)" stroke="${KIND_COLOR[c.kind] || "var(--line-2)"}" stroke-width="1.6"/><rect x="${P.x}" y="${P.y}" width="5" height="${H}" rx="2" fill="${KIND_COLOR[c.kind] || "var(--line-2)"}"/><text x="${P.x + 14}" y="${P.y + 24}" font-size="12.5" font-weight="600" fill="var(--fg)">${esc(trunc(c.name, 24))}</text><text x="${P.x + 14}" y="${P.y + 44}" font-size="10.5" fill="var(--muted)">${esc(t("kind." + c.kind))}</text></g>`; }).join("");
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(t("arch.diagram"))}"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--line-2)"/></marker></defs>${edges}${nodes}</svg>`;
}
function phArch(p){
  const a = p.arch;
  const keys = ["reliability","cost","safety","effort","maintainability","platformFit"];
  const opts = a.options.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("arch.option"))}</th>${keys.map(k => `<th>${esc(t("score." + k))}</th>`).join("")}<th></th></tr></thead><tbody>${a.options.map(o => `<tr class="${o.id === a.recommended ? "rec" : ""}"><td><b>${esc(o.name)}</b> ${chip(t("akind." + o.kind))} ${o.id === a.recommended ? chip(t("arch.recommended"), "acc") : ""} ${o.id === a.chosen ? chip(t("arch.chosen"), "ok") : ""}<div class="small muted" style="margin-top:4px">${esc(o.summary)}</div>${o.pros.length || o.cons.length ? `<div class="small" style="margin-top:4px"><span style="color:var(--ok)">+ ${esc(o.pros.join(" · "))}</span><br><span style="color:var(--crit)">− ${esc(o.cons.join(" · "))}</span></div>` : ""}</td>${keys.map(k => `<td>${scoreBar(o.scores[k])}</td>`).join("")}<td>${btn("arch-choose", o.id === a.chosen ? t("arch.chosen") : t("arch.choose"), {cls:"sm " + (o.id === a.chosen ? "primary" : ""), attrs:`data-id="${o.id}"`})}</td></tr>`).join("")}</tbody></table></div>
    <div class="grid2"><div class="panel flat"><h4>${esc(t("arch.why"))}</h4><p>${esc(a.why)}</p></div><div class="panel flat"><h4>${esc(t("arch.changemind"))}</h4><p>${esc(a.changeMind)}</p></div></div>` : empty(t("arch.empty"));
  const comps = a.components.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("arch.component"))}</th><th>${esc(t("arch.kind"))}</th><th>${esc(t("arch.in"))}</th><th>${esc(t("arch.out"))}</th><th></th></tr></thead><tbody>${a.components.map(c => `<tr><td><b>${esc(c.name)}</b><div class="small muted">${esc(c.role)}</div><div class="small" style="color:var(--fg-2)">${esc(c.reason)}</div></td><td><span class="chip" style="color:${KIND_COLOR[c.kind]};border-color:${KIND_COLOR[c.kind]}">${esc(t("kind." + c.kind))}</span></td><td class="small">${esc(c.inputs)}</td><td class="small">${esc(c.outputs)}</td><td>${noteMark("component", c.id, c.name)}</td></tr>`).join("")}</tbody></table></div>` : "";
  return `
  <section class="panel">
    ${head(t("arch.title"), t("arch.sub"), `<div class="row">${modelChip("arch")}${aiBtn("architecture", a.options.length ? t("btn.redo") : t("arch.gen"), "H", {primary: !a.options.length, key:"arch"})}</div>`)}
    ${busyHTML("arch")}${opts}
  </section>
  ${a.components.length ? `<section class="panel">${head(t("arch.map"), t("arch.map.sub"))}<div class="diagram">${diagramSVG(a)}</div><div class="row small">${Object.keys(KIND_COLOR).map(k => `<span class="row" style="gap:5px"><span class="dot" style="background:${KIND_COLOR[k]}"></span>${esc(t("kind." + k))}</span>`).join("")}</div>${comps}</section>
  <div class="grid2">
    <section class="panel">${head(t("arch.human"), t("arch.human.sub"))}${a.humanSteps.length ? `<div class="list">${a.humanSteps.map(h => `<div class="item"><span class="dot warn" style="margin-top:7px"></span><div class="body">${esc(h)}</div></div>`).join("")}</div>` : `<p class="small muted">${esc(t("arch.nohuman"))}</p>`}</section>
    <section class="panel">${head(t("arch.cost"), t("arch.cost.sub"))}<p>${esc(a.costEstimate || "—")}</p></section>
  </div>
  <section class="panel">${head(t("arch.data"), t("arch.data.sub"))}${a.dataPlan.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("arch.source"))}</th><th>${esc(t("arch.fresh"))}</th><th>${esc(t("arch.legal"))}</th><th>${esc(t("arch.risk"))}</th><th></th></tr></thead><tbody>${a.dataPlan.map(d => `<tr><td>${esc(d.source)}</td><td class="small">${esc(d.freshness)}</td><td class="small">${esc(d.legal)}</td><td class="small">${esc(d.risk)}</td><td>${researchBtn(d.source + " — " + t("arch.legal"))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">—</p>`}</section>
  <section class="panel">${head(t("arch.mock"), t("arch.mock.sub"), aiBtn("mockup", a.mockupHtml ? t("btn.redo") : t("arch.mockgen"), "M", {key:"mockup"}))}${busyHTML("mockup")}${a.mockupHtml ? `<iframe class="mock" sandbox="" title="${esc(t("arch.mock"))}" data-srcdoc="${esc(a.mockupHtml)}"></iframe><p class="hint">${esc(a.mockupCaption)} · ${esc(t("arch.mockhint"))}</p>` : `<p class="small muted">${esc(t("arch.mockempty"))}</p>`}</section>
  <div class="row end">${btn("phase", t("arch.toBuild"), {icon:"arrow", cls:"primary", attrs:'data-ph="build"'})}</div>` : ""}`;
}

/* ===================== PHASE: BUILD ===================== */
function sectionCard(p, s, lint){
  const ed = UI.expanded.has("ed-" + s.id);
  const own = lint.filter(l => l.sec === s.id);
  const mirror = p.showMirror && s.mirror;
  return `<div class="pkg-sec" id="sec-${s.id}">
    <div class="pkg-h"><span class="dest">${esc(L(DEST[s.dest]))}</span><span class="t">${esc(s.title)}${s.filename ? ` <span class="mono muted">${esc(s.filename)}</span>` : ""}${s.cadence ? " " + chip(s.cadence, "acc") : ""}</span>
      ${s.reqIds.map(r => chip(r)).join("")}${own.length ? chip(t("lint.n", {n: own.length}), own.some(l => l.sev === "error") ? "crit" : "warn") : chip(t("lint.clean"), "ok")}
      ${noteMark("section", s.id, s.title)}${ibtn("sec-copy","copy",t("btn.copy"),`data-id="${s.id}"`)}${ibtn("sec-dl","dl",t("btn.download"),`data-id="${s.id}"`)}${ibtn("sec-edit", ed ? "check" : "edit", ed ? t("btn.done") : t("btn.edit"),`data-id="${s.id}"`)}${ibtn("sec-pattern","star",t("lib.saveas"),`data-id="${s.id}"`)}${ibtn("sec-skill","layers",t("lib.mkskill"),`data-id="${s.id}"`)}</div>
    ${s.why ? `<div class="small muted" style="padding:8px 14px 0">${esc(s.why)}</div>` : ""}
    <div class="pkg-body ${mirror ? "mirror" : ""}">
      <div class="pkg-col">${mirror ? `<div class="lang">English · ${esc(t("build.sent"))}</div>` : ""}${ed ? bindArea("p:pkg.sections.#" + s.id + ".content", s.content, {rows:16, cls:"code", id:"ed-" + s.id}) : `<pre class="prompt">${esc(s.content)}</pre>`}</div>
      ${mirror ? `<div class="pkg-col"><div class="lang">${esc(LANGS.find(l => l.id === s.mirrorLang)?.label || "")} · ${esc(t("build.mirror"))}</div><pre class="prompt" style="color:var(--fg-2)">${esc(s.mirror)}</pre></div>` : ""}
    </div></div>`;
}
function phBuild(p){
  const secs = arr(p.pkg.sections);
  const lint = lintPackage(p);
  const tabs = ["package","lint","versions"].map(x => `<button class="tab ${UI.buildTab === x ? "on" : ""}" data-a="tab" data-t="buildTab" data-v="${x}">${esc(t("build.tab." + x))}${x === "lint" && lint.length ? " · " + lint.length : ""}${x === "versions" ? " · " + p.versions.length : ""}</button>`).join("");
  let body = "";
  if (UI.buildTab === "package"){
    body = secs.length ? `
      ${p.pkg.kp && p.pkg.kp !== KP_VERSION ? `<div class="panel" style="border-color:var(--warn)">${esc(t("build.oldkp", {d: p.pkg.kp}))}</div>` : ""}
      ${arr(p.pkg.rationale).length ? `<div class="panel flat"><h4>${esc(t("build.rationale"))}</h4><ul class="small" style="margin:0;padding-left:18px">${p.pkg.rationale.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}
      <div class="row">${btn("copy-all", t("build.copyall"), {icon:"copy", cls:"sm"})}${btn("dl-all", t("build.dlall"), {icon:"dl", cls:"sm"})}${secs.some(s => s.dest === "skill") ? btn("dl-skills", t("build.dlskills"), {icon:"dl", cls:"sm"}) : ""}
        <span style="flex:1"></span>${LANG !== "en" ? `<label class="chk small"><input type="checkbox" data-bind="p:showMirror" ${p.showMirror ? "checked" : ""}>${esc(t("build.showmirror"))}</label>${aiBtn("mirror", secs.some(s => s.mirror && s.mirrorLang === LANG) ? t("build.remirror") : t("build.domirror"), "M", {key:"mirror"})}` : ""}</div>
      ${busyHTML("mirror")}
      ${secs.map(s => sectionCard(p, s, lint)).join("")}
      <form class="row" data-form="save-version"><input type="text" id="ver-reason" placeholder="${esc(t("ver.reasonph"))}" style="flex:1;min-width:200px"><button class="btn" type="submit">${ic("flag")}${esc(t("ver.save"))}</button></form>`
      : empty(t("build.empty"), aiBtn("compile", t("build.compile"), "H", {primary:true, key:"compile"}));
  } else if (UI.buildTab === "lint"){
    body = lint.length ? `<div class="list">${lint.map(l => { const r = KP_RULES.find(x => x.id === l.rule); const s = secs.find(x => x.id === l.sec); return `<div class="item ${l.sev === "error" ? "sev-crit" : l.sev === "warn" ? "sev-high" : "sev-low"}"><div class="body"><span class="title">${esc(t(l.key, {d: l.detail || ""}))}</span><span class="meta">${s ? `<button class="chip tap" data-a="goto-sec" data-id="${s.id}">${esc(s.title)}</button>` : ""}${r ? `<span>${esc(t("lint.rule"))}: ${esc(L(r))}</span>` : ""}</span></div>${chip(t("lsev." + l.sev), l.sev === "error" ? "crit" : l.sev === "warn" ? "warn" : "")}</div>`; }).join("")}</div><p class="hint">${esc(t("lint.hint"))}</p>` : empty(t("lint.none"));
  } else {
    body = p.versions.length ? `<div class="list">${p.versions.map(v => `<div class="item"><span class="mono" style="color:var(--accent)">v${v.no}</span><div class="body"><span class="title">${esc(v.reason)}</span><span class="meta">${esc(fmtDate(v.at))}${v.passRate != null ? chip(t("test.passrate") + " " + v.passRate + "%", v.passRate >= 80 ? "ok" : "warn") : ""}${v.no === p.launchVersion ? chip(t("launch.launchver"), "acc") : ""}</span></div><div class="acts">${v.no !== p.versionNo ? btn("ver-diff", t("ver.compare"), {cls:"sm", attrs:`data-no="${v.no}"`}) + btn("ver-restore", t("ver.restore"), {cls:"sm", attrs:`data-no="${v.no}"`}) : chip(t("ver.current"), "ok")}</div></div>`).join("")}</div>` : empty(t("ver.empty"));
  }
  return `
  <section class="panel">
    ${head(t("build.title"), t("build.sub"), `<div class="row"><label class="fld" style="min-width:190px"><span>${esc(t("build.target"))}</span>${bindSelect("p:targetModel", p.targetModel, MODELS.map(m => [m.id, m.label]))}</label>${modelChip("build")}${secs.length ? aiBtn("compile", t("build.recompile"), "H", {key:"compile"}) : ""}</div>`)}
    <p class="hint">${esc(t("build.targethint"))}</p>
    ${busyHTML("compile")}
    <div class="tabs" role="tablist">${tabs}</div>
    ${body}
  </section>
  ${secs.length ? `<div class="row end">${btn("phase", t("build.toReview"), {icon:"arrow", cls:"primary", attrs:'data-ph="review"'})}</div>` : ""}`;
}

/* ===================== PHASE: REVIEW ===================== */
function phReview(p){
  const fs = p.findings.filter(f => UI.showAllFindings || f.status === "open");
  const order = {critical:0, high:1, medium:2, low:3};
  fs.sort((a,b) => order[a.severity] - order[b.severity]);
  const lensRow = LENSES.map(l => `<label class="chip tap ${UI.lensSel.has(l.id) ? "sel" : ""}"><input type="checkbox" data-a-change="lens" data-id="${l.id}" ${UI.lensSel.has(l.id) ? "checked" : ""} style="display:none">${esc(L(l))}${p.reviewVerdicts[l.id] ? " ✓" : ""}</label>`).join("");
  const open = p.findings.filter(f => f.status === "open");
  const rows = fs.map(f => { const lens = LENSES.find(l => l.id === f.lens); return `<div class="item sev-${f.severity === "critical" ? "crit" : f.severity === "high" ? "high" : f.severity === "medium" ? "med" : "low"}">
    ${f.status === "open" ? `<input type="checkbox" data-a-change="sel-finding" data-id="${f.id}" ${UI.selFindings.has(f.id) ? "checked" : ""} aria-label="${esc(t("rev.select"))}" style="margin-top:4px;accent-color:var(--accent)">` : ""}
    <div class="body"><div class="row">${sevChip(f.severity)}${chip(lens ? L(lens) : t("rev.feedback"))}${f.section ? `<button class="chip tap" data-a="goto-sec" data-id="${esc(f.section)}">${esc(f.section)}</button>` : ""}${f.status !== "open" ? chip(t("fst." + f.status), f.status === "fixed" ? "ok" : "") : ""}</div>
      <span class="title">${esc(f.issue)}</span>${f.where ? `<span class="small mono muted">“${esc(trunc(f.where, 160))}”</span>` : ""}<span class="small"><b>${esc(t("rev.fix"))}:</b> ${esc(f.fix)}</span></div>
    <div class="acts" style="flex-direction:column">${f.status === "open" ? ibtn("finding-dismiss","x",t("rev.dismiss"),`data-id="${f.id}"`) + ibtn("finding-done","check",t("rev.markfixed"),`data-id="${f.id}"`) : ""}${noteMark("finding", f.id, f.issue)}</div></div>`; }).join("");
  const verdicts = Object.keys(p.reviewVerdicts).filter(k => p.reviewVerdicts[k]).map(k => { const l = LENSES.find(x => x.id === k); return `<div class="item"><div class="body"><span class="small muted">${esc(l ? L(l) : k)}</span><span class="small">${esc(p.reviewVerdicts[k])}</span></div></div>`; }).join("");
  return `
  <section class="panel">
    ${head(t("rev.title"), t("rev.sub"), modelChip("review"))}
    <div class="row">${lensRow}</div>
    <div class="row">${aiBtn("review", t("rev.run", {n: UI.lensSel.size}), "H", {primary:true, key:"review"})}<span class="hint">${esc(t("rev.indep"))}</span></div>
    ${busyHTML("review")}
    ${p.reviewedVersion && p.reviewedVersion !== p.versionNo ? `<div class="hint">${ic("flag")}${esc(t("rev.stale", {v: p.reviewedVersion, c: p.versionNo}))}</div>` : ""}
  </section>
  <section class="panel">
    ${head(t("rev.findings", {n: open.length}), "", `<div class="row"><label class="chk small"><input type="checkbox" data-bind="ui:showAllFindings" ${UI.showAllFindings ? "checked" : ""}>${esc(t("rev.showall"))}</label>${btn("sel-all-findings", t("rev.selall"), {cls:"sm ghost"})}${aiBtn("apply-fixes", t("rev.apply", {n: UI.selFindings.size}), "M", {primary: UI.selFindings.size > 0, key:"fix", attrs: UI.selFindings.size ? "" : "disabled"})}</div>`)}
    ${busyHTML("fix")}
    ${rows ? `<div class="list">${rows}</div>` : empty(p.reviewedVersion ? t("rev.clean") : t("rev.empty"))}
  </section>
  ${verdicts ? `<section class="panel">${head(t("rev.verdicts"))}<div class="list">${verdicts}</div></section>` : ""}
  <div class="row end">${btn("phase", t("rev.toTest"), {icon:"arrow", cls:"primary", attrs:'data-ph="test"'})}</div>`;
}

/* ===================== PHASE: TEST ===================== */
function phTest(p){
  const tabs = ["cases","runs","improve","judge"].map(x => `<button class="tab ${UI.testTab === x ? "on" : ""}" data-a="tab" data-t="testTab" data-v="${x}">${esc(t("test.tab." + x))}${x === "cases" ? " · " + p.tests.length : x === "runs" ? " · " + p.runs.filter(r => r.label !== "candidate").length : ""}</button>`).join("");
  let body = "";
  const cats = ["normal","edge","adversarial","empty","language"];
  if (UI.testTab === "cases"){
    body = `<div class="row">${aiBtn("gen-tests", p.tests.length ? t("test.more") : t("test.gen"), "M", {primary: !p.tests.length, key:"tests"})}${btn("add-test", t("test.add"), {icon:"plus", cls:"sm"})}<span class="hint" style="flex:1">${esc(t("test.heldhint"))}</span></div>${busyHTML("tests")}
    ${p.tests.length ? `<div class="list">${p.tests.map(x => { const open = UI.expanded.has("t-" + x.id); return `<div class="item"><span class="mono" style="color:var(--accent);min-width:28px">${esc(x.id)}</span><div class="body"><div class="row"><span class="title" style="flex:1">${esc(x.title || trunc(x.input, 80))}</span>${chip(t("tcat." + x.category))}${x.heldOut ? chip(t("test.heldout"), "warn") : ""}${x.reqIds.map(r => chip(r)).join("")}${x.fromFeedback ? chip(t("test.fromfb"), "acc") : ""}</div>
      ${open ? `<label class="fld"><span>${esc(t("lib.ptitle"))}</span>${bindInput("p:tests.#" + x.id + ".title", x.title)}</label><div class="grid2"><label class="fld"><span>${esc(t("test.input"))}</span>${bindArea("p:tests.#" + x.id + ".input", x.input, {rows:4})}</label><label class="fld"><span>${esc(t("test.sim"))}</span>${bindArea("p:tests.#" + x.id + ".simulated", x.simulated, {rows:4})}</label></div><label class="fld"><span>${esc(t("test.criteria"))}</span><textarea rows="3" data-lines-test="${x.id}" id="crit-${x.id}">${esc(x.criteria.join("\n"))}</textarea></label><div class="row">${bindSelect("p:tests.#" + x.id + ".category", x.category, cats.map(c => [c, t("tcat." + c)]))}<label class="chk small"><input type="checkbox" data-bind="p:tests.#${x.id}.heldOut" ${x.heldOut ? "checked" : ""}>${esc(t("test.heldout"))}</label><label class="fld" style="flex:1"><span>${esc(t("test.reqs"))}</span><input type="text" data-reqids="${x.id}" value="${esc(x.reqIds.join(", "))}" id="rq-${x.id}"></label></div>` : `<span class="small muted">${esc(trunc(x.input, 200))}</span><span class="small">${x.criteria.map(c => "✓ " + esc(c)).join("<br>")}</span>`}</div>
      <div class="acts" style="flex-direction:column">${ibtn("toggle-exp", open ? "check" : "edit", open ? t("btn.done") : t("btn.edit"), `data-k="t-${x.id}"`)}${noteMark("test", x.id, x.id + " " + (x.title || ""))}${ibtn("del-item","trash",t("btn.delete"),`data-list="tests" data-id="${x.id}"`)}</div></div>`; }).join("")}</div>` : empty(t("test.empty"))}`;
  } else if (UI.testTab === "runs"){
    const runs = p.runs.filter(r => r.label !== "candidate");
    body = `<div class="row"><label class="fld" style="width:auto"><span>${esc(t("test.trials"))}</span>${bindSelect("ui:trials", UI.trials || 1, [[1,"1"],[2,"2"],[3,"3"]])}</label><label class="fld" style="width:auto"><span>${esc(t("test.which"))}</span>${bindSelect("ui:runWhich", UI.runWhich || "all", [["all",t("test.all")],["open",t("test.visible")],["held",t("test.held")]])}</label>${aiBtn("run-tests", t("test.run"), "H", {primary:true, key:"sim"})}<span class="hint" style="flex:1">${esc(t("test.runhint"))}</span></div>${busyHTML("sim")}${busyHTML("judge")}
      ${runs.length ? runs.map((r, ri) => `<div class="panel flat"><div class="row"><b>v${esc(String(r.versionNo))}</b><span class="small muted">${esc(fmtDate(r.at))} · ${esc(t("test.trialsn", {n: r.trials}))}</span><span style="flex:1"></span>${chip(t("test.passrate") + " " + r.passRate + "%", r.passRate >= 80 ? "ok" : r.passRate >= 50 ? "warn" : "crit")}${chip(t("test.consistency") + " " + r.consistency + "%", r.consistency >= 80 ? "ok" : "warn")}</div>
        <div class="list">${r.results.map((x, xi) => { const k = "r-" + r.id + "-" + xi; const open = UI.expanded.has(k); const tc = p.tests.find(y => y.id === x.testId) || {criteria:[]}; return `<div class="item ${x.pass ? "" : "sev-crit"}"><span class="dot ${x.pass ? "ok" : "crit"}" style="margin-top:6px"></span><div class="body"><div class="row"><b class="mono">${esc(x.testId)}</b>${r.trials > 1 ? chip("#" + (x.trial + 1)) : ""}${x.heldOut ? chip(t("test.heldout"), "warn") : ""}<span class="small muted" style="flex:1">${esc(trunc(tc.title || tc.input || "", 70))}</span></div>
          ${open ? `<label class="fld"><span>${esc(t("test.output"))}</span><pre class="prompt" style="max-height:260px;border:1px solid var(--line);border-radius:6px;padding:8px">${esc(x.output)}</pre></label>${x.verdicts.map(v => `<div class="row small" style="align-items:flex-start"><span class="chip ${v.v === "pass" ? "ok" : v.v === "fail" ? "crit" : ""}">${esc(t("verd." + v.v))}</span><span style="flex:1"><b>${esc(tc.criteria[v.c - 1] || "#" + v.c)}</b><br>${esc(v.reason)}</span>${x["spot" + v.c] ? chip(t("judge." + x["spot" + v.c]), x["spot" + v.c] === "agree" ? "ok" : "warn") : `<button class="chip tap" data-a="spot" data-run="${r.id}" data-x="${xi}" data-c="${v.c}" data-v="agree">${esc(t("judge.agree"))}</button><button class="chip tap" data-a="spot" data-run="${r.id}" data-x="${xi}" data-c="${v.c}" data-v="disagree">${esc(t("judge.disagree"))}</button>`}</div>`).join("")}` : `<span class="small">${x.verdicts.map(v => `<span class="chip ${v.v === "pass" ? "ok" : v.v === "fail" ? "crit" : ""}">${v.c}: ${esc(t("verd." + v.v))}</span>`).join(" ")}</span>`}</div><div class="acts">${ibtn("toggle-exp", open ? "x" : "search", open ? t("btn.close") : t("test.details"), `data-k="${k}"`)}</div></div>`; }).join("")}</div></div>`).join("") : empty(t("test.noruns"))}`;
  } else if (UI.testTab === "improve"){
    const c = p.candidate;
    let cmp = "";
    if (c && c.passRate != null){
      const last = p.runs.find(r => r.label !== "candidate");
      const candRun = p.runs.find(r => r.id === c.runId);
      const ids = candRun ? [...new Set(candRun.results.map(r => r.testId))] : [];
      const base = last ? last.results.filter(r => ids.includes(r.testId)) : [];
      const basePct = base.length ? Math.round(base.filter(r => r.pass).length / base.length * 100) : null;
      const better = basePct == null || c.passRate >= basePct;
      cmp = `<div class="row">${chip(t("test.cand") + " " + c.passRate + "%", better ? "ok" : "crit")}${basePct != null ? chip(t("test.curr") + " " + basePct + "%") : ""}<span class="small ${better ? "" : "muted"}">${esc(better ? t("test.gatepass") : t("test.gatefail"))}</span></div>`;
      c.gate = better;
    }
    body = `<p class="lead">${esc(t("test.improve.lead"))}</p><div class="row">${aiBtn("improve", t("test.improve"), "H", {primary:true, key:"improve"})}</div>${busyHTML("improve")}${busyHTML("sim")}${busyHTML("judge")}
      ${c ? `<div class="panel" style="border-color:var(--accent)">${head(t("test.candidate"), c.summary)}${c.diagnosis.length ? `<h4>${esc(t("test.diagnosis"))}</h4><ul class="small" style="margin:0;padding-left:18px">${c.diagnosis.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}${cmp}
        ${c.sections.filter(s => { const cur = p.pkg.sections.find(x => x.id === s.id); return cur && cur.content !== s.content; }).map(s => `<h4>${esc(s.title)}</h4><div class="diff">${lineDiff(p.pkg.sections.find(x => x.id === s.id).content, s.content).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`).join("")}
        <div class="row end">${btn("cand-discard", t("btn.discard"), {cls:"ghost"})}${btn("cand-adopt", c.gate === false ? t("test.adoptanyway") : t("test.adopt"), {icon:"check", cls: c.gate === false ? "danger" : "primary"})}</div></div>` : ""}`;
  } else {
    let agree = 0, total = 0; for (const r of p.runs) for (const x of r.results) for (const k in x) if (k.startsWith("spot")){ total++; if (x[k] === "agree") agree++; }
    body = `<p class="lead">${esc(t("judge.lead"))}</p><div class="grid3"><div class="panel"><span class="small muted">${esc(t("judge.agreement"))}</span><b style="font-size:28px;font-family:var(--f-display)" class="tnum">${total ? Math.round(agree/total*100) + "%" : "—"}</b><span class="small muted">${esc(t("judge.spots", {n: total}))}</span></div><div class="panel" style="grid-column:span 2"><p class="small">${esc(total < 10 ? t("judge.need") : agree/total >= .8 ? t("judge.good") : agree/total >= .7 ? t("judge.ok") : t("judge.bad"))}</p></div></div>`;
  }
  return `<section class="panel">${head(t("test.title"), t("test.sub"), modelChip("test"))}<div class="tabs" role="tablist">${tabs}</div>${body}</section>
  ${p.runs.length ? `<div class="row end">${btn("phase", t("test.toLaunch"), {icon:"arrow", cls:"primary", attrs:'data-ph="launch"'})}</div>` : ""}`;
}

/* ===================== PHASE: LAUNCH ===================== */
function phLaunch(p){
  const rd = readiness(p);
  const secs = arr(p.pkg.sections);
  const blocks = {s2: secs.filter(s => s.dest === "instructions"), s3: secs.filter(s => s.dest === "knowledge"), s4: secs.filter(s => s.dest === "scheduled"), s5: secs.filter(s => s.dest === "skill")};
  const steps = SETUP_STEPS.map(st => `<div class="item"><input type="checkbox" id="st-${st.id}" data-bind="p:setup.${st.id}" ${p.setup[st.id] ? "checked" : ""} style="margin-top:3px;accent-color:var(--accent)"><div class="body"><label for="st-${st.id}" class="title" style="cursor:pointer">${esc(L(st))}</label>
    ${(blocks[st.id] || []).length ? `<div class="row">${blocks[st.id].map(s => `<button class="chip tap" data-a="sec-copy" data-id="${s.id}">${ic("copy")}${esc(s.filename || s.title)}${s.cadence ? " · " + esc(s.cadence) : ""}</button>`).join("")}${st.id === "s5" ? btn("dl-skills", t("build.dlskills"), {icon:"dl", cls:"sm"}) : ""}</div>` : ""}
    ${st.id === "s7" ? `<button class="chip tap" data-a="goto-op">${ic("inbox")}${esc(t("op.inbox"))}</button>` : ""}${st.id === "s8" ? btn("mark-launch", p.launchVersion === p.versionNo ? t("launch.marked", {v: p.versionNo}) : t("launch.mark", {v: p.versionNo}), {cls:"sm"}) : ""}</div></div>`).join("");
  const tr = p.trace;
  return `
  <section class="panel">
    ${head(t("rd.title"), t("rd.sub"))}
    <div class="grid3"><div class="stack" style="align-items:flex-start"><b style="font-family:var(--f-display);font-size:44px;line-height:1" class="tnum">${rd.score}%</b>${chip(rd.score >= 80 ? t("rd.ready") : t("rd.notready"), rd.score >= 80 ? "ok" : "warn")}<p class="small muted">${esc(t("rd.gate"))}</p></div>
      <div class="list" style="grid-column:span 2">${rd.items.map(i => `<div class="item" style="padding:7px 12px"><span class="dot ${i.frac >= .99 ? "ok" : i.frac > 0 ? "warn" : "crit"}" style="margin-top:7px"></span><div class="body"><span class="small">${esc(t(i.key))}${i.detail ? ` <span class="muted">· ${esc(i.detail)}</span>` : ""}</span></div><span class="mono small muted">${Math.round(i.w * i.frac)}/${i.w}</span></div>`).join("")}</div></div>
  </section>
  <section class="panel">${head(t("launch.setup"), t("launch.setup.sub"))}<div class="list">${steps}</div></section>
  <section class="panel">
    ${head(t("launch.trace"), t("launch.trace.sub"), `<div class="row">${modelChip("launch")}${aiBtn("trace", tr ? t("btn.redo") : t("launch.tracegen"), "M", {key:"trace"})}</div>`)}
    ${busyHTML("trace")}
    ${tr ? `${tr.version !== p.versionNo ? `<p class="hint">${esc(t("launch.tracestale", {v: tr.version}))}</p>` : ""}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("launch.req"))}</th><th>${esc(t("launch.lines"))}</th><th>${esc(t("launch.tests"))}</th></tr></thead><tbody>${tr.map.map(m => `<tr><td class="mono">${esc(m.req)}</td><td class="small">${m.lines.map(l => `<div>“${esc(l.quote)}” <span class="muted">(${esc(l.section)})</span></div>`).join("") || `<span style="color:var(--crit)">—</span>`}</td><td>${m.tests.map(x => chip(x)).join(" ") || `<span style="color:var(--crit)">—</span>`}</td></tr>`).join("")}</tbody></table></div>
      <div class="grid2"><div class="stack"><h4>${esc(t("launch.orphreq"))} ${chip(String(tr.orphanReqs.length), tr.orphanReqs.length ? "warn" : "ok")}</h4>${tr.orphanReqs.map(o => `<div class="small">${esc(o.req)} — ${esc(t("launch.missing." + o.missing))}</div>`).join("")}</div><div class="stack"><h4>${esc(t("launch.orphline"))} ${chip(String(tr.orphanLines.length), tr.orphanLines.length ? "warn" : "ok")}</h4>${tr.orphanLines.map(o => `<div class="small">“${esc(o.quote)}” <span class="muted">${esc(o.note)}</span></div>`).join("")}</div></div>` : `<p class="small muted">${esc(t("launch.traceempty"))}</p>`}
  </section>
  <div class="grid2">
    <section class="panel">${head(t("launch.rollback"), t("launch.rollback.sub"))}${p.launchVersion ? `<p>${esc(t("launch.current", {v: p.launchVersion}))}</p>${p.versions.filter(v => v.no < p.launchVersion).slice(0,1).map(v => btn("ver-restore", t("launch.rollto", {v: v.no}), {cls:"sm", attrs:`data-no="${v.no}"`})).join("")}` : `<p class="small muted">${esc(t("launch.nolaunch"))}</p>`}</section>
    <section class="panel">${head(t("launch.monitor"), t("launch.monitor.sub"))}${bindArea("p:monitoring", p.monitoring || "", {rows:4, ph:t("launch.monitorph")})}</section>
  </div>`;
}

/* ===================== PHASE: OPERATE ===================== */
function healthSVG(h){
  if (h.length < 2) return "";
  const W = 600, H = 120, pad = 18;
  const xs = h.map((_, i) => pad + i * (W - 2*pad) / (h.length - 1)), ys = h.map(x => H - pad - (x.quality - 1) / 4 * (H - 2*pad));
  const line = xs.map((x, i) => (i ? "L" : "M") + x + "," + ys[i]).join(" ");
  const area = line + ` L${xs[xs.length-1]},${H-pad} L${xs[0]},${H-pad} Z`;
  const grid = [1,3,5].map(v => { const y = H - pad - (v-1)/4*(H-2*pad); return `<line x1="${pad}" x2="${W-pad}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="2" y="${y+3}" font-size="9" fill="var(--muted)">${v}</text>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(t("op.health"))}">${grid}<path d="${area}" fill="var(--accent-soft)"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="${xs[xs.length-1]}" cy="${ys[ys.length-1]}" r="4" fill="var(--accent)"/></svg>`;
}
function phOperate(p){
  const tabs = ["inbox","health","watch"].map(x => `<button class="tab ${UI.opTab === x ? "on" : ""}" data-a="tab" data-t="opTab" data-v="${x}">${esc(t("op.tab." + x))}</button>`).join("");
  let body = "";
  if (UI.opTab === "inbox"){
    body = `<form class="stack" data-form="feedback"><label class="fld"><span>${esc(t("op.paste"))}</span><textarea id="fb-paste" rows="6" placeholder="${esc(t("op.pasteph"))}"></textarea></label><label class="fld"><span>${esc(t("op.comment"))}</span><input type="text" id="fb-comment" placeholder="${esc(t("op.commentph"))}"></label><div class="row end"><button class="btn primary ai" type="submit" data-cost="${esc(t("cost.m"))}">${ic("spark")}${esc(t("op.diagnose"))}</button></div></form>
    ${p.feedback.slice().reverse().map(f => `<div class="panel flat">${busyHTML("diag-" + f.id)}<div class="row"><b>${esc(fmtDate(f.at))}</b>${chip(t("fbs." + f.status), f.status === "fixed" ? "ok" : f.status === "diagnosed" ? "acc" : "")}${f.quality ? chip(t("op.quality") + " " + f.quality + "/5") : ""}<span class="small muted" style="flex:1">${esc(f.comment)}</span></div>
      <details><summary class="small">${esc(t("op.showpasted"))}</summary><pre class="prompt" style="max-height:200px">${esc(f.pasted)}</pre></details>
      ${f.diagnosis ? `<dl class="kv"><dt>${esc(t("op.cat"))}</dt><dd>${esc(f.diagnosis.ok ? t("op.okresult") : f.diagnosis.category)}</dd><dt>${esc(t("op.cause"))}</dt><dd>${esc(f.diagnosis.cause)}</dd><dt>${esc(t("op.where"))}</dt><dd>${esc(f.diagnosis.section)} · “${esc(f.diagnosis.line)}”</dd><dt>${esc(t("rev.fix"))}</dt><dd>${esc(f.diagnosis.fix)}</dd>${f.diagnosis.test ? `<dt>${esc(t("op.newtest"))}</dt><dd>${esc(f.diagnosis.test.title)}</dd>` : ""}</dl>${!f.diagnosis.ok && f.status === "diagnosed" ? `<div class="row end">${aiBtn("fb-apply", t("op.applyfix"), "M", {primary:true, attrs:`data-id="${f.id}"`, key:"fix"})}</div>` : ""}` : (f.status === "new" ? `<div class="row end">${aiBtn("fb-diagnose", t("op.diagnose"), "M", {attrs:`data-id="${f.id}"`, key:"diag-" + f.id})}</div>` : "")}</div>`).join("") || empty(t("op.empty"))}`;
  } else if (UI.opTab === "health"){
    body = `<div class="spark">${healthSVG(p.health) || `<p class="small muted">${esc(t("op.healthempty"))}</p>`}</div>
      <form class="row" data-form="health"><label class="fld" style="width:auto"><span>${esc(t("op.quality"))}</span><select id="h-q">${[5,4,3,2,1].map(n => `<option value="${n}">${n}</option>`).join("")}</select></label><input type="text" id="h-note" placeholder="${esc(t("op.healthph"))}" style="flex:1;min-width:200px"><button class="btn" type="submit">${ic("plus")}${esc(t("op.addrating"))}</button></form>
      ${p.health.length ? `<div class="list">${p.health.slice().reverse().map(h => `<div class="item"><span class="mono">${h.quality}/5</span><div class="body"><span class="small">${esc(h.note)}</span><span class="meta">${esc(fmtDate(h.at))}</span></div></div>`).join("")}</div>` : ""}`;
  } else {
    const old = p.pkg.kp && p.pkg.kp !== KP_VERSION;
    body = `<dl class="kv"><dt>${esc(t("op.kp"))}</dt><dd>${esc(fmtDay(KP_VERSION))}</dd><dt>${esc(t("op.compiledwith"))}</dt><dd>${p.pkg.kp ? esc(fmtDay(p.pkg.kp)) : "—"} ${old ? chip(t("op.recheck"), "warn") : ""}</dd><dt>${esc(t("build.target"))}</dt><dd>${esc(modelLabel(p.pkg.targetModel || p.targetModel))}</dd></dl>
      <div class="row">${researchBtn(t("op.researchtopic", {m: modelLabel(p.pkg.targetModel || p.targetModel), d: KP_VERSION}))}${btn("copy-watch", t("op.watchtask"), {icon:"copy", cls:"sm"})}</div><p class="hint">${esc(t("op.watchhint"))}</p>`;
  }
  return `<section class="panel">${head(t("op.title"), t("op.sub"), modelChip("operate"))}<div class="tabs" role="tablist">${tabs}</div>${body}</section>`;
}

/* ===================== PROJECT LOG ===================== */
function phLog(p){
  const tabs = ["decisions","open","foresight","research"].map(x => `<button class="tab ${UI.logTab === x ? "on" : ""}" data-a="tab" data-t="logTab" data-v="${x}">${esc(t("log.tab." + x))}</button>`).join("");
  let body = "";
  if (UI.logTab === "decisions"){
    body = `<form class="row" data-form="decision"><input type="text" id="dc-title" placeholder="${esc(t("log.dtitle"))}" style="flex:1;min-width:160px"><input type="text" id="dc-choice" placeholder="${esc(t("log.dchoice"))}" style="flex:1;min-width:160px"><input type="text" id="dc-reason" placeholder="${esc(t("log.dreason"))}" style="flex:2;min-width:200px"><button class="btn" type="submit">${ic("plus")}${esc(t("btn.add"))}</button></form>
      ${p.decisions.length ? `<div class="list">${p.decisions.slice().reverse().map(d => `<div class="item"><div class="body"><span class="title">${esc(d.title)}: ${esc(d.choice)}</span>${d.reason ? `<span class="small muted">${esc(d.reason)}</span>` : ""}<span class="meta">${esc(fmtDate(d.at))}</span></div></div>`).join("")}</div>` : empty(t("log.nodec"))}`;
  } else if (UI.logTab === "open"){
    body = `<form class="row" data-form="openq"><input type="text" id="oq-text" placeholder="${esc(t("log.oqph"))}" style="flex:1"><button class="btn" type="submit">${ic("plus")}${esc(t("btn.add"))}</button></form>
      <label class="fld"><span>${esc(t("log.nextaction"))}</span>${bindInput("p:nextAction", p.nextAction, {ph:t("log.nextph")})}</label>
      ${p.openQs.length ? `<div class="list">${p.openQs.map(q => `<div class="item"><input type="checkbox" data-bind="p:openQs.#${q.id}.done" ${q.done ? "checked" : ""} style="margin-top:3px;accent-color:var(--accent)"><div class="body"><span class="${q.done ? "muted" : ""}" style="${q.done ? "text-decoration:line-through" : ""}">${esc(q.text)}</span></div>${ibtn("del-item","trash",t("btn.delete"),`data-list="openQs" data-id="${q.id}"`)}</div>`).join("")}</div>` : empty(t("log.nooq"))}`;
  } else if (UI.logTab === "foresight"){
    const all = activeForesight(p);
    body = `<p class="lead">${esc(t("fs.lead"))}</p>${PHASES.map(ph => { const items = all.filter(f => f.phase === ph.id); return items.length ? `<div class="stack"><h4>${esc(L(ph))}</h4><div class="list">${items.map(f => `<div class="item"><input type="checkbox" data-a-change="fs-toggle" data-id="${esc(f.id)}" ${f.done ? "checked" : ""} style="margin-top:3px;accent-color:var(--accent)"><div class="body"><span class="${f.done ? "muted" : ""}">${esc(f.text)}</span></div>${f.ai ? chip(t("fs.ai"), "acc") : ""}</div>`).join("")}</div></div>` : ""; }).join("")}`;
  } else {
    const rs = WS.research.filter(r => r.projectId === p.id);
    body = `<div class="row">${btn("research", t("res.new"), {icon:"globe", cls:"sm", attrs:'data-topic=""'})}</div>${rs.length ? rs.map(researchCard).join("") : empty(t("res.empty"))}`;
  }
  return `<section class="panel">${head(t("log.title"), t("log.sub"))}<div class="tabs" role="tablist">${tabs}</div>${body}</section>`;
}
function researchCard(r){
  const expired = r.expires && r.expires < now().slice(0, 7);
  return `<div class="panel flat"><div class="row"><b style="flex:1">${esc(r.topic)}</b>${expired ? chip(t("res.expired"), "warn") : r.expires ? chip(t("res.until", {d: r.expires})) : ""}<span class="small muted">${esc(fmtDay(r.at))}</span>${ibtn("res-del","trash",t("btn.delete"),`data-id="${r.id}"`)}</div>
    <p class="small">${esc(r.summary)}</p>
    <div class="grid3">${[["whatWorks","res.works"],["whatFails","res.fails"],["recommendations","res.recs"]].map(([k, lb]) => arr(r[k]).length ? `<div class="stack"><h4>${esc(t(lb))}</h4><ul class="small" style="margin:0;padding-left:18px">${r[k].map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "").join("")}</div>
    ${arr(r.sources).length ? `<div class="small">${r.sources.map(s => `<div>${chip(t("srcq." + (s.quality || "secondary")), s.quality === "primary" ? "ok" : s.quality === "opinion" ? "warn" : "")} <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a> <span class="muted">${esc(s.date || "")}</span></div>`).join("")}</div>` : ""}</div>`;
}
