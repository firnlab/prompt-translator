// PT 1.4 unit checks on copies of the real projects (node test/unit14.js). Never writes real data.
const {makeCtx} = require("./h14.js");
const {load} = require("./tools/load140.js");
const C = makeCtx(), X = C.X;
let fails = 0, oks = 0;
const ok = (c, m) => { if (c) oks++; else { fails++; console.log("  FAIL:", m); } };
const P = load();
X("WS.id = 'w-test'; UI.view = 'project';");
C.__P = P.map(x => JSON.parse(JSON.stringify(x.p)));
X("WS.projects = globalThis.__P.map(normalizeProject); UI.pid = WS.projects[0].id;");
const W = "WS.projects.find(p => p.name.startsWith('Watch'))";

console.log("1 actions and Undo");
X(`UI.pid = ${W}.id`);
let r = X(`(() => { const p = ${W}; const before = JSON.stringify(p.requirements.find(r => r.id === 'R3')); actOpen(p, 'test edit'); p.requirements.find(r => r.id === 'R3').then = 'CHANGED'; p.assumptions[0].text = 'A0 changed'; const a = actClose(p.id); return {n: a.patch.length, refs: a.refs, before}; })()`);
ok(r.n === 2, "an action records exactly the two changed items: " + r.n);
ok(r.refs.includes("req:R3"), "the action knows it changed R3");
X(`(() => { const p = ${W}; actOpen(p, 'other'); p.requirements.find(r => r.id === 'R5').title = 'R5 later'; actClose(p.id); })()`);
r = X(`(() => { const p = ${W}; const a = p.acts.find(x => x.label === 'test edit'); undoAct(p, a.id); return {r3: p.requirements.find(r => r.id === 'R3').then, a0: p.assumptions[0].text, r5: p.requirements.find(r => r.id === 'R5').title}; })()`);
ok(r.r3 !== "CHANGED" && r.a0 !== "A0 changed", "Undo of the first action restores R3 and the assumption");
ok(r.r5 === "R5 later", "the later action on R5 is kept");
r = X(`(() => { const p = ${W}; actOpen(p, 'add'); p.requirements.push({id: 'R999', title: 'x', given:'', when:'', then:'', priority:'should'}); actClose(p.id); undo(); return p.requirements.some(r => r.id === 'R999'); })()`);
ok(r === false, "Undo removes an added item");
r = X(`(() => { const p = ${W}; actOpen(p, 'edit-then-change'); p.northStar.goal = 'G1'; actClose(p.id); const a = lastAct(p); p.northStar.goal = 'G2 by someone else'; undoAct(p, a.id); return p.northStar.goal; })()`);
ok(r === "G2 by someone else", "Undo never overwrites a field that was changed again later");
r = X(`(() => { const p = ${W}; const n = p.acts.length; actOpen(p, 'nothing'); actClose(p.id); return p.acts.length === n; })()`);
ok(r, "an action that changed nothing is not stored");
r = X(`(() => { const p = ${W}; return JSON.stringify(p.acts).length; })()`);
ok(r < 260000, "saved actions stay small: " + r);

console.log("2 project identity");
r = X(`(() => { const p = ${W}; const ref = p; const d = JSON.parse(JSON.stringify(p)); d.northStar.goal = 'from restore'; replaceInPlace(p, d); return ref === ${W} && ref.northStar.goal === 'from restore'; })()`);
ok(r, "restore/undo/conflict keep the same project object, so running AI writes land in the current project");

console.log("3 ids are never reused");
r = X(`(() => { const p = ${W}; const a = nextReqId(p); p.requirements.push({id: a}); p.requirements = p.requirements.filter(r => r.id !== a); const b = nextReqId(p); return [a, b]; })()`);
ok(r[0] !== r[1], "after removing " + r[0] + " the next id is new: " + r[1]);

console.log("4 links: only direct dependents");
r = X(`(() => { const p = ${W}; return depsOf(p, 'req:R3').map(d => d.ref); })()`);
ok(r.length > 0 && r.every(x => /^(test|section|component):/.test(x)), "R3 → its tests, sections, parts: " + r.join(","));
r = X(`(() => { const p = ${W}; const all = p.requirements.length; const n = depsOf(p, 'qa:' + p.qa[0].id).length; return [n, all]; })()`);
ok(r[0] < r[1], "a changed answer marks only linked requirements (" + r[0] + " of " + r[1] + "), not all");

console.log("5 one status model");
r = X(`(() => { RENDERING = true; const p = ${W}; const out = PHASE_IDS.map(ph => [ph, stepInfo(p, ph).state, stepInfo(p, ph).open]); RENDERING = false; return out; })()`);
console.log("   ", r.map(x => x.join(":")).join("  "));
r = X(`(() => { const p = WS.projects.find(x => x.name === 'Untitled project'); return PHASE_IDS.map(ph => stepInfo(p, ph).state).filter(s => s === 'done').length; })()`);
ok(r === 0, "an empty project has no step marked done: " + r);
r = X(`(() => { const p = ${W}; const nb = nextBest10(p); return [nb.phase, stepInfo(p, nb.phase).state]; })()`);
ok(r[1] !== "done", "the next step is never one that is done: " + r.join(" "));

console.log(`\n${oks} ok, ${fails} failed`);
process.exit(fails ? 1 : 0);
