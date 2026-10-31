/* ===================== PHASE: CAPTURE ===================== */
/** decision D8: who uses the tool (switches on Art. 50 and data-protection checks) */
function audiencePanel(p){
  const a = p.audience || {};
  const yn = (k) => `<div class="seg" role="group">${[["yes", true], ["no", false]].map(([lbl, v]) => `<button class="${a[k] === v ? "on" : ""}" data-a="aud-set" data-k="${k}" data-v="${v}">${esc(t("btn." + lbl))}</button>`).join("")}</div>`;
  return `<section class="panel" id="audience" ${p.focus.id === "audience" ? "data-focus" : ""}>${head(t("aud.title"), t("aud.sub"))}
    <div class="row"><span style="flex:1;min-width:220px">${esc(t("aud.customers"))}</span>${yn("customers")}</div>
    <div class="row"><span style="flex:1;min-width:220px">${esc(t("aud.eu"))}</span>${yn("eu")}</div>
    ${a.eu || a.customers ? `<p class="hint">${esc(t(a.eu ? "aud.hint.eu" : "aud.hint.cust"))}</p>` : ""}</section>`;
}
function phCapture(p){
  const it = p.intake;
  const imgs = arr(p._images);
  const draft = p.nsDraft;
  return `
  <section class="panel">
    ${head(t("cap.title"), t("cap.sub"), modelChip("capture"))}
    ${bindArea("p:intake.raw", it.raw, {ph:t("cap.ph"), rows:12, id:"raw", cls:"bigfield"})}
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
    <div class="row">${itemTools("intake:clean")}</div>${itemBox("intake:clean")}
    <div class="grid3">
      ${issueList(t("cap.contra"), it.contradictions, "crit")}
      ${issueList(t("cap.ambig"), it.ambiguities, "warn")}
      ${issueList(t("cap.missing"), it.missing.map(m => m.item + (m.why ? " — " + m.why : "")), "acc")}
    </div>
  </section>` : ""}
  ${it.raw ? audiencePanel(p) : ""}
  ${str(p.northStar.goal).trim() || goalOf(p).criteria.length ? goalPanel(p) : ""}`;
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
    ${frontierPanel(p)}
    <section class="panel" id="engine-g12">${head(t("eng.gates.early"), t("eng.gates.early.sub"))}${gatesPanel(p, ["G1","G2"])}</section>
    <div class="grid2">
      ${card("whys", t("und.whys"), t("und.whys.sub"), whys)}
      ${card("jtbd", t("und.jtbd"), t("und.jtbd.sub"), jt)}
    </div>
    ${problemPanel(p)}
    ${card("walkthrough", t("und.walk"), t("und.walk.sub"), wt)}
    <div class="grid2">
      ${card("premortem", t("und.pm"), t("und.pm.sub"), pm)}
      ${card("devil", t("und.devil"), t("und.devil.sub"), dv)}
    </div>
    `;
}

