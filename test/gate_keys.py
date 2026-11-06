"""2.1 (J6, J7): what a gate result was made from, so a green result can be reused only while none of it changed.
A key is the sha256 of: the built file, the test file(s) the command names, the shared test helpers (e2e14.py, mock.js), the data the
command runs on (a fixture, or the default real-data copies in work/), and the command itself. Results are kept in work/gate-state.jsonl
(git-ignored, never committed); receipts (receipts/<version>/) carry only keys, counts and times — never output or data."""
import hashlib, json, os, pathlib, re, subprocess, time
ROOT = pathlib.Path(__file__).resolve().parent.parent
STATE = pathlib.Path(os.environ.get("GATE_STATE") or ROOT / "work" / "gate-state.jsonl")
HELPERS = ["test/e2e14.py", "test/mock.js"]
DEFAULT_DATA = ["work/backup-140", "work/backup-141"]   # the suites' default data when the command names none
_cache = {}

def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_path(p):
    """a file's sha256; a folder's from every file's relative path and content; "missing" when absent"""
    p = pathlib.Path(p); k = str(p.resolve()) if p.exists() else str(p)
    st = p.stat().st_mtime_ns if p.exists() else 0
    if (k, st) in _cache: return _cache[(k, st)]
    if p.is_file(): v = sha_bytes(p.read_bytes())
    elif p.is_dir():
        h = hashlib.sha256()
        for f in sorted(x for x in p.rglob("*") if x.is_file()):
            h.update(str(f.relative_to(p)).encode() + b"\0" + hashlib.sha256(f.read_bytes()).digest())
        v = h.hexdigest()
    else: v = "missing"
    _cache[(k, st)] = v; return v

def files_of(cmd, root=ROOT):
    """the test/tool files and the data a command names (globs expanded), in a stable order"""
    out = []
    for tok in re.split(r"[\s;&|]+", cmd if isinstance(cmd, str) else " ".join(cmd)):
        if re.match(r"^(test|tools)/.+\.(py|js|json)$", tok) or re.match(r"^work/backup-\d+$", tok) or tok == "build.py" or (tok.startswith("/") and re.search(r"\.(py|js|json)$", tok)):
            if "*" in tok: out += sorted(str(x.relative_to(root)) for x in root.glob(tok))
            else: out.append(tok)
    return list(dict.fromkeys(out))

def key(cmd, root=ROOT, dist=None, extra=(), wide=False):
    """the key of one run of cmd in root. wide=True (planted-bug checks): every test file counts, since they run many suites"""
    root = pathlib.Path(root)
    fs = files_of(cmd, root) + HELPERS + list(extra)
    if not any(re.match(r"^(test/fixtures/.+\.json|work/backup-\d+)$", f) for f in fs): fs += DEFAULT_DATA
    if wide: fs += sorted(str(x.relative_to(root)) for x in list(root.glob("test/*.py")) + list(root.glob("test/*.js")))
    parts = {"cmd": cmd if isinstance(cmd, str) else " && ".join(cmd), "dist": sha_path(dist or root / "dist/prompt-translator.html")}
    for f in dict.fromkeys(fs): parts[f] = sha_path(root / f)
    return sha_bytes(json.dumps(parts, sort_keys=True).encode())[:32]

def load_state():
    """key → the newest record with that key"""
    got = {}
    try:
        for line in STATE.read_text().splitlines():
            try: r = json.loads(line); got[r["key"]] = r
            except Exception: pass
    except FileNotFoundError: pass
    return got

def save_state(rec):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    rec = dict(rec, at=time.strftime("%Y-%m-%dT%H:%M:%S"))
    with open(STATE, "a") as f: f.write(json.dumps(rec, sort_keys=True) + "\n")

def git(*a):
    try: return subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, timeout=30).stdout.strip()
    except Exception: return ""

def commit_info():
    """(commit, dirty): dirty when a tracked file differs from the commit (receipts/ itself does not count)"""
    st = [l for l in git("status", "--porcelain", "--untracked-files=no").splitlines() if l.strip() and not l[3:].startswith("receipts/")]
    return git("rev-parse", "HEAD") or "unknown", bool(st)

def code_tree(commit="HEAD"):
    """the commit's tree without receipts/ (the gate's own output): two commits that differ only by a committed receipt share it,
    so a receipt committed between gate parts does not split one gate into "different commits" """
    try:
        ls = [l for l in git("ls-tree", commit).splitlines() if l.strip() and not l.endswith("\treceipts")]
        r = subprocess.run(["git", "mktree"], cwd=ROOT, input="\n".join(ls) + "\n", capture_output=True, text=True)
        return r.stdout.strip() or None
    except Exception: return None

def pt_version():
    for f in ("src/app.js", "src/core.js"):
        try: m = re.search(r'const PT_VERSION\s*=\s*"([^"]+)"', (ROOT / f).read_text())
        except FileNotFoundError: m = None
        if m: return m.group(1)
    return "unknown"

def overall(rdir, names):
    """FULL only when every gate check is green (PASS or REUSED, never FLAKY) in the newest receipt that ran it, and all of those
    receipts share one code tree (the commit without receipts/; the commit itself when a receipt lacks the tree), a clean tree and
    one built file. Returns (word, reasons, commit)."""
    newest = {}
    for f in sorted(rdir.glob("*.json")):
        try: rc = json.loads(f.read_text())
        except Exception: continue
        for c in rc.get("checks", []):
            if c["name"] not in newest or rc["started"] >= newest[c["name"]][0]["started"]: newest[c["name"]] = (rc, c)
    why = []
    miss = [n for n in names if n not in newest]
    if miss: why.append(f"not run ({len(miss)}): " + ", ".join(miss[:8]) + (", …" if len(miss) > 8 else ""))
    notgreen = [f"{n} {newest[n][1]['result']}" for n in names if n in newest and newest[n][1]["result"] not in ("PASS", "REUSED")]
    if notgreen: why.append("not green: " + ", ".join(notgreen))
    used = [newest[n][0] for n in names if n in newest]
    commits = {rc["commit"] for rc in used}; dists = {rc["dist_sha256"] for rc in used}
    trees = {rc.get("code_tree") or ("commit:" + rc["commit"]) for rc in used}
    if len(trees) > 1: why.append("parts on different commits: " + ", ".join(sorted(c[:10] for c in commits)))
    elif len(commits) > 1: commits = {sorted(commits, key=lambda c: max(rc["started"] for rc in used if rc["commit"] == c))[-1]}   # receipt-only commits in between: the newest one names the gate
    if len(dists) > 1: why.append("parts on different built files: " + ", ".join(sorted(d[:12] for d in dists)))
    if any(newest[n][0].get("dirty") for n in names if n in newest): why.append("a part ran with uncommitted changes")
    return ("FULL" if not why else "PARTIAL"), why, (commits.pop() if len(commits) == 1 else None)
