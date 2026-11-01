/* ===================== 1.9 the 4×4 interview before a big or risky change to a live tool; "What changed" per version (PLAN-1.9 D, PLAN-1.8 video round 9, 10) =====================
   1. Where a change to a live tool starts in 1.8, PT first runs the risk check (code, no AI):
        - an update prepared from the inbox (aiPrepareUpdate): reports the owner included, "Tell PT what's wrong", and learn-from-use
          plans PT prepares by itself (lfu18Check) all start here;
        - a changed mind on a live tool (aiImpact, "change my mind");
        - a new version of a live tool published from changed decisions (doRelease of an update).
      Risky or big = the tool acts outward, is shared or for customers, or involves money; the change touches the shape or the storage
      of data; or more than IV19_ROWS decision rows changed since the live version. Never for a small change (one fix, no data, few
      rows) and never for a change that is private-only and small. Nothing here asks an AI.
   2. Then the change waits for the interview: up to 16 questions in four areas (product, design, practical, edge cases), made by ONE
      AI call when the owner starts it, shown one area at a time. Each area can be skipped. Every answer is a decision row asserted by
      the owner (ROW_SOURCES, so the 1.8 rows write the events); a skipped area — or questions left empty — is a residual-risk row. When
      the interview is done or skipped the change goes on: a prepared update is prepared, a changed mind is worked out, a new version can
      be published with one tap. The answers reach the AI steps of that change (<interview_answers>, the owner's words as data).
      One interview per live version: the next change after the new version is live is checked again.
   3. What changed: in a tool's Versions view (the Release step on the Run page), each published version lists the decision rows that
      changed since the version before, from the 1.8 events, in plain words; changes not yet published are listed on top. */
const IV19_AREAS = ["product", "design", "practical", "edge"], IV19_ID = {product: "p", design: "d", practical: "r", edge: "e"}, IV19_ROWS = 3, IV19_PER = 4;
/* a change that touches the shape or the storage of data (English, German, Chinese) */
const IV19_DATA = /\b(?:data(?:\s|-)?(?:shape|model|structure|format|schema|layout)|schemas?|fields?|columns?|storage|database|migrat\w*|stored (?:data|records|items|entries)|(?:store|stores|keep|keeps|save|saves) (?:the |its |their |more |new |every |each |all )?(?:data|records|history|entries)|record (?:format|shape))\b|daten(?:struktur|format|modell|bank)|\bfeld(?:er)?\b|\bspalten?\b|\bspeicher\w*|\bmigration|字段|存储|数据库|数据结构|数据格式|迁移/i;
const IV19 = {busy: new Set()};

/* ---------- the record on the project (p.iv19; part of Undo, survives reload) ---------- */
function iv19Read(p){ return p && p.iv19 && Array.isArray(p.iv19.list) ? p.iv19 : {list: []}; }
function iv19Of(p){ if (!p.iv19 || !Array.isArray(p.iv19.list)) p.iv19 = {list: []}; return p.iv19; }   // ok:field  iv19 is new in 1.9, made on first use (older projects have none); in Undo and saved with the project
function iv19Get(p, id){ return iv19Read(p).list.find(x => x && x.id === id) || null; }
function iv19LiveV(p){ return p && p.live ? str(p.live.v) : ""; }
/** the interview of the change to the version that is live now */
function iv19Cur(p){ const v = iv19LiveV(p); if (!v) return null; return iv19Read(p).list.filter(x => x && x.live === v).slice(-1)[0] || null; }
function iv19Settled(p){ const iv = iv19Cur(p); return !!iv && (iv.state === "done" || iv.state === "skipped"); }
function iv19Waiting(p){ const iv = iv19Cur(p); return iv && iv.state === "wait" ? iv : null; }
function iv19All(){ return run18Projects().map(p => ({p, iv: iv19Waiting(p)})).filter(x => x.iv); }

