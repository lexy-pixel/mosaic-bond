import json,re,glob,os,urllib.request,time
from bs4 import BeautifulSoup
RET='2026-11-01'
OUT='nutribody/data/'
ods=json.load(open('ods/ods.json'))
# ---------- body hierarchy
SYS={'skeletal':'Skeletal','muscular':'Muscular','nervous':'Nervous','cardio':'Cardiovascular / circulatory','respiratory':'Respiratory','digestive':'Digestive','immune':'Immune / lymphatic','endocrine':'Endocrine','urinary':'Urinary / renal','reproductive':'Reproductive','integumentary':'Integumentary'}
PARTS={'bones':('skeletal','Bones',r'\bbones?\b|skelet|osteopor|bone mineral'),'teeth':('skeletal','Teeth',r'\bteeth\b|dental|tooth'),
'muscles':('muscular','Skeletal muscle',r'\bmuscles?\b|muscular'),
'brain':('nervous','Brain',r'\bbrain\b|cognit|neurotransmitter|dementia'),'nerves':('nervous','Nerves & spinal cord',r'\bnerves?\b|neurolog|neuropath|spinal cord|nervous system'),'eyes':('nervous','Eyes',r'\bvision\b|\beyes?\b|retina|macular|night blindness'),
'heart':('cardio','Heart',r'\bheart\b|cardiac|cardiovascular disease|coronary'),'blood':('cardio','Blood',r'red blood cells?|hemoglobin|anemia|coagulation|clotting'),'vessels':('cardio','Blood vessels',r'blood pressure|hypertension|vascular|arter'),
'lungs':('respiratory','Lungs',r'\blungs?\b|respirat|pulmonary'),
'liver':('digestive','Liver',r'\bliver\b|hepat'),'stomach':('digestive','Stomach',r'\bstomach\b|gastric'),'gut':('digestive','Intestines',r'intestin|\bbowel|\bgut\b|colon|gastrointestinal'),
'immune':('immune','Immune system',r'immun|infection|wound healing'),
'thyroid':('endocrine','Thyroid',r'thyroid'),'pancreas':('endocrine','Pancreas (glucose)',r'insulin|glucose|diabet|pancrea'),
'kidneys':('urinary','Kidneys',r'kidney|renal'),
'reproductive':('reproductive','Reproductive organs',r'pregnan|fetal|fetus|fertility|reproduct|sperm|neural tube'),
'skin':('integumentary','Skin',r'\bskin\b|collagen|dermat'),'hair':('integumentary','Hair & nails',r'\bhair\b|\bnails\b')}
# ---------- citations registry
CIT={}
def cite(id,**kw):
  if id not in CIT: CIT[id]=dict(id=id,retrieved=RET,**kw)
  return id
def mdate(s):
  M='January February March April May June July August September October November December'.split()
  m=re.search(r'(%s) (\d{1,2}), (20\d\d)'%'|'.join(M),s)
  if m: return '%s-%02d-%02d'%(m.group(3),M.index(m.group(1))+1,int(m.group(2)))
  m=re.search(r'(%s) (20\d\d)'%'|'.join(M),s)
  if m: return '%s-%02d'%(m.group(2),M.index(m.group(1))+1)
  m=re.search(r'(20\d\d)-(\d\d)-(\d\d)',s)
  if m: return m.group(0)
  m=re.search(r'(\d{1,2})/(\d{1,2})/(20\d\d)',s)
  if m: return '%s-%02d-%02d'%(m.group(3),int(m.group(1)),int(m.group(2)))
  return None
