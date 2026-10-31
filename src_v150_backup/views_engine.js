/* =====================================================================
   1.2 VIEWS: frontier scan, gates, score, dials, trial, mini-test,
   ceiling card, knowledge pack, digest, first run, runner setup
   ===================================================================== */

/* one consistent "Auto · X / You chose · Y" control for every engine setting */
function autoSelect(change, k, auto, val, opts, {disabled = []} = {}){
  return `<select data-a-change="${change}" data-k="${k}" aria-label="${esc(t("eng.dial." + k))}">
    <option value="" ${val == null ? "selected" : ""}>${esc(t("eng.auto", {x: (opts.find(o => o[0] === auto) || [auto, auto])[1]}))}</option>
    ${opts.map(([v, l]) => `<option value="${esc(v)}" ${val === v ? "selected" : ""} ${disabled.includes(v) ? "disabled" : ""}>${esc(l)}${disabled.includes(v) ? " · " + esc(t("eng.notyet")) : ""}</option>`).join("")}</select>`;
}
function autoBadge(isAuto){ return isAuto ? `<span class="chip acc">${esc(t("eng.autobadge"))}</span>` : `<span class="chip sel">${esc(t("eng.yoursbadge"))}</span>`; }
function onOff(action, on, rec){ return `<div class="seg" role="group"><button class="${on ? "on" : ""}" data-a="${action}" data-v="1">${esc(t("eng.on"))}${rec === true ? " · " + esc(t("eng.rec")) : ""}</button><button class="${!on ? "on" : ""}" data-a="${action}" data-v="0">${esc(t("eng.off"))}${rec === false ? " · " + esc(t("eng.rec")) : ""}</button></div>`; }
const VERDICT_CLS = {adopt: "ok", buy: "ok", partial: "warn", build: "acc"};

