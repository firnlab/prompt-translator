// Static checks for the bug classes found in the 1.4.1 bug hunt. Fast (no browser). Run before every release:
//   node test/static_checks.js [baseline-src-dir]      (baseline = the sources of the release before, e.g. src_v140_backup)
// Hard checks fail the run (exit 1); "review" items are listed for a person to look at (only in files changed since the baseline).
// A line can opt out of a review check with a trailing comment:  // ok:<check>  (for example  // ok:trunc  because it is a label).
const fs = require('fs'), vm = require('vm'), path = require('path');
const order = require('child_process').execSync("python3 -c \"import re;s=open('build.py').read();print(' '.join(re.search(r'order = \\[(.*?)\\]', s, re.S).group(1).replace('\\\"','').replace(',',' ').split()))\"").toString().trim().split(/\s+/);
const base = process.argv[2] || (fs.readdirSync('.').filter(d => /^src_v\d+_backup$/.test(d)).sort((a, b) => +b.match(/\d+/)[0] - +a.match(/\d+/)[0])[0]);
const strFiles = order.filter(f => /^(knowledge|strings)/.test(f)), codeFiles = order.filter(f => !/^(knowledge|strings)/.test(f));
const ctx = {}; vm.createContext(ctx); vm.runInContext(strFiles.map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n') + '\n;this.STR=STR;', ctx);
const STR = ctx.STR, src = f => fs.readFileSync('src/' + f, 'utf8');
// strings of the release before: review items only for strings that are new or changed
let OLD = {}; try{ const c2 = {}; vm.createContext(c2); vm.runInContext(strFiles.filter(f => fs.existsSync(path.join(base, f))).map(f => fs.readFileSync(path.join(base, f), 'utf8')).join('\n') + '\n;this.STR=STR;', c2); OLD = c2.STR || {}; }catch(e){}
const isNew = k => JSON.stringify(OLD[k]) !== JSON.stringify(STR[k]);
const DU_OK = new Set(["pc.numberhint"]);   // "Sie" here means "it" (die Zahl), not formal address
const code = codeFiles.map(src).join('\n');
const changed = f => { const b = base && path.join(base, f); return !b || !fs.existsSync(b) || fs.readFileSync(b, 'utf8') !== src(f); };
const hard = [], review = [];
// 0. every source file parses on its own, and the whole script parses (cause 44: one stray quote or comment breaks the app while the build still succeeds)
for (const f of order.filter(f => f.endsWith('.js'))){ try{ new vm.Script(src(f), {filename: f}); }catch(e){ hard.push(`[parse] ${f}: ${String(e.message).slice(0, 160)}`); } }
try{ new vm.Script(order.filter(f => f.endsWith('.js')).map(src).join('\n;\n'), {filename: 'all'}); }catch(e){ hard.push(`[parse] the joined script: ${String(e.message).slice(0, 160)}`); }
const H = (check, msg) => hard.push(`[${check}] ${msg}`), R = (check, f, i, line) => { if (!new RegExp('ok:' + check).test(line)) review.push(`[${check}] ${f}:${i + 1}  ${line.trim().slice(0, 150)}`); };

/* 1. strings: three languages, matching placeholders, German "ss" and "du", Simplified Chinese, no "1 rules" plurals */
const TRAD = /[們這個為來說時會還對從進動學開關點應裡後過經與畫題幾當麼實現樣種將認號證覽發單達務層頁錯讓權條總處]/;   // common Traditional-only forms
for (const k in STR){ const r = STR[k];
  if (!Array.isArray(r) || r.length !== 3 || r.some(x => !x)){ H('strings', k + ': needs [en, de, zh]'); continue; }
  const v = x => (x.match(/\{[a-z]+\}/g) || []).sort().join(); if (v(r[1]) !== v(r[0]) || v(r[2]) !== v(r[0])) H('strings', k + ': placeholders differ');
  if (r[1].includes('ß')) H('strings', k + ': German uses ß (write ss)');
  if (isNew(k) && !DU_OK.has(k) && /\b(Sie|Ihr|Ihre|Ihnen|Ihren)\b/.test(r[1]) && !/\b(sie|ihr)\b.*\b(sie|ihr)\b/i.test(r[0]) && !/they|them|their/i.test(r[0])) review.push(`[du] ${k}: "${r[1].slice(0, 90)}" (formal Sie? PT uses du)`);
  if (TRAD.test(r[2])) H('strings', k + ': Chinese has a Traditional character (use Simplified)');
  if (isNew(k) && /\{n\} [a-z]+s\b/.test(r[0])) review.push(`[plural] ${k}: "${r[0].slice(0, 90)}" reads wrong for n = 1`); }
const used = new Set([...code.matchAll(/(?:^|[^a-zA-Z0-9_.])t\("([a-zA-Z0-9_.]+)"(?!\s*\+)/g)].map(m => m[1]).filter(k => !k.endsWith('.')));   // "key" + variable is a dynamic family
for (const k of used) if (!STR[k]) H('strings', 'missing key ' + k);

/* 2. every action, change handler and form named in the markup exists */
const defined = new Set([...code.matchAll(/"([a-z0-9-]+)":\s*(?:async\s*)?(?:\([^()]*\)|[a-z]+)\s*=>/gi)].map(m => m[1]));
for (const m of code.matchAll(/ACTIONS\[["']([a-z0-9-]+)["']\]\s*=/g)) defined.add(m[1]);
for (const m of code.matchAll(/FORMS\[["']([a-z0-9-]+)["']\]\s*=/g)) defined.add(m[1]);
for (const [attr, label] of [['data-a', 'action'], ['data-a-change', 'change handler'], ['data-form', 'form']]){
  for (const m of code.matchAll(new RegExp(attr + '="([a-z0-9-]+)"', 'g'))) if (!defined.has(m[1])) H('handlers', `${label} "${m[1]}" is used in markup but never defined`); }

/* 3. build-level: no duplicate function names (build.py also refuses), wrappers of functions that exist */
for (const m of code.matchAll(/const orig = ([A-Za-z0-9_]+); \1 = function/g)) if (!new RegExp('function ' + m[1] + '\\s*\\(').test(code)) H('wrappers', 'wraps a function that does not exist: ' + m[1]);
for (const m of code.matchAll(/const orig = ACTIONS\[["']([a-z0-9-]+)["']\]/g)) if (!defined.has(m[1])) H('wrappers', 'wraps an action that does not exist: ' + m[1]);

/* 3a. one definition per name (1.0–1.3: a later duplicate silently replaced the earlier one: job kinds, aiImpact, string keys → leftover "Sie") */
{ const seen = {};
  for (const f of strFiles){ const txt = src(f); for (const m of txt.matchAll(/"([a-zA-Z0-9_.]+)"\s*:\s*\[\s*"/g)){ (seen[m[1]] = seen[m[1]] || []).push(f); } }
  for (const [k, fs2] of Object.entries(seen)) if (fs2.length > 1) H('names', `string key "${k}" is defined ${fs2.length} times (${[...new Set(fs2)].join(', ')}): only the last one counts`);
  const tops = {};
  for (const f of codeFiles){ for (const m of src(f).matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) (tops[m[1]] = tops[m[1]] || []).push(f); }
  for (const [k, fs2] of Object.entries(tops)) if (fs2.length > 1) H('names', `top-level name "${k}" is declared in ${fs2.join(', ')}`);
  // ids must come from a counter of the highest id, never from the list length (a delete then an add reuses an id)
  for (const f of codeFiles) src(f).split('\n').forEach((line, i) => { if (/\bid\s*[:=][^;\n]*\.length\s*\+\s*1/.test(line) && !/ok:id/.test(line)) H('ids', `${f}:${i + 1} id from length + 1: ${line.trim().slice(0, 120)}`); }); }

/* 3b. layout rules that caused squeezed text and cut-off menus (1.4.2) */
{ const css = fs.readFileSync('src/styles.css', 'utf8');
  if (/overflow-wrap\s*:\s*anywhere/.test(css) || /overflow-wrap:\s*anywhere|overflowWrap\s*=\s*["']anywhere/.test(code)) H('layout', 'overflow-wrap:anywhere lets a box shrink to one letter per line; use break-word');
  if (!/function menuFloat\s*\(/.test(code) || !/addEventListener\("toggle"[^\n]*menuFloat\(/.test(code)) H('layout', 'menus must open in the top layer (menuFloat) so no box can cut them off'); }

/* 3c. AI calls (1.0–1.4: content in the wrong language; text from files or the web read as orders; the measured prompt changed by PT) */
{ for (const f of codeFiles) src(f).split('\n').forEach((line, i) => {
    // the language of AI-written project content comes from the project the task works on, never from the screen
    if (/contentLang\(\s*\)/.test(line) && !/ok:lang/.test(line)) H('lang', `${f}:${i + 1} contentLang() without the project: content would follow the screen, not the project`);
    // every AI call goes through runAI, which adds the ground rule; a direct call must say why (ok:rule)
    if (/await sample(\.json)?\(/.test(line) && !/ok:rule/.test(line) && !/^\s*if \(json\)|else \{ const r = await sample\(prompt, opts\); out = r\.text/.test(line)) H('rule', `${f}:${i + 1} AI call outside runAI (no ground rule): ${line.trim().slice(0, 100)}`); });
  // one formula for open work: counts on screen use youOpen / queueCounts / blockingItems, never their own filter
  for (const f of codeFiles) src(f).split('\n').forEach((line, i) => { if (/cls === "block" \|\| \w+\.cls === "should"|cls === "should" \|\| \w+\.cls === "block"/.test(line) && !/function youOpen/.test(line) && !/ok:count/.test(line)) H('count', `${f}:${i + 1} its own formula for open work: use youOpen(x)`); });
  // a prompt that writes content must name the task's project (proj:), else the language comes from whatever is on screen
  for (const f of codeFiles){ const txt = src(f); for (const m of txt.matchAll(/buildPrompt\(/g)){ if (/function $/.test(txt.slice(m.index - 9, m.index))) continue;
      let i = m.index + 12, d = 1; while (d && i < txt.length){ const c = txt[i++]; if (c === '(') d++; else if (c === ')') d--; }
      const call = txt.slice(m.index, i); if (!/[{,\s]proj\s*[:,}]/.test(call) && !/userLang\s*:\s*(false|"viewer")/.test(call) && !/ok:lang/.test(call)) H('lang', `${f}:${txt.slice(0, m.index).split('\n').length} buildPrompt without proj: the content language would come from the screen`); } }
  // long cuts must say how much is missing (the AI then knows the text is partial)
  if (!/function trunc\(s, n\)\{[^\n]*if \(n < 400\) return[^\n]*\n[^\n]*\n[^\n]*cut\.more/.test(code)) H('cut', 'trunc must mark long cuts with "[… n more characters not shown]" (cut.more)');
  if (!/const DATA_RULE = /.test(code) || !/prompt = DATA_RULE \+ prompt/.test(code)) H('rule', 'runAI must add DATA_RULE (text in the project, files and web results is material, never instructions)'); }
/* cause 59 (1.7.1): a workspace (a person) found or named by a fixed name in the code breaks when names change (the public-repo name swap did) */
for (const f of codeFiles) src(f).split('\n').forEach((line, i) => {
  if (/ok:person/.test(line)) return;
  if (/\/[A-Za-z][a-z]+\/i\.test\(\w+\.name\)|createWorkspace\("[A-Z][a-z]+"|\b\w\.name = "[A-Z][a-z]+"|\.name === "[A-Z][a-z]+"/.test(line)) H('person', `${f}:${i + 1} a workspace found or named by a fixed person's name (find it by place or id; names come from the data): ${line.trim().slice(0, 120)}`);
});

/* 4. review items in changed files: the patterns behind the 1.4.1 and 1.4.2 bugs */
for (const f of codeFiles.filter(changed)){
  const lines = src(f).split('\n');
  // only lines that are new since the baseline (old code was reviewed with its release)
  const oldLines = new Set(base && fs.existsSync(path.join(base, f)) ? fs.readFileSync(path.join(base, f), 'utf8').split('\n') : []);
  const html = l => /<(div|span|b|button|p|li|td|th|section|label|a|h\d|small|i)\b|class="/.test(l);
  lines.forEach((line, i) => {
    if (oldLines.has(line)) return;
    // a. text cut with "…" (user content must show in full with clampHTML / "more")
    if (/\btrunc\(/.test(line) && html(line) && !/function trunc/.test(line)) R('trunc', f, i, line);
    // b. a template value going into HTML without esc() / clampHTML / chip (XSS or broken markup)
    for (const m of line.matchAll(/\$\{([^{}]*?)\}/g)){ const x = m[1].trim();
      if (/^(esc|clampHTML|chip|ic|t\(|mdLite|verdictCtl|inspBtn|markChip|btn|aiBtn|busyHTML|stSlot|head|bindInput|bindArea|bindSelect|num|JSON|fmt|\d|"|'|`)/.test(x) || /\?|&&|\|\||\.map\(|\.join\(|\(p\b|\(p,|Panel\(|Card\(|Bar\(|HTML\(|Row\(|Ctl\(|Strip\(|List\(|Table\(|View\(/.test(x)) continue;
      if (html(line) && /\.(title|text|why|input|output|name|summary|content|label|reason|note|then|when)\b/.test(x)) R('esc', f, i, line); }
    // c. keyboard handlers must ignore typing and open dialogs
    if (/addEventListener\("keydown"/.test(line)){ const body = lines.slice(i, i + 6).join('\n'); if (!/typingNow|isComposing|matches\("input/.test(body)) R('keys', f, i, line); }
    // d. AI results applied without opening a PT action first (Undo would undo the wrong thing)
    if (/await (runAI|ai[A-Z][A-Za-z]*)\(/.test(line)){ const after = lines.slice(i, i + 4).join('\n'); if (!/snapshot\(|actOpen\(|return /.test(after) && !/^\s*(const|let) r = await/.test(line)) R('undo', f, i, line); }
    // e. "Undo" offered right after something that may have changed nothing
    if (/toastUndo\(/.test(line) && /\{n\}|n: 0|\(n\b|keys\.length/.test(line) && !/if \(n|n \?|n && /.test(line)) R('undo', f, i, line);
    // f. new project fields: must survive reload and Undo (see test/hunt.py persist + undo checks)
    for (const m of line.matchAll(/\bp\.([a-zA-Z]+) = (?:p\.\1 \|\| )?(?:\{|\[)/g)) R('field', f, i, line);
    // k. text with flex:1 (basis 0) shrinks to a word per line next to buttons: give it a basis, e.g. flex:1 1 12em
    if (/<(h[1-6]|b|p|label|strong)\b[^>]*style="flex:1[;"]/.test(line)) R('squeeze', f, i, line);
    // l. AI context or package text cut to a fixed size (1.3: the AI saw only the first 48,000 characters; the checker 2,500)
    if (/(JSON\.stringify|projectContext|context|pkg|prompt)[^\n]*\.slice\(0,\s*\d{3,}\)/.test(line)) R('cut', f, i, line);
    // m. an action on real tools (scheduled tasks, pages) without the preview guard (1.2: the preview could act on live tools)
    if (/"(create_trigger|update_trigger|fire_trigger|delete_trigger)"/.test(line) && !/PT_PREVIEW|preview_blocked/.test(lines.slice(Math.max(0, i - 6), i + 1).join('\n'))) R('preview', f, i, line);
    // n. a stored copy of the project used after an await (1.2–1.4: results written into a stale copy and lost) — re-read with liveP
    if (/^\s*(const|let)\s+r\s*=\s*await\s+/.test(line)){ const after = lines.slice(i + 1, i + 4).join('\n'); if (/\bp\.[a-zA-Z]+\s*=(?!=)/.test(after) && !/liveP|curP\(\)|snapshot\(|actOpen\(/.test(after)) R('stale', f, i, line); }
    // h. an action reads a field by id from the whole page: when the box is on screen twice it reads the wrong copy (use nearField)
    if (/^\s*"[a-z0-9-]+":\s*(async\s*)?\(?el/.test(line) && /\$\("#[a-z]/.test(line) && !/nearField/.test(line)) R('field', f, i, line);
    // i. "where you are" markers must use the step you view (p.focus.ph), not how far the project got (p.phase)
    if (/(class="here|aria-current|"sel"|\? "sel"|\bhere\b)/.test(line) && /=== p\.phase/.test(line)) R('here', f, i, line);
    // o. an empty catch hides a failure from the person (1.0–1.3: saves and AI calls failed silently); say what happened or add ok:catch
    if (/catch\s*(\(\s*\w*\s*\))?\s*\{\s*\}/.test(line)) R('catch', f, i, line);
    // p. a verdict forced to true/false: "unknown" and "not judged" must stay their own state (1.2: unknown counted as fail)
    if (/!!\s*[\w.]*\b(pass|ok|verdict|good|judged)\b/.test(line)) R('verdict', f, i, line);
    // q. the screen moves after a wait without the person asking (1.3–1.4.2: jumps while reading or typing)
    if (/scrollIntoView|window\.scrollTo|setPhase\(/.test(line) && /await /.test(lines.slice(Math.max(0, i - 8), i).join('\n')) && !/UI\.jumped|byUser|userAsked/.test(lines.slice(Math.max(0, i - 8), i + 1).join('\n'))) R('move', f, i, line);
    // r. an AI answer used without a shape check (1.0–1.4: wrong shapes crashed screens or wrote half data); pass validate:
    if (/\brunAI\(/.test(line) && !/function runAI/.test(line) && !/validate|json:\s*false/.test(lines.slice(i, i + 4).join('\n'))) R('validate', f, i, line);
    // s. stored text cut with "…" (1.4.1: criteria stored as "When When …")
    if (/\.slice\(0,\s*\d+\)\s*\+\s*["'`]…/.test(line)) R('cut', f, i, line);
    // t. an internal id shown as text (people see R3 / T2 only in Pro; never fd-…, ex-… or ref strings)
    if (/>[^<>"]*\$\{[^}]*\.(id|ref|key)\}[^"]*</.test(line) && !/data-|value=|for=/.test(line.split('${')[0].slice(-30))) R('rawid', f, i, line);
    // u. an AI loop without a cap (1.3–1.4: loops that never converged; runaway cost): name the limit (max, cap, rounds, budget)
    if (/^\s*(while|for|do)\b/.test(line) && /await (runAI|ai[A-Z]\w*)\(/.test(lines.slice(i, i + 12).join('\n')) && !/max|cap|limit|round|tries|budget|<\s*\d|\.length|of |in /.test(line)) R('loop', f, i, line);
    // j. a new "go to" that sets the target but never checks it can be found
    if (/UI\.flashRef\s*=/.test(line) && /goRef|setPhase/.test(line) && !/navRef/.test(line)) R('goto', f, i, line);
  });
  // g. a regex on human words without word boundaries ("iframe" → "rame", "当前" → "前")
  lines.forEach((line, i) => { if (oldLines.has(line)) return; if (/new RegExp|= \/\^\\s\*\(\?:/.test(line) && /(when|wenn|falls|if|当|如果)/.test(line) && !/\(\?!\[\\p\{L\}/.test(line)) R('regex', f, i, line); });
}
/* 5. new CSS (1.3–1.4.2: labels over boxes, menus cut off, squeezed text): absolute positions and raw z-index need a look */
{ const cssNow = fs.readFileSync('src/styles.css', 'utf8').split('\n'), bcss = base && path.join(base, 'styles.css');
  const old = new Set(bcss && fs.existsSync(bcss) ? fs.readFileSync(bcss, 'utf8').split('\n') : []);
  cssNow.forEach((line, i) => { if (old.has(line) || /ok:css/.test(line)) return;
    if (/position\s*:\s*(absolute|fixed)/.test(line)) R('overlap', 'styles.css', i, line);
    if (/z-index\s*:\s*\d{3,}/.test(line)) R('overlap', 'styles.css', i, line);
    if (/(^|[;{\s])flex\s*:\s*1\s*[;}]/.test(line) || /min-width\s*:\s*0\b/.test(line)) R('squeeze', 'styles.css', i, line);
    if (/height\s*:\s*\d+px/.test(line) && /overflow\s*:\s*hidden/.test(line)) R('cut', 'styles.css', i, line); }); }
console.log(`static checks (baseline ${base || 'none'}): ${hard.length} hard, ${review.length} to review`);
if (hard.length){ console.log('HARD'); hard.slice(0, 60).forEach(x => console.log('  ' + x)); }
if (review.length){ console.log('REVIEW (look at each; add // ok:<check> when it is fine)'); review.slice(0, 120).forEach(x => console.log('  ' + x)); }
process.exit(hard.length ? 1 : 0);