/* ===================== PHASE: INTERVIEW ===================== */
/* ===================== PHASE: ASSUMPTIONS & RISKS ===================== */
function phAssume(p){
  const all = newFirst(p, "assumption", p.assumptions.slice().sort((a,b) => b.impact*b.risk - a.impact*a.risk));
  // the map: one bubble per position with the number of assumptions there (never stacked dots); a click filters the list
  const cells = {}; for (const a of all){ const k = a.risk + "-" + a.impact; (cells[k] = cells[k] || []).push(a); }
  const pts = Object.entries(cells).map(([k, list]) => { const [rk, im] = k.split("-").map(Number); const x = (rk - 1) / 4 * 88 + 6, y = (im - 1) / 4 * 82 + 6; const open = list.filter(a => !aHandled(a)).length, hot = rk * im >= 12; return `<button class="pt ${UI.asCell === k ? "sel" : ""} ${open ? (hot ? "hot" : "") : "done"}" style="left:${x}%;bottom:${y}%" title="${esc(t("as.cell", {n: list.length, o: open, i: im, r: rk}))}" aria-label="${esc(t("as.cell", {n: list.length, o: open, i: im, r: rk}))}" data-a="as-cell" data-v="${k}">${list.length}</button>`; }).join("");
  const as = UI.asCell ? all.filter(a => a.risk + "-" + a.impact === UI.asCell) : all;
  const catOpts = ACAT.map(c => [c, t("acat." + c)]);
  const stOpts = ["untested","testing","validated","invalid"].map(s => [s, t("ast." + s)]);
  const num5 = (spec, v) => bindSelect(spec, v, [1,2,3,4,5].map(n => [n, String(n)]));
  const asRow = (a, i) => { const ref = "assumption:" + a.id, open = UI.open.has(ref) || p.focus.id === ref, st = aHandled(a) ? "ok" : isRiskyA(a) ? "bad" : isFlagged(p, ref) ? "warn" : "as";
    return `<div class="irow ${open ? "open" : ""}" id="ir-${esc(ref)}"><div class="ihead-wrap">${stSlot(st)}<button class="ihead" data-a="item-open" data-ref="${esc(ref)}" aria-expanded="${open}"><span class="iid mono">A${p.assumptions.indexOf(a) + 1}</span><span class="ititle">${esc(a.text || "—")}</span></button><span class="chips">${chip(t("acat." + a.category))}<span class="chip ${isRiskyA(a) ? "warn" : ""}" title="${esc(t("as.impact"))} × ${esc(t("as.risk"))}">${a.impact}×${a.risk}</span>${chip(t("ast." + a.status), a.status === "validated" ? "ok" : "")}${markChip(p, ref)}</span>${inspBtn(ref, "A" + (p.assumptions.indexOf(a) + 1))}${!open && !aHandled(a) ? `<button class="btn xs primary qp" data-a="as-validate" data-id="${esc(a.id)}">${ic("check")}${esc(t("as.validate"))}</button>` : ""}</div>
    ${open ? `<div class="ibody"><div class="body">${bindArea("p:assumptions.#" + a.id + ".text", a.text, {rows:2})}
        <div class="row">${bindSelect("p:assumptions.#" + a.id + ".category", a.category, catOpts)}<span class="small muted">${esc(t("as.impact"))}</span>${num5("p:assumptions.#" + a.id + ".impact", a.impact)}<span class="small muted">${esc(t("as.risk"))}</span>${num5("p:assumptions.#" + a.id + ".risk", a.risk)}${bindSelect("p:assumptions.#" + a.id + ".status", a.status, stOpts)}</div>
        ${bindInput("p:assumptions.#" + a.id + ".test", a.test, {ph:t("as.testph")})}
        ${a.status === "accepted" ? `<span class="small"><b>${esc(t("acc.reason"))}:</b> ${esc(a.reason || "")}</span>` : ""}
        <div class="row">${itemTools(ref, {edit: false, primary: !aHandled(a) ? btn("as-validate", t("as.validate"), {icon:"check", cls:"xs primary", attrs:`data-id="${a.id}"`}) : ""})}${noteMark("assumption", a.id, a.text)}${ibtn("del-item","trash",t("btn.delete"),`data-list="assumptions" data-id="${a.id}"`)}</div>${itemBox(ref)}${threadHTML(p, ref)}</div></div>` : ""}</div>`; };
  const rkRow = r => { const ref = "risk:" + r.id, open = UI.open.has(ref) || p.focus.id === ref, st = rHandled(r) ? "ok" : isBigR(r) ? "bad" : "warn";
    return `<div class="irow ${open ? "open" : ""}" id="ir-${esc(ref)}"><div class="ihead-wrap">${stSlot(st)}<button class="ihead" data-a="item-open" data-ref="${esc(ref)}" aria-expanded="${open}"><span class="iid mono">K${p.risks.indexOf(r) + 1}</span><span class="ititle">${esc(r.text || "—")}</span></button><span class="chips"><span class="chip ${isBigR(r) ? "warn" : ""}" title="${esc(t("rk.lik"))} × ${esc(t("rk.imp"))}">${r.likelihood}×${r.impact}</span>${chip(t("rks." + r.status), rHandled(r) ? "ok" : "")}${r.source ? chip(t("rksrc." + r.source)) : ""}${markChip(p, ref)}</span>${inspBtn(ref, "K" + (p.risks.indexOf(r) + 1))}${!open && !rHandled(r) && !r.mitigation ? aiBtn("risk-suggest", t("rk.suggest"), "L", {attrs:`data-id="${r.id}"`, key:"mit-" + r.id}) : ""}</div>
    ${open ? `<div class="ibody"><div class="body">${bindArea("p:risks.#" + r.id + ".text", r.text, {rows:2})}
        <div class="row"><span class="small muted">${esc(t("rk.lik"))}</span>${num5("p:risks.#" + r.id + ".likelihood", r.likelihood)}<span class="small muted">${esc(t("rk.imp"))}</span>${num5("p:risks.#" + r.id + ".impact", r.impact)}${bindSelect("p:risks.#" + r.id + ".status", r.status, ["open","mitigated","accepted","closed"].map(s => [s, t("rks." + s)]))}</div>
        ${bindInput("p:risks.#" + r.id + ".mitigation", r.mitigation, {ph:t("rk.mitigation")})}
        <div class="row">${!r.mitigation ? aiBtn("risk-suggest", t("rk.suggest"), "L", {attrs:`data-id="${r.id}"`, key:"mit-" + r.id}) : ""}${r.status === "open" && r.mitigation ? btn("risk-mitigated", t("rk.markmit"), {cls:"xs", attrs:`data-id="${r.id}"`}) : ""}${r.status === "accepted" ? `<span class="small"><b>${esc(t("acc.reason"))}:</b> ${esc(r.reason || "")}</span>` : ""}${itemTools(ref, {edit: false})}${noteMark("risk", r.id, r.text)}${ibtn("del-item","trash",t("btn.delete"),`data-list="risks" data-id="${r.id}"`)}</div>${itemBox(ref)}${threadHTML(p, ref)}</div></div>` : ""}</div>`; };
  const risks = newFirst(p, "risk", p.risks.slice().sort((a,b) => b.likelihood*b.impact - a.likelihood*a.impact));
  return `
  <section class="panel" id="assume14">
    ${head(t("as.title"), t("as.sub"), btn("add-assumption", t("as.add"), {icon:"plus", cls:"sm"}))}
    <div class="grid2" style="align-items:start">
      <div class="stack"><div class="amap"><span class="q tr">${esc(t("as.testfirst"))}</span>${pts}<span class="axis" style="left:50%;bottom:-20px;transform:translateX(-50%)">${esc(t("as.risk"))} →</span></div><p class="hint" style="margin-top:18px">${esc(UI.asCell ? t("as.filtered", {n: as.length}) : t("as.maphint14"))}${UI.asCell ? ` <button class="btn xs ghost" data-a="as-cell" data-v="">${esc(t("as.showall"))}</button>` : ""}</p></div>
      <div class="stack"><h4>${esc(t("as.cats"))}</h4><div class="row">${ACAT.map(c => chip(t("acat." + c) + " · " + p.assumptions.filter(a => a.category === c).length)).join("")}</div><p class="small muted">${esc(t("as.catshint"))}</p>${p.understand.premortem.length ? "" : `<div class="row">${aiBtn("understand", t("und.pm"), "M", {attrs:'data-kind="premortem"', key:"und-premortem"})}</div>`}</div>
    </div>
    ${as.length ? `<div class="ilist">${as.map(asRow).join("")}</div>` : empty(t("as.empty"))}
  </section>
  <section class="panel">
    ${head(t("rk.title"), t("rk.sub"), btn("add-risk", t("rk.add"), {icon:"plus", cls:"sm"}))}
    ${risks.length ? `<div class="ilist">${risks.map(rkRow).join("")}</div>` : empty(t("rk.empty"))}
  </section>
`;
}