/* ---------- 1. the risk check (code) ---------- */
/** decision rows changed since the live version (from the events; the interview's own rows never count) */
function iv19RowsSince(p){
  const L = ROWS.L[p.id], since = p.live ? str(p.live.since) : ""; if (!L || !L.ready || !since) return [];
  const s = new Set(); for (const e of L.list) if (["taken", "changed", "undone"].includes(e.type) && str(e.at) > since && e.src && !str(e.src).startsWith("iv19:")) s.add(str(e.src));
  return [...s];
}
async function iv19Risk(p, {text = "", n = 1, fixOnly = false} = {}){
  const why = [], s = run18Quiet(() => chkSignals(p));
  if (s.out) why.push("out");
  if (s.shared) why.push("shared");
  if (s.money) why.push("money");
  try{ await rowsEnsure(p); }catch(e){ onAppError(e && e.message, "iv19:rows"); }
  const changed = iv19RowsSince(p), data = IV19_DATA.test(str(text)) || changed.some(x => /^kit:(storage|record|backend)/.test(x));
  if (data) why.push("data");
  if (changed.length > IV19_ROWS) why.push("rows");
  const small = n <= 1 && (fixOnly || n === 0) && !data && changed.length <= IV19_ROWS;   // one fix, or nothing recorded as changed
  return {need: why.length > 0 && !small, why, rows: changed.length, small};
}
/** the change waits for the interview when the risk check says so; returns true while it waits */
async function iv19Gate(p, c){
  if (!p || !p.live || !rowsOn() || iv19Settled(p)) return false;
  const r = await iv19Risk(p, c); if (!r.need) return false;
  const q = WS.projects.find(x => x.id === p.id); if (!q || !q.live) return false;
  let iv = iv19Waiting(q);
  actOpen(q, t("iv.act.wait"), {by: "pt"});
  if (iv){ iv.why = [...new Set(arr(iv.why).concat(r.why))]; iv.items = [...new Set(arr(iv.items).concat(arr(c.items)))]; if (c.wish) iv.wish = str(c.wish); if (c.from !== "prepare" || !iv.from) iv.from = c.from; }
  else {
    iv = {id: uid("iv"), live: iv19LiveV(q), from: c.from, why: r.why, rows: r.rows, items: arr(c.items), wish: str(c.wish || ""), lfu: !!c.lfu, at: now(), state: "wait", qs: null, ans: {}, areas: {}};
    const o = iv19Of(q); o.list.push(iv); if (o.list.length > 20) o.list.splice(0, o.list.length - 20);
  }
  touch(q); actCloseSoon(q.id);
  if (c.open){ UI.modal = {kind: "iv19", pid: q.id, iv: iv.id}; }
  render();
  toast(t("iv.waits", {x: q.name}), "");
  return true;
}
/* an update prepared from the inbox (also learn-from-use and "Tell PT what's wrong"): it reads its list of items right away, so the
   list is put back exactly as it was when the check began (learn-from-use changes it for a moment) */
{ const orig = aiPrepareUpdate; aiPrepareUpdate = async function(p){
    const inc = p ? arr(p.inbox).filter(i => i && i.on && !i.done) : [];
    if (!p || !p.live || !inc.length || iv19Settled(p) || !rowsOn()) return orig.apply(this, arguments);
    const snap = arr(p.inbox).map(i => [i, i.on]), lfu = !!RUN18.lfuBusy;
    // how many changes: each report one; run records of the same failure are one change together (learn-from-use groups them)
    const n = inc.filter(i => i.src !== "run").length + new Set(inc.filter(i => i.src === "run").map(i => rowNorm(ib18Text(i)).slice(0, 80))).size;
    let wait = false;
    try{ wait = await iv19Gate(p, {from: "prepare", items: inc.map(i => i.id), lfu, open: !lfu, text: inc.map(ib18Text).join("\n"), n, fixOnly: inc.every(i => ib18Kind(i) === "bug" || ib18Kind(i) === "error")}); }
    catch(e){ onAppError(e && e.message, "iv19:prepare"); }
    if (wait) return;
    const cur = arr(p.inbox).map(i => [i, i.on]);
    for (const [i, on] of snap) i.on = on;
    const run = orig.call(this, p);
    for (const [i, on] of cur) i.on = on;
    return run; }; }
/* a changed mind on a live tool */
{ const orig = aiImpact; aiImpact = async function(p, wish, o = {}){
    if (!p || !p.live || (o && o.verify) || iv19Settled(p) || !rowsOn()) return orig.apply(this, arguments);
    let wait = false;
    try{ wait = await iv19Gate(p, {from: "impact", wish: str(wish), open: true, text: str(wish), n: 2, fixOnly: false}); }catch(e){ onAppError(e && e.message, "iv19:impact"); }
    return wait ? null : orig.apply(this, arguments); }; }
/* a new version of a live tool (from changed decisions or a prepared update) */
{ const orig = doRelease; doRelease = async function(p){
    if (!p || !p.live || iv19Settled(p) || !rowsOn() || releaseGate(p).length) return orig.apply(this, arguments);
    const ch = arr(p.plan && p.plan.state !== "deployed" && p.plan.state !== "released" ? p.plan.changes : []);
    let wait = false;
    try{ wait = await iv19Gate(p, {from: "release", open: true, text: ch.map(c => str(c.x)).join("\n"), n: ch.length, fixOnly: ch.length > 0 && ch.every(c => c.k === "fix")}); }catch(e){ onAppError(e && e.message, "iv19:release"); }
    return wait ? undefined : orig.apply(this, arguments); }; }

