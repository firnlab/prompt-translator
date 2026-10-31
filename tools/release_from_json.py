"""Runs inside the release workflow: for every version in releases.json without a tag, creates the annotated tag at the recorded
commit (notes = the live artifact version ids), builds that commit and attaches the file to a GitHub release. Needs GH_TOKEN and
the TODO list (JSON) in the environment; nothing else. Never run by hand against the real repository."""
import json, os, subprocess, sys

def sh(*a, **k): return subprocess.run(list(a), check=True, **k)
todo = json.loads(os.environ.get("TODO") or "[]")
for r in todo:
    v = r["version"]; tag = "v" + v; c = r["commit"]
    m, p = r.get("main", {}), r.get("preview", {})
    notes = (f"Prompt Translator {v} — published {r.get('date', '')}\n\nLive artifact versions:\n"
             f"- main    {m.get('artifact', '—')}  version {m.get('live', '—')}   (previous {m.get('previous', '—')})\n"
             f"- preview {p.get('artifact', '—')}  version {p.get('live', '—')}   (previous {p.get('previous', '—')})\n\n"
             f"{r.get('notes', '')}\n\nRollback = republishing the previous version id (needs the owner's GO).\n")
    open("notes.md", "w").write(notes)
    sh("git", "tag", "-a", tag, c, "-F", "notes.md")
    sh("git", "push", "origin", tag)
    wt = "wt-" + v
    sh("git", "worktree", "add", wt, c)
    sh("python3", "build.py", cwd=wt)
    out = f"prompt-translator-{tag}.html"
    os.replace(os.path.join(wt, "dist", "prompt-translator.html"), out)
    sh("gh", "release", "create", tag, out, "--title", f"Prompt Translator {v}", "--notes-file", "notes.md", "--verify-tag")
    print("released", tag)
