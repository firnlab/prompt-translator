/* ===================== 1.4 FIXING THAT WORKS AND SHOWS ITS WORK =====================
   A problem (finding) names the items it is about; PT fixes exactly those items, a separate checker compares the
   full text before and after, part by part, and a rejected fix is tried again with the checker's note.
   "Fix for me": what the checker confirms stays changed and is marked "Fixed by PT · checked" with Undo; what it cannot
   confirm is taken back and comes to you as a proposal with the reason. */

/* ---------- which items a finding is about ---------- */
function rungContext(text, i, len){ const before = text.slice(Math.max(0, i - 3), i), after = text.slice(i + len, i + len + 8); return /R\d-$/.test(before) || /^-R\d/.test(after) || /^\s*(rung|Stufe|级)/i.test(after); }
/** every item a finding names: requirements, parts, tests, package sections, out-of-scope and principles */
function findingTargets(p, f){
  if (arr(f.targets).length && f.targets.every(r => itemExists(p, r) || r === "ns" || r === "arch:choice" || r === "oos:all" || r === "const:all")) return f.targets;
  const out = new Set(), text = [f.item, f.where, f.issue, f.fix].map(str).join(" \n ");
  if (f.section && arr(p.pkg.sections).some(s => s.id === f.section)) out.add("section:" + f.section);
  for (const m of text.matchAll(/\bR(\d+)\b/g)){ if (rungContext(text, m.index, m[0].length)) continue; if (arr(p.requirements).some(r => r.id === m[0])) out.add("req:" + m[0]); }
  for (const m of text.matchAll(/\bT(\d+)\b/g)) if (arr(p.tests).some(x => x.id === m[0])) out.add("test:" + m[0]);
  for (const c of arr(p.arch.components)){ if (new RegExp("\\b" + c.id + "\\b").test(text) || (str(c.name).length > 3 && text.includes(c.name))) out.add("component:" + c.id); }
  for (const s of arr(p.pkg.sections)) if (s.id.length > 3 && text.includes(s.id)) out.add("section:" + s.id);
  if (/out[- ]of[- ]scope|ausserhalb|nicht im umfang|范围之外|不在范围/i.test(text)) out.add("oos:all");
  if (/constitution|principle|grundsatz|grundsätze|原则/i.test(text) && f.step === "require") out.add("const:all");
  if (!out.size){
    if (f.step === "arch") out.add("arch:choice");
    else if (f.step === "require") out.add("req:new");
    else if (arr(p.pkg.sections).length) out.add("section:" + (arr(p.pkg.sections).find(s => s.dest === "instructions") || p.pkg.sections[0]).id);
    else out.add("ns");
  }
  return [...out].slice(0, 8);
}
function findingRef(p, f){ const t0 = findingTargets(p, f)[0]; return t0 === "req:new" ? "ns" : t0; }
function targetText(p, ref){
  if (ref === "req:new") return "(a new requirement may be added)";
  if (ref === "oos:all") return "lines: " + arr(p.outOfScope).join(" | ");
  if (ref === "const:all") return "lines: " + arr(p.constitution).join(" | ");
  return itemSnapshotText(p, ref);
}
function targetFields(ref){ const k = itemKindOf(ref.replace(/:all$/, ":x")); return ITEM_FIELDS[k === "oos" || k === "const" ? k : k] || []; }
function snapTargets(p, refs){ const o = {}; for (const r of refs) o[r] = targetText(p, r); return o; }