/* ---------- frontier scan (Understand) ---------- */
function frontierPanel(p){
  const e = eng(p), sc = e.scan, r = sc.result, job = sc.job ? WS.jobs.find(j => j.id === sc.job) : null;
  const head1 = head(t("eng.scan"), t("eng.scan.sub"), `<div class="row">${aiBtn("frontier-scan", r ? t("btn.redo") : t("eng.scan.run"), "H", {primary: !r, key: "frontier"})}</div>`);
  let body = "";
  if (sc.state === "running") body = `<div class="busy"><span class="pulse"></span><b>${esc(t("eng.scan.running"))}</b><span class="small">${esc(t("eng.scan.time"))}</span></div>${job ? `<div class="list">${jobLine(job)}</div>` : ""}`;
  else if (sc.state === "failed") body = `<p class="small" style="color:var(--crit)">${esc(t("eng.scan.failed"))} ${esc(sc.error || "")}</p><div class="row">${aiBtn("frontier-local", t("eng.scan.local.run"), "M", {key: "frontier"})}</div>`;
  if (r){
    body += `<div class="stack">
      <div class="row">${chip(t("eng.verdict." + r.verdict), VERDICT_CLS[r.verdict])}${r.local ? chip(t("eng.scan.local"), "warn") : chip(t("eng.scan.web"), "ok")}<span class="small muted">${esc(fmtDate(sc.at))} · ${esc(t("kp.used", {d: fmtDay(r.kp || KP_VERSION)}))}</span></div>
      <p><b>${esc(r.restated)}</b></p>${r.criterion ? `<p class="small"><b>${esc(t("eng.criterion"))}:</b> ${esc(r.criterion)}</p>` : ""}
      <p class="small">${esc(r.verdictWhy)}</p>
      ${r.existing.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("eng.existing"))}</th><th>${esc(t("eng.fit"))}</th><th>${esc(t("eng.note"))}</th></tr></thead><tbody>${r.existing.map(x => `<tr><td>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}<div class="small muted">${esc(x.kind)}${x.cost ? " · " + esc(x.cost) : ""}</div></td><td class="num">${x.fit}</td><td class="small">${esc(x.note)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted">${esc(t("eng.noexisting"))}</p>`}
      ${r.capability.length ? `<details><summary class="small">${esc(t("eng.capfit", {n: r.capability.length}))}</summary><div class="tbl-wrap"><table class="tbl"><tbody>${r.capability.map(c => `<tr><td class="small">${esc(c.need)}</td><td class="small">${esc(c.feature)}</td><td>${chip(t("eng.mat." + c.maturity), c.maturity === "ga" ? "ok" : c.maturity === "none" ? "crit" : "warn")}</td><td class="small muted">${esc(c.note)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      ${r.flags.length ? `<div class="stack">${r.flags.map(f => `<div class="banner warnb"><span class="dot warn"></span><span>${esc(f)}</span></div>`).join("")}</div>` : ""}
      ${r.sources.length ? `<details><summary class="small">${esc(t("eng.sources", {n: r.sources.length}))}</summary><ul class="small">${r.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a>${s.date ? " · " + esc(s.date) : ""}</li>`).join("")}</ul></details>` : ""}
    </div>`;
  } else if (sc.state === "none") body += `<p class="small muted">${esc(t("eng.scan.none"))}</p>`;
  const auto = e.autoScan !== false;
  return `<section class="panel" id="engine-scan" ${p.focus.id === "engine:scan" ? "data-focus" : ""}>${head1}${busyHTML("frontier")}${body}
    <div class="row small"><span class="muted" style="flex:1">${esc(t("eng.scan.auto"))}</span>${onOff("eng-autoscan", auto, true)}</div></section>`;
}

/* ---------- gates ---------- */
function gatesPanel(p, ids){
  const rows = GATES.filter(g => ids.includes(g.id)).map(g => {
    const st = gate(p, g.id), ans = st.ans, sug = st.sug, fired = gateOn(p, g.id), over = gateOverridden(p, g.id);
    const seg = `<div class="seg" role="group">${["yes","no","unknown"].map(v => `<button class="${ans === v ? "on" : ""}" data-a="gate-set" data-g="${g.id}" data-v="${v}">${esc(t("eng.ans." + v))}${!ans && sug && sug.ans === v ? " ★" : ""}</button>`).join("")}</div>`;
    return `<div class="item ${fired && !over ? "sev-high" : ""}" id="gate-${g.id}" ${p.focus.id === "engine:" + g.id ? "data-focus" : ""}><span class="mono" style="color:var(--accent);min-width:28px">${g.id}</span><div class="body">
      <span class="title">${esc(t("gate." + g.key))}${g.must ? ` <span class="chip">${esc(t("eng.gate.must"))}</span>` : ""}</span>
      ${sug ? `<span class="small muted">${esc(t("eng.gate.sug", {a: t("eng.ans." + sug.ans)}))}${sug.evidence ? " — " + esc(sug.evidence) : ""}</span>` : ""}
      ${fired ? `<span class="small" style="color:${over ? "var(--muted)" : "var(--warn)"}">${esc(t("gate.fx." + g.key))}</span>` : ""}
      ${over ? `<span class="small">${esc(t("eng.gate.overridden", {r: st.override.reason}))} ${`<button class="chip tap" data-a="gate-unoverride" data-g="${g.id}">${esc(t("eng.gate.undo"))}</button>`}</span>` : fired && ["G1","G2","G3","G5","G6"].includes(g.id) ? `<div class="row">${btn("gate-override", t("eng.gate.override"), {cls: "sm", attrs: `data-g="${g.id}"`})}</div>` : ""}
    </div><div class="acts">${seg}</div></div>`;
  }).join("");
  const canAccept = GATES.filter(g => ids.includes(g.id)).some(g => !gate(p, g.id).ans && gate(p, g.id).sug);
  return `${canAccept ? `<div class="row"><span class="small muted" style="flex:1">${esc(t("eng.gate.acceptall.hint"))}</span>${btn("gates-accept", t("eng.gate.acceptall"), {icon: "check", cls: "sm", attrs: `data-ids="${ids.join(",")}"`})}</div>` : ""}<div class="list">${rows}</div>`;
}

/* ---------- right-sizing score + track (Requirements) ---------- */
function scorePanel(p){
  const e = eng(p);
  const rows = SCORE_DIMS.map(d => {
    const v = scoreVal(p, d), mine = e.score.val[d] != null;
    return `<div class="item"><div class="body"><span class="title">${esc(t("score2." + d))}</span><span class="small muted">${esc(t("score2." + d + ".hint"))}</span>${(e.score.why || {})[d] ? `<span class="small">${esc(e.score.why[d])}</span>` : ""}</div>
      <div class="acts">${v != null ? autoBadge(!mine) : ""}<div class="seg" role="group">${[0,1,2].map(n => `<button class="${v === n ? "on" : ""}" data-a="score-set" data-d="${d}" data-v="${n}">${n}</button>`).join("")}</div>${mine ? `<button class="chip tap" data-a="score-auto" data-d="${d}">${esc(t("eng.backauto"))}</button>` : ""}</div></div>`;
  }).join("");
  const sr = rungFromScore(p);
  return `<section class="panel" id="engine-score">${head(t("eng.score"), t("eng.score.sub"), aiBtn("eng-suggest", e.suggestAt ? t("btn.redo") : t("eng.suggest"), "L", {key: "eng-suggest"}))}${busyHTML("eng-suggest")}
    <div class="list">${rows}</div>
    <div class="row">${sr ? chip(t("eng.score.rung", {r: sr, x: t("rung." + sr)}), "acc") : ""}${chip(t("eng.autonomycap", {x: autonomyCap(p)}))}<span style="flex:1"></span><label class="fld" style="width:auto"><span>${esc(t("eng.track"))}</span>${autoSelect("track-set", "track", e.track.auto, e.track.val, TRACKS.map(x => [x, t("track." + x)]))}</label></div>
    <p class="hint">${esc(t("track." + track(p) + ".d"))}</p></section>`;
}

/* ---------- architecture: dials, gates G3–G7, trifecta, trial, mini-test, ceiling ---------- */
function dialsPanel(p){
  const e = eng(p), d = e.dials, tf = trifecta(p);
  const row = (k, opts, extra = {}) => { const cur = opts.find(o => o[0] === dial(p, k)); return `<div class="dial"><span class="small muted">${esc(t("eng.dial." + k))}</span>${autoSelect("dial-set", k, d[k].auto, d[k].val, opts, extra)}<b class="small">${esc(cur ? cur[1] : "")}</b>${autoBadge(d[k].val == null)}<span class="small muted">${esc(t("eng.dial." + k + ".hint"))}</span></div>`; };
  return `<section class="panel" id="engine-dials">${head(t("eng.dials"), t("eng.dials.sub"))}
    <div class="dials">
      ${row("rung", RUNGS.map(r => [r, r + " · " + t("rung." + r)]))}
      ${row("setting", SETTINGS_LADDER.map(s => [s.id, s.short + " · " + s.effort]))}
      ${row("platform", PLATFORMS.map(x => [x, t("plat." + x)]), {disabled: ["code","managed"]})}
      ${row("autonomy", AUTONOMY.map(a => [a, a + " · " + t("aut." + a)]))}
    </div>
    <div class="row small">${["private","untrusted","outbound"].map(k => `<span class="chip ${tf.legs[k] ? "warn" : ""}">${tf.legs[k] ? "●" : "○"} ${esc(t("tri." + k))}</span>`).join("")}${tf.all ? `<span style="color:var(--crit)">${esc(t("tri.all"))}</span>` : `<span class="muted">${esc(t("tri.ok"))}</span>`}</div>
    ${gatesPanel(p, ["G3","G4","G5","G6","G7"])}</section>`;
}
function trialPanel(p){
  const e = eng(p), tr = e.trial, on = trialOn(p), rec = trialRecommended(p) && track(p) !== "quick", sm = trialSummary(p);
  const cases = arr(tr.cases);
  return `<section class="panel" id="engine-trial" ${p.focus.id === "engine:trial" ? "data-focus" : ""}>${head(t("eng.trial"), t("eng.trial.sub"), onOff("trial-toggle", on, rec))}
    ${on ? `${busyHTML("trial-cases")}${busyHTML("trial")}${busyHTML("trial-judge")}
      ${cases.length ? `<div class="list">${cases.map((c, i) => { const r = arr(tr.runs).find(x => x.caseId === c.id); const ed = UI.expanded.has("tc-" + c.id) || !c.input; return `<div class="item ${r ? (r.pass ? "" : "sev-crit") : ""}"><span class="mono muted" style="min-width:28px">${esc(c.id)}</span><div class="body">
        ${ed ? `${bindArea("p:engine.trial.cases.#" + c.id + ".input", c.input, {rows: 2})}<label class="fld"><span>${esc(t("eng.trial.expect"))}</span>${bindInput("p:engine.trial.cases.#" + c.id + ".expect", c.expect)}</label>` : `<span class="title">${esc(trunc(c.input, 160))}</span><span class="small muted">${esc(t("eng.trial.expect"))}: ${esc(trunc(c.expect, 140))}</span>`}
        ${r ? `<span class="small" style="color:${r.pass ? "var(--ok)" : "var(--crit)"}">${esc(t(r.pass ? "verd.pass" : "verd.fail"))} — ${esc(r.why)}</span>` : ""}</div>
        <div class="acts">${c.real ? chip(t("eng.trial.real"), "acc") : ""}${btn("toggle-exp", ed ? t("btn.done") : t("btn.edit"), {cls: "sm ghost", attrs: `data-k="tc-${c.id}"`})}${ed ? `<label class="chk small"><input type="checkbox" data-bind="p:engine.trial.cases.#${c.id}.real" ${c.real ? "checked" : ""}>${esc(t("eng.trial.real"))}</label>` : ""}${ibtn("trial-del", "trash", t("btn.delete"), `data-id="${c.id}"`)}</div></div>`; }).join("")}</div>` : `<p class="small muted">${esc(t("eng.trial.none"))}</p>`}
      <div class="row">${aiBtn("trial-cases", cases.length ? t("eng.trial.redraft") : t("eng.trial.draft"), "M", {key: "trial-cases"})}${btn("trial-add", t("eng.trial.add"), {icon: "plus", cls: "sm"})}<span style="flex:1"></span>${aiBtn("trial-run", t("eng.trial.run"), "H", {primary: true, key: "trial"})}</div>
      ${sm ? `<div class="row">${chip(t("eng.trial.result", {a: sm.pass, b: sm.n}), sm.rate >= 90 ? "ok" : sm.rate >= 60 ? "warn" : "crit")}<span class="small">${esc(sm.rate >= 90 ? t("eng.trial.low") : t("eng.trial.climb"))}</span></div>` : ""}`
    : `<p class="small muted">${esc(t(rec ? "eng.trial.offrec" : "eng.trial.offok"))}</p>`}</section>`;
}
function miniPanel(p){
  const e = eng(p), on = miniOn(p), res = arr(e.mini.results);
  const a = settingById(dial(p, "setting")), b = nextSetting(a.id);
  return `<section class="panel" id="engine-mini" ${p.focus.id === "engine:mini" ? "data-focus" : ""}>${head(t("eng.mini"), t("eng.mini.sub", {a: a.short + " · " + a.effort, b: b.short + " · " + b.effort}), onOff("mini-toggle", on, track(p) !== "quick"))}
    ${on ? `${busyHTML("mini")}${busyHTML("mini-judge")}
      ${res.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(t("eng.mini.setting"))}</th><th>${esc(t("eng.mini.passk"))}</th><th>${esc(t("test.flip"))}</th><th>${esc(t("eng.mini.per"))}</th><th></th></tr></thead><tbody>${res.map(r => { const s = miniSummary(r), st = settingById(r.setting); return `<tr class="${r.setting === dial(p, "setting") ? "rec" : ""}"><td><b>${esc(st.short)}</b> · ${esc(st.effort)}${r.named ? "" : `<div class="small muted">${esc(t("eng.mini.tier"))}</div>`}</td><td class="num">${s.passK}%</td><td class="num">${s.flip}%</td><td class="num">${s.perSuccess ?? "—"}</td><td>${r.setting !== dial(p, "setting") ? btn("dial-pick", t("eng.mini.use"), {cls: "sm", attrs: `data-k="setting" data-v="${r.setting}"`}) : chip(t("eng.mini.current"), "acc")}</td></tr>`; }).join("")}</tbody></table></div><p class="hint">${esc(t("eng.mini.hint"))}</p>` : `<p class="small muted">${esc(t("eng.mini.none"))}</p>`}
      <div class="row end">${aiBtn("mini-run", res.length ? t("btn.redo") : t("eng.mini.run"), "H", {primary: !res.length, key: "mini"})}</div>`
    : `<p class="small muted">${esc(t("eng.mini.off"))}</p>`}</section>`;
}
function ceilingHTML(p){
  const c = ceilingCard(p), rec = c.rec, top = c.top;
  const row = (lbl, a, b) => `<tr><th>${esc(lbl)}</th><td>${a}</td><td>${b}</td></tr>`;
  const m = x => x ? esc(t("eng.ceil.measured", {k: x.passK, f: x.flip})) : `<span class="muted">${esc(t("eng.ceil.notmeasured"))}</span>`;
  const climbs = arr(eng(p).climb).slice(-6).reverse();
  return `<section class="panel ceil" id="engine-ceiling">${head(t("eng.ceil"), t("eng.ceil.sub"))}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>${esc(t("eng.ceil.rec"))}</th><th>${esc(t("eng.ceil.top"))}</th></tr></thead><tbody>
      ${row(t("eng.dial.rung"), esc(rec.rung + " · " + t("rung." + rec.rung)), esc(top.rung + " · " + t("rung." + top.rung)))}
      ${row(t("eng.dial.setting"), esc(rec.setting.short + " · " + rec.setting.effort), esc(top.setting.short + " · " + top.setting.effort))}
      ${row(t("eng.dial.platform"), esc(t("plat." + rec.platform)), esc(t("plat." + top.platform)) + ` <span class="small muted">${esc(t("eng.notyet"))}</span>`)}
      ${row(t("eng.dial.autonomy"), esc(rec.autonomy + " · " + t("aut." + rec.autonomy)), esc(top.autonomy + " · " + t("aut." + top.autonomy)))}
      ${row(t("eng.ceil.measure"), m(c.recM), (c.upM ? esc(t("eng.ceil.stepup", {s: settingById(c.upM.setting).short + " · " + settingById(c.upM.setting).effort})) + " " + m(c.upM) + "<br>" : "") + esc(t("eng.ceil.tokens", {a: c.topMult})))}
      ${row(t("eng.ceil.upkeep"), esc(t(num(rec.rung.slice(1), 2) >= 4 ? "eng.upkeep.high" : num(rec.rung.slice(1), 2) >= 3 ? "eng.upkeep.mid" : "eng.upkeep.low")), esc(t("eng.upkeep.top")))}
    </tbody></table></div>
    <div class="grid2"><div class="panel flat"><h4>${esc(t("eng.ceil.whynot"))}</h4><p class="small">${esc(c.why)}</p></div><div class="panel flat"><h4>${esc(t("eng.ceil.climb"))}</h4><p class="small">${esc(c.climb)}</p></div></div>
    ${climbs.length ? `<details><summary class="small">${esc(t("eng.climblog", {n: arr(eng(p).climb).length}))}</summary><div class="list">${climbs.map(x => `<div class="item"><div class="body"><span class="small">${esc(fmtDate(x.at))} · ${esc(climbWhat(x.what))}: ${esc(climbVal(x.what, x.from))} → ${esc(climbVal(x.what, x.to))}</span><span class="small muted">${esc(x.reason)}</span></div></div>`).join("")}</div></details>` : ""}</section>`;
}
function climbWhat(w){ return {rung: t("eng.dial.rung"), setting: t("eng.dial.setting"), platform: t("eng.dial.platform"), autonomy: t("eng.dial.autonomy"), track: t("eng.track"), trial: t("eng.trial"), gate: t("eng.gate.word")}[w] || w; }
function climbVal(w, v){ if (w === "setting"){ const s = SETTINGS_LADDER.find(x => x.id === v); return s ? s.short + " · " + s.effort : v; } if (w === "track" && TRACKS.includes(v)) return t("track." + v); if (w === "platform" && PLATFORMS.includes(v)) return t("plat." + v); return v; }

/* ---------- knowledge pack (Settings) ---------- */
function knowledgeTab(){
  const props = KP.proposals.filter(x => x.status !== "done"), done = KP.proposals.filter(x => x.status === "done").slice(0, 5);
  const stale = kpStaleItems();
  const item = (pr, it, i) => `<div class="item ${it.urgent ? "sev-high" : ""}"><div class="body"><span class="title">${chip(t("kp.op." + it.op))} ${chip(t("kp.kind." + it.kind))} ${esc(it.target || (it.after || {}).id || "")}${it.urgent ? " " + chip(t("kp.urgent"), "crit") : ""}</span>
    <span class="small">${esc(it.why)}</span>${it.before ? `<span class="small muted">${esc(t("kp.before"))}: ${esc(trunc(it.before, 160))}</span>` : ""}
    <span class="small muted">${esc(t("kp.after"))}: ${esc(trunc(L(it.after || {}) || (it.after || {}).ai || (it.after || {}).text || (it.after || {}).label || JSON.stringify(it.after || {}), 220))}</span>
    ${it.src ? `<a class="small" href="${esc(it.src)}" target="_blank" rel="noopener">${esc(trunc(it.src, 80))}</a>` : ""}</div>
    <div class="acts">${!it.status || it.status === "open" ? (Store.isOwner ? `${btn("kp-decide", t("kp.approve"), {cls: "sm primary", attrs: `data-p="${pr.id}" data-i="${i}" data-v="approved"`})}${btn("kp-decide", t("kp.reject"), {cls: "sm ghost", attrs: `data-p="${pr.id}" data-i="${i}" data-v="rejected"`})}` : chip(t("kp.waiting"))) : chip(t("kp.st." + it.status), it.status === "approved" ? "ok" : "")}</div></div>`;
  return `<div class="stack">
    <div class="row">${chip(kpLabel(), KP.source === "pack" ? "ok" : "")}${stale.length ? chip(t("kp.stale", {n: stale.length}), "warn") : chip(t("kp.fresh"), "ok")}<span style="flex:1"></span>${Store.isOwner ? btn("kp-refresh", t("kp.checknow"), {icon: "globe", cls: "sm"}) : ""}</div>
    <p class="small muted">${esc(Store.isOwner ? t("kp.lead.owner", {d: t("kp.sunday")}) : t("kp.lead.other"))}</p>
    ${props.length ? props.map(pr => `<div class="panel flat stack"><div class="row"><b style="flex:1 1 12em">${esc(fmtDate(pr.at))} · ${esc(pr.summary || "")}</b>${Store.isOwner && arr(pr.items).some(x => !x.status || x.status === "open") ? btn("kp-decide", t("kp.approveall"), {cls: "sm", attrs: `data-p="${pr.id}" data-i="all" data-v="approved"`}) : ""}</div><div class="list">${arr(pr.items).map((it, i) => item(pr, it, i)).join("") || `<p class="small muted">${esc(t("kp.nochanges"))}</p>`}</div></div>`).join("") : `<p class="small muted">${esc(t("kp.noprops"))}</p>`}
    ${stale.length ? `<details><summary class="small">${esc(t("kp.staleitems"))}</summary><ul class="small">${stale.map(s => `<li>${esc(s.id)} · ${esc(t("kp.verified", {d: s.verified || "—"}))}</li>`).join("")}</ul></details>` : ""}
    <details><summary class="small">${esc(t("kp.models"))}</summary><div class="tbl-wrap"><table class="tbl"><tbody>${kpModels().map(m => `<tr><td>${esc(m.label)}</td><td>${chip(t("kp.mst." + (m.status || "active")), m.status === "active" ? "ok" : "warn")}</td><td class="small">${m.retires ? esc(t("kp.retires", {d: fmtDay(m.retires)})) : ""}</td><td class="small muted">${esc(m.notes || "")}</td></tr>`).join("")}</tbody></table></div></details>
    ${arr(KP.log).length ? `<details><summary class="small">${esc(t("kp.log"))}</summary><ul class="small">${KP.log.slice().reverse().map(l => `<li>v${l.v} · ${esc(fmtDate(l.at))}: ${esc(arr(l.items).join("; "))}</li>`).join("")}</ul></details>` : ""}
    ${done.length ? `<details><summary class="small">${esc(t("kp.done"))}</summary><ul class="small">${done.map(pr => `<li>${esc(fmtDate(pr.at))} · ${esc(pr.summary || "")}</li>`).join("")}</ul></details>` : ""}
  </div>`;
}

/* ---------- Cockpit: urgent items, monthly digest, setup cards ---------- */
function cockpitEngine(){
  let h = "";
  const urg = urgentItems();
  if (urg.length) h += `<section class="panel" style="border-color:var(--crit)">${head(t("urg.title"), t("urg.sub"))}<div class="list">${urg.map(u => `<div class="item sev-crit"><span class="dot crit" style="margin-top:7px"></span><div class="body"><span>${esc(u.text)}</span></div>${u.pid ? btn("open-project", t("btn.open"), {cls: "sm", attrs: `data-id="${u.pid}"`}) : u.prop ? btn("kp-open", t("kp.review"), {cls: "sm"}) : ""}</div>`).join("")}</div></section>`;
  if (!Runner.ready() && Store.mode === "cloud") h += runnerSetupCard();
  if (UI.jiewenEmpty) h += `<section class="panel">${head(t("jw.title"), t("jw.sub"))}<div class="row">${btn("jw-remove", t("jw.remove"), {cls: "sm"})}${btn("jw-keep", t("jw.keep"), {cls: "sm ghost"})}</div></section>`;
  const mk = monthKey(new Date(Date.now() - 15 * 864e5));
  if ((WS.settings.digestSeen || "") !== mk && WS.projects.length){
    const d = digest(mk);
    h += `<section class="panel">${head(t("dig.title", {m: mk}), t("dig.sub"), btn("digest-seen", t("dig.seen"), {cls: "sm ghost", attrs: `data-m="${mk}"`}))}
      <div class="row">${chip(t("dig.live", {n: d.live}))}${chip(t("dig.releases", {n: d.releases.length}))}${chip(t("dig.inbox", {n: d.inbox}), d.inbox ? "warn" : "")}${chip(t("dig.props", {n: d.props}), d.props ? "acc" : "")}${d.stale ? chip(t("kp.stale", {n: d.stale}), "warn") : ""}</div>
      ${d.retiring.length ? `<p class="small" style="color:var(--warn)">${esc(t("dig.retiring", {x: d.retiring.map(m => m.short + " " + fmtDay(m.retires)).join(", ")}))}</p>` : ""}
      ${d.climb.length ? `<ul class="small">${d.climb.map(c => `<li>${esc(c.s)}</li>`).join("")}</ul>` : `<p class="small muted">${esc(t("dig.noclimb"))}</p>`}</section>`;
  }
  return h;
}
function runnerSetupCard(){
  return `<section class="panel">${head(t("rs.title"), t("rs.sub"))}<p class="small">${esc(t("rs.what"))}</p><div class="row">${btn("runner-setup", t("rs.go"), {icon: "arrow", cls: "primary sm"})}<span class="hint">${esc(t("rs.hint"))}</span></div></section>`;
}
function firstRunView(){
  const f = UI.firstRun || {};
  return `<div class="lock"><div class="lock-card stack"><div class="row"><span class="brand-mark">PT</span><h2>${esc(t("fr.title"))}</h2></div>
    <p class="small">${esc(t("fr.sub"))}</p>
    <label class="fld"><span>${esc(t("fr.name"))}</span><input type="text" id="fr-name" data-bind="ui:firstRun.name" value="${esc(f.name || "")}" placeholder="${esc(t("fr.nameph"))}"></label>
    <div class="seg" role="group">${LANGS.map(l => `<button class="${(f.lang || LANG) === l.id ? "on" : ""}" data-a="fr-lang" data-v="${l.id}">${esc(l.label)}</button>`).join("")}</div>
    <p class="hint">${esc(t((f.lang || LANG) === "zh" ? "fr.def.zh" : "fr.def.other"))}</p>
    <div class="row end">${btn("first-run-go", t("fr.go"), {icon: "arrow", cls: "primary"})}</div></div></div>`;
}