/* ===================== PHASE: REQUIREMENTS ===================== */
function phRequire(p){
  const pri = ["must","should","could"].map(x => [x, t("pri." + x)]);
  const reqs = newFirst(p, "req", p.requirements).map(r => { const tc = p.tests.filter(x => x.reqIds.includes(r.id)).length; const ref = "req:" + r.id; return `<div class="item ${r.st === "assumed" ? "as" : ""} ${isFlagged(p, ref) ? "flagged" : ""}" ${p.focus.id === ref ? "data-focus" : ""} id="ir-${esc(ref)}"><span class="mono" style="color:var(--accent);min-width:28px">${esc(r.id)}</span>
    <div class="body"><div class="row">${bindInput("p:requirements.#" + r.id + ".title", r.title, {ph:t("req.titleph")})}${bindSelect("p:requirements.#" + r.id + ".priority", r.priority, pri)}${markChip(p, ref)}${chip(tc ? t("req.tests", {n: tc}) : t("req.notests"), tc ? "ok" : "warn")}${r.st === "assumed" ? `<span class="chip st-as">${esc(t("ist.as"))}</span>${btn("item-confirm", t("btn.confirm"), {icon:"check", cls:"xs primary", attrs:`data-ref="${ref}"`})}` : ""}${isFlagged(p, ref) ? `<span class="chip st-warn">${esc(t("ist.warn"))}</span>` : ""}</div>
      <div class="grid3"><label class="fld"><span>${esc(t("req.given"))}</span>${bindArea("p:requirements.#" + r.id + ".given", r.given, {rows:2})}</label><label class="fld"><span>${esc(t("req.when"))}</span>${bindArea("p:requirements.#" + r.id + ".when", r.when, {rows:2})}</label><label class="fld"><span>${esc(t("req.then"))}</span>${bindArea("p:requirements.#" + r.id + ".then", r.then, {rows:2})}</label></div><div class="row">${itemTools(ref, {edit: false})}</div>${itemBox(ref)}</div>
    <div class="acts" style="flex-direction:column">${inspBtn(ref, r.id)}${noteMark("req", r.id, r.id + " " + r.title)}${ibtn("del-item","trash",t("btn.delete"),`data-list="requirements" data-id="${r.id}"`)}</div></div>`; }).join("");
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
  ${scorePanel(p)}
  ${earlyCheckPanel(p, "require")}`;
}

/* ===================== PHASE: ARCHITECTURE ===================== */
const KIND_COLOR = {ai:"var(--accent)", code:"var(--ok)", hybrid:"#a37bff", human:"var(--signal)", platform:"var(--muted)"};
function phArch(p){
  const a = p.arch;
  const keys = ["reliability","cost","safety","effort","maintainability","platformFit"];
  const opts = a.options.length ? optionCards(p) : empty(t("arch.empty"));
  const comps = a.components.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("arch.component"))}</th><th>${esc(t("arch.kind"))}</th><th>${esc(t("arch.in"))}</th><th>${esc(t("arch.out"))}</th><th></th></tr></thead><tbody>${a.components.map(c => `<tr><td><b>${esc(c.name)}</b><div class="small muted">${esc(c.role)}</div><div class="small" style="color:var(--fg-2)">${esc(c.reason)}</div></td><td><span class="chip" style="color:${KIND_COLOR[c.kind]};border-color:${KIND_COLOR[c.kind]}">${esc(t("kind." + c.kind))}</span></td><td class="small">${esc(c.inputs)}</td><td class="small">${esc(c.outputs)}</td><td>${c.model && !guided() ? `<span class="chip model">${esc(c.model)}</span>` : ""}${noteMark("component", c.id, c.name)}${itemTools("component:" + c.id)}${itemBox("component:" + c.id)}</td></tr>`).join("")}</tbody></table></div>` : "";
  return `
  ${trialPanel(p)}
  <section class="panel">
    ${head(t("arch.title"), t("arch.sub"), `<div class="row">${modelChip("arch")}${aiBtn("architecture", a.options.length ? t("btn.redo") : t("arch.gen"), "H", {primary: !a.options.length, key:"arch"})}</div>`)}
    ${busyHTML("arch")}${opts}
  </section>
  ${dialsPanel(p)}
  ${a.options.length ? miniPanel(p) + ceilingHTML(p) : ""}
  ${p.tool.home && p.tool.home.where ? `<section class="panel">${head(t("arch.home"), t("arch.home.sub"))}<p><b>${esc(p.tool.home.where)}</b>${p.tool.home.parts ? " — " + esc(p.tool.home.parts) : ""}</p><p class="small muted">${esc(p.tool.home.why || "")}</p></section>` : ""}
  ${a.components.length ? `<section class="panel">${head(t("arch.map"), t("arch.map.sub2"), `<div class="row" style="gap:4px"><button class="iconbtn" data-a="map-zoom" data-v="-1" title="${esc(t("map.out"))}">−</button><button class="iconbtn" data-a="map-zoom" data-v="1" title="${esc(t("map.in"))}">+</button><button class="iconbtn" data-a="map-full" title="${esc(t("map.full"))}">${ic("expand")}</button></div>`)}<div class="mapwrap">${mapHTML(p, {id:"arch", sel: UI.selPart})}</div><div class="row small">${Object.keys(KIND_COLOR).map(k => `<span class="row" style="gap:5px"><span class="dot k-${k}"></span>${esc(t("kind." + k))}</span>`).join("")}</div>${partInline(p)}${comps}</section>
  <div class="grid2">
    <section class="panel">${head(t("arch.human"), t("arch.human.sub"))}${a.humanSteps.length ? `<div class="list">${a.humanSteps.map(h => `<div class="item"><span class="dot warn" style="margin-top:7px"></span><div class="body">${esc(h)}</div></div>`).join("")}</div>` : `<p class="small muted">${esc(t("arch.nohuman"))}</p>`}</section>
    <section class="panel">${head(t("arch.cost"), t("arch.cost.sub"))}<p>${esc(a.costEstimate || "—")}</p></section>
  </div>
  <section class="panel">${head(t("arch.data"), t("arch.data.sub"))}${a.dataPlan.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("arch.source"))}</th><th>${esc(t("arch.fresh"))}</th><th>${esc(t("arch.legal"))}</th><th>${esc(t("arch.risk"))}</th><th></th></tr></thead><tbody>${a.dataPlan.map(d => `<tr><td>${esc(d.source)}</td><td class="small">${esc(d.freshness)}</td><td class="small">${esc(d.legal)}</td><td class="small">${esc(d.risk)}</td><td>${researchBtn(d.source + " — " + t("arch.legal"))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">—</p>`}</section>
  <section class="panel">${head(t("arch.mock"), t("arch.mock.sub"), aiBtn("mockup", a.mockupHtml ? t("btn.redo") : t("arch.mockgen"), "M", {key:"mockup"}))}${busyHTML("mockup")}${a.mockupHtml ? `<iframe class="mock" sandbox="" title="${esc(t("arch.mock"))}" data-srcdoc="${esc(a.mockupHtml)}"></iframe><p class="hint">${esc(a.mockupCaption)} · ${esc(t("arch.mockhint"))}</p>` : `<p class="small muted">${esc(t("arch.mockempty"))}</p>`}</section>
  ${earlyCheckPanel(p, "arch")}` : ""}`;
}