def sents(t): return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z])',t) if len(s.strip())>30]
pmids=set()
# ---------- nutrients from ODS
NK={'VitaminA':'vitA','VitaminC':'vitC','VitaminD':'vitD','VitaminE':'vitE','VitaminK':'vitK','Thiamin':'b1','Riboflavin':'b2','Niacin':'b3','PantothenicAcid':'b5','VitaminB6':'b6','Biotin':'b7','Folate':'b9','VitaminB12':'b12','Choline':'choline','Calcium':'ca','Iron':'fe','Magnesium':'mg','Phosphorus':'p','Potassium':'k','Zinc':'zn','Copper':'cu','Manganese':'mn','Selenium':'se','Iodine':'iodine','Omega3FattyAcids':'omega3'}
odsdoc={}
nutrients={}
for f,k in NK.items():
  s=BeautifulSoup(open('ods/%s.html'%f).read(),'lxml')
  txt=s.get_text(' ')
  up=re.search(r'Updated:\s*([A-Za-z]+ \d+, \d{4})',re.sub(r'\s+',' ',txt))
  cid=cite('ods-'+k,type='Government summary',publisher='NIH Office of Dietary Supplements',title='%s: Fact Sheet for Health Professionals'%ods[f]['name'],url=ods[f]['url'],date=mdate(up.group(1)) if up else None,tier=2,tierRationale='Authoritative U.S. government evidence summary (NIH ODS) citing peer-reviewed literature.')
  refs={}
  for li in s.select('li[id^=en]'):
    a=li.find('a',href=re.compile(r'pubmed\.ncbi\.nlm\.nih\.gov/\d+'))
    if a: refs[li['id'][2:]]=(re.search(r'/(\d+)',a['href']).group(1),re.sub(r'\s*\[.*$','',li.get_text(' ',strip=True)))
  secs={};cur=None
  for el in s.find_all(['h2','h3','p','li']):
    if el.name in('h2','h3'):
      cur=el.get_text(' ',strip=True); secs.setdefault(cur,[]) ; continue
    if cur and el.name=='p': secs[cur].append(el.get_text(' ',strip=True))
  odsdoc[k]=(s,secs,refs,cid)
  def refcites(sent):
    out=[]
    for m in re.findall(r'\[([\d,\-\u2013\s]+)\]',sent):
      for p in re.split(r'[,]',m):
        p=re.split(r'[-\u2013]',p.strip())[0]
        if p in refs and len(out)<2:
          pm,t=refs[p]; pmids.add(pm); out.append(cite('pmid-'+pm,type='Journal article',publisher='PubMed',title=t,url='https://pubmed.ncbi.nlm.nih.gov/%s/'%pm,pmid=pm))
    return out
  intro=' '.join(secs.get('Introduction',[]))
  defi=' '.join(v for h,v2 in secs.items() for v in v2 if re.search(r'Deficiency',h) and not re.search('Medication|Excess|Toxic',h))
  maps=[]
  for pid,(sy,nm,rx) in PARTS.items():
    for src,w in ((intro,2),(defi,1)):
      hit=[x for x in sents(src) if re.search(rx,x,re.I)]
      if hit:
        maps.append({'part':pid,'weight':w,'evidence':hit[0][:600],'cites':[cid]+refcites(hit[0])});break
  isents=sents(intro)
  nutrients[k]={'name':ods[f]['name'],'mechanism':' '.join(isents[:2])[:700],'mechanismCites':[cid]+refcites(' '.join(isents[:2])),'map':maps,'odsCite':cid}
  odsdoc[k]=(s,secs,refs,cid,refcites)
# ---------- DRI table (adult). bands: 19-30,31-50,51-70,71+ ; values M/F ; P = pregnancy(19-50)
U={'vitA':'µg RAE','vitC':'mg','vitD':'µg','vitE':'mg','vitK':'µg','b1':'mg','b2':'mg','b3':'mg','b5':'mg','b6':'mg','b7':'µg','b9':'µg DFE','b12':'µg','choline':'mg','ca':'mg','fe':'mg','mg':'mg','p':'mg','k':'mg','na':'mg','zn':'mg','cu':'mg','mn':'mg','se':'µg','iodine':'µg','omega3':'g','fiber':'g'}
def b(m,f,p=None): return {'M':m,'F':f,'P':p}
DRI={'vitA':[b([900]*4,[700]*4,770),3000,'UL applies to preformed vitamin A (retinol) only; food totals here are RAE.'],
'vitC':[b([90]*4,[75]*4,85),2000,None],'vitD':[b([15,15,15,20],[15,15,15,20],15),100,None],'vitE':[b([15]*4,[15]*4,15),1000,'UL applies to supplemental alpha-tocopherol.'],
'vitK':[b([120]*4,[90]*4,90),None,None],'b1':[b([1.2]*4,[1.1]*4,1.4),None,None],'b2':[b([1.3]*4,[1.1]*4,1.4),None,None],
'b3':[b([16]*4,[14]*4,18),35,'UL applies to supplements/fortified foods.'],'b5':[b([5]*4,[5]*4,6),None,None],'b6':[b([1.3,1.3,1.7,1.7],[1.3,1.3,1.5,1.5],1.9),100,None],
'b7':[b([30]*4,[30]*4,30),None,None],'b9':[b([400]*4,[400]*4,600),1000,'UL applies to folic acid from supplements/fortified foods.'],'b12':[b([2.4]*4,[2.4]*4,2.6),None,None],
'choline':[b([550]*4,[425]*4,450),3500,None],'ca':[b([1000,1000,1000,1200],[1000,1000,1200,1200],1000),[2500,2500,2000,2000],None],
'fe':[b([8]*4,[18,18,8,8],27),45,None],'mg':[b([400,420,420,420],[310,320,320,320],350),350,'UL applies to supplemental magnesium only, not food.'],
'p':[b([700]*4,[700]*4,700),[4000,4000,4000,3000],None],'k':[b([3400]*4,[2600]*4,2900),None,None],'na':[b([1500]*4,[1500]*4,1500),2300,'2,300 mg is the Chronic Disease Risk Reduction intake (CDRR), not a UL.'],
'zn':[b([11]*4,[8]*4,11),40,None],'cu':[b([0.9]*4,[0.9]*4,1.0),10,None],'mn':[b([2.3]*4,[1.8]*4,2.0),11,None],'se':[b([55]*4,[55]*4,60),400,None],
'iodine':[b([150]*4,[150]*4,220),1100,None],'omega3':[b([1.6]*4,[1.1]*4,1.4),None,'AI is for ALA; food totals include ALA+EPA+DHA.'],'fiber':[b([38,38,30,30],[25,25,21,21],28),None,None]}
dricite=cite('nasem-dri',type='Guideline',publisher='National Academies (NASEM) via NCBI Bookshelf',title='Dietary Reference Intakes: summary tables (RDA/AI and UL)',url='https://www.ncbi.nlm.nih.gov/books/NBK545442/',date=None,tier=1,tierRationale='Official consensus reference values (Dietary Reference Intakes) from the National Academies.')
fibcite=cite('dga-2020',type='Guideline',publisher='USDA & HHS',title='Dietary Guidelines for Americans, 2020-2025 (Appendix 1 nutritional goals)',url='https://www.dietaryguidelines.gov/sites/default/files/2021-03/Dietary_Guidelines_for_Americans-2020-2025.pdf',date='2020-12',tier=1,tierRationale='Official U.S. federal dietary guideline.')
dri={}; verify=[]
for k,(rda,ul,note) in DRI.items():
  c=[dricite]+([odsdoc[k][3]] if k in odsdoc else [])
  if k=='fiber': c=[dricite,fibcite]
  if k=='na': c=[dricite,cite('nasem-na-k-2019',type='Guideline',publisher='National Academies',title='Dietary Reference Intakes for Sodium and Potassium (2019)',url='https://www.ncbi.nlm.nih.gov/books/NBK545442/',date='2019',tier=1,tierRationale='Official consensus reference values.')]
  dri[k]={'unit':U[k],'target':rda,'ul':ul,'ulNote':note,'cites':c}
  if k in odsdoc:
    t=re.sub(r'\s+',' ',odsdoc[k][0].get_text(' '))
    for v in set(rda['M']+rda['F']+[rda['P']]+(ul if isinstance(ul,list) else [ul] if ul else [])):
      vs=('%g'%v); vs2='{:,}'.format(v) if v>=1000 else vs
      if k=='cu': vs=vs2='%g'%(v*1000); vs2='{:,}'.format(int(v*1000))
      if not re.search(r'\b(%s|%s)\b'%(re.escape(vs),re.escape(vs2)),t): verify.append((k,v))
