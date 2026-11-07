"""2.1 (J1, J6, J7, J9, J14): the gate's own honesty, proven on made-up checks (no browser, no data, about a minute).
  gate:  a flaky ordinary suite → FLAKY, logged, blocks (exit 1); a planted-bug check and a data-safety failure are never run again;
         a suite below its minimum count, or with 0 checks, is red; a timeout keeps what was printed; every run writes a data-free
         receipt; --only prints PARTIAL; --resume reuses a green check only while its key (test file …) is unchanged;
         the receipts read FULL only on one commit + one built file + a clean tree + every check green (never FLAKY).
  pick:  a planted bug counts as caught only when its build succeeds and its own check prints FAIL ("red elsewhere", a broken build,
         a green run and gone code are not caught); the run stops at the expected FAIL line; a red clean copy stops everything;
         --resume reuses the clean run and a caught bug; --learn records the first failing check.
Run: python3 test/gate_selftest.py"""
import json, os, pathlib, re, subprocess, sys, tempfile, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "test"))
import gate_keys as GK
fails, oks = [], []
def check(name, cond, info=""):
    (oks if cond else fails).append(name); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[-1500:]), flush=True)

TD = pathlib.Path(tempfile.mkdtemp(prefix="gate-selftest-"))
ENV = dict(os.environ, GATE_RECEIPTS=str(TD / "receipts"), GATE_STATE=str(TD / "state.jsonl"), GATE_LEDGER=str(TD / "ledger.txt"), PYTHONUNBUFFERED="1")
ENV.pop("PT_BROWSER_LOCK", None)
FAKE = TD / "fake_suite.py"
FAKE.write_text('''import sys, pathlib, time
mode, n = sys.argv[1], sys.argv[2:]
cnt = pathlib.Path(sys.argv[-1]) if mode in ("flaky", "flakydata", "planted") else None
first = cnt is not None and not cnt.exists()
if cnt is not None: cnt.write_text("x")
if mode == "green": print("ok:", n[0], "failed: 0 page errors: 0"); sys.exit(0)
if mode in ("flaky", "flakydata"):
    if first:
        print("FAIL  " + ("R5 a failed load writes nothing over the workspace" if mode == "flakydata" else "an ordinary check about layout"))
        print("ok: 100 failed: 1 page errors: 0"); sys.exit(1)
    print("ok: 100 failed: 0 page errors: 0"); sys.exit(0)
if mode == "planted":
    print("planted row bugs: 9, MISSED " + ("1" if first else "0")); sys.exit(1 if first else 0)
if mode == "slow": print("ok    the first check", flush=True); time.sleep(20); print("ok: 1 failed: 0 page errors: 0"); sys.exit(0)
''')
def C(name, mode, *a, mins=1): return [name, f"python3 {FAKE} {mode} " + " ".join(str(x) for x in a), True, mins]
CHECKS = [C("unit", "green", 20), C("flows 1.5 (Pick)", "flaky", TD / "c1"), C("flows 1.4.1", "flakydata", TD / "c2"),
          C("check the rows", "planted", TD / "c3"), C("hunt", "green", 3), C("flows 2.0 hands", "green", 0), C("flows 1.3", "slow", mins=0.05)]
(TD / "checks.json").write_text(json.dumps(CHECKS))
def gate(*args, checks="checks.json"):
    r = subprocess.run([sys.executable, str(ROOT / "test/release_gate.py"), *args], cwd=ROOT, capture_output=True, text=True, env=dict(ENV, GATE_CHECKS=str(TD / checks)), timeout=300)
    return r.returncode, r.stdout + r.stderr
def receipt(label):
    return json.loads((TD / "receipts" / GK.pt_version() / f"{label}.json").read_text())

print("the gate")
rc, out = gate("--label=one")
R = {c["name"]: c for c in receipt("one")["checks"]}
check("a red-then-green ordinary suite is FLAKY, and FLAKY blocks (exit 1)", R["flows 1.5 (Pick)"]["result"] == "FLAKY" and rc == 1 and "FLAKY blocks a publish" in out, out)
led = (TD / "ledger.txt").read_text() if (TD / "ledger.txt").exists() else ""
check("…it is written to the flaky ledger", "flows 1.5 (Pick): red, then green" in led, led)
check("a data-safety check that fails is never run again: RED, not flaky", R["flows 1.4.1"]["result"] == "FAIL" and "not run again: a data-safety check" in out and "flows 1.4.1: red" not in led, out)
check("a planted-bug check that misses is never run again: RED", R["check the rows"]["result"] == "FAIL" and "not run again: a planted-bug check" in out, out)
check("a suite below its minimum count is red (hunt: 3 of at least 21)", R["hunt"]["result"] == "FAIL" and "at least 21 expected" in out, out)
check("a suite that ran 0 checks is red", R["flows 2.0 hands"]["result"] == "FAIL" and R["flows 2.0 hands"]["ok"] == 0, R["flows 2.0 hands"])
check("a timeout keeps what the suite printed before it", R["flows 1.3"]["result"] == "FAIL" and "the first check" in out and "timed out" in out, out)
rc1 = receipt("one")
check("the receipt: version, commit, dirty, built-file sha256, seconds, scope, flaky, per check result/counts/seconds/key",
      all(k in rc1 for k in ("version", "commit", "dirty", "dist_sha256", "seconds", "scope", "flaky", "checks")) and rc1["flaky"] == ["flows 1.5 (Pick)"]
      and rc1["dist_sha256"] == GK.sha_path(ROOT / "dist/prompt-translator.html") and R["unit"]["ok"] == 20 and len(R["unit"]["key"]) == 32, rc1)