/* ---------- 2. the questions: one AI call, four areas ---------- */
function iv19ChangeText(p, iv){
  if (iv.from === "impact") return str(iv.wish);
  if (iv.from === "release"){ const ch = arr(p.plan && p.plan.changes); return ch.length ? ch.map(c => "- " + str(c.x)).join("\n") : t("iv.change.rows", {n: iv19RowsSince(p).length}); }
  const want = new Set(arr(iv.items));
  return arr(p.inbox).filter(i => i && want.has(i.id)).map(i => "- " + ib18Text(i).slice(0, 1500)).join("\n");   // ok:cut  each report as the update plan reads it
}
const IV19_WHY_EN = {out: "it acts outward (sends, posts, publishes, pays or orders)", shared: "other people or customers use it", money: "it involves money", data: "the change touches the shape or the storage of data", rows: "several earlier decisions change"};
function iv19Clean(o){
  const qs = {}; let n = 0;
  for (const a of IV19_AREAS){
    qs[a] = arr(o && o.areas && o.areas[a]).filter(x => x && str(x.q).trim()).slice(0, IV19_PER)
      .map((x, i) => ({id: IV19_ID[a] + (i + 1), q: rowCut(str(x.q).trim(), 300), why: rowCut(str(x.why).trim(), 200), options: arr(x.options).map(y => rowCut(str(y).trim(), 120)).filter(Boolean).slice(0, 4)}));
    n += qs[a].length;
  }
  return n ? qs : null;
}
async function iv19Make(p0, id){
  const iv0 = iv19Get(p0, id); if (!iv0 || iv0.state !== "wait" || IV19.busy.has(id)) return false;
  const ws0 = WS.id, pid = p0.id;
  IV19.busy.add(id); render();
  try{
    const prompt = buildPrompt("iv19", {proj: p0, rules: ["simple"], context: projectContext(p0),
      body: `The tool is live as v${iv0.live}. A change to it is about to start, and the risk check found it big or risky: ${arr(iv0.why).map(w => IV19_WHY_EN[w] || w).join("; ")}.
Before anything is prepared, the person answers a short interview, so the change is built on their answers. The change:
${untrusted("change", iv19ChangeText(p0, iv0))}
Write the interview in four areas, at most four questions each, the most important first:
- product: what the change is for, who it serves, what must stay exactly as it is, how the person will know it worked;
- design: how it looks and reads for the people who use it, what they see first, what changes for them;
- practical: the data and where it is kept, cost, time, who does what, how the change goes live and how it is undone;
- edge: what can go wrong (wrong, missing or hostile input, many uses at once, acting outward by mistake, running over budget).
For each question: "q", one short question in plain words without jargon; "why", one short line on what the answer decides; "options", two to four short typical answers, or [] when only the person's own words fit. Ask only what the person can answer and what changes the work; never ask what the project above already settles. Fewer than four in an area is fine; never pad an area.`,
      schema: `{"areas":{"product":[{"q":"…","why":"…","options":["…","…"]}],"design":[],"practical":[],"edge":[]}}`});
    const r = await runAI("iv19", t("iv.making"), prompt, {pid, step: "update", validate: o => !!iv19Clean(o)});
    const p = WS.id === ws0 ? WS.projects.find(x => x.id === pid) : null, iv = p && iv19Get(p, id);
    if (!p || !iv || iv.state !== "wait") return false;
    actOpen(p, t("iv.act.qs"), {by: "pt"});
    const qs = r ? iv19Clean(r) : null;
    if (qs){ iv.qs = qs; iv.made = now(); iv.err = ""; for (const a of IV19_AREAS) if (!qs[a].length) iv.areas = Object.assign({}, iv.areas, {[a]: {st: "none", at: now()}}); iv.area = iv19NextArea(iv); }
    else iv.err = now();
    touch(p); actCloseSoon(p.id);
    return !!qs;
  }finally{ IV19.busy.delete(id); render(); }
}
function iv19NextArea(iv){ return IV19_AREAS.find(a => !(iv.areas || {})[a] && arr(iv.qs && iv.qs[a]).length) || ""; }
/** after an area: the next one, or the end (done; skipped when nothing was answered) */
function iv19Step(p, iv){
  iv.area = iv19NextArea(iv);
  if (iv.area) return false;
  iv.state = Object.keys(iv.ans || {}).length ? "done" : "skipped"; iv.doneAt = now();
  return true;
}
function iv19SkipArea(p, iv, a){ iv.areas = Object.assign({}, iv.areas, {[a]: {st: "skip", at: now()}}); }
/** the change goes on: a prepared update is prepared, a changed mind worked out; a new version waits for one tap */
async function iv19Continue(pid, id){
  const p = WS.projects.find(x => x.id === pid), iv = p && iv19Get(p, id); if (!iv || !iv19Settled(p)) return;
  if (iv.from === "prepare"){
    const want = new Set(arr(iv.items)), before = arr(p.inbox).map(i => [i, i.on]);
    if (iv.lfu) for (const i of arr(p.inbox)) i.on = want.has(i.id) && !i.done;
    else for (const i of arr(p.inbox)) if (want.has(i.id) && !i.done) i.on = true;
    const run = aiPrepareUpdate(p);   // it takes its list of items right away
    if (iv.lfu) for (const [i, on] of before) if (!want.has(i.id)) i.on = on;
    await run;
    const q = WS.projects.find(x => x.id === pid);
    if (q && iv.lfu && q.plan && q.plan.state === "checking" && !q.plan.by){ q.plan.by = "pt"; q.plan.lfu = arr(q.plan.changes).length; touch(q); }   // a learn-from-use change stays PT's prepared change
  } else if (iv.from === "impact" && iv.wish){
    const r = await aiImpact(p, iv.wish); if (!r) return;
    UI.review = Object.assign(r, {mode: "impact", wish: iv.wish, pid}); UI.modal = {kind: "review", wide: true};
  }
  render();
}

