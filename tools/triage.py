"""Inbox triage, room 1 (DESIGN-1.8-rev2 §5, PLAN-1.8 video round 3–4, §17): deterministic, no model, no secrets of the agent.
Runs in .github/workflows/triage.yml on every new or edited issue. Reads the issue only from the event file (never from
${{ }} interpolation), treats its text as data, and does:
  1. secret-in-issue: keys or tokens in title/body are replaced by "[removed by triage]" and the issue is edited at once;
  2. classify: idea / bug / question from the template label or title, else "unclear";
  3. trust: owner logins and repository members are trusted; everyone else is "untrusted" (the owner looks first);
  4. hostile markers: instructions aimed at an agent are flagged "needs-owner-eyes" (nothing here ever executes them);
  5. duplicate: a near-identical title of another open issue → one-line comment, closed as duplicate (owner decision 31 Oct);
  6. record: one JSON file per issue into firnlab/pt-private/triage/ (never into the public run log or summary).
The "is this real?" judgment by a model is a later step (Agentic Workflow); everything here is code by the §17 rule.
Log output names only the issue number — Actions logs of a public repository are public."""
import base64, difflib, json, os, re, sys, time, urllib.request, urllib.error

SECRET_PATTERNS = [
    r"sk-ant-[A-Za-z0-9_\-]{20,}",            # Anthropic keys and OAuth tokens
    r"github_pat_[A-Za-z0-9_]{20,}",           # GitHub fine-grained tokens
    r"\bgh[pousr]_[A-Za-z0-9]{30,}",           # GitHub classic tokens
    r"\bAKIA[0-9A-Z]{16}\b",                   # AWS access key ids
    r"\bAIza[0-9A-Za-z\-_]{35}\b",             # Google API keys
    r"\bxox[baprs]-[A-Za-z0-9\-]{10,}",        # Slack tokens
    r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----",
]
HOSTILE_MARKERS = [
    r"ignore (all |any )?(previous|prior|above) (instructions|prompts?)", r"\byou are now\b", r"system prompt",
    r"@claude\b", r"\bdisregard\b.*\binstructions\b", r"\brun (this|the following) (command|script)\b",
    r"\bcurl\s+https?://", r"\bexfiltrat", r"<!--", r"[​‌‍⁠﻿]",
]
KINDS = ("bug", "idea", "question")
REMOVED = "[removed by triage]"


def redact(text):
    n = 0
    for p in SECRET_PATTERNS:
        text, k = re.subn(p, REMOVED, text or "")
        n += k
    return text, n


def norm_title(t):
    t = re.sub(r"^(bug|idea|question)\s*:\s*", "", (t or "").lower())
    return " ".join(re.findall(r"[a-z0-9一-鿿]+", t))


def classify(issue, owners, open_issues):
    title, nt = redact(issue.get("title", ""))
    body, nb = redact(issue.get("body") or "")
    labels = [l["name"] if isinstance(l, dict) else l for l in issue.get("labels", [])]
    kind = next((k for k in KINDS if k in labels), None)
    if not kind:
        m = re.match(r"\s*(bug|idea|question)\s*:", issue.get("title", ""), re.I)
        kind = m.group(1).lower() if m else "unclear"
    login = (issue.get("user") or {}).get("login", "")
    assoc = issue.get("author_association", "NONE")
    trusted = login in owners or assoc in ("OWNER", "MEMBER", "COLLABORATOR")
    hostile = [p for p in HOSTILE_MARKERS if re.search(p, (issue.get("title", "") + "\n" + (issue.get("body") or "")), re.I)]
    me, dup = norm_title(issue.get("title", "")), None
    if me:
        for o in open_issues:
            if o.get("number") == issue.get("number") or o.get("pull_request"):
                continue
            if difflib.SequenceMatcher(None, me, norm_title(o.get("title", ""))).ratio() >= 0.9:
                dup = o["number"]
                break
    return {"number": issue.get("number"), "kind": kind, "author": login, "association": assoc, "trusted": trusted,
            "hostile_markers": len(hostile), "secrets_removed": nt + nb, "duplicate_of": dup,
            "title": title, "body": body[:20000]}


def api(method, path, token, data=None):
    req = urllib.request.Request("https://api.github.com" + path, method=method,
                                 data=None if data is None else json.dumps(data).encode(),
                                 headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "pt-triage"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def main():
    ev = json.load(open(os.environ["GITHUB_EVENT_PATH"]))
    issue = ev.get("issue") or {}
    if issue.get("pull_request"):
        return 0
    repo, tok = os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"]
    owners = [s.strip() for s in os.environ.get("OWNER_LOGINS", "").split(",") if s.strip()]
    n = issue["number"]
    open_issues = api("GET", f"/repos/{repo}/issues?state=open&per_page=100", tok) or []
    rec = classify(issue, owners, open_issues)
    if rec["secrets_removed"]:
        api("PATCH", f"/repos/{repo}/issues/{n}", tok, {"title": rec["title"], "body": rec["body"]})
        api("POST", f"/repos/{repo}/issues/{n}/comments", tok, {"body": "A key, token or password was removed from this issue. "
            "If it was real, revoke it now and make a new one — it was visible for a moment."})
    labels = ["triaged", rec["kind"]] + ([] if rec["trusted"] else ["untrusted"]) + (["needs-owner-eyes"] if rec["hostile_markers"] else []) \
        + (["secret-removed"] if rec["secrets_removed"] else [])
    api("POST", f"/repos/{repo}/issues/{n}/labels", tok, {"labels": labels})
    if rec["duplicate_of"]:
        api("POST", f"/repos/{repo}/issues/{n}/comments", tok, {"body": f"Looks like a duplicate of #{rec['duplicate_of']} — closed. Reopen it if it is not."})
        api("PATCH", f"/repos/{repo}/issues/{n}", tok, {"state": "closed", "state_reason": "duplicate"})
    ptok = os.environ.get("PT_PRIVATE_TOKEN", "")
    if ptok:
        rec["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        rec["outcome"] = "closed-duplicate" if rec["duplicate_of"] else ("waits-for-owner" if not rec["trusted"] or rec["hostile_markers"] else "open")
        path = f"/repos/firnlab/pt-private/contents/triage/issue-{n}.json"
        old = api("GET", path, ptok)
        body = {"message": f"triage #{n}", "content": base64.b64encode(json.dumps(rec, ensure_ascii=False, indent=1).encode()).decode(),
                "committer": {"name": "pt-triage", "email": "pt-triage@users.noreply.github.com"}}
        if old and old.get("sha"):
            body["sha"] = old["sha"]
        api("PUT", path, ptok, body)
    print(f"triaged #{n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