print('DRI values not found in ODS text:',verify)
# ---------- PubMed metadata
pl=sorted(pmids)
meta={}
for i in range(0,len(pl),150):
  u='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id='+','.join(pl[i:i+150])
  d=json.load(urllib.request.urlopen(u,timeout=60))['result']; meta.update({x:d[x] for x in d.get('uids',[])}); time.sleep(0.5)
for pm in pl:
  m=meta.get(pm,{}); pt=m.get('pubtype',[]); c=CIT['pmid-'+pm]
  y=re.search(r'(19|20)\d\d',m.get('pubdate','')); c['date']=y.group(0) if y else None
  c['pubTypes']=pt
  doi=[a['value'] for a in m.get('articleids',[]) if a['idtype']=='doi']
  if doi: c['doi']=doi[0]
  if m.get('title'): c['title']=m['title']+' '+m.get('source','')
  if any(x in pt for x in ['Systematic Review','Meta-Analysis','Practice Guideline','Guideline']): t,r=1,'PubMed type: '+', '.join(x for x in pt if x in['Systematic Review','Meta-Analysis','Practice Guideline','Guideline'])
  elif any(x in pt for x in ['Randomized Controlled Trial','Clinical Trial']): t,r=2,'PubMed type: '+[x for x in pt if 'Trial' in x][0]
  elif any(x in pt for x in ['Observational Study','Multicenter Study','Comparative Study','Twin Study']): t,r=3,'PubMed type: '+[x for x in pt if x in['Observational Study','Multicenter Study','Comparative Study','Twin Study']][0]
  elif any(x in pt for x in ['Case Reports','Review','Editorial','Comment','Letter']): t,r=4,'PubMed type: '+[x for x in pt if x in['Case Reports','Review','Editorial','Comment','Letter']][0]+' (narrative/case/opinion)'
  else: t,r=4,'PubMed lists only "%s"; study design not classified, so ranked conservatively as Tier 4.'%', '.join(pt)
  c['tier'],c['tierRationale']=t,r
json.dump({'systems':SYS,'parts':{k:{'system':v[0],'name':v[1]} for k,v in PARTS.items()}},open(OUT+'body.json','w'),indent=0)
json.dump({'nutrients':nutrients,'dri':dri},open(OUT+'nutrients.json','w'))
json.dump({'odsMeds':{k:[{'title':h,'text':' '.join(v)} for h,v in odsdoc[k][1].items() if h in [m['title'] for m in ods[f]['meds']]] for f,k in NK.items()}},open('odsmeds.json','w'))
json.dump(CIT,open('cit_stage1.json','w'))
import pickle; pickle.dump(PARTS,open('parts.pkl','wb'))
print(len(CIT),'cites')
for k,v in nutrients.items(): print(k,[m['part'] for m in v['map']])