/* ===================== PHASE: BUILD ===================== */
function sectionCard(p, s, lint){
  const ed = UI.expanded.has("ed-" + s.id);
  const own = lint.filter(l => l.sec === s.id);
  const mirror = p.showMirror && s.mirror;
  return `<div class="pkg-sec" id="sec-${s.id}">
    <div class="pkg-h"><span class="dest">${esc(L(DEST[s.dest]))}</span><span class="t">${esc(s.title)}${s.filename ? ` <span class="mono muted">${esc(s.filename)}</span>` : ""}${s.cadence ? " " + chip(s.cadence, "acc") : ""}</span>
      ${s.reqIds.map(r => chip(r)).join("")}${own.length ? chip(t("lint.n", {n: own.length}), own.some(l => l.sev === "error") ? "crit" : "warn") : chip(t("lint.clean"), "ok")}
      ${isFlagged(p, "section:" + s.id) ? `<span class="chip st-warn">${esc(t("ist.warn"))}</span>` : ""}${inspBtn("section:" + s.id, s.title)}${noteMark("section", s.id, s.title)}${ibtn("sec-edit", ed ? "check" : "edit", ed ? t("btn.done") : t("btn.edit"),`data-id="${s.id}"`)}${ibtn("sec-pattern","star",t("lib.saveas"),`data-id="${s.id}"`)}</div>
    <div class="row" style="padding:6px 14px 0">${itemTools("section:" + s.id, {edit: false})}</div><div style="padding:0 14px">${itemBox("section:" + s.id)}</div>
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
      ${p.pkg.kp && p.pkg.kp < kpStamp() ? `<div class="panel" style="border-color:var(--warn)">${esc(t("build.oldkp", {d: p.pkg.kp}))}</div>` : ""}
      ${arr(p.pkg.rationale).length ? `<div class="panel flat"><h4>${esc(t("build.rationale"))}</h4><ul class="small" style="margin:0;padding-left:18px">${p.pkg.rationale.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>` : ""}
      <div class="nocopy small">${ic("lock")}${esc(t("build.nocopy"))}</div>
      <div class="row"><span style="flex:1"></span>${LANG !== "en" ? `<label class="chk small"><input type="checkbox" data-bind="p:showMirror" ${p.showMirror ? "checked" : ""}>${esc(t("build.showmirror"))}</label>${aiBtn("mirror", secs.some(s => s.mirror && s.mirrorLang === LANG) ? t("build.remirror") : t("build.domirror"), "M", {key:"mirror"})}` : ""}</div>
      ${busyHTML("mirror")}
      ${secs.map(s => sectionCard(p, s, lint)).join("")}
      <form class="row" data-form="save-version"><input type="text" id="ver-reason" placeholder="${esc(t("ver.reasonph"))}" style="flex:1;min-width:200px"><button class="btn" type="submit">${ic("flag")}${esc(t("ver.save"))}</button></form>`
      : empty(t("build.empty"), aiBtn("compile", t("build.compile"), "H", {primary:true, key:"compile"}));
  } else if (UI.buildTab === "lint"){
    body = lint.length ? `<div class="list">${lint.map(l => { const r = kpRules().find(x => x.id === l.rule); const s = secs.find(x => x.id === l.sec); return `<div class="item ${l.sev === "error" ? "sev-crit" : l.sev === "warn" ? "sev-high" : "sev-low"}"><div class="body"><span class="title">${esc(t(l.key, {d: l.detail || ""}))}</span><span class="meta">${s ? `<button class="chip tap" data-a="goto-sec" data-id="${s.id}">${esc(s.title)}</button>` : ""}${r ? `<span>${esc(t("lint.rule"))}: ${esc(L(r))}</span>` : ""}</span></div>${chip(t("lsev." + l.sev), l.sev === "error" ? "crit" : l.sev === "warn" ? "warn" : "")}</div>`; }).join("")}</div><p class="hint">${esc(t("lint.hint"))}</p>` : empty(t("lint.none"));
  } else {
    body = p.versions.length ? `<div class="list">${p.versions.map(v => `<div class="item"><span class="mono" style="color:var(--accent)">${esc(t("draft.short", {n: v.no}))}</span><div class="body"><span class="title">${esc(v.reason)}</span><span class="meta">${esc(fmtDate(v.at))}${v.passRate != null ? chip(t("test.passrate") + " " + v.passRate + "%", v.passRate >= 80 ? "ok" : "warn") : ""}${p.releases.filter(r => r.draft === v.no).map(r => chip("v" + r.v, "ok")).join("")}</span></div><div class="acts">${v.no !== p.versionNo ? btn("ver-diff", t("ver.compare"), {cls:"sm", attrs:`data-no="${v.no}"`}) + btn("ver-restore", t("ver.restore"), {cls:"sm", attrs:`data-no="${v.no}"`}) : chip(t("ver.current"), "ok")}</div></div>`).join("")}</div>` : empty(t("ver.empty"));
  }
  return `${exRunPanel(p)}${rawBriefPanel(p)}
  <section class="panel">
    ${head(t("build.title") + (p.versionNo ? " · " + t("draft.n", {n: p.versionNo}) : ""), t("build.sub"), `<div class="row"><label class="fld" style="min-width:210px"><span>${esc(t("build.target"))} · ${esc(t("eng.dial.setting"))}</span>${autoSelect("dial-set", "setting", eng(p).dials.setting.auto, eng(p).dials.setting.val, SETTINGS_LADDER.map(s => [s.id, s.short + " · " + s.effort]))}</label>${modelChip("build")}${secs.length ? aiBtn("compile", t("build.recompile"), "H", {key:"compile"}) : ""}</div>`)}
    <p class="hint">${esc(t("build.targethint"))}</p>
    ${busyHTML("compile")}
    <div class="tabs" role="tablist">${tabs}</div>
    ${body}
  </section>
`;
}