blob = json.dumps(rc1)
check("…and no output: no check text, no tail lines", "ordinary check" not in blob and "the first check" not in blob and "tail" not in blob, blob[:400])
check("the run's own summary says FULL scope but the receipts read PARTIAL (not all green)", rc1["scope"] == "FULL" and "PARTIAL" in out and "not green:" in out, out[-800:])

rc, out = gate("--only=unit", "--resume", "--label=two")
check("--only: the run is PARTIAL", receipt("two")["scope"] == "PARTIAL" and "this run: PARTIAL (--only=unit)" in out, out)
check("--resume: a green check with the same key is reused, not run", receipt("two")["checks"][0]["result"] == "REUSED" and "REUSED unit" in out, out)
FAKE.write_text(FAKE.read_text() + "\n# changed\n")
rc, out = gate("--only=unit", "--resume", "--label=three")
check("…once its test file changed, it runs again", receipt("three")["checks"][0]["result"] == "PASS", out)
rc, out = gate("--only=no such check")
check("an unknown check name stops the gate", rc == 2 and "unknown check names" in out, out)

print("FULL only on one commit")
def rcp(d, label, commit="c1", dist="d1", dirty=False, res=None, started="2026-11-05T10:00:00", tree=None):
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{label}.json").write_text(json.dumps({"commit": commit, "code_tree": tree, "dist_sha256": dist, "dirty": dirty, "started": started,
        "checks": [{"name": n, "result": (res or {}).get(n, "PASS")} for n in ("a", "b") if label != "A" or n == "a"]}))
names = ["a", "b"]
d = TD / "o1"; rcp(d, "A", res={"a": "PASS"}); rcp(d, "B")
check("all parts green on one commit and one built file: FULL", GK.overall(d, names)[0] == "FULL")
d = TD / "o2"; rcp(d, "A", commit="c1"); rcp(d, "B", commit="c2", started="2026-11-05T09:00:00", res={"a": "FAIL"})
w = GK.overall(d, names)
check("parts on two commits: PARTIAL, both named", w[0] == "PARTIAL" and any("different commits" in x for x in w[1]), w)
d = TD / "o2b"; rcp(d, "A", commit="c1", tree="t1", started="2026-11-05T09:00:00"); rcp(d, "B", commit="c2", tree="t1")
w = GK.overall(d, names)
check("two commits that differ only by a committed receipt (same code tree): FULL, the newest commit names the gate", w[0] == "FULL" and w[2] == "c2", w)
d = TD / "o2c"; rcp(d, "A", commit="c1", tree="t1", started="2026-11-05T11:00:00"); rcp(d, "B", commit="c2", tree="t2")
check("two commits with different code trees: PARTIAL", GK.overall(d, names)[0] == "PARTIAL")
check("HEAD's code tree is a tree id and ignores receipts/", bool(re.fullmatch(r"[0-9a-f]{40}", GK.code_tree("HEAD") or "")) and GK.code_tree("HEAD") == GK.code_tree("HEAD") and "receipts" not in subprocess.run(["git", "ls-tree", GK.code_tree("HEAD")], cwd=ROOT, capture_output=True, text=True).stdout)
d = TD / "o3"; rcp(d, "B", res={"b": "FLAKY"})
check("a FLAKY check: PARTIAL", GK.overall(d, names)[0] == "PARTIAL")
d = TD / "o4"; rcp(d, "B", dirty=True)
check("a part with uncommitted changes: PARTIAL", GK.overall(d, names)[0] == "PARTIAL")
d = TD / "o5"; rcp(d, "A")
check("a check never run: PARTIAL", GK.overall(d, names)[0] == "PARTIAL" and "not run (1): b" in GK.overall(d, names)[1][0])
d = TD / "o6"; rcp(d, "B", res={"a": "FAIL"}, started="2026-11-05T09:00:00"); rcp(d, "A", started="2026-11-05T11:00:00", dist="d1")
check("a later green run of a check replaces its earlier red one", GK.overall(d, names)[0] == "FULL", GK.overall(d, names))