/* ---------- the fixer: one call for a small group of findings that share items ---------- */
async function aiFixBatch(p, fs, notes = {}){
  const targets = [...new Set(fs.flatMap(f => findingTargets(p, f)))];
  const items = targets.filter(r => r !== "req:new").map(r => ({ref: r === "oos:all" ? "oos:all" : r === "const:all" ? "const:all" : r, fields: Object.fromEntries(targetFields(r).map(fl => { const o = r.endsWith(":all") ? {lines: (r === "oos:all" ? arr(p.outOfScope) : arr(p.constitution)).join("\n")} : itemObj(p, r) || {}; return [fl, Array.isArray(o[fl]) ? o[fl] : str(o[fl])]; }))}));
  const pkgEnglish = targets.some(r => r.startsWith("section:"));
  const prompt = buildPrompt("fix-items", {proj: p, pkgEnglish, rules: ["golden","spec","short","why","positive"], platform: true, context: projectContext(p),
    body: `Fix these problems in the project. Change only what each problem needs and keep everything else exactly as it is. Each problem names the items it is about; change those items. If a problem can only be solved with a new requirement or test, add it under "newItems". Never move a fix into a summary field that nothing else reads.
<problems>${JSON.stringify(fs.map(f => ({id: f.id, issue: f.issue, expectedFix: f.fix, items: findingTargets(p, f), stillOff: notes[f.id] || undefined})))}</problems>
<items>${JSON.stringify(items)}</items>
For every item you change, return the complete new value of each field you change (arrays stay arrays). Package section content stays complete: never return a shortened section.${(() => { const gold = arr(p.goal && p.goal.examples).filter(e => e.golden || e.never); return gold.length ? `
The person's golden examples (results exactly as they must be) and "must never happen" examples: a fix must never make the tool produce a result that breaks one of them.
<golden>${JSON.stringify(gold.slice(0, 8).map(e => ({id: e.id, kind: e.never ? "must never happen" : "golden", input: trunc(str(e.input), 800), result: trunc(str(e.output), 1500), why: str(e.why)})))}</golden>` : ""; })()}`,
    schema: `{"items":[{"ref":"req:R3","fields":{"then":"…"}}],"newItems":[{"kind":"req|test","for":"fd-…","fields":{"title":"…","given":"…","when":"…","then":"…"}}],"applied":[{"id":"fd-…","how":"one sentence"}],"summary":"one sentence"}`});
  return await runAI("fix", t("fx.fixing", {n: fs.length}), prompt, {step: "fix", pid: p.id, validate: o => o && (arr(o.items).length || arr(o.newItems).length)});
}
/** write the fixer's answer into the project (only known items, only their own fields) */
function applyFixAnswer(p, fs, r){
  const changed = [];
  for (const x of arr(r && r.items)){
    let ref = str(x.ref); const fields = x.fields && typeof x.fields === "object" ? x.fields : {};
    if (ref === "oos:all"){ applyFields(p, "oos:x", {lines: fields.lines}); changed.push(ref); continue; }
    if (ref === "const:all"){ applyFields(p, "const:x", {lines: fields.lines}); changed.push(ref); continue; }
    if (!fs.some(f => findingTargets(p, f).includes(ref))) continue;   // only items a finding named
    const before = itemSnapshotText(p, ref);
    if (applyFields(p, ref, fields) && itemSnapshotText(p, ref) !== before){ changed.push(ref); if (ref.startsWith("section:")){ const s = itemObj(p, ref); if (s) s.mirror = ""; } }
  }
  for (const ni of arr(r && r.newItems)){
    const f = fs.find(x => x.id === str(ni.for)) || fs[0]; const v = ni.fields || {};
    if (ni.kind === "req" && str(v.then)){ const rid = nextReqId(p); p.requirements.push({id: rid, title: str(v.title), given: str(v.given), when: str(v.when), then: str(v.then), priority: oneOf(v.priority, ["must","should","could"], "should"), dim: "", st: "assumed", manual: true, fromFinding: f.id}); changed.push("req:" + rid); f.targets = [...new Set([...findingTargets(p, f).filter(x => x !== "req:new"), "req:" + rid])]; }
    if (ni.kind === "test" && arr(v.criteria).length){ const tid = nextTestId(p); p.tests.push({id: tid, title: str(v.title), category: oneOf(v.category, ["normal","edge","adversarial","empty","language"], "edge"), input: str(v.input), simulated: str(v.simulated), reqIds: arr(v.reqIds).map(str), criteria: arr(v.criteria).map(str), heldOut: false, fromFinding: f.id}); changed.push("test:" + tid); }
  }
  return changed;
}
/* ---------- the checker: a separate AI that did not write the fix ---------- */
async function aiCheckBatch(p, fs, before, after){
  const prompt = buildPrompt("check-fix", {proj: p,
    role: "You are an independent checker. You did not write these fixes. For each problem, split it into its parts and decide for each part whether it is really solved, comparing the full text before and after. Be strict: a fix that only renames the problem is not a fix; a fix that solves the problem in a different place than expected is fine. Report a side effect only when the change really breaks another item, and name that item.",
    rules: null, context: projectContext(p, {only: ["north_star","goal_criteria","requirements","architecture"]}),
    body: `<problems>${JSON.stringify(fs.map(f => ({id: f.id, issue: f.issue, expectedFix: f.fix, items: findingTargets(p, f)})))}</problems>
<changes>${JSON.stringify(Object.keys(after).map(ref => ({ref, before: before[ref] || "(new item)", after: after[ref]})))}</changes>`,
    schema: `{"results":[{"id":"fd-…","parts":[{"part":"short description","resolved":true}],"resolved":true,"stillOff":"what is still wrong, one sentence, empty when resolved","sideEffects":[{"ref":"req:R7","issue":"one sentence"}]}]}`});
  const r = await runAI("confirm", t("fx.checking", {n: fs.length}), prompt, {step: "judge2", tier: "default", pid: p.id, validate: o => o && Array.isArray(o.results) && o.results.length > 0});
  return r ? arr(r.results) : null;
}
function lintErrSet(p, secIds){ return new Set(lintPackage(p).filter(l => l.sev === "error" && (!secIds || secIds.includes(l.sec))).map(l => l.sec + "|" + l.key)); }

