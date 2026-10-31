import json, sys, re
P='/home/claude/pt/src/strings5.js'
def add(d):
    try: s=open(P).read()
    except FileNotFoundError: s='/* 1.3 strings: EN written by the builder; DE and ZH filled by the translation pass */\nObject.assign(STR, {\n});\n'
    body=''.join('%s:%s,\n' % (json.dumps(k), json.dumps(v if isinstance(v,list) else [v,"",""], ensure_ascii=False)) for k,v in d.items())
    i=s.rstrip().rfind('});')
    s=s[:i]+body+'});\n'
    open(P,'w').write(s)
if __name__=='__main__':
    add(json.loads(sys.stdin.read()))
