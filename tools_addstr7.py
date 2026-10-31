import json, sys
P='/home/claude/pt/src/strings7.js'
def add(d):
    s=open(P).read()
    body=',\n'.join('%s:%s' % (json.dumps(k), json.dumps(v, ensure_ascii=False)) for k,v in d.items())
    i=s.rstrip().rfind('});'); s=s[:i].rstrip()
    if not s.endswith(','): s+=','
    s+='\n'+body+'\n});\n'
    open(P,'w').write(s)
if __name__=='__main__': add(json.loads(sys.stdin.read()))