/* ---------- 3. answers and skipped areas are decision rows (asserted by the owner) ---------- */
ROW_SOURCES.push(function iv19Rows(p, add){
  for (const iv of iv19Read(p).list){
    if (!iv || !iv.id) continue;
    for (const a of IV19_AREAS){
      const qs = arr(iv.qs && iv.qs[a]), st = (iv.areas || {})[a], area = t("iv.a." + a);
      for (const q of qs){ const x = (iv.ans || {})[q.id]; if (!x) continue;
        add({src: "iv19:" + iv.id + ":" + q.id, ref: "", branch: "U", stage: 10, question: q.q, options: arr(q.options).map(o => ({label: o, why: ""})), star: null, why: t("iv.row.why", {x: area, v: iv.live}),
          decided: true, val: str(x.a), chosen: str(x.a), by: "owner", at: str(x.at)}); }
      const skip = !!st && st.st === "skip", left = st && st.st === "done" ? arr(st.open) : [];
      if (skip || left.length){   // a skipped area, or questions left empty: the residual risk is written down
        const n = skip ? qs.length : left.length;
        add({src: "iv19:" + iv.id + ":risk:" + a, ref: "", branch: "U", stage: 10, base: "notify", question: t("iv.risk.q", {x: area, v: iv.live}), options: [], star: null,
          why: qs.filter(q => skip || left.includes(q.id)).map(q => q.q).join(" · "),
          decided: true, val: skip ? "skipped" : "open", chosen: skip ? (n ? t("iv.risk.skip", {n}) : t("iv.risk.skip0")) : t("iv.risk.open", {n}), by: "owner", at: str(st.at || iv.doneAt)});
      }
    }
  }
});
/* the answers reach the AI steps of the change (the owner's own words, as data) */
function iv19ContextBlock(p){
  const iv = iv19Cur(p); if (!iv || iv.state !== "done") return "";
  const out = [];
  for (const a of IV19_AREAS) for (const q of arr(iv.qs && iv.qs[a])){ const x = (iv.ans || {})[q.id]; if (x) out.push({area: a, q: q.q, answer: str(x.a)}); }
  const skipped = IV19_AREAS.filter(a => ((iv.areas || {})[a] || {}).st === "skip");
  if (!out.length) return "";
  return `<interview_answers decided_by="the person" before="the change to v${iv.live}">\n${untrusted("interview_answers", JSON.stringify(out))}\nThe person answered these before this change; build the change on them and never ask them again.${skipped.length ? " Areas the person skipped (residual risk, be careful there): " + skipped.join(", ") + "." : ""}\n</interview_answers>`;
}
{ const orig = projectContext; projectContext = function(p, o = {}){ const s = orig(p, o); if (!p || (o && o.only && !arr(o.only).includes("decisions"))) return s; let b = ""; try{ b = iv19ContextBlock(p); }catch(e){ onAppError(e && e.message, "iv19:context"); } return b ? s + "\n" + b : s; }; }

