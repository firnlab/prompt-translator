/* ===================== 1.3 TASKS: translation view, refine, re-check, change my mind ===================== */
function langLabel(l){ return (LANGS.find(x => x.id === l) || LANGS[0]).label; }

/* ---------- translation view: a read-only copy in the reader's language; the original is never changed ---------- */
function trSource(it){ return str(it.title) + "\n" + str(it.body || [it.g, it.w, it.th].filter(Boolean).join(" · ")); }
function trOf(p, it){ const c = p.tr && p.tr[LANG] && p.tr[LANG][it.ref]; return c && c.h === hash64(trSource(it)) ? c : null; }
async function aiTranslateStep(p, ph){
  const items = (SPECIAL.includes(ph) ? [] : itemsOf(p, ph)).filter(it => !trOf(p, it)).slice(0, 60);
  if (!items.length) return true;
  const list = items.map(it => ({ref: it.ref, title: trunc(it.title, 300), body: trunc(trSource(it).split("\n").slice(1).join("\n"), 1500)}));
  const prompt = buildPrompt("translate-view", {rules: null, userLang: false,
    body: `Translate these project items into ${langName(LANG)} so a reader can follow a project written in ${langName(p.lang)}. Translate meaning in context, keep names, numbers, ids, file names and code exactly. Do not add or drop anything.
<items>${JSON.stringify(list)}</items>`,
    schema: `{"items":[{"ref":"req:R1","title":"…","body":"…"}]}`});
  const r = await runAI("translate", t("tr.translating"), prompt, {step: "notes", validate: o => o && Array.isArray(o.items)});
  if (!r) return false;
  const lp = liveP(p); lp.tr = lp.tr || {}; lp.tr[LANG] = lp.tr[LANG] || {};
  for (const x of arr(r.items)){ const it = items.find(i => i.ref === x.ref); if (it) lp.tr[LANG][it.ref] = {h: hash64(trSource(it)), title: str(x.title), body: str(x.body), at: now()}; }
  touch(lp); render(); return true;
}

