import json,re,pickle,glob
from bs4 import BeautifulSoup
RET='2026-11-01'; OUT='nutribody/data/'
CIT=json.load(open('cit_stage1.json')); PARTS=pickle.load(open('parts.pkl','rb'))
odsm=json.load(open('odsmeds.json'))['odsMeds']; nut=json.load(open(OUT+'nutrients.json'))
def cite(id,**kw):
  if id not in CIT: CIT[id]=dict(id=id,retrieved=RET,**kw)
  return id
def sents(t): return [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z(])',t) if 25<len(s.strip())<700]
EXTRA={'vessels':r'hypertension|blood pressure|angina','heart':r'heart failure|atrial fibrillation|myocardial|angina','brain':r'depress|seizure|epilep|bipolar|mania|parkinson|anxiety|panic|obsessive','blood':r'thrombo|embol|anticoag|stroke|cholesterol|LDL|lipid','pancreas':r'diabetes|glycemic','thyroid':r'hypothyroid|thyroid','bones':r'osteopor|bone','stomach':r'ulcer|gastroesophageal|GERD|heartburn|erosive esophagitis','immune':r'infection|bacteri|tuberculosis|inflammat|rheumatoid|psoria|lupus|transplant','kidneys':r'edema|renal|kidney','reproductive':r'contracept|pregnan','lungs':r'asthma|COPD|pulmonary|respiratory|pneumonia','gut':r'inflammatory bowel|colitis|Crohn','skin':r'psoria|dermat|acne|skin','muscles':r'muscle','liver':r'hepat|liver'}
FOODCAT={'grapefruit':r'grapefruit','vitaminK':r'vitamin K','tyramine':r'\btyramine','potassium':r'potassium[- ]?(rich|containing|supplement)|salt substitutes?|high[- ]potassium|potassium supplements','minerals':r'\b(calcium|iron|magnesium|zinc|aluminum|antacids?|multivalent|dairy|milk)\b','alcohol':r'alcohol','caffeine':r'caffeine|coffee','food':r'\b(food|meal|fiber|empty stomach)\b','sodium':r'\bsodium intake|salt intake|low[- ]salt|dietary sodium|\bsalt\b'}
CLASS={'omeprazole':r'proton pump|gastric acid|acid-suppress','pantoprazole':r'proton pump|gastric acid|acid-suppress','famotidine':r'H2|histamine|gastric acid|acid-suppress','furosemide':r'loop|furosemide|\bdiuretics\b','hydrochlorothiazide':r'thiazide|\bdiuretics\b','spironolactone':r'potassium-sparing','lisinopril':r'angiotensin','enalapril':r'angiotensin','losartan':r'angiotensin receptor|ARB','atorvastatin':r'statin','simvastatin':r'statin','rosuvastatin':r'statin','alendronate':r'bisphosphonate','risedronate':r'bisphosphonate','doxycycline':r'tetracycline','tetracycline':r'tetracycline','ciprofloxacin':r'quinolone','levofloxacin':r'quinolone','phenytoin':r'anticonvulsant|antiepileptic','carbamazepine':r'anticonvulsant|antiepileptic','prednisone':r'steroid|corticosteroid','warfarin':r'warfarin|anticoagulant','apixaban':r'anticoagulant','clopidogrel':r'antiplatelet','ethinyl_estradiol':r'contracept'}
ndict={v['name'].lower():k for k,v in nut['nutrients'].items()}
meds=[]
for f in sorted(glob.glob('meds/*.json')):
  g=f.split('/')[-1][:-5]; d=json.load(open(f)).get('results',[])
  if not d: print('no label',g); continue
  # prefer label with drug_interactions
  d.sort(key=lambda r:-len(' '.join(r.get('drug_interactions',[])+r.get('information_for_patients',[])+r.get('patient_counseling_information',[]))))
  L=d[0]; sid=L['set_id']; et=L.get('effective_time','')
  brand=(L.get('openfda',{}).get('brand_name') or [''])[0]
  cid=cite('dm-'+sid,type='FDA drug label',publisher='FDA labeling via DailyMed (openFDA)',title='%s (%s) prescribing information'%(g.replace('_',' '),brand),url='https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid='+sid,date='%s-%s-%s'%(et[:4],et[4:6],et[6:8]) if len(et)==8 else None,tier=1,tierRationale='FDA-approved drug labeling.')
  ind=' '.join(L.get('indications_and_usage',[]))
  parts=[]
  for pid in PARTS:
    rx=PARTS[pid][2]+('|'+EXTRA[pid] if pid in EXTRA else '')
    h=[s for s in sents(ind) if re.search(rx,s,re.I)]
    if h: parts.append({'part':pid,'evidence':h[0][:400],'cites':[cid]})
  txt=' '.join(sum([L.get(x,[]) for x in ['drug_interactions','information_for_patients','patient_counseling_information','dosage_and_administration','warnings_and_cautions','warnings','precautions','clinical_pharmacology','contraindications','spl_unclassified_section','boxed_warning','overdosage']],[]))
  inter=[];seen=set()
  for cat,rx in FOODCAT.items():
    for s in sents(txt):
      if re.search(rx,s,re.I) and (cat!='minerals' or re.search(r'absor|chelat|\bbind|hours (before|after)|interfer|decreas|reduc',s,re.I)) and (cat!='food' or re.search(r'with food|without food|empty stomach|meal|fiber|absorption',s,re.I)) and s not in seen:
        seen.add(s); inter.append({'category':cat,'text':s[:500],'cites':[cid]}); break
  dep=[]
  for nk,secs in odsm.items():
    for sc in secs:
      alias=CLASS.get(g,'^$')
      t=sc['title']+' '+sc['text']
      if re.search(r'\b'+g.replace('_',' ')+r'\b',t,re.I) or re.search(alias,sc['title'],re.I):
        ss=sents(sc['text']); (nk,sc['title']) in [(x['nutrient'],x['title']) for x in dep] or dep.append({'nutrient':nk,'title':sc['title'],'text':' '.join(ss[:2])[:600],'cites':[nut['nutrients'][nk]['odsCite']]})
  meds.append({'id':g,'name':g.replace('_',' ').title(),'brand':brand,'label':cid,'parts':parts,'interactions':inter,'odsInteractions':dep})
  print(g,[p['part'] for p in parts],[i['category'] for i in inter],[x['nutrient'] for x in dep])
# FDA grapefruit consumer page
gh=BeautifulSoup(open('cond/grapefruit.html').read(),'lxml').get_text(' ')
gc=cite('fda-grapefruit',type='Government guidance',publisher='U.S. FDA',title='Grapefruit Juice and Some Drugs Don\'t Mix (Consumer Update)',url='https://www.fda.gov/consumers/consumer-updates/grapefruit-juice-and-some-drugs-dont-mix',date='2021-07-01',tier=2,tierRationale='Authoritative government consumer summary.')
gs=[s for s in sents(re.sub(r'\s+',' ',gh)) if re.search('statin|blood pressure|grapefruit juice',s)][:1]
fdaNote={'text':gs[0] if gs else '','cites':[gc]}
json.dump({'meds':meds,'grapefruitNote':fdaNote},open(OUT+'meds.json','w'))
json.dump(CIT,open('cit_stage2.json','w'))
