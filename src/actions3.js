/* ===================== 1.2 ACTIONS: engine, knowledge pack, setup ===================== */
/** raising a dial above PT's recommendation needs one sentence why (the climb log); going down never does */
function dialRank(k, v){ return k === "rung" ? RUNGS.indexOf(v) : k === "setting" ? SETTINGS_LADDER.findIndex(s => s.id === v) : k === "autonomy" ? AUTONOMY.indexOf(v) : k === "platform" ? PLATFORMS.indexOf(v) : 0; }
function setDial(p, k, v){
  const d = eng(p).dials[k], cur = dial(p, k), val = v || null;
  const apply = reason => { d.val = val; if (k === "setting") syncTarget(p); if (val && dialRank(k, val) > dialRank(k, d.auto)) logClimb(p, k, d.auto, val, reason); else if (val) logClimb(p, k, cur, val, t("eng.down")); eng(p).ceiling = ceilingCard(p); logAct(p, t("act.dial", {k: t("eng.dial." + k), v: val || t("eng.autobadge")}), {step: "arch"}); touch(p); render(); };
  if (val && dialRank(k, val) > dialRank(k, d.auto)) promptBox(t("eng.climb.why"), {ph: t("eng.climb.ph"), help: t("eng.climb.help"), yes: t("eng.climb.yes")}, r => { if (!str(r).trim()){ toast(t("acc.need"), "err"); render(); return; } apply(str(r).trim()); });
  else apply("");
}
Object.assign(ACTIONS, {
  "aud-set": el => { const p = curP(); p.audience = p.audience || {}; const k = el.dataset.k, v = el.dataset.v === "true", prev = p.audience[k]; p.audience[k] = v; logAct(p, t("act.audience", {x: k + "=" + v}), {step: "capture"}); if (prev != null && prev !== v && p.requirements.length) markDownstream(p, "ns"); touch(p); render(); },
  /* frontier scan and gates */
  "frontier-scan": () => frontierJob(curP()),
  "frontier-local": () => aiFrontierLocal(curP()),
  "eng-autoscan": el => { const p = curP(); eng(p).autoScan = el.dataset.v === "1"; touch(p); render(); },
  "gate-set": el => { const p = curP(), e = eng(p), g = el.dataset.g; e.gates[g] = Object.assign({}, e.gates[g] || {}, {ans: el.dataset.v, at: now()}); logAct(p, t("act.gate", {g, v: t("eng.ans." + el.dataset.v)}), {step: "arch"}); engineRecompute(p); touch(p); render(); },
  "gate-override": el => { const p = curP(), g = el.dataset.g; promptBox(t("eng.gate.override"), {ph: t("eng.gate.why"), help: t("gate.fx." + GATES.find(x => x.id === g).key), yes: t("eng.gate.override")}, v => { if (!str(v).trim()){ toast(t("acc.need"), "err"); return; } const e = eng(p); e.gates[g] = Object.assign({}, e.gates[g] || {}, {override: {reason: str(v).trim(), at: now(), by: wsLabel(WS.name)}}); logClimb(p, "gate", g, t("eng.gate.overridden.short"), str(v).trim()); logAct(p, t("act.gateover", {g, r: str(v).trim()}), {step: "arch", important: true}); engineRecompute(p); touch(p); render(); }); },
  "gates-accept": el => { const p = curP(), e = eng(p); let n = 0; for (const id of str(el.dataset.ids).split(",")){ const g = e.gates[id]; if (g && !g.ans && g.sug){ g.ans = g.sug.ans; g.at = now(); g.fromSug = true; n++; } } logAct(p, t("act.gatesacc", {n}), {step: "arch"}); engineRecompute(p); touch(p); render(); },
  "gate-unoverride": el => { const p = curP(), e = eng(p), g = el.dataset.g; if (e.gates[g]) delete e.gates[g].override; engineRecompute(p); touch(p); render(); },
  /* score and track */
  "score-set": el => { const p = curP(), e = eng(p); e.score.val[el.dataset.d] = num(el.dataset.v, 1); engineRecompute(p); touch(p); render(); },
  "score-auto": el => { const p = curP(), e = eng(p); delete e.score.val[el.dataset.d]; engineRecompute(p); touch(p); render(); },
  "eng-suggest": () => aiEngineSuggest(curP()),
  "dial-pick": el => setDial(curP(), el.dataset.k, el.dataset.v),
  /* trial run and mini-test */
  "trial-toggle": el => { const p = curP(); eng(p).trial.on = el.dataset.v === "1"; touch(p); render(); },
  "trial-cases": () => aiTrialCases(curP()),
  "trial-run": () => withPreview("trial-run", null, () => aiTrialRun(curP())),
  "trial-add": () => { const p = curP(), tr = eng(p).trial; tr.cases = arr(tr.cases); tr.cases.push({id: "C" + (tr.cases.reduce((m, c) => Math.max(m, num(str(c.id).slice(1), 0)), 0) + 1), input: "", expect: "", kind: "typical", real: true}); touch(p); render(); },
  "trial-del": el => { const p = curP(), tr = eng(p).trial; tr.cases = arr(tr.cases).filter(c => c.id !== el.dataset.id); tr.runs = arr(tr.runs).filter(r => r.caseId !== el.dataset.id); touch(p); render(); },
  "mini-toggle": el => { const p = curP(); eng(p).mini.on = el.dataset.v === "1"; touch(p); render(); },
  "mini-run": () => withPreview("mini-run", null, () => aiMiniTest(curP())),
  /* knowledge pack */
  "kp-decide": el => kpDecide(el.dataset.p, el.dataset.i, el.dataset.v),
  "kp-refresh": () => kpRefreshJob(),
  "kp-open": () => { UI.view = "settings"; UI.setTab = "knowledge"; render(); },
  "ver-reload": () => { try{ location.reload(); }catch(e){ toast(t("ver.oldtip", {v: PT_VERSION, n: APPV.latest}), "err"); } },
  "digest-seen": el => { WS.settings.digestSeen = el.dataset.m; saveWs(); render(); },
  /* separate logins (D9) */
  "runner-setup": async () => { try{ const id = await Runner.setup(); toast(t("rs.done", {id}), "ok"); }catch(e){ toast(mcpErrText(e), "err"); } render(); },
  "jw-remove": () => { const w = UI.jiewenEmpty; if (!w) return; confirmBox(t("jw.remove"), t("jw.removeq"), t("jw.remove"), async () => { await removeWorkspace(w); UI.jiewenEmpty = null; toast(t("jw.removed"), "ok"); render(); }); },
  "jw-keep": () => { META.keepSecondOwner = true; saveMeta(); UI.jiewenEmpty = null; render(); },
  "fr-lang": el => { UI.firstRun = Object.assign({}, UI.firstRun, {lang: el.dataset.v}); LANG = el.dataset.v; applySettings(); render(); },
  "first-run-go": async () => { const f = UI.firstRun || {}, lang = f.lang || LANG; const name = str(f.name).trim() || t("ws.default"); const w = await createWorkspace(name, lang, Object.assign(wsDefaults(lang), {seenVersion: PT_VERSION})); META.last = w.id; META.v10 = true; saveMeta(); UI.firstRun = null; LANG = lang; await openWorkspace(w.id); },
  /* real use, real tool, tool card */
  "inbox-totest": el => { const p = curP(), it = arr(p.inbox).find(x => x.id === el.dataset.id); if (it) aiTestFromItem(p, it); },
  "smoke-run": () => { const p = curP(); smokeJob(p); },
  "tool-card": el => { const p = curP(), r = arr(p.releases).find(x => x.v === el.dataset.v); if (!r) return; saveFile(slug(p.name) + "_v" + r.v + "_tool-card.md", r.card || toolCard(p, r.v)); },
  /* gap 5: sign off several at once, per severity */
  "signoff-batch": el => { const p = curP(), sev = el.dataset.sev; const list = arr(p.findings).filter(f => f.status === "signoff" && f.severity === sev); if (!list.length) return; confirmBox(t("so.batch", {n: list.length, s: t("sev." + sev)}), list.map(f => "• " + trunc(f.issue, 90)).join("\n"), t("so.batchyes", {n: list.length}), () => { for (const f of list){ f.status = "done"; f.doneAt = now(); f.audit = arr(f.audit); f.audit.push({at: now(), what: t("aud.signed") + " (" + t("so.batched") + ")", by: wsLabel(WS.name)}); } logAct(p, t("act.signedbatch", {n: list.length, s: t("sev." + sev)}), {step: "review", important: true}); touch(p); render(); }); }
});
Object.assign(CHANGES, {
  "dial-set": el => setDial(curP(), el.dataset.k, el.value),
  "track-set": el => { const p = curP(), e = eng(p), v = el.value || null, rank = x => TRACKS.indexOf(x);
    const apply = reason => { const from = track(p); e.track.val = v; if (v && rank(v) > rank(e.track.auto)) logClimb(p, "track", e.track.auto, v, reason); else if (v && rank(v) < rank(from)) logClimb(p, "track", from, v, t("eng.down")); logAct(p, t("act.track", {x: t("track." + track(p))}), {step: "require"}); touch(p); render(); };
    if (v && rank(v) > rank(e.track.auto)) promptBox(t("eng.climb.why"), {ph: t("eng.climb.ph"), help: t("eng.climb.help"), yes: t("eng.climb.yes")}, r => { if (!str(r).trim()){ toast(t("acc.need"), "err"); render(); return; } apply(str(r).trim()); });
    else apply(""); }
});
