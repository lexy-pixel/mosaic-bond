import json,re
from bs4 import BeautifulSoup
names={'VitaminA':'Vitamin A','VitaminC':'Vitamin C','VitaminD':'Vitamin D','VitaminE':'Vitamin E','VitaminK':'Vitamin K','Thiamin':'Thiamin (B1)','Riboflavin':'Riboflavin (B2)','Niacin':'Niacin (B3)','PantothenicAcid':'Pantothenic acid (B5)','VitaminB6':'Vitamin B6','Biotin':'Biotin (B7)','Folate':'Folate (B9)','VitaminB12':'Vitamin B12','Choline':'Choline','Calcium':'Calcium','Iron':'Iron','Magnesium':'Magnesium','Phosphorus':'Phosphorus','Potassium':'Potassium','Zinc':'Zinc','Copper':'Copper','Manganese':'Manganese','Selenium':'Selenium','Iodine':'Iodine','Omega3FattyAcids':'Omega-3 fatty acids'}
out={}
def sect(s,title):
  h=[x for x in s.find_all('h2') if x.get_text(strip=True).startswith(title)]
  if not h: return []
  res=[];cur=None
  for el in h[0].find_all_next():
    if el.name=='h2': break
    if el.name=='h3': cur={'title':el.get_text(' ',strip=True),'text':''};res.append(cur)
    elif el.name=='p' and cur is not None and not cur['text']: cur['text']=el.get_text(' ',strip=True)
  return res
for k,n in names.items():
  s=BeautifulSoup(open(k+'.html').read(),'lxml')
  refs={}
  for li in s.select('li[id^=en]'):
    a=li.find('a',href=re.compile('pubmed'))
    refs[li['id'][2:]]={'text':re.sub(r'\s*\[.*$','',li.get_text(' ',strip=True)),'url':a['href'] if a else None}
  h=[x for x in s.find_all('h2') if x.get_text(strip=True)=='Introduction'][0]
  paras=[]
  for el in h.find_all_next():
    if el.name=='h2': break
    if el.name=='p' and el.get_text(strip=True): paras.append(el.get_text(' ',strip=True))
  intro=' '.join(paras[:2])
  nums=[]
  for m in re.findall(r'\[([\d,\-\s]+)\]',' '.join(paras)):
    for p in m.split(','):
      p=p.strip().split('-')[0]
      if p and p not in nums: nums.append(p)
  cites=[dict(refs[x],n=x) for x in nums if x in refs and refs[x]['url']][:2]
  out[k]={'name':n,'url':f'https://ods.od.nih.gov/factsheets/{k}-HealthProfessional/','intro':intro[:900],'pubmed':cites,'meds':sect(s,'Interactions with Medications')}
json.dump(out,open('ods.json','w'),indent=1)
for k,v in out.items(): print(k,len(v['pubmed']),[m['title'] for m in v['meds']])
