/* ===================== LAUNCH · RELEASE · OPERATE & UPDATE ===================== */
const FIX_LABEL = {"proof-design":"pf.fix.design","proof-tests":"pf.fix.tests","judge-cal":"jc.run","edit-ns":"btn.edit","ns-confirm":"btn.confirm","dim-confirm":"rd.f.confirmguess","go-interview":"rd.f.answer","assume-handle":"rd.f.handle","risk-suggest":"rk.suggest","risk-mitigated":"rk.markmit","early-check":"chk.run","update-affected":"flags.update","compile":"build.compile","lint-fix":"rd.f.lintfix","review-run":"rev.run1","finding-fix":"rev.fixauto","finding-confirm":"rev.confirmnow","finding-signoff":"rev.signoff","cost-ok":"rd.f.costok","frontier-scan":"eng.scan.run","frontier-local":"eng.scan.local.run","gate-open":"eng.gate.answer14","trial-run":"eng.trial.run","mini-run":"eng.mini.run","finding-reaccept":"rd.f.reaccept","go":"rd.f.go","tests-missing":"rd.f.missingtests","tests-run":"test.run","tests-improve":"test.improve","judge-decide":"rd.f.decide","trace-run":"launch.tracegen","trace-close":"rd.f.closegaps","seal-recheck":"seal.recheck","oq-done":"rd.f.done","item-confirm":"btn.confirm","fs-done":"rd.f.done","open-notes":"rd.f.opennotes","crit-draft":"goal.draft0","crit-link":"goal.link","arch-redraw":"arch.redraw","gen-tests":"test.gen","requirements":"req.gen","architecture":"arch.gen","clarify":"cap.clarify","eng-suggest":"eng.suggest"};
function ringSVG(score){
  const r = 46, c = 2 * Math.PI * r, col = score === 100 ? "var(--ok)" : "var(--warn)";
  return `<svg class="ringbig" viewBox="0 0 112 112" role="img" aria-label="${score}%"><circle cx="56" cy="56" r="${r}" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="56" cy="56" r="${r}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c * score / 100} ${c}" transform="rotate(-90 56 56)"/><text x="56" y="62" text-anchor="middle" font-size="22" font-weight="600" fill="var(--fg)" style="font-family:var(--f-display)">${score}%</text></svg>`;
}
/** Launch: everything that still blocks, by stage, with one way to finish it; the brief once nothing blocks */
function phLaunch(p){
  const score = readinessScore(p), block = blockingItems(p), unlocked = copyUnlocked(p), plan = finishPlan(p);
  const byStage = STAGES.map(s => ({s, items: block.filter(x => x.stage === s.id)})).filter(g => g.items.length);
  const should = queueOf(p).filter(x => x.cls === "should");
  const row = x => { const opts = qOptions(p, x), star = opts.findIndex(o => o.star); return `<div class="qrow">${stSlot("bad")}<div class="qbody"><button class="qtitle linkish" data-a="q-goto" data-ref="${esc(x.ref)}" data-g="you">${esc(x.title)}</button>${clampHTML(phName(x.ph) + (x.why ? " · " + x.why : ""), "rw:" + x.key, {lines: 2, cls: "small muted"})}${star >= 0 ? clampHTML(t("q.starline", {x: opts[star].label}), "rs:" + x.key, {lines: 2, cls: "small qstar"}) : ""}</div><div class="qacts">${x.who === "pt" && x.fix ? `<span class="chip acc">${esc(t("q.ptcan"))}</span>` : ""}${star >= 0 ? `<button class="btn xs primary" data-a="q-do" data-key="${esc(x.key)}" data-i="${star}" title="${esc(opts[star].label)}">${esc(t("q.usestar"))}</button>` : `<button class="btn xs" data-a="q-goto" data-ref="${esc(x.ref)}" data-g="you">${esc(t("q.decide"))}</button>`}</div></div>`; };
  return `
  <section class="panel" id="ready14"><div class="ready">${ringSVG(score)}<div class="stack"><h3>${esc(t("rd.title"))}</h3><p class="muted">${esc(t("rd14.sub"))}</p>
    ${block.length ? `<p class="warn-t">${esc(t("rd14.left", {n: block.length}))}</p><div class="row"><button class="btn primary" data-a="finish-open">${ic("bolt")}${esc(t("fin.btnn", {n: block.length + should.length, u: plan.units}))}</button>${btn("rd-walk", t("rd.walk"), {cls: "sm"})}</div>` : `<p class="ok-t">${esc(acceptedRisks(p) ? t("seal.readyrisks", {n: acceptedRisks(p)}) : t("seal.ready"))}</p>`}</div></div>
    ${byStage.map(g => `<div class="stack" style="gap:6px"><h4>${esc(stName(g.s.id))}</h4><div class="qlist">${g.items.map(row).join("")}</div></div>`).join("")}
    ${should.length ? `<details><summary class="small">${esc(t("rd14.should", {n: should.length}))}</summary><div class="qlist">${should.map(row).join("")}</div></details>` : ""}
  </section>
  ${traceSection(p)}
  ${briefSection(p, unlocked, block.length)}
  ${unlocked ? setupSection(p) : ""}
  ${unlocked ? pilotSection(p) : ""}`;
}
function traceSection(p){
  const tr = p.trace;
  return `<section class="panel" id="trace14">${head(t("tr14.title"), t("tr14.sub"), aiBtn("trace", tr ? t("btn.redo") : t("launch.tracegen"), "L", {key: "trace"}))}
    ${tr ? `<p class="small muted">${esc(fmtDate(tr.at))}${tr.version !== p.versionNo ? " · " + esc(t("bl.traceold")) : ""}</p>${arr(tr.orphanReqs).length ? `<div class="small">${esc(t("tr14.orph", {x: tr.orphanReqs.map(o => o.req + " (" + t("launch.missing." + o.missing) + ")").join(", ")}))}</div>${aiBtn("trace-close", t("rd.f.closegaps"), "M", {key: "tests"})}` : `<p class="small ok-t">${esc(t("tr14.ok"))}</p>`}` : ""}</section>`;
}
function briefSection(p, unlocked, left){
  if (!unlocked) return `<section class="panel" id="brief"><div class="lockbox">${ic("lock")}<span>${esc(t("brief.locked", {n: left || "—"}))}</span></div></section>`;
  const m = buildModelRec(p), home = p.tool.home || {};
  const codeHome = /code|repo/i.test(str(home.where));
  const auto = /artifact|page|scheduled|task|document|seite|aufgabe|页面|定时|文档/i.test(str(home.where) + " " + str(home.parts));
  return `<section class="panel brief" id="brief">${head(t("brief.title"), acceptedRisks(p) ? t("seal.readyrisks", {n: acceptedRisks(p)}) : t("seal.ready"))}
    <div class="two"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(t("brief.model"))}</span><div class="row"><span class="chip model">${esc(m.model)} · ${esc(t("effort." + m.effort))}</span></div><p class="small muted">${esc(m.why)}</p></div>
      <div class="stack" style="gap:4px"><span class="eyebrow">${esc(t("brief.home"))}</span><p class="small">${esc(home.where || t("brief.homeunknown"))}${home.parts ? " — " + esc(home.parts) : ""}</p></div></div>
    <div class="four">${[1,2,3,4].map(i => `<div><b>${esc(t("brief.s" + i))}</b>${esc(t("brief.s" + i + "d"))}</div>`).join("")}</div>
    <div class="row">${btn("brief-copy-line", t("brief.copyline"), {icon: "copy", cls: "primary lg"})}${btn("brief-copy-full", t("brief.copyfull"), {icon: "copy", cls: "sm"})}${btn("brief-file", t("brief.file"), {icon: "dl", cls: "sm"})}</div>
    ${p.brief && p.brief.draft === p.versionNo ? `<p class="small muted">${esc(t("brief.stored", {id: p.brief.id}))}</p>` : ""}
    <details><summary class="small">${esc(t("brief.show"))}</summary><pre class="prompt code-pre">${esc(buildBriefText(p))}</pre></details>
    <div class="panel flat stack"><b>${esc(t("brief.oneclick"))}</b><p class="small">${esc(t("brief.oneclick.sub"))}</p><div class="row">${auto ? btn("build-job", t("brief.buildbg"), {icon: "play", cls: "sm"}) : `<span class="small muted">${esc(t("brief.nobg"))}</span>`}${codeHome ? `<span class="chip warn">${esc(t("code.off"))}</span>` : ""}</div>${codeHome ? `<p class="small muted">${esc(t("code.offwhy"))}</p>` : ""}</div>
  </section>`;
}
function setupSection(p){
  const secs = arr(p.pkg.sections);
  const blocks = {s2: secs.filter(s => s.dest === "instructions"), s3: secs.filter(s => s.dest === "knowledge"), s4: secs.filter(s => s.dest === "scheduled"), s5: secs.filter(s => s.dest === "skill")};
  const steps = SETUP_STEPS.filter(st => st.id !== "s8").map(st => `<div class="item"><input type="checkbox" id="st-${st.id}" data-bind="p:setup.${st.id}" ${p.setup[st.id] ? "checked" : ""} style="margin-top:3px;accent-color:var(--accent)"><div class="body"><label for="st-${st.id}" class="title" style="cursor:pointer">${esc(L(st))}</label>
    ${st.id === "s2" ? `<div class="row">${btn("copy-loader", t("setup.loader"), {icon: "copy", cls: "sm"})}</div><p class="hint">${esc(t("setup.loaderhint"))}</p>` : ""}
    ${(blocks[st.id] || []).length ? `<div class="row">${blocks[st.id].map(s => `<button class="chip tap" data-a="sec-copy" data-id="${s.id}">${ic("copy")}${esc(s.filename || s.title)}${s.cadence ? " · " + esc(s.cadence) : ""}</button>`).join("")}${st.id === "s5" ? btn("dl-skills", t("build.dlskills"), {icon: "dl", cls: "sm"}) : ""}</div>` : ""}</div></div>`).join("");
  return `<section class="panel">${head(t("launch.setup"), t("setup.sub"))}<div class="list">${steps}</div></section>`;
}
function pilotSection(p){
  const job = arr(WS.jobs).find(j => j.kind === "pilot" && j.projectId === p.id);
  const pl = p.pilot;
  return `<section class="panel">${head(t("pilot.title"), t("pilot.sub"))}
    <div class="row">${btn("pilot-run", pl ? t("pilot.again") : t("pilot.run"), {icon: "play", cls: pl ? "sm" : "sm primary"})}<span class="hint">${esc(t("pilot.hint"))}</span></div>
    ${job && !["done","failed","notsent"].includes(job.status) ? jobLine(job) : ""}
    ${pl ? pilotResult(p, pl) : ""}
    <div class="row end">${btn("goto", t("btn.continueto", {s: phName("release")}), {icon: "arrow", cls: "primary", attrs: 'data-ph="release"'})}</div></section>`;
}
/** tests the current release passed and the new draft fails */
function pilotWorse(pl){
  const r = (pl && pl.result) || {}, rel = r.release;
  if (!rel) return null;
  const relPass = new Set(arr(rel.tests).filter(x => x.pass).map(x => str(x.id)));
  const worse = arr(r.tests).filter(x => !x.pass && relPass.has(str(x.id))).map(x => str(x.id));
  const lower = num(r.passRate, 0) < num(rel.passRate, 0);
  return lower || worse.length ? {worse, a: num(r.passRate, 0), b: num(rel.passRate, 0)} : null;
}
function pilotResult(p, pl){
  const r = pl.result || {};
  const w = pilotWorse(pl);
  return `${w ? `<div class="banner warnb"><span class="dot warn"></span><span>${esc(t("pilot.worse", {a: w.a, b: w.b}))}${w.worse.length ? " " + esc(t("pilot.worsetests", {x: w.worse.join(", ")})) : ""}</span></div>` : ""}<div class="panel flat stack"><div class="row">${chip(pl.state === "ok" ? t("pilot.ok") : t("pilot.notok"), pl.state === "ok" ? "ok" : "crit")}${r.passRate != null ? chip(t("test.passrate") + " " + r.passRate + "%") : ""}${r.release && r.release.passRate != null ? chip(t("pilot.vsrel", {n: r.release.passRate}), r.passRate >= r.release.passRate ? "ok" : "warn") : ""}<span class="small muted">${esc(fmtDate(pl.at))}</span></div>${r.summary ? `<p class="small">${esc(r.summary)}</p>` : ""}${arr(r.tests).length ? `<div class="row small">${r.tests.map(x => chip(x.id + " " + (x.pass ? "✓" : "✗"), x.pass ? "ok" : "crit")).join("")}</div>` : ""}${pl.judge2 ? `<p class="small">${esc(t("pilot.judge2", {v: pl.judge2.agree ? t("judge.agree") : t("judge.disagree")}))} ${esc(pl.judge2.note || "")}</p>` : ""}</div>`;
}

