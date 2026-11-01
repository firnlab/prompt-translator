"""Public changelog: writes CHANGELOG.md (English, newest first) from PT's own release notes. Deterministic: the same sources always
give the same file, byte for byte (no time stamps, no machine paths).
Sources (nothing else is read):
  - CHANGELOG in src/views_run.js: the versions, their dates and which strings hold their notes (added / changed / fixed / removed);
    a later source file may add one with CHANGELOG.unshift({...});
  - the strings files in the order build.py builds them: "cl.<ver>.<kind>": [English, German, Chinese] — the English text, items
    split at "|" (a key defined twice: the later file wins, as in PT);
  - releases.json: the published date and the release notes of every version published from this repository.
Run:   python3 tools/changelog.py                 writes CHANGELOG.md
       python3 tools/changelog.py --check         exit 1 when CHANGELOG.md is not what the sources give (stale or edited by hand)
       python3 tools/changelog.py --notes 1.8.2   prints that version's section (for a GitHub release)
       --root DIR  another checkout (the tests use a made-up one)   --out FILE  write elsewhere
Exit codes: 0 fine · 1 stale (--check) · 2 the sources do not fit together (a named string missing, an unreadable entry)."""
import ast, difflib, json, pathlib, re, sys

KINDS = ["added", "changed", "fixed", "removed"]
HEAD_FALLBACK = {"added": "Added", "changed": "Changed", "fixed": "Fixed", "removed": "Removed"}

class SourceError(Exception):
    pass

def arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv): return sys.argv[i + 1]
        raise SourceError(f"{name} needs a value")
    return default

def build_order(root):
    m = re.search(r"order = \[(.*?)\]", (root / "build.py").read_text(), re.S)
    if not m: raise SourceError("build.py: no `order = [...]` list")
    return ast.literal_eval("[" + m.group(1) + "]")

def strings(root, order):
    """English text of every string key, in build order (the later definition wins)."""
    dec, out = json.JSONDecoder(), {}
    for f in [x for x in order if x.startswith("strings")]:
        txt = (root / "src" / f).read_text()
        for m in re.finditer(r'"([a-zA-Z0-9_.]+)"\s*:\s*\[\s*(?=")', txt):
            try: val, _ = dec.raw_decode(txt, m.end())
            except ValueError as e: raise SourceError(f"{f}: the English text of {m.group(1)} cannot be read ({e})")
            out[m.group(1)] = val
    return out

ENTRY = re.compile(r"\{[^{}]*\}")
def parse_entry(s, where):
    v = re.search(r'\bv\s*:\s*"([0-9][0-9.]*)"', s); d = re.search(r'\bd\s*:\s*"(\d{4}-\d\d-\d\d)"', s)
    if not v: raise SourceError(f"{where}: an entry without a version: {s[:80]}")
    e = {"v": v.group(1), "d": d.group(1) if d else ""}
    for k in KINDS:
        m = re.search(r'\b' + k + r'\s*:\s*"([a-zA-Z0-9_.]+)"', s)
        if m: e[k] = m.group(1)
    return e

def changelog_entries(root, order):
    txt = (root / "src" / "views_run.js").read_text()
    m = re.search(r"const CHANGELOG = \[(.*?)\n\];", txt, re.S)
    if not m: raise SourceError("src/views_run.js: no `const CHANGELOG = [ ... ];`")
    entries = [parse_entry(s, "views_run.js") for s in ENTRY.findall(m.group(1))]
    for f in [x for x in order if x.endswith(".js") and not x.startswith("strings")]:   # later files may add a version in front
        for u in re.finditer(r"CHANGELOG\.unshift\(\s*(\{[^{}]*\})\s*\)", (root / "src" / f).read_text()):
            entries.insert(0, parse_entry(u.group(1), f))
    return entries

def vkey(v): return tuple(int(x) for x in re.findall(r"\d+", v))

def releases(root):
    p = root / "releases.json"
    if not p.exists(): return {}
    try: data = json.loads(p.read_text())
    except ValueError as e: raise SourceError(f"releases.json cannot be read ({e})")
    return {str(r["version"]): r for r in data if isinstance(r, dict) and r.get("version")}

def md(s):
    """PT's plain text as Markdown text: nothing in it becomes HTML or a heading."""
    s = " ".join(str(s).split())
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def versions(root):
    order = build_order(root)
    S, entries, R = strings(root, order), changelog_entries(root, order), releases(root)
    by = {}
    for e in entries:
        if e["v"] in by: continue   # the first one wins (an entry added in front replaces nothing silently: it comes first)
        by[e["v"]] = e
    for v in R:
        by.setdefault(v, {"v": v, "d": ""})
    out = []
    for v in sorted(by, key=vkey, reverse=True):
        e, r = by[v], R.get(v, {})
        sec = []
        for k in KINDS:
            key = e.get(k)
            if not key: continue
            if key not in S: raise SourceError(f"{key} is named for {v} in CHANGELOG but no strings file defines it")
            items = [x.strip() for x in str(S[key]).split("|") if x.strip()]
            if items: sec.append((S.get("cl." + k) or HEAD_FALLBACK[k], items))
        out.append({"v": v, "date": str(r.get("date") or e.get("d") or ""), "notes": str(r.get("notes") or "").strip(), "sections": sec})
    return out

def section(x):
    lines = [f"## {x['v']}" + (f" — {x['date']}" if x["date"] else ""), ""]
    if x["notes"]: lines += ["Release notes: " + md(x["notes"]), ""]
    for head, items in x["sections"]:
        lines += [f"### {md(head)}", ""] + ["- " + md(i) for i in items] + [""]
    if not x["notes"] and not x["sections"]: lines += ["No notes were written for this version.", ""]
    return "\n".join(lines)

def render(root):
    vs = versions(root)
    head = ["# Changelog", "",
            "Prompt Translator (PT): every version, newest first, in English. This file is generated by `tools/changelog.py` from the",
            "notes PT shows in \"What's new\" (`CHANGELOG` in `src/views_run.js`, the `cl.<version>.*` strings) and from `releases.json`",
            "(published date and release notes). Do not edit it by hand: `python3 tools/changelog.py` writes it, `--check` says when it is stale.",
            "Versions before 1.8 were published from the private archive repository (see RELEASES-ARCHIVE.md).", ""]
    return "\n".join(head) + "\n" + "\n".join(section(x) for x in vs).rstrip("\n") + "\n"

def main():
    root = pathlib.Path(arg("--root") or pathlib.Path(__file__).resolve().parent.parent)
    out = pathlib.Path(arg("--out") or (root / "CHANGELOG.md"))
    try:
        if "--notes" in sys.argv:
            v = arg("--notes"); x = next((y for y in versions(root) if y["v"] == v), None)
            if not x: print(f"no version {v} in the sources"); return 2
            print(section(x).rstrip("\n")); return 0
        text = render(root)
    except (SourceError, OSError, SyntaxError, ValueError) as e:
        print("changelog: " + str(e)); return 2
    if "--check" in sys.argv:
        have = out.read_text() if out.exists() else ""
        if have == text: print(f"{out.name} is up to date ({text.count(chr(10) + '## ')} versions)"); return 0
        print(f"{out.name} is stale: run python3 tools/changelog.py")
        print("".join(list(difflib.unified_diff(have.splitlines(True), text.splitlines(True), "on disk", "from the sources", n=1))[:40]))
        return 1
    out.write_text(text); print(f"wrote {out.name} ({text.count(chr(10) + '## ')} versions)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
