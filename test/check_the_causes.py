"""Check the causes (2.1, J3 / C8-2): every cause in RELEASE-CHECKS.md is linked in test/causes.json to the checks that catch it and
the planted bugs that prove those checks, or says why not ("manual" / "no_plant"). Every cited text must exist in the cited file,
so a renamed or deleted check or planted bug turns this red instead of leaving a cause silently unguarded.
Data-free, well under 5 s. Run: python3 test/check_the_causes.py [--table] [--self-test]
  --table      print one line per cause (checks, planted bugs, or the reason there are none)
  --self-test  put three known mistakes into a copy of the map and make sure each one is caught (a check of this check)
"""
import json, pathlib, re, sys, copy
ROOT = pathlib.Path(__file__).resolve().parent.parent
RUNNERS = ("test/check_the_checks.py", "test/check_the_pick.py", "test/check_the_hunts.py", "test/hunt2.py", "test/hunt.py")

def cause_ids(text):
    """the causes RELEASE-CHECKS.md defines: the table rows (| 12 | …) and the '- Cause 77' entries"""
    ids = set(re.findall(r"^\| (\d+) \|", text, re.M)) | set(re.findall(r"^- Cause (\d+)\b", text, re.M))
    return sorted(ids, key=int)

_cache = {}
def read(f):
    if f not in _cache:
        p = ROOT / f
        _cache[f] = p.read_text(encoding="utf-8") if p.is_file() else None
    return _cache[f]

def problems(causes, ids):
    out = []
    for i in ids:
        if i not in causes: out.append(f"cause {i} is in RELEASE-CHECKS.md but not in causes.json")
    for i, c in causes.items():
        if i not in ids: out.append(f"cause {i} is in causes.json but not in RELEASE-CHECKS.md")
        if not str(c.get("cause", "")).strip(): out.append(f"cause {i}: no short name")
        checks, planted = c.get("checks") or [], c.get("planted") or []
        manual, no_plant = str(c.get("manual", "")).strip(), str(c.get("no_plant", "")).strip()
        if not checks and not manual: out.append(f"cause {i}: no check and no 'manual' reason")
        if not planted and not no_plant and not manual: out.append(f"cause {i}: no planted bug and no 'no_plant' reason")
        for kind, refs in (("check", checks), ("planted bug", planted)):
            for r in refs:
                if " :: " not in r: out.append(f"cause {i}: {kind} '{r}' is not '<file> :: <text>'"); continue
                f, needle = r.split(" :: ", 1)
                txt = read(f)
                if txt is None: out.append(f"cause {i}: {kind} file {f} does not exist"); continue
                if needle and needle not in txt: out.append(f"cause {i}: {kind} '{needle}' is not in {f} (renamed or removed?)")
                if kind == "planted bug" and not needle.strip(): out.append(f"cause {i}: planted bug in {f} names no plant (an empty citation proves nothing; cite the mutation or the plant's name)")   # 2.1 (red team N3)
                if kind == "planted bug" and f not in RUNNERS: out.append(f"cause {i}: planted bug cited in {f}, which runs no planted bugs")
    return out

def planted_names():
    """names of every planted bug, to show the ones no cause cites (information, not a failure)"""
    names = {}
    for f in ("test/check_the_checks.py", "test/check_the_pick.py"):
        names[f] = re.findall(r"^\s+\((['\"])(.+?)\1,", read(f) or "", re.M)
    return {f: [n for _, n in v] for f, v in names.items()}

def main():
    data = json.loads((ROOT / "test/causes.json").read_text(encoding="utf-8"))
    causes, ids = data["causes"], cause_ids((ROOT / "RELEASE-CHECKS.md").read_text(encoding="utf-8"))
    if "--self-test" in sys.argv:
        trials = []
        a = copy.deepcopy(causes); a.pop(ids[-1]); trials.append(("a cause left out of the map", a, f"cause {ids[-1]} is in RELEASE-CHECKS.md"))
        b = copy.deepcopy(causes); b[ids[0]]["checks"] = list(b[ids[0]].get("checks") or []) + ["test/static_checks.js :: H('zz-no-such-check'"]; trials.append(("a check that does not exist", b, "zz-no-such-check"))
        c = copy.deepcopy(causes); c[ids[1]] = {"cause": "x"}; trials.append(("a cause with neither a check nor a reason", c, f"cause {ids[1]}: no check"))
        d = copy.deepcopy(causes); d[ids[2]]["planted"] = ["test/e2e14.py :: "]; d[ids[2]].pop("no_plant", None); trials.append(("a planted bug cited in a file that plants nothing", d, "runs no planted bugs"))
        base = problems(causes, ids)
        if base: print("the map is not clean to start with:"); [print("  " + p) for p in base]; sys.exit(1)
        missed = [n for n, m, want in trials if not any(want in p for p in problems(m, ids))]
        for n, _, _ in trials: print(("MISSED " if n in missed else "caught ") + n)
        sys.exit(1 if missed else 0)
    bad = problems(causes, ids)
    cited = " ".join(r for c in causes.values() for r in (c.get("planted") or []))
    uncited = {f: [n for n in ns if n not in cited] for f, ns in planted_names().items()}
    if "--table" in sys.argv:
        for i in ids:
            c = causes.get(i, {})
            if c.get("manual"): print(f"{i:>4}  manual: {c['manual'][:100]}"); continue
            ch, pl = c.get("checks") or [], c.get("planted") or []
            print(f"{i:>4}  {len(ch)} check(s), " + (f"{len(pl)} planted" if pl else f"no planted bug: {c.get('no_plant', '')[:80]}") + f"  | {c.get('cause', '')[:60]}")
    n_manual = sum(1 for i in ids if causes.get(i, {}).get("manual"))
    n_plant = sum(1 for i in ids if causes.get(i, {}).get("planted"))
    print(f"causes: {len(ids)} in RELEASE-CHECKS.md · {len(ids) - n_manual} with checks · {n_plant} with planted bugs · {n_manual} manual · "
          f"{len(ids) - n_plant - n_manual} without a planted bug (reason given)")
    print("planted bugs no cause cites yet: " + ", ".join(f"{f.split('/')[-1]} {len(v)}" for f, v in uncited.items()))
    if "--uncited" in sys.argv:
        for f, v in uncited.items(): [print(f"  {f.split('/')[-1]}: {n}") for n in v]
    for p in bad: print("  BAD " + p)
    sys.exit(1 if bad else 0)

if __name__ == "__main__": main()