print("check the Pick tests")
SUITE = TD / "fake_pick_suite.py"
SUITE.write_text('''import pathlib, sys, time, os
h = pathlib.Path("dist/prompt-translator.html").read_text()
if os.environ.get("FAKE_RED"): print("FAIL  check alpha  → red on the clean copy"); print("ok: 1 failed: 1 page errors: 0"); sys.exit(1)
f = 0
print("A1 the first part")
for nm, mark in (("check alpha", "PLANTED_ALPHA"), ("check beta", "PLANTED_BETA")):
    bad = mark in h; f += bad; print(("FAIL  " if bad else "ok    ") + nm + ("  → planted" if bad else ""), flush=True)
    if bad and "PLANTED_SLOW" in h: time.sleep(25)
print("ok:", 2 - f, "failed:", f, "page errors: 0"); sys.exit(1 if f else 0)
''')
A = "const PT_PREVIEW = false;"
cmd = f"python3 {SUITE}"
def mut(name, new, old=A, f="core.js"): return [name, [[f, old, new]], cmd]
PM = [mut("alpha caught", A + " /*PLANTED_ALPHA*/"), mut("beta instead of alpha", A + " /*PLANTED_BETA*/"), mut("nothing changes", A + " /*harmless*/"),
      mut("does not build", A + "\nfunction esc(s){ return s; }"), mut("stops at its FAIL", A + " /*PLANTED_ALPHA PLANTED_SLOW*/"),
      mut("its code is gone", "x", old="this text is not in core.js")]
LAB = {m[0]: {"label": "check alpha"} for m in PM}
(TD / "pm.json").write_text(json.dumps(PM)); (TD / "labels.json").write_text(json.dumps(LAB))
def pick(*args, pm="pm.json", labels="labels.json", **env):
    t0 = time.time()
    r = subprocess.run([sys.executable, str(ROOT / "test/check_the_pick.py"), *args], cwd=ROOT, capture_output=True, text=True, timeout=600,
                       env=dict(ENV, PICK_M=str(TD / pm), PICK_LABELS=str(TD / labels), **env))
    return r.returncode, r.stdout + r.stderr, time.time() - t0
rc, out, s = pick()
lines = {l.split("  ")[0].strip(): l for l in out.splitlines()}
check("its own check prints FAIL: caught", "caught  alpha caught" in out, out)
check("red, but on another check: NOT caught (red elsewhere)", "RED ELSEWHERE  beta instead of alpha" in out and "beta instead of alpha: red, but not on its check" in out, out)
check("a green run: MISSED", "MISSED  nothing changes" in out, out)
check("a planted bug whose build fails: NOT caught", "BUILD FAILED  does not build" in out and "does not build: its build failed" in out, out)
check("gone code: NOT caught", "GONE    its code is gone" in out, out)
check("the run stops at the expected FAIL line (the suite's 25 s sleep after it never runs)", "caught  stops at its FAIL" in out and s < 60, [s, out])
check("the summary counts only the real catches", "planted Pick bugs: 6, caught 2" in out and "MISSED 4" in out and rc == 1, out)
check("the clean copy ran first and was green", "clean   green" in out.split("caught  alpha caught")[0], out)
rc, out, s = pick(FAKE_RED="1")
check("a suite red on the clean copy stops the whole run: no bug is judged", rc == 1 and "NOT GREEN on the clean copy" in out and "caught" not in out.replace("look caught", ""), out)
(TD / "pm1.json").write_text(json.dumps(PM[:1]))
pick("--resume", pm="pm1.json")
rc, out, s = pick("--resume", pm="pm1.json")
check("--resume: the clean run and the caught bug are reused while their keys hold", "clean   reused" in out and "caught  reused" in out and "caught 1 (1 reused)" in out and rc == 0, out)
SUITE.write_text(SUITE.read_text() + "\n# changed\n")
rc, out, s = pick("--resume", pm="pm1.json")
check("…a changed test file runs both again", "clean   green" in out and "caught  alpha caught" in out, out)
(TD / "nolab.json").write_text("{}")
rc, out, s = pick(pm="pm1.json", labels="nolab.json")
check("a planted bug without a label is refused (no proof without its check)", rc == 1 and "name no check that must fail" in out, out)
(TD / "pm2.json").write_text(json.dumps([mut("learn beta", A + " /*PLANTED_BETA*/")]))
rc, out, s = pick("--learn", pm="pm2.json", labels="nolab.json")
L = json.loads((TD / "nolab.json").read_text())
check("--learn records the first failing check as the label", L.get("learn beta", {}).get("label") == "check beta" and "LEARNED learn beta" in out, [L, out])

print("ok:", len(oks), "failed:", len(fails), "page errors: 0")
for f in fails: print("  FAIL", f)
sys.exit(1 if fails else 0)