/* ---------- change my mind (B5) and re-check with PT (B3): one review list, every change is ticked by the person ---------- */
const REMOVABLE = ["req", "assumption", "risk", "test"];
function itemDigest(p, {only = null, max = 360} = {}){
  return allItems(p).filter(i => !["pq", "nsdraft"].includes(i.kind) && (!only || only.has(i.ref))).map(i => ({ref: i.ref, step: i.ph, id: i.id, kind: itemKindOf(i.ref), text: trunc(itemSnapshotText(p, i.ref) || (i.title + " — " + str(i.body)), i.kind === "section" ? 500 : max)}));
}
function fieldsHelp(){ return Object.entries(ITEM_FIELDS).map(([k, f]) => k + ": " + f.join(", ")).join("; "); }
function cleanImpact(p, r){
  const known = new Set(allItems(p).map(i => i.ref));
  const items = arr(r && r.items).map(x => ({ref: str(x.ref), why: str(x.why), action: oneOf(x.action, ["update", "remove", "review", "ok"], "review"), fields: x.fields && typeof x.fields === "object" ? x.fields : {}}))
    .filter(x => known.has(x.ref)).map(x => (x.action === "remove" && !REMOVABLE.includes(x.ref.split(":")[0])) ? Object.assign(x, {action: "review"}) : x)
    .map(x => (x.action === "update" && !Object.keys(x.fields).length) ? Object.assign(x, {action: "review"}) : x)
    .map(x => (x.ref.startsWith("section:") && x.action === "update") ? Object.assign(x, {action: "review", fields: {}}) : x);
  const seen = new Set(); return {decision: str(r && r.decision), old: str(r && r.old), summary: str(r && r.summary), items: items.filter(x => !seen.has(x.ref) && seen.add(x.ref)).map(x => Object.assign(x, {on: x.action !== "ok" || true, edit: {}}))};
}
async function aiImpact(p, wish, {verify = false, decision = ""} = {}){
  const digest = itemDigest(p);
  const body = verify
    ? `The person changed their mind earlier. Their decision now: <decision>${decision || wish}</decision>
Check every item below. List only the items that STILL contradict this decision or still depend on the old way, with what to change. If nothing is left, return an empty "items" list.`
    : `The person changed their mind about their project: <wish>${wish}</wish>
Find EVERY item below that comes from the old choice, contradicts the new wish, or depends on it, and say how it must change so the whole design follows the new wish. Leave items that are not affected out. Do not invent new features.`;
  const prompt = buildPrompt(verify ? "mindchange-verify" : "mindchange", {rules: ["spec"], context: projectContext(p, {max: 12000}),
    body: `${body}
<items>${JSON.stringify(digest)}</items>
For each affected item give: "ref", "why" (one sentence: what in it conflicts or depends on the old way), and "action":
- "update" with "fields": the complete new values of only the fields that change (field names per kind: ${fieldsHelp()}; criteria is an array of strings),
- "remove" (only for kinds req, assumption, risk, test) when the item only exists because of the old way,
- "review" for package sections (kind section) and anything you cannot rewrite safely; it gets marked for the person to look at.
Also give "decision" (one line: the decision as it is now) and "old" (one line: what it replaces).`,
    schema: `{"decision":"…","old":"…","summary":"one or two sentences","items":[{"ref":"req:R3","why":"…","action":"update","fields":{"then":"…"}}]}`});
  const r = await runAI("impact", t(verify ? "cm.verifying" : "cm.finding"), prompt, {step: "item", validate: o => o && Array.isArray(o.items)});
  return r ? cleanImpact(p, r) : null;
}
async function aiRecheck(p){
  const fl = arr(p.flags).slice(0, 30); if (!fl.length) return null;
  const only = new Set(fl.map(f => f.ref));
  const digest = itemDigest(p, {only, max: 700}).map(d => Object.assign(d, {flagged_because: str((fl.find(f => f.ref === d.ref) || {}).because)}));
  const prompt = buildPrompt("recheck", {rules: ["spec"], context: projectContext(p, {max: 16000}),
    body: `These items were marked "may need updating" because something they depend on changed. With everything the project says now, decide for each:
- "ok": it is still correct as it is (the mark is removed),
- "update" with "fields": the complete new values of only the fields that must change (field names per kind: ${fieldsHelp()}),
- "review": a package section or anything you cannot rewrite safely; the person looks at it.
<items>${JSON.stringify(digest)}</items>
Give "why" for each in one sentence.`,
    schema: `{"summary":"…","items":[{"ref":"req:R3","why":"…","action":"ok","fields":{}}]}`});
  const r = await runAI("recheck", t("rc.checking"), prompt, {step: "check", validate: o => o && Array.isArray(o.items)});
  return r ? cleanImpact(p, r) : null;
}
/** write new field values into one item (no restore point: the caller makes one for the whole batch) */
function applyFields(p, ref, fields){
  const o = itemObj(p, ref); if (!o) return false;
  const [kind, id] = ref.split(":");
  for (const [f, v] of Object.entries(fields || {})){
    if (kind === "intake"){ if (id === "clean" && f === "clean") p.intake.clean = str(v); else if (id === "raw" && f === "raw") p.intake.raw = str(v); continue; }
    if (kind === "und"){ if (f !== "text") continue; const u = p.understand; if (id === "root") u.rootNeed = str(v); else if (id === "jtbd") u.jtbd = str(v); else if (id === "walk") u.walkthrough = str(v); continue; }
    if (kind === "arch"){ if (f === "why") p.arch.why = str(v); continue; }
    if (!(ITEM_FIELDS[itemKindOf(ref)] || []).includes(f)) continue;
    o[f] = f === "criteria" ? arr(v).map(str) : str(v);
  }
  if (o.st === "assumed") o.st = "ok";
  return true;
}
