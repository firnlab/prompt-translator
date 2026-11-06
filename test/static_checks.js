// Static checks for the bug classes found in the 1.4.1 bug hunt. Fast (no browser). Run before every release:
//   node test/static_checks.js [baseline]      (baseline = the sources of the release before: a folder such as src_v180_backup, or a tag such as v2.0.0)
// Hard checks fail the run (exit 1); "review" items are listed for a person to look at (only in files changed since the baseline).
// A line can opt out of a review check with a trailing comment:  // ok:<check>  (for example  // ok:trunc  because it is a label).
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), cp = require('child_process');
const order = cp.execSync("python3 -c \"import re;s=open('build.py').read();print(' '.join(re.search(r'order = \\[(.*?)\\]', s, re.S).group(1).replace('\\\"','').replace(',',' ').split()))\"").toString().trim().split(/\s+/);
// 2.1 (J15): the baseline is NAMED here. Until 2.0 it was "the newest src_v*_backup folder", which stayed src_v180_backup for nine releases,
// so the "function removed while a caller is left" check (cause 99) could not see any function added in 1.9, 1.10 or 2.0.
// After each release set this to that release's tag (RELEASE-CHECKS post-release step 1); no new backup folder is needed.
const BASELINE_TAG = 'v2.0.0';
const baseArg = process.argv[2] || BASELINE_TAG, baseFail = [];
let base = baseArg;
if (!fs.existsSync(baseArg)){
  base = null;
  if (!/^v\d+\.\d+\.\d+$/.test(baseArg)) baseFail.push(`baseline "${baseArg}" is neither a folder nor a release tag`);
  else try{ const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-base-'));
    process.on('exit', () => { try{ fs.rmSync(d, {recursive: true, force: true}); }catch(e){ /* a temp folder left behind is harmless */ } });
    cp.execSync(`git archive ${baseArg} src | tar -x -C "${d}"`, {stdio: ['ignore', 'ignore', 'pipe']});
    if (fs.existsSync(path.join(d, 'src'))) base = path.join(d, 'src'); else baseFail.push(`tag ${baseArg} has no src/`); }
  catch(e){ baseFail.push(`cannot read tag ${baseArg} (a shallow clone without tags? use fetch-depth: 0): ${String(e.stderr || e.message).trim().slice(0, 140)}`); } }
