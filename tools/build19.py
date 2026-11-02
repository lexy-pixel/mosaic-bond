"""v19: builds data/v19.json (activity, sleep, recovery, muscle recovery, hydration, supplements, labs, mood, caffeine/alcohol) and adds citations. Quotes were copied from sources fetched 2026-11-01 (see /workspace/cit19)."""
import json
D='data/';C=json.load(open(D+'citations.json'))
R='2026-11-01'
def pm(pmid,title,journal,date,tier,rat):return dict(id='pmid-'+pmid,retrieved=R,type='Peer-reviewed',publisher=journal,title=title,url=f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/',date=date,tier=tier,tierRationale=rat,pmid=pmid)
def web(i,pub,title,url,date,tier,typ,rat):return dict(id=i,retrieved=R,type=typ,publisher=pub,title=title,url=url,date=date,tier=tier,tierRationale=rat)
GOV='Authoritative U.S. government or professional-body guidance.'
new=[pm('35247352','Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts','Lancet Public Health','2022-03',1,'Meta-analysis of prospective cohorts (observational).'),
pm('26039963','Recommended Amount of Sleep for a Healthy Adult: A Joint Consensus Statement of the AASM and Sleep Research Society','J Clin Sleep Med','2015-06',2,'Professional-society consensus statement (modified RAND Delphi).'),
pm('27250809','Consensus Statement of the American Academy of Sleep Medicine on the Recommended Amount of Sleep for Healthy Children','J Clin Sleep Med','2016-11',2,'Professional-society consensus statement, endorsed by AAP.'),
pm('29073412',"National Sleep Foundation's updated sleep duration recommendations: final report",'Sleep Health','2015-12',3,'Expert-panel recommendations (secondary to AASM/SRS here).'),
pm('24235903','Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed','J Clin Sleep Med','2013-11',2,'Randomized, placebo-controlled crossover trial (small).'),
pm('23347102','Alcohol and sleep I: effects on normal sleep','Alcohol Clin Exp Res','2013-04',1,'Systematic review.'),
pm('33865376','Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis','BMC Complement Med Ther','2021-04',1,'Systematic review/meta-analysis; authors rate evidence low to very low.'),
pm('19204579','American College of Sports Medicine position stand. Progression models in resistance training for healthy adults','Med Sci Sports Exerc','2009-03',2,'Professional-society position stand.'),
pm('25352440','Contraction induced muscle injury: towards personalized training and recovery programs','Ann Biomed Eng','2015-02',3,'Narrative review.'),
pm('12617692','Delayed onset muscle soreness: treatment strategies and performance factors','Sports Med','2003-02',3,'Narrative review.'),
pm('14583691','The Patient Health Questionnaire-2: validity of a two-item depression screener','Med Care','2003-11',2,'Validation study of a public-domain screener.'),
pm('17339617','Anxiety disorders in primary care: prevalence, impairment, comorbidity, and detection','Ann Intern Med','2007-03',2,'Validation study (GAD-7/GAD-2).'),
pm('18094346','Timing of blood pressure measurement related to caffeine consumption','Ann Pharmacother','2008-01',3,'Review (pharmacokinetic background).'),
pm('29514871','Interindividual Differences in Caffeine Metabolism and Factors Driving Caffeine Consumption','Pharmacol Rev','2018-04',3,'Narrative review.'),
web('nhlbi-sleephab','NHLBI (NIH)','Sleep Deprivation and Deficiency: Healthy Sleep Habits','https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits','2022-03',2,'Government health information',GOV),
web('nhlbi-apnea','NHLBI (NIH)','Sleep Apnea: Symptoms','https://www.nhlbi.nih.gov/health/sleep-apnea/symptoms','2022-03',2,'Government health information',GOV),
web('nasem-water','National Academies Press','Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate — Ch. 4 Water','https://nap.nationalacademies.org/read/10925/chapter/6','2005',2,'Consensus report (DRI)','Authoritative consensus report (National Academies DRI).'),
web('fda-suppqa','U.S. FDA','Questions and Answers on Dietary Supplements','https://www.fda.gov/food/information-consumers-using-dietary-supplements/questions-and-answers-dietary-supplements','2024-02',2,'Government guidance',GOV),
web('ods-wyntk','NIH Office of Dietary Supplements','Dietary Supplements: What You Need to Know','https://ods.od.nih.gov/factsheets/WYNTK-Consumer/','2023-01',2,'Government consumer fact sheet',GOV),
web('nccih-sjw','NCCIH (NIH)',"St. John's Wort",'https://www.nccih.nih.gov/health/st-johns-wort','2020-10',2,'Government health information',GOV),
web('fda-caffeine','U.S. FDA',"Spilling the Beans: How Much Caffeine Is Too Much?",'https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much','2024-08',2,'Government consumer update',GOV),
web('acog-caffeine','ACOG','Moderate Caffeine Consumption During Pregnancy (Committee Opinion 462)','https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2010/08/moderate-caffeine-consumption-during-pregnancy','2010-08',2,'Professional committee opinion','Professional-society committee opinion (reaffirmed).'),
web('niaaa-std','NIAAA (NIH)','What Is A Standard Drink?','https://www.niaaa.nih.gov/alcohols-effects-health/what-standard-drink','2024',2,'Government health information',GOV),
web('ml-labranges','MedlinePlus (NLM)','How to Understand Your Lab Results','https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/','2024',2,'Government health information',GOV),
web('ada-dx','American Diabetes Association','Diagnosis','https://diabetes.org/about-diabetes/diagnosis','2024',2,'Professional-body patient guidance','Professional body (ADA) summary of its Standards of Care criteria.'),
web('ml-lipids','MedlinePlus (NLM)','Cholesterol Levels','https://medlineplus.gov/lab-tests/cholesterol-levels/','2024',2,'Government health information',GOV),
web('lifeline-988','988 Suicide & Crisis Lifeline','988 Lifeline','https://988lifeline.org/','2026',2,'Crisis service','Official U.S. national crisis line.'),
web('phq-site','Pfizer / phqscreeners.com','Patient Health Questionnaire (PHQ) Screeners','https://www.phqscreeners.com/','2026',3,'Instrument distributor','Official distribution site for the PHQ/GAD instruments.'),
]
for p,t in [('ml-ferritin','Ferritin Blood Test'),('ml-hgb','Hemoglobin Test'),('ml-vitd','Vitamin D Test'),('ml-b12','Vitamin B Test'),('ml-mg','Magnesium Blood Test'),('ml-tsh','TSH (Thyroid-stimulating hormone) Test'),('ml-a1c','Hemoglobin A1C (HbA1c) Test'),('ml-glu','Blood Glucose Test'),('ml-cmp','Comprehensive Metabolic Panel (CMP)'),('ml-folate','Folic Acid Test'),('ml-sodium','Sodium Blood Test'),('ml-potass','Potassium Blood Test')]:
  slug={'ml-ferritin':'ferritin-blood-test','ml-hgb':'hemoglobin-test','ml-vitd':'vitamin-d-test','ml-b12':'vitamin-b-test','ml-mg':'magnesium-blood-test','ml-tsh':'tsh-thyroid-stimulating-hormone-test','ml-a1c':'hemoglobin-a1c-hba1c-test','ml-glu':'blood-glucose-test','ml-cmp':'comprehensive-metabolic-panel-cmp','ml-folate':'folic-acid-test','ml-sodium':'sodium-blood-test','ml-potass':'potassium-blood-test'}[p]
  new.append(web(p,'MedlinePlus (NLM)',t,f'https://medlineplus.gov/lab-tests/{slug}/','2024',2,'Government health information',GOV))
for c in new:C['citations'][c['id']]=c
json.dump(C,open(D+'citations.json','w'),ensure_ascii=False,indent=0)
E=lambda ev,*c:{'evidence':ev,'cites':list(c)}
V={
'activity':{
 'steps':E('Restricted cubic splines showed progressively decreasing risk of mortality among adults aged 60 years and older with increasing number of steps per day until 6000-8000 steps per day and among adults younger than 60 years until 8000-10 000 steps per day.','pmid-35247352'),
 'stepsMore':E('Taking more steps per day was associated with a progressively lower risk of all-cause mortality, up to a level that varied by age.','pmid-35247352'),
 'note':'Observational data: associations, not proof that steps cause the benefit. There is no single magic number; 10,000 is not a sourced threshold.',
},
'sleep':{
 'adult':E('Adults should sleep 7 or more hours per night on a regular basis to promote optimal health.','pmid-26039963'),
 'adultMore':E('Sleeping more than 9 hours per night on a regular basis may be appropriate for young adults, individuals recovering from sleep debt, and individuals with illnesses.','pmid-26039963'),
 'kids':[{'age':[0.33,1],'lo':12,'hi':16,'ev':'Infants 4 months to 12 months should sleep 12 to 16 hours per 24 hours (including naps) on a regular basis to promote optimal health.'},
   {'age':[1,3],'lo':11,'hi':14,'ev':'Children 1 to 2 years of age should sleep 11 to 14 hours per 24 hours (including naps) on a regular basis to promote optimal health.'},
   {'age':[3,6],'lo':10,'hi':13,'ev':'Children 3 to 5 years of age should sleep 10 to 13 hours per 24 hours (including naps) on a regular basis to promote optimal health.'},
   {'age':[6,13],'lo':9,'hi':12,'ev':'Children 6 to 12 years of age should sleep 9 to 12 hours per 24 hours on a regular basis to promote optimal health.'},
   {'age':[13,19],'lo':8,'hi':10,'ev':'Teenagers 13 to 18 years of age should sleep 8 to 10 hours per 24 hours on a regular basis to promote optimal health.'}],
 'kidsCites':['pmid-27250809'],
 'nsf':E('For teenagers, 8 to 10 hours was considered appropriate, 7 to 9 hours for young adults and adults, and 7 to 8 hours of sleep for older adults.','pmid-29073412'),
 'links':[
  dict(id='caffeine',title='Caffeine',**E('caffeine taken 6 hours before bedtime has important disruptive effects on sleep and provides empirical support for sleep hygiene recommendations to refrain from substantial caffeine use for a minimum of 6 hours prior to bedtime.','pmid-24235903')),
  dict(id='alcohol',title='Alcohol',**E('At all dosages, alcohol causes a reduction in sleep onset latency, a more consolidated first half sleep and an increase in sleep disruption in the second half of sleep.','pmid-23347102')),
  dict(id='magnesium',title='Magnesium (weak evidence)',**E('All trials were at moderate-to-high risk of bias and outcomes were supported by low to very low quality of evidence.','pmid-33865376'))],
 'hygiene':[E('Go to bed and wake up at the same time every day.','nhlbi-sleephab'),E('Avoid nicotine (for example, cigarettes) and caffeine (including caffeinated soda, coffee, tea, and chocolate). Nicotine and caffeine are stimulants, and both substances can interfere with sleep. The effects of caffeine can last up to 8 hours.','nhlbi-sleephab'),E('Keep your bedroom quiet, cool, and dark (a dim night light is fine, if needed).','nhlbi-sleephab')],
 'shift':E("If you're a shift worker, you may find it helpful to: Take naps and raise the amount of time available for sleep; Keep the lights bright at work; Limit shift changes so your body clock can adjust; Limit caffeine use to the first part of your shift; Remove sound and light distractions in your bedroom during daytime sleep (for example, use light-blocking curtains). If you're still not able to fall asleep during the day or have problems adapting to a shift-work schedule, talk with your doctor about other options to help you sleep.",'nhlbi-sleephab'),
 'apnea':E('While asleep, you may have these symptoms of sleep apnea: Breathing that starts and stops; Frequent loud snoring; Gasping for air. … Daytime sleepiness and tiredness, which can lead to problems with learning, focusing, and reacting. … Talk to your healthcare provider about your symptoms. You may need a sleep study to help diagnose the condition.','nhlbi-apnea'),
 'parts':['brain','nerves','glands','thyroid'],
},
'recovery':{
 'freq':E('The recommendation for training frequency is 2-3 d x wk(-1) for novice training, 3-4 d x wk(-1) for intermediate training, and 4-5 d x wk(-1) for advanced training.','pmid-19204579'),
 'doms':E('Subjects that experience contraction induced injury report on soreness that usually increases in intensity in the first 24 h after the activity, peaks from 24 to 72 h, and then subsides and disappears in a few days.','pmid-25352440'),
 'ecc':E('Eccentric activities induce micro-injury at a greater frequency and severity than other types of muscle actions. The intensity and duration of exercise are also important factors in DOMS onset.','pmid-12617692'),
 'protein':E('For building muscle mass and for maintaining muscle mass through a positive muscle protein balance, an overall daily protein intake in the range of 1.4-2.0 g protein/kg body weight/day (g/kg/d) is sufficient for most exercising individuals','pmid-28642676'),
 'timing':E('The optimal time period during which to ingest protein is likely a matter of individual tolerance, since benefits are derived from pre- or post-workout ingestion; however, the anabolic effect of exercise is long-lasting (at least 24 h), but likely diminishes with increasing time post-exercise.','pmid-28642676'),
 'fluid':E('Individual sweat rates can be estimated by measuring body weight before and after exercise. … After exercise, the goal is to replace any fluid electrolyte deficit.','pmid-17277604'),
 'scoreNote':'This check-in is a simple, transparent summary of what you logged. It is not a validated score and not a measurement of your body.',
},
'hydration':{
 'ai':E('The AI for total water intake for young men and women (19 to 30 years) is 3.7 L (131 oz) and 2.7 L (95 oz)/day, respectively','nasem-water'),
 'food':E('approximately 20 percent of water comes from food, and the remaining 80 percent comes from fluids.','nasem-water'),
 'exercise':E('Because there is considerable variability in sweating rates and sweat electrolyte content between individuals, customized fluid replacement programs are recommended. Individual sweat rates can be estimated by measuring body weight before and after exercise.','pmid-17277604'),
 'toxic':E('acute water toxicity has been reported due to rapid consumption of large quantities of fluids that greatly exceeded the kidney’s maximal excretion rate of approximately 0.7 to 1.0 L/hour.','nasem-water'),
 'hypo':E('Water intoxication can lead to hyponatremia, which can be life threatening.','nasem-water'),
 'exhypo':E('if excessive overconsumption occurs with prolonged stressful exercise, hyponatremia may develop.','nasem-water'),
 'parts':['kidneys','bladder'],
},
'supplements':{
 'fda':E('Under DSHEA, FDA does not have the authority to approve dietary supplements before they are marketed.','fda-suppqa'),
 'seal':E('Several independent organizations offer quality testing and allow products that pass these tests to display a seal of quality assurance that indicates the product was properly manufactured, contains the ingredients listed on the label, and does not contain harmful levels of contaminants. These seals do not guarantee that a product is safe or effective. Organizations that offer quality testing include: ConsumerLab.com, NSF International, U.S. Pharmacopeia','ods-wyntk'),
 'interact':E('Supplements can also interact with some medicines in ways that might cause problems.','ods-wyntk'),
 'rules':[
  dict(nutrient='vitK',med='warfarin',**E('Warfarin (Coumadin) and some other anticoagulant medications antagonize the activity of vitamin K and, in turn, prothrombin [ 8 ]. For this reason, individuals who are taking these anticoagulants need to maintain consistent vitamin K intakes.','ods-vitK')),
  dict(nutrient='ca',med='levothyroxine',**E('Calcium carbonate supplements can interfere with the absorption of levothyroxine (Synthroid, Levoxyl, and others), a thyroid hormone used to treat hypothyroidism and thyroid cancer','ods-ca')),
  dict(nutrient='fe',med='levothyroxine',**E('The simultaneous ingestion of iron and levothyroxine can result in clinically significant reductions in levothyroxine efficacy in some patients','ods-fe')),
  dict(nutrient='zn',med='ciprofloxacin',**E('Both quinolone antibiotics (such as Cipro) and tetracycline antibiotics (such as Achromycin and Sumycin) might interact with zinc in the gastrointestinal tract, which could inhibit the absorption of both zinc and the antibiotic if they are taken at the same time','ods-zn')),
  dict(nutrient='zn',med='tetracycline',**E('Both quinolone antibiotics (such as Cipro) and tetracycline antibiotics (such as Achromycin and Sumycin) might interact with zinc in the gastrointestinal tract, which could inhibit the absorption of both zinc and the antibiotic if they are taken at the same time','ods-zn')),
  dict(herb='sjw',med='*',**E('St. John’s wort can interact in dangerous, sometimes life-threatening ways with a variety of medicines.','nccih-sjw'))],
},
'labs':{
 'vary':E('You can\'t compare test results from different labs. If you\'re looking for trends in your test results over time, it\'s important to try to use the same lab for testing.','ml-labranges'),
 'analytes':[
  dict(id='ferritin',name='Ferritin',syn=['ferritin','ferritin, serum','serum ferritin','ferr'],units={'ng/mL':1,'µg/L':1},parts=['blood','liver'],nut=['fe'],cites=['ml-ferritin','ods-fe']),
  dict(id='hgb',name='Hemoglobin',syn=['hemoglobin','haemoglobin','hgb','hb'],units={'g/dL':1,'g/L':10,'mmol/L':0.6206},parts=['blood'],nut=['fe','b12','b9'],cites=['ml-hgb'],ref=dict(kind='low',lo=12,unit='g/dL',minAge=10,**E('Hemoglobin concentrations lower than 11 g/deciliter (dL) in children under 10 years of age, or lower than 12 g/dL in individuals age 10 years or older, suggest IDA','ods-fe'))),
  dict(id='vitd',name='Vitamin D, 25-hydroxy',syn=['vitamin d, 25-hydroxy','25-hydroxyvitamin d','25-oh vitamin d','vit d 25-oh','vitamin d 25-oh','25(oh)d','vitamin d','vit d'],units={'ng/mL':1,'nmol/L':2.496},parts=['bones','immune'],nut=['vitD'],cites=['ml-vitd','ods-vitD'],ref=dict(kind='band',bands=[[0,12,'Risk of deficiency (<12 ng/mL)'],[12,20,'Between deficiency-risk and sufficiency cut-offs'],[20,50,'Sufficient for most people (≥20 ng/mL)'],[50,1e9,'Above 50 ng/mL: can be associated with adverse effects']],unit='ng/mL',**E('levels of 50 nmol/L (20 ng/mL) or more are sufficient for most people, and that the risk of deficiency increases at serum concentrations of less than 30 nmol/L (12 ng/mL). … serum concentrations greater than 125 nmol/L (50 ng/mL) can be associated with adverse effects','ods-vitD'))),
  dict(id='b12',name='Vitamin B12',syn=['vitamin b12','b12','cobalamin','vit b12'],units={'pg/mL':1,'pmol/L':0.7378},parts=['nerves','blood'],nut=['b12'],cites=['ml-b12','ods-b12'],ref=dict(kind='low',lo=200,unit='pg/mL',**E('values lower than 200 or 250 pg/mL generally being considered subnormal','ods-b12'))),
  dict(id='folate',name='Folate, serum',syn=['folate','folate, serum','folic acid','serum folate'],units={'ng/mL':1,'nmol/L':2.266},parts=['blood'],nut=['b9'],cites=['ml-folate','ods-b9'],ref=dict(kind='low',lo=3,unit='ng/mL',**E('Serum folate concentrations are commonly used to assess folate status; a value above 3 ng/mL indicates adequacy','ods-b9'))),
  dict(id='mg',name='Magnesium, serum',syn=['magnesium','mg','magnesium, serum','mag'],units={'mg/dL':1,'mmol/L':0.4114,'mEq/L':0.8229},parts=['muscles','nerves','heart'],nut=['mg'],cites=['ml-mg','ods-mg']),
  dict(id='tsh',name='TSH',syn=['tsh','thyroid stimulating hormone','thyrotropin'],units={'mIU/L':1,'µIU/mL':1,'uIU/mL':1},parts=['thyroid','glands'],nut=['iodine'],cites=['ml-tsh']),
  dict(id='a1c',name='Hemoglobin A1c',syn=['hemoglobin a1c','hba1c','a1c','glycohemoglobin','glycated hemoglobin'],units={'%':1,'mmol/mol':'ifcc'},parts=['pancreas','blood'],nut=[],cites=['ml-a1c','ada-dx'],ref=dict(kind='band',bands=[[0,5.7,'Normal (<5.7%)'],[5.7,6.5,'Prediabetes range (5.7–6.4%)'],[6.5,100,'Diabetes range (≥6.5%) — diagnosis needs a clinician']],unit='%',**E('Result A1C Normal less than 5.7% Prediabetes 5.7% to 6.4% Diabetes 6.5% or higher','ada-dx'))),
  dict(id='glu',name='Glucose, fasting',syn=['glucose','glucose, fasting','fasting glucose','glu','fbg','glucose, serum'],units={'mg/dL':1,'mmol/L':0.05551},parts=['pancreas'],nut=[],cites=['ml-glu','ada-dx'],ref=dict(kind='band',bands=[[0,100,'Normal fasting (<100 mg/dL)'],[100,126,'Prediabetes range (100–125 mg/dL)'],[126,1e9,'Diabetes range (≥126 mg/dL) — diagnosis needs a clinician']],unit='mg/dL',fasting=True,**E('Result Fasting Plasma Glucose (FPG) Normal less than 100 mg/dL Prediabetes 100 mg/dl … Diabetes is diagnosed at fasting blood glucose of greater than or equal to 126 mg/dl','ada-dx'))),
  dict(id='tc',name='Cholesterol, total',syn=['cholesterol, total','total cholesterol','cholesterol','chol'],units={'mg/dL':1,'mmol/L':0.02586},parts=['heart','vessels'],nut=['fiber'],cites=['ml-lipids'],ref=dict(kind='high',hi=200,unit='mg/dL',minAge=20,**E('Total Cholesterol Less than 200 mg/dL','ml-lipids'))),
  dict(id='ldl',name='LDL cholesterol',syn=['ldl','ldl cholesterol','ldl-c','ldl chol calc','ldl, calculated'],units={'mg/dL':1,'mmol/L':0.02586},parts=['heart','vessels'],nut=['fiber'],cites=['ml-lipids'],ref=dict(kind='high',hi=100,unit='mg/dL',minAge=20,**E('LDL Less than 100 mg/dL','ml-lipids'))),
  dict(id='hdl',name='HDL cholesterol',syn=['hdl','hdl cholesterol','hdl-c'],units={'mg/dL':1,'mmol/L':0.02586},parts=['heart','vessels'],nut=[],cites=['ml-lipids'],ref=dict(kind='low',lo={'M':40,'F':50},unit='mg/dL',minAge=20,**E('HDL Greater than or equal to 60 mg/dL is best. Levels less than 40 mg/dL are considered low. [men] … Levels less than 50 mg/dL are considered low. [women]','ml-lipids'))),
  dict(id='tg',name='Triglycerides',syn=['triglycerides','trig','tg','triglyceride'],units={'mg/dL':1,'mmol/L':0.01129},parts=['heart','vessels'],nut=[],cites=['ml-lipids']),
  dict(id='na',name='Sodium',syn=['sodium','na'],units={'mmol/L':1,'mEq/L':1},parts=['kidneys'],nut=['na'],cites=['ml-sodium','ml-cmp'],ref=dict(kind='low',lo=135,unit='mmol/L',**E('Hyponatremia is defined by a serum sodium level of less than 135 mmol/L, but symptoms are usually not apparent unless the serum sodium level is less than 130 mmol/L.','nasem-water'))),
  dict(id='k',name='Potassium',syn=['potassium','k'],units={'mmol/L':1,'mEq/L':1},parts=['kidneys','heart'],nut=['k'],cites=['ml-potass','ml-cmp']),
  dict(id='cl',name='Chloride',syn=['chloride','cl'],units={'mmol/L':1,'mEq/L':1},parts=['kidneys'],nut=[],cites=['ml-cmp']),
  dict(id='co2',name='CO2 (bicarbonate)',syn=['co2','carbon dioxide','bicarbonate','hco3','total co2'],units={'mmol/L':1,'mEq/L':1},parts=['kidneys','lungs'],nut=[],cites=['ml-cmp']),
  dict(id='bun',name='BUN',syn=['bun','urea nitrogen','blood urea nitrogen'],units={'mg/dL':1,'mmol/L':0.357},parts=['kidneys'],nut=['protein'],cites=['ml-cmp']),
  dict(id='creat',name='Creatinine',syn=['creatinine','creat','cr'],units={'mg/dL':1,'µmol/L':88.42,'umol/L':88.42},parts=['kidneys'],nut=[],cites=['ml-cmp']),
  dict(id='ca',name='Calcium, serum',syn=['calcium','ca','calcium, serum'],units={'mg/dL':1,'mmol/L':0.2495},parts=['bones'],nut=['ca','vitD'],cites=['ml-cmp','ods-ca']),
  dict(id='alb',name='Albumin',syn=['albumin','alb'],units={'g/dL':1,'g/L':10},parts=['liver'],nut=['protein'],cites=['ml-cmp']),
  dict(id='tp',name='Protein, total',syn=['protein, total','total protein','tp'],units={'g/dL':1,'g/L':10},parts=['liver'],nut=['protein'],cites=['ml-cmp']),
  dict(id='alt',name='ALT',syn=['alt','sgpt','alanine aminotransferase'],units={'U/L':1,'IU/L':1},parts=['liver'],nut=[],cites=['ml-cmp']),
  dict(id='ast',name='AST',syn=['ast','sgot','aspartate aminotransferase'],units={'U/L':1,'IU/L':1},parts=['liver'],nut=[],cites=['ml-cmp']),
  dict(id='alp',name='Alkaline phosphatase',syn=['alkaline phosphatase','alk phos','alp'],units={'U/L':1,'IU/L':1},parts=['liver','bones'],nut=[],cites=['ml-cmp']),
  dict(id='tbil',name='Bilirubin, total',syn=['bilirubin, total','total bilirubin','bilirubin','tbil'],units={'mg/dL':1,'µmol/L':17.1,'umol/L':17.1},parts=['liver'],nut=[],cites=['ml-cmp'])],
 'convNote':'Unit conversions use standard SI factors derived from molar mass (e.g. glucose 18.016 g/mol; cholesterol 386.65 g/mol). A1c % ↔ mmol/mol uses the IFCC–NGSP master equation (mmol/mol = 10.929 × (% − 2.15)).',
},
'mood':{
 'phq2':dict(stem='Over the last 2 weeks, how often have you been bothered by the following problems?',items=['Little interest or pleasure in doing things','Feeling down, depressed, or hopeless'],cut=3,**E('Likelihood ratio and receiver operator characteristic analysis identified a PHQ-2 score of 3 as the optimal cutpoint for screening purposes.','pmid-14583691','phq-site')),
 'gad2':dict(stem='Over the last 2 weeks, how often have you been bothered by the following problems?',items=['Feeling nervous, anxious or on edge','Not being able to stop or control worrying'],cut=3,**E('Receiver-operating characteristic curve analysis showed that both the GAD-7 scale and its 2 core items (GAD-2) performed well','pmid-17339617','phq-site')),
 'answers':['Not at all','Several days','More than half the days','Nearly every day'],
 'attrib':'PHQ-2 and GAD-2 were developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues, with an educational grant from Pfizer Inc. No permission required to reproduce, translate, display or distribute.',
 'crisis':E('If you need emotional support, reach out to the national mental health hotline: 988.','lifeline-988'),
},
'caffeine':{
 'fda':E("For most adults, the FDA has cited 400 milligrams a day — that's about two to three 12-fluid-ounce cups of coffee — as an amount not generally associated with negative effects. However, there is wide variation in both how sensitive people are to the effects of caffeine and how fast they eliminate it from the body.",'fda-caffeine'),
 'preg':E('Moderate caffeine consumption (less than 200 mg per day) does not appear to be a major contributing factor in miscarriage or preterm birth.','acog-caffeine'),
 'half':E("Caffeine levels peak 30-120 minutes after oral intake and caffeine's half-life is 3-6 hours.",'pmid-18094346'),
 'vary':E('The pharmacokinetics of caffeine are highly variable among individuals due to a polymorphism at the level of the CYP1A2 isoform of cytochrome P450, which metabolizes 95% of the caffeine ingested.','pmid-29514871'),
 'drinks':[dict(id='coffee',name='Brewed coffee',fdc=171881,mgPer100=37,ml=355),dict(id='espresso',name='Espresso shot',fdc=171891,mgPer100=212,ml=30),dict(id='blacktea',name='Black tea',fdc=173227,mgPer100=20,ml=240),dict(id='greentea',name='Green tea',fdc=171917,mgPer100=12,ml=240),dict(id='cola',name='Cola',fdc=174852,mgPer100=9,ml=355),dict(id='energy',name='Energy drink (Red Bull)',fdc=173210,mgPer100=29,ml=250)],
 'drinksNote':'Caffeine per 100 g from USDA FoodData Central SR Legacy (mL counted as grams for water-like drinks). Real drinks vary by brand and brew.',
 'std':E('one standard drink contains about 14 grams, or about 0.6 fluid ounces, of pure alcohol. That is the amount of alcohol in: A 12-ounce can of regular beer at 5% alcohol by volume A 5-ounce glass of wine at 12% alcohol by volume A 1.5-ounce shot glass of distilled spirits','niaaa-std'),
}}
json.dump(V,open(D+'v19.json','w'),ensure_ascii=False,indent=0)
print('ok',len(new))