/* ---------- 4. the screens: the interview, the line in the Inbox and on the Run page ---------- */
function iv19WhyText(iv){ return arr(iv.why).map(w => t("iv.why." + w)).join(" · "); }
function iv19Count(iv){ return iv.qs ? IV19_AREAS.reduce((s, a) => s + arr(iv.qs[a]).length, 0) : IV19_AREAS.length * IV19_PER; }
function iv19LineHTML(p, iv){
  return `<div class="item iv19-line" data-iv="${esc(iv.id)}">${stSlot("attn")}<div class="body"><span class="small"><b>${esc(p.name)}</b> · ${esc(t("iv.line", {v: iv.live}))}</span>
    <span class="small muted">${esc(t("iv.because", {x: iv19WhyText(iv)}))}</span><span class="small muted">${esc(t("iv.line.sub", {n: iv19Count(iv)}))}</span></div>
    <div class="qacts"><button class="btn xs primary" data-a="iv19-open" data-pid="${esc(p.id)}">${ic("ask")}${esc(t(iv.qs ? "iv.go" : "iv.start"))}</button><button class="btn xs ghost" data-a="iv19-skipall" data-pid="${esc(p.id)}">${esc(t("iv.skip0"))}</button></div></div>`;
}
{ const orig = ib18HomeHTML; ib18HomeHTML = function(){
    const h = orig.apply(this, arguments); if (!h) return h;
    let add = ""; try{ add = iv19All().map(x => iv19LineHTML(x.p, x.iv)).join(""); }catch(e){ onAppError(e && e.message, "iv19:inbox"); }
    return add ? h.replace('<div class="list">', '<div class="list">' + add) : h; }; }
{ const orig = pgBody; pgBody = function(p, id){ const h = orig(p, id); if (id !== "run") return h; let a = ""; try{ const iv = iv19Waiting(p); if (iv) a = `<section class="panel iv19-run"><div class="list">${iv19LineHTML(p, iv)}</div></section>`; }catch(e){ onAppError(e && e.message, "iv19:run"); } return a + h; }; }
function iv19AreasHTML(iv){
  return `<div class="row iv19-areas" role="list">${IV19_AREAS.map((a, i) => { const st = ((iv.areas || {})[a] || {}).st || (iv.area === a ? "cur" : "todo");
    return `<span class="chip ${st === "done" ? "ok" : st === "skip" ? "warn" : ""}" role="listitem" ${iv.area === a ? 'aria-current="step"' : ""}>${i + 1} · ${esc(t("iv.a." + a))}${st === "done" ? " ✓" : st === "skip" ? " · " + esc(t("iv.skipped")) : st === "none" ? " · " + esc(t("iv.none")) : ""}</span>`; }).join("")}</div>`;
}
function iv19QHTML(iv, q){
  const x = (iv.ans || {})[q.id];
  const opts = arr(q.options).map((o, i) => `<label class="chk small"><input type="radio" name="o-${esc(q.id)}" value="${i}" ${x && x.opt === i ? "checked" : ""}>${esc(o)}</label>`).join("");
  return `<fieldset class="iv19-q stack" style="gap:4px"><legend class="small"><b>${esc(q.q)}</b></legend>${q.why ? `<span class="small muted">${esc(q.why)}</span>` : ""}
    ${opts ? `<div class="stack" style="gap:2px">${opts}</div>` : ""}<label class="fld"><span class="small muted">${esc(t(opts ? "iv.own.or" : "iv.own"))}</span><input type="text" name="a-${esc(q.id)}" value="${esc(x && x.opt == null ? x.a : "")}" maxlength="600"></label></fieldset>`;
}
MODAL14.iv19 = (m, p0, hd) => {
  const p = WS.projects.find(x => x.id === m.pid), iv = p && (iv19Get(p, m.iv) || iv19Cur(p));
  const H = hd(t("iv.title"));
  if (!iv) return `${H}<p class="small muted">${esc(t("iv.gone"))}</p>`;
  const head = `${H}<p class="sub">${esc(t("iv.sub", {x: p.name, v: iv.live}))}</p><p class="small">${esc(t("iv.because", {x: iv19WhyText(iv)}))}</p>${iv19AreasHTML(iv)}`;
  if (iv.state !== "wait"){
    const rows = run18Rows(p).filter(r => r.src.startsWith("iv19:" + iv.id + ":") && !r.prov).map(r => r.id);
    const go = iv.from === "release" && p.live && iv19Settled(p) ? `<button class="btn primary" data-a="iv19-release" data-pid="${esc(p.id)}">${ic("check")}${esc(t("iv.release", {v: nextRelease(p, releaseKind(arr(p.plan && p.plan.changes)))}))}</button>` : "";
    return `${head}<p>${stSlot("ok")} ${esc(t(iv.state === "done" ? "iv.end.done" : "iv.end.skipped"))}</p>${rows.length ? `<p class="small muted">${esc(t("iv.end.rows", {x: rows.join(", ")}))}</p>` : ""}<p class="small muted">${esc(t("iv.end." + (iv.from || "prepare")))}</p>
      <div class="row end"><button class="btn ghost" data-a="modal-close">${esc(t("btn.close"))}</button>${go}</div>`;
  }
  const busy = IV19.busy.has(iv.id) || (typeof aiBusy === "function" && aiBusy("iv19"));
  if (!iv.qs) return `${head}<p class="small muted">${esc(t("iv.intro", {n: IV19_AREAS.length * IV19_PER}))}</p>${iv.err ? `<p class="small warn-t">${esc(t("iv.err"))}</p>` : ""}${busy ? `<div class="busy"><span class="pulse"></span>${esc(t("iv.making"))}</div>` : ""}
    <div class="row end"><button class="btn ghost" data-a="iv19-skipall" data-pid="${esc(p.id)}">${esc(t("iv.skip0"))}</button><button class="btn ghost" data-a="modal-close">${esc(t("iv.later"))}</button><button class="btn primary" data-a="iv19-make" data-pid="${esc(p.id)}" ${busy ? "disabled" : ""}>${ic("spark")}${esc(t(iv.err ? "iv.retry" : "iv.make"))}</button></div>`;
  const a = iv.area || iv19NextArea(iv), qs = arr(iv.qs[a]);
  return `${head}<form class="stack iv19-form" data-form="iv19-area" data-pid="${esc(p.id)}" data-iv="${esc(iv.id)}" data-area="${esc(a)}">
    <h3 class="small">${esc(t("iv.areaof", {i: IV19_AREAS.indexOf(a) + 1, x: t("iv.a." + a)}))}</h3><p class="small muted">${esc(t("iv.a." + a + ".sub"))}</p>
    ${qs.map(q => iv19QHTML(iv, q)).join("")}
    <p class="small muted">${esc(t("iv.skip.what"))}</p>
    <div class="row end"><button class="btn ghost" type="button" data-a="iv19-skipall" data-pid="${esc(p.id)}">${esc(t(Object.keys(iv.areas || {}).some(k => (iv.areas[k] || {}).st !== "none") ? "iv.skipall" : "iv.skip0"))}</button><button class="btn ghost" type="button" data-a="iv19-skiparea" data-pid="${esc(p.id)}" data-area="${esc(a)}">${esc(t("iv.skiparea"))}</button><button class="btn primary" type="submit">${ic("check")}${esc(t("iv.save"))}</button></div></form>`;
};
FORMS["iv19-area"] = f => {
  const p = WS.projects.find(x => x.id === f.dataset.pid), iv = p && iv19Get(p, f.dataset.iv), a = str(f.dataset.area);
  if (!iv || iv.state !== "wait" || !iv.qs || !IV19_AREAS.includes(a)) return;
  const got = {};
  for (const q of arr(iv.qs[a])){
    const own = str((f.querySelector(`[name="a-${q.id}"]`) || {}).value).trim(), o = f.querySelector(`[name="o-${q.id}"]:checked`), i = o ? +o.value : -1;
    const pick = i >= 0 ? str(q.options[i]) : "";
    if (own || pick) got[q.id] = Object.assign({a: (own || pick).slice(0, 600), at: now()}, !own && pick ? {opt: i} : {});
  }
  if (!Object.keys(got).length){ toast(t("iv.need"), "err"); return; }
  actOpen(p, t("iv.act.area", {x: t("iv.a." + a)}), {by: "you"});
  iv.ans = Object.assign({}, iv.ans, got);
  iv.areas = Object.assign({}, iv.areas, {[a]: {st: "done", at: now(), open: arr(iv.qs[a]).filter(q => !got[q.id]).map(q => q.id)}});
  const end = iv19Step(p, iv);
  touch(p); actCloseSoon(p.id); render();
  if (end){ toast(t("iv.end.done"), "ok"); iv19Continue(p.id, iv.id); }
};
Object.assign(ACTIONS, {
  "iv19-open": el => { const p = WS.projects.find(x => x.id === el.dataset.pid), iv = p && iv19Waiting(p); if (!iv) return; UI.modal = {kind: "iv19", pid: p.id, iv: iv.id}; render(); },
  "iv19-make": el => { const p = WS.projects.find(x => x.id === el.dataset.pid), iv = p && iv19Waiting(p); if (!iv) return; UI.modal = {kind: "iv19", pid: p.id, iv: iv.id}; iv19Make(p, iv.id); },
  "iv19-skiparea": el => { const p = WS.projects.find(x => x.id === el.dataset.pid), iv = p && iv19Waiting(p), a = str(el.dataset.area); if (!iv || !IV19_AREAS.includes(a)) return;
    actOpen(p, t("iv.act.skip", {x: t("iv.a." + a)}), {by: "you"}); iv19SkipArea(p, iv, a); const end = iv19Step(p, iv); touch(p); actCloseSoon(p.id); render();
    if (end){ toast(t(iv.state === "done" ? "iv.end.done" : "iv.end.skipped"), ""); iv19Continue(p.id, iv.id); } },
  "iv19-skipall": el => { const p = WS.projects.find(x => x.id === el.dataset.pid), iv = p && iv19Waiting(p); if (!iv) return;
    actOpen(p, t("iv.act.skipall"), {by: "you"}); for (const a of IV19_AREAS) if (!(iv.areas || {})[a]) iv19SkipArea(p, iv, a); iv19Step(p, iv); touch(p); actCloseSoon(p.id);
    UI.modal = {kind: "iv19", pid: p.id, iv: iv.id}; render(); toast(t(iv.state === "done" ? "iv.end.done" : "iv.end.skipped"), ""); iv19Continue(p.id, iv.id); },
  "iv19-release": el => { const p = WS.projects.find(x => x.id === el.dataset.pid); if (!p || !iv19Settled(p)) return; UI.modal = null; render(); if (UI.pid !== p.id) openProject(p.id); doRelease(p); }
});
for (const a of ["iv19-open", "iv19-make"]) ACT_NO.add(a);

