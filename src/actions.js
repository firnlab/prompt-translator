/* ===================== ACTIONS ===================== */
function slug(s){ return String(s || "file").toLowerCase().replace(/[^a-z0-9一-鿿]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "file"; }
function confirmBox(title, text, yes, cb){ UI.modal = {kind:"confirm", title, text, yes, cb}; render(); }
function promptBox(title, {value="", ph="", type="text", help="", yes=""} = {}, cb){ UI.modal = {kind:"prompt", title, value, ph, type, help, yes, cb}; render(); focusSoon("pr-in"); }
const PHASE_OF = {dim:"interview", req:"require", assumption:"assume", risk:"assume", section:"build", test:"test", component:"arch", finding:"review", ns:"capture"};
async function loadJSZip(){
  if (window.JSZip) return window.JSZip;
  await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  return window.JSZip;
}
async function skillZip(name, md){
  try{ const JSZip = await loadJSZip(); const z = new JSZip(); z.folder(name).file("SKILL.md", md); const blob = await z.generateAsync({type:"blob"}); await saveFile(name + ".zip", blob); }
  catch(e){ toast(t("err.zip"), "err"); }
}
/** 1.5.0: a skill name the platform accepts: lowercase a-z, 0-9 and dashes, at most 64, never "claude" or "anthropic" (a name in another script gets a safe one) */
function skillName(s){
  let n = String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/claude|anthropic/g, "").replace(/[^a-z0-9]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/, "");
  return n.length >= 3 ? n : "skill-" + hashStr(String(s || "x")).slice(0, 8);
}
function skillFromSection(s){
  const c = str(s.content);
  const fm0 = /^\s*---/.test(c) ? str(c.split(/^---\s*$/m)[1]) : "";   // the name is read from the frontmatter only, never from the body
  const given = (fm0.match(/^\s*name:\s*(.+)$/im) || [])[1] || s.title;
  const nm = skillName(given);
  let md;
  if (/^---/.test(c.trim())){   // the frontmatter is kept, with a valid name and a description within the claude.ai limit
    const parts = c.split(/^---\s*$/m);   // ["", frontmatter, body …]: only the frontmatter is changed
    let fm = str(parts[1]); fm = /^\s*name:/im.test(fm) ? fm.replace(/^(\s*)name:.*$/im, (m0, sp) => sp + "name: " + nm) : "\nname: " + nm + fm;
    fm = fm.replace(/^(\s*description:\s*)(.*)$/im, (m0, pre, d) => pre + (d.length > 200 ? trunc(d, 195) : d));
    md = [parts[0], fm, ...parts.slice(2)].join("---");
  } else md = `---\nname: ${nm}\ndescription: ${trunc((s.why || s.title).replace(/\s+/g, " "), 190)}\n---\n\n${c}`;
  return {name: nm, md};
}
function packageMarkdown(p){
  const secs = arr(p.pkg.sections);
  return `# ${p.name} — ${t("build.title")}\n\n${t("build.target")}: ${modelLabel(p.pkg.targetModel || p.targetModel)} · v${p.versionNo} · ${fmtDay(p.pkg.compiledAt)}\n\n` + secs.map(s => `## ${L(DEST[s.dest])}: ${s.title}${s.filename ? " (" + s.filename + ")" : ""}${s.cadence ? " — " + s.cadence : ""}\n\n\`\`\`\n${s.content}\n\`\`\`\n`).join("\n");
}
function specMarkdown(p){
  const ns = p.northStar, a = p.arch, L2 = x => "- " + x;
  const opt = a.options.find(o => o.id === (a.chosen || a.recommended));
  return [`# ${p.name}`, `_${t("data.specgen")} ${fmtDate(now())}_`,
    `## ${t("ns.title")}`, ...["problem","goal","success","users","constraints","now"].map(k => `**${t("ns." + k)}:** ${ns[k] || "—"}`),
    p.intake.clean ? `## ${t("cap.cleaned")}\n${p.intake.clean}` : "",
    `## ${t("int.radar")}`, ...DIMS.map(d => `- **${L(d)}** (${t("st." + ((p.dims[d.id]||{}).status || "unknown"))}): ${(p.dims[d.id]||{}).summary || ""}`),
    p.assumptions.length ? `## ${t("as.title")}\n` + p.assumptions.map(x => L2(`${x.text} (${t("acat." + x.category)}, ${t("as.impact")} ${x.impact}, ${t("as.risk")} ${x.risk}, ${t("ast." + x.status)})`)).join("\n") : "",
    p.risks.length ? `## ${t("rk.title")}\n` + p.risks.map(x => L2(`${x.text} — ${t("rk.mitigation")}: ${x.mitigation || "—"} (${t("rks." + x.status)})`)).join("\n") : "",
    p.requirements.length ? `## ${t("req.title")}\n` + p.requirements.map(r => L2(`**${r.id} ${r.title}** (${t("pri." + r.priority)}) — ${t("req.given")} ${r.given}, ${t("req.when")} ${r.when}, ${t("req.then")} ${r.then}`)).join("\n") : "",
    p.outOfScope.length ? `## ${t("req.oos")}\n` + p.outOfScope.map(L2).join("\n") : "",
    p.constitution.length ? `## ${t("req.const")}\n` + p.constitution.map(L2).join("\n") : "",
    opt ? `## ${t("arch.title")}\n**${opt.name}** — ${opt.summary}\n\n${a.why}\n\n` + a.components.map(c => L2(`**${c.name}** [${t("kind." + c.kind)}] ${c.role} (${t("arch.in")}: ${c.inputs}; ${t("arch.out")}: ${c.outputs})`)).join("\n") : "",
    arr(p.pkg.sections).length ? (copyUnlocked(p) ? packageMarkdown(p).replace(/^# .*\n/, `## ${t("build.title")}\n`) : `## ${t("build.title")}\n\n${t("spec.pkglocked")}\n`) : "",
    p.tests.length ? `## ${t("test.title")}\n` + p.tests.map(x => L2(`**${x.id} ${x.title}** (${t("tcat." + x.category)}${x.heldOut ? ", " + t("test.heldout") : ""}): ${x.criteria.join("; ")}`)).join("\n") : "",
    p.decisions.length ? `## ${t("log.tab.decisions")}\n` + p.decisions.map(d => L2(`${fmtDay(d.at)} — ${d.title}: ${d.choice}${d.reason ? " (" + d.reason + ")" : ""}`)).join("\n") : ""
  ].filter(Boolean).join("\n\n");
}
async function resizeImage(file, max=1400, type="image/jpeg", q=.85){
  const url = URL.createObjectURL(file);
  try{
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return {canvas: c, blob: await new Promise(r => c.toBlob(r, type, q))};
  } finally { URL.revokeObjectURL(url); }
}
async function loadToolFeedback(){
  UI.tfbLoading = true; render();
  try{ WS.toolfb = (await Store.list("toolfeedback")).sort((a,b) => (b.at||"").localeCompare(a.at||"")); }catch(e){ WS.toolfb = []; }
  UI.tfbLoading = false; render();
}

const ACTIONS = {
  "nav": el => { UI.view = el.dataset.v; if (el.dataset.settab) UI.setTab = el.dataset.settab; UI.modal = null; render(); const m = $(".main"); if (m) m.scrollTop = 0; },
  "ws-menu": () => { UI.modal = {kind:"wsmenu"}; render(); },
  "open-project": el => { UI.modal = null; if (UI.view === "project" && UI.pid === el.dataset.id && !el.dataset.phase){ UI.home = true; render(); const m = document.querySelector(".main"); if (m) m.scrollTo({top: 0}); return; }   // the project you are in: back to its overview
    openProject(el.dataset.id, el.dataset.phase); },
  "new-project": () => newProject(),
  "palette": () => { UI.palette = true; UI.palQ = ""; UI.palSel = 0; render(); focusSoon("pal-in"); },
  "capture": () => { UI.capture = true; render(); focusSoon("cap-in"); },
  "lock": () => lockNow(),
  "pick-ws": el => { const w = META.workspaces.find(x => x.id === el.dataset.id); if (w.pinHash){ UI.lockFor = w.id; UI.pinError = false; render(); focusSoon("pin"); } else openWorkspace(w.id); },
  "lock-back": () => { UI.lockFor = null; render(); },
  "boot-lang": el => { LANG = el.dataset.l; UI.pendingLang = el.dataset.l; Store.lsSet("lastLang", LANG); applyLangAttr(); render(); },
  "toggle-archived": () => { UI.showArchived = !UI.showArchived; render(); },
  "undo": () => undo(),
  "align": () => aiAlign(curP()),
  "dismiss-align": () => { curP().alignment = null; touch(curP()); render(); },
  "dismiss-brief": () => { UI.briefing = false; render(); },
  "phase": el => setPhase(el.dataset.ph),
  "toggle-drawer": () => { UI.drawer = !UI.drawer; render(); },
  "recap": () => aiRecap(curP()),
  "project-menu": () => { UI.modal = {kind:"projmenu"}; render(); },
  "edit-ns": () => { UI.modal = {kind:"ns", wide:true}; render(); focusSoon("ns-problem"); },
  "fs-done": el => { const p = curP(); const f = p.foresight.find(x => x.id === el.dataset.id); if (f) f.done = true; else p.fsDone[el.dataset.id] = true; touch(p); render(); },
  "anchor-note": el => { UI.modal = {kind:"anchor", item: el.dataset.item, label: el.dataset.label, akind: el.dataset.kind}; render(); focusSoon("an-text"); },
  "research": el => { UI.modal = {kind:"research", topic: el.dataset.topic || "", wide:true}; render(); focusSoon(el.dataset.topic ? "res-paste" : "res-topic"); },
  "res-copy": () => copyText($("#res-brief").textContent),
  "ai-stop": el => stopAI(el.dataset.key),
  "close-overlay": (el, e) => { if (e && e.target !== el) return; UI.modal = null; UI.palette = false; UI.capture = false; render(); },
  "modal-close": () => { UI.modal = null; render(); },
  "confirm-yes": () => { const cb = UI.modal && UI.modal.cb; UI.modal = null; if (cb) cb(); render(); },
  "pal-run": el => { const c = PALETTE_CMDS().find(x => x.k === el.dataset.k); UI.palette = false; if (c) c.run(); else render(); },

  /* notes */
  "note-edit": el => { UI.editNote = UI.editNote === el.dataset.id ? null : el.dataset.id; render(); if (UI.editNote) focusSoon("ne-" + el.dataset.id); },
  "note-pin": el => { const n = WS.notes.find(x => x.id === el.dataset.id); n.pinned = !n.pinned; saveNote(n); render(); },
  "note-file": el => { const n = WS.notes.find(x => x.id === el.dataset.id); n.inbox = false; saveNote(n); render(); toast(t("notes.filed"), "ok"); },
  "note-copy": el => copyText(WS.notes.find(x => x.id === el.dataset.id).text),
  "note-del": el => { const n = WS.notes.find(x => x.id === el.dataset.id); n.deletedAt = now(); saveNote(n); render(); toast(t("notes.trashed"), "ok"); },
  "note-restore": el => { const n = WS.notes.find(x => x.id === el.dataset.id); n.deletedAt = null; saveNote(n); render(); },
  "note-history": el => { UI.modal = {kind:"history", id: el.dataset.id}; render(); },
  "note-revert": el => { const n = WS.notes.find(x => x.id === el.dataset.id); const h = n.history[num(el.dataset.i)]; if (h){ editNote(n, h.text); } UI.modal = null; render(); toast(t("notes.reverted"), "ok"); },
  "note-translate": async el => { const n = WS.notes.find(x => x.id === el.dataset.id); if (n.translation){ n.translation = ""; render(); return; } const r = await aiTranslateNote(n, LANG); if (r){ n.translation = r; render(); } },
  "goto-anchor": el => { const n = WS.notes.find(x => x.id === el.dataset.id); if (!n || !n.anchor) return; UI.modal = null; openProject(n.anchor.projectId, PHASE_OF[n.anchor.kind] || "capture"); },
  "notes-filter": el => { UI.notesFilter = el.dataset.f; UI.triage = null; render(); if (el.dataset.f === "claude") loadToolFeedback(); },
  "triage": async () => { const inbox = WS.notes.filter(n => n.inbox && !n.deletedAt).slice(0, 40); const r = await aiTriage(inbox); if (r){ UI.triage = r; render(); } },
  "tri-cancel": () => { UI.triage = null; render(); },
  "tri-apply": () => {
    let done = 0, skipped = 0;
    for (const it of UI.triage || []){
      if (!it.accept) continue;
      const n = WS.notes.find(x => x.id === it.noteId); if (!n) continue;
      const p = n.projectId ? WS.projects.find(x => x.id === n.projectId) : null;
      if (!p && !["pattern","keep"].includes(it.become)){ skipped++; continue; }
      if (p) snapshot(p);
      if (it.become === "requirement") p.requirements.push({id: nextReqId(p), title: trunc(it.text, 60), given:"", when:"", then: it.text, priority:"should", manual:true});
      if (it.become === "assumption") p.assumptions.push({id:uid("as"), text: it.text, category:"feasibility", impact:3, risk:3, status:"untested", test:""});
      if (it.become === "question") p.pendingQs.push({id:uid("q"), dim:"scope", text: it.text, why:"", options:[], recommended:-1});
      if (it.become === "risk") p.risks.push({id:uid("rk"), text: it.text, likelihood:3, impact:3, mitigation:"", status:"open", source:"notes"});
      if (it.become === "task") p.openQs.push({id:uid("oq"), text: it.text, done:false});
      if (it.become === "pattern"){ const x = {id:uid("pt"), title: trunc(it.text, 60), desc:"", body: n.text, kind:"block", createdAt: now()}; WS.patterns.push(x); Store.put(wsPath() + "/patterns/" + x.id, x); }
      if (p) touch(p);
      n.inbox = false; n.filedAs = it.become; saveNote(n); done++;
    }
    UI.triage = null; render(); toast(t("notes.triaged", {n: done}) + (skipped ? " " + t("notes.skipped", {n: skipped}) : ""), "ok");
  },

  /* capture */
  "clarify": () => aiClarify(curP()),
  "clear-images": () => { curP()._images = []; render(); },
  "ns-discard": () => { curP().nsDraft = null; touch(curP()); render(); },
  "ns-accept": () => { const p = curP(); snapshot(p); p.northStar = Object.assign({}, p.northStar, p.nsDraft); p.nsDraft = null; logDecision(p, t("ns.title"), p.northStar.goal, t("dec.nsaccepted")); touch(p); render(); toast(t("ns.saved"), "ok"); },
  "ask-later": el => { const p = curP(); p.pendingQs.push({id:uid("q"), dim:"scope", text: el.dataset.text, why:"", options:[], recommended:-1}); touch(p); toast(t("cap.queued"), "ok"); render(); },

  /* understand */
  "understand": el => aiUnderstand(curP(), el.dataset.kind),
  "reframe-pick": el => { const p = curP(); const r = p.understand.reframes.find(x => x.id === el.dataset.id); r.chosen = !r.chosen; if (r.chosen) logDecision(p, t("und.reframe"), r.text, ""); touch(p); render(); },

  /* interview */
  /* interview: see v14_interview.js */

  /* assumptions / risks / lists */
  "scroll-to": el => { const x = document.getElementById(el.dataset.id); if (x) x.scrollIntoView({behavior:"smooth", block:"center"}); },
  "del-item": el => { const p = curP(); confirmBox(t("btn.delete"), t("confirm.item"), t("btn.delete"), () => { snapshot(p); p[el.dataset.list] = p[el.dataset.list].filter(x => x.id !== el.dataset.id); touch(p); toast(t("toast.deleted"), "ok"); }); },
  "add-assumption": () => { const p = curP(); p.assumptions.unshift({id:uid("as"), text:"", category:"feasibility", impact:3, risk:3, status:"untested", test:""}); touch(p); render(); },
  "add-risk": () => { const p = curP(); p.risks.unshift({id:uid("rk"), text:"", likelihood:3, impact:3, mitigation:"", status:"open", source:"manual"}); touch(p); render(); },
  "add-req": () => { const p = curP(); p.requirements.push({id: nextReqId(p), title:"", given:"", when:"", then:"", priority:"should", manual:true}); touch(p); render(); },

  /* architecture */
  "architecture": () => aiArchitecture(curP()),
  "mockup": () => aiMockup(curP()),

  /* build */
  "tab": el => { UI[el.dataset.t] = el.dataset.v; render(); },
  "compile": () => { const p = curP(); if (!p.arch.chosen && !p.arch.recommended){ confirmBox(t("build.compile"), t("build.noarch"), t("build.compileanyway"), () => aiCompile(p)); return; } aiCompile(p); },
  "mirror": () => aiMirror(curP()),
  "copy-all": () => copyText(packageMarkdown(curP())),
  "dl-all": () => { const p = curP(); saveFile(slug(p.name) + "-package-v" + p.versionNo + ".md", packageMarkdown(p)); },
  "dl-skills": async () => { const secs = curP().pkg.sections.filter(s => s.dest === "skill"); for (const s of secs){ const k = skillFromSection(s); await skillZip(k.name, k.md); } },
  "sec-copy": el => { const s = curP().pkg.sections.find(x => x.id === el.dataset.id); if (s) copyText(s.content); },
  "sec-dl": el => { const s = curP().pkg.sections.find(x => x.id === el.dataset.id); if (s) saveFile(slug(str(s.filename || s.title).replace(/\.[a-z0-9]{1,5}$/i, "")) + ".md", s.content); },
  "sec-edit": el => { const k = "ed-" + el.dataset.id; const p = curP(); if (UI.expanded.has(k)){ UI.expanded.delete(k); saveVersion(p, t("ver.edited")); touch(p); } else { snapshot(p); UI.expanded.add(k); } render(); },
  "sec-pattern": el => { const p = curP(); const s = p.pkg.sections.find(x => x.id === el.dataset.id); const lr = p.runs.find(r => r.label !== "candidate"); const x = {id:uid("pt"), title: s.title, desc: s.why, body: s.content, kind:"block", evidence: t("lib.evidence", {p: p.name, v: p.versionNo, r: lr ? lr.passRate + "%" : "—"}), createdAt: now()}; WS.patterns.push(x); Store.put(wsPath() + "/patterns/" + x.id, x); toast(t("lib.saved"), "ok"); },
  "sec-skill": async el => { const s = curP().pkg.sections.find(x => x.id === el.dataset.id); UI.modal = {kind:"skill", skill:null}; render(); const r = await aiSkill(s.content); if (UI.modal && UI.modal.kind === "skill"){ if (r){ UI.modal.skill = r; } else UI.modal = null; render(); } },
  "goto-sec": el => { UI.phase = "build"; UI.buildTab = "package"; render(); const x = document.getElementById("sec-" + el.dataset.id); if (x) x.scrollIntoView({behavior:"smooth", block:"start"}); },
  "ver-diff": async el => { const p = curP(); UI.modal = {kind:"diff", wide:true, version:null}; render(); const v = await loadVersion(p, num(el.dataset.no)); if (UI.modal && UI.modal.kind === "diff"){ if (v){ UI.modal.version = v; } else { UI.modal = null; toast(t("err.load"), "err"); } render(); } },
  "ver-restore": el => { const p = curP(); const no = num(el.dataset.no); confirmBox(t("ver.restore"), t("ver.restoreq", {v: no}), t("ver.restore"), async () => { const v = await loadVersion(p, no); if (!v){ toast(t("err.load"), "err"); return; } snapshot(p); p.pkg.sections = clone(v.sections); saveVersion(p, t("ver.restored", {v: no})); logDecision(p, t("ver.restore"), "v" + no, ""); touch(p); render(); toast(t("ver.restoreddone"), "ok"); }); },

  /* review */
  "review": () => aiReview(curP(), [...UI.lensSel]),
  "sel-all-findings": () => { const open = curP().findings.filter(f => f.status === "open").map(f => f.id); if (open.every(id => UI.selFindings.has(id))) UI.selFindings.clear(); else open.forEach(id => UI.selFindings.add(id)); render(); },
  "apply-fixes": async () => { const ids = [...UI.selFindings]; UI.selFindings.clear(); await aiApplyFixes(curP(), ids); },
  "finding-dismiss": el => { const f = curP().findings.find(x => x.id === el.dataset.id); f.status = "dismissed"; UI.selFindings.delete(f.id); touch(curP()); render(); },
  "finding-done": el => { const f = curP().findings.find(x => x.id === el.dataset.id); f.status = "fixed"; UI.selFindings.delete(f.id); touch(curP()); render(); },

  /* tests */
  "gen-tests": () => aiTests(curP()),
  "add-test": () => { const p = curP(); const id = nextTestId(p); p.tests.push({id, title:"", category:"normal", input:"", simulated:"", reqIds:[], criteria:[], heldOut:false}); UI.expanded.add("t-" + id); touch(p); render(); },
  "toggle-exp": el => { const k = el.dataset.k; UI.expanded.has(k) ? UI.expanded.delete(k) : UI.expanded.add(k); render(); },
  "run-tests": () => { const p = curP(); const w = UI.runWhich || "all"; const ids = p.tests.filter(x => w === "all" || (w === "held" ? x.heldOut : !x.heldOut)).map(x => x.id); aiRunTests(p, {ids, trials: num(UI.trials, TRIALS) || TRIALS}); },
  "spot": el => { const p = curP(); const r = p.runs.find(x => x.id === el.dataset.run); const x = r.results[num(el.dataset.x)]; x["spot" + el.dataset.c] = el.dataset.v; touch(p); render(); },
  "improve": () => aiImprove(curP()),
  "cand-discard": () => { const p = curP(); p.candidate = null; touch(p); render(); },
  "cand-adopt": () => { const p = curP(); const c = p.candidate; snapshot(p); p.pkg.sections = clone(c.sections); saveVersion(p, c.summary || t("ver.improved")); logDecision(p, t("test.adopt"), c.summary, c.passRate != null ? t("test.cand") + " " + c.passRate + "%" : ""); p.candidate = null; touch(p); render(); toast(t("test.adopted"), "ok"); },

  /* launch / operate */
  "trace": () => aiTrace(curP()),
  "mark-launch": () => { const p = curP(); p.launchVersion = p.versionNo; p.setup.s8 = true; logDecision(p, t("launch.launchver"), "v" + p.versionNo, ""); touch(p); render(); },
  "goto-op": () => { UI.opTab = "inbox"; setPhase("operate"); },
  "fb-diagnose": el => { const p = curP(); const f = p.feedback.find(x => x.id === el.dataset.id); aiDiagnose(p, f); },
  "fb-apply": el => { const p = curP(); const f = p.feedback.find(x => x.id === el.dataset.id); aiApplyFeedbackFix(p, f); },
  "copy-watch": () => copyText(t("op.watchprompt")),

  /* library */
  "pat-new": () => { const x = {id:uid("pt"), title: t("lib.newtitle"), desc:"", body:"", kind:"block", createdAt: now()}; WS.patterns.push(x); Store.put(wsPath() + "/patterns/" + x.id, x); UI.expanded.add("pt-" + x.id); render(); },
  "pat-copy": el => { const pt = el.dataset.own === "1" ? WS.patterns.find(x => x.id === el.dataset.id) : STARTER_PATTERNS.find(x => x.id === el.dataset.id); copyText(pt.body); },
  "pat-insert": el => { UI.modal = {kind:"insert", pat: el.dataset.id, own: el.dataset.own === "1"}; render(); },
  "pat-insert-to": el => {
    const m = UI.modal; const pt = m.own ? WS.patterns.find(x => x.id === m.pat) : STARTER_PATTERNS.find(x => x.id === m.pat);
    const p = WS.projects.find(x => x.id === el.dataset.pid); snapshot(p);
    let s = p.pkg.sections.find(x => x.dest === "instructions");
    if (!s){ s = {id:"instructions", dest:"instructions", title: L(DEST.instructions), filename:"", cadence:"", content:"", reqIds:[], why:"", mirror:""}; p.pkg.sections.unshift(s); }
    s.content = (s.content ? s.content.trimEnd() + "\n\n" : "") + pt.body; s.mirror = "";
    saveVersion(p, t("lib.inserted", {name: m.own ? pt.title : L(pt)})); touch(p);
    UI.modal = null; render(); toast(t("lib.insertedmsg", {p: p.name}), "ok");
  },
  "pat-skill": async el => { const pt = el.dataset.own === "1" ? WS.patterns.find(x => x.id === el.dataset.id) : STARTER_PATTERNS.find(x => x.id === el.dataset.id); UI.modal = {kind:"skill", skill:null}; render(); const r = await aiSkill(pt.body); if (UI.modal && UI.modal.kind === "skill"){ if (r) UI.modal.skill = r; else UI.modal = null; render(); } },
  "pat-del": el => confirmBox(t("btn.delete"), t("confirm.pattern"), t("btn.delete"), () => { WS.patterns = WS.patterns.filter(x => x.id !== el.dataset.id); Store.del(wsPath() + "/patterns/" + el.dataset.id); }),
  "skill-copy": () => copyText(skillMd(UI.modal.skill)),
  "skill-zip": () => { const s = UI.modal.skill; skillZip(s.name, skillMd(s)); },
  "skill-save": () => { const s = UI.modal.skill; const x = {id:uid("pt"), title: s.name, desc: s.description, body: skillMd(s), kind:"skill", createdAt: now()}; WS.patterns.push(x); Store.put(wsPath() + "/patterns/" + x.id, x); toast(t("lib.saved"), "ok"); },
  "res-del": el => confirmBox(t("btn.delete"), t("confirm.research"), t("btn.delete"), () => { WS.research = WS.research.filter(x => x.id !== el.dataset.id); Store.del(wsPath() + "/research/" + el.dataset.id); }),

  /* insights */
  "insights": () => aiInsights(),
  "prof-add": () => { WS.profile.entries.push({id:uid("pf"), text:""}); saveWs(); render(); },
  "prof-del": el => { WS.profile.entries = WS.profile.entries.filter(e => e.id !== el.dataset.id); saveWs(); render(); },
  "prof-accept": el => { const i = num(el.dataset.i); WS.profile.entries.push({id:uid("pf"), text: WS.profileSuggestions[i]}); WS.profileSuggestions.splice(i, 1); saveWs(); render(); },
  "prof-reject": el => { WS.profileSuggestions.splice(num(el.dataset.i), 1); saveWs(); render(); },

  /* settings */
  "set-lang": el => { WS.settings.lang = el.dataset.l; applySettings(); saveWs(); render(); },
  "set-theme": el => { WS.settings.theme = el.dataset.v; applySettings(); saveWs(); render(); },
  "model-step": el => { UI.modal = {kind:"model", step: el.dataset.step}; render(); },
  "model-reset": el => { delete WS.settings.stepModel[el.dataset.step]; saveWs(); render(); },
  "ws-open": el => { UI.modal = null; const w = META.workspaces.find(x => x.id === el.dataset.id); if (w.id === WS.id){ render(); return; } if (w.pinHash){ UI.unlocked = false; UI.lockFor = w.id; UI.pinError = false; render(); focusSoon("pin"); } else openWorkspace(w.id); },
  "ws-rename": el => { const w = META.workspaces.find(x => x.id === el.dataset.id); promptBox(t("ws.rename"), {value: w.name}, v => { if (!v.trim()) return; w.name = v.trim(); saveMeta(); if (w.id === WS.id){ WS.name = w.name; saveWs(); } }); },
  "ws-pin": el => { const w = META.workspaces.find(x => x.id === el.dataset.id); promptBox(t("ws.setpin"), {type:"password", ph: t("lock.pin"), help: t("ws.pinhelp")}, async v => { if (String(v).length < 4){ toast(t("ws.pinshort"), "err"); return; } w.pinHash = await sha256(w.id + ":" + v); saveMeta(); render(); toast(t("ws.pinset"), "ok"); }); },
  "ws-unpin": el => { const w = META.workspaces.find(x => x.id === el.dataset.id); w.pinHash = null; saveMeta(); render(); toast(t("ws.pinremoved"), "ok"); },
  "ws-new": () => promptBox(t("ws.new"), {ph: t("ws.nameph"), help: t("ws.newhint")}, async v => { if (!v.trim()) return; await createWorkspace(v.trim(), LANG); render(); toast(t("ws.created", {name: v.trim()}), "ok"); }),
  "export-ws": () => { const data = {app:"prompt-translator", version:1, exportedAt: now(), workspace:{name: WS.name, settings: WS.settings, profile: WS.profile}, projects: WS.projects, notes: WS.notes, patterns: WS.patterns, research: WS.research}; saveFile(slug(WS.name) + "-backup-" + now().slice(0,10) + ".json", JSON.stringify(data, null, 1)); },
  "export-spec": () => { const p = curP(); if (!p){ toast(t("data.openproject"), "err"); return; } saveFile(slug(p.name) + "-spec.md", specMarkdown(p)); },
  "export-project": () => { const p = curP(); saveFile(slug(p.name) + ".json", JSON.stringify({app:"prompt-translator", version:1, exportedAt: now(), projects:[p]}, null, 1)); },
  "dup-project": () => { const p = curP(); const c = normalizeProject(clone(p)); c.id = uid("p"); c.name = p.name + " " + t("proj.copysuffix"); c.versionNo = 0; c.versions = []; c.createdAt = now();
    // a copy is a new tool: no restore points, releases, live version or links to the original's parts
    Object.assign(c, {restore: [], releases: [], live: null, updates: [], brief: null, report: null, pilot: null, plan: null, inbox: [], seal: {review: 0, test: 0}, tool: Object.assign({}, c.tool, {artifacts: [], triggers: []})});
    c.mode = projMode(p); if (typeof pickCopyReset === "function") pickCopyReset(c);   // 1.5.0: the copy opens in the view you used; nothing of the original keeps running in it
    c.acts = []; for (const v of Object.values(c.marks || {})) if (v && typeof v === "object") delete v.act;   // and it starts its own Undo history
    WS.projects.unshift(c); actRebase(c); touch(c); if (arr(c.pkg.sections).length) saveVersion(c, t("ver.compiled")); UI.modal = null; openProject(c.id); toast(t("proj.duplicated"), "ok"); },
  "archive-project": () => { const p = curP(); p.status = p.status === "archived" ? "active" : "archived"; touch(p); UI.modal = null; UI.view = "cockpit"; render(); toast(p.status === "archived" ? t("proj.archived") : t("proj.restored"), "ok"); },
  "delete-project": () => { const p = curP(); confirmBox(t("proj.delete"), t("proj.deleteq", {name: p.name}), t("proj.delete"), () => {
      Store.del(projPath(p.id)); for (let i = 1; i <= (p.versionNo || 0); i++) Store.del(projPath(p.id) + "/versions/v" + i);
      for (const n of WS.notes.filter(n => n.projectId === p.id)){ n.projectId = null; n.anchor = null; saveNote(n); }
      clearTimeout(saveTimers.get(p.id)); saveTimers.delete(p.id);   // a save still waiting never brings it back
      WS.projects = WS.projects.filter(x => x.id !== p.id); UI.view = "cockpit"; UI.pid = null; toast(t("proj.deleted"), "ok"); }); }
};

const CHANGES = {
  "intake-images": async el => { const p = curP(); const files = Array.from(el.files || []).slice(0, 5); p._images = []; for (const f of files){ try{ const {blob} = await resizeImage(f, 1600); if (blob) p._images.push(blob); }catch(e){ toast(t("err.image"), "err"); } } render(); },
  "note-image": async el => { const n = WS.notes.find(x => x.id === el.dataset.id); const f = el.files && el.files[0]; if (!f) return; try{ let q = .8, max = 1000, data; for (let i = 0; i < 4; i++){ const {canvas} = await resizeImage(f, max); data = canvas.toDataURL("image/jpeg", q); if (data.length < 170000) break; q -= .15; max = Math.round(max * .75); } if (data.length >= 200000){ toast(t("err.imagebig"), "err"); return; } n.image = data; saveNote(n); render(); }catch(e){ toast(t("err.image"), "err"); } },
  "lens": el => { el.checked ? UI.lensSel.add(el.dataset.id) : UI.lensSel.delete(el.dataset.id); render(); },
  "sel-finding": el => { el.checked ? UI.selFindings.add(el.dataset.id) : UI.selFindings.delete(el.dataset.id); render(); },
  "tri-accept": el => { UI.triage[num(el.dataset.i)].accept = el.checked; },
  "tri-become": el => { UI.triage[num(el.dataset.i)].become = el.value; render(); },
  "fs-toggle": el => { const p = curP(); const f = p.foresight.find(x => x.id === el.dataset.id); if (f) f.done = el.checked; else p.fsDone[el.dataset.id] = el.checked; touch(p); render(); },
  "import-ws": async el => {
    const f = el.files && el.files[0]; if (!f) return;
    try{ const d = JSON.parse(await f.text()); if (!d || d.app !== "prompt-translator") throw new Error("format"); importBackup(d, f.name); }   // 2.1: whole file checked first, counts told, Undo offered
    catch(e){ toast(t("data.importerr"), "err"); }
    el.value = "";
  }
};

const FORMS = {
  "unlock": async () => { const w = META.workspaces.find(x => x.id === UI.lockFor); const v = $("#pin").value; const h = await sha256(w.id + ":" + v); if (h === w.pinHash){ UI.pinError = false; UI.lockFor = null; openWorkspace(w.id); } else { UI.pinError = true; render(); focusSoon("pin"); } },
  "new-project": () => { const v = $("#np-name").value.trim(); newProject(v); },
  "drawer-note": () => { const v = $("#dr-new").value.trim(); if (!v) return; addNote({text:v, projectId: UI.view === "project" ? UI.pid : null, inbox:true}); $("#dr-new").value = ""; render(); toast(t("notes.added"), "ok"); },
  "new-note": () => { const v = $("#nn-text").value.trim(); if (!v) return; addNote({text:v, projectId: $("#nn-proj").value || null, inbox:true}); render(); toast(t("notes.added"), "ok"); },
  "capture": () => { const v = $("#cap-in").value.trim(); UI.capture = false; if (v){ addNote({text:v, projectId: UI.view === "project" ? UI.pid : null, inbox:true}); toast(t("notes.captured"), "ok"); } render(); },
  "save-version": () => { const p = curP(); const r = $("#ver-reason").value.trim() || t("ver.manual"); saveVersion(p, r); logDecision(p, t("ver.save"), "v" + p.versionNo, r); touch(p); render(); toast(t("ver.saved", {v: p.versionNo}), "ok"); },
  "feedback": () => { const p = curP(); const pasted = $("#fb-paste").value.trim(); if (!pasted){ toast(t("op.needpaste"), "err"); return; } const fb = {id:uid("fb"), at:now(), pasted, comment: $("#fb-comment").value.trim(), status:"new", version:p.versionNo}; p.feedback.push(fb); touch(p); render(); if (arr(p.pkg.sections).length) aiDiagnose(p, fb); },
  "health": () => { const p = curP(); p.health.push({at: now(), quality: num($("#h-q").value, 3), note: $("#h-note").value.trim()}); touch(p); render(); },
  "decision": () => { const p = curP(); const ti = $("#dc-title").value.trim(), ch = $("#dc-choice").value.trim(); if (!ti || !ch) return; logDecision(p, ti, ch, $("#dc-reason").value.trim()); touch(p); render(); },
  "openq": () => { const p = curP(); const v = $("#oq-text").value.trim(); if (!v) return; p.openQs.push({id:uid("oq"), text:v, done:false}); touch(p); render(); },
  "toolfb": async () => { const v = $("#tfb-text").value.trim(); if (!v) return; const x = {id:uid("tf"), text:v, at:now(), ws: WS.name, status:"open"}; Store.put("toolfeedback/" + x.id, x); WS.toolfb = [x, ...arr(WS.toolfb)]; render(); toast(t("tfb.sent"), "ok"); },
  "ns": () => { const p = curP(); const scope = (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.scope) || "update"; const textBefore = itemSnapshotText(p, "ns"); const before = JSON.stringify(p.northStar); for (const k of ["problem","goal","success","users","constraints","now"]) p.northStar[k] = $("#ns-" + k).value.trim(); const changed = JSON.stringify(p.northStar) !== before; if (changed){ p.nsAssumed = false; markRef(p, "ns", "edited"); if (scope === "mark") markDownstream(p, "ns"); } logDecision(p, t("ns.title"), p.northStar.goal, t("dec.nsedited")); UI.modal = null; touch(p); render(); toastUndo(t("ns.saved")); if (changed && scope === "update") updateAffected(p, ["ns"], {before: {ns: textBefore}}); },
  "anchor": () => { const p = curP(); const m = UI.modal; const v = $("#an-text").value.trim(); if (!v) return; addNote({text:v, projectId:p.id, anchor:{projectId:p.id, kind:m.akind, itemId:m.item, label:m.label, snapshot:itemText(p, m.akind, m.item)}, inbox:false}); render(); focusSoon("an-text"); toast(t("notes.added"), "ok"); },
  "research": () => {
    const o = parseResearch($("#res-paste").value);
    if (!o){ UI.modal.err = true; render(); return; }
    const p = curP();
    const r = {id:uid("rs"), projectId: p ? p.id : null, topic: str(o.topic) || UI.modal.topic, summary: str(o.summary), whatWorks: arr(o.whatWorks).map(str), whatFails: arr(o.whatFails).map(str), recommendations: arr(o.recommendations).map(str), sources: arr(o.sources).map(s => ({title:str(s.title), url: /^https?:\/\//.test(str(s.url)) ? str(s.url) : "", date:str(s.date), quality: oneOf(s.quality, ["primary","secondary","opinion"], "secondary")})), at: now(), expires: str(o.expires).slice(0, 7)};
    WS.research.push(r); Store.put(wsPath() + "/research/" + r.id, r); UI.modal = null; render(); toast(t("res.saved"), "ok");
  },
  "model": el => { const st = el.dataset.step; const o = {tier: $("#m-tier").value, model: $("#m-model").value, effort: $("#m-effort").value}; WS.settings.stepModel = WS.settings.stepModel || {}; if (!o.tier && !o.model && !o.effort) delete WS.settings.stepModel[st]; else WS.settings.stepModel[st] = o; saveWs(); UI.modal = null; render(); toast(t("model.saved"), "ok"); },
  "prompt": () => { const v = $("#pr-in").value; const cb = UI.modal.cb; UI.modal = null; render(); if (cb) Promise.resolve(cb(v)).then(() => render()); }
};

/* ---------- event wiring ---------- */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  if (el.tagName === "LABEL" || (el.tagName === "INPUT" && el.type === "checkbox")) return;
  const fn = ACTIONS[el.dataset.a];
  if (!fn) return;
  if (el.dataset.a !== "close-overlay") e.preventDefault();
  fn(el, e);
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.matches("[data-bind]")){
    applyBind(el);
    if (el.dataset.rerender) debounceRender();
    return;
  }
  if (el.matches("[data-qdraft]")){ UI.qDraft[el.dataset.qdraft] = el.value; return; }
  if (el.matches("[data-lines]")){ const p = curP(); p[el.dataset.lines] = el.value.split("\n").map(x => x.trim()).filter(Boolean); touch(p); return; }
  if (el.matches("[data-lines-test]")){ const p = curP(); const x = p.tests.find(y => y.id === el.dataset.linesTest); x.criteria = el.value.split("\n").map(s => s.trim()).filter(Boolean); if (p.seal.test === p.versionNo){ p.seal.test = 0; logAct(p, t("act.sealbroken"), {kind: "seal"}); } touch(p); return; }
  if (el.matches("[data-reqids]")){ const p = curP(); const x = p.tests.find(y => y.id === el.dataset.reqids); x.reqIds = el.value.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean); touch(p); return; }
  if (el.matches("[data-res-topic]")){ UI.modal.topic = el.value; const b = $("#res-brief"); if (b) b.textContent = researchBrief(curP(), el.value || "…"); return; }
  if (el.id === "pal-in"){ UI.palQ = el.value; UI.palSel = 0; if (e.isComposing) return; render(); return; }   // 2.2.0 (item 23): no render while pinyin/IME composes; compositionend renders once
});
const debounceRender = debounce(() => render(), 250);
/* 2.2.0 (item 23): the Ctrl+K search renders once when the IME confirms the characters (the input event during composition is skipped above) */
document.addEventListener("compositionend", e => { const el = e.target; if (el && el.id === "pal-in"){ UI.palQ = el.value; UI.palSel = 0; render(); } });
document.addEventListener("change", e => {
  const el = e.target;
  if (el.matches("[data-a-change]")){ const fn = CHANGES[el.dataset.aChange]; if (fn) fn(el); return; }
  if (el.matches("select[data-bind], input[type=checkbox][data-bind]")){ applyBind(el); render(); }
});
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-form]"); if (!f) return;
  e.preventDefault(); const fn = FORMS[f.dataset.form]; if (!fn) return;
  if (typeof draftDropIn === "function") draftDropIn(f);   // the text is being used now: its draft is no longer needed
  fn(f);
});
document.addEventListener("keydown", e => {
  if (e.isComposing || e.keyCode === 229) return;   // pinyin / IME composition: Enter confirms the characters, it must not send
  const mod = e.metaKey || e.ctrlKey;
  if (mod && (e.key === "k" || e.key === "K")){ e.preventDefault(); if (!UI.unlocked) return; UI.palette = !UI.palette; UI.palQ = ""; UI.palSel = 0; UI.capture = false; render(); if (UI.palette) focusSoon("pal-in"); return; }
  if (e.altKey && (e.code === "KeyN")){ e.preventDefault(); if (!UI.unlocked) return; ACTIONS["dock-toggle"](null, e); return; }
  if (e.key === "Escape"){ if (UI.modal && UI.modal.sticky) return; if (UI.palette || UI.capture || UI.modal){ UI.palette = false; UI.capture = false; UI.modal = null; render(); } return; }
  if (UI.palette && ["ArrowDown","ArrowUp","Enter"].includes(e.key)){
    e.preventDefault();
    const items = $$(".pal-item");
    if (e.key === "Enter"){ const it = items[UI.palSel || 0]; if (it) ACTIONS["pal-run"](it); return; }
    UI.palSel = clamp((UI.palSel || 0) + (e.key === "ArrowDown" ? 1 : -1), 0, Math.max(0, items.length - 1)); render(); focusSoon("pal-in");
  }
});