/** fix a set of findings: groups that share items, up to 3 rounds each (the 2nd and 3rd with the checker's note) */
async function fixFindings(p, ids, {rounds = 3, quiet = false} = {}){
  const sum = {fixed: 0, partly: 0, needYou: 0, changed: new Set(), failed: 0};
  let todo = arr(p.findings).filter(f => ids.includes(f.id) && OPEN_F.includes(f.status));
  if (!todo.length) return sum;
  // groups of up to 4 findings that share at least one item
  const groups = [];
  for (const f of todo){ const tg = findingTargets(p, f); const g = groups.find(x => x.fs.length < 4 && x.tg.some(r => tg.includes(r))); if (g){ g.fs.push(f); tg.forEach(r => g.tg.includes(r) || g.tg.push(r)); } else groups.push({fs: [f], tg: [...tg]}); }
  for (const g of groups){
    let open = g.fs.slice(), notes = {};
    const okRefs = new Map();   // item → number of fix actions when a sibling's fix on it was confirmed: only later rounds are taken back there
    const grp = "g" + uid("x");   // the fix and its check are one Undo step together
    const orig = {}, acts = [];   // the text before the first round, and every round's action (so a rejected fix can be taken back completely)
    let lint0 = null;
    for (let round = 1; round <= rounds && open.length; round++){
      actClose(p.id);
      if (UI.finish && UI.finish.stop) break;
      const tg = [...new Set(open.flatMap(f => findingTargets(p, f)))];
      for (const [rf, v] of Object.entries(snapTargets(p, tg))) if (!(rf in orig)) orig[rf] = v;
      const before = orig; if (!lint0) lint0 = lintErrSet(p);
      const r = await aiFixBatch(p, open, notes);
      if (!r){ sum.failed++; break; }
      // the fix is one action of its own, opened and closed around the change (no wait in between, so no click can split it)
      actOpen(p, t("fx.act", {x: trunc(open[0].issue, 50)}), {by: "pt", grp});
      const changed = applyFixAnswer(p, open, r);
      const actA = actClose(p.id); if (actA) acts.push(actA);
      if (!changed.length){ for (const f of open){ f.audit = arr(f.audit); f.audit.push({at: now(), what: t("aud.notapplied"), by: t("aud.fixer")}); } break; }
      const after = snapTargets(p, changed);
      const res = await aiCheckBatch(p, open, before, after);
      actOpen(p, t("fx.act", {x: trunc(open[0].issue, 50)}) + " · " + t("aud.checker"), {by: "pt", grp});   // what the check decides belongs to the same Undo step as the fix
      if (!res){ for (const f of open){ f.status = "waiting"; f.audit = arr(f.audit); f.audit.push({at: now(), what: t("fx.notchecked"), by: t("aud.checker")}); } sum.failed++; break; }
      const newLint = [...lintErrSet(p)].filter(x => !lint0.has(x));
      const next = [];
      for (const f of open){
        const x = res.find(y => str(y.id) === f.id) || null;
        const parts = arr(x && x.parts).map(q => ({part: str(q.part), resolved: !!q.resolved}));
        const mine = findingTargets(p, f).filter(rf => changed.includes(rf));
        const lintHit = newLint.some(l => mine.includes("section:" + l.split("|")[0]));
        f.fixRun = {at: now(), round, act: actA && actA.id, before: Object.fromEntries(mine.map(rf => [rf, before[rf] || ""])), after: Object.fromEntries(mine.map(rf => [rf, after[rf] || ""]))};
        f.before = Object.values(f.fixRun.before).join("\n\n"); f.after = Object.values(f.fixRun.after).join("\n\n");
        f.parts = parts; f.audit = arr(f.audit);
        if (x && x.resolved && !lintHit && (!parts.length || parts.every(q => q.resolved))){
          f.status = "done"; f.doneAt = now(); f.fixedBy = "pt"; f.checked = true; f.partly = null; f.needsYou = null; f.proposal = null;
          f.audit.push({at: now(), what: t("aud.confirmed") + (x.stillOff ? ": " + str(x.stillOff) : ""), by: t("aud.checker")});
          for (const rf of mine) markPT(p, rf, "fixed", trunc(f.issue, 200));
          if (actA) for (const rf of mine) if (p.marks && p.marks[rf]) p.marks[rf].act = actA.id;
          sum.fixed++; mine.forEach(rf => { sum.changed.add(rf); if (!okRefs.has(rf)) okRefs.set(rf, acts.length); });
          for (const se of arr(x.sideEffects)) addSideEffect(p, f, se);
        } else {
          const done = parts.filter(q => q.resolved).length;
          f.partly = parts.length && done ? {done, total: parts.length} : null;
          notes[f.id] = str(x && x.stillOff) || (lintHit ? t("fx.lintnew") : t("fx.notsolved"));
          f.audit.push({at: now(), what: t("aud.notconfirmed") + ": " + notes[f.id], by: t("aud.checker")});
          next.push(f);
        }
      }
      // what the checker rejected in the last round is taken back; it comes to you as a proposal with the reason
      if (round === rounds || (UI.finish && UI.finish.stop)){
        for (const f of next){
          const mine = Object.keys(f.fixRun ? f.fixRun.after : {});
          f.proposal = {at: now(), fields: Object.fromEntries(mine.map(rf => [rf, (itemObj(p, rf) ? Object.fromEntries(targetFields(rf).map(fl => [fl, (itemObj(p, rf) || {})[fl]])) : {})])), note: notes[f.id], round};
          if (!f.partly){ const kept = new Set(); for (let ai = acts.length - 1; ai >= 0; ai--){ const back = mine.filter(rf => !okRefs.has(rf) || ai >= okRefs.get(rf)); revertRefs(p, acts[ai], back, kept); } for (const rf of kept) markPT(p, rf, "changed", t("fx.notback", {x: trunc(f.issue, 120)})); }
          else { for (const rf of mine) markPT(p, rf, "changed", t("fx.partlywhy", {a: f.partly.done, b: f.partly.total, x: trunc(f.issue, 120)})); sum.partly++; }
          f.status = "open"; f.needsYou = {why: notes[f.id], at: now()}; f.reopened = (f.reopened || 0) + 1;
          sum.needYou++;
        }
        break;
      }
      open = next;
    }
    actClose(p.id);
  }
  // package text changed: a new draft, so review and tests count again for the new text
  if ([...sum.changed].some(rf => rf.startsWith("section:")) || arr(p.findings).some(f => ids.includes(f.id) && f.partly && Object.keys((f.fixRun || {}).after || {}).some(rf => rf.startsWith("section:")))){ actOpen(p, t("fx.version"), {by: "pt"}); saveVersion(p, t("fx.version")); actClose(p.id); }
  touch(p);
  logAct(p, t("fx.log", {a: sum.fixed, b: sum.needYou}), {step: p.focus.ph, important: true, kind: "fix"});
  if (!quiet){ render(); toast(t("fx.toast", {a: sum.fixed, b: sum.needYou}), sum.needYou ? "" : "ok"); }
  return sum;
}
/** take back the changes of one fixer action for the given items only */
function revertRefs(p, a, refs, kept = null){
  if (!a) return;
  for (const e of a.patch.slice().reverse()){
    const r = entryRef(e) || (e.path === "outOfScope" ? "oos:all" : e.path === "constitution" ? "const:all" : null);
    if (!r || !refs.includes(r)) continue;
    // only what is still exactly as the fix left it is taken back: your own edits made meanwhile are never overwritten
    if (e.whole){ const cur = getAt(p, e.path); if (JSON.stringify(cur === undefined ? null : cur) !== JSON.stringify(e.after)){ if (kept) kept.add(r); continue; } setAt(p, e.path, e.before == null ? null : clone(e.before)); continue; }
    const list = getAt(p, e.path) || []; const i = list.findIndex(x => x && String(x[listKey(e.path)]) === String(e.id));
    if ((i >= 0 ? JSON.stringify(list[i]) : "null") !== JSON.stringify(e.after)){ if (kept) kept.add(r); continue; }
    if (e.before == null){ if (i >= 0) list.splice(i, 1); } else if (i >= 0) list[i] = clone(e.before); else list.splice(Math.min(e.pos, list.length), 0, clone(e.before));
  }
}
function addSideEffect(p, parent, se){
  const ref = str(se.ref), issue = str(se.issue); if (!issue) return;
  if (arr(p.findings).some(f => OPEN_F.includes(f.status) && similar(f.issue, issue))) return;
  p.findings.push({id: uid("fd"), lens: parent.lens, severity: "medium", cls: "should", section: ref.startsWith("section:") ? ref.slice(8) : "", item: ref, where: "", issue, fix: "", status: "open", version: p.versionNo, at: now(), stage: "recheck", step: parent.step || PHASE_OF[ref.split(":")[0]] || "", targets: itemExists(p, ref) ? [ref] : findingTargets(p, parent), audit: [{at: now(), what: t("aud.found"), by: t("aud.checker")}], reopened: 0, from: parent.id});
}
/** apply the proposal PT kept for a finding the checker did not confirm (you decided it is right) */
function applyProposal(p, f){
  const pr = f.proposal; if (!pr) return false;
  for (const [ref, fields] of Object.entries(pr.fields || {})){ if (ref.endsWith(":all")) applyFields(p, ref.replace(":all", ":x"), fields); else applyFields(p, ref, fields, {confirm: true}); markRef(p, ref, "fixed"); }
  if (Object.keys(pr.fields || {}).some(rf => rf.startsWith("section:"))) saveVersion(p, t("fx.version"));
  f.status = "done"; f.doneAt = now(); f.fixedBy = "you"; f.proposal = null; f.needsYou = null;
  f.audit = arr(f.audit); f.audit.push({at: now(), what: t("fx.appliedbyyou"), by: wsLabel(WS.name)});
  return true;
}

