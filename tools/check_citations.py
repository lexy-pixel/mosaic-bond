"""Checks every data entry carries >=1 valid citation id and that every cited URL resolves (HTTP 2xx/3xx)."""
import json,collections,concurrent.futures as cf,urllib.request,datetime,sys
D='data/';C=json.load(open(D+'citations.json'))['citations'];N=json.load(open(D+'nutrients.json'));M=json.load(open(D+'meds.json'));K=json.load(open(D+'conditions.json'))
E=[]
def chk(where,ids):
  if not ids: E.append(where+': no citation')
  for i in ids or []:
    if i not in C: E.append(where+': unknown cite '+i)
n=0
for k,v in N['nutrients'].items():
  chk(k+'.mechanism',v['mechanismCites']);n+=1
  for m in v['map']: chk(k+'.map.'+m['part'],m['cites']);n+=1
for k,v in N['dri'].items(): chk('dri.'+k,v['cites']);n+=1
for m in M['meds']:
  chk(m['id']+'.label',[m['label']]);n+=1
  for x in m['parts']+m['interactions']+m['odsInteractions']: chk(m['id']+'.entry',x['cites']);n+=1
chk('grapefruitNote',M['grapefruitNote']['cites']);n+=1
for c in K['conditions']:
  chk(c['id'],[c['cite']]);n+=1
  for x in c['parts']+c['rules']+c['medLinks']: chk(c['id']+'.entry',x['cites']);n+=1
Y=json.load(open(D+'symptoms.json'))
chk('symptoms.emergency',Y['emergency']['cites']);n+=1
for y in Y['symptoms']:
  if y['red']: chk(y['id']+'.redflag',y['redflag']['cites']);n+=1
  for x in y['nutrients']+y['meds']+y['conds']: chk(y['id']+'.link',x['cites']);n+=1
print('symptoms:',len(Y['symptoms']),'| red-flag:',sum(y['red'] for y in Y['symptoms']))
urls=sorted({c['url'] for c in C.values()})
def get(u):
  for meth in('HEAD','GET'):
    try:
      r=urllib.request.urlopen(urllib.request.Request(u,method=meth,headers={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) Chrome/120'}),timeout=30);return u,r.status
    except urllib.error.HTTPError as e: st=e.code
    except Exception as e: st=str(e)[:60]
  return u,st
with cf.ThreadPoolExecutor(8) as ex: res=list(ex.map(get,urls))
bad=[r for r in res if not(isinstance(r[1],int) and r[1]<400)]
now=datetime.date(2026,11,1)
def age(d):
  if not d: return 'unknown'
  y=int(d[:4]);m=int(d[5:7]) if len(d)>=7 else 7
  a=(now.year-y)+(now.month-m)/12
  return '<=5y' if a<=5 else '5-10y' if a<=10 else '10-15y' if a<=15 else '>15y'
print('entries checked:',n,'| missing/invalid citations:',len(E));[print('  ',e) for e in E[:20]]
print('citations:',len(C),'| unique URLs:',len(urls),'| URLs OK:',len(urls)-len(bad),'| failing:',len(bad));[print('  ',b) for b in bad]
print('tier distribution:',dict(sorted(collections.Counter(c['tier'] for c in C.values()).items())))
print('age distribution:',dict(collections.Counter(age(c.get('date')) for c in C.values())))
print('by type:',dict(collections.Counter(c['type'] for c in C.values())))

# cooking / prep
import json as _j, os as _o
_P=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','prep.json')))
_C=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','citations.json')))['citations']
_bad=[c for e in _P['effects'] for c in e['cites'] if c not in _C]+([] if 'usda-retn6' in _C else ['usda-retn6'])
_bad+=[e['id'] for e in _P['effects'] if not e.get('evidence')]
print('prep: foods',len(_P['prep']),'effects',len(_P['effects']),'missing',_bad)
_CE=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','cell.json')));_SP=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','spirit.json')))
_items=_CE['anti']+_CE['regen']+_CE['caution']+_CE['overlay']+[_CE['carotenoids'],_CE['notes']['orac'],_CE['notes']['fr'],_CE['anti_extra']['zn']]+_SP['findings']
_bad2=[str(x.get('k') or x.get('id') or x.get('title'))+':'+c for x in _items for c in (x.get('cites') or ['NONE']) if c not in _C]+[str(x.get('k') or x.get('title')) for x in _items if not (x.get('evidence') or '').strip()]
_CY=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','cycle.json')));_EX=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','exercise.json')))
_it2=_CY['phases']+_CY['redflags']+_CY['iron']+_CY['nutr']+[_CY['normal']]+_EX['nutrition']+[_EX['stretch']]+_EX['library']
_bad2+=[str(x.get('id') or x.get('k'))+':'+c for x in _it2 for c in (x.get('cites') or ['NONE']) if c not in _C]+[str(x.get('id')) for x in _it2 if 'library' not in str(x.get('cites')) and not (x.get('evidence') or x.get('compDesc') or '').strip()]
_bad2+=[k for k in ['medCites'] for c in _CY['links'][k] if c not in _C]+[c for k in ['screenCites','chdCites','pregCites'] for c in _EX['safety'][k] if c not in _C]+[c for c in _EX['guidelines']['cites'] if c not in _C]
_bad2+=[k for k,v in _EX['guidelines'].items() if k!='cites' and not v]+[k for k in ['screen','chd','preg'] if not _EX['safety'][k]]
_CA=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','cancer.json')));_it3=_CA['foods']+_CA['prep']+_CA['meds']
_bad2+=[x['id']+':'+c for x in _it3 for c in (x.get('cites') or ['NONE']) if c not in _C]+[x['id']+':no-quote' for x in _it3 if not (x.get('evidence') or x.get('wcrfq') or x.get('label') or x.get('note'))]+(['cancer:meaning'] if not _CA['meaning'].strip() else [])+(['cancer:dropped '+str(_CA['drop'])] if _CA['drop'] else [])
print('cancer-link entries:',len(_it3))
print('cycle+exercise entries:',len(_it2))
print('cellular+spiritual entries:',len(_items),'missing',_bad2)
_FAIL=bool(E or bad or _bad or _bad2)
# v19 sections: every object carrying 'cites' must reference known ids; every evidence entry must have cites; tier+date present
_V19=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','data','v19.json')));_b19=[];_n19=[0]
def _walk(x,p):
  if isinstance(x,dict):
    if 'cites' in x:
      _n19[0]+=1;cs=x['cites'] or []
      if not cs:_b19.append(p+':empty')
      for c in cs:
        if c not in _C:_b19.append(p+':'+c)
        elif _C[c].get('tier') is None or not (_C[c].get('date') or _C[c].get('retrieved')):_b19.append(p+':'+c+':no-tier/date')
    if 'evidence' in x and not x.get('cites'):_b19.append(p+':evidence-without-cites')
    for k,v in x.items():_walk(v,p+'.'+k)
  elif isinstance(x,list):
    for i,v in enumerate(x):_walk(v,p+'[%d]'%i)
_walk(_V19,'v19')
print('v19 cited entries:',_n19[0],'problems:',_b19[:20] or 'none')
sys.exit(1 if _FAIL or _b19 else 0)
