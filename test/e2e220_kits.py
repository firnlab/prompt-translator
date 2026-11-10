"""2.2.0 item 7 + import SHOULD 16: kit prices re-checked on the vendors' own pages and the vendor limits table, on a COPY of the data
(or the made-up bundle) with the mock runtime. Never touches real data.
 1 the kit facts carry the 10 Nov 2026 check, no third-party price source, and name the pages that could not be read
 2 Settings › Knowledge shows one row per vendor: kind as a word and a sign (never colour only), what the limit does, what stays billed,
   the date and the vendor's own https page; unread limit behaviour says "not read yet" and offers no "set" tick
 3 "Mark as set" keeps a date per workspace in a flat settings key; Not set removes it; a backup export → import keeps the ticks
 4 fake clock 1 Dec 2026: past the 20-day price clock every row says "check again" and the kit options lose their ★
 5 brief text: vendorLimitsText names the limit of the vendors a tool uses
 + three languages, phone width without sideways scroll, no page errors."""
import json, sys, pathlib
BK = sys.argv[1] if len(sys.argv) > 1 else "work/backup-141"
sys.argv = [sys.argv[0], BK]
__file__ = str(pathlib.Path(__file__).resolve().parent / "e2e14.py")
exec(open(__file__).read().split("with sync_playwright() as pw:")[0])
_check0 = check
def check(name, cond, info=""):
    _check0(name, cond, info); print(("ok    " if cond else "FAIL  ") + name + ("" if cond else "  → " + str(info)[:500]), flush=True)
