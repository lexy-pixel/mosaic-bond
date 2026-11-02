import json,re,pickle
from bs4 import BeautifulSoup
RET='2026-11-01'; OUT='nutribody/data/'
CIT=json.load(open('cit_stage2.json')); PARTS=pickle.load(open('parts.pkl','rb'))
nut=json.load(open(OUT+'nutrients.json'))['nutrients']; meds=json.load(open(OUT+'meds.json'))['meds']
def sents(t): return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z(])',t) if 25<len(s.strip())<600]
def page(f):
  s=BeautifulSoup(open('cond/%s.html'%f).read(),'lxml')
  for x in s(['nav','header','footer','script','style']): x.decompose()
  m=s.find('main') or s.body
  return re.sub(r'\s+',' ',m.get_text(' '))
def odstext(k):
  s=BeautifulSoup(open('ods/%s.html'%{v:k2 for k2,v in {'VitaminA':'vitA','Folate':'b9','Iron':'fe','Iodine':'iodine','Riboflavin':'b2','Magnesium':'mg','VitaminB12':'b12','Calcium':'ca','VitaminD':'vitD','Potassium':'k'}.items()}[k]).read(),'lxml')
  return re.sub(r'\s+',' ',s.get_text(' '))
C=[
('t2d','Type 2 diabetes','t2d','https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes','NIDDK','Healthy Living with Diabetes','2023-10',[('fiber','focus',r'fiber'),('na','limit',r'salt|sodium')]),
('htn','High blood pressure (hypertension)','htn','https://www.nhlbi.nih.gov/health/dash-eating-plan','NHLBI','DASH Eating Plan','2026-02-25',[('na','limit',r'2,300 milligrams|sodium'),('k','focus',r'potassium'),('mg','focus',r'magnesium'),('ca','focus',r'calcium'),('fiber','focus',r'fiber')]),
('ckd','Chronic kidney disease','ckd','https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease','NIDDK','Healthy Eating for Adults with Chronic Kidney Disease','2025-01',[('na','limit',r'sodium'),('k','limit',r'potassium'),('p','limit',r'phosphorus'),('protein','limit',r'protein')]),
('dialysis','Kidney failure on hemodialysis','dialysis','https://www.niddk.nih.gov/health-information/kidney-disease/kidney-failure/hemodialysis/eating-nutrition','NIDDK','Eating & Nutrition for Hemodialysis','2016-09',[('na','limit',r'sodium|salt'),('k','limit',r'potassium'),('p','limit',r'phosphorus'),('protein','focus',r'protein')]),
('hf','Heart failure','hf','https://www.nhlbi.nih.gov/health/heart-failure/treatment','NHLBI','Heart Failure: Treatment','2022-03-24',[('na','limit',r'sodium|salt')]),
('ida','Iron-deficiency anemia','ida','https://www.nhlbi.nih.gov/health/anemia/iron-deficiency-anemia','NHLBI','Iron-Deficiency Anemia','2022-03-24',[('fe','focus',r'iron'),('vitC','focus',r'vitamin C')]),
('pa','Pernicious anemia / B12 deficiency','pa','https://medlineplus.gov/ency/article/000569.htm','MedlinePlus (NLM)','Pernicious anemia','2026-01-29',[('b12','focus',r'B12')]),
('osteo','Osteoporosis','osteo','https://www.niams.nih.gov/health-topics/osteoporosis','NIAMS','Osteoporosis','2025-06-05',[('ca','focus',r'calcium'),('vitD','focus',r'vitamin D')]),
('hypothy','Hypothyroidism','hypothy','https://www.niddk.nih.gov/health-information/endocrine-diseases/hypothyroidism','NIDDK','Hypothyroidism (Underactive Thyroid)','2021-03',[('iodine','limit',r'iodine')]),
('celiac','Celiac disease','celiac','https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition','NIDDK','Eating, Diet, & Nutrition for Celiac Disease','2020-10',[('fe','focus',r'iron'),('ca','focus',r'calcium'),('vitD','focus',r'vitamin D'),('b9','focus',r'folate|folic'),('fiber','focus',r'fiber'),('b12','focus',r'B12')]),
('crohns','Crohn\'s disease (IBD)','crohns','https://www.niddk.nih.gov/health-information/digestive-diseases/crohns-disease/eating-diet-nutrition','NIDDK','Eating, Diet, & Nutrition for Crohn\'s Disease','2024-07',[('fiber','limit',r'fiber'),('b12','focus',r'B12'),('fe','focus',r'iron'),('ca','focus',r'calcium'),('vitD','focus',r'vitamin D')]),
('gout','Gout','gout','https://www.niams.nih.gov/health-topics/gout','NIAMS','Gout','2025-06-05',[('alcohol','limit',r'alcohol')]),
('gerd','GERD (acid reflux)','gerd','https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition','NIDDK','Eating, Diet, & Nutrition for GER & GERD','2020-07',[]),
('preg','Pregnancy','preg2','https://medlineplus.gov/pregnancyandnutrition.html','MedlinePlus (NLM)','Pregnancy and Nutrition','2024-04-30',[('b9','focus',r'folic acid|folate'),('fe','focus',r'iron'),('ca','focus',r'calcium'),('iodine','focus',r'iodine')]),
('masld','Fatty liver disease (NAFLD/MASLD)','masld','https://www.niddk.nih.gov/health-information/liver-disease/nafld-nash/eating-diet-nutrition','NIDDK','Eating, Diet, & Nutrition for NAFLD & NASH','2021-04',[('fiber','focus',r'fiber'),('alcohol','limit',r'alcohol')]),
('lipid','High blood cholesterol','lipid','https://www.nhlbi.nih.gov/health/blood-cholesterol/treatment','NHLBI','Blood Cholesterol: Treatment','2024-04-19',[('fiber','focus',r'fiber'),('omega3','focus',r'omega')]),
('migraine','Migraine','migraine','https://medlineplus.gov/migraine.html','MedlinePlus (NLM)','Migraine','2025-11-20',[]),
]
ODSX={'preg':[('b9','focus',r'neural tube'),('vitA','limit',r'(teratogen|birth defects)'),('iodine','focus',r'[Pp]regnan'),('fe','focus',r'[Pp]regnan')],'migraine':[('b2','focus',r'[Mm]igraine'),('mg','focus',r'[Mm]igraine')],'pa':[('b12','focus',r'[Pp]ernicious anemia')],'osteo':[('ca','focus',r'[Oo]steoporosis'),('vitD','focus',r'[Oo]steoporosis')],'hypothy':[('iodine','focus',r'[Hh]ypothyroidism')],'htn':[('k','focus',r'blood pressure')]}
out=[]
for cid,name,f,url,pub,title,date,rules in C:
  c=f'cond-{cid}'
  CIT[c]=dict(id=c,retrieved=RET,type='Government summary',publisher=pub,title=title,url=url,date=date,tier=2,tierRationale='Authoritative U.S. government health summary (NIH/NLM).')
  t=page(f); S=sents(t)
  R=[]
  for nk,typ,rx in rules:
    h=[s for s in S if re.search(rx,s,re.I)]
    if not h: print('drop',cid,nk); continue
    num=None
    m=re.search(r'([\d,]+)\s*(milligrams|mg)\b',h[0])
    if nk=='na' and typ=='limit':
      m=next((re.search(r'(2,300|1,500)\s*(milligrams|mg)',s) for s in h if re.search(r'(2,300|1,500)\s*(milligrams|mg)',s)),None)
      if m: num=int(m.group(1).replace(',','')); h=[s for s in h if m.group(0) in s]
    R.append({'nutrient':nk,'type':typ,'max':num,'evidence':h[0],'cites':[c]})
  for nk,typ,rx in ODSX.get(cid,[]):
    h=[s for s in sents(odstext(nk)) if re.search(rx,s)]
    if h: R.append({'nutrient':nk,'type':typ,'max':None,'evidence':h[0],'cites':[nut[nk]['odsCite']]})
    else: print('drop ods',cid,nk)
  parts=[]
  for pid,(sy,nm,rx) in PARTS.items():
    h=[s for s in S if re.search(rx,s,re.I)]
    if len(h)>=1: parts.append((len(h),{'part':pid,'evidence':h[0],'cites':[c]}))
  parts=[p for n,p in sorted(parts,key=lambda x:-x[0])[:4]]
  links=[]
  for m in meds:
    nm=m['id'].replace('_',' ')
    h=[s for s in S if re.search(r'\b'+nm+r'\b',s,re.I)]
    if h: links.append({'med':m['id'],'evidence':h[0],'cites':[c]})
  out.append({'id':cid,'name':name,'cite':c,'parts':parts,'rules':R,'medLinks':links})
  print(cid,[p['part'] for p in parts],[(r['nutrient'],r['type'],r['max']) for r in R],[l['med'] for l in links])
json.dump({'conditions':out,'note':'Condition-adjusted targets are general guidance that varies by individual. Follow your clinician or registered dietitian.'},open(OUT+'conditions.json','w'))
CIT['usda-fdc']=dict(id='usda-fdc',type='Government database',publisher='USDA Agricultural Research Service',title='FoodData Central, SR Legacy (April 2018) bulk CSV download',url='https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',date='2018-04',retrieved=RET,tier=1,tierRationale='Official U.S. government food composition database (public domain).')
json.dump({'citations':CIT},open(OUT+'citations.json','w'))
