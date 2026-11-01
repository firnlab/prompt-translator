"""Check the decision-row checks: put known row, event and tier bugs back into a COPY of the sources, one at a time, build it, and make
sure test/e2e180_rows.py turns red for each one. A check that stays green with its bug back is broken (it could stop working silently).
Run: python3 test/check_the_rows.py        (about 5 minutes on the made-up data; never touches src/)"""
import pathlib, shutil, subprocess, sys, tempfile, os
ROOT = pathlib.Path(__file__).resolve().parent.parent
T = "python3 test/e2e180_rows.py test/fixtures/synthetic.json"
F = "v180_rows.js"
# (name, [(file, old, new), …], test that must fail)
M = [
    ("a changed event passes the history check", [(F, "if (await rowHash(e) !== e.hash) bad.push", "if (false) bad.push")], T),
    ("a missing event passes the history check", [(F, 'if (par && seen.has(par)) forks.push(e.id); else bad.push({id: e.id, why: "parent"});', "forks.push(e.id);")], T),
    ("PT takes ★ on rows nobody set to 'I do it'", [(F, 'r.tier === "auto" && (r.tierBy === "owner" || r.tierBy === "source") && ', "")], T),
    ("a check row (O4a: every gate needs the owner's tap) is taken by PT", [(F, "\n    && !r.gate && !ROW_GATE_SRC.test(r.src) && ", "\n    && "), (F, 'if (r.gate || ROW_GATE_SRC.test(r.src)) return "block"; ', "")], T),
    ("a row a changed fact touched is taken by PT", [(F, " && !r.fact && !r.noAuto", " && !r.noAuto")], T),
    ("a decision taken back writes no event", [(F, "for (const [src, was] of L.st) if (!live.has(src))", "for (const [src, was] of []) if (!live.has(src))")], T),
    ("the first event of a 1.7 project has no restore point", [(F, "if (old){ rp = rowRestore(", "if (false){ rp = rowRestore(")], T),
    ("ids follow the list, not the log (a delete renumbers rows)", [(F, "for (const r of raw) if (L && L.reg.has(r.src)) out.set", "for (const r of raw) if (false) out.set")], T),
    ("working out the rows fills in the project (a phantom Undo step)", [(F, "  if (RENDERING) return rowsComputeNow(p);\n  RENDERING = true;", "  if (RENDERING) return rowsComputeNow(p);\n  RENDERING = false;")], T),
]

def run(tmp, cmd):
    r = subprocess.run(cmd, shell=True, cwd=tmp, capture_output=True, text=True, timeout=1800)
    out = r.stdout + r.stderr
    return r.returncode == 0 and "failed: 0" in out and "page errors: 0" in out, out

with tempfile.TemporaryDirectory() as td:
    tmp = pathlib.Path(td)
    for d in ("src", "test", "vault"): shutil.copytree(ROOT / d, tmp / d, ignore=shutil.ignore_patterns("*.html", "*.png", "shots*", "__pycache__"))
    shutil.copy(ROOT / "build.py", tmp / "build.py"); (tmp / "dist").mkdir()
    os.symlink((ROOT / "work").resolve(), tmp / "work")
    b = subprocess.run("python3 build.py", shell=True, cwd=tmp, capture_output=True, text=True)
    if b.returncode != 0: print("the copy does not build — nothing can be checked:\n" + (b.stdout + b.stderr)[-800:]); sys.exit(1)
    ok0, out0 = run(tmp, T)
    if not ok0: print("the row test is not green on the clean copy — fix that first:\n" + out0[-1500:]); sys.exit(1)
    missed = []
    for name, subs, test in M:
        saved = {}
        ok = True
        for f, old, new in subs:
            fp = tmp / "src" / f; s = saved.get(f, fp.read_text()); saved.setdefault(f, s)
            cur = fp.read_text()
            if old not in cur: missed.append(f"{name}: the code it changes is gone — update this script ({old[:60]})"); ok = False; break
            fp.write_text(cur.replace(old, new, 1))
        if ok:
            subprocess.run("python3 build.py", shell=True, cwd=tmp, capture_output=True)
            passed, out = run(tmp, test)
            print(("caught  " if not passed else "MISSED  ") + name + "  (" + test.split("/")[-1] + ")", flush=True)
            if passed: missed.append(f"{name}: {test} stayed green")
        for f, s in saved.items(): (tmp / "src" / f).write_text(s)
    print(f"\nplanted row bugs: {len(M)}, MISSED {len(missed)}")
    for m in missed: print("  " + m)
    sys.exit(1 if missed else 0)
