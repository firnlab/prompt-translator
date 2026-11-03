import pathlib, os, sys
# usage: python3 build.py [preview-artifact-url]  → a preview build talks to its own storage
MAIN_URL = "https://claude.ai/artifact/VjEPcpnocMTPMwHvHdwTZ3"
URL = sys.argv[1] if len(sys.argv) > 1 else MAIN_URL
OUT = "dist/prompt-translator.html" if URL == MAIN_URL else "dist/prompt-translator-preview.html"
S = pathlib.Path("src")
order = ["knowledge.js","strings.js","strings2.js","strings3.js","strings4.js","strings5.js","strings6.js","strings7.js","strings8.js","strings9.js","strings10.js","strings11.js","strings12.js","strings13.js","strings14.js","strings15.js","strings16.js","strings17.js","strings18.js","strings19.js","strings20.js","strings21.js","strings22.js","strings23.js","strings24.js","strings25.js","core.js","items.js","engine.js","tasks.js","tasks2.js","tasks3.js","tasks4.js","tasks5.js","v14_fix.js","app.js","v14_model.js","v14_queue.js","views_shell.js","views_modes.js","views_phases.js","views_run.js","views_engine.js","views13.js","views_pages.js","actions.js","actions2.js","actions3.js","actions4.js","v14_change.js","v14_goal.js","v14_interview.js","v14_tasks.js","v14_ui.js","v14_finish.js","v14_map.js","v14_release.js","v14_migrate.js","v141_ui.js","v141_shell.js","v141_examples.js","v141_stages.js","v141_levels.js","v141_migrate.js","v142_proof.js","v150_pick.js","v160_kits.js","v160_company.js","v160_webapp.js","v160_media.js","v160_phone.js","v160_rebuild.js","v160_spine.js","v170_pages.js","v170_honest.js","v170_more.js","v170_build.js","v170_vault.js","v171_measure.js","v180_look.js","v180_decide.js","v180_checks.js","v180_rows.js","v180_cone.js","v180_run.js","v180_health.js","v180_kits.js","v190_care.js","v190_fleet.js","v190_scan.js","v190_interview.js","v191_judge.js","v191_lab.js","v1100_hands.js"]
import re as _re0
# 1.4 safeguard: one definition per function (a later duplicate silently replaces the earlier one everywhere)
_defs = {}
for _f in order:
    for _m in _re0.finditer(r"^(?:async )?function ([A-Za-z0-9_$]+)\s*\(", S.joinpath(_f).read_text() if False else pathlib.Path("src").joinpath(_f).read_text(), _re0.M):
        _defs.setdefault(_m.group(1), []).append(_f)
_dup = {k: v for k, v in _defs.items() if len(v) > 1}
assert not _dup, "duplicate function definitions: " + str(_dup)
_srcs = set(order) | {"styles.css", "styles18.css"}
_extra = [f.name for f in pathlib.Path("src").iterdir() if f.name not in _srcs]
assert not _extra, "files in src/ that are not built: " + str(_extra)
import json as _json
VAULT = _json.loads(pathlib.Path("vault/vault.json").read_text())
_vault_js = "const VAULT = " + _json.dumps({"checked": VAULT["checked"], "tools": [{k: t[k] for k in ("id", "name", "repo", "licence", "group", "install", "use")} for t in VAULT["tools"]]}, ensure_ascii=False) + ";\n"
js = _vault_js + "\n".join(S.joinpath(f).read_text() for f in order).replace('const PT_URL = "' + MAIN_URL + '";', 'const PT_URL = "' + URL + '";') + "\nboot();\n"
assert ('const PT_URL = "' + URL + '";') in js
if URL != MAIN_URL:
    js = js.replace("const PT_PREVIEW = false;", "const PT_PREVIEW = true;"); assert "const PT_PREVIEW = true;" in js
import re as _re
VER = _re.search(r'const PT_VERSION = "([0-9.]+)";', S.joinpath("app.js").read_text()).group(1)
TITLE = "Prompt Translator " + VER + (" Preview" if URL != MAIN_URL else "")
css = S.joinpath("styles.css").read_text() + "\n/* ===== 1.8 look (styles18.css) ===== */\n" + S.joinpath("styles18.css").read_text()
html = f"""<title>{TITLE}</title>
<style>
{css}
</style>
<div id="app"></div>
<script>
"use strict";
{js}
</script>
"""
pathlib.Path("dist").mkdir(exist_ok=True)
pathlib.Path(OUT).write_text(html)
print(OUT, "bytes", len(html.encode()), "title:", TITLE)