/* ===================== PHASE: REVIEW ===================== */
const FTABS = [["open",["open"]],["waiting",["waiting"]],["signoff",["signoff"]],["done",["done"]],["accepted",["accepted"]]];
function findingPrimary(p, f){
  if (!f) return "";
  if (f.status === "open") return `${f.section ? aiBtn("finding-fix", t("rev.fixauto"), "M", {attrs:`data-id="${f.id}"`, key:"fix"}) : aiBtn("finding-fix", t("rev.fixauto"), "M", {attrs:`data-id="${f.id}"`, key:"item-" + findingRef(p, f)})}${btn("item-tool", t("rev.fixtogether"), {cls:"sm", attrs:`data-ref="${esc(f.section ? "section:" + f.section : findingRef(p, f))}" data-k="fix" data-text="${esc(trunc(f.issue + " — " + f.fix, 400))}"`})}${btn("finding-accept", t("rev.acceptrisk"), {cls:"sm ghost", attrs:`data-id="${f.id}"`})}`;
  if (f.status === "waiting") return aiBtn("finding-confirm", t("rev.confirmnow"), "L", {attrs:`data-id="${f.id}"`, key:"confirm"});
  if (f.status === "signoff") return `${btn("finding-signoff", t("rev.signoff"), {icon:"check", cls:"sm primary", attrs:`data-id="${f.id}"`})}${btn("finding-reopen", t("rev.reopen"), {cls:"sm ghost", attrs:`data-id="${f.id}"`})}`;
  if (f.status === "accepted") return `${btn("finding-accept", t("acc.again"), {cls:"sm", attrs:`data-id="${f.id}"`})}${btn("finding-reopen", t("rev.reopen"), {cls:"sm ghost", attrs:`data-id="${f.id}"`})}`;
  if (f.status === "done") return btn("finding-reopen", t("rev.reopen"), {cls:"sm ghost", attrs:`data-id="${f.id}"`});
  return "";
}
function findingCard(p, f){
  const lens = LENSES.find(l => l.id === f.lens), open = UI.expanded.has("f-" + f.id);
  const ex = f.explain;
  return `<div class="item sev-${f.severity === "critical" ? "crit" : f.severity === "high" ? "high" : f.severity === "medium" ? "med" : "low"}" ${p.focus.id === "finding:" + f.id ? "data-focus" : ""} id="ir-finding:${esc(f.id)}">
    <div class="body"><div class="row">${sevChip(f.severity)}${chip(lens ? L(lens) : f.stage === "early" ? t("chk.label", {s: phName(f.step || "require")}) : f.stage === "trace" ? t("tr.label") : t("rev.feedback"))}${f.section ? `<button class="chip tap" data-a="goto-sec" data-id="${esc(f.section)}">${esc(f.section)}</button>` : f.item ? chip(f.item) : ""}${chip(t("fst." + f.status), f.status === "done" ? "ok" : f.status === "open" ? "crit" : f.status === "accepted" ? "" : "warn")}${f.reopened ? chip(t("rev.reopenedn", {n: f.reopened}), f.reopened > 1 ? "crit" : "warn") : ""}</div>
      <span class="title">${esc(f.issue)}</span>${f.where && f.where !== f.item ? `<span class="small mono muted">“${esc(trunc(f.where, 160))}”</span>` : ""}<span class="small"><b>${esc(t("rev.fix"))}:</b> ${esc(f.fix)}</span>
      ${f.status === "signoff" ? `<div class="so4 small"><div><b>${esc(t("so.goal"))}</b> ${esc(trunc(f.issue, 140))}</div><div><b>${esc(t("so.change"))}</b> ${esc(trunc(f.fix, 140))}</div><div><b>${esc(t("so.risk"))}</b> ${esc(t("sev." + f.severity))} · ${esc(lens ? L(lens) : "")}</div><div><b>${esc(t("so.undo"))}</b> ${esc(t("so.undo.x"))}</div></div>` : ""}
      ${f.status === "accepted" ? `<span class="small"><b>${esc(t("acc.reason"))}:</b> ${esc(f.reason || "")} · ${esc(t("acc.until", {d: fmtDay(f.recheck)}))}</span>` : ""}
      ${ex ? `<div class="explain"><p>${esc(ex.meaning)}</p><p class="small muted">${esc(ex.why)}</p><p class="small"><b>${esc(t("rev.rec"))}:</b> ${esc(t("rev.choice." + ex.recommend))} — ${esc(ex.reason)}</p></div>` : f.status === "open" ? aiBtn("finding-explain", t("rev.explain"), "L", {attrs:`data-id="${f.id}"`, key:"explain-" + f.id}) : ""}
      ${busyHTML("explain-" + f.id)}
      <div class="row">${findingPrimary(p, f)}${btn("toggle-exp", open ? t("rev.hideaudit") : t("rev.audit"), {cls:"sm ghost", attrs:`data-k="f-${f.id}"`})}</div>
      ${open ? `<div class="audit">${arr(f.audit).map(a => `<div class="small"><span class="mono muted">${esc(fmtDate(a.at))}</span> · <b>${esc(a.by)}</b> · ${esc(a.what)}</div>`).join("")}${f.before ? `<details><summary class="small">${esc(t("rev.beforeafter"))}</summary><div class="diff">${lineDiff(f.before, f.after).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div></details>` : ""}</div>` : ""}
      ${itemBox(f.section ? "section:" + f.section : findingRef(p, f))}</div>
    <div class="acts" style="flex-direction:column">${inspBtn("finding:" + f.id)}${noteMark("finding", f.id, f.issue)}</div></div>`;
}
function phReview(p){
  const tab = UI.revTab || "open";
  const sts = (FTABS.find(x => x[0] === tab) || FTABS[0])[1];
  const order = {critical:0, high:1, medium:2, low:3};
  const fs = p.findings.filter(f => sts.includes(f.status)).sort((a,b) => order[a.severity] - order[b.severity]);
  const lensRow = LENSES.map(l => `<label class="chip tap ${UI.lensSel.has(l.id) ? "sel" : ""}"><input type="checkbox" data-a-change="lens" data-id="${l.id}" ${UI.lensSel.has(l.id) ? "checked" : ""} style="display:none">${esc(L(l))}${p.reviewVerdicts[l.id] ? " ✓" : ""}</label>`).join("");
  const n = st => p.findings.filter(f => f.status === st).length;
  const open = n("open");
  const tabs = FTABS.map(([k]) => `<button class="tab ${tab === k ? "on" : ""}" data-a="tab" data-t="revTab" data-v="${k}">${esc(t("rtab." + k))} · ${n(k)}</button>`).join("");
  const verdicts = Object.keys(p.reviewVerdicts).filter(k => p.reviewVerdicts[k]).map(k => { const l = LENSES.find(x => x.id === k); return `<div class="item"><div class="body"><span class="small muted">${esc(l ? L(l) : k)}</span><span class="small">${esc(p.reviewVerdicts[k])}</span></div></div>`; }).join("");
  return `
  <section class="panel">
    ${head(t("rev.title"), t("rev.sub"), modelChip("review"))}
    <div class="row">${lensRow}</div>
    <div class="row">${aiBtn("review", p.seal.review ? t("rev.rerun") : t("rev.run", {n: UI.lensSel.size}), "H", {primary: !p.seal.review, key:"review"})}<span class="hint">${esc(p.seal.review ? t("rev.rerunhint") : t("rev.indep"))}</span></div>
    ${busyHTML("review")}
    ${p.seal.review && p.seal.review !== p.versionNo ? `<div class="banner warnb">${ic("shield")}<span style="flex:1">${esc(t("seal.broken", {v: p.seal.review, c: p.versionNo}))}</span>${aiBtn("seal-recheck", t("seal.recheck"), "H", {key:"review"})}</div>` : p.seal.review ? `<div class="hint">${ic("shield")} ${esc(t("seal.ok", {v: p.versionNo}))}</div>` : ""}
  </section>
  <section class="panel">
    ${head(t("rev.problems"), t("rev.problems.sub"), `<div class="row">${open ? btn("walk", t("rev.walk"), {cls:"sm"}) : ""}${open ? aiBtn("fix-all-findings", t("rev.fixall", {n: open}), "H", {primary:true, key:"fix"}) : ""}</div>`)}
    <div class="tabs" role="tablist">${tabs}</div>
    ${busyHTML("fix")}${busyHTML("confirm")}
    ${tab === "signoff" && fs.length ? `<div class="row">${["critical","high","medium","low"].filter(s => fs.some(f => f.severity === s)).map(s => btn("signoff-batch", t("so.batchbtn", {n: fs.filter(f => f.severity === s).length, s: t("sev." + s)}), {icon: "check", cls: "sm", attrs: `data-sev="${s}"`})).join("")}<span class="hint">${esc(t("so.hint"))}</span></div>` : ""}
    ${fs.length ? `<div class="list">${fs.map(f => findingCard(p, f)).join("")}</div>` : empty(tab === "open" ? (p.seal.review ? t("rev.clean") : t("rev.empty")) : t("rev.tabempty"))}
  </section>
  ${verdicts ? `<section class="panel">${head(t("rev.verdicts"))}<div class="list">${verdicts}</div></section>` : ""}`;
}
function earlyCheckPanel(p, step){
  const ec = (p.earlyChecks || {})[step], fs = p.findings.filter(f => f.stage === "early" && f.step === step && OPEN_F.includes(f.status));
  return `<section class="panel" id="chk-${step}">${head(t("chk.title", {s: phName(step)}), t("chk.sub"), aiBtn("early-check", ec ? t("btn.redo") : t("chk.run"), "M", {primary: !ec, attrs:`data-v="${step}"`, key:"check-" + step}))}${busyHTML("check-" + step)}
    ${ec ? `<p class="small muted">${esc(fmtDate(ec.at))} · ${esc(ec.verdict || "")}</p>` : ""}${fs.length ? `<div class="list">${fs.map(f => findingCard(p, f)).join("")}</div>` : ec ? `<p class="small" style="color:var(--ok)">${esc(t("chk.clean"))}</p>` : ""}</section>`;
}

