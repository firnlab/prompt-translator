/* ===================== 1.4 INTERVIEW ENGINE =====================
   One engine, two presets (Quick: one question at a time, short; Guided: a few at a time with a little more context).
   Questions come in order of what a wrong guess would cost (impact × uncertainty). Each question shows the full list of
   plausible answers: one click answers it (no typing, no confirm), any answer can be edited before you choose it, and your
   own words go in one line. ★ marks PT's recommendation with its reason; hard-to-undo questions are never preselected.
   Your answers are the ledger every later step builds on. The interview stops when enough is known. */
const INT_PRESETS = {quick: {n: 1, maxAuto: 2}, standard: {n: 2, maxAuto: 2}, deep: {n: 3, maxAuto: 3}};
function intPreset(p){ return INT_PRESETS[p.depth] || INT_PRESETS.standard; }
function dimSettled(p, id){ const s = (p.dims || {})[id] || {}; return s.status === "confirmed" || s.status === "na"; }
async function aiInterview(p, {auto = false} = {}){
  const pre = intPreset(p);
  if (auto){ p.autoRounds = num(p.autoRounds, 0); if (p.autoRounds >= pre.maxAuto){ return null; } }
  const open = DIMS.filter(d => !dimSettled(p, d.id));
  const dimsDesc = DIMS.map(d => "- " + d.id + (dimSettled(p, d.id) ? " [settled by the person: do not ask about it]" : "") + ": " + d.ai).join("\n");
  const prompt = buildPrompt("interview", {proj: p, rules: ["elicit","assume","golden","simple","trifecta","funnel"], platform: true, context: projectContext(p),
    body: `You are interviewing the person to get the complete picture before anything is designed. Coverage dimensions:\n${dimsDesc}
1. Update the status of every dimension that is NOT settled: "confirmed" (the person said it clearly), "assumed" (you inferred it; state the assumption) or "unknown", with a one-sentence summary. Never change a settled dimension.
2. Choose up to ${pre.n + 1} next questions where a wrong guess would cost the most. For each give impact (1-5: how much of the tool changes with the answer) and uncertainty (1-5: how unsure you are). Never ask about a settled dimension or repeat a question already answered or already waiting.
3. Ask each question as a concrete what-if situation the tool will really meet ("What if a buyer asks for a discount at 23:00?"), so the person can answer from experience instead of in the abstract. Each question offers the full list of plausible answers (3-6 options, short, mutually exclusive, the person should find theirs in the list), your recommended option index with a one-sentence reason, and "hard": true when the answer is hard to undo later (who sees the result, legal or money matters, sending data outside, deleting); hard questions get no recommendation (-1).
4. Cover "look" (look and output form) before stopping, because interviews usually skip it.
5. List at most 3 new assumptions you are making (not repeating existing ones) and at most 2 concerns that will matter in a later step.
6. Stop rule: "ready": true when no dimension that matters for this tool is still unknown and the riskiest ones are confirmed; then return no questions.`,
    schema: `{"dims":[{"id":"purpose","status":"unknown|assumed|confirmed","summary":"…"}],"questions":[{"dim":"look","text":"…","why":"why this matters now, one sentence","options":["…","…","…"],"recommended":0,"recWhy":"one sentence","hard":false,"impact":4,"uncertainty":3}],"assumptions":[{"text":"…","category":"feasibility","impact":4,"risk":3}],"foresight":[{"phase":"arch","text":"…"}],"drift":"empty or a one-sentence warning","ready":false,"readyReason":"…","coverageNote":"…"}`});
  const r = await runAI("interview", t("int.thinking"), prompt, {pid: p.id, step: "interview", validate: o => o && Array.isArray(o.dims) && Array.isArray(o.questions)});
  if (!r) return null;
  snapshot(p, t("int.round"));
  if (auto) p.autoRounds = num(p.autoRounds, 0) + 1;
  for (const d of arr(r.dims)){ if (!DIMS.some(x => x.id === d.id) || dimSettled(p, d.id)) continue; const cur = p.dims[d.id] || {}; p.dims[d.id] = {status: oneOf(d.status, STATUS3, "unknown"), summary: str(d.summary) || cur.summary || ""}; }
  // new questions join the waiting ones (nothing waiting is dropped), in order of impact × uncertainty
  const asked = [...arr(p.qa).map(q => q.q), ...arr(p.pendingQs).map(q => q.text)];
  for (const q of arr(r.questions)){
    const text = str(q.text); if (!text || asked.some(a => similar(a, text))) continue;
    const dim = DIMS.some(d => d.id === q.dim) ? q.dim : "scope"; if (dimSettled(p, dim)) continue;
    const hard = !!q.hard, opts = arr(q.options).map(str).filter(Boolean).slice(0, 6);
    p.pendingQs.push({id: uid("q"), dim, text, why: str(q.why), options: opts, recommended: hard ? -1 : clamp(num(q.recommended, -1), -1, opts.length - 1), recWhy: hard ? "" : str(q.recWhy), hard, score: clamp(num(q.impact, 3), 1, 5) * clamp(num(q.uncertainty, 3), 1, 5), at: now(), wi: true});
    asked.push(text);
  }
  p.pendingQs.sort((a, b) => num(b.score, 9) - num(a.score, 9));
  let na = 0; for (const a of arr(r.assumptions).slice(0, 3)){ const txt = str(a.text); if (txt && !p.assumptions.some(x => similar(x.text, txt))){ const id = uid("as"); p.assumptions.push({id, text: txt, category: oneOf(a.category, ACAT, "feasibility"), impact: clamp(num(a.impact, 3), 1, 5), risk: clamp(num(a.risk, 3), 1, 5), status: "untested", test: ""}); markPT(p, "assumption:" + id, "added", t("why.interview")); na++; } }
  for (const f of arr(r.foresight).slice(0, 2)){ const txt = str(f.text); if (txt && !p.foresight.some(x => similar(x.text, txt))) p.foresight.push({id: uid("fs"), text: txt, phase: oneOf(f.phase, PHASES.map(x => x.id), "arch"), done: false, ai: true}); }
  p.drift = str(r.drift);
  p.interviewReady = !!r.ready && !p.pendingQs.length; p.interviewReadyReason = str(r.readyReason); p.coverageNote = str(r.coverageNote);
  touch(p); render();
  return r;
}
/** answer a waiting question: the option you clicked (as written, or as you edited it) and/or your own words */
function answerQ(p, qid, {choice = null, own = ""} = {}){
  const q = arr(p.pendingQs).find(x => x.id === qid); if (!q) return null;
  const optText = choice != null ? str((UI.qOptEdit && UI.qOptEdit[qid + ":" + choice]) || q.options[choice]) : "";
  const answer = [optText, str(own).trim()].filter(Boolean).join(" — ");
  if (!answer){ toast(t("int.needanswer"), "err"); return null; }
  const id = uid("qa");
  p.qa.push({id, dim: q.dim, q: q.text, answer, choice, choiceText: optText, own: str(own).trim(), options: arr(q.options), recommended: q.recommended, usedRec: choice != null && choice === q.recommended, hard: !!q.hard, at: now(), st: "ok"});
  p.dims[q.dim] = {status: "confirmed", summary: str(answer)};   // stored whole; the list shows a short label
  p.pendingQs = p.pendingQs.filter(x => x.id !== qid);
  delete UI.qDraft[qid]; delete UI.qSel[qid];
  markRef(p, "qa:" + id, "answered"); markNew(p, "qa:" + id);
  logAct(p, t("act.answered", {x: trunc(q.text, 60)}), {step: "interview"});
  return id;
}
/* ---------- view ---------- */
function qCard(p, q, first){
  const ed = UI.qOptEdit || {};
  const opts = arr(q.options).map((o, i) => { const k = q.id + ":" + i, editing = UI.qEditing === k, val = ed[k] != null ? ed[k] : o;
    return `<div class="optrow">${editing ? `<input type="text" id="qo-${esc(k)}" value="${esc(val)}" data-qoptedit="${esc(k)}" aria-label="${esc(t("int.editopt"))}"><button class="btn xs primary" data-a="q-pick" data-q="${esc(q.id)}" data-i="${i}">${ic("check")}${esc(t("int.usethis"))}</button>` : `<button class="opt ${i === q.recommended ? "rec" : ""}" data-a="q-pick" data-q="${esc(q.id)}" data-i="${i}" ${first && i < 9 ? `aria-keyshortcuts="${i + 1}"` : ""}>${first && i < 9 ? `<kbd>${i + 1}</kbd>` : ""}${i === q.recommended ? `<span class="star" title="${esc(q.recWhy || t("int.rec"))}">★</span>` : ""}<span>${esc(val)}</span></button><button class="iconbtn sm" data-a="q-editopt" data-k="${esc(k)}" title="${esc(t("int.editopt"))}" aria-label="${esc(t("int.editopt"))}">${ic("edit")}</button>`}</div>`; }).join("");
  const d = DIMS.find(x => x.id === q.dim);
  return `<div class="qcard ${first ? "first" : ""} ${q.wi ? "whatif" : ""}" id="ir-pq:${esc(q.id)}"><div class="row" style="gap:6px">${q.wi ? `<span class="qd wi">${esc(t("wi.label"))}</span>` : ""}<span class="qd">${esc(d ? L(d) : q.dim)}</span>${q.hard ? `<span class="chip warn">${esc(t("int.hard"))}</span>` : ""}</div>
    <div class="qt">${esc(q.text)}</div>
    ${q.why ? `<details class="qwhy"><summary class="small muted">${esc(t("int.whyhere"))}</summary><div class="small">${esc(q.why)}${q.recWhy ? `<br>★ ${esc(q.recWhy)}` : ""}</div></details>` : ""}
    ${opts ? `<div class="opts14">${opts}</div>` : ""}
    <form class="row own" data-form="q-own" data-q="${esc(q.id)}"><input type="text" id="qa-${esc(q.id)}" data-qdraft="${esc(q.id)}" value="${esc(UI.qDraft[q.id] || "")}" placeholder="${esc(t("int.ownph1"))}" style="flex:1;min-width:180px" aria-label="${esc(t("int.ownph1"))}"><button class="btn sm" type="submit">${esc(t("int.answer"))}</button><button class="btn sm ghost" type="button" data-a="q-skip" data-q="${esc(q.id)}" title="${esc(t("int.skiptip"))}">${esc(t("int.later"))}</button></form></div>`;
}
function phInterview(p){
  const pre = p.depth || "standard";
  const qs = arr(p.pendingQs), cov = Math.round(dimCoverage(p) * 100);
  const notes = (WS.notes || []).filter(n => n.projectId === p.id && !n.deletedAt && !n.noAI && n.type !== "scratch").length;
  const answered = newFirst(p, "qa", arr(p.qa)).map(q => { const i = p.qa.indexOf(q), ref = "qa:" + q.id, ed = UI.reanswer === q.id, d = DIMS.find(x => x.id === q.dim);
    return `<div class="irow qa14 ${q.st === "assumed" ? "as" : ""}" id="ir-${esc(ref)}" ${p.focus.id === ref ? "data-focus" : ""}><div class="ihead-wrap">${stSlot(q.st === "assumed" ? "as" : isFlagged(p, ref) ? "warn" : "ok")}<span class="iid mono">Q${i + 1}</span><span class="ititle"><span class="muted small">${esc(d ? L(d) : "")} · </span>${esc(q.q)}<br><b>${esc(q.answer)}</b></span><span class="chips">${markChip(p, ref)}</span>
      <span class="itools">${q.st === "assumed" ? `<button class="btn xs primary" data-a="item-confirm" data-ref="${esc(ref)}">${ic("check")}${esc(t("btn.confirm"))}</button>` : ""}<button class="btn xs ghost" data-a="qa-reanswer" data-id="${esc(q.id)}">${ic("edit")}${esc(ed ? t("btn.cancel") : t("int.change"))}</button></span></div>
      ${ed ? `<div class="qcard">${arr(q.options).length ? `<div class="opts14">${q.options.map((o, oi) => `<div class="optrow"><button class="opt ${oi === q.recommended ? "rec" : ""} ${UI.qSel[q.id] === oi ? "on" : ""}" data-a="qa-pick" data-id="${esc(q.id)}" data-i="${oi}">${oi === q.recommended ? `<span class="star">★</span>` : ""}<span>${esc(o)}</span></button></div>`).join("")}</div>` : ""}<label class="fld"><span>${esc(t("int.ownph1"))}</span><input type="text" id="qa-${esc(q.id)}" data-qdraft="${esc(q.id)}" value="${esc(UI.qDraft[q.id] ?? q.own ?? "")}"></label>
        <div class="row end">${depCount(p, ref) ? `<button class="btn sm" data-a="qa-save" data-id="${esc(q.id)}" data-scope="mark" title="${esc(t("ch.mark.tip"))}">${esc(t("ch.mark", {n: depCount(p, ref)}))}</button><button class="btn sm primary" data-a="qa-save" data-id="${esc(q.id)}" data-scope="update" title="${esc(t("ch.update.tip"))}">${ic("check")}${esc(t("ch.update", {n: depCount(p, ref)}))}</button>` : `<button class="btn sm primary" data-a="qa-save" data-id="${esc(q.id)}" data-scope="item">${ic("check")}${esc(t("int.saveanswer"))}</button>`}</div></div>` : ""}</div>`; }).join("");
  const dimsList = DIM_GROUPS.map(g => `<div class="dimg"><span class="eyebrow">${esc(L(g))}</span>${DIMS.filter(d => d.g === g.id).map(d => { const s = p.dims[d.id] || {}; const st = s.status === "confirmed" || s.status === "na" ? "ok" : s.status === "assumed" ? "as" : "todo"; return `<div class="dim14" title="${esc(L(d.cost))}">${stSlot(st)}<span class="dn">${esc(L(d))}</span><span class="ds small muted">${esc(trunc(s.summary || "", 90))}</span>${s.status !== "na" && s.status !== "confirmed" ? `<button class="btn xs ghost" data-a="dim-na" data-ref="dim:${esc(d.id)}">${esc(t("rd.f.na"))}</button>` : ""}</div>`; }).join("")}</div>`).join("");
  return `<section class="panel">
    ${head(t("int.title"), t("int14.sub"), `<div class="row"><div class="seg" role="group" aria-label="${esc(t("int.depth"))}">${["quick","standard","deep"].map(x => `<button class="${pre === x ? "on" : ""}" data-a="depth" data-d="${x}">${esc(t("depth." + x))}</button>`).join("")}</div>${modelChip("interview")}</div>`)}
    ${p.interviewReady ? `<div class="nextbar okbar"><span class="lbl">${esc(t("int.ready"))}</span><span class="txt">${esc(p.interviewReadyReason)}</span>${btn("goto", t("int.toAssume"), {icon: "arrow", cls: "sm primary", attrs: 'data-ph="assume"'})}</div>` : ""}
    ${busyHTML("interview")}
    ${qs.length ? `<p class="small muted">${esc(t("int.keys"))}</p>${qs.map((q, i) => qCard(p, q, i === 0)).join("")}` : `<div class="empty-state"><p>${esc(p.qa.length ? (p.interviewReady ? t("int.enough") : t("int.more")) : t("int.start"))}</p>${aiBtn("interview", p.qa.length ? t("int.next") : t("int.begin"), "M", {primary: !p.interviewReady, key: "interview"})}</div>`}
    <div class="row">${qs.length ? aiBtn("interview", t("int.next"), "M", {key: "interview"}) : ""}${notes && qs.length ? aiBtn("notes-answers", t("int.fromnotes", {n: notes}), "L", {key: "notes-ans"}) : ""}${btn("qa-add", t("int.addown"), {icon: "plus", cls: "sm ghost"})}<span class="hint">${esc(t("int.cov", {n: cov}))}</span></div>${busyHTML("notes-ans")}
    ${p.coverageNote ? `<p class="hint">${esc(p.coverageNote)}</p>` : ""}
  </section>
  ${UI.notesAns && UI.notesAns.pid === p.id ? notesAnswersPanel(p) : ""}
  <section class="panel">${head(t("int.answered", {n: p.qa.length}), t("int14.ledger"), btn("qa-fold", UI.qaFold ? t("int.unfold") : t("int.fold"), {cls: "sm ghost"}))}
    ${UI.qaFold ? "" : answered ? `<div class="ilist">${answered}</div>` : `<p class="small muted">${esc(t("int.nohistory"))}</p>`}</section>
  <section class="panel">${head(t("int14.knows"), t("int.radar.sub", {n: cov}))}<div class="dims14">${dimsList}</div></section>`;
}
/* ---------- notes → answers, with a contradiction check ---------- */
async function aiNotesToAnswers(p){
  const notes = (WS.notes || []).filter(n => n.projectId === p.id && !n.deletedAt && !n.noAI && n.type !== "scratch");
  if (!notes.length || !arr(p.pendingQs).length) return null;
  const prompt = buildPrompt("notes-answers", {proj: p, rules: ["elicit","assume"], context: projectContext(p, {only: ["north_star","goal_criteria","interview_answers","requirements"]}),
    body: `The person's own notes may already answer some waiting questions, and may contradict what was answered or decided. Use only what the notes really say.
<notes>${JSON.stringify(notes.slice(-40).map(n => ({id: n.id, text: trunc(n.text, 1500)})))}</notes>
<questions>${JSON.stringify(p.pendingQs.map(q => ({id: q.id, text: q.text, options: q.options})))}</questions>
For each question a note answers, give the answer (the matching option index if one fits, else -1, and the answer in the person's words) and the note id. Then list contradictions between the notes and the answers, criteria or requirements.`,
    schema: `{"answers":[{"q":"q-…","choice":-1,"text":"…","note":"n-…"}],"contradictions":[{"note":"n-…","with":"qa:… or req:R2 or crit:C1","what":"one sentence"}]}`});
  const r = await runAI("notes-ans", t("int.notesworking"), prompt, {pid: p.id, step: "notes", validate: o => o && Array.isArray(o.answers)});
  if (!r) return null;
  UI.notesAns = {pid: p.id, answers: arr(r.answers).filter(a => p.pendingQs.some(q => q.id === str(a.q))).map(a => ({q: str(a.q), choice: num(a.choice, -1), text: str(a.text), note: str(a.note), on: true})), contra: arr(r.contradictions).map(c => ({note: str(c.note), with: str(c.with), what: str(c.what)}))};
  render(); return r;
}
function notesAnswersPanel(p){
  const na = UI.notesAns;
  return `<section class="panel" style="border-color:var(--accent)">${head(t("int.fromnotes.t"), t("int.fromnotes.sub"))}
    ${na.answers.length ? `<div class="list">${na.answers.map((a, i) => { const q = p.pendingQs.find(x => x.id === a.q); const n = WS.notes.find(x => x.id === a.note); return q ? `<label class="item"><input type="checkbox" data-a-change="na-tick" data-i="${i}" ${a.on ? "checked" : ""}><div class="body"><span class="small muted">${esc(q.text)}</span><b>${esc(a.choice >= 0 && q.options[a.choice] ? q.options[a.choice] + (a.text ? " — " + a.text : "") : a.text)}</b>${n ? `<span class="small muted">${esc(t("int.fromnote"))}: “${esc(trunc(n.text, 100))}”</span>` : ""}</div></label>` : ""; }).join("")}</div>` : `<p class="small muted">${esc(t("int.nonotesans"))}</p>`}
    ${na.contra.length ? `<h4>${esc(t("int.contra"))}</h4><ul class="small">${na.contra.map(c => `<li>${esc(c.what)} <span class="muted">(${esc(c.with)})</span></li>`).join("")}</ul>` : ""}
    <div class="row end">${btn("na-close", t("btn.close"), {cls: "sm ghost"})}${na.answers.length ? btn("na-apply", t("int.applynotes", {n: na.answers.filter(a => a.on).length}), {icon: "check", cls: "sm primary"}) : ""}</div></section>`;
}
/* ---------- actions ---------- */
Object.assign(ACTIONS, {
  "depth": el => { const p = curP(); p.depth = el.dataset.d; touch(p); render(); },
  "interview": () => { const p = curP(); p.autoRounds = 0; p.interviewStopped = false; aiInterview(p); },
  "q-pick": el => { const p = curP(); const id = answerQ(p, el.dataset.q, {choice: num(el.dataset.i), own: (UI.qDraft[el.dataset.q] || "")}); if (!id) return; UI.qEditing = null; touch(p); render(); afterChange(p); if (!p.pendingQs.length && !p.interviewReady && p.autoInterview !== false) aiInterview(p, {auto: true}); else focusFirstQ(); },
  "q-editopt": el => { UI.qEditing = UI.qEditing === el.dataset.k ? null : el.dataset.k; render(); focusSoon("qo-" + el.dataset.k); },
  "q-skip": el => { const p = curP(); const q = p.pendingQs.find(x => x.id === el.dataset.q); if (!q) return; p.pendingQs = p.pendingQs.filter(x => x.id !== q.id); p.openQs.push({id: uid("oq"), text: q.text, done: false, fromQ: q.id, dim: q.dim}); touch(p); render(); toastUndo(t("int.skipped14")); },
  "qa-reanswer": el => { const id = el.dataset.id; UI.reanswer = UI.reanswer === id ? null : id; const p = curP(); const q = p.qa.find(x => x.id === id); if (q && UI.reanswer){ UI.qDraft[id] = q.own != null ? q.own : ""; UI.qSel[id] = q.choice != null ? q.choice : arr(q.options).findIndex(o => str(q.answer).startsWith(o)); UI.qaBefore = {id, text: itemSnapshotText(p, "qa:" + id)}; } render(); },
  "qa-pick": el => { UI.qSel[el.dataset.id] = UI.qSel[el.dataset.id] === num(el.dataset.i) ? undefined : num(el.dataset.i); render(); },
  "qa-save": el => { const p = curP(); const id = el.dataset.id, scope = el.dataset.scope || "item"; const q = p.qa.find(x => x.id === id); if (!q) return;
    const sel = UI.qSel[id], own = str(UI.qDraft[id] || "").trim(), opt = sel != null && sel >= 0 && q.options[sel] ? q.options[sel] : "";
    const ans = [opt, own].filter(Boolean).join(" — "); if (!ans){ toast(t("int.needanswer"), "err"); return; }
    const before = UI.qaBefore && UI.qaBefore.id === id ? UI.qaBefore.text : itemSnapshotText(p, "qa:" + id);
    Object.assign(q, {answer: ans, choice: sel != null && sel >= 0 ? sel : null, choiceText: opt, own, st: "ok", at: now(), usedRec: sel === q.recommended});
    p.dims[q.dim] = {status: "confirmed", summary: str(ans)}; markRef(p, "qa:" + id, "answered");
    logAct(p, t("act.reanswered", {x: trunc(q.q, 60)}), {step: "interview", important: true});
    UI.reanswer = null; delete UI.qDraft[id]; delete UI.qSel[id];
    if (scope === "mark") markDownstream(p, "qa:" + id);
    touch(p); render(); toastUndo(t("int.saved")); afterChange(p);
    if (scope === "update") updateAffected(p, ["qa:" + id], {before: {["qa:" + id]: before}}); },
  "qa-add": () => promptBox(t("int.addown"), {ph: t("int.ownph")}, v => { if (!str(v).trim()) return; const p = curP(); const id = uid("qa"); p.qa.push({id, dim: "scope", q: t("int.ownq"), answer: str(v).trim(), own: str(v).trim(), at: now(), st: "ok", byYou: true}); markNew(p, "qa:" + id); markRef(p, "qa:" + id, "added"); logAct(p, t("act.answered", {x: trunc(v, 60)}), {step: "interview"}); touch(p); render(); afterChange(p); }),
  "notes-answers": () => aiNotesToAnswers(curP()),
  "na-close": () => { UI.notesAns = null; render(); },
  "na-apply": () => { const p = curP(); const na = UI.notesAns; if (!na) return; let n = 0; for (const a of na.answers.filter(x => x.on)){ const id = answerQ(p, a.q, {choice: a.choice >= 0 ? a.choice : null, own: a.choice >= 0 ? "" : a.text}); if (id){ const q = p.qa.find(x => x.id === id); q.fromNote = a.note; q.st = "assumed"; markPT(p, "qa:" + id, "answered", t("why.fromnote")); n++; } } UI.notesAns = null; touch(p); render(); toastUndo(t("int.notesapplied", {n})); }
});
Object.assign(CHANGES, { "na-tick": el => { const na = UI.notesAns; if (na && na.answers[num(el.dataset.i)]) na.answers[num(el.dataset.i)].on = el.checked; } });
FORMS["q-own"] = f => { const p = curP(); const qid = f.dataset.q; const own = str(($("#qa-" + qid) || {}).value).trim(); if (!own){ toast(t("int.needanswer"), "err"); return; } UI.qDraft[qid] = own; const id = answerQ(p, qid, {own}); if (!id) return; touch(p); render(); afterChange(p); if (!p.pendingQs.length && !p.interviewReady && p.autoInterview !== false) aiInterview(p, {auto: true}); else focusFirstQ(); };
document.addEventListener("input", e => { const el = e.target; if (el.matches && el.matches("[data-qoptedit]")){ UI.qOptEdit = UI.qOptEdit || {}; UI.qOptEdit[el.dataset.qoptedit] = el.value; } });
function focusFirstQ(){ setTimeout(() => { const b = document.querySelector(".qcard.first .opt"); if (b) b.focus({preventScroll: true}); }, 30); }
/* keys in the interview: 1–9 pick an answer of the first question, Enter takes ★ (never for hard questions), L = later */
document.addEventListener("keydown", e => {
  if (e.isComposing || e.keyCode === 229 || e.metaKey || e.ctrlKey || e.altKey) return;
  const p = UI.view === "project" ? curP() : null; if (!p || !UI.unlocked || UI.modal || UI.palette || p.focus.ph !== "interview") return;
  const a = document.activeElement; if (a && a.matches && a.matches("input,textarea,select,[contenteditable]")) return;
  // only while the question is on the screen (never on the overview, in Finish or in another step)
  if (UI.home || UI.finish || UI.phase !== "interview") return;
  const q = arr(p.pendingQs)[0]; if (!q || !document.querySelector(`.qcard.first [data-a=q-pick][data-q="${CSS.escape(q.id)}"]`)) return;
  if (/^[1-9lL]$/.test(e.key) || e.key === "Enter"){ actOpen(p, t("int.answer") + " · " + trunc(q.text, 40)); actCloseSoon(p.id); }
  if (/^[1-9]$/.test(e.key) && q.options[num(e.key) - 1] != null){ e.preventDefault(); ACTIONS["q-pick"]({dataset: {q: q.id, i: String(num(e.key) - 1)}}); return; }
  if (e.key === "Enter" && q.recommended >= 0 && !q.hard && !(a && a.matches && a.matches("button"))){ e.preventDefault(); ACTIONS["q-pick"]({dataset: {q: q.id, i: String(q.recommended)}}); return; }
  if (e.key.toLowerCase() === "l"){ e.preventDefault(); ACTIONS["q-skip"]({dataset: {q: q.id}}); }
});
