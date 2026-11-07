"""Check the checks: put known bugs back into a COPY of the sources, one at a time, and make sure the static checks catch each one.
A check that stays green when its bug is back is broken, and the release gate stops.
Run: python3 test/check_the_checks.py        (under a minute; never touches src/)
"""
import pathlib, shutil, subprocess, sys, tempfile, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
# 2.1 (J15): the baseline is the release tag named in static_checks.js (BASELINE_TAG), unpacked from git into the copy
TAG = re.search(r"const BASELINE_TAG = '([^']+)'", (ROOT / "test" / "static_checks.js").read_text()).group(1)
BASE = "baseline-" + TAG
APP = "\nfunction __zz{n}(p, x){{ {body} }}\n"
# (name, file, kind, change, expected tag, hard?)  kind: "append" adds text at the end, "sub" replaces the first match, "dupline" repeats the line that matches
M = [
    ("a comment that swallows the rest of a line (parse error)", "v150_pick.js", "sub", ("saveWs(); toast(t(good", "saveWs();   // note toast(t(good"), "parse", True),
    ("a comment that swallows statements (still parses, cause 64)", "v14_finish.js", "sub", ("{rounds: FIX_CAP, quiet: true}); sum.fixed += s.fixed;", "{rounds: FIX_CAP, quiet: true});   // the cap sum.fixed += s.fixed;"), "comment", True),
    ("a comment that swallows the last statement of a block (2.0)", "core.js", "sub", ("}catch(e){ errs = []; } weak = errs.length > 0; } }", "}catch(e){ errs = []; }   // a check may ask weak = errs.length > 0; } }"), "comment", True),
    ("a comment that swallows a call at the end of a line (2.0 Part B)", "v200_stage.js", "sub", ("STAGE20_WAIT.includes(x.ph)); STAGE20_HELD.set(p, q.length - keep.length);", "STAGE20_WAIT.includes(x.ph));   // it stays STAGE20_HELD.set(p, q.length - keep.length);"), "comment", True),
    ("squeezed text: overflow-wrap:anywhere",          "styles.css", "append", ".zz{overflow-wrap:anywhere}", "layout", True),
    ("menus cut off: no top-layer menus",              "v141_ui.js", "sub", ("function menuFloat(", "function menuFloatOff("), "layout", True),
    ("leftover 'Sie': a string key defined twice",     "strings7.js", "dupline", '"it.inpanel":', "names", True),
    ("one name declared in two files",                 "tasks4.js", "append", "\nconst ZZ_TWICE = 1;\n", "names", True),
    ("one name declared in two files (2)",             "v14_queue.js", "append", "\nconst ZZ_TWICE = 2;\n", "names", True),
    ("ids reused after a delete",                      "tasks4.js", "append", APP.format(n=1, body="const id = arr(p.tests).length + 1; return id;"), "ids", True),
    ("content in the screen language",                 "tasks4.js", "sub", ("contentLang(p)", "contentLang()"), "lang", True),
    ("untrusted text read as orders: rule removed",    "core.js", "sub", ("prompt = DATA_RULE + prompt", "prompt = prompt"), "rule", True),
    ("AI call that skips runAI",                       "tasks4.js", "append", "\nasync function __zz2(){ const r = await sample(\"x\", {}); return r; }\n", "rule", True),
    ("three counts for open work",                     "v14_ui.js", "append", APP.format(n=3, body='return x.cls === "block" || x.cls === "should";'), "count", True),
    ("German ß",                                       "strings7.js", "dupline_edit", ('"it.inpanel":', '"zz.sz":["a", "Strasse und Straße", "街道"],'), "strings", True),
    ("Traditional Chinese",                            "strings7.js", "dupline_edit", ('"it.inpanel":', '"zz.tr":["a", "a", "這個"],'), "strings", True),
    ("a build promised to wait for a GitHub approval (cause 75)", "strings16.js", "dupline_edit", ('"bld.sub":', '"zz.appr":["Only your comment starts it; GitHub then waits for your approval in the build environment.", "GitHub wartet dann auf deine Freigabe in der Build-Umgebung.", "之后 GitHub 会在 build 环境中等待你的批准。"],'), "claims", True),
    ("a workspace found by a person's name (cause 59)", "app.js", "sub", ("const w = META.workspaces.find(x => x.id !== META.workspaces[0].id);", "const w = META.workspaces.find(x => /Robin/i.test(x.name));"), "person", True),
    ("missing translation key",                        "views13.js", "append", APP.format(n=4, body='return t("zz.never.defined");'), "strings", True),
    ("a button with no action",                        "views13.js", "append", APP.format(n=5, body="return '<button data-a=\"zz-nothing\">x</button>';"), "handlers", True),
    ("wrapper of a missing function",                  "actions4.js", "append", "\n{ const orig = zzGone; zzGone = function(){ return orig(); }; }\n", "wrappers", True),
    ("a function removed while a caller is left (2.0 gate, cause 99)", "tasks3.js", "sub", ("async function aiImpactParts(p, text){", "async function aiImpactPartsGone(p, text){"), "calls", True),
    # 2.1 (J15, R7-2): the baseline is v2.0.0, so a 2.0 function is protected too; a call to a name defined nowhere is caught without any baseline
    ("a 2.0 function removed while its callers are left (J15, R7-2)", "v200_map.js", "sub", ("function m20Chosen(", "function m20ChosenGone("), "calls", True),
    ("a call to a function that nothing defines (J15)", "v200_loop.js", "append", APP.format(n=30, body="return zzNeverDefined(p);"), "nowhere", True),
    # 2.1 (J16, R1-7): raw values in attributes, links, innerHTML and selectors are HARD in the RAW_HARD files, a review item elsewhere
    ("a raw id in an attribute (J16)", "v200_map.js", "append", APP.format(n=31, body='return `<button data-a="m20-open" data-id="${x.id}">x</button>`;'), "raw", True),
    ("a link not checked as https (J16, A14)", "v200_facts.js", "append", APP.format(n=32, body='return `<a class="chip" href="${esc(x.url)}">x</a>`;'), "raw", True),
    ("raw text into innerHTML (J16)", "v1100_hands.js", "append", APP.format(n=33, body="p.innerHTML = x.name;"), "raw", True),
    ("a raw id in a selector (J16, R1-9)", "v200_modes.js", "append", APP.format(n=34, body='return document.querySelector(`[data-id="${x.id}"]`);'), "raw", True),
    ("a raw id in a selector built with + (J16, R1-9)", "v200_stage.js", "append", APP.format(n=35, body='return p.querySelector("#st-" + x.id);'), "raw", True),
    ("a raw value in an old file's new line (J16: review until Wave 3)", "views13.js", "append", APP.format(n=36, body='return `<span class="x" title="${x.why}">x</span>`;'), "raw", False),
    # 2.1 (A1, A14, B17): the safety layer must stay wired in
    ("the main page skips safeHTML (A1)", "views_shell.js", "sub", ('root.innerHTML = safeHTML(`<a class="skip"', 'root.innerHTML = (`<a class="skip"'), "safe", True),
    ("resolvePath walks into __proto__ again (A1, R1-1)", "app.js", "sub", ('if (segs.some(s => SAFE_BAD_KEYS.has(s.replace(/^#/, "")))) return null;', ''), "safe", True),
    ("an import loop takes records as they come (A1, B17)", "v210_safe.js", "sub", ('const chg = safeDeep(x0, {imgs: true}); const x = safeRecord(x0, prefix, {imgs: true}); if (!x) throw new Error("record");', 'const chg = 0; const x = x0;'), "safe", True),
    ("the import forgets the from-a-backup mark (2.1, M3)", "v210_safe.js", "sub", ('p.imported = {at: now(), from: str(fname).slice(0, 80), relinked: false};', 'p.imported = null;'), "safe", True),
    ("pause acts on a backup's trigger ids before re-link (2.1, M3)", "tasks3.js", "sub", ('if (importedLocked(p)){ toast(t("imp21.locked"), "err"); return; }   // 2.1', 'if (false){ toast(t("imp21.locked"), "err"); return; }   // 2.1'), "safe", True),
    ("the morning check reads pages without the owner's click (2.1)", "v200_hands.js", "sub", ('if (fetchOk && p.watch20Ok && !importedLocked(p)) for (const n of M.notyet', 'if (fetchOk) for (const n of M.notyet'), "safe", True),
    ("an inline onerror handler in markup (A1)", "v200_map.js", "append", APP.format(n=37, body='return `<img src="/_blob/a" onerror="x()">`;'), "safe", True),
    # review items: the person must look at them, so they must show up
    ("silent failure: empty catch",                    "views13.js", "append", APP.format(n=6, body="try{ x(); }catch(e){}"), "catch", False),
    ("AI answer without a shape check",                "views13.js", "append", APP.format(n=7, body='return runAI("k", "l", "prompt", {json: true});'), "validate", False),
    ("text squeezed by flex:1",                        "views13.js", "append", APP.format(n=8, body="return `<h2 style=\"flex:1\">${x}</h2>`;"), "squeeze", False),
    ("text cut with …",                                "views13.js", "append", APP.format(n=9, body="return `<div class=\"x\">${trunc(x.title, 40)}</div>`;"), "trunc", False),
    ("stale copy after a wait",                        "views13.js", "append", "\nasync function __zz10(p){\n  const r = await aiThing(p);\n  p.notes = r;\n}\n", "stale", False),
    ("screen moves after a wait",                      "views13.js", "append", "\nasync function __zz11(p){\n  await later();\n  setPhase(\"test\");\n}\n", "move", False),
    ("verdict forced to yes/no",                       "views13.js", "append", APP.format(n=12, body="return !!x.pass;"), "verdict", False),
    ("internal id shown as text",                      "views13.js", "append", APP.format(n=13, body="return `<span class=\"x\">${x.id}</span>`;"), "rawid", False),
    ("raw z-index in new CSS",                         "styles.css", "append", "\n.zz2{position:absolute;z-index:999}\n", "overlap", False),
    ("long text cut silently",                        "core.js", "sub", ('if (n < 400) return s.slice(0, n - 1) + "…";', 'return s.slice(0, n - 1) + "…";'), "cut", True),
    ("AI loop without a cap",                         "views13.js", "append", "\nasync function __zz15(p){\n  while (true){\n    const r = await runAI(\"k\", \"l\", \"x\", {validate: Boolean});\n    if (r) break;\n  }\n}\n", "loop", False),
    ("live action in the preview",                     "views13.js", "append", APP.format(n=14, body='return callTool("x", "create_trigger", {});'), "preview", False),
]

