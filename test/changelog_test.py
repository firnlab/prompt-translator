"""Public changelog (1.9): tools/changelog.py writes CHANGELOG.md from CHANGELOG in src/views_run.js, the cl.<ver>.* strings and
releases.json. Data-free (no project data, no browser): runs in the quick gate.
Covers: the repository's CHANGELOG.md is up to date (--check); on a made-up checkout: newest first (by version number, also 1.10
after 1.9), the published date from releases.json over the date in CHANGELOG, the release notes, the English text only, a key defined
twice → the later strings file (build order) wins, items split at "|", a version added in front by a later file (CHANGELOG.unshift),
a version only in releases.json, nothing in the text becomes HTML; the same sources give the same bytes; a stale or hand-edited
file is found (--check exits 1) and a missing string is an error (exit 2), never a silent gap; --notes prints one version.
Includes its own planted bugs: copies of the generator with a known mistake must fail these checks.
Run: python3 test/changelog_test.py"""
import pathlib, re, subprocess, sys, tempfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
GEN = ROOT / "tools" / "changelog.py"
oks, fails = [], []
def check(name, cond, info=""):
    (oks if cond else fails).append(name); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:400]), flush=True)
def run(script, *a):
    r = subprocess.run([sys.executable, "-I", str(script), *a], capture_output=True, text=True, timeout=60)
    return r.returncode, r.stdout + r.stderr

def fixture(d):
    """a made-up checkout: two strings files, the CHANGELOG list, a later file that adds a version, releases.json"""
    (d / "src").mkdir(parents=True)
    (d / "build.py").write_text('order = ["strings.js","strings2.js","views_run.js","later.js"]\n')
    (d / "src" / "strings.js").write_text('Object.assign(STR, {\n"cl.added":["Added","Neu","新增"], "cl.changed":["Changed","Geändert","变更"], "cl.fixed":["Fixed","Behoben","修复"], "cl.removed":["Removed","Entfernt","移除"],\n'
        '"cl.100.added":["First item|Second item with <b>tags</b> & more","Erstes|Zweites","第一|第二"],\n'
        '"cl.110.fixed":["Old wording of the fix","Alte Worte","旧的说法"],\n'
        '"cl.19.added":["Nine added","Neun neu","九"],\n'
        '});\n')
    (d / "src" / "strings2.js").write_text('Object.assign(STR, {\n"cl.110.fixed":["The fix in its final words","Die Korrektur","修复"],\n"cl.110.changed":["A change with a \\"quote\\"","Eine Änderung","一个变更"],\n'
        '"cl.1100.added":["Ten added","Zehn neu","十"],\n});\n')
    (d / "src" / "views_run.js").write_text('const X = 1;\nconst CHANGELOG = [\n  {v: "1.10.0", d: "2026-03-01", added: "cl.1100.added"},\n  {v: "1.9.0", d: "2026-02-20", added: "cl.19.added"},\n'
        '  {v: "1.1.0", d: "2026-02-01", changed: "cl.110.changed", fixed: "cl.110.fixed"},\n  {v: "1.0.0", d: "2026-01-15", added: "cl.100.added"}\n];\nfunction f(){}\n')
    (d / "src" / "later.js").write_text('CHANGELOG.unshift({v: "1.11.0", d: "2026-04-01", fixed: "cl.110.fixed"});\n')
    (d / "releases.json").write_text('[{"version": "1.1.0", "date": "2026-02-03", "commit": "x", "notes": "1.1.0: the fix went live."}, {"version": "1.1.1", "date": "2026-02-05", "notes": "A quick patch."}]\n')