const strFiles = order.filter(f => /^(knowledge|strings)/.test(f)), codeFiles = order.filter(f => !/^(knowledge|strings)/.test(f));
const ctx = {}; vm.createContext(ctx); vm.runInContext(strFiles.map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n') + '\n;this.STR=STR;', ctx);
const STR = ctx.STR, src = f => fs.readFileSync('src/' + f, 'utf8');
// strings of the release before: review items only for strings that are new or changed
let OLD = {}; try{ const c2 = {}; vm.createContext(c2); vm.runInContext(strFiles.filter(f => fs.existsSync(path.join(base, f))).map(f => fs.readFileSync(path.join(base, f), 'utf8')).join('\n') + '\n;this.STR=STR;', c2); OLD = c2.STR || {}; }catch(e){}
const isNew = k => JSON.stringify(OLD[k]) !== JSON.stringify(STR[k]);
const DU_OK = new Set(["pc.numberhint"]);   // "Sie" here means "it" (die Zahl), not formal address
const code = codeFiles.map(src).join('\n');
const changed = f => { const b = base && path.join(base, f); return !b || !fs.existsSync(b) || fs.readFileSync(b, 'utf8') !== src(f); };
const hard = baseFail.map(x => '[baseline] ' + x), review = [];
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
// 2.0 gate (cause 99): a function the release before had, removed now while a caller is left (Part C removed aiImpactParts with the
// 1.x change map; the Run page's change request still called it, a page error the moment it was sent)
if (base && fs.existsSync(base)){
  const baseCode = fs.readdirSync(base).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(base, f), 'utf8')).join('\n');
  const defs = c => new Set([...c.matchAll(/(?:^|[^A-Za-z0-9_$.])(?:async\s+)?function\s*\*?\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(|(?:^|[^A-Za-z0-9_$.])(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g)].map(m => m[1] || m[2]));
  const now = defs(code);
  for (const n of defs(baseCode)) if (n.length > 3 && !now.has(n) && new RegExp('(?:^|[^A-Za-z0-9_$.\'"])' + n.replace(/\$/g, '\\$') + '\\s*\\(').test(code)) H('calls', 'calls a function that is gone since ' + baseArg + ': ' + n);
}
/* 3-nowhere. 2.1 (J15, R7-2): a call to a function that nothing in the CURRENT code defines, whatever the baseline holds (a function added and
   removed between two releases, or renamed, is a page error the moment its caller runs). Comments, strings and regex literals are blanked first;
   a name counts as defined when it is declared (function, class, const/let/var, destructuring), a parameter, or assigned somewhere.
   Browser built-ins are listed in GLOBALS; a call guarded by  typeof NAME === "function"  is a deliberate optional call. */
const stripJS = s => {   // blank comments, string and template text and regex literals; keep the code inside template ${ }
  let o = '', i = 0; const n = s.length, depth = [];
  const kwBefore = /(?:^|[^\w$])(return|typeof|case|do|else|in|of|void|delete|throw|new|yield|await)$/;
  const text = () => { while (i < n){ const c = s[i];
      if (c === '\\'){ o += '  '; i += 2; continue; }
      if (c === '`'){ o += '`'; i++; return; }
      if (c === '$' && s[i + 1] === '{'){ o += '${'; i += 2; depth.push(1); return; }
      o += c === '\n' ? '\n' : ' '; i++; } };
  while (i < n){ const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/'){ while (i < n && s[i] !== '\n'){ o += ' '; i++; } continue; }
    if (c === '/' && d === '*'){ o += '  '; i += 2; while (i < n && !(s[i] === '*' && s[i + 1] === '/')){ o += s[i] === '\n' ? '\n' : ' '; i++; } o += '  '; i += 2; continue; }
    if (c === '"' || c === "'"){ o += c; i++; while (i < n && s[i] !== c && s[i] !== '\n'){ if (s[i] === '\\'){ o += ' '; i++; } o += ' '; i++; } o += c; i++; continue; }
    if (c === '`'){ o += c; i++; text(); continue; }
    if (c === '/'){ let k = o.length - 1; while (k >= 0 && /\s/.test(o[k])) k--; const before = o.slice(Math.max(0, k - 8), k + 1), lc = before.slice(-1);
      if (!lc || '(,=:[!&|?{};+-*%<>~^'.includes(lc) || kwBefore.test(before)){ o += '/'; i++; let cls = false;
        while (i < n && s[i] !== '\n'){ if (s[i] === '\\'){ o += '  '; i += 2; continue; } if (s[i] === '[') cls = true; else if (s[i] === ']') cls = false; else if (s[i] === '/' && !cls) break; o += ' '; i++; }
        o += '/'; i++; while (i < n && /[a-z]/.test(s[i])){ o += s[i]; i++; } continue; } }
    if (depth.length && c === '{') depth[depth.length - 1]++;
    if (depth.length && c === '}' && --depth[depth.length - 1] === 0){ depth.pop(); o += '}'; i++; text(); continue; }
    o += c; i++; }
  return o; };
{ const GLOBALS = new Set(('AbortController Array ArrayBuffer Audio BigInt Blob Boolean BroadcastChannel CustomEvent DataView Date DOMParser Error Event File FileReader ' +
    'Float32Array Float64Array FormData Function Headers Image Int32Array IntersectionObserver KeyboardEvent Map MouseEvent MutationObserver Notification Number Object ' +
    'Option Promise Proxy RangeError RegExp Request ResizeObserver Response Set String Symbol SyntaxError TextDecoder TextEncoder TypeError URL URLSearchParams ' +
    'Uint16Array Uint32Array Uint8Array Uint8ClampedArray WeakMap WeakRef WeakSet Worker alert atob btoa cancelAnimationFrame clearInterval clearTimeout confirm ' +
    'decodeURI decodeURIComponent encodeURI encodeURIComponent fetch getComputedStyle isFinite isNaN matchMedia parseFloat parseInt prompt queueMicrotask ' +
    'requestAnimationFrame requestIdleCallback setInterval setTimeout structuredClone').split(' '));
  const KW = new Set('if for while switch catch return typeof function do else new delete void in of instanceof await async yield super import export with case throw'.split(' '));
  const ID = '[A-Za-z_$][\\w$]*', parts = [], starts = []; let at = 0;
  for (const f of codeFiles.filter(f => f.endsWith('.js'))){ const s = stripJS(src(f)) + '\n;\n'; parts.push(s); starts.push([at, f]); at += s.length; }
  const S = parts.join(''), def = new Set(GLOBALS), addAll = s => { for (const m of s.matchAll(new RegExp(ID, 'g'))) def.add(m[0]); };
  for (const m of S.matchAll(new RegExp(`\\b(?:function\\s*\\*?|class|const|let|var)\\s+(${ID})`, 'g'))) def.add(m[1]);
  for (const m of S.matchAll(/\b(?:const|let|var)\s+([{[][^=]*?[}\]])\s*=/g)) addAll(m[1]);
  for (const m of S.matchAll(new RegExp(`(?:^|[^\\w$.])(${ID})\\s*=(?![=>])`, 'gm'))) def.add(m[1]);
  for (const m of S.matchAll(new RegExp(`(${ID})\\s*=>`, 'g'))) def.add(m[1]);
  for (const m of S.matchAll(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*=>/g)) addAll(m[1]);
  for (const m of S.matchAll(/\bfunction\b\s*\*?\s*[\w$]*\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) addAll(m[1]);
  for (const m of S.matchAll(new RegExp(`(?:^|[^\\w$.])(${ID})\\s*\\(([^()]*)\\)\\s*\\{`, 'gm'))) if (!KW.has(m[1]) || m[1] === 'catch') addAll(m[2]);
  for (const m of S.matchAll(new RegExp(`typeof\\s+(${ID})\\s*[!=]==?\\s*"`, 'g'))) def.add(m[1]);   // blanked string: typeof x === "function" guards an optional call
  const seen = new Set(hard.filter(x => x.startsWith('[calls]')).map(x => x.split(': ').pop()));
  for (const m of S.matchAll(new RegExp(`(?<![\\w$.])(${ID})\\s*\\(`, 'g'))){ const nm = m[1]; if (KW.has(nm) || def.has(nm) || seen.has(nm)) continue;
    let j = m.index + m[0].length, dd = 1; while (dd && j < S.length){ const c = S[j++]; if (c === '(') dd++; else if (c === ')') dd--; }
    if (/^\s*\{/.test(S.slice(j, j + 20))) continue;   // a method written name(args){ … } is a definition, not a call
    const [st, f] = starts.filter(x => x[0] <= m.index).pop(), line = S.slice(st, m.index).split('\n').length;
    if (/ok:nowhere/.test(src(f).split('\n')[line - 1] || '')) continue;
    seen.add(nm); H('nowhere', `${f}:${line} calls ${nm}(), which nothing in the current code defines`); } }

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
{ const css = fs.readFileSync('src/styles.css', 'utf8') + '\n' + (fs.existsSync('src/styles18.css') ? fs.readFileSync('src/styles18.css', 'utf8') : '');   // 1.8: the new look's sheet too
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
/* cause 62 (1.8): a // comment put in the middle of a line swallows the statements after it; the file still parses, the code silently does less */
for (const f of codeFiles) src(f).split('\n').forEach((line, i) => {
  if (/ok:comment/.test(line)) return;
  if (/\/\/[^"`'\n]*;\s+[a-zA-Z_$][\w$.]*\s*(\+=|-=|=(?![=>]))[^;\n]*;/.test(line)) H('comment', `${f}:${i + 1} statements after a // comment never run: ${line.trim().slice(0, 120)}`);
  // 2.0 (found while building Part A): a comment put before the last statement of a block, "// note weak = x; } }", swallows it too
  else if (/\/\/[^"`'\n]*?\s[a-zA-Z_$][\w$.]*\s*(\+=|-=|=(?![=>]))\s*[^;\n]*;\s*\}/.test(line)) H('comment', `${f}:${i + 1} a statement after a // comment never runs: ${line.trim().slice(0, 120)}`);
  // 2.0 Part B (found while building): a call put after a comment at the end of a line, "// note M.set(p, n);", never runs either
  else if (/(?:^|[\s;{})])\/\/ [^"`'\n]*\s[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\([^\n]*\);\s*$/.test(line)) H('comment', `${f}:${i + 1} a call after a // comment never runs: ${line.trim().slice(0, 120)}`);
});
/* cause 59 (1.7.1): a workspace (a person) found or named by a fixed name in the code breaks when names change (the public-repo name swap did) */
for (const f of codeFiles) src(f).split('\n').forEach((line, i) => {
  if (/ok:person/.test(line)) return;
  if (/\/[A-Za-z][a-z]+\/i\.test\(\w+\.name\)|createWorkspace\("[A-Z][a-z]+"|\b\w\.name = "[A-Z][a-z]+"|\.name === "[A-Z][a-z]+"/.test(line)) H('person', `${f}:${i + 1} a workspace found or named by a fixed person's name (find it by place or id; names come from the data): ${line.trim().slice(0, 120)}`);
});
/* cause 75 (1.9.3): PT promised that GitHub waits for the owner's approval before a build in the tools repository. That repository is private,
   and GitHub offers required reviewers only on public repositories (Free, Pro, Team): the only lock is the login check on the comment.
   No text may promise a GitHub approval step for a build, in any of the three languages. */
{ const PROMISE = [/GitHub[^.]*\b(waits|asks)\b[^.]*\bapprov|approval in the build environment/i, /GitHub[^.]*\b(wartet|fragt)\b[^.]*Freigabe|Build-Umgebung auf deine Freigabe/, /GitHub[^。；]*(等待你的批准|请你批准)/];
  for (const k in STR){ const r = STR[k]; if (!Array.isArray(r)) continue;
    r.forEach((x, i) => { if (PROMISE[i] && PROMISE[i].test(String(x))) H('claims', `${k} [${['en', 'de', 'zh'][i]}] promises a GitHub approval step for a build, which a private repository does not have: "${String(x).slice(0, 110)}"`); }); } }

/* 3d. 2.1 (J16, R1-7): raw values put into HTML attributes, links (href/src), innerHTML and CSS selectors. Booby-trapped imports or AI-written
   names and ids can then run hidden code or break a click handler (A1, R1-9). A value is fine when it is wrapped (esc, CSS.escape,
   encodeURIComponent, safeUrl, num, Number), a literal, a number or yes/no (comparison, !x, .length, .includes()), a ternary or || of fine values,
   or a name that iterates a fixed list on that line ([…].map(k => / LIST.map(k => / for (const k of LIST)). Links need a literal https:// or #
   start, or safeUrl(). HARD (every line) in the files of RAW_HARD; a REVIEW item on new lines elsewhere until Wave 3 converts the old files and
   adds them to RAW_HARD. A line opts out with  // ok:raw  plus the reason. */
const RAW_HARD = [/^v200_/, /^v1100_/];   // the opt-in list: add a file here once it is clean
// checked by hand in 2.1 Wave 1 (values from fixed lists or yes/no flags); Wave 3 wraps them and deletes the entry. A fixed entry that no longer
// matches is printed as stale, so the list only shrinks.
const RAW_VETTED = {
  'v1100_hands.js': ['data-k="${k}"'],
  'v200_facts.js': ['aria-current="${on}"'],
  'v200_map.js': ['aria-pressed="${sl}"', 'data-v="${what}"', 'data-v="${key}"', 'data-f="${k}"', 'data-v="${k}"', 'aria-pressed="${G.noNevers}"', 'aria-labelledby="m20g-${k}"', 'id="m20g-${k}"', 'aria-current="${on}"'],
  'v200_modes.js': ['data-a="${c.a}"'],
  'v200_setup.js': ['href="${esc(links[i + 1])}"'],   // fixed https links of SU20_GUIDES
};
// real raw ids in selectors (R1-9): a quote or bracket in an id throws in the click handler. Wave 3 (A1) adds CSS.escape and deletes these.
const RAW_KNOWN = {};   // 2.1: the last two raw selector ids now go through CSS.escape
const rawSinks = (() => {
  const close = (s, i, o, c) => { let d = 1; while (i < s.length && d){ if (s[i] === o) d++; else if (s[i] === c) d--; i++; } return d ? -1 : i; };
  const top = (e, ops) => { const out = []; let d = 0, q = null, last = 0;   // split at operators outside (), [], {}, strings and templates
    for (let i = 0; i < e.length; i++){ const c = e[i];
      if (q){ if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`'){ q = c; continue; }
      if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
      else if (!d) for (const op of ops) if (e.startsWith(op, i)){ out.push(e.slice(last, i), op); i += op.length - 1; last = i + 1; break; } }
    out.push(e.slice(last)); return out; };
  const WRAP = /^(esc|CSS\.escape|encodeURIComponent|safeUrl|safeId|num|Number|parseInt|Math\.[a-z]+|String\(Number)\(/;
  const safe = (e, B) => { e = e.trim(); if (!e) return false;
    if (e[0] === '(' && close(e, 1, '(', ')') === e.length) return safe(e.slice(1, -1), B);
    const w = e.match(WRAP); if (w && close(e, w[0].length, '(', ')') === e.length) return true;
    if (/^-?\d+(\.\d+)?$/.test(e) || /^(true|false|null)$/.test(e) || /^(["'])[^"'<>&\\]*\1$/.test(e)) return true;
    if (/^`[^`]*`$/s.test(e)){ let rest = e.slice(1, -1), k; if (/["'<>]/.test(rest.split('${')[0])) return false;
      while ((k = rest.indexOf('${')) >= 0){ const j = close(rest, k + 2, '{', '}'); if (j < 0 || !safe(rest.slice(k + 2, j - 1), B)) return false; rest = rest.slice(j); if (/["'<>]/.test(rest.split('${')[0])) return false; }
      return true; }
    let p = top(e, ['?']); if (p.length >= 3){ const q = top(p.slice(2).join(''), [':']); return q.length >= 3 && safe(q[0], B) && safe(q.slice(2).join(''), B); }
    p = top(e, ['||', '??']); if (p.length > 1) return p.filter((x, i) => i % 2 === 0).every(x => safe(x, B));
    p = top(e, ['&&']); if (p.length > 1) return safe(p[p.length - 1], B);   // a && b gives a falsy a (false, 0, "", null) or b
    if (top(e, ['===', '!==', '==', '!=', '<=', '>=', ' < ', ' > ', ' instanceof ', ' in ']).length > 1 || /^!/.test(e) || /\.(length|size)$/.test(e)) return true;
    p = top(e, ['.']); if (p.length > 1 && /^(includes|has|some|every|startsWith|endsWith|test|toFixed)\(/.test(p[p.length - 1])) return true;
    return /^[A-Za-z_$][\w$]*$/.test(e) && B.has(e); };
  const bound = (lines, i) => { const B = new Set(), txt = lines.slice(Math.max(0, i - 4), i + 1).join('\n');
    for (const m of txt.matchAll(/(?:\[[^\[\]]*\]|\b[A-Z][A-Z0-9_]{2,})\.(?:map|forEach|filter|flatMap)\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*[,)=]/g)) B.add(m[1]);
    for (const m of txt.matchAll(/for\s*\(\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s+of\s+(?:\[|[A-Z][A-Z0-9_]{2,}\b)/g)) B.add(m[1]);
    return B; };
  const URLATTR = /^(href|src|action|formaction|srcdoc|xlink:href|poster)$/i;
  return text => { const lines = text.split('\n'), out = [];
    lines.forEach((line, i) => { let Bc = null; const B = () => Bc || (Bc = bound(lines, i));
      for (let k = line.indexOf('${'); k >= 0; k = line.indexOf('${', k + 2)){   // a. ${…} in an attribute value
        const j = close(line, k + 2, '{', '}'); if (j < 0) break; const expr = line.slice(k + 2, j - 1), before = line.slice(0, k);
        const a = before.match(/(?:^|[\s"'`])([a-zA-Z][\w:.-]*)=(["']?)([^"'<>=`]*)$/); if (!a) continue;
        const lt = before.lastIndexOf('<'), gt = before.lastIndexOf('>'); if (gt > lt) continue;   // after the tag closed: text, not an attribute
        if (lt >= 0 && !/^[a-z][a-z0-9-]*$/.test(before.slice(lt + 1).match(/^\/?([^\s>]*)/)[1])) continue;   // <your_rules …> in a prompt is not HTML
        const what = a[1] + '=' + a[2] + a[3] + '${' + expr + '}' + a[2];
        if (URLATTR.test(a[1]) && !/^(https:\/\/|#|\?|mailto:)/.test(a[3]) && !/^safeUrl\(/.test(expr.trim())) out.push({i, kind: 'a link', what});
        else if (!safe(expr, B())) out.push({i, kind: a[2] ? 'an attribute' : 'an unquoted attribute', what}); }
      for (const m of line.matchAll(/\.(innerHTML|outerHTML)\s*\+?=\s*([^;]*)|insertAdjacentHTML\(\s*["'][a-z]+["']\s*,\s*([^;]*)\)/g)){   // b. innerHTML
        const rhs = (m[2] || m[3] || '').trim();
        if (/^(["'])[^"']*\1$/.test(rhs) || /^[A-Za-z_$][\w$.]*\(/.test(rhs) && close(rhs, rhs.indexOf('(') + 1, '(', ')') === rhs.length) continue;   // a literal or a builder call
        if (/^`[^`]*`$/s.test(rhs)){ let ok = true, rest = rhs;
          for (let k = rest.indexOf('${'); k >= 0 && ok; k = rest.indexOf('${', k + 2)){ const j = close(rest, k + 2, '{', '}'); const ex = j < 0 ? '' : rest.slice(k + 2, j - 1).trim(); ok = j >= 0 && (/^[A-Za-z_$][\w$.]*\(/.test(ex) || safe(ex, B())); }
          if (ok) continue; }
        out.push({i, kind: 'innerHTML', what: (m[1] || 'insertAdjacentHTML') + ' = ' + rhs.slice(0, 70)}); }
      for (const m of line.matchAll(/(?:querySelector(?:All)?|closest|matches|(?<![\w$])\$\$?)\(\s*(`[^`]*`|(["'])[^"']*\2\s*\+\s*([^,)]+(?:\([^()]*\))?))/g)){   // c. selectors
        if (m[1][0] === '`'){ const rest = m[1]; for (let k = rest.indexOf('${'); k >= 0; k = rest.indexOf('${', k + 2)){ const j = close(rest, k + 2, '{', '}'); if (j < 0) break; if (!safe(rest.slice(k + 2, j - 1), B())){ out.push({i, kind: 'a selector', what: rest.slice(0, 80)}); break; } } }
        else if (!safe(m[3], B())) out.push({i, kind: 'a selector', what: m[1].trim().slice(0, 80)}); } });
    return out; }; })();
{ const used = new Set();
  for (const f of codeFiles.filter(f => f.endsWith('.js'))){
    const isHard = RAW_HARD.some(r => r.test(f)), lines = src(f).split('\n');
    if (!isHard && !changed(f)) continue;
    const oldLines = isHard ? new Set() : new Set(base && fs.existsSync(path.join(base, f)) ? fs.readFileSync(path.join(base, f), 'utf8').split('\n') : []);
    for (const s of rawSinks(src(f))){ const line = lines[s.i];
      if (oldLines.has(line) || /ok:raw/.test(line)) continue;
      const ok = [...(RAW_VETTED[f] || []), ...(RAW_KNOWN[f] || [])].find(x => s.what === x); if (ok){ used.add(f + '\u0000' + ok); continue; }
      if (isHard) H('raw', `${f}:${s.i + 1} a raw value in ${s.kind}: ${s.what.slice(0, 110)} (wrap it: esc / CSS.escape / safeUrl, or // ok:raw with the reason)`);
      else R('raw', f, s.i, line); } }
  var rawStale = [];   // entries that no longer match: delete them
  for (const M of [RAW_VETTED, RAW_KNOWN]) for (const [f, xs] of Object.entries(M)) for (const x of xs) if (!used.has(f + '\u0000' + x)) rawStale.push(f + ': ' + x);
  var rawKnown = Object.values(RAW_KNOWN).flat().length; }

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
for (const sheet of ['styles.css', 'styles18.css'].filter(f => fs.existsSync('src/' + f))){   // 1.8: the new look's sheet is reviewed the same way
  const cssNow = fs.readFileSync('src/' + sheet, 'utf8').split('\n'), bcss = base && path.join(base, sheet);
  const old = new Set(bcss && fs.existsSync(bcss) ? fs.readFileSync(bcss, 'utf8').split('\n') : []);
  cssNow.forEach((line, i) => { if (old.has(line) || /ok:css/.test(line)) return;
    if (/position\s*:\s*(absolute|fixed)/.test(line)) R('overlap', sheet, i, line);
    if (/z-index\s*:\s*\d{3,}/.test(line)) R('overlap', sheet, i, line);
    if (/(^|[;{\s])flex\s*:\s*1\s*[;}]/.test(line) || /min-width\s*:\s*0\b/.test(line)) R('squeeze', sheet, i, line);
    if (/height\s*:\s*\d+px/.test(line) && /overflow\s*:\s*hidden/.test(line)) R('cut', sheet, i, line); }); }
console.log(`static checks (baseline ${baseArg}${base ? '' : ' NOT READ'}): ${hard.length} hard, ${review.length} to review`);
/* 2.1 A1 / A14 / B17: the safety layer stays wired in — the main page goes through safeHTML, a data-bind path never walks into the
   prototype, and every imported record goes through safeRecord (unsafe ids, prototype keys, outside images) */
{ const need = [['views_shell.js', /root\.innerHTML = safeHTML\(`<a class="skip"/, 'the main page is put on screen without safeHTML'],
    ['v190_care.js', /root\.innerHTML = safeHTML\(view19HTML\(\)\)/, 'the care page is put on screen without safeHTML'],
    ['app.js', /function resolvePath[\s\S]{0,160}SAFE_BAD_KEYS\.has/, 'resolvePath no longer refuses __proto__ / constructor / prototype'],
    ['app.js', /function normalizeProject\(p\)\{\s*safeDeep\(p\)/, 'normalizeProject no longer makes item ids safe'],
    ['actions.js', /safeRecord\(p00, "p"[\s\S]*safeRecord\(x0, "n"[\s\S]*safeRecord\(x0, "pat"[\s\S]*safeRecord\(x0, "r"/, 'an import loop skips safeRecord']];
  for (const [f, re, msg] of need) if (!re.test(src(f))) H('safe', `${f}: ${msg}`);
  for (const f of codeFiles.filter(f => f.endsWith('.js'))) src(f).split('\n').forEach((line, i) => { if (/\son[a-z]+="/.test(line) && /<[a-z]/.test(line) && !/ok:safe/.test(line)) H('safe', `${f}:${i + 1} an inline event handler in markup (safeHTML removes it): use a listener`); }); }
console.log(`  raw values: hard in ${codeFiles.filter(f => RAW_HARD.some(r => r.test(f))).length} files (RAW_HARD), ${rawKnown} known raw selector ids left for Wave 3 (RAW_KNOWN)` + (rawStale.length ? `; stale entries to delete: ${rawStale.join(' | ')}` : ''));
if (hard.length){ console.log('HARD'); hard.slice(0, 60).forEach(x => console.log('  ' + x)); }
if (review.length){ console.log('REVIEW (look at each; add // ok:<check> when it is fine)'); review.slice(0, 120).forEach(x => console.log('  ' + x)); }
process.exit(hard.length ? 1 : 0);