def ev(pg, js, *a): return pg.evaluate(js, *a)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = new_ctx(b); pg = open_page(ctx); pg.wait_for_timeout(300)

    print("1 the kit facts")
    k = ev(pg, "({checked: KIT_CHECKED, web: KIT_WEB_FACTS, media: KIT_MEDIA_FACTS, phone: KIT_PHONE_FACTS, sched: KIT_SCHED_FACTS})")
    check("the kit prices carry the 10 Nov 2026 check", k["checked"] == "2026-11-10", k["checked"])
    check("no third-party survey is a price source any more", "flaviocopes" not in json.dumps(k), "")
    check("Stripe: Swiss and non-Swiss card fees from Stripe's own page", "2.9 % + CHF 0.30 per Swiss card" in k["web"] and "3.25 % + CHF 0.30" in k["web"], "")
    check("Supabase: what the spend cap never caps", "never caps compute, custom domains, IPv4" in k["web"], "")
    check("pages not read on 10 Nov are named with the date last read (Paddle, Lovable, ElevenLabs, Canva, Gamma, store fees)",
          all(x in json.dumps(k, ensure_ascii=False) for x in ["its own page could not be read on 10 Nov 2026: re-check", "Lovable — about USD 25 a month plus credits (last read 23 Oct 2026", "its own page could not be read on 10 Nov", "not re-checked on 10 Nov"]), "")
    check("Gemini image prices as on ai.google.dev (1K / 2K / 4K)", "USD 0.0336 at 1K, 0.0504 at 2K, 0.113 at 4K" in k["media"], "")

    print("2 the vendor limits table")
    ev(pg, "() => { go('settings'); UI.setTab = 'knowledge'; render(); }"); pg.wait_for_timeout(300)
    rows = ev(pg, """() => [...document.querySelectorAll('[data-vl]')].map(r => ({id: r.dataset.vl, kind: (r.querySelector('[data-vl-kind]') || {}).dataset ? r.querySelector('[data-vl-kind]').dataset.vlKind : '',
        word: (r.querySelector('[data-vl-kind]') || {}).textContent || '', sign: !!(r.querySelector('[data-vl-kind] svg')), text: r.textContent,
        link: (r.querySelector('a[href]') || {}).href || '', setBtn: !!r.querySelector('[data-a=vl-set]')}))""")
    ids = [r["id"] for r in rows]
    check("one row per vendor in the table", ids == ev(pg, "VENDOR_LIMITS.map(v => v.id)") and len(ids) >= 10, ids)
    check("every row names its kind as a word and a sign, never colour only", all(r["word"].strip() and r["sign"] for r in rows), [r for r in rows if not (r["word"].strip() and r["sign"])][:2])
    check("every row links the vendor's own https page", all(r["link"].startswith("https://") for r in rows), [r["link"] for r in rows])
    unchecked = [r for r in rows if r["kind"] == "unchecked"]
    check("limit behaviour PT has not read says “Not read yet” and offers no set tick", unchecked and all("Not read yet" in r["text"] and not r["setBtn"] for r in unchecked), unchecked[:2])
    none = [r for r in rows if r["kind"] == "none"]
    check("vendors without any limit (Stripe, Lemon Squeezy) say so and offer nothing to set", len(none) >= 2 and all("No limit" in r["text"] and not r["setBtn"] for r in none), none[:2])
    sup = next(r for r in rows if r["id"] == "supabase")
    check("Supabase row: a cap, what it blocks and what stays billed", sup["kind"] == "cap" and "blocked until the next billing cycle" in sup["text"] and "IPv4" in sup["text"], sup["text"][:200])

    print("3 marking a limit as set")
    pg.locator("[data-vl=supabase] [data-a=vl-set]").click(); pg.wait_for_timeout(250)
    st = ev(pg, "({k: WS.settings.vlSet_supabase, shown: !!document.querySelector('[data-vl=supabase] [data-vl-set]')})")
    check("Mark as set keeps today's date in a flat settings key and shows it", bool(st["k"]) and len(st["k"]) == 10 and st["shown"], st)
    exp = ev(pg, "(() => { let out = null; const o = saveFile; saveFile = (n, txt) => { out = txt; }; try{ ACTIONS['export-ws'](); } finally { saveFile = o; } return out; })()")
    check("the backup carries the tick", exp and '"vlSet_supabase"' in exp, (exp or "")[:80])
    pg.locator("[data-vl=supabase] [data-a=vl-unset]").click(); pg.wait_for_timeout(250)
    check("Not set removes it", ev(pg, "WS.settings.vlSet_supabase === undefined && !document.querySelector('[data-vl=supabase] [data-vl-set]')"), "")
    back = ev(pg, """(txt) => { const d = JSON.parse(txt); d.workspace.settings.vlSet_bad = 'x'; d.workspace.settings['vlSet_<img>'] = '2026-11-10'; d.workspace.settings.vlSet_stripe = {a: 1};
        importBackup(d, 'b.json'); return {sup: WS.settings.vlSet_supabase, bad: WS.settings.vlSet_bad, img: WS.settings['vlSet_<img>'], obj: WS.settings.vlSet_stripe}; }""", exp)
    check("an import restores the tick and drops anything that is not a plain date under a plain key", bool(back["sup"]) and back["bad"] is None and back["img"] is None and back["obj"] is None, back)

    print("4 past the 20-day price clock")
    ev(pg, "() => { window.__realNow = Date.now; Date.now = () => Date.parse('2026-12-01T10:00:00Z'); render(); }"); pg.wait_for_timeout(200)
    stale = ev(pg, "document.querySelectorAll('[data-vl-stale]').length")
    check("on 1 Dec 2026 every row says “check again”", stale == len(ids), stale)
    star = ev(pg, "(() => { const O = qOptions(curP() || WS.projects[0], {kind: 'kit-engine'}); return Array.isArray(O) ? O.filter(o => o && o.star).length : -1; })()")
    check("…and kit options give no ★ until a price re-check", star in (0, -1), star)
    ev(pg, "() => { Date.now = window.__realNow; render(); }")

    print("5 brief text")
    txt = ev(pg, "vendorLimitsText(['supabase', 'stripe'])")
    check("a tool using Supabase and Stripe gets both limit lines, nothing else", "Supabase Pro" in txt and "Stripe" in txt and "Vercel" not in txt, txt[:200])

    print("6 languages and phone")
    for lang, word in (("de", "Deckel"), ("zh", "封顶")):
        ev(pg, f"() => {{ ACTIONS['set-lang']({{dataset: {{l: '{lang}'}}}}); }}"); pg.wait_for_timeout(200)
        check(f"the table in {lang}", word in ev(pg, "(document.querySelector('[data-anchor=vendor-limits]') || {}).textContent || ''"), lang)
    ev(pg, "() => { ACTIONS['set-lang']({dataset: {l: 'en'}}); }")
    pg.set_viewport_size({"width": 390, "height": 844}); pg.wait_for_timeout(300)
    check("at 390 px the table needs no sideways scroll", ev(pg, "document.documentElement.scrollWidth <= window.innerWidth + 1"), ev(pg, "[document.documentElement.scrollWidth, window.innerWidth]"))
    check("no page errors in the whole run", not errors, errors[:4])
    b.close()
print(f"\n== e2e220_kits: ok: {len(oks)} failed: {len(fails)} page errors: {len(errors)}")
for f in fails: print("FAIL", f)
for e in errors[:10]: print("ERR ", e)
sys.exit(1 if fails or errors else 0)