def verify(gen, quiet=False):
    """the checks a generator must pass on the made-up checkout; returns the names of the checks that failed"""
    bad = []
    def ck(name, cond, info=""):
        if not cond: bad.append(name)
        if not quiet: check(name, cond, info)
    with tempfile.TemporaryDirectory() as td:
        d = pathlib.Path(td); fixture(d)
        code, out = run(gen, "--root", str(d))
        md = (d / "CHANGELOG.md").read_text() if (d / "CHANGELOG.md").exists() else ""
        heads = [l for l in md.splitlines() if l.startswith("## ")]
        ck("it writes CHANGELOG.md", code == 0 and md.startswith("# Changelog"), out)
        ck("newest first by version number (1.11, 1.10, 1.9, 1.1.1, 1.1, 1.0)", [h.split()[1] for h in heads] == ["1.11.0", "1.10.0", "1.9.0", "1.1.1", "1.1.0", "1.0.0"], heads)
        ck("the published date comes from releases.json, else from CHANGELOG", "## 1.1.0 — 2026-02-03" in heads and "## 1.0.0 — 2026-01-15" in heads, heads)
        ck("the release notes are there", "Release notes: 1.1.0: the fix went live." in md and "Release notes: A quick patch." in md)
        ck("a version only in releases.json is listed with its notes", "## 1.1.1 — 2026-02-05" in heads)
        ck("a version added in front by a later file is listed", "## 1.11.0 — 2026-04-01" in heads)
        ck("the later strings file wins (build order)", "- The fix in its final words" in md and "Old wording" not in md)
        ck("English only", "Erstes" not in md and "Neu" not in md and "第一" not in md)
        ck("items are split at '|', under their kind", "### Added\n\n- First item\n- Second item" in md and "### Changed" in md and "### Fixed" in md)
        ck("nothing in the text becomes HTML", "<b>" not in md and "&lt;b&gt;tags&lt;/b&gt; &amp; more" in md, md[md.find("Second item"):][:80])
        ck("a quote inside a string is read", '- A change with a "quote"' in md)
        first = md
        code, _ = run(gen, "--root", str(d)); second = (d / "CHANGELOG.md").read_text()
        ck("the same sources give the same bytes", first == second and code == 0)
        code, out = run(gen, "--root", str(d), "--check")
        ck("--check passes on a fresh file", code == 0, out)
        (d / "CHANGELOG.md").write_text(md.replace("First item", "First item, edited by hand"))
        code, out = run(gen, "--root", str(d), "--check")
        ck("--check finds a hand-edited file (exit 1)", code == 1 and "stale" in out, out)
        (d / "CHANGELOG.md").unlink()
        code, out = run(gen, "--root", str(d), "--check")
        ck("--check finds a missing file (exit 1)", code == 1, out)
        code, out = run(gen, "--root", str(d), "--notes", "1.1.0")
        ck("--notes prints one version", code == 0 and out.startswith("## 1.1.0 — 2026-02-03") and "## 1.0.0" not in out, out)
        s = (d / "src" / "views_run.js").read_text(); (d / "src" / "views_run.js").write_text(s.replace('added: "cl.19.added"', 'added: "cl.19.missing"'))
        code, out = run(gen, "--root", str(d), "--check")
        ck("a string named in CHANGELOG but defined nowhere is an error (exit 2), never a silent gap", code == 2 and "cl.19.missing" in out, out)
    return bad

print("1 the repository's CHANGELOG.md")
code, out = run(GEN, "--check")
check("CHANGELOG.md is what the sources give (python3 tools/changelog.py --check)", code == 0, out)
md = (ROOT / "CHANGELOG.md").read_text() if (ROOT / "CHANGELOG.md").exists() else ""

vs = [l.split()[1] for l in md.splitlines() if l.startswith("## ")]
check("it lists versions newest first", vs and vs == sorted(vs, key=lambda v: tuple(int(x) for x in re.findall(r"\d+", v)), reverse=True), vs[:5])
src = (ROOT / "src" / "views_run.js").read_text()
newest = re.search(r'const CHANGELOG = \[\s*\{v: "([0-9.]+)"', src).group(1)
check("the newest version PT shows in What's new is the first one", vs and vs[0] == newest, [vs[:1], newest])

print("2 the generator on a made-up checkout")
verify(GEN)

print("3 planted bugs: each must make the checks above fail")
PLANT = [
    ("newest last", "for v in sorted(by, key=vkey, reverse=True):", "for v in sorted(by, key=vkey):"),
    ("versions sorted as text (1.10 before 1.9 wrongly)", "for v in sorted(by, key=vkey, reverse=True):", "for v in sorted(by, reverse=True):"),
    ("the CHANGELOG date wins over the published one", 'str(r.get("date") or e.get("d") or "")', 'str(e.get("d") or r.get("date") or "")'),
    ("the first strings file wins", "            out[m.group(1)] = val", "            out.setdefault(m.group(1), val)"),
    ("a missing string is skipped silently", 'if key not in S: raise SourceError(f"{key} is named for {v} in CHANGELOG but no strings file defines it")', "if key not in S: continue"),
    ("--check never fails", 'if have == text: print(', 'if True: print('),
    ("text goes into the file as HTML", '    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")', "    return s"),
]
with tempfile.TemporaryDirectory() as td:
    base = GEN.read_text()
    for name, old, new in PLANT:
        if old not in base: check(f"planted bug '{name}' still applies to the generator", False, old); continue
        g = pathlib.Path(td) / "changelog_planted.py"; g.write_text(base.replace(old, new, 1))
        bad = verify(g, quiet=True)
        check(f"planted bug caught: {name}", bool(bad), "every check stayed green")

print("ok:", len(oks), "failed:", len(fails), "page errors: 0")
sys.exit(1 if fails else 0)