/* ===================== PHASE: TEST ===================== */
function phTest(p){
  const tabs = ["cases","runs","improve","judge"].map(x => `<button class="tab ${UI.testTab === x ? "on" : ""}" data-a="tab" data-t="testTab" data-v="${x}">${esc(t("test.tab." + x))}${x === "cases" ? " · " + p.tests.length : x === "runs" ? " · " + p.runs.filter(r => r.label !== "candidate").length : ""}</button>`).join("");
  let body = "";
  const cats = ["normal","edge","adversarial","empty","language"];
  if (UI.testTab === "cases"){
    body = `<div class="row">${aiBtn("gen-tests", p.tests.length ? t("test.more") : t("test.gen"), "M", {primary: !p.tests.length, key:"tests"})}${btn("add-test", t("test.add"), {icon:"plus", cls:"sm"})}<span class="hint" style="flex:1">${esc(t("test.heldhint"))}</span></div>${busyHTML("tests")}
    ${p.tests.length ? `<div class="list">${newFirst(p, "test", p.tests).map(x => { const open = UI.expanded.has("t-" + x.id); const res = testResult(p, x.id); return `<div class="item" id="tc-${esc(x.id)}">${stSlot(res === "pass" ? "ok" : res === "fail" ? "bad" : isFlagged(p, "test:" + x.id) ? "warn" : "todo")}<span class="mono" style="color:var(--accent);min-width:28px">${esc(x.id)}</span><div class="body"><div class="row"><span class="title" style="flex:1">${esc(x.title || trunc(x.input, 80))}</span>${chip(t("tcat." + x.category))}${x.heldOut ? chip(t("test.heldout"), "warn") : ""}${x.reqIds.map(r => chip(r)).join("")}${arr(x.critIds).map(c => chip(c, "acc")).join("")}${x.fromFeedback ? chip(t("test.fromfb"), "acc") : ""}${x.fromEx ? `<button class="chip tap acc" data-a="insp-open" data-ref="ex:${esc(x.fromEx)}">${esc((x.variant ? t("test.variantof") : t("test.fromex")) + " " + x.fromEx)}</button>` : ""}${x.never ? chip(t("ex.never"), "warn") : ""}${markChip(p, "test:" + x.id)}</div>
      ${open ? `<label class="fld"><span>${esc(t("lib.ptitle"))}</span>${bindInput("p:tests.#" + x.id + ".title", x.title)}</label><div class="grid2"><label class="fld"><span>${esc(t("test.input"))}</span>${bindArea("p:tests.#" + x.id + ".input", x.input, {rows:4})}</label><label class="fld"><span>${esc(t("test.sim"))}</span>${bindArea("p:tests.#" + x.id + ".simulated", x.simulated, {rows:4})}</label></div><label class="fld"><span>${esc(t("test.criteria"))}</span><textarea rows="3" data-lines-test="${x.id}" id="crit-${x.id}">${esc(x.criteria.join("\n"))}</textarea></label><div class="row">${bindSelect("p:tests.#" + x.id + ".category", x.category, cats.map(c => [c, t("tcat." + c)]))}<label class="chk small"><input type="checkbox" data-bind="p:tests.#${x.id}.heldOut" ${x.heldOut ? "checked" : ""}>${esc(t("test.heldout"))}</label><label class="fld" style="flex:1"><span>${esc(t("test.reqs"))}</span><input type="text" data-reqids="${x.id}" value="${esc(x.reqIds.join(", "))}" id="rq-${x.id}"></label></div>` : `<span class="small muted">${esc(trunc(x.input, 200))}</span><span class="small">${x.criteria.map(c => "✓ " + esc(c)).join("<br>")}</span>`}</div>
      <div class="acts" style="flex-direction:column">${inspBtn("test:" + x.id, x.id)}${ibtn("toggle-exp", open ? "check" : "edit", open ? t("btn.done") : t("btn.edit"), `data-k="t-${x.id}"`)}${noteMark("test", x.id, x.id + " " + (x.title || ""))}${ibtn("del-item","trash",t("btn.delete"),`data-list="tests" data-id="${x.id}"`)}</div></div>`; }).join("")}</div>` : empty(t("test.empty"))}`;
  } else if (UI.testTab === "runs"){
    const runs = p.runs.filter(r => r.label !== "candidate");
    body = `<div class="row"><label class="fld" style="width:auto"><span>${esc(t("test.trials"))}</span>${bindSelect("ui:trials", UI.trials || TRIALS, [[1,"1"],[3,"3"],[5,"5"]])}</label><label class="fld" style="width:auto"><span>${esc(t("test.which"))}</span>${bindSelect("ui:runWhich", UI.runWhich || "all", [["all",t("test.all")],["open",t("test.visible")],["held",t("test.held")]])}</label>${aiBtn("run-tests", t("test.run"), "H", {primary:true, key:"sim"})}<span class="hint" style="flex:1">${esc(t("test.runhint"))}</span></div>${busyHTML("sim")}${busyHTML("judge")}
      ${runs.length ? runs.map((r, ri) => `<div class="panel flat"><div class="row"><b>${esc(t("draft.short", {n: r.versionNo}))}</b><span class="small muted">${esc(fmtDate(r.at))} · ${esc(t("test.trialsn", {n: r.trials}))}</span><span style="flex:1"></span>${chip(t("test.passrate") + " " + r.passRate + "%", r.passRate >= 80 ? "ok" : r.passRate >= 50 ? "warn" : "crit")}${chip(t("test.passk", {k: r.trials}) + " " + (r.passK ?? r.consistency) + "%", (r.passK ?? r.consistency) >= 80 ? "ok" : "warn")}${r.flipRate != null ? chip(t("test.flip") + " " + r.flipRate + "%", r.flipRate ? "warn" : "ok") : ""}</div>${arr(r.flips).length ? `<p class="small" style="color:var(--warn)">${esc(t("test.flaky", {x: r.flips.join(", ")}))}</p>` : ""}
        <div class="row small">${["normal","edge","adversarial","empty","language"].filter(c => r.results.some(x => x.category === c)).map(c => { const rs = r.results.filter(x => x.category === c); const ok = rs.every(x => x.pass); return chip(t("tcat." + c) + " " + rs.filter(x => x.pass).length + "/" + rs.length, ok ? "ok" : c === "adversarial" ? "crit" : "warn"); }).join("")}${r.results.some(x => x.category === "adversarial" && !x.pass) ? `<span class="small" style="color:var(--crit)">${esc(t("test.secblock"))}</span>` : ""}</div>
        <div class="list">${r.results.map((x, xi) => { const k = "r-" + r.id + "-" + xi; const open = UI.expanded.has(k); const tc = p.tests.find(y => y.id === x.testId) || {criteria:[]}; return `<div class="item ${x.pass ? "" : "sev-crit"}"><span class="dot ${x.pass ? "ok" : "crit"}" style="margin-top:6px"></span><div class="body"><div class="row"><b class="mono">${esc(x.testId)}</b>${r.trials > 1 ? chip("#" + (x.trial + 1)) : ""}${x.heldOut ? chip(t("test.heldout"), "warn") : ""}${x.judge2 ? chip(t("judge.second") + ": " + t("verd." + x.judge2) + (x.sameFamily !== false ? " · " + t("judge.samefam") : ""), x.judge2 === ((x.judgePass ?? x.pass) ? "pass" : "fail") ? "ok" : "warn") : ""}${x.unknown ? chip(t("judge.unknown"), "warn") : ""}${x.conf != null && x.conf < 0.7 ? chip(t("judge.unsure", {n: Math.round(x.conf * 100)}), "warn") : ""}${x.userVerdict || needsYou(x) ? (verdictCtl("judge-decide", `data-run="${r.id}" data-x="${xi}"`, x.userVerdict, {good: "pass", bad: "fail", lGood: t("judge.decidepass"), lBad: t("judge.decidefail"), size: "xs"})) : ""}<span class="small muted" style="flex:1">${esc(trunc(tc.title || tc.input || "", 70))}</span>${!x.pass ? `<button class="chip tap" data-a="crit-fromfail" data-run="${r.id}" data-x="${xi}" title="${esc(t("goal.fromfail.tip"))}">${esc(t("goal.fromfail"))}</button>` : ""}</div>
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
      const lenOld = p.pkg.sections.reduce((n, s) => n + s.content.length, 0), lenNew = c.sections.reduce((n, s) => n + s.content.length, 0);
      const longer = lenOld ? Math.round((lenNew / lenOld - 1) * 100) : 0;
      cmp = `<div class="row">${chip(t("test.cand") + " " + c.passRate + "%", better ? "ok" : "crit")}${basePct != null ? chip(t("test.curr") + " " + basePct + "%") : ""}<span class="small ${better ? "" : "muted"}">${esc(better ? t("test.gatepass") : t("test.gatefail"))}</span>${longer >= 20 ? chip(t("test.longer", {n: longer}), "warn") : ""}</div>${longer >= 20 ? `<p class="small" style="color:var(--warn)">${esc(t("test.costguard"))}</p>` : ""}`;
      c.gate = better && longer < 20;
    }
    body = `<p class="lead">${esc(t("test.improve.lead"))}</p><div class="row">${aiBtn("improve", t("test.improve"), "H", {primary:true, key:"improve"})}</div>${busyHTML("improve")}${busyHTML("sim")}${busyHTML("judge")}
      ${c ? `<div class="panel" style="border-color:var(--accent)">${head(t("test.candidate"), c.summary)}${c.diagnosis.length ? `<h4>${esc(t("test.diagnosis"))}</h4><ul class="small" style="margin:0;padding-left:18px">${c.diagnosis.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}${cmp}
        ${c.sections.filter(s => { const cur = p.pkg.sections.find(x => x.id === s.id); return cur && cur.content !== s.content; }).map(s => `<h4>${esc(s.title)}</h4><div class="diff">${lineDiff(p.pkg.sections.find(x => x.id === s.id).content, s.content).map(d => d.t === "eq" ? esc(d.s) + "\n" : `<span class="${d.t}">${esc(d.s)}</span>`).join("")}</div>`).join("")}
        <div class="row end">${btn("cand-discard", t("btn.discard"), {cls:"ghost"})}${btn("cand-adopt", c.gate === false ? t("test.adoptanyway") : t("test.adopt"), {icon:"check", cls: c.gate === false ? "danger" : "primary"})}</div></div>` : ""}`;
  } else {
    let agree = 0, total = 0; for (const r of p.runs) for (const x of r.results) for (const k in x) if (k.startsWith("spot")){ total++; if (x[k] === "agree") agree++; }
    const js = judgeStats(p);
    body = `<p class="lead">${esc(t("judge.lead"))}</p><div class="grid3"><div class="panel"><span class="small muted">${esc(t("judge.agreement"))}</span><b style="font-size:28px;font-family:var(--f-display)" class="tnum">${total ? Math.round(agree/total*100) + "%" : "—"}</b><span class="small muted">${esc(t("judge.spots", {n: total}))}</span></div><div class="panel" style="grid-column:span 2"><p class="small">${esc(total < 10 ? t("judge.need") : agree/total >= .8 ? t("judge.good") : agree/total >= .7 ? t("judge.ok") : t("judge.bad"))}</p></div></div>
    <div class="panel flat stack">${head(t("judge.rel"), t("judge.rel.sub", {v: JUDGE_V}))}${js.n >= 30 ? `<div class="row">${chip(t("judge.tpr") + " " + js.tpr + "%", js.tpr >= 85 ? "ok" : "warn")}${chip(t("judge.tnr") + " " + js.tnr + "%", js.tnr >= 85 ? "ok" : "warn")}<span class="small muted">${esc(t("judge.labels", {n: js.n}))}</span></div><p class="small">${esc(js.tpr >= 85 && js.tnr >= 85 ? t("judge.relgood") : t("judge.relbad"))}</p>` : `<p class="small muted">${esc(t("judge.relneed", {n: js.n}))}</p>`}${js.versions.length > 1 ? `<p class="small" style="color:var(--warn)">${esc(t("judge.vmix", {x: js.versions.join(", ")}))}</p>` : ""}</div>`;
  }
  return `${examplesTestPanel(p)}${proTestPanel(p)}<section class="panel">${head(t("test.title"), t("test.sub"), modelChip("test"))}<div class="tabs" role="tablist">${tabs}</div>${body}</section>
`;
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
/* ===================== PROJECT LOG ===================== */
function phLog(p){
  const tabs = ["activity","decisions","open","foresight","research"].map(x => `<button class="tab ${UI.logTab === x ? "on" : ""}" data-a="tab" data-t="logTab" data-v="${x}">${esc(t("log.tab." + x))}</button>`).join("");
  let body = "";
  if (UI.logTab === "activity"){
    const q = (UI.actQ || "").toLowerCase(), f = UI.actF || "all";
    const acts = arr(p.activity).slice().reverse().filter(a => (f === "all" || (f === "important" ? a.important : a.step === f)) && (!q || a.text.toLowerCase().includes(q)));
    const groups = []; for (const a of acts){ const k = a.at.slice(0, 10) + "|" + (a.step || ""); let g = groups.find(x => x.k === k); if (!g){ g = {k, day: a.at, step: a.step, items: []}; groups.push(g); } g.items.push(a); }
    body = `<div class="row"><input type="search" id="act-q" placeholder="${esc(t("log.search"))}" value="${esc(UI.actQ || "")}" data-bind="ui:actQ" data-rerender="1" style="flex:1;min-width:180px">${bindSelect("ui:actF", f, [["all", t("log.all")], ["important", t("log.important")], ...PHASE_IDS.map(x => [x, phName(x)])])}</div>
      ${groups.length ? groups.map(g => `<div class="stack" style="gap:4px"><h4>${esc(fmtDay(g.day))} · ${esc(g.step ? phName(g.step) : "—")}</h4><div class="list">${g.items.map(a => `<div class="item ${a.important ? "imp" : ""}"><span class="mono small muted" style="min-width:44px">${esc(new Date(a.at).toTimeString().slice(0, 5))}</span><div class="body"><span class="small">${esc(a.text)}</span></div></div>`).join("")}</div></div>`).join("") : empty(t("log.noact"))}`;
  } else if (UI.logTab === "decisions"){
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