/* ---------- Operate & update ---------- */
const INBOX_SRC = {tool: "ib.tool", auto: "ib.auto", run: "ib.run", research: "ib.research", health: "ib.health", yours: "ib.yours", feedback: "ib.feedback"};
function phOperate(p){
  if (!p.live) return `<section class="panel"><p class="lead">${esc(t("op.notlive"))}</p><div class="row">${btn("goto", t("btn.continueto", {s: phName(p.releases.length ? "release" : "launch")}), {icon: "arrow", cls: "primary", attrs: `data-ph="${p.releases.length ? "release" : "launch"}"`})}</div></section>${successPanel(p)}${realPanel(p)}${opFeedback(p)}`;
  return successPanel(p) + realPanel(p) + phOperate0(p);
}
function phOperate0(p){
  const tabs = ["inbox","update","health","watch"].map(x => `<button class="tab ${(UI.opTab || "inbox") === x ? "on" : ""}" data-a="tab" data-t="opTab" data-v="${x}">${esc(t("op.tab2." + x))}${x === "inbox" ? " · " + arr(p.inbox).filter(i => !i.done).length : ""}</button>`).join("");
  const trig = arr(p.tool.triggers);
  const status = `<div class="row"><span class="dot ok"></span><b>${esc(t("op.livev", {v: p.live.v}))}</b><span class="small muted">${esc(t("op.since", {d: fmtDay(p.live.since)}))}</span><span style="flex:1"></span>${btn("health-run", t("hc.run"), {icon: "heart", cls: "sm"})}${btn("collect", t("op.collect"), {icon: "inbox", cls: "sm"})}${trig.length ? btn("pause-tool", p.tool.paused ? t("op.resume") : t("op.pause"), {icon: "pause", cls: "sm ghost"}) : ""}</div>`;
  const tab = UI.opTab || "inbox";
  let body = "";
  if (tab === "inbox") body = opInbox(p) + opFeedback(p);
  else if (tab === "update") body = opUpdate(p);
  else if (tab === "health") body = opHealth(p);
  else body = opWatch(p);
  const runningJobs = arr(WS.jobs).filter(j => j.projectId === p.id && !["done","failed","notsent"].includes(j.status));
  // gap 6: the pasted fallback copy is only used when PT cannot be reached; warn when it is 2+ releases behind
  const fbOld = p.tool.fallbackV && arr(p.releases).length - num(p.tool.fallbackN, 0) >= 2;
  const fbWarn = fbOld ? `<div class="banner warnb"><span class="dot warn"></span><span style="flex:1">${esc(t("fb.old", {a: p.tool.fallbackV, b: p.live.v}))}</span>${btn("copy-loader", t("setup.loader"), {icon: "copy", cls: "sm"})}</div>` : "";
  const smoke = arr(p.tool.artifacts).length ? `<div class="row small"><span class="muted" style="flex:1">${esc(t("smoke.sub"))}</span>${btn("smoke-run", t("smoke.run"), {icon: "search", cls: "sm"})}</div>` : "";
  const vers = arr(p.tool.versions).length ? `<div class="small" style="margin-top:8px"><b>${esc(t("kit.versions"))}</b> <span class="muted">${esc(t("kit.versions.sub"))}</span><ul class="small muted">${arr(p.tool.versions).slice(-6).reverse().map(x => `<li>v${esc(x.v)} · ${esc(x.url.replace("https://claude.ai/artifact/", ""))} · <span class="tnum">${esc(x.version)}</span> · ${esc(fmtDate(x.at))}</li>`).join("")}</ul></div>` : "";   // 1.6.0: the pages' live version ids (restore points)
  return `<section class="panel">${status}${fbWarn}${runningJobs.length ? `<div class="list">${runningJobs.map(jobLine).join("")}</div>` : ""}<div class="tabs" role="tablist">${tabs}</div>${tab === "health" ? smoke + vers : ""}${body}</section>`;
}
function opInbox(p){
  const items = arr(p.inbox).filter(i => !i.done).slice().reverse();
  return `<form class="row" data-form="change-request"><input type="text" id="cr-in" placeholder="${esc(t("ib.crph"))}" style="flex:1;min-width:220px"><button class="btn sm" type="submit">${ic("plus")}${esc(t("ib.add"))}</button></form>
    ${items.length ? `<div class="inbox">${items.map(m => `<div class="msg">${busyHTML("totest-" + m.id)}<div class="mh"><span class="chip">${esc(t(INBOX_SRC[m.src] || "ib.yours"))}</span><b>${esc(m.title)}</b><span class="chip ${m.on ? "ok" : ""}">${esc(m.on ? t("ib.in") : t("ib.out"))}</span></div>${m.body && m.body !== m.title ? `<p class="small muted">${esc(trunc(m.body, 600))}</p>` : ""}${arr(m.recs).length ? `<ul class="small">${m.recs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}<div class="row">${m.src === "research" ? `<span class="chip st-ok">${ic("check")}${esc(t("ib.links"))}</span><span class="small muted">${esc(t("ib.never"))}</span>` : ""}${m.src === "run" ? chip(m.ok ? t("ib.runok") : t("ib.runfail"), m.ok ? "ok" : "crit") : ""}${m.newKind ? `<span class="chip warn">${esc(t("ib.newkind"))}${m.kindNote ? ": " + esc(trunc(m.kindNote, 80)) : ""}</span>` : ""}<span style="flex:1"></span>${m.testId ? chip(t("ib.istest", {id: m.testId}), "ok") : aiBtn("inbox-totest", t("ib.totest"), "L", {attrs: `data-id="${m.id}"`, key: "totest-" + m.id})}${btn("inbox-toggle", m.on ? t("ib.leaveout") : t("ib.include"), {cls: "sm", attrs: `data-id="${m.id}"`})}${btn("inbox-done", t("ib.done"), {cls: "sm ghost", attrs: `data-id="${m.id}"`})}</div></div>`).join("")}</div>` : empty(t("ib.empty"))}
    <div class="row end">${aiBtn("update-prepare", t("upd.prepare", {n: arr(p.inbox).filter(i => i.on && !i.done).length}), "H", {primary: true, key: "updprep", attrs: arr(p.inbox).some(i => i.on && !i.done) ? "" : "disabled"})}</div>${busyHTML("updprep")}`;
}
function opFeedback(p){
  return `<details class="panel flat"><summary>${esc(t("op.pastefb"))}</summary><form class="stack" data-form="feedback"><label class="fld"><span>${esc(t("op.paste"))}</span><textarea id="fb-paste" rows="5" placeholder="${esc(t("op.pasteph"))}"></textarea></label><label class="fld"><span>${esc(t("op.comment"))}</span><input type="text" id="fb-comment" placeholder="${esc(t("op.commentph"))}"></label><div class="row end"><button class="btn primary ai" type="submit" data-cost="${esc(t("cost.m"))}">${ic("spark")}${esc(t("op.diagnose"))}</button></div></form>
    ${p.feedback.slice().reverse().map(f => `<div class="panel flat">${busyHTML("diag-" + f.id)}<div class="row"><b>${esc(fmtDate(f.at))}</b>${chip(t("fbs." + f.status), f.status === "fixed" ? "ok" : f.status === "diagnosed" ? "acc" : "")}${f.quality ? chip(t("op.quality") + " " + f.quality + "/5") : ""}<span class="small muted" style="flex:1">${esc(f.comment)}</span></div>
      ${f.diagnosis ? `<dl class="kv"><dt>${esc(t("op.cat"))}</dt><dd>${esc(f.diagnosis.ok ? t("op.okresult") : f.diagnosis.category)}</dd><dt>${esc(t("op.cause"))}</dt><dd>${esc(f.diagnosis.cause)}</dd><dt>${esc(t("rev.fix"))}</dt><dd>${esc(f.diagnosis.fix)}</dd></dl>${!f.diagnosis.ok && f.status === "diagnosed" ? `<div class="row end">${btn("fb-inbox", t("op.toinbox"), {cls: "sm", attrs: `data-id="${f.id}"`})}${aiBtn("fb-apply", t("op.applyfix"), "M", {primary: true, attrs: `data-id="${f.id}"`, key: "fix"})}</div>` : ""}` : ""}</div>`).join("")}</details>`;
}
function opUpdate(p){
  const plan = p.plan;
  const ups = arr(p.updates).slice().reverse();
  let h = "";
  if (plan && plan.state !== "deployed"){
    const ready = copyUnlocked(p), released = p.releases.length && p.releases[0].v === plan.to;
    h += `<div class="card stack"><div class="row" style="justify-content:space-between"><h3>${esc(t("upd.plan", {a: plan.from, b: plan.to}))}</h3>${chip(t("upd.kind." + plan.kind), plan.kind === "big" ? "warn" : "acc")}</div><p class="small muted">${esc(t("upd.plansub"))}</p>
      <div class="clist">${arr(plan.changes).map(c => `<div><span class="ck chip ${c.k === "fix" ? "crit" : c.k === "remove" ? "" : "warn"}">${esc(t("upd.k." + c.k))}</span><span>${esc(c.x)}</span></div>`).join("")}</div>
      <div class="steps-mini">${[["upd.st1", true], ["upd.st2", ready || released], ["upd.st3", released], ["upd.st4", false]].map(([k, d], i) => `<div class="${d ? "done" : ""}"><span class="dot ${d ? "ok" : "todo"}"></span>${i + 1}. ${esc(t(k))}</div>`).join("")}</div>
      <div class="row">${!released ? btn("goto", t("upd.gocheck"), {icon: "arrow", cls: "primary", attrs: `data-ph="${arr(p.flags).length ? (itemByRef(p, p.flags[0].ref) || {}).ph || "review" : "review"}"`}) : btn("update-deploy", t("upd.deploy", {v: plan.to}), {icon: "play", cls: "primary lg"})}${btn("update-cancel", t("upd.cancel"), {cls: "ghost sm"})}</div>
      ${released && !arr(p.tool.artifacts).length && !arr(p.tool.triggers).length ? `<p class="hint">${esc(t("upd.manualhome"))}</p>` : ""}</div>`;
  } else if (!plan) h += `<p class="small muted">${esc(t("upd.none"))}</p>`;
  for (const u of ups){
    const r = u.result || {}, job = arr(WS.jobs).find(j => j.id === u.job);
    if (u.state === "running" && !u.job) h += `<div class="card stack"><h3>${esc(t("upd.notstarted", {a: u.from, b: u.to}))}</h3><div class="row">${btn("update-start", t("upd.start"), {icon: "arrow", cls: "primary sm", attrs: `data-id="${u.id}"`})}${btn("update-drop", t("upd.drop"), {cls: "sm ghost", attrs: `data-id="${u.id}"`})}</div></div>`;
    else if (u.state === "running") h += `<div class="card stack"><h3>${esc(t("upd.running", {a: u.from, b: u.to}))}</h3>${job ? jobLine(job) : ""}<div class="runsteps">${(t("upd.steps").split("|")).map((s, i) => { const st = job && arr(job.steps)[i]; return `<div class="${st ? "done" : ""}">${st ? ic("check") : `<span class="dot todo"></span>`}${esc(s)}</div>`; }).join("")}</div></div>`;
    else h += `<div class="card stack" ${u === ups[0] ? "data-focus" : ""}><div class="row"><h3 style="flex:1 1 12em">${esc(u.state === "verified" ? t("upd.verified", {b: u.to}) : t("upd.notverified", {b: u.to}))}</h3><span class="small muted">${esc(fmtDate(u.at))}</span></div>
      <div class="verify">${[["lost", "v.lost"], ["gaps", "v.gaps"], ["fossils", "v.fossils"], ["issues", "v.issues"]].map(([k, lb]) => { const L2 = arr(r[k]); return `<div class="vbox ${L2.length ? "bad" : ""}"><b>${L2.length ? "✗" : "✓"} ${esc(t(lb))}</b><span>${L2.length ? esc(L2.join("; ")) : esc(t(lb + ".ok", {p: r.parts ? r.parts.present + "/" + r.parts.total : "", t: r.tests ? r.tests.passed + "/" + r.tests.total : "", d: r.data || ""}))}</span></div>`; }).join("")}</div>
      ${arr(r.removed).length ? `<p class="small">${esc(t("v.removed", {x: r.removed.join("; ")}))}</p>` : ""}${r.path ? `<p class="small muted">${esc(t("v.path." + (r.path === "replaced" ? "replaced" : "inplace")))}</p>` : ""}${r.summary ? `<p class="small">${esc(r.summary)}</p>` : ""}
      <div class="eyebrow">${esc(t("upd.whatsnew", {b: u.to}))}</div><div class="clist">${arr(u.changes).map(c => `<div><span class="ck chip">${esc(t("upd.k." + c.k))}</span><span>${esc(c.x)}</span></div>`).join("")}</div>
      <div class="row">${btn("rollback", t("rel.rollto", {v: u.from}), {cls: "danger sm", attrs: `data-v="${esc(u.from)}"`})}</div></div>`;
  }
  return h;
}
function opHealth(p){
  const hs = arr(p.health);
  const rels = [...new Set(hs.map(h => h.release).filter(Boolean))];
  return `<div class="row"><span class="small muted">${esc(t("hc.depth"))}</span><div class="seg">${["thorough","reliable"].map(d => `<button class="${(UI.hcDepth || "thorough") === d ? "on" : ""}" data-a="hc-depth" data-v="${d}">${esc(t("hc." + d))}</button>`).join("")}</div>${btn("health-run", t("hc.run"), {icon: "heart", cls: "sm primary"})}</div><p class="hint">${esc(t("hc.hint." + (UI.hcDepth || "thorough")))}</p>
    <div class="spark">${healthSVG(hs) || `<p class="small muted">${esc(t("op.healthempty"))}</p>`}</div>
    ${rels.length ? `<h4>${esc(t("hc.score"))}</h4><div class="row">${rels.map(v => { const last = hs.filter(h => h.release === v).slice(-1)[0]; return chip("v" + v + ": " + (last.passRate != null ? last.passRate + "%" : last.quality + "/5"), (last.passRate ?? last.quality * 20) >= 80 ? "ok" : "warn"); }).join("")}</div>` : ""}
    ${hs.length ? `<div class="list">${hs.slice().reverse().map(h => `<div class="item"><span class="mono">${h.passRate != null ? h.passRate + "%" : h.quality + "/5"}</span><div class="body"><span class="small">${esc(h.note || "")}</span><span class="meta">${esc(fmtDate(h.at))}${h.release ? " · v" + esc(h.release) : ""}</span></div></div>`).join("")}</div>` : ""}`;
}
function opWatch(p){
  const old = p.pkg.kp && p.pkg.kp < kpStamp();
  return `<dl class="kv"><dt>${esc(t("op.kp"))}</dt><dd>${esc(kpLabel())}</dd><dt>${esc(t("op.compiledwith"))}</dt><dd>${p.pkg.kp ? esc(fmtDay(p.pkg.kp)) : "—"} ${old ? chip(t("op.recheck"), "warn") : ""}</dd><dt>${esc(t("build.target"))}</dt><dd>${esc(modelLabel(p.pkg.targetModel || p.targetModel))}</dd></dl>
    <div class="row">${btn("research-run", t("op.watchnow"), {icon: "globe", cls: "sm", attrs: `data-topic="${esc(t("op.researchtopic", {m: modelLabel(p.pkg.targetModel || p.targetModel), d: KP_VERSION}))}"`})}</div><p class="hint">${esc(t("op.watchhint2"))}</p>`;
}

/* ---------- modals: restore points, What's new, map, tool requests ---------- */
function restoreModal(p){
  const rp = arr(p.restore).slice().reverse(), adv = restoreAdvice(p), st = storageEstimate();
  const days = []; for (const r of rp){ const d = r.at.slice(0, 10); let g = days.find(x => x.d === d); if (!g){ g = {d, items: []}; days.push(g); } g.items.push(r); }
  const row = r => `<div class="rp ${r.milestone ? "ms" : ""}"><div class="row"><span class="dot ${r.milestone ? "ok" : "todo"}"></span><b style="flex:1 1 12em">${esc(r.label || t("rp.kind." + r.kind))}</b><span class="small muted">${esc(fmtDate(r.at))}</span></div><span class="small muted">${esc(phName(r.step) || "")} · ${esc(t("draft.short", {n: r.draft || 0}))} · ${esc(t("rp.kind." + r.kind))}</span>
    ${adv[r.id] ? `<div class="rec">${esc(t("rp.rec", {why: adv[r.id]}))}</div>` : ""}
    ${UI.rpPreview && UI.rpPreview.id === r.id ? rpPreview(p, UI.rpPreview) : ""}
    <div class="row">${btn("rp-preview", t("rp.preview"), {cls: "xs", attrs: `data-id="${r.id}"`})}${btn("rp-restore", t("rp.restore"), {cls: "xs", attrs: `data-id="${r.id}"`})}${btn("rp-download", t("btn.download"), {cls: "xs ghost", attrs: `data-id="${r.id}"`})}${UI.rpConfirm === r.id ? `${btn("rp-delete-yes", t("rp.deleteyes"), {cls: "xs danger", attrs: `data-id="${r.id}"`})}${btn("rp-delete-no", t("btn.cancel"), {cls: "xs ghost"})}` : btn("rp-delete", t("btn.delete"), {cls: "xs ghost", attrs: `data-id="${r.id}"`})}</div></div>`;
  return `<div class="row"><h2 style="flex:1 1 12em">${esc(t("rp.title"))}</h2><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    <p class="sub">${esc(t("rp.sub"))}</p>
    <div class="row"><form class="row" data-form="rp-save" style="flex:1"><input type="text" id="rp-name" placeholder="${esc(t("rp.nameph"))}" style="flex:1;min-width:180px"><button class="btn sm primary" type="submit">${ic("plus")}${esc(t("rp.save"))}</button></form><span class="chip ${st.pct >= 70 ? "warn" : ""}">${esc(t("rp.storage", {n: st.pct}))}</span></div>
    ${st.pct >= 70 ? `<p class="small" style="color:var(--warn)">${esc(t("rp.storagewarn"))}</p>` : ""}
    ${days.length ? days.map(g => { const ms = g.items.filter(r => r.milestone), au = g.items.filter(r => !r.milestone), open = UI.expanded.has("rpd-" + g.d); return `<div class="stack" style="gap:6px"><h4>${esc(fmtDay(g.d))}</h4>${ms.map(row).join("")}${au.length ? `<button class="btn xs ghost" data-a="toggle-exp" data-k="rpd-${g.d}">${esc(open ? t("rp.hideauto") : t("rp.showauto", {n: au.length}))}</button>${open ? au.map(row).join("") : ""}` : ""}</div>`; }).join("") : empty(t("rp.none"))}`;
}
function rpPreview(p, pv){
  if (!pv.data) return `<div class="busy"><span class="pulse"></span>${esc(t("boot.loading"))}</div>`;
  const s = pv.data.project || {};
  const row = (k, a, b) => `<tr><td>${esc(k)}</td><td class="tnum">${a}</td><td class="tnum">${b}</td></tr>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>${esc(t("rp.then"))}</th><th>${esc(t("rp.now"))}</th></tr></thead><tbody>
    ${row(t("ph.capture"), esc(trunc((s.northStar || {}).goal || "—", 60)), esc(trunc(p.northStar.goal || "—", 60)))}
    ${row(t("int.answered", {n: ""}), arr(s.qa).length, p.qa.length)}${row(t("req.title"), arr(s.requirements).length, p.requirements.length)}
    ${row(t("arch.component"), arr((s.arch || {}).components).length, p.arch.components.length)}${row(t("build.title"), arr((s.pkg || {}).sections).length + " · " + t("draft.short", {n: s.versionNo || 0}), p.pkg.sections.length + " · " + t("draft.short", {n: p.versionNo}))}
    ${row(t("rev.problems"), arr(s.findings).length, p.findings.length)}${row(t("test.title"), arr(s.tests).length, p.tests.length)}</tbody></table></div>`;
}
const CHANGELOG = [
  {v: "1.8.0", d: "2026-11-01", added: "cl.180.added", changed: "cl.180.changed"},
  {v: "1.7.1", d: "2026-11-01", added: "cl.171.added", changed: "cl.171.changed"},
  {v: "1.7.0", d: "2026-10-25", added: "cl.170.added", changed: "cl.170.changed", fixed: "cl.170.fixed"},
  {v: "1.6.0", d: "2026-10-24", added: "cl.160.added", changed: "cl.160.changed"},
  {v: "1.5.0", d: "2026-10-23", added: "cl.150.added", changed: "cl.150.changed", fixed: "cl.150.fixed"},
  {v: "1.4.2", d: "2026-10-22", changed: "cl.142.changed", fixed: "cl.142.fixed"},
  {v: "1.4.1", d: "2026-10-21", added: "cl.141.added", changed: "cl.141.changed", fixed: "cl.141.fixed", removed: "cl.141.removed"},
  {v: "1.4.0", d: "2026-10-20", added: "cl.14.added", changed: "cl.14.changed", fixed: "cl.14.fixed", removed: "cl.14.removed"},
  {v: "1.3.0", d: "2026-10-19", added: "cl.13.added", changed: "cl.13.changed", fixed: "cl.13.fixed", removed: "cl.13.removed"},
  {v: "1.2.1", d: "2026-10-19", added: "cl.121.added", changed: "cl.121.changed", fixed: "cl.121.fixed", removed: "cl.121.removed"},
  {v: "1.2.0", d: "2026-10-19", added: "cl.12.added", changed: "cl.12.changed", fixed: "cl.12.fixed", removed: "cl.12.removed"},
  {v: "1.0.0", d: "2026-10-19", added: "cl.10.added", changed: "cl.10.changed", fixed: "cl.10.fixed", removed: "cl.10.removed"}
];
/** every version since the one this login last saw (so a skipped version is never hidden) */
function whatsNewModal(m){
  const c = CHANGELOG[0], from = (m && m.from) || "";
  let list = from ? CHANGELOG.filter(x => verCmp(x.v, from) > 0) : [c]; if (!list.length) list = [c];
  const body = list.length === 1 ? changelogHTML(c) : list.map(x => `<h3 style="margin:14px 0 4px">${esc(x.v)} <span class="small muted">· ${esc(fmtDate(x.d))}</span></h3>${changelogHTML(x)}`).join("");
  return `<div class="row"><h2 style="flex:1 1 12em">${esc(t("wn.title", {v: c.v}))}</h2><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    <p class="lead">${esc(t("wn.lead", {v: c.v}))}</p>${body}<div class="row end">${btn("modal-close", t("wn.ok"), {cls: "primary"})}</div>`;
}
function changelogHTML(c){ return ["added","changed","fixed","removed"].filter(k => c[k]).map(k => `<div class="stack" style="gap:4px"><h4>${esc(t("cl." + k))}</h4><ul class="small" style="margin:0;padding-left:18px">${t(c[k]).split("|").map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join(""); }
function toolReportModal(m){
  return `<div class="row"><h2 style="flex:1 1 12em">${esc(t("tr.title"))}</h2><button class="iconbtn" data-a="modal-close" aria-label="${esc(t("btn.close"))}">${ic("x")}</button></div>
    <p class="sub">${esc(t("tr.sub"))}</p><form class="stack" data-form="tool-report"><p class="small muted">${esc(t("tr.where", {x: m.where || "—"}))}</p><textarea id="tr-in" rows="5" placeholder="${esc(t("tr.ph"))}"></textarea><div class="row end"><button class="btn ghost" type="button" data-a="modal-close" data-discard="1">${esc(t("btn.cancel"))}</button><button class="btn primary" type="submit">${ic("flag")}${esc(t("tr.send"))}</button></div></form>`;
}
function upgradePrompt(){
  return `Upgrade my Prompt Translator tool (${PT_URL}), currently version ${PT_VERSION}.
1. Read all open tool requests with the ArtifactData tool: url ${PT_URL}, collection "toolfeedback" (each document has text, where, ws, status).
2. Show me the list of planned changes, grouped Added / Changed / Fixed / Removed, and the proposed new version number (three numbers: x.y.Z for fixes only, x.Y.0 for new features that fit the current way of working, X.0.0 for a big change). Wait for my go.
3. Big upgrades: build a separate preview copy with an example project for me to try first. Small fixes: change the live tool after I approve the list.
4. Build, run the full automated test in all three languages, and publish at the same link. Never touch my data.
5. Afterwards: add a What's new entry and a dated change log entry, mark the requests as done (status "done"), and keep rollback available.`;
}