/* ---------- the names the rest of PT uses ---------- */
async function aiApplyFixes(p, ids){ return fixFindings(p, ids); }
async function aiFixEarly(p, f){ return fixFindings(p, [f.id]); }
/** findings left "waiting" by older versions: the checker looks at the stored before/after once */
async function aiConfirmFixes(p, ids){
  const fs = arr(p.findings).filter(f => ids.includes(f.id) && f.status === "waiting"); if (!fs.length) return;
  const res = await aiCheckBatch(p, fs, Object.fromEntries(fs.map(f => [f.id, str(f.before)])), Object.fromEntries(fs.map(f => [f.id, str(f.after)])));
  if (!res) return;
  for (const f of fs){ const x = res.find(y => str(y.id) === f.id); f.audit = arr(f.audit); if (x && x.resolved){ f.status = "done"; f.doneAt = now(); f.checked = true; f.audit.push({at: now(), what: t("aud.confirmed"), by: t("aud.checker")}); } else { f.status = "open"; f.needsYou = {why: str(x && x.stillOff) || t("fx.notsolved"), at: now()}; f.audit.push({at: now(), what: t("aud.notconfirmed"), by: t("aud.checker")}); } }
  touch(p); render();
}
/** cost of fixing: one fixer call and one checker call per group, retries counted as one more round on average */
function fixCost(p, ids){ const n = arr(p.findings).filter(f => ids.includes(f.id) && OPEN_F.includes(f.status)).length; const groups = Math.ceil(n / 3); return Math.round(groups * (TIER_WEIGHT.complex + TIER_WEIGHT.default) * 1.5); }
