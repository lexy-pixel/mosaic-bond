import csv,json,collections
D='sr/FoodData_Central_sr_legacy_food_csv_2018-04/'
N={'vitA':1106,'vitC':1162,'vitD':1114,'vitE':1109,'vitK':1185,'b1':1165,'b2':1166,'b3':1167,'b5':1170,'b6':1175,'b7':1176,'b9':1190,'b12':1178,'choline':1180,'ca':1087,'fe':1089,'mg':1090,'p':1091,'k':1092,'na':1093,'zn':1095,'cu':1098,'mn':1101,'se':1103,'iodine':1100,'fiber':1079,'kcal':1008,'protein':1003,'epa':1278,'dha':1272,'ala':1404}
nm={r['id']:r for r in csv.DictReader(open(D+'nutrient.csv'))}
for k,v in N.items(): print(k,nm[str(v)]['name'],nm[str(v)]['unit_name'])
foods={r['fdc_id']:r['description'] for r in csv.DictReader(open(D+'food.csv'))}
Q=open('foodq.txt').read().strip().split('\n')
pick={}
for q in Q:
  toks=[t.strip().lower() for t in q.split(',')]
  c=[(len(d),i,d) for i,d in foods.items() if all(t in d.lower() for t in toks) and d.lower().startswith(toks[0])]
  if not c: print('MISS',q); continue
  c.sort(); pick[c[0][1]]=c[0][2]
inv={str(v):k for k,v in N.items()}
nut=collections.defaultdict(dict)
for r in csv.DictReader(open(D+'food_nutrient.csv')):
  if r['fdc_id'] in pick and r['nutrient_id'] in inv: nut[r['fdc_id']][inv[r['nutrient_id']]]=float(r['amount'])
por=collections.defaultdict(list)
for r in csv.DictReader(open(D+'food_portion.csv')):
  if r['fdc_id'] in pick and r['gram_weight']: por[r['fdc_id']].append({'label':(r['amount']+' '+r['modifier']).strip(),'g':float(r['gram_weight'])})
out=[]
for i,d in pick.items():
  n=nut[i]; n['omega3']=round(n.pop('epa',0)+n.pop('dha',0)+n.pop('ala',0),3)
  out.append({'fdcId':int(i),'name':d,'per100g':n,'portions':por[i][:4]})
src={'name':'USDA FoodData Central, SR Legacy (April 2018 release)','url':'https://fdc.nal.usda.gov/download-datasets','license':'Public domain (CC0)','retrieved':'2026-11-01','note':'Values per 100 g. Item URL: https://fdc.nal.usda.gov/food-details/{fdcId}/nutrients. omega3 = ALA+EPA+DHA (g). Iodine mostly not reported in SR Legacy.'}
json.dump({'source':src,'foods':out},open('nutribody/data/foods.json','w'),separators=(',',':'))
print(len(out))