/* ---------- 5. What changed: per published version, the decision rows that changed since the version before ---------- */
const WC19_CAP = 12;
/** the rows of one stretch of time: the value before it → the value after it (a row taken and taken back inside it is left out) */
function wc19Items(evs, qOf){
  const by = new Map();
  for (const e of evs){ const k = str(e.src); if (!k) continue; const c = by.get(k); by.set(k, {first: c ? c.first : e, last: e}); }
  const out = [];
  for (const [src, {first, last}] of by){
    const before = first.type === "taken" ? "" : str(first.data && first.data.from), after = last.type === "undone" ? "" : str(last.data && last.data.chosen);
    if (before === after) continue;
    const q = qOf.get(src) || t("wc.q.gone"), who = last.by && last.by !== "owner" ? rowByText(last.by) : "";
    out.push({src, row: str(last.row), q, before, after, who, text: !before ? t("wc.new", {q, x: after}) : !after ? t("wc.back", {q, a: before}) : t("wc.changed", {q, a: before, b: after})});
  }
  return out;
}
/** per published version (newest first) the rows that changed since the one before; the changes not published yet on top.
    Kept until the events, the versions, the project or the language change (cause 67: a screen never works out all rows twice) */
const WC19_MEMO = new Map();
function wc19Of(p){
  const L = ROWS.L[p.id]; if (!L || !L.ready) return null;
  const rels = arr(p.releases).filter(r => r && r.v).slice().sort((a, b) => str(a.at).localeCompare(str(b.at)));
  const key = [L.list.length, L.tail ? L.tail.id : "", rels.map(r => r.v + "@" + r.at).join(","), p.live ? p.live.v : "", str(p.updatedAt), LANG].join("|"), m = WC19_MEMO.get(p.id);
  if (m && m.key === key) return m.val;
  const val = wc19Compute(p, L, rels);
  WC19_MEMO.set(p.id, {key, val});
  return val;
}
function wc19Compute(p, L, rels){
  const log0 = L.list.length ? str(L.list[0].at) : "", base = !log0 || rels.some(r => str(r.at) < log0);
  /* the first event of a project holds the decisions it already had (1.8: "started" or "migrated"): they count as taken then — for
     the first version; when a version was published before the log began, they are the starting point, not a change */
  const evs = L.list.flatMap(e => ["started", "migrated", "rows"].includes(e.type) ? (base ? [] : arr(e.data && e.data.rows).filter(r => r && r.src && r.val != null).map(r => ({type: "taken", src: r.src, row: r.row, at: e.at, by: r.by, data: {chosen: r.chosen, val: r.val}}))) : [e])
    .filter(e => ["taken", "changed", "undone"].includes(e.type) && !str(e.src).startsWith("iv19:"));
  const qOf = new Map();
  for (const r of run18Rows(p)) qOf.set(r.src, str(r.question));
  for (const e of L.list) if (e.src && e.data && e.data.q && !qOf.has(e.src)) qOf.set(e.src, str(e.data.q));
  const vers = rels.map((r, i) => { const from = i ? str(rels[i - 1].at) : "", to = str(r.at);
    return {v: str(r.v), at: to, first: i === 0, live: !!(p.live && p.live.v === r.v), unknown: !log0 || to < log0, items: wc19Items(evs.filter(e => str(e.at) > from && str(e.at) <= to), qOf)}; });
  const last = rels.length ? str(rels[rels.length - 1].at) : "";
  return {pending: rels.length ? wc19Items(evs.filter(e => str(e.at) > last), qOf) : [], vers: vers.reverse()};
}
function wc19ListHTML(items){
  const li = x => `<li><span class="mono small">${esc(x.row)}</span> ${esc(x.text)}${x.who ? ` <span class="muted">· ${esc(x.who)}</span>` : ""}</li>`;
  const shown = items.slice(0, WC19_CAP), more = items.slice(WC19_CAP);
  return `<ul class="small wc19-list">${shown.map(li).join("")}</ul>${more.length ? `<details class="small"><summary>${esc(t("wc.more", {n: more.length}))}</summary><ul class="small">${more.map(li).join("")}</ul></details>` : ""}`;
}
function wc19HTML(p){
  if (!p || !arr(p.releases).length) return "";
  const W = wc19Of(p);
  if (!W){ if (rowsOn() && !(ROWS.L[p.id] && (ROWS.L[p.id].loading || ROWS.L[p.id].failed))) rowsEnsure(p).then(L => { if (L && L.ready && UI.pid === p.id) render(); }); return `<section class="panel wc19" data-anchor="wc19"><h3>${ic("log")} ${esc(t("wc.title"))}</h3><p class="small muted">${esc(t("row.loading"))}</p></section>`; }
  const ver = x => `<div class="wc19-v" data-v="${esc(x.v)}"><div class="row"><b class="mono">v${esc(x.v)}</b><span class="small muted">${esc(fmtDay(x.at))}</span>${x.live ? `<span class="chip ok">${esc(t("rel.live"))}</span>` : ""}</div>
    ${x.unknown && !x.items.length ? `<p class="small muted">${esc(t("wc.before"))}</p>` : !x.items.length ? `<p class="small muted">${esc(t("wc.none"))}</p>`
      : x.first ? `<details class="small"><summary>${esc(t("wc.first", {n: x.items.length}))}</summary>${wc19ListHTML(x.items)}</details>` : wc19ListHTML(x.items)}</div>`;
  return `<section class="panel wc19" data-anchor="wc19"><h3>${ic("log")} ${esc(t("wc.title"))}</h3><p class="small muted">${esc(t("wc.sub"))}</p>
    ${W.pending.length ? `<div class="wc19-v pending"><b class="small">${esc(t("wc.pending", {v: W.vers[0] ? W.vers[0].v : ""}))}</b>${wc19ListHTML(W.pending)}</div>` : ""}
    ${W.vers.map(ver).join("")}</section>`;
}
{ const orig = phRelease; phRelease = function(p){ const h = orig.apply(this, arguments); let a = ""; try{ a = wc19HTML(p); }catch(e){ onAppError(e && e.message, "wc19"); } return h + a; }; }

/* ---------- 6. the look of the new parts (the 1.8 look's tokens; injected like Health's sheet) ---------- */
const IV19_CSS = `
.iv19-q{border:1px solid var(--line);border-radius:12px;padding:8px 12px 10px;margin:0;min-width:0}
.iv19-q legend{padding:0 4px;max-width:100%}
.iv19-q .fld input{width:100%}
.iv19-areas{gap:6px}
.scan19-seq{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:2px 0}
.wc19-v{border-top:1px solid var(--line);padding:8px 0 4px;display:flex;flex-direction:column;gap:4px}
.wc19-v.pending{border-top:0}
.wc19-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:2px}`;
function iv19Css(){ if (typeof document === "undefined" || document.getElementById("iv19-css")) return; const s = document.createElement("style"); s.id = "iv19-css"; s.textContent = IV19_CSS; (document.head || document.body).appendChild(s); }
iv19Css();
