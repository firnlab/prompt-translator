"""Data guard: refuses a commit or push that would put private data or a secret into the repository.
Checked: every file git is about to send (or, with --all, every tracked file).
Blocked: keys and tokens, private keys, real e-mail addresses (anything not @example.*), Swiss AHV and IBAN numbers,
project data (PT backups, exports, test-data copies, anything under work/), PINs/hashes from real workspaces.
Run by hand:      python3 tools/data_guard.py --all
As a push hook:   git config core.hooksPath .githooks        (done once per clone; the hook calls this file)
In CI:            .github/workflows/quick-gate.yml runs it with --all on every push.
Exit code 0 = clean, 1 = blocked (the reason is printed; nothing is changed)."""
import pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ALL = "--all" in sys.argv

# file names that never belong in the repository
BAD_PATH = re.compile(r"""(^|/)(work/|\.env($|\.)|.*\.pem$|.*\.key$|id_rsa|id_ed25519|.*\.zip$|.*\.bundle$|.*\.sqlite$|.*\.db$
    |PT-data-backup|PT-v1-data-backup|PT-testdata|backup-\d+|data/users/|ws-w-[a-z0-9]+\.json$|meta\.json$|export.*\.json$|.*\.har$)""", re.X)
# content that never belongs in the repository (name, pattern)
BAD_TEXT = [
    ("Anthropic API key",        re.compile(r"sk-ant-[A-Za-z0-9_\-]{10,}")),
    ("OpenAI-style key",         re.compile(r"\bsk-[A-Za-z0-9]{32,}\b")),
    ("GitHub token",             re.compile(r"\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}")),
    ("AWS key",                  re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Google API key",           re.compile(r"\bAIza[0-9A-Za-z_\-]{30,}\b")),
    ("Slack/Telegram token",     re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}|\b\d{8,10}:AA[A-Za-z0-9_\-]{30,}\b")),
    ("private key block",        re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("JWT",                      re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}")),
    ("real e-mail address",      re.compile(r"\b[A-Za-z0-9._%+\-]+@(?!example\.(com|org|net|ch)\b|site\.example\b|noreply\.|users\.noreply\.)[A-Za-z0-9.\-]+\.(ch|com|net|org|de|at|li|io|dev|ai|me|cn)\b", re.I)),
    ("Swiss AHV number",         re.compile(r"\b756\.\d{4}\.\d{4}\.\d{2}\b")),
    ("Swiss IBAN",               re.compile(r"\bCH\d{2}(\s?\d{4}){4}\s?\d\b")),
    ("Swiss phone number",       re.compile(r"\+41\s?7[5-9]\s?\d{3}\s?\d{2}\s?\d{2}\b|\b07[5-9]\s?\d{3}\s?\d{2}\s?\d{2}\b")),
    ("workspace PIN hash",       re.compile(r"pbkdf2\$\d{5,}\$(?!NEW\$)[A-Za-z0-9+/=]{12,}\$[A-Za-z0-9+/=]{20,}")),
    ("artifact capability token",re.compile(r"\bcap_[A-Za-z0-9]{20,}\b")),
]
# test fixtures use made-up numbers; these exact values are allowed
ALLOWED = {"756.1234.5678.97", "CH93 0076 2011 6238 5295 7", "+41 79 123 45 67"}
SKIP_DIRS = ("dist/", "src_v", "proto/", "node_modules/", ".git/")

def changed_files():
    if ALL:
        out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout
        return out.split()
    # pre-push: everything in the commits about to leave, relative to what the remote already has
    files = set()
    for line in sys.stdin:
        parts = line.split()
        if len(parts) < 4: continue
        local_sha, remote_sha = parts[1], parts[3]
        if local_sha.strip("0") == "": continue   # deleting a branch
        rng = local_sha if remote_sha.strip("0") == "" else f"{remote_sha}..{local_sha}"
        out = subprocess.run(["git", "diff", "--name-only", "--diff-filter=AM", rng] if ".." in rng else ["git", "ls-tree", "-r", "--name-only", rng], cwd=ROOT, capture_output=True, text=True).stdout
        files.update(out.split())
    return sorted(files)

problems = []
for f in changed_files():
    if any(f.startswith(d) or ("/" + d) in f for d in SKIP_DIRS): continue
    if BAD_PATH.search(f): problems.append(f"{f}: this kind of file never goes into the repository"); continue
    p = ROOT / f
    if not p.is_file() or p.stat().st_size > 5_000_000: continue
    try: text = p.read_text(errors="ignore")
    except Exception: continue
    for name, rx in BAD_TEXT:
        for m in rx.finditer(text):
            if m.group(0).strip() in ALLOWED: continue
            line = text.count("\n", 0, m.start()) + 1
            problems.append(f"{f}:{line}: looks like a {name} ({m.group(0)[:6]}…)")
            break

if problems:
    print("DATA GUARD: blocked. Nothing was sent. Remove these first:")
    for x in problems: print("  " + x)
    print("If one is a false alarm (made-up test value), add the exact value to ALLOWED in tools/data_guard.py and say so in the commit.")
    sys.exit(1)
print("data guard: clean" + (" (all tracked files)" if ALL else ""))