def run(tmp):
    r = subprocess.run(["node", "test/static_checks.js", BASE], cwd=tmp, capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr

with tempfile.TemporaryDirectory() as td:
    tmp = pathlib.Path(td)
    for d in ("src", "test"): shutil.copytree(ROOT / d, tmp / d, ignore=shutil.ignore_patterns("*.html", "*.png", "shots*"))
    (tmp / BASE).mkdir()
    tar = subprocess.run(["git", "-C", str(ROOT), "archive", TAG, "src"], capture_output=True)
    if tar.returncode != 0: print(f"cannot read the baseline tag {TAG} (a shallow clone? use fetch-depth: 0): {tar.stderr.decode()[:300]}"); sys.exit(1)
    subprocess.run(["tar", "-x", "-C", str(tmp / BASE)], input=tar.stdout, check=True)
    BASE = BASE + "/src"
    shutil.copy(ROOT / "build.py", tmp / "build.py")
    code0, out0 = run(tmp)
    if code0 != 0 or "0 hard, 0 to review" not in out0:
        print("the sources are not clean to start with:\n" + out0[:1500]); sys.exit(1)
    missed = []
    pairs = {}
    for name, f, kind, change, tag, hard in M:
        fp = tmp / "src" / f; orig = fp.read_text()
        if kind == "append": new = orig + change
        elif kind == "sub":
            if change[0] not in orig: missed.append(f"{name}: the code it mutates is gone ({change[0]}) — update this script"); continue
            new = orig.replace(change[0], change[1], 1)
        else:
            needle = change if kind == "dupline" else change[0]
            lines = orig.split("\n"); k = next((i for i, l in enumerate(lines) if needle in l), None)
            if k is None: missed.append(f"{name}: line not found ({needle})"); continue
            lines.insert(k + 1, lines[k] if kind == "dupline" else change[1]); new = "\n".join(lines)
        # the "declared in two files" pair needs both halves at once
        if name.endswith("(2)"):
            prev = pairs.pop("twice"); (tmp / "src" / prev[0]).write_text(prev[1])
        fp.write_text(new)
        if name == "one name declared in two files": pairs["twice"] = (f, new); fp.write_text(orig); continue
        code, out = run(tmp)
        caught = f"[{tag}]" in out and (code == 1 if hard else True)
        print(("caught " if caught else "MISSED ") + name + f"  [{tag}]")
        if not caught: missed.append(name + f" (expected [{tag}]{' as a hard failure' if hard else ''})")
        fp.write_text(orig)
        if name.endswith("(2)"): (tmp / "src" / "tasks4.js").write_text((ROOT / "src" / "tasks4.js").read_text())
    print(f"{len(M) - len(missed)} of {len(M)} known bugs caught")
    for m in missed: print("  MISSED", m)
    sys.exit(1 if missed else 0)
