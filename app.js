import {createBody} from './body3d.js';
import * as SC from './scan.js';
import {install as install19} from './v19.js';
const J=u=>fetch(u).then(r=>r.json());
const [FOODS,NUT,BODY,MEDS,CONDS,CITS,SYMS,PREP,CELL,SPIR,CYC,EXD,CAN]=await Promise.all(['foods','nutrients','body','meds','conditions','citations','symptoms','prep','cell','spirit','cycle','exercise','cancer'].map(n=>J(`data/${n}.json`)));
const MODEL=await J('data/model.json');const PL=await J('data/plain.json');const EXP=await J('data/exposures.json');const V19=await J('data/v19.json');const CIT=CITS.citations, N=NUT.nutrients, DRI=NUT.dri, PARTS=BODY.parts, SYS=BODY.systems;
const EXL=new Map(EXD.library.map(x=>[x.id,x]));const FOOD=new Map(FOODS.foods.map(f=>[f.fdcId,f]));
const NAME=k=>(N[k]&&N[k].name)||({fiber:'Fiber',na:'Sodium',protein:'Protein',alcohol:'Alcohol'})[k]||k;
// ---------- storage (local only)
const KEY='nutribody.v1';
const S=Object.assign({profile:{sex:'F',band:0,pregnant:false},logs:{},meds:[],conds:[],ack:false,hidden:[],symptoms:[],view:{style:'real',bySys:false,skin:.35}},JSON.parse(localStorage.getItem(KEY)||'{}'));
// ---------- barcode scanning (v16)
S.products=S.products||{};S.lookup=Object.assign({fdc:false,key:''},S.lookup||{});
for(const p of Object.values(S.products)){FOOD.set(p.fdcId,p);if(p.cite)CIT[p.cite.id]=p.cite}
const BNUT=['kcal','protein','fiber','na','ca','fe','k','vitD','vitC','vitA','mg','zn','b12'];
function openScanner(onDone,onSearch){const m=document.getElementById('modal');let cam=null;
  const close=()=>{if(cam){cam.stop();cam=null}m.classList.add('hidden');m.replaceChildren()};
  const box=h('div',{cls:'box scanbox'});const body=h('div');const stat=h('div',{cls:'sub',role:'status'});
  const head=h('div',{cls:'fhead'},h('h2',{},'Scan barcode'),h('button',{cls:'icon-btn','aria-label':'Close scanner',on:{click:close}},'✕'));
  const manual=()=>{const inp=h('input',{type:'text',inputmode:'numeric',pattern:'[0-9]*',maxlength:14,'aria-label':'Barcode number',placeholder:'Type the barcode digits',cls:'search'});
    const go_=()=>{const g=SC.normalize(inp.value,null);if(!g){stat.textContent='That isn’t a valid UPC-A, UPC-E, EAN-13 or EAN-8 number (check digit failed).';return}if(cam){cam.stop();cam=null}handle(g)};
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')go_()});
    return h('div',{cls:'manual'},h('div',{cls:'sub'},'Or enter the number under the barcode:'),h('div',{cls:'addrow'},inp,h('button',{cls:'btn',on:{click:go_}},'Look up')))};
  const scanView=()=>{const v=h('video',{cls:'scanvid','aria-label':'Camera preview',playsinline:''});v.muted=true;
    body.replaceChildren(h('div',{cls:'scanwrap'},v,h('div',{cls:'scanframe'})),stat,manual(),h('div',{cls:'sub'},'Camera frames are decoded in memory on this device and never saved or sent. The camera turns off when you close this.'));
    stat.textContent='Starting camera…';
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){stat.textContent='Camera not available here (needs HTTPS and camera permission). Enter the number instead.';return}
    SC.startCamera(v,(g)=>{cam=null;handle(g)},null).then(c=>{if(!m.isConnected||m.classList.contains('hidden')){c.stop();return}cam=c;stat.textContent='Point the camera at a UPC or EAN barcode.'}).catch(e=>{stat.textContent='Camera unavailable ('+(e&&e.name||'error')+'). Enter the number instead.'})};
  const notFound=(g,msg)=>{body.replaceChildren(h('div',{cls:'item'},h('b',{},msg||'No product found for '+g+'.'),h('div',{cls:'sub'},'Branded data covers many but not all US products.')),
      h('button',{cls:'btn primary',on:{click:()=>{close();onSearch&&onSearch()}}},'Search foods instead'),
      h('button',{cls:'btn',on:{click:()=>offAsk(g)}},'Try Open Food Facts (crowd-sourced)'),h('button',{cls:'btn',on:{click:scanView}},'Scan again'))};
  const offAsk=g=>{body.replaceChildren(h('div',{cls:'item'},h('b',{},'Look up in Open Food Facts?'),h('div',{cls:'sub'},'Sends only the barcode number to world.openfoodfacts.org. Data is crowd-sourced and unverified, so it is shown as a lower-tier (T4) source. Data © Open Food Facts contributors, ODbL.')),
      h('button',{cls:'btn primary',on:{click:async()=>{stat.textContent='Looking up…';body.replaceChildren(stat);try{const p=await SC.offLookup(g);p?result(p):notFound(g,'Not in Open Food Facts either.')}catch(e){notFound(g,'Lookup failed (offline?).')}}}},'Look up once'),h('button',{cls:'btn',on:{click:()=>notFound(g)}},'Cancel'))};
  const optIn=g=>{body.replaceChildren(h('div',{cls:'item'},h('b',{},'Turn on online barcode lookup?'),
      h('div',{},'To find the product, NutriBody sends only the barcode number (plus a public API key) to USDA FoodData Central at api.nal.usda.gov. Nothing else from your log, profile or camera is sent. USDA’s API service (api.data.gov) may log the request like any web server.'),
      h('div',{cls:'sub'},'You can turn this off any time in More → Settings.')),
      h('button',{cls:'btn primary',on:{click:()=>{S.lookup.fdc=true;save();handle(g)}}},'Allow USDA lookups'),h('button',{cls:'btn',on:{click:()=>notFound(g,'Online lookup is off.')}},'Not now'))};
  const handle=async g=>{const known=Object.values(S.products).find(p=>p.gtin===g);if(known)return result(known);
    if(!S.lookup.fdc)return optIn(g);stat.textContent='Looking up '+g+' in USDA FoodData Central…';body.replaceChildren(stat);
    try{const p=await SC.fdcLookup(g,S.lookup.key);p?result(p):notFound(g)}catch(e){notFound(g,e.message==='rate'?'USDA lookup limit reached (shared DEMO_KEY allows only a few lookups per hour). Add your own free api.data.gov key in Settings, or try later.':e.message==='key'?'The API key was rejected. Check it in Settings.':'Lookup failed (offline?).')}};
  const result=p=>{CIT[p.cite.id]=p.cite;const sv=p.serving||{g:100,label:'100 g'};const qty=h('input',{type:'number',cls:'qty','aria-label':'Servings',value:1,min:0.25,step:0.25});
    const tb=h('div',{cls:'nsum'});const draw=()=>{const k=+qty.value||0;tb.replaceChildren(...BNUT.filter(x=>p.per100g[x]!=null).map(x=>h('div',{cls:'row'},h('span',{},x==='kcal'?'Calories':NAME(x)),h('span',{},x==='kcal'?Math.round(p.per100g[x]*sv.g*k/100)+' kcal':x==='protein'?(Math.round(p.per100g[x]*sv.g*k/10)/10)+' g':fmt(p.per100g[x]*sv.g*k/100,x)))))};qty.addEventListener('input',draw);draw();
    body.replaceChildren(h('div',{cls:'fname'},p.name),h('div',{cls:'full'},'Barcode '+p.gtin+(p.src==='fdc'?' · FDC '+p.fdcId:'')),h('div',{},chip(p.cite.id),p.src==='off'?h('span',{cls:'sub'},' Crowd-sourced (lower tier) · © Open Food Facts contributors, ODbL'):h('span',{cls:'sub'},' Manufacturer label data via USDA')),
      h('div',{cls:'meta'},h('span',{cls:'pill'},'Serving: '+sv.label),sv.ml?h('span',{cls:'sub'},'mL counted as grams (≈ for water-like drinks)'):null,p.serving?null:h('span',{cls:'sub'},'No serving size listed; using 100 g.')),
      h('div',{cls:'addrow'},qty,h('span',{cls:'sub'},'serving(s) — label nutrients:')),tb,
      h('button',{cls:'btn primary',on:{click:()=>{const k=+qty.value;if(!(k>0))return;S.products[p.fdcId]=Object.assign({portions:[{label:sv.label,g:sv.g}]},p);FOOD.set(p.fdcId,S.products[p.fdcId]);
        log().push({fdcId:p.fdcId,grams:sv.g*k,label:sv.label+' ×'+k,prep:'asis'});save();close();onDone&&onDone()}}},'Add to log'),h('button',{cls:'btn',on:{click:scanView}},'Scan another'))};
  box.append(head,body);m.replaceChildren(box);m.classList.remove('hidden');scanView();return{close,handle}}
S.ex=Object.assign({log:[]},S.ex||{});S.cycle=Object.assign({show:false,periods:[],days:{}},S.cycle||{});S.spirit=Object.assign({on:false,trad:'',logs:{},journal:{}},S.spirit||{});S.view=Object.assign({style:'real',bySys:false,skin:.35,theme:'light'},S.view);if(!S.view.v13){S.view.v13=1;S.view.style='real'}document.documentElement.dataset.theme=S.view.theme==='dark'?'dark':'light';S.symptoms=S.symptoms||[];
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
const SHORTN={174683:'Grapes',168160:'Prunes',170093:'Baked potato',170457:'Tomatoes',169247:'Romaine lettuce',170108:'Red bell pepper',170427:'Green bell pepper',168409:'Cucumber',169251:'White mushrooms',170105:'Green peas',169998:'Sweet corn',170130:'Butternut squash',168457:'Kelp',170495:'Spirulina',173735:'Black beans',173757:'Chickpeas',172421:'Lentils',173740:'Kidney beans',175200:'Pinto beans',173746:'Navy beans',172446:'Soy milk',172470:'Peanut butter',170556:'Pumpkin seeds',170562:'Sunflower seeds',172430:'Peanuts',173806:'Peanuts, dry-roasted',169705:'Oats',173904:'Oats (dry)',169704:'Brown rice',168878:'White rice',172688:'Whole-wheat bread',174925:'White bread, toasted',175036:'Corn tortillas',174899:'Bagel',170285:'Pearled barley',170686:'Buckwheat groats',173884:'Cheerios',171287:'Egg',173424:'Egg, hard-boiled',172183:'Egg white',172184:'Egg yolk',171265:'Whole milk',171267:'2% milk',171269:'Skim milk',171312:'Greek yogurt',171284:'Plain yogurt',172182:'Cottage cheese',173410:'Butter',170859:'Heavy cream',170904:'Kefir',167575:'Vanilla ice cream',171477:'Chicken breast',172388:'Chicken thigh',171481:'Turkey',174032:'Ground beef',173118:'Sirloin steak',168627:'Beef liver',171061:'Chicken liver',168250:'Pork tenderloin',168322:'Bacon',167871:'Ham',172544:'Ground lamb',175168:'Salmon, Atlantic (farmed)',173692:'Salmon, sockeye',171986:'Tuna, canned light',175139:'Sardines',171956:'Cod',175120:'Mackerel',175177:'Tilapia',173718:'Rainbow trout',175117:'Herring',175180:'Shrimp',171980:'Oysters',171975:'Clams',174217:'Mussels',174202:'King crab',173577:'Cod liver oil',171413:'Olive oil',172336:'Canola oil',171412:'Coconut oil',171411:'Soybean oil',170273:'Dark chocolate',169593:'Cocoa powder',169655:'Sugar',169641:'Jam',171890:'Coffee',173227:'Black tea',171917:'Green tea',169098:'Orange juice',174852:'Cola',168746:'Beer',173190:'Red wine',174832:'Almond milk',174158:'Bottled water',173468:'Table salt',174278:'Tamari soy sauce',172234:'Yellow mustard',170317:'Cheese pizza',170693:'Hamburger (fast food)',170698:'French fries',175068:'Saltine crackers',172716:'Chocolate chip cookies',174992:'Cake doughnut',175009:'Pancakes',172909:'Chicken noodle soup',172882:'Tomato soup',173862:'Beef hot dog',174586:'Italian sausage',167717:'Yeast extract spread',168558:'Dill pickles',169094:'Ripe olives',173941:'Dried apricots',174665:'Dried figs',168386:'Artichokes',172231:'Turmeric',171320:'Cinnamon',168892:'Wheat germ',173870:'Liverwurst',170809:'Beef chuck (stew meat)',172411:'Duck',167774:'Pink grapefruit juice',168164:'Golden raisins',168191:'Medjool dates',168153:'Kiwifruit',169928:'Peaches',171719:'Sweet cherries',170567:'Almonds',170187:'Walnuts',170162:'Cashews',170569:'Brazil nuts',170184:'Pistachios',170182:'Pecans',170554:'Chia seeds',169414:'Flaxseed',170150:'Sesame seeds',170899:'Cheddar cheese',170845:'Mozzarella',170848:'Parmesan',171251:'Swiss cheese',168463:'Spinach, boiled',169967:'Broccoli, boiled',168483:'Sweet potato, baked',168513:'Brussels sprouts',168523:'Collard greens',170139:'Turnip greens',169279:'Sauerkraut',169231:'Ginger',168411:'Edamame'};
let DAY=0;const dayDate=()=>new Date(Date.now()-DAY*864e5);const today=()=>{const d=dayDate();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const log=()=>S.logs[today()]||(S.logs[today()]=[]);
// ---------- DOM helper (textContent only; never innerHTML)
function h(tag,attrs,...kids){const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs||{})){if(k==='on')for(const[ev,f]of Object.entries(v))e.addEventListener(ev,f);else if(k==='cls')e.className=v;else if(k==='style')Object.assign(e.style,v);else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v)}
  for(const c of kids.flat(9)){if(c==null||c===false)continue;e.append(c instanceof Node?c:document.createTextNode(String(c)))}return e}
const rc=(el,...k)=>el.replaceChildren(...k.flat(9).filter(x=>x!=null&&x!==false));
// ---------- citations
const AGE=c=>{if(!c.date)return['u','date unknown',0,'?'];const y=(Date.now()-new Date(c.date.length===4?c.date+'-07-01':c.date.length===7?c.date+'-15':c.date))/3.15576e10,yr=c.date.slice(0,4);
  return y<=5?['g','≤5 y',4,yr]:y<=10?['y','5–10 y',3,yr]:y<=15?['o','10–15 y',2,yr]:['r','>15 y',1,yr]};
const meter=n=>h('span',{cls:'fm','aria-hidden':'true'},...[1,2,3,4].map(i=>h('i',{cls:i<=n?'f':''})));
const TIERLBL={1:'strongest',2:'strong',3:'moderate',4:'limited'};
const TIERICON={1:'◆',2:'▲',3:'●',4:'○'};
function chip(id){const c=CIT[id];if(!c)return null;const[a,al,n,yr]=AGE(c);const src=c.pmid?'PMID':c.publisher.split(' ')[0].replace(/[,(]/g,'');
  return h('span',{cls:'cite',role:'button',tabindex:0,title:c.title,'aria-label':'Source '+src+', evidence tier '+c.tier+' ('+TIERLBL[c.tier]+'), '+(c.date?'published '+yr+', '+al+' old':'date unknown')+'. Tap for details.',on:{click:e=>{e.stopPropagation();showCite(id)},keydown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showCite(id)}}}},h('span',{cls:'src'},src),h('span',{cls:'yr'},yr+' · ',h('span',{cls:'tier tr'+c.tier},'T'+c.tier)),meter(n))}
const chips=ids=>{ids=(ids||[]).filter(i=>CIT[i]);if(ids.length<3)return ids.map(chip);const m=h('span',{cls:'cite multi',role:'button',tabindex:0,'aria-label':ids.length+' sources. Tap to show them.',on:{click:e=>{e.stopPropagation();m.replaceWith(...ids.map(chip))}}},ids.length+' sources ▾');return [m]};
const pop=document.getElementById('pop');
function showCite(id){const c=CIT[id],[a,al]=AGE(c);pop.replaceChildren(
  h('div',{cls:'flex'},h('span',{cls:'cite'},h('span',{cls:'yr'},'Age: '+al+(c.date?' ('+c.date+')':''),meter(AGE(c)[2]))),h('span',{cls:'cite'},h('span',{cls:'tier tr'+c.tier},'Tier '+c.tier),' '+TIERLBL[c.tier]+' evidence')),
  h('h3',{},c.title),h('div',{},c.publisher,' · ',c.type),...(c.pmid?[h('div',{},'PMID: '+c.pmid)]:[]),...(c.doi?[h('div',{},'DOI: '+c.doi)]:[]),
  h('div',{},'Tier rationale: ',c.tierRationale),h('div',{},'Retrieved: '+c.retrieved),
  h('div',{},h('a',{href:c.url,target:'_blank',rel:'noopener noreferrer'},c.url)),h('button',{cls:'btn',on:{click:()=>pop.classList.add('hidden')}},'Close'));pop.classList.remove('hidden')}
document.addEventListener('click',e=>{if(!pop.contains(e.target))pop.classList.add('hidden')});
// ---------- nutrition math
{const pr=S.profile;if(pr.age==null){pr.age=(pr.band??1)+4;pr.life=pr.pregnant?'preg':'none'}pr.hcm??=pr.sex==='M'?175:162;pr.wkg??=pr.sex==='M'?80:68;pr.unit??='lb';pr.life??='none'}
const P=()=>S.profile, preg=()=>P().sex==='F'&&P().age>=3&&P().age<=5&&(P().life==='preg'||S.conds.includes('preg'));
const life=()=>P().sex!=='F'||P().age<3||P().age>5?null:preg()?'P':P().life==='lact'?'L':null;
const AGES=['1–3','4–8','9–13','14–18','19–30','31–50','51–70','71+'];
const bmi=()=>P().wkg/((P().hcm/100)**2);
const BMICAT=b=>b<18.5?'below 18.5':b<25?'18.5–24.9':b<30?'25.0–29.9':'30.0 or above';
const BMINAME=b=>b<18.5?'Underweight':b<25?'Healthy weight':b<30?'Overweight':'Obesity';
// protein: ODS cites the RDA of 0.8 g/kg/day for healthy adults and 0.85 g/kg/day for adolescents; not set for younger ages or pregnancy/lactation (no sourced per-kg value here)
const proteinT=()=>life()?null:P().age>=4?.8*P().wkg:P().age===3?.85*P().wkg:null;
let tgt=k=>{const d=DRI[k];if(!d)return null;const l=life();if(l&&d.target[l]&&d.target[l][P().age]!=null)return d.target[l][P().age];return d.target[P().sex][P().age]};
const tgt0=tgt;
tgt=k=>{const v=tgt0(k);return k==='vitC'&&v!=null&&P().smoke&&P().age>=4?v+35:v};
const ul=k=>{const d=DRI[k];if(!d||d.ul==null)return null;const l=life();return (l&&d.ul[l][P().age]!=null?d.ul[l][P().age]:d.ul[P().sex][P().age])??null};
// ---------- preparation / cooking (USDA retention factors R6 or actual SR Legacy cooked entries)
const prepOf=it=>(PREP.prep[it.fdcId]||[]).find(p=>p.id===it.prep);
const MLBL=id=>PREP.methods[id]||id;const VERB={boiled:'boiling',steamed:'steaming',microwaved:'microwaving',baked:'baking/roasting',sauteed:'sautéing',deepfried:'deep-frying',grilled:'grilling',canned:'canning',frozen:'freezing',soaked:'soaking',sprouted:'sprouting',fermented:'fermenting',raw:'eating raw'};const VB=id=>VERB[id]||MLBL(id).toLowerCase();
function itemNut(it){const f=FOOD.get(it.fdcId);if(!f)return{n:{},d:{}};const p=prepOf(it);let src=f.per100g,d={};
  if(p&&p.mode==='entry'){const c=FOOD.get(p.fdcId);if(c){for(const k in DRI)if(src[k]>0&&c.per100g[k]!=null)d[k]=100*(c.per100g[k]-src[k])/src[k];src=c.per100g}}
  const n={};for(const[k,v]of Object.entries(src))n[k]=v*it.grams/100;
  if(p&&p.mode==='rf')for(const[k,r]of Object.entries(p.rf)){if(n[k]!=null){n[k]*=r/100;if(r!==100)d[k]=r-100}}
  return{n,d,p}}
const effectsFor=it=>{const f=FOOD.get(it.fdcId);const pid=it.prep||'asis';return f?PREP.effects.filter(e=>new RegExp(e.foods).test(f.name)&&(e.preps.includes(pid)||(pid==='asis'&&e.preps.includes('asis')))&&(PREP.prep[it.fdcId]||e.preps.includes('asis'))):[]};
const deltaTxt=(it,max=3)=>{const{d,p}=itemNut(it);return Object.entries(d).filter(([k,v])=>Math.abs(v)>=5).sort((a,b)=>(a[1]<0)!==(b[1]<0)?a[1]-b[1]:Math.abs(b[1])-Math.abs(a[1])).slice(0,max).map(([k,v])=>NAME(k)+' '+(v>0?'+':'−')+Math.abs(Math.round(v))+'%').join(', ')};
function totals(){const t={};for(const it of log()){const{n}=itemNut(it);for(const[k,v]of Object.entries(n))t[k]=(t[k]||0)+v}
  t.alcohol=log().some(it=>/^alcoholic/i.test(FOOD.get(it.fdcId)?.name||''))?1:0;return t}
function pcts(t){const p={};for(const k in DRI){const g=tgt(k);if(g)p[k]=100*(t[k]||0)/g}return p}
function partScores(p){const s={};for(const id in PARTS){let a=0,w=0;for(const k in N)for(const m of N[k].map)if(m.part===id){a+=m.weight*Math.min(100,p[k]||0);w+=m.weight}s[id]=w?a/w:null}
  for(const id in s)if(s[id]==null){const sib=Object.keys(PARTS).filter(i=>PARTS[i].system===PARTS[id].system&&s[i]!=null);s[id]=sib.length?sib.reduce((x,i)=>x+s[i],0)/sib.length:0;NOMAP.add(id)}return s}
const NOMAP=new Set();
const sysScore=(sid,ps)=>{const ids=Object.keys(PARTS).filter(i=>PARTS[i].system===sid);return ids.reduce((a,i)=>a+ps[i],0)/ids.length};
function ulWarnings(t){const w=[];for(const k in DRI){const u=ul(k);if(u&&!/supplement/i.test(DRI[k].ulNote||'')&&(t[k]||0)>u)w.push({k,u,v:t[k],note:DRI[k].ulNote,cites:DRI[k].cites})}
  for(const c of S.conds){const C=CONDS.conditions.find(x=>x.id===c);for(const r of C?.rules||[])if(r.max&&(t[r.nutrient]||0)>r.max)w.push({k:r.nutrient,u:r.max,v:t[r.nutrient],note:`Condition guidance (${C.name}) limit`,cites:r.cites})}return w}
const fmt=(v,k)=>(v>=100?Math.round(v):v>=10?v.toFixed(1):v.toFixed(2))+' '+(DRI[k]?.unit||'');
// ---------- med & condition flags
const medObjs=()=>S.meds.map(id=>MEDS.meds.find(m=>m.id===id)).filter(Boolean);
const condObjs=()=>S.conds.map(id=>CONDS.conditions.find(m=>m.id===id)).filter(Boolean);
const FOODMATCH={grapefruit:/grapefruit/i,tyramine:/cheddar|parmesan|swiss|aged|salami|sausage|bacon|ham|frankfurter|soy sauce|miso|tempeh|sauerkraut|yeast extract|beer|wine|liverwurst/i,alcohol:/^alcoholic/i,caffeine:/coffee|tea,|cola|chocolate|cocoa/i,minerals:/milk|yogurt|cheese|kefir|tofu|sardine|cereals ready|oyster|spinach|almond/i};
function medAlerts(t){const out=[];const L=log().map(i=>FOOD.get(i.fdcId)).filter(Boolean);
  for(const m of medObjs()){for(const it of m.interactions){let hit=null;
      if(FOODMATCH[it.category]){const f=L.filter(f=>FOODMATCH[it.category].test(f.name));if(f.length)hit='Logged today: '+f.map(f=>f.name).slice(0,3).join('; ')}
      else if(it.category==='vitaminK'&&(t.vitK||0)>0)hit=`Vitamin K logged today: ${fmt(t.vitK,'vitK')}`;
      else if(it.category==='potassium'&&(t.k||0)>0)hit=`Potassium logged today: ${fmt(t.k,'k')}`;
      else if(it.category==='sodium'&&(t.na||0)>0)hit=`Sodium logged today: ${fmt(t.na,'na')}`;
      if(hit)out.push({m,it,hit})}}
  return out}
// ---------- symptoms
const SYM=new Map(SYMS.symptoms.map(x=>[x.id,x]));
const daysAgo=d=>(new Date(today())-new Date(d))/864e5;
const activeSyms=()=>[...new Set(S.symptoms.filter(e=>daysAgo(e.date)<=7).map(e=>e.sym))].map(i=>SYM.get(i)).filter(Boolean);
// ---------- system colors (atlas-style)
const SYSHUE={skeletal:0xf3e2a6,muscular:0xff6a55,nervous:0xffe03a,cardio:0xff3030,respiratory:0x6fd6ff,digestive:0xff9530,immune:0x46e07a,endocrine:0xb06bff,urinary:0x5cc8a8,reproductive:0xff7fc0,integumentary:0xffc9a8,connective:0xd9cbb0};
const partHue=id=>id==='blood'?0x3a66ff:SYSHUE[PARTS[id].system];
const SYSLBL={cardio:'Cardio (arteries red / veins blue)'};
// ---------- 3D
const status=h('div',{id:'loading'},'Loading anatomical model…');document.getElementById('scan').append(status);
const body=createBody(document.getElementById('gl'),id=>{if(id)openPart(id);else{closePanel()}},p=>{status.textContent='Loading anatomical model… '+(p!=null?p+'%':'')});
body.ready.then(r=>{status.remove();applyProfile();window.__nbLoadMs=r.ms;refresh3d()}).catch(e=>{status.textContent='3D model failed to load.'});
const panel=document.getElementById('panel');
const UI={vopen:false,aopen:false,lcol:false,popen:false};const vc=document.getElementById('viewctl'),sysleg=document.getElementById('sysleg');
function applyView(){const v=S.view;buildTabs();body.setStyle(v.style);body.setSkin(+v.skin);body.setHues(v.bySys?Object.fromEntries(Object.keys(PARTS).map(i=>[i,partHue(i)])):null);
  scan.classList.toggle('real',v.style==='real');scan.classList.toggle('holo',v.style!=='real');
  const sl=h('input',{type:'range',min:0,max:1,step:.05,value:v.skin,'aria-label':'Skin opacity',on:{input:e=>{v.skin=+e.target.value;body.setSkin(v.skin);save()}}});
  const vp=h('div',{cls:'vpop'+(UI.vopen?'':' hidden')},h('button',{cls:'chip'+(v.style==='real'?' on':''),on:{click:()=>{v.style=v.style==='real'?'holo':'real';save();applyView()}}},v.style==='real'?'Style: Realistic':'Style: Holographic'),
    h('button',{cls:'chip'+(v.bySys?' on':''),on:{click:()=>{v.bySys=!v.bySys;save();applyView()}}},'Color by system: '+(v.bySys?'ON':'OFF')),h('select',{'aria-label':'Overlay',on:{change:e=>{v.overlay=e.target.value||null;save();refresh3d()}}},h('option',{value:''},'Overlay: none'),h('option',{value:'anti',selected:v.overlay==='anti'},'Overlay: Antioxidant (eyes)'),h('option',{value:'ex',selected:v.overlay==='ex'},'Overlay: Exercise muscles'),h('option',{value:'rec',selected:v.overlay==='rec'},'Overlay: Muscle recovery (estimate)'),h('option',{value:'onc',selected:v.overlay==='onc'},'Overlay: Cancer-link sites'),h('option',{value:'exp',selected:v.overlay==='exp'},'Overlay: My exposures'),cycOn()?h('option',{value:'cycle',selected:v.overlay==='cycle'},'Overlay: Cycle phase'):null,S.spirit.on?h('option',{value:'spirit',selected:v.overlay==='spirit'},'Overlay: Spiritual'):null),
    v.style==='real'?h('label',{cls:'chip'},'Skin ',sl):null);
  const pp=h('div',{cls:'vpop ppop'+(UI.popen?'':' hidden')},h('button',{cls:'chip',on:{click:()=>{UI.popen=false;applyView();go('me')}}},'Open My profile ›'),profile());
  rc(vc,h('div',{cls:'flex vrow'},h('button',{cls:'chip vbtn','aria-expanded':String(!!UI.popen),on:{click:()=>{UI.popen=!UI.popen;UI.vopen=false;UI.aopen=false;applyView()}}},'👤 '+S.profile.sex+' '+AGES[S.profile.age]+' ▾'),h('button',{cls:'chip vbtn','aria-expanded':String(!!UI.vopen),on:{click:()=>{UI.vopen=!UI.vopen;UI.aopen=false;UI.popen=false;applyView()}}},'⚙ View ▾')),vp,pp);
  document.getElementById('ulbar')?.querySelector('.alist')?.classList.toggle('hidden',!UI.aopen);
  sysleg.classList.remove('hidden');
  rc(sysleg,h('button',{cls:'slh','aria-expanded':String(!UI.lcol),on:{click:()=>{UI.lcol=!UI.lcol;applyView()}}},'Systems '+(UI.lcol?'▸':'▾')),...(UI.lcol?[]:[h('button',{cls:'sl slq',on:{click:()=>{S.hidden=[];save();refresh3d();applyView()}}},'All'),h('button',{cls:'sl slq',on:{click:()=>{S.hidden=Object.keys(SYS);save();refresh3d();applyView()}}},'None'),...Object.entries(SYS).map(([sid,nm])=>h('button',{cls:'sl slt'+(S.hidden.includes(sid)?' off':''),'aria-pressed':String(!S.hidden.includes(sid)),title:'Show/hide '+nm,on:{click:()=>{S.hidden=S.hidden.includes(sid)?S.hidden.filter(x=>x!==sid):[...S.hidden,sid];save();refresh3d();applyView()}}},h('i',{style:{background:'#'+SYSHUE[sid].toString(16).padStart(6,'0')}}),SYSLBL[sid]||nm.split(' ')[0])),h('span',{cls:'sl'},h('i',{style:{background:'#3a66ff'}}),'Veins'),S.spirit.on?h('span',{cls:'sl',role:'button',tabindex:0,on:{click:()=>go('spir')}},h('i',{style:{background:'#ffd76a'}}),'Spiritual'):null,h('span',{cls:'sub'},'Tap to show/hide'+(v.bySys?' · brightness = score':''))]))}
function closePanel(){panel.classList.add('hidden');body.setSelected(null)}
function refresh3d(){const t=totals(),p=pcts(t),ps=partScores(p);const OV=S.view.overlay==='spirit'&&!S.spirit.on?null:S.view.overlay;body.setScores(OV?ovScores(OV,p):ps);body.setExercise&&body.setExercise(OV==='ex'?(UI.exSel?EXL.get(UI.exSel):weekHeat().sel):null);body.setRecovery&&body.setRecovery(OV==='rec'&&X19.recLevels?X19.recLevels().lv:null);{const lg=document.getElementById('legend3d');const ol=lg.querySelector('.ovl');if(ol)ol.remove();const os=lg.querySelector('.scrub');if(os)os.remove();if(OV==='rec'&&X19.recScrub)lg.append(X19.recScrub());if(OV)lg.append(h('span',{cls:'lg ovl ov-'+OV},({rec:X19.recLegend?X19.recLegend():'',anti:'antioxidant overlay',spirit:'spiritual overlay',cycle:'cycle phase overlay',ex:'exercise: primary / secondary',onc:'cancer links (black) — hazard info, not your risk',exp:'exposures — areas your selected exposures can affect (educational)'})[OV]))}body.setStripe&&body.setStripe(OV==='onc'?new Set(ovParts('onc')):null);body.setHues(OV?ovHues(OV):S.view.bySys?Object.fromEntries(Object.keys(PARTS).map(i=>[i,partHue(i)])):null);
  const vis=new Set(Object.keys(PARTS).filter(i=>!S.hidden.includes(PARTS[i].system)));body.setVisible(vis);
  const mp=new Set(medObjs().flatMap(m=>m.parts.map(x=>x.part))),cp=new Set(condObjs().flatMap(c=>c.parts.map(x=>x.part)));body.setFlags(mp,cp,new Set(activeSyms().flatMap(x=>x.parts)));
  const ov=Object.keys(SYS).reduce((a,s)=>a+sysScore(s,ps),0)/Object.keys(SYS).length;
  document.getElementById('overall').replaceChildren(h('div',{},'NUTRIENT COVERAGE ',h('b',{},Math.round(ov)+'%')),h('div',{style:{fontSize:'10px'}},log().length+' items today · not a diagnosis'));
  const ub=document.getElementById('ulbar');const ck=log().map(it=>({it,d:deltaTxt(it,2),ef:effectsFor(it).filter(e=>e.kind==='safety')})).filter(x=>(x.d&&x.it.prep&&x.it.prep!=='asis')||x.ef.length);
  const AL=[...ck.map(x=>h('div',{cls:'ckw'+(x.ef.length?' bad':'')},(x.ef.length?'⚠ '+x.ef[0].title+(x.d?' · ':''):'Cooking: ')+(x.d?x.d+' from '+VB(x.it.prep):'')+' ('+(FOOD.get(x.it.fdcId)?.name.split(',')[0])+')')),...canFlags().map(x=>h('div',{cls:'ckw onc'},'◆ Cancer-link info: '+x.e.agent+(x.e.group?' (IARC Group '+x.e.group+')':'')+' — '+(x.kind==='med'?'in your meds':x.nm.split(',').slice(0,2).join(','))+'. Evidence strength, not your risk. ',h('button',{cls:'chip',on:{click:e=>{e.stopPropagation();go('onc')}}},'Details'))),...ulWarnings(t).map(w=>h('div',{cls:'ulw'},'⚠ ABOVE UPPER LIMIT: '+NAME(w.k)+' '+fmt(w.v,w.k)+' > '+fmt(w.u,w.k)+(w.note?' — '+w.note:''),' ',chips(w.cites)))];
  ub.replaceChildren(...(AL.length?[h('button',{cls:'chip achip'+(ulWarnings(t).length||ck.some(x=>x.ef.length)?' bad':''),'aria-expanded':String(UI.aopen),on:{click:()=>{UI.aopen=!UI.aopen;UI.vopen=false;applyView();ub.querySelector('.alist').classList.toggle('hidden',!UI.aopen)}}},'⚠ '+AL.length+' alert'+(AL.length>1?'s':'')+(UI.aopen?' ▴':' ▾')),h('div',{cls:'alist'+(UI.aopen?'':' hidden')},...AL)]:[]));
  const ly=document.getElementById('layers');ly.replaceChildren(...Object.entries(SYS).map(([sid,nm])=>h('button',{cls:'chip'+(S.hidden.includes(sid)?' off':''),on:{click:e=>{e.stopPropagation();openSystem(sid)},contextmenu:e=>{e.preventDefault()}}},nm.split(' ')[0]+' ',h('b',{},Math.round(sysScore(sid,ps))+'%'))));
  return{t,p,ps}}
const bar=s=>{const c=s<34?'#e08a4a':s<67?'#e2b44a':s<100?'#7fb88a':'#2f7d6d';return h('div',{cls:'bar'},h('i',{style:{width:Math.min(100,s)+'%',background:c}}))};
function openSystem(sid){const{ps}=refresh3d();const ids=Object.keys(PARTS).filter(i=>PARTS[i].system===sid);body.setSelected(new Set(ids));
  const sc=sysScore(sid,ps);
  rc(panel,h('div',{cls:'crumb'},h('a',{on:{click:closePanel}},'Body'),' › ',SYS[sid]),
    h('h2',{},SYS[sid]+' system'),h('div',{cls:'score'},Math.round(sc)+'%'),bar(sc),
    h('div',{cls:'sub'},'System score = average of its parts. Each part = weighted average of capped % of target for nutrients that NIH ODS fact sheets link to it. Educational, not a diagnosis.'),
    h('div',{cls:'flex'},h('button',{cls:'btn',on:{click:()=>{S.hidden=S.hidden.includes(sid)?S.hidden.filter(x=>x!==sid):[...S.hidden,sid];save();openSystem(sid)}}},S.hidden.includes(sid)?'Show layer':'Hide layer'),
      h('button',{cls:'btn',on:{click:()=>{S.hidden=Object.keys(SYS).filter(x=>x!==sid);save();openSystem(sid)}}},'Isolate'),h('button',{cls:'btn',on:{click:()=>{S.hidden=[];save();openSystem(sid)}}},'All layers')),
    h('h3',{},'Parts'),...ids.map(i=>h('div',{cls:'row',on:{click:()=>openPart(i)}},h('span',{},'› '+PARTS[i].name),h('b',{},Math.round(ps[i])+'%'))),
    ...sysMedCond(ids));panel.classList.remove('hidden')}
function sysMedCond(ids){const out=[];for(const m of medObjs())for(const x of m.parts)if(ids.includes(x.part))out.push(h('div',{cls:'warn'},h('span',{cls:'tag med'},'MED'),' ',m.name,' — label indication text: “'+x.evidence+'” ',chips(x.cites)));
  for(const c of condObjs())for(const x of c.parts)if(ids.includes(x.part))out.push(h('div',{cls:'alert'},h('span',{cls:'tag cond'},'CONDITION'),' ',c.name,' — “'+x.evidence+'” ',chips(x.cites)));return out}
function openPart(id){if(id==='muscles'&&S.view.overlay==='rec'&&X19.recPanel&&X19.recPanel(body.lastRegion&&body.lastRegion(),panel,closePanel))return;const{t,p,ps}=refresh3d();body.setSelected(new Set([id]));const sid=PARTS[id].system;
  const ms=[];for(const k in N)for(const m of N[k].map)if(m.part===id)ms.push({k,m});ms.sort((a,b)=>b.m.weight-a.m.weight||(p[a.k]||0)-(p[b.k]||0));
  rc(panel,h('div',{cls:'crumb'},h('a',{on:{click:closePanel}},'Body'),' › ',h('a',{on:{click:()=>openSystem(sid)}},SYS[sid]),' › ',PARTS[id].name),
    h('h2',{},PARTS[id].name),h('div',{cls:'score'},Math.round(ps[id])+'%'),bar(ps[id]),h('div',{cls:'sub'},'Nutrient coverage today for nutrients linked to this part. Not a measure of health or a diagnosis.'),NOMAP.has(id)?h('div',{cls:'warn'},'No NIH ODS fact sheet sentence links a nutrient directly to this part, so its score is the average of the other parts in its system.'):null,
    ...sysMedCond([id]),...log().flatMap(it=>effectsFor(it).filter(e=>e.parts.includes(id)).map(e=>h('div',{cls:e.kind==='safety'?'warn':'ev'},(e.kind==='safety'?'⚠ ':'')+(FOOD.get(it.fdcId)?.name.split(',')[0])+' ('+MLBL(it.prep||'asis').toLowerCase()+'): '+e.title+' ',chips(e.cites)))),...activeSyms().filter(x=>x.parts.includes(id)).map(x=>h('div',{cls:'xref'},h('span',{cls:'tag sym'},'SYMPTOM'),' Logged: '+x.name+' — see the Symptoms tab for possible associations.')),
    h('h3',{},'Contributing nutrients'),
    ...ms.map(({k,m})=>h('div',{},h('div',{cls:'row'},h('span',{},NAME(k)+(m.weight>1?' ★':'')),h('span',{},fmt(t[k]||0,k)+' / '+fmt(tgt(k),k)+' · ',h('b',{},Math.round(p[k]||0)+'%'))),bar(p[k]||0),
      h('div',{cls:'ev'},'NIH ODS: “'+m.evidence+'” ',chips(m.cites)))),
    h('div',{cls:'sub'},'★ = described in the fact sheet introduction (weight 2); others come from its deficiency section (weight 1). Targets: ',chips(['nasem-dri'])));panel.classList.remove('hidden')}
// ---------- pages
const pages=document.getElementById('pages'),scan=document.getElementById('scan');
const TABS=[['scan','Scan'],['ex','Exercise'],['cell','Cellular'],['spir','Spiritual'],['cyc','Cycle'],['onc','Cancer links'],['log','Food log'],['meds','Meds'],['conds','Conditions'],['symp','Symptoms'],['nutr','Nutrients'],['src','Sources'],['set','Settings']];
const GROUPS=[['body','Body',['scan']],['food','Food',['log','nutr']],['health','Health',['meds','conds','symp','onc']],['track','Track',['ex','cyc','spir']],['more','More',['cell','src','set']]];
const ICON={'body': '<circle cx="12" cy="4.5" r="2.2"/><path d="M12 7.5v7M7 9.5l5 1.5 5-1.5M9.5 21l2.5-6.5 2.5 6.5"/>', 'food': '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1.5-2.5 4-2.5 7h3v11"/>', 'health': '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M9 11h6M12 8v6"/>', 'track': '<path d="M3 12h4l2-5 4 10 2-5h6"/>', 'more': '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'};
const grpOf=t=>{const p=GROUPS.find(g=>g[0]===PREFG);return p&&p[2].includes(t)?p:GROUPS.find(g=>g[2].includes(t))||GROUPS[0]};const TLAB=Object.fromEntries(TABS);
function navIcon(k){const NS='http://www.w3.org/2000/svg',sv=document.createElementNS(NS,'svg');sv.setAttribute('viewBox','0 0 24 24');sv.setAttribute('aria-hidden','true');const tmp=new DOMParser().parseFromString('<svg xmlns="'+NS+'">'+ICON[k]+'</svg>','image/svg+xml').documentElement;for(const c of [...tmp.childNodes])sv.appendChild(document.importNode(c,true));return sv}
function segbar(t){const g=grpOf(t),it=g[2].filter(x=>x!=='cyc'||cycOn());if(it.length<2)return null;return h('div',{cls:'seg',role:'tablist'},...it.map(x=>h('button',{cls:x===t?'on':'','data-s':x,role:'tab',on:{click:()=>go(x)}},TLAB[x])))}
const LAST={};
let tab='scan';
var PREFG=null;function go(t){if(GROUPS.some(g=>g[0]===t))PREFG=t;if(t!=='log'&&t!=='nutr')DAY=0;if(GROUPS.some(g=>g[0]===t))t=LAST[t]||grpOf_first(t);tab=t;const G=grpOf(t);PREFG=G[0];LAST[G[0]]=t;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===G[0]));pop.classList.add('hidden');
  if(t==='scan'){pages.classList.add('hidden');scan.classList.remove('hidden');body.pause(false);refresh3d()}else{scan.classList.add('hidden');pages.classList.remove('hidden');body.pause(true);rc(pages,...[segbar(t),...RENDER[t]()].filter(Boolean));pages.scrollTop=0}}
function grpOf_first(k){const g=GROUPS.find(x=>x[0]===k);return g[2][0]}
const cycOn=()=>S.profile.sex==='F'||S.cycle.show;
function buildTabs(){document.getElementById('tabs').replaceChildren(...GROUPS.map(([k,l])=>{const b=h('button',{'data-t':k,'aria-label':l,on:{click:()=>go(k)}});b.append(navIcon(k),h('span',{},l));return b}));if(tab)document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===grpOf(tab)[0]))}
buildTabs();
const DISC=()=>h('div',{cls:'disc'},h('b',{},'Educational only — not medical advice. '),'Scores show how today’s logged foods compare with general Dietary Reference Intakes. They are not a diagnosis or a measure of your health. If you are pregnant, have kidney disease, or take medicines such as warfarin (vitamin K), consult your clinician before changing your diet. Never start, stop, or change a medication based on this app — ask your pharmacist or prescriber.');
function redBanner(x){return h('div',{cls:'disc red'},h('b',{},'⚠ '+(x?x.name+' can be urgent. ':'Urgent symptoms: ')),
  'If you have chest pain, severe shortness of breath, sudden weakness or numbness on one side, sudden confusion, fainting, or thoughts of suicide, call 911 (or your local emergency number) or go to the emergency room now. For suicidal thoughts or crisis, call or text 988. ',
  ...(x?[h('div',{cls:'ev'},'“'+x.redflag.evidence+'” ',chips(x.redflag.cites))]:[h('div',{cls:'ev'},'“'+SYMS.emergency.evidence[0]+'” ',chips(SYMS.emergency.cites)),...SYMS.symptoms.filter(y=>y.red).map(y=>h('span',{},y.name+' ',chips(y.redflag.cites),' '))]))}
function symDetail(x){const t=totals(),p=pcts(t);const nm=x.nutrients,md=x.meds.filter(l=>S.meds.includes(l.med)),cd=x.conds.filter(l=>S.conds.includes(l.cond));
  const nl=nm.map(l=>{const u=ul(l.nutrient),v=t[l.nutrient]||0;
    const cr=l.kind==='deficiency'?(tgt(l.nutrient)?'Your '+NAME(l.nutrient).toLowerCase()+' is at '+Math.round(p[l.nutrient]||0)+'% of target today.':null):(u?'Today: '+fmt(v,l.nutrient)+' vs UL '+fmt(u,l.nutrient)+(v>u?' — above the UL':'')+'.':null);
    return h('div',{cls:'ev'},h('b',{},'Possibly associated with '+(l.kind==='deficiency'?'low ':'excess ')+NAME(l.nutrient)),cr?h('div',{cls:l.kind==='excess'&&u&&v>u?'warn':'xref'},x.name+': '+cr):null,'NIH ODS ('+(l.kind==='deficiency'?'deficiency':'health risks from excessive intake')+'): “'+l.evidence+'” ',chips(l.cites))});
  return h('div',{cls:'item symd'},h('h3',{},x.name),h('div',{cls:'sub'},x.group+' · body: '+x.parts.map(i=>PARTS[i].name).join(', ')),x.red?redBanner(x):null,
    h('div',{cls:'sub'},'These are possible associations quoted from sources — not a diagnosis. Many causes are not listed here; talk with a clinician about symptoms that persist or worry you.'),
    h('h3',{},'Nutrients (NIH ODS fact sheets)'),nl.length?nl:h('div',{cls:'sub'},'No ODS deficiency/excess sentence mentions this symptom.'),
    h('h3',{},'Your medications (FDA label adverse reactions)'),md.length?md.map(l=>h('div',{cls:'ev'},h('b',{},'Possibly associated with '+(MEDS.meds.find(m=>m.id===l.med)?.name||l.med)+' (listed side effect). '),'Label: “'+l.evidence+'” ',chips(l.cites),h('div',{cls:'sub'},'Do not stop or change a medicine on your own — ask your pharmacist or prescriber.'))):h('div',{cls:'sub'},S.meds.length?'None of your added medicines’ labels list this in adverse reactions (as matched).':'Add medicines in the Meds tab to check their labels.'),
    h('h3',{},'Your conditions (MedlinePlus / NIDDK / NHLBI)'),cd.length?cd.map(l=>h('div',{cls:'ev'},h('b',{},'Possibly associated with '+(CONDS.conditions.find(c=>c.id===l.cond)?.name||l.cond)+'. '),'“'+l.evidence+'” ',chips(l.cites))):h('div',{cls:'sub'},S.conds.length?'Not listed on your conditions’ symptom pages (as matched).':'Add conditions in the Conditions tab to check them.'))}

// ---------- Cellular health (sourced; NOT a measurement of oxidative stress)
const ANTIK=CELL.anti.map(x=>x.k);
function antiScore(p){const ks=ANTIK.filter(k=>tgt(k));if(!ks.length)return 0;return ks.reduce((a,k)=>a+Math.min(100,p[k]||0),0)/ks.length}
function canFlags(){const out=[],L=log();for(const it of L){const nm=(FOOD.get(it.fdcId)||{}).name||'';
  for(const e of CAN.foods)if(e.match&&new RegExp(e.match.replace('(?i)',''),'i').test(nm))out.push({kind:'food',e,nm});
  for(const e of CAN.prep){const pr=it.prep||'asis',hot=e.preps.includes(pr)||(pr==='asis'&&/broiled|pan-fried|fried|toasted|roasted|grilled/i.test(nm)&&(e.id==='hca-pah'?!/roasted/i.test(nm):true));if(hot&&new RegExp(e.match.replace('(?i)',''),'i').test(nm))out.push({kind:'prep',e,nm,pr})}}
 for(const e of CAN.meds)if(S.meds.includes(e.id))out.push({kind:'med',e,nm:e.name});const seen=new Set();return out.filter(x=>{const k=x.e.id;if(seen.has(k))return false;seen.add(k);return true})}
function ovParts(o){if(o==='onc'){const f=canFlags(),s=new Set(f.flatMap(x=>x.e.parts));return s.size?[...s]:[...new Set([...CAN.foods,...CAN.meds].flatMap(x=>x.parts))]}if(o==='ex'||o==='rec')return ['muscles'];if(o==='cycle')return ['reproductive','glands','thyroid'];return o==='anti'?CELL.overlay.map(x=>x.part):[...new Set(SPIR.findings.flatMap(f=>f.parts))]}
function spirToday(){return S.spirit.logs[today()]||(S.spirit.logs[today()]={})}
function ovScores(o,p){const s={},ps=ovParts(o);if(o==='onc'){for(const id in PARTS)s[id]=ps.includes(id)?70:4;return s}if(o==='ex'||o==='rec'){for(const id in PARTS)s[id]=id==='muscles'?28:id==='bones'?14:3;return s}if(o==='cycle'){const c=cycStat(),w={menstrual:[90,35],follicular:[55,75],ovulatory:[80,100],luteal:[60,85]}[c.phase]||[30,30];for(const id in PARTS)s[id]=id==='reproductive'?w[0]:ps.includes(id)?w[1]:4;return s}const v=o==='anti'?antiScore(p):Math.min(100,25*Object.values(spirToday()).filter(Boolean).length+20);for(const id in PARTS)s[id]=ps.includes(id)?v:4;return s}
function ovHues(o){const ps=ovParts(o);if(o==='onc')return Object.fromEntries(Object.keys(PARTS).map(i=>[i,ps.includes(i)?0x101010:0xb8bec8]));if(o==='ex'||o==='rec')return Object.fromEntries(Object.keys(PARTS).map(i=>[i,i==='muscles'?0x5a3a3a:0x30384a]));if(o==='cycle')return Object.fromEntries(Object.keys(PARTS).map(i=>[i,i==='reproductive'?0xff5fa8:ps.includes(i)?0xb06bff:0x30384a]));return Object.fromEntries(Object.keys(PARTS).map(i=>[i,ps.includes(i)?(o==='anti'?0x6ff7ff:(i==='heart'||i==='vessels'?0xfff1c4:0xffd76a)):0x30384a]))}
const SVGNS='http://www.w3.org/2000/svg';
function sv(tag,at,...k){const e=document.createElementNS(SVGNS,tag);for(const[a,v]of Object.entries(at||{}))e.setAttribute(a,v);e.append(...k);return e}
function cellSvg(sc){const g=(sc/100);
  const s=sv('svg',{viewBox:'0 0 320 220',width:'100%',role:'img','aria-label':'Schematic cell diagram; shield glow reflects the antioxidant-nutrient score ('+Math.round(sc)+'%)',class:'cellsvg'},
   sv('defs',{},sv('radialGradient',{id:'cg'},sv('stop',{offset:'60%','stop-color':'#6ff7ff','stop-opacity':String(0)}),sv('stop',{offset:'100%','stop-color':'#6ff7ff','stop-opacity':String(.15+.75*g)}))),
   sv('ellipse',{cx:160,cy:110,rx:150,ry:100,fill:'url(#cg)'}),
   sv('ellipse',{cx:160,cy:110,rx:128,ry:84,fill:'#0d2232',stroke:'#6ff7ff','stroke-width':String(1+5*g),'stroke-opacity':String(.35+.65*g)}),
   sv('circle',{cx:160,cy:105,r:30,fill:'#1c3d5a',stroke:'#9fd3ff'}),sv('text',{x:160,y:109,'text-anchor':'middle',fill:'#cfe8ff','font-size':10},'nucleus (DNA)'),
   ...[[72,78],[235,140],[110,158]].map(([x,y])=>sv('ellipse',{cx:x,cy:y,rx:20,ry:9,fill:'#3a2a10',stroke:'#ffb24a'})),
   sv('text',{x:72,y:62,'text-anchor':'middle',fill:'#ffcf8a','font-size':8},'mitochondria'),sv('text',{x:72,y:69,'text-anchor':'middle',fill:'#ffcf8a','font-size':7},'(make ROS during energy use)'),
   ...[[30,30],[290,40],[300,190],[20,200]].map(([x,y])=>sv('text',{x,y,fill:'#ff6a6a','font-size':11,'text-anchor':'middle'},'•ROS')),
   sv('text',{x:160,y:212,'text-anchor':'middle',fill:'#9fe','font-size':10},'membrane shield glow = '+Math.round(sc)+'% (diet score, schematic)'));return s}
const NOTMEAS=()=>h('div',{cls:'disc red'},h('b',{},'⚠ Not a measurement of oxidative stress. '),CELL.notes.notmeasure+' ',h('div',{cls:'ev'},h('b',{},'USDA withdrew its ORAC food antioxidant table in 2012: '),'“'+CELL.notes.orac.evidence.trim()+'” ',chips(CELL.notes.orac.cites),' NutriBody does not use ORAC values.'));

// ---------- Cycle (local only; estimates, not contraception/fertility guidance)
const dnum=s=>Math.round(new Date(s+'T12:00:00')/864e5),dstr=n=>new Date(n*864e5).toISOString().slice(0,10);
function cycStat(){const P0=[...S.cycle.periods].filter(p=>p.s).sort((x,y)=>x.s.localeCompare(y.s));const st=P0.map(p=>dnum(p.s));
  const cl=st.slice(1).map((v,i)=>v-st[i]).filter(x=>x>=10&&x<=90),pl=P0.filter(p=>p.e).map(p=>dnum(p.e)-dnum(p.s)+1).filter(x=>x>0&&x<20);
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;const ac=avg(cl),ap=avg(pl);const T=dnum(today());
  if(!st.length)return{P0,ac,ap,cl,pl};const last=st[st.length-1],day=T-last+1,L=Math.round(ac||28),PL=Math.round(ap||5),ov=L-14;
  const open=P0[P0.length-1].e?null:P0[P0.length-1];
  const phase=day<1?null:(open&&day<=10)||day<=PL?'menstrual':day<ov-1?'follicular':day<=ov+1?'ovulatory':day<=L?'luteal':'late';
  return{P0,ac,ap,cl,pl,day,phase,next:dstr(last+L),late:day>L?day-L:0,L,PL}}
function cycCal(c){const d=new Date(),y=d.getFullYear(),m=d.getMonth(),first=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate();
  const inP=s=>c.P0.some(p=>s>=p.s&&s<=(p.e||today()));const cells=[];for(let i=0;i<first;i++)cells.push(h('span',{cls:'cd e'}));
  for(let i=1;i<=n;i++){const s=`${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`,dd=S.cycle.days[s];
    cells.push(h('span',{cls:'cd'+(inP(s)?' per':'')+(s===today()?' tod':'')+(c.next===s?' nxt':''),title:s+(dd&&dd.flow?' · '+dd.flow:'')},String(i),dd&&(dd.sym||[]).length?h('i',{},'•'):null))}
  return h('div',{},h('div',{cls:'sub'},d.toLocaleString('en-US',{month:'long',year:'numeric'})+' — pink = logged period, ring = today, dashed = estimated next start'),h('div',{cls:'cal'},...'SMTWTFS'.split('').map(x=>h('span',{cls:'cd hd'},x)),...cells))}
const CSYM=[['cramps','Cramps'],['bloating','Bloating'],['headache','Headache'],['fatigue','Fatigue'],['mood','Mood changes'],['breast','Breast tenderness'],['acne','Acne'],['cravings','Cravings'],['sleep','Sleep changes']];

// ---------- Exercise & stretching (Compendium METs; PAG 2nd ed.)
function weekStart(){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toISOString().slice(0,10)}
function weekLog(){const w=weekStart();return S.ex.log.filter(e=>e.d>=w)}
function weekHeat(){const c={};for(const e of weekLog()){const x=EXL.get(e.id);if(!x)continue;for(const r of x.primary)c[r]=(c[r]||0)+1;for(const r of x.secondary)c[r]=(c[r]||0)+.5}
  return {c,sel:{primary:Object.keys(c).filter(k=>c[k]>=2),secondary:Object.keys(c).filter(k=>c[k]<2)}}}
function weekProg(){const L=weekLog();let mod=0,vig=0;const sd=new Set(),bd=new Set(),vd=new Set(),daily={};
  for(const e of L){const x=EXL.get(e.id);if(!x)continue;if(x.met>=6){vig+=e.min;vd.add(e.d)}else if(x.met>=3)mod+=e.min;if(x.type==='strength')sd.add(e.d);if(x.type==='balance')bd.add(e.d);if(x.met>=3)daily[e.d]=(daily[e.d]||0)+e.min}
  return{mod,vig,eq:mod+2*vig,sd:sd.size,bd:bd.size,vd:vd.size,daily}}
const kcal=e=>{const x=EXL.get(e.id);return x?x.met*(S.profile.wkg||70)*e.min/60:0};
const RENDER={
onc(){const F=canFlags(),G=CAN.groups;const grp=g=>g?h('span',{cls:'tag'},'IARC Group '+g+' · '+G[g]):null;
  const card=(e,kind)=>h('div',{cls:'ev oncc'},h('b',{},(kind==='med'?e.name:e.agent)+' '),grp(kind==='med'?e.iarc:e.group),kind==='med'&&e.iarcAgent?h('div',{cls:'sub'},'IARC agent: '+e.iarcAgent):null,
    e.sites&&e.sites.length?h('div',{},'Cancer site(s) named by the source: '+e.sites.join(', ')):null,
    e.evidence?h('div',{},'“'+e.evidence+'”'):null,e.note?h('div',{cls:'sub'},(e.note.startsWith('Not ')||e.note.startsWith('Western')?'':'“')+e.note+(e.note.startsWith('Not ')||e.note.startsWith('Western')?'':'”')):null,e.note2?h('div',{cls:'sub'},'“'+e.note2+'”'):null,e.obs?h('div',{cls:'sub'},'Observational: “'+e.obs+'”'):null,
    e.abs||e.abs2?h('div',{cls:'abs'},'Absolute-risk context from the source: ',...[e.abs,e.abs2].filter(Boolean).map(s=>h('div',{},'“'+s+'”'))):null,
    e.wcrf?h('div',{},h('span',{cls:'tag'},'WCRF/AICR: '+e.wcrf),e.wcrfq?' “'+e.wcrfq+'”':''):null,e.tip?h('div',{cls:'sub'},'Source tip: “'+e.tip+'”'):null,
    kind==='med'?h('div',{},...(e.label||[]).map(s=>h('div',{cls:'sub'},'Label: “'+s+'”')),e.iarcNote?h('div',{cls:'sub'},e.iarcNote):null,h('div',{cls:'mednote'},e.historical?'Historical note: ranitidine is no longer sold in the U.S.':CAN.medNote)):null,
    h('div',{},chips(e.cites)));
  return [h('h2',{},'Cancer-link flags'),h('div',{cls:'sub'},CAN.disclaimer),
   h('div',{cls:'ev'},h('b',{},'What an IARC group means: '),'“'+CAN.meaning+'” ',CAN.meaning2?'“'+CAN.meaning2+'” ':'',chips(['iarc-qa','iarc-qa114'])),h('div',{cls:'sub'},CAN.wcrfNote),
   h('div',{cls:'flex'},h('button',{cls:'chip'+(S.view.overlay==='onc'?' on':''),on:{click:()=>{S.view.overlay=S.view.overlay==='onc'?null:'onc';save();go('scan')}}},S.view.overlay==='onc'?'Hide cancer-site overlay':'Show cancer sites on body (black)')),
   h('h3',{},'From today’s log and your meds ('+F.length+')'),...(F.length?F.map(x=>h('div',{},h('div',{cls:'sub'},x.kind==='med'?'Med in your list':x.kind==='prep'?'Preparation: '+x.nm.split(',').slice(0,2).join(',')+(x.pr&&x.pr!=='asis'?' ('+VB(x.pr)+')':''):'Logged food: '+x.nm.split(',').slice(0,2).join(',')),card(x.e,x.kind))):[h('div',{cls:'sub'},'Nothing flagged today.')]),
   h('h3',{},'Foods (reference)'),...CAN.foods.map(e=>card(e,'food')),h('h3',{},'Preparation methods'),...CAN.prep.map(e=>card(e,'prep')),
   h('h3',{},'Medicines (FDA label warnings; IARC where classified)'),h('div',{cls:'sub'},'Only meds in your list are flagged. The others are shown as reference. '+CAN.medNote),...CAN.meds.map(e=>card(e,'med'))]},
symp(){const groups=[...new Set(SYMS.symptoms.map(x=>x.group))];let cur=null;const det=h('div',{}),hist=h('div',{cls:'list'});
  const sel=h('select',{'aria-label':'Symptom',on:{change:e=>{cur=SYM.get(e.target.value);rc(det,cur?symDetail(cur):null)}}},h('option',{value:''},'Choose a sign or symptom…'),...groups.map(g=>h('optgroup',{label:g},...SYMS.symptoms.filter(x=>x.group===g).map(x=>h('option',{value:x.id},(x.red?'⚠ ':'')+x.name)))));
  const sev=h('select',{'aria-label':'Severity'},...[1,2,3,4,5].map(i=>h('option',{value:i,selected:i===2},'Severity '+i+(i===1?' (mild)':i===5?' (severe)':''))));
  const note=h('input',{type:'text',maxlength:200,placeholder:'Optional note (stays on this device)',style:{width:'100%'}});
  const drawHist=()=>{const L=S.symptoms.map((e,i)=>({e,i})).sort((a,b)=>b.e.date.localeCompare(a.e.date)||b.e.t-a.e.t);
    rc(hist,L.length?L.map(({e,i})=>{const x=SYM.get(e.sym);return h('div',{cls:'item flex'},h('span',{style:{flex:1}},h('a',{cls:'lnk',on:{click:()=>{cur=x;sel.value=x.id;rc(det,symDetail(x));det.scrollIntoView()}}},x?.name||e.sym),' · '+e.date+' · severity '+e.sev,e.note?h('div',{cls:'sub'},'Note: '+e.note):null),
      h('button',{cls:'btn','aria-label':'Delete entry',on:{click:()=>{S.symptoms.splice(i,1);save();drawHist()}}},'✕'))}):h('div',{cls:'sub'},'No symptoms logged yet.'))};
  drawHist();
  return[h('h2',{},'Signs & symptoms'),redBanner(null),
    h('div',{cls:'sub'},'Log what you notice. Symptoms logged in the last 7 days glow violet on the body. Links shown are “possibly associated with” only — never a diagnosis.'),
    h('div',{cls:'flex'},sel),h('div',{cls:'flex'},sev,h('button',{cls:'btn',on:{click:()=>{if(!cur)return;S.symptoms.push({sym:cur.id,date:today(),sev:+sev.value,note:note.value.slice(0,200),t:Date.now()});note.value='';save();drawHist()}}},'Log for '+today())),note,
    det,h('h3',{},'History'),hist,
    h('h3',{},'All symptoms by body system'),...groups.map(g=>h('div',{},h('div',{cls:'sub'},g),h('div',{cls:'flex'},...SYMS.symptoms.filter(x=>x.group===g).map(x=>h('button',{cls:'chip'+(x.red?' redc':''),on:{click:()=>{cur=x;sel.value=x.id;rc(det,symDetail(x));det.scrollIntoView()}}},x.name)))))]},
log(){let q='';const res=h('div',{cls:'list results'}),cur=h('div',{cls:'list'}),snack=h('div',{cls:'snack hidden',role:'status'});let undoT=0;
   const short=(n,id)=>{if(id&&SHORTN[id])return SHORTN[id];const PR=id&&FOOD.get(id);if(PR&&PR.short)return PR.short.length>40?PR.short.slice(0,38)+'…':PR.short;const P=n.split(',').map(x=>x.trim());const skip=/^(raw|cooked|fresh|frozen|canned|all varieties|regular|commercial)$/i;let t=P[0];if(P[1]&&!skip.test(P[1]))t+=', '+P[1].toLowerCase();return t.length>34?t.slice(0,32)+'…':t};
   const fixT=x=>String(x).replace(/(\d)\s*o\s*F\b/g,'$1 °F').replace(/(\d)\s*o\s*C\b/g,'$1 °C');
   const draw=()=>{const toks=q.toLowerCase().split(/\s+/).filter(Boolean);const r=toks.length?[...Object.values(S.products).filter(f=>f.custom&&toks.every(t=>f.name.toLowerCase().includes(t))),...FOODS.foods].filter(f=>!f.variant&&toks.every(t=>f.name.toLowerCase().includes(t))).slice(0,30):[];
     res.replaceChildren(...(toks.length&&!r.length?[h('div',{cls:'sub'},'No matching foods in the offline list.')]:[]),...r.map(f=>{const sel=h('select',{'aria-label':'Portion'},h('option',{value:100},'100 g'),...f.portions.map(p=>h('option',{value:p.g},p.label+' ('+Math.round(p.g)+' g)')));const qty=h('input',{type:'number','aria-label':'Quantity',value:1,min:0.25,step:0.25,cls:'qty'});const PP=PREP.prep[f.fdcId];const ps=PP?h('select',{'aria-label':'Preparation',cls:'prepsel'},...PP.map(p=>h('option',{value:p.id},(p.id==='raw'||p.id==='asis'?'Prep: ':'')+MLBL(p.id)+(p.mode==='entry'?' (USDA entry)':p.mode==='rf'?' (USDA retention)':p.mode==='none'?' (no USDA data)':'')))):null;
       return h('div',{cls:'res'},h('div',{cls:'fname'},short(f.name,f.fdcId)),h('div',{cls:'full'},f.name+(f.custom?(String(f.fdcId).startsWith('custom')?' · your custom food':' · saved from online search'):' · FDC '+f.fdcId)),h('div',{cls:'addrow'},qty,h('span',{cls:'sub'},'×'),sel),ps?h('div',{},ps):null,h('button',{cls:'btn primary',on:{click:()=>{const g=+sel.value*+qty.value;if(!(g>0))return;log().push({fdcId:f.fdcId,grams:g,label:sel.selectedOptions[0].textContent+' ×'+qty.value,prep:ps?ps.value:'asis'});save();drawCur()}}},'Add to log'))}));};
   const NT=h('div');
   const drawCur=()=>{NT.replaceChildren(nutSummary());const L=log();cur.replaceChildren(...(L.length?[]:[h('div',{cls:'empty'},'Nothing logged for this day yet. Search above to add a food.')]),...L.map((it,i)=>{const{n,p}=itemNut(it);const dt=deltaTxt(it,4);const ef=effectsFor(it);const nm=FOOD.get(it.fdcId)?.name||'?',snm=short(nm,it.fdcId);
     const saf={},oth=[];for(const e of ef){if(e.kind==='safety'){const k=e.title;(saf[k]||(saf[k]={title:e.title,ev:[],cites:new Set(),parts:new Set()}));if(!saf[k].ev.includes(e.evidence))saf[k].ev.push(e.evidence);e.cites.forEach(c=>saf[k].cites.add(c));e.parts.forEach(x=>saf[k].parts.add(x))}else oth.push(e)}
     const meta=h('div',{cls:'meta'},h('span',{cls:'pill'},Math.round(it.grams)+' g'),it.prep&&it.prep!=='asis'&&it.prep!=='raw'?h('span',{cls:'pill prep'},MLBL(it.prep)):null,n&&n.kcal!=null?h('span',{cls:'pill'},Math.round(n.kcal)+' kcal'):null,h('span',{cls:'sub'},it.label),FOOD.get(it.fdcId)?.cite?chip(FOOD.get(it.fdcId).cite.id):null);
     const rm=h('button',{cls:'icon-btn','aria-label':'Remove '+snm,title:'Remove',on:{click:()=>{const [x]=log().splice(i,1);save();drawCur();clearTimeout(undoT);snack.replaceChildren(h('span',{},'Removed '+snm),h('button',{cls:'undo',on:{click:()=>{log().splice(i,0,x);save();snack.classList.add('hidden');drawCur()}}},'Undo'));snack.classList.remove('hidden');undoT=setTimeout(()=>snack.classList.add('hidden'),6000)}}},'✕');
     const det=(cls,summary,body)=>{const d=h('details',{cls});d.append(h('summary',{},summary),...body.filter(Boolean));return d};
     return h('div',{cls:'item food'},h('div',{cls:'fhead'},h('div',{cls:'ftxt'},h('div',{cls:'fname'},snm),h('div',{cls:'full'},nm)),rm),meta,
       ...Object.values(saf).map(sf=>det('safety','⚠ Food safety: '+sf.title,[...sf.ev.map(e=>h('div',{cls:'q'},'“'+fixT(e)+'”')),h('div',{},chips([...sf.cites])),sf.parts.size?h('div',{cls:'sub'},'Body: '+[...sf.parts].map(x=>PARTS[x].name).join(', ')):null])),
       p&&p.mode==='entry'?det('note','USDA cooked entry used',[h('div',{cls:'ck'},'Using the actual USDA SR Legacy entry “'+p.desc+'” (FDC '+p.fdcId+'; grams = cooked weight). vs raw per 100 g: '+(dt||'little change'),' ',chip('usda-fdc'))]):null,
       p&&p.mode==='rf'?det('note','USDA retention factors applied',[h('div',{cls:'ck'},'USDA retention factors ('+p.code+'; grams = raw weight): '+(dt||'little change')+' from '+VB(it.prep),' ',chip('usda-retn6'))]):null,
       p&&p.mode==='none'?h('div',{cls:'sub'},'No USDA retention factor or cooked entry for this method; values shown are raw.'):null,
       ...oth.map(e=>det('note','Chemistry: '+e.title,[h('div',{cls:'q'},'“'+fixT(e.evidence)+'” ',chips(e.cites)),e.parts.length?h('div',{cls:'sub'},'Body: '+e.parts.map(x=>PARTS[x].name).join(', ')):null])))}))};
   drawCur();
   const dd=dayDate(),lbl=(DAY===0?'Today, ':DAY===1?'Yesterday, ':'')+dd.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
   const nav=h('div',{cls:'daynav'},h('button',{cls:'icon-btn','aria-label':'Previous day',on:{click:()=>{DAY++;go('log')}}},'‹'),h('div',{cls:'dlbl'},lbl),h('button',{cls:'icon-btn','aria-label':'Next day',disabled:DAY===0?true:null,on:{click:()=>{if(DAY>0){DAY--;go('log')}}}},'›'));
   return[h('div',{cls:'ptitle'},'Food log'),nav,macroMini(),
     h('div',{cls:'card addcard'},h('h3',{},'Add food'),h('input',{type:'search','aria-label':'Search foods',placeholder:'Search foods (e.g. salmon, spinach)',cls:'search',on:{input:e=>{q=e.target.value;draw();const t=q.trim();if(t&&res.querySelectorAll('.res').length<3)res.append(onlineBox(t,()=>{drawCur()}))}}}),res,
       h('div',{cls:'flex scanrow'},h('button',{cls:'btn',on:{click:()=>openScanner(()=>go('log'),()=>document.querySelector('.addcard .search')?.focus())}},'▥ Scan barcode'),h('button',{cls:'btn ghost',on:{click:()=>X19.ocrFlow('nut')}},'📷 Read Nutrition Facts')),
       h('div',{cls:'sub'},'Search: USDA FoodData Central SR Legacy (public domain), bundled offline. Barcodes: optional online USDA Branded Foods lookup. ',chip('usda-fdc'))),
     h('h3',{},DAY===0?'Logged today':'Logged'),cur,
     h('div',{cls:'card'},h('h3',{},'Micronutrient totals'),NT,h('div',{cls:'sub'},'Iodine is not reported for most foods in SR Legacy, so iodine totals will be underestimated.')),snack]},
meds(){const sel=h('select',{},h('option',{value:''},'Add a medicine…'),...MEDS.meds.filter(m=>!S.meds.includes(m.id)).map(m=>h('option',{value:m.id},m.name+(m.brand?' ('+m.brand+')':''))));
  const t=totals();const al=medAlerts(t);
  return[h('h2',{},'Medications'),h('div',{cls:'disc'},h('b',{},'Never start, stop, or change a medication based on this app. '),'Ask your pharmacist or prescriber about food and supplement interactions. Information below is quoted from FDA labeling (DailyMed) and NIH ODS fact sheets; it is incomplete.'),
    h('div',{cls:'flex'},sel,h('button',{cls:'btn',on:{click:()=>{if(sel.value){S.meds.push(sel.value);save();go('meds')}}}},'Add'),h('button',{cls:'btn ghost',on:{click:()=>X19.ocrFlow('med')}},'📷 Read a label')),
    al.length?h('h3',{},'⚠ Alerts from today’s food log'):null,...al.map(a=>h('div',{cls:'warn'},h('b',{},a.m.name+' · '+a.it.category),h('div',{},a.hit),h('div',{cls:'ev'},'Label: “'+a.it.text+'” ',chips(a.it.cites)))),
    ...medObjs().map(m=>h('div',{cls:'item'},h('div',{cls:'flex'},h('h3',{},m.name),h('span',{cls:'tag med'},'amber on body'),h('button',{cls:'btn',on:{click:()=>{S.meds=S.meds.filter(x=>x!==m.id);save();go('meds')}}},'Remove')),
      h('div',{cls:'sub'},'Body parts (from label indications): '),...m.parts.map(x=>h('div',{cls:'ev'},PARTS[x.part].name+': “'+x.evidence+'” ',chips(x.cites))),
      h('div',{cls:'sub'},'Food/drink interactions (label text):'),...m.interactions.map(x=>h('div',{cls:'ev'},h('b',{},x.category+': '),'“'+x.text+'” ',chips(x.cites))),
      m.odsInteractions.length?h('div',{cls:'sub'},'Nutrient interactions / depletion (NIH ODS):'):null,...m.odsInteractions.map(x=>h('div',{cls:'ev'},h('b',{},NAME(x.nutrient)+' — '+x.title+': '),'“'+x.text+'” (today: '+Math.round(pcts(t)[x.nutrient]||0)+'% of target) ',chips(x.cites))),
      condLinksForMed(m.id))),
    h('div',{cls:'sub'},'Grapefruit guidance: “'+MEDS.grapefruitNote.text+'” ',chips(MEDS.grapefruitNote.cites))]},
conds(){const sel=h('select',{},h('option',{value:''},'Add a condition…'),...CONDS.conditions.filter(c=>!S.conds.includes(c.id)).map(c=>h('option',{value:c.id},c.name)));
  const t=totals();
  return[h('h2',{},'Health conditions'),h('div',{cls:'disc'},CONDS.note+' These are general guidance that vary by individual; follow your clinician or registered dietitian.'),
    h('div',{cls:'flex'},sel,h('button',{cls:'btn',on:{click:()=>{if(sel.value){S.conds.push(sel.value);save();go('conds')}}}},'Add')),
    ...condObjs().map(c=>h('div',{cls:'item'},h('div',{cls:'flex'},h('h3',{},c.name),h('span',{cls:'tag cond'},'magenta on body'),h('button',{cls:'btn',on:{click:()=>{S.conds=S.conds.filter(x=>x!==c.id);save();go('conds')}}},'Remove')),
      c.id==='preg'?h('div',{cls:'warn'},'Pregnancy targets (RDA/AI for pregnancy) are now used for scoring.'):null,
      h('div',{cls:'sub'},'Affected body parts:'),...c.parts.map(x=>h('div',{cls:'ev'},PARTS[x.part].name+': “'+x.evidence+'” ',chips(x.cites))),
      h('div',{cls:'sub'},'Nutrient guidance:'),...c.rules.map(r=>h('div',{cls:r.type==='limit'?'warn':'ev'},h('b',{},(r.type==='limit'?'Watch/limit ':'Focus on ')+NAME(r.nutrient)+(r.max?' (≤ '+r.max+' mg/day)':'')+(t[r.nutrient]!=null&&DRI[r.nutrient]?' · today '+fmt(t[r.nutrient],r.nutrient):'')+': '),'“'+r.evidence+'” ',chips(r.cites))),
      ...c.medLinks.map(l=>h('div',{cls:'ev'},h('span',{cls:'tag med'},'MED LINK'),' '+l.med+': “'+l.evidence+'” ',chips(l.cites))))),
    condObjs().length?null:h('div',{cls:'sub'},'No conditions selected.')]},
nutr(){const t=totals(),p=pcts(t);return[h('h2',{},'Nutrients & biochemistry'),DISC(),...Object.entries(N).map(([k,n])=>h('div',{cls:'item'},h('div',{cls:'row'},h('b',{},n.name),h('span',{},Math.round(p[k]||0)+'%')),bar(p[k]||0),
  h('div',{cls:'sub'},'Target '+fmt(tgt(k),k)+(ul(k)?' · UL '+fmt(ul(k),k):'')+' ',chips(DRI[k].cites)),DRI[k].ulNote?h('div',{cls:'sub'},DRI[k].ulNote):null,
  h('div',{cls:'ev'},'“'+n.mechanism+'” ',chips(n.mechanismCites)),h('div',{cls:'sub'},'Body parts: '+n.map.map(m=>PARTS[m.part].name).join(', '))))]},

cell(){const t=totals(),p=pcts(t),sc=antiScore(p),pf=P();
  const row=(x,ex)=>h('div',{cls:'ev'},h('b',{},NAME(x.k)+(tgt(x.k)?' — '+Math.round(p[x.k]||0)+'% of target':'')+': '),x.role+'. “'+x.evidence+'” ',chips(x.cites),ex?h('div',{cls:'sub'},'“'+ex.evidence+'” ',chips(ex.cites)):null);
  const pt=proteinT();
  return [NOTMEAS(),h('h2',{},'Cellular Health'),h('div',{cls:'sub'},'Cells are constantly repaired and replaced, and normal metabolism produces reactive oxygen species (free radicals). ','“'+CELL.notes.fr.evidence+' '+(CELL.notes.fr.evidence2||'')+'” ',chips(CELL.notes.fr.cites)),
   h('div',{cls:'flex'},h('div',{style:{flex:'1 1 260px',maxWidth:'360px'}},cellSvg(sc)),h('div',{style:{flex:'1 1 200px'}},h('div',{cls:'big'},'Antioxidant-nutrient score ',h('b',{},Math.round(sc)+'%')),h('div',{cls:'sub'},'Average of today’s % of DRI target (capped at 100%) for: '+ANTIK.filter(k=>tgt(k)).map(NAME).join(', ')+'. Educational only.'),
     h('label',{cls:'chip'},h('input',{type:'checkbox',checked:!!pf.smoke,on:{change:e=>{pf.smoke=e.target.checked;save();go('cell')}}}),' I smoke (adds 35 mg to the vitamin C target)'),
     h('button',{cls:'chip'+(S.view.overlay==='anti'?' on':''),on:{click:()=>{S.view.overlay=S.view.overlay==='anti'?null:'anti';save();go('scan')}}},S.view.overlay==='anti'?'Hide antioxidant overlay':'Show antioxidant overlay on body'))),
   h('h3',{},'Antioxidant defense (nutrients with ODS-described antioxidant roles)'),...CELL.anti.map(x=>row(x,x.k==='zn'?CELL.anti_extra.zn:null)),
   h('div',{cls:'ev'},h('b',{},'Carotenoids: '),'carotenoid data not in the bundled dataset — not scored. '+CELL.carotenoids.note+' “'+CELL.carotenoids.evidence+'” ',chips(CELL.carotenoids.cites)),
   h('h3',{},'Regeneration & repair'),...CELL.regen.map(x=>x.k==='protein'?h('div',{cls:'ev'},h('b',{},'Protein'+(pt?' — '+Math.round(100*(t.protein||0)/pt)+'% of '+Math.round(pt)+' g':'')+': '),x.role+'. “'+x.evidence+'” ',chips(x.cites)):row(x)),
   h('h3',{},'Overlay: eyes'),...CELL.overlay.map(o=>h('div',{cls:'ev'},o.why+'. “'+o.evidence+'” '+(o.evidence2?'“'+o.evidence2+'” ':''),chips(o.cites))),
   h('h3',{},'Cautions — when “antioxidant” supplements can harm'),...CELL.caution.map(c=>{const act=(c.id==='fe-high'&&(t.fe||0)>=45)||(c.id==='vitE-hs'&&ul('vitE')&&(t.vitE||0)>ul('vitE'))||((c.id==='bcar-smoke'||c.id==='smoke-c')&&pf.smoke);return h('div',{cls:act?'warn':'ev'},h('b',{},(act?'⚠ Applies to you today: ':'')+c.title+'. '),'“'+c.evidence+'” ',chips(c.cites))}),DISC()]},


ex(){const G=EXD.guidelines,pg=weekProg(),age=S.profile.age,youth=age>=1&&age<=4,older=age>=6,t=totals();let ft='all',q='';
  const lib=h('div',{}),det=h('div',{});
  const bar=(lbl,v,lo,hi,u)=>h('div',{cls:'pbar'},h('div',{cls:'sub'},lbl+': '+Math.round(v)+' / '+lo+(hi?'–'+hi:'')+' '+u),h('div',{cls:'pb'},h('i',{style:{width:Math.min(100,100*v/lo)+'%'}})));
  const showEx=x=>{UI.exSel=x.id;S.view.overlay='ex';save();
    const mi=h('input',{type:'number',value:x.type==='flexibility'?5:30,min:1,style:{width:'56px'},'aria-label':'Minutes'}),se=h('input',{type:'number',min:0,style:{width:'44px'},'aria-label':'Sets'}),re=h('input',{type:'number',min:0,style:{width:'44px'},'aria-label':'Reps'}),rp=h('input',{type:'number',min:0,max:10,style:{width:'44px'},'aria-label':'RPE'});
    rc(det,h('div',{cls:'item exd'},h('h3',{},x.name),h('div',{cls:'sub'},x.type+' · '+x.met+' METs ('+(x.met>=6?'vigorous':x.met>=3?'moderate':'light')+') — Compendium '+x.code+': “'+x.compDesc+'” ',chips(x.cites)),
      h('div',{},h('span',{cls:'tag exp'},'PRIMARY'),' '+x.primary.join(', ')+(x.secondary.length?'  ':''),x.secondary.length?h('span',{cls:'tag exs'},'SECONDARY'):null,' '+x.secondary.join(', ')+(x.joints.length?' · joints: '+x.joints.join(', '):'')),
      h('div',{cls:'sub'},'Muscle regions on the 3D model are approximate (coarse regions over the Z-Anatomy/BodyParts3D muscle meshes).'),
      h('div',{cls:'flex'},h('label',{},'Min ',mi),h('label',{},'Sets ',se),h('label',{},'Reps ',re),h('label',{},'RPE 0–10 ',rp),
        h('button',{cls:'chip on',on:{click:()=>{const m=+mi.value;if(m>0){S.ex.log.push({d:today(),id:x.id,min:m,sets:+se.value||null,reps:+re.value||null,rpe:rp.value===''?null:Math.min(10,+rp.value)});save();go('ex')}}}},'Log')),
      h('button',{cls:'chip',on:{click:()=>go('scan')}},'View muscles on body')))};
  const draw=()=>rc(lib,...EXD.library.filter(x=>(ft==='all'||x.type===ft)&&(!q||x.name.toLowerCase().includes(q))).map(x=>h('div',{cls:'row exr',role:'button',tabindex:0,on:{click:()=>showEx(x)}},h('span',{},x.name),h('span',{cls:'sub'},x.type+' · '+x.met+' MET'))));
  draw();const tl=S.ex.log.filter(e=>e.d===today());
  const pt=S.profile.wkg||70;
  return [redBanner(),h('div',{cls:'disc'},h('b',{},'Check with a clinician first '),'if you have heart disease, diabetes, kidney disease, or are pregnant. ACSM screening is based on: “'+EXD.safety.screen+'” ',chips(EXD.safety.screenCites),' “'+EXD.safety.chd+'” ',chips(EXD.safety.chdCites),
     S.profile.life==='preg'?h('div',{cls:'ev'},'Pregnancy: “'+EXD.safety.preg+'” ',chips(EXD.safety.pregCites)):h('div',{cls:'sub'},'Pregnancy: ACOG advises discussing exercise with your ob-gyn. ',chips(EXD.safety.pregCites)),' Stop and get help for chest pain, dizziness, or severe shortness of breath.'),
   h('h2',{},'Exercise & Stretching'),
   h('h3',{},'This week (since '+weekStart()+')'),
   age===0?h('div',{cls:'sub'},'No weekly targets are shown for ages 1–3 in this app.'):youth?h('div',{},bar('Active minutes today (moderate+vigorous)',pg.daily[today()]||0,60,0,'min'),bar('Days with vigorous activity',pg.vd,3,0,'days'),bar('Muscle-strengthening days',pg.sd,3,0,'days'),h('div',{cls:'sub'},'“'+(age===1?G.pre+' ':'')+G.youth+' '+G.youthS+'” ',chips(G.cites))):
     h('div',{},bar('Aerobic (moderate-equivalent: moderate + 2× vigorous)',pg.eq,150,300,'min'),h('div',{cls:'sub'},'Moderate '+pg.mod+' min · vigorous '+pg.vig+' min'),bar('Muscle-strengthening days',pg.sd,2,0,'days'),older?bar('Balance-training days (older adults)',pg.bd,1,0,'days'):null,
       h('div',{cls:'sub'},'“'+G.adult+'” “'+G.strength+'”'+(older?' “'+G.older+'”':'')+' ',chips(G.cites)),h('div',{cls:'sub'},'Intensity: “'+G.mod+'” “'+G.vig+'” ',chips(G.cites))),
   h('div',{cls:'flex'},h('button',{cls:'chip'+(S.view.overlay==='ex'&&!UI.exSel?' on':''),on:{click:()=>{UI.exSel=null;S.view.overlay='ex';save();go('scan')}}},'Show weekly trained-muscle heat map'),h('span',{cls:'sub'},'lime = trained 2+ times this week, green = once/secondary')),
   h('h3',{},'Today’s log'),tl.length?tl.map(e=>{const x=EXL.get(e.id);return h('div',{cls:'row'},h('span',{},(x?x.name:e.id)+' · '+e.min+' min'+(e.sets?' · '+e.sets+'×'+(e.reps||'?'):'')+(e.rpe!=null?' · RPE '+e.rpe:'')),h('span',{cls:'sub'},'≈'+Math.round(kcal(e))+' kcal (estimate)'),h('button',{cls:'chip',on:{click:()=>{S.ex.log.splice(S.ex.log.indexOf(e),1);save();go('ex')}}},'✕'))}):h('div',{cls:'sub'},'Nothing logged today.'),
   h('div',{cls:'sub'},EXD.energy+' Uses your profile weight ('+Math.round(pt)+' kg). ',chips(['pacomp-2024'])),
   h('h3',{},'Library ('+EXD.library.length+')'),h('div',{cls:'flex'},h('input',{type:'search',placeholder:'Search exercises','aria-label':'Search exercises',on:{input:e=>{q=e.target.value.toLowerCase();draw()}}}),h('select',{'aria-label':'Type',on:{change:e=>{ft=e.target.value;draw()}}},...[['all','All types'],['cardio','Cardio'],['strength','Strength'],['flexibility','Flexibility'],['balance','Balance']].map(([v,l])=>h('option',{value:v},l)))),det,lib,
   h('h3',{},'Stretching'),h('div',{cls:'ev'},'“'+EXD.stretch.evidence+'” ',chips(EXD.stretch.cites),h('div',{cls:'sub'},EXD.stretch.note)),
   h('h3',{},'Nutrition for training (linked to today’s food log)'),
   ...EXD.nutrition.map(n=>h('div',{cls:'ev'},h('b',{},n.title+': '),'“'+n.evidence+'” ',chips(n.cites),
     n.id==='protein-need'?h('div',{cls:'sub'},'Today: '+Math.round(t.protein||0)+' g protein; '+Math.round(1.4*pt)+'–'+Math.round(2.0*pt)+' g is the ISSN range for exercising individuals at '+Math.round(pt)+' kg. The RDA-based target in your profile is lower ('+(proteinT()?Math.round(proteinT())+' g':'n/a')+').'):
     n.id==='protein-timing'?h('div',{cls:'sub'},'≈'+Math.round(.25*pt)+' g per meal at 0.25 g/kg. Today you logged '+log().length+' food items.'):
     n.id==='fluid'?h('div',{cls:'sub'},'NutriBody does not track fluids.'):
     h('div',{cls:'sub'},n.note+' Today: sodium '+fmt(t.na||0,'na')+', potassium '+fmt(t.k||0,'k')+'.'))),DISC()]},
cyc(){const C0=S.cycle,c=cycStat(),t=totals(),p=pcts(t),dd=C0.days[today()]||{};
  const dIn=(v)=>{const e=h('input',{type:'date',value:v||''});return e};const ds=dIn(today()),de=dIn('');
  const open=c.P0&&c.P0.length&&!c.P0[c.P0.length-1].e?c.P0[c.P0.length-1]:null;
  const setDay=(k,v)=>{C0.days[today()]=Object.assign({},C0.days[today()]||{},{[k]:v});save();go('cyc')};
  const heavy=Object.entries(C0.days).filter(([k,v])=>v.flow==='heavy'&&dnum(today())-dnum(k)<10).length;
  const longP=c.pl&&c.pl.some(x=>x>7)||(open&&dnum(today())-dnum(open.s)+1>7);
  const note=h('textarea',{rows:2,maxlength:1000,'aria-label':'Cycle note',placeholder:'Note for today (stays on this device)…'});note.value=dd.note||'';
  const hasIda=S.conds.includes(CYC.links.cond),hasOc=S.meds.includes(CYC.links.med);
  return [h('div',{cls:'disc red'},h('b',{},'⚠ See a clinician for: '),...CYC.redflags.map(r=>h('div',{cls:'ev'+((r.id==='soak'&&heavy)||(r.id==='long'&&longP)||(r.id==='change'&&c.late>7)?' warn':'')},h('b',{},r.title+'. '),'“'+r.evidence+'” ',chips(r.cites))),'If bleeding is very heavy with chest pain, trouble breathing, or fainting, call 911.'),
   h('h2',{},'Cycle'),h('div',{cls:'disc'},h('b',{},'Estimates only. '),CYC.disclaimer,' Cycle data is stored only in this browser (localStorage) and is never synced or sent anywhere.'),
   h('div',{cls:'flex'},h('div',{cls:'big'},c.day?'Cycle day '+c.day:'No period logged yet'),c.phase?h('span',{cls:'chip on'},'Estimated phase: '+(c.phase==='late'?'past expected length ('+c.late+' days)':c.phase)):null,c.next?h('span',{cls:'sub'},'Estimated next start: '+c.next):null),
   h('div',{cls:'sub'},'Average cycle: '+(c.ac?c.ac.toFixed(1)+' days ('+c.cl.length+' cycles)':'needs 2+ logged starts')+' · Average period: '+(c.ap?c.ap.toFixed(1)+' days':'needs an end date')),
   cycCal(c),
   h('h3',{},'Log a period'),open?h('div',{cls:'flex'},h('span',{},'Period started '+open.s+'. End date: '),de,h('button',{cls:'chip',on:{click:()=>{if(de.value&&de.value>=open.s){open.e=de.value;save();go('cyc')}}}},'Save end')):h('div',{cls:'flex'},h('span',{},'Start: '),ds,h('button',{cls:'chip',on:{click:()=>{if(ds.value){C0.periods.push({s:ds.value,e:null});save();go('cyc')}}}},'Log start')),
   h('div',{},...c.P0.slice(-6).reverse().map(pp=>h('div',{cls:'row'},h('span',{},pp.s+' → '+(pp.e||'ongoing')),h('button',{cls:'chip',on:{click:()=>{C0.periods=C0.periods.filter(x=>x!==pp);save();go('cyc')}}},'Remove')))),
   h('h3',{},'Today'),h('div',{cls:'flex'},h('span',{cls:'sub'},'Flow: '),...['none','spotting','light','medium','heavy'].map(f=>h('button',{cls:'chip'+((dd.flow||'none')===f?' on':''),on:{click:()=>setDay('flow',f)}},f))),
   h('div',{cls:'flex'},...CSYM.map(([k,l])=>h('label',{cls:'chip'+((dd.sym||[]).includes(k)?' on':'')},h('input',{type:'checkbox',checked:(dd.sym||[]).includes(k),on:{change:e=>{const s=new Set(dd.sym||[]);e.target.checked?s.add(k):s.delete(k);setDay('sym',[...s])}}}),' '+l))),
   note,h('button',{cls:'chip',on:{click:()=>setDay('note',note.value)}},'Save note'),
   h('h3',{},'Hormone phases (education)'),h('div',{cls:'sub'},'Typical cycle length: “'+CYC.normal.evidence+'” ',chips(CYC.normal.cites),' '+CYC.normal.note),
   ...CYC.phases.map(ph=>h('div',{cls:'ev'+(c.phase===ph.id?' hit':'')},h('b',{},ph.name+(c.phase===ph.id?' (your estimated phase)':'')+': '),'“'+ph.evidence+'” ',chips(ph.cites))),
   h('button',{cls:'chip'+(S.view.overlay==='cycle'?' on':''),on:{click:()=>{S.view.overlay=S.view.overlay==='cycle'?null:'cycle';save();go('scan')}}},S.view.overlay==='cycle'?'Hide phase overlay':'Show phase on body (reproductive + endocrine)'),
   h('h3',{},'Iron & heavy bleeding'),h('div',{cls:heavy?'warn':'ev'},h('b',{},'Today’s iron: '+Math.round(p.fe||0)+'% of your '+fmt(tgt('fe'),'fe')+' target'+(heavy?' — you logged heavy flow recently.':'.')),' Food alone may not replace heavy losses; ask a clinician about checking for anemia.'),
   ...CYC.iron.map(x=>h('div',{cls:'ev'},'“'+x.evidence+'” ',chips(x.cites))),
   hasIda?h('div',{cls:'xref'},h('span',{cls:'tag'},'CONDITION'),' You listed iron-deficiency anemia; see the Conditions tab.'):null,
   hasOc?h('div',{cls:'xref'},h('span',{cls:'tag'},'MED'),' You listed an estrogen-containing contraceptive. Hormonal birth control changes bleeding patterns, so phase estimates may not apply. “'+CYC.links.medEv+'” ',chips(CYC.links.medCites)):null,
   h('h3',{},'Nutrients & PMS (evidence shown honestly)'),...CYC.nutr.map(x=>h('div',{cls:'ev'},h('b',{},x.title+' ['+x.tier+']: '),'“'+x.evidence+'” ',chips(x.cites),h('div',{cls:'sub'},'Today: '+Math.round(p[x.k]||0)+'% of target. Talk to a clinician before taking supplements.'))),
   h('div',{cls:'sub'},CYC.notsourced),
   h('div',{cls:'flex'},S.profile.sex!=='F'?h('label',{cls:'chip'},h('input',{type:'checkbox',checked:C0.show,on:{change:e=>{C0.show=e.target.checked;save();applyView();go(cycOn()?'cyc':'scan')}}}),' Show Cycle tab'):null,
     h('button',{cls:'chip',on:{click:()=>{if(confirm('Delete all cycle data (periods, flow, symptoms, notes) from this device? Other data is kept.')){C0.periods=[];C0.days={};save();go('cyc')}}}},'Delete cycle data only')),DISC()]},
spir(){const sp=S.spirit;
  if(!sp.on)return [h('h2',{},'Spiritual Health (optional)'),h('div',{cls:'sub'},'An opt-in, faith-inclusive space to track practices such as prayer, meditation, gratitude, worship, time in nature and rest, alongside peer-reviewed research on health associations. Everything stays on this device. Nothing is scored for faith.'),h('button',{cls:'chip on',on:{click:()=>{sp.on=true;save();applyView();go('spir')}}},'Enable Spiritual Health')];
  const d=spirToday(),trad=SPIR.traditions[sp.trad];
  const ck=([id,l])=>h('label',{cls:'chip'+(d[id]?' on':'')},h('input',{type:'checkbox',checked:!!d[id],on:{change:e=>{d[id]=e.target.checked;save();go('spir')}}}),' '+l);
  const j=h('textarea',{rows:4,maxlength:4000,'aria-label':'Private journal',placeholder:'Private journal (stored only on this device)…'});j.value=sp.journal[today()]||'';
  const past=Object.entries(sp.journal).filter(([k,v])=>k!==today()&&v).sort().reverse().slice(0,5);
  const done=new Set(Object.entries(d).filter(([k,v])=>v).map(([k])=>k));
  return [h('h2',{},'Spiritual Health'),h('div',{cls:'disc'},h('b',{},'About the evidence. '),SPIR.note),
   h('h3',{},'Today’s check-in'),h('div',{cls:'flex'},...SPIR.practices.map(ck)),
   h('div',{cls:'flex'},h('span',{cls:'sub'},'Tradition (optional): '),h('select',{'aria-label':'Tradition',on:{change:e=>{sp.trad=e.target.value;save();go('spir')}}},h('option',{value:'',selected:!sp.trad},'None / general'),...Object.entries(SPIR.traditions).map(([k,v])=>h('option',{value:k,selected:sp.trad===k},v.name)))),
   trad?h('div',{},h('div',{cls:'sub'},trad.name+' practices (tracking only; no doctrinal content):'),h('div',{cls:'flex'},...trad.practices.map(ck))):null,
   h('h3',{},'Journal'),j,h('div',{cls:'flex'},h('button',{cls:'chip',on:{click:()=>{sp.journal[today()]=j.value;save();go('spir')}}},'Save entry'),h('span',{cls:'sub'},'Plain text, local only.')),
   ...past.map(([k,v])=>h('div',{cls:'item'},h('div',{cls:'sub'},k),h('div',{},v))),
   h('h3',{},'Research (mapped to nervous, endocrine/HPA and cardiovascular systems)'),
   ...SPIR.findings.map(f=>h('div',{cls:'ev'+(f.practices.some(x=>done.has(x))?' hit':'')},h('b',{},f.title+' ['+f.design+']: '),'“'+f.evidence+'” ',chips(f.cites),h('div',{cls:'sub'},'Body areas: '+f.parts.map(x=>PARTS[x].name).join(', ')))),
   h('div',{cls:'flex'},h('button',{cls:'chip'+(S.view.overlay==='spirit'?' on':''),on:{click:()=>{S.view.overlay=S.view.overlay==='spirit'?null:'spirit';save();go('scan')}}},S.view.overlay==='spirit'?'Hide gold overlay':'Show gold/white overlay on body'),
     h('button',{cls:'chip',on:{click:()=>{sp.on=false;if(S.view.overlay==='spirit')S.view.overlay=null;save();applyView();go('spir')}}},'Disable section (keeps your data)'),
     h('button',{cls:'chip',on:{click:()=>{if(confirm('Delete all spiritual check-ins and journal entries on this device?')){sp.logs={};sp.journal={};save();go('spir')}}}},'Delete my spiritual data'))]},
src(){let sort='tier',ft='all',fa='all';const box=h('div',{});
  const draw=()=>{const L=Object.values(CIT).filter(c=>(ft==='all'||String(c.tier)===ft)&&(fa==='all'||AGE(c)[0]===fa));
    const ord={g:0,y:1,o:2,r:3,u:4};L.sort((a,b)=>sort==='tier'?a.tier-b.tier:ord[AGE(a)[0]]-ord[AGE(b)[0]]||(b.date||'').localeCompare(a.date||''));
    const grp={};for(const c of L)(grp[c.type]=grp[c.type]||[]).push(c);
    box.replaceChildren(h('div',{cls:'sub'},L.length+' sources'),...Object.entries(grp).map(([ty,cs])=>h('div',{},h('h3',{},ty+' ('+cs.length+')'),...cs.map(c=>h('div',{cls:'item'},h('div',{cls:'flex'},chip(c.id),h('span',{},c.title)),h('div',{cls:'sub'},c.publisher+' · '+(c.date||'date unknown')+' · '+c.tierRationale))))))};
  const s=(opts,f)=>h('select',{on:{change:e=>{f(e.target.value);draw()}}},...opts.map(([v,l])=>h('option',{value:v},l)));
  draw();
  return[h('h2',{},'Sources & method'),DISC(),
    h('h3',{},'Method'),h('div',{cls:'sub'},'Food values: USDA FoodData Central SR Legacy (per 100 g). Targets: National Academies DRIs (RDA, or AI where no RDA) for your sex/age band, with pregnancy values when selected; ULs flag intake above the Tolerable Upper Intake Level. Nutrient % is capped at 100. A body part’s score is the weighted average of capped % for nutrients linked to it; a system’s score is the average of its parts. Each nutrient→body-part link was made only when an NIH ODS Health Professional fact sheet sentence mentions that part; the sentence is quoted with its citations. Medication and condition data are quoted from FDA labels, NIH ODS, NIH institute and MedlinePlus pages; claims without a retrievable source were left out.'),
    h('h3',{},'Cooking & preparation method'),h('div',{cls:'sub'},'When a food is logged with a preparation, the app uses the actual USDA SR Legacy cooked entry if one exists (grams = cooked weight); otherwise it applies the USDA Table of Nutrient Retention Factors, Release 6 (2007) for that food group and method (grams = raw weight). Nutrients without a retention factor (e.g. vitamins D, E, K, selenium) are left unchanged. Bioavailability notes (beta-carotene, lycopene, oxalate, phytate, heat-labile vitamins) and food-safety notes (FDA) are shown only where a retrieved source sentence supports them. ',chip('usda-retn6')),
    h('h3',{},'Symptoms method'),h('div',{cls:'sub'},'Each symptom link is a sentence quoted from a retrieved source: NIH ODS fact-sheet “deficiency” and “health risks from excessive intake” sections, the “adverse reactions” section of FDA labels (openFDA/DailyMed), and MedlinePlus/NIDDK/NHLBI symptom pages. Links without a matching source sentence are dropped. Red-flag guidance cites MedlinePlus. Wording is “possibly associated with”; nothing here is a diagnosis.'),
    h('h3',{},'Legend'),h('div',{cls:'sub badgekey'},'Each small gray badge reads: source · year · tier (e.g. “NIH 2021 · T2”). Tap any badge for the full title, publisher, link, age and tier. 3 or more sources collapse into one “N sources” chip — tap to expand. The year is when the source was published or last updated; the 4 tiny bars show freshness (4 = ≤5 years, 3 = 5–10, 2 = 10–15, 1 = >15, ? = unknown). Tier T1–T4 is shown in blue-slate text: darker = stronger evidence. Badge colors never mean good or bad for your body — that is only the green coverage ring and red/amber body ramps.'),
    h('div',{cls:'sub'},'Freshness: ',...[[4,'≤5 y'],[3,'5–10 y'],[2,'10–15 y'],[1,'>15 y'],[0,'unknown']].map(([n,l])=>h('span',{cls:'cite'},h('span',{cls:'yr'},n?'':'?',meter(n)),' '+l))),
    h('div',{cls:'sub'},'Tier: ',...[1,2,3,4].map(t=>h('span',{cls:'cite'},h('span',{cls:'tier tr'+t},'T'+t),' '+TIERLBL[t]))),
    h('div',{cls:'sub'},'Reliability tier: ◆T1 official guidelines, FDA labeling, systematic reviews/meta-analyses · ▲T2 RCTs and authoritative government summaries (NIH ODS, MedlinePlus) · ●T3 observational/cohort studies · ○T4 case reports, narrative reviews, mechanistic/animal studies, expert opinion, or unclassified journal articles. PubMed tiers use PubMed publication types.'),
    h('div',{cls:'flex'},'Sort',s([['tier','by tier'],['age','by age']],v=>sort=v),'Tier',s([['all','all'],['1','T1'],['2','T2'],['3','T3'],['4','T4']],v=>ft=v),'Age',s([['all','all'],['g','≤5y'],['y','5–10'],['o','10–15'],['r','>15'],['u','unknown']],v=>fa=v)),box,
    h('h3',{},'Profile'),profile(),
    h('h3',{},'Privacy'),h('div',{cls:'sub'},'Everything stays on this device (localStorage). No accounts, analytics, cookies or trackers. The only third-party calls are optional barcode lookups and online food searches you turn on (USDA api.nal.usda.gov; Open Food Facts only when you tap it), which send just the search text or barcode number; a Content-Security-Policy blocks all other origins.'),
    h('button',{cls:'btn danger',on:{click:()=>{if(confirm('Delete all your Mosaic Bond data from this device?')){localStorage.removeItem(KEY);location.reload()}}}},'Delete all my data'),
    h('h3',{},'3D model & software licenses'),...MODEL.items.map(x=>h('div',{cls:'item'},h('b',{},x.name),h('div',{cls:'sub'},x.attribution),h('div',{cls:'sub'},'License: '+x.license),h('a',{href:x.url,target:'_blank',rel:'noopener noreferrer'},x.url),x.note?h('div',{cls:'sub'},x.note):null))]}};
function nutSummary(){const t=totals(),p=pcts(t);return h('div',{cls:'nsum'},...Object.keys(DRI).map(k=>{const over=ul(k)&&(t[k]||0)>ul(k);return h('div',{cls:'nrow'},h('div',{cls:'nl'},h('span',{},NAME(k)),h('span',{cls:'nv'},fmt(t[k]||0,k)+' · '+Math.round(p[k]||0)+'%'+(over?(/supplement/i.test(DRI[k].ulNote||'')?' (UL is for supplements only)':' ⚠ above UL'):''))),bar(p[k]||0))}))}
function nutTable(){const t=totals(),p=pcts(t);return h('div',{},...Object.keys(DRI).map(k=>h('div',{},h('div',{cls:'row'},h('span',{},NAME(k)),h('span',{},fmt(t[k]||0,k)+' · '+Math.round(p[k]||0)+'%'+(ul(k)&&(t[k]||0)>ul(k)?(/supplement/i.test(DRI[k].ulNote||'')?' (UL is for supplements only)':' ⚠UL'):''))),bar(p[k]||0))))}
function condLinksForMed(mid){return condObjs().flatMap(c=>c.medLinks.filter(l=>l.med===mid).map(l=>h('div',{cls:'alert'},'Linked to your condition '+c.name+': “'+l.evidence+'” ',chips(l.cites))))}
// v20: age (years) from date of birth -> DRI age band index
function dobAge(d){if(!d||!/^\d{4}-\d{2}-\d{2}$/.test(d))return null;const b=new Date(d+'T12:00:00'),n=new Date();if(isNaN(b)||b>n)return null;let y=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))y--;return y}
const bandOf=y=>y<4?0:y<9?1:y<14?2:y<19?3:y<31?4:y<51?5:y<71?6:7;
function syncDob(){const y=dobAge(S.profile.dob);if(y!=null)S.profile.age=bandOf(y);return y}
function profile(){const pr=S.profile;const ch=()=>{save();applyProfile()};const ay=syncDob();
  const nm=h('input',{type:'text',cls:'search','aria-label':'Name',placeholder:'Your name (optional)',maxlength:'40',autocomplete:'given-name',value:pr.name||'',style:{maxWidth:'220px'}});nm.addEventListener('change',()=>{pr.name=nm.value.trim().slice(0,40);save();buildTabs();if(tab==='me')go('me')});
  const db=h('input',{type:'date','aria-label':'Date of birth',value:pr.dob||'',max:new Date().toISOString().slice(0,10)});db.addEventListener('change',()=>{pr.dob=db.value||'';syncDob();ch();applyView();if(tab==='me')go('me');else if(tab==='set')go('set')});
  const sel=(lbl,opts,val,f)=>h('label',{cls:'pf'},lbl,' ',h('select',{'aria-label':lbl,on:{change:e=>{f(e.target.value);ch()}}},...opts.map(([v,l])=>h('option',{value:v,selected:String(val)===String(v)},l))));
  const lb=pr.unit==='lb';const num=(lbl,val,f,st)=>h('label',{cls:'pf'},lbl,' ',h('input',{type:'number','aria-label':lbl,value:val,step:st,style:{width:'58px'},on:{change:e=>{const v=+e.target.value;if(v>0){f(v);ch()}}}}));
  const ft=Math.floor(pr.hcm/2.54/12),inch=Math.round(pr.hcm/2.54-ft*12);const b=bmi();
  return h('div',{cls:'prof'},
    h('div',{cls:'flex'},h('label',{cls:'pf'},'Name ',nm),h('label',{cls:'pf'},'Date of birth ',db),ay!=null?h('span',{cls:'sub'},'Age '+ay+(ay<1?' (infant DRIs are not covered; using 1–3)':'')):null),
    h('div',{cls:'flex'},sel('Sex',[['F','Female'],['M','Male']],pr.sex,v=>pr.sex=v),ay!=null?h('span',{cls:'pf'},'Age group '+AGES[pr.age]+' (from date of birth)'):sel('Age',AGES.map((a,i)=>[i,a]),pr.age,v=>pr.age=+v),
      pr.sex==='F'&&pr.age>=3&&pr.age<=5?sel('Life stage',[['none','—'],['preg','Pregnant'],['lact','Lactating']],pr.life,v=>pr.life=v):null,pr.sex==='M'?h('label',{cls:'pf'},h('input',{type:'checkbox',checked:!!S.cycle.show,on:{change:e=>{S.cycle.show=e.target.checked;save();applyView()}}}),' Show Cycle tab'):null),
    h('div',{cls:'flex'},lb?[num('Height ft',ft,v=>pr.hcm=(v*12+inch)*2.54,1),num('in',inch,v=>pr.hcm=(ft*12+v)*2.54,1)]:num('Height cm',Math.round(pr.hcm),v=>pr.hcm=v,1),
      num(lb?'Weight lb':'Weight kg',lb?Math.round(pr.wkg*2.2046):Math.round(pr.wkg*10)/10,v=>pr.wkg=lb?v/2.2046:v,lb?1:.5),
      h('button',{cls:'chip',on:{click:()=>{pr.unit=lb?'kg':'lb';ch()}}},lb?'Units: lb/ft → kg/cm':'Units: kg/cm → lb/ft')),
    h('div',{cls:'sub'},'Targets and ULs use the National Academies DRI values for this sex and age band'+(life()?' ('+(life()==='P'?'pregnancy':'lactation')+')':'')+', as tabulated in the NIH ODS fact sheets. ',chips(['nasem-dri'])),
    h('div',{cls:'sub'},'Protein: '+(proteinT()?Math.round(proteinT())+' g/day ('+(pr.age===3?'0.85':'0.8')+' g/kg × '+Math.round(pr.wkg)+' kg; RDA)':'no weight-based target shown for this age/life stage')+' ',chips(['ods-exercise'])),
    h('div',{cls:'sub'},'BMI '+b.toFixed(1)+(pr.age>=4?' · NHLBI adult category: “'+BMINAME(b)+'” ('+BMICAT(b)+')':' · for people under 20, BMI is read against age- and sex-specific growth-chart percentiles, which this app does not compute')+'. BMI is a screening number; it “doesn’t take into account your muscle mass, bone density, or body composition.” ',chips(['nhlbi-bmi'])),
    h('div',{cls:'sub'},'3D body: height, head-to-body ratio (age) and skin-shell girth (BMI) are a visual approximation. Internal anatomy is one adult male (Z-Anatomy/BodyParts3D) and is not age- or weight-specific. Female view: uterus, cervix, vagina, fallopian tubes and ovaries are real meshes from the Visible Human Female (HuBMAP HRA), scaled to fit; the pelvis stays male and breast shape is approximate.'))}
function applyProfile(){syncDob();const pr=S.profile;const REF=pr.sex==='M'?175:162;const HF=[.2,.167,.154,.139,.133,.133,.133,.133];
  body.setMorph({sex:pr.sex,stature:Math.min(1.25,Math.max(.4,pr.hcm/REF*(pr.age<4?1:1))),headFrac:HF[pr.age],bmi:bmi()});
  applyView();if(typeof go==='function'&&tab)go(tab)}
// ---------- first launch
function firstLaunch(){if(S.ack)return;const m=document.getElementById('modal');m.replaceChildren(h('div',{cls:'box'},h('h2',{},'Welcome to Mosaic Bond'),h('div',{cls:'sub'},'Before you start:'),DISC(),h('div',{cls:'sub'},'Your data never leaves this device.'),h('button',{cls:'btn',on:{click:()=>{S.ack=true;save();m.classList.add('hidden')}}},'I understand')));m.classList.remove('hidden')}
// ---------- v19 sections
const X19={};
{const _tot=totals;totals=function(){return X19.addSupp?X19.addSupp(_tot()):_tot()}}
Object.assign(X19,{h,rc,chips,S,save,today,go,body,PARTS,EXL,EXD,DISC,NAME,fmt,ul,DRI,medObjs,MEDS,P,preg,CIT,V:V19,weekProg,cycOn,cycStat,FOOD,log,totals:()=>totals(),refresh:()=>refresh3d()});
Object.assign(RENDER,install19(X19));
TABS.push(['act','Activity'],['sleep','Sleep'],['rec','Recovery'],['hyd','Hydration'],['supp','Supplements'],['labs','Labs'],['mood','Mood'],['caf','Caffeine & alcohol'],['ah','Apple Health']);
TABS.push(['me','My profile'],['macro','Macros'],['learn','Learn']);for(const t of TABS)TLAB[t[0]]=t[1];
GROUPS.splice(0,GROUPS.length,['body','Body',['scan']],['food','Food',['log','macro','nutr','hyd','caf','supp']],['health','Health',['labs','meds','conds','symp','onc']],['track','Track',['act','sleep','rec','labs','ex','cyc','mood','spir']],['more','More',['me','learn','cell','ah','src','set']]);
buildTabs();
go("scan");firstLaunch();X19.hashImport&&X19.hashImport();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
// ---------- v20 plain language: "In plain words" lines (data/plain.json), tap-to-explain glossary, Learn section, SOD
const plainOn=()=>S.view.plain!==false;
const GL=PL.glossary,GKEYS=Object.keys(GL).sort((x,y)=>y.length-x.length);
const GRE=new RegExp('(?<![\\w-])('+GKEYS.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+(/^[A-Z0-9]+$/.test(k)?'':'(?:e?s)?')).join('|')+')(?![\\w-])','gi');
const gkey=m=>{if(GL[m])return m;const l=m.toLowerCase();for(const k of GKEYS){if(/^[A-Z0-9]+$/.test(k)){if(m===k)return k;continue}if(l===k.toLowerCase()||l===k.toLowerCase()+'s'||l===k.toLowerCase()+'es')return k}return null};
const PKEYS=Object.keys(PL.plain);
function plainFor(q){q=q.trim();if(PL.plain[q])return[PL.plain[q]];return PKEYS.filter(k=>k.length>30&&q.includes(k)).map(k=>PL.plain[k])}
function enhance(root){if(!root)return;
  if(plainOn())for(const el of root.querySelectorAll('.ev,.sub,.warn,.disc')){if(el.dataset.pl)continue;el.dataset.pl=1;const cl=el.cloneNode(true);cl.querySelectorAll('.ev,.sub,.warn,.disc,.plain').forEach(c=>c.remove());const t=cl.textContent;const out=[];for(const m of t.matchAll(/“([^”]{20,})”/g))for(const p of plainFor(m[1]))if(!out.includes(p))out.push(p);
    if(out.length)el.append(h('div',{cls:'plain'},h('b',{},'In plain words: '),out.join(' ')))}
  const seen=new Set();const W=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest('button,a,input,select,textarea,option,svg,.gl,.cite,.chip,.ptitle,h2,label,#glpop,.nogl'))return NodeFilter.FILTER_REJECT;return n.nodeValue.length>1?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
  const nodes=[];while(W.nextNode())nodes.push(W.currentNode);
  for(const n of nodes){const s=n.nodeValue;GRE.lastIndex=0;let m,last=0,frag=null;
    while((m=GRE.exec(s))){const k=gkey(m[1]);if(!k||seen.has(k))continue;seen.add(k);frag=frag||document.createDocumentFragment();frag.append(s.slice(last,m.index),h('abbr',{cls:'gl',tabindex:0,role:'button','data-g':k,title:GL[k][0]},m[1]));last=m.index+m[1].length}
    if(frag){frag.append(s.slice(last));n.replaceWith(frag)}}}
const glpop=h('div',{id:'glpop',cls:'hidden',role:'dialog'});document.body.append(glpop);
function showGl(el){const k=el.dataset.g,g=GL[k];if(!g)return;rc(glpop,h('b',{},g[0]+(g[0].toLowerCase()!==k.toLowerCase()?' ('+k+')':'')),h('div',{},g[1]),h('div',{cls:'flex'},h('button',{cls:'chip',on:{click:()=>{glpop.classList.add('hidden');UI.lq=k;go('learn')}}},'Glossary ›'),h('button',{cls:'chip',on:{click:()=>glpop.classList.add('hidden')}},'Close')));
  glpop.classList.remove('hidden');const r=el.getBoundingClientRect(),W=innerWidth;glpop.style.left=Math.max(8,Math.min(W-288,r.left-20))+'px';const below=r.bottom+8,ph=glpop.offsetHeight;glpop.style.top=(below+ph>innerHeight-8?Math.max(8,r.top-ph-8):below)+'px'}
document.addEventListener('click',e=>{const g=e.target.closest&&e.target.closest('abbr.gl');if(g){e.preventDefault();e.stopPropagation();showGl(g);return}if(!e.target.closest('#glpop'))glpop.classList.add('hidden')},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('abbr.gl'))showGl(e.target)});
for(const id of['pages','panel']){const el=document.getElementById(id);if(!el)continue;let q=0;const mo=new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;mo.disconnect();try{enhance(el)}finally{mo.observe(el,{childList:true,subtree:true})}})});mo.observe(el,{childList:true,subtree:true})}
function sodCard(){const s=PL.sod,f=s.evidence.filter(e=>e.form);return h('div',{cls:'ev sodcard'},h('b',{},'SOD (superoxide dismutase) — an antioxidant enzyme your body makes'),
  ...s.evidence.filter(e=>!e.form).slice(0,2).map(e=>h('div',{cls:'sub'},'“'+e.q+'” ',chips(e.cites))),
  h('div',{cls:'sodforms'},...f.map(e=>h('div',{cls:'sodf'},h('b',{},e.form),h('div',{cls:'sub'},'“'+e.q+'” ',chips(e.cites))))),
  h('div',{cls:'sub'},'Nutrient cofactors: ',...Object.entries(s.nutrients).map(([k,v])=>h('button',{cls:'chip',on:{click:()=>go('nutr')}},NAME(k)+' → '+v))),
  h('div',{cls:'sub'},'“'+s.evidence[5].q+'” ',chips(s.evidence[5].cites)))}
{const oc=RENDER.cell;RENDER.cell=function(){const out=oc.call(this);const i=out.findIndex(e=>e&&e.textContent&&e.textContent.startsWith('Carotenoids:'));out.splice(i<0?out.length-1:i,0,sodCard());return out}}
{const on=RENDER.nutr;RENDER.nutr=function(){const out=on.call(this);for(const el of out){const b=el&&el.querySelector&&el.querySelector('.row b');if(!b)continue;const k=Object.keys(PL.sod.nutrients).find(k=>N[k]&&N[k].name===b.textContent);
  if(k)el.append(h('div',{cls:'ev'},h('b',{},'Cofactor for SOD: '),'needed by '+PL.sod.nutrients[k]+', an antioxidant enzyme. “'+PL.sod.evidence[k==='mn'?3:2].q+'” ',chips(['pmid-29669742']),' ',h('button',{cls:'chip',on:{click:()=>go('cell')}},'SOD in Cellular ›')))}return out}}
{const os=RENDER.set;RENDER.set=function(){const out=os.call(this);const i=out.findIndex(e=>e&&e.textContent==='Profile');out.splice(i<0?3:i,0,h('h3',{},'Reading help'),h('div',{cls:'flex'},...[['on','Show plain-language explanations'],['off','Hide']].map(([v,l])=>h('button',{cls:'chip'+((plainOn()?'on':'off')===v?' on':''),on:{click:()=>{S.view.plain=v==='on';save();go('set')}}},l))),h('div',{cls:'sub'},'Adds an “In plain words” line under quoted sources. Underlined terms can be tapped for a definition either way.'));return out}}
RENDER.learn=()=>{const q=h('input',{type:'search',cls:'search nogl','aria-label':'Search Learn and glossary',placeholder:'Search terms and topics (e.g. ROS, UL, SOD)',value:UI.lq||''});const box=h('div',{});
  const draw=()=>{const s=q.value.trim().toLowerCase();UI.lq=q.value;const L=PL.learn.filter(l=>!s||(l.title+' '+l.body.join(' ')).toLowerCase().includes(s));const G=Object.entries(GL).filter(([k,v])=>!s||(k+' '+v.join(' ')).toLowerCase().includes(s)).sort((x,y)=>x[0].localeCompare(y[0],undefined,{sensitivity:'base'}));
    rc(box,h('h3',{},'Explainers'),...(L.length?L.map(l=>h('details',{cls:'card learn',open:!!s},h('summary',{},l.title),...l.body.map(p=>h('p',{},p)),l.cites.length?h('div',{cls:'sub'},'Sources: ',chips(l.cites)):null)):[h('div',{cls:'sub'},'No explainers match.')]),
      h('h3',{},'Glossary A–Z ('+G.length+')'),...G.map(([k,v])=>h('div',{cls:'item gli nogl'},h('b',{},k),v[0].toLowerCase()!==k.toLowerCase()?h('span',{cls:'sub'},' — '+v[0]):null,h('div',{},v[1]))))};
  q.addEventListener('input',draw);draw();return[h('div',{cls:'ptitle'},'Learn'),h('div',{cls:'sub nogl'},'Plain-language explainers and definitions for terms used in Mosaic Bond. Educational only, not medical advice.'),q,box,DISC()]};

document.getElementById('resetv').addEventListener('click',()=>body.resetCam());
window.__nb={openScanner,SC,FOOD,CIT,canFlags,CAN,weekProg,EXD,UI,cycStat,buildTabs,CELL,SPIR,S,save,go,openPart,openSystem,refresh3d,closePanel,applyView,applyProfile,tgt,proteinT,body,X19};

// v20 Macros: totals from logged foods (USDA SR Legacy per-100 g values); targets from NASEM DRI (2005 macronutrient report) and DGA 2020-2025
function macroT(){const t=totals(),pr=S.profile,y=dobAge(pr.dob),age=y!=null?y:[2,6,11,16,25,40,60,75][pr.age],adult=age>=19,ht=pr.hcm/100,wt=pr.wkg;
  const eer=adult?Math.round(pr.sex==='M'?662-9.53*age+1.11*(15.91*wt+539.6*ht):354-6.91*age+1.12*(9.36*wt+726*ht)):null;
  const kc=t.kcal||0,pk=(t.protein||0)*4,ck=(t.carb||0)*4,fk=(t.fat||0)*9,sum=pk+ck+fk;
  return{t,eer,kc,sum,split:{protein:pk,carb:ck,fat:fk},prot:proteinT(),fiberT:Math.round(14*(eer||2000)/1000),adult}}
const MC={protein:'#2f7d6d',carb:'#e2b44a',fat:'#d06a5a'};
function ring(split,sum){const r=34,C=2*Math.PI*r;let off=0;const NS='http://www.w3.org/2000/svg',sv=document.createElementNS(NS,'svg');sv.setAttribute('viewBox','0 0 90 90');sv.setAttribute('width','96');sv.setAttribute('height','96');sv.setAttribute('role','img');sv.setAttribute('aria-label','Calories from protein, carbohydrate and fat');
  const ci=(col,len)=>{const e=document.createElementNS(NS,'circle');for(const[k,v]of Object.entries({cx:45,cy:45,r,fill:'none',stroke:col,'stroke-width':12,'stroke-dasharray':len+' '+(C-len),'stroke-dashoffset':-off,transform:'rotate(-90 45 45)'}))e.setAttribute(k,v);sv.append(e);off+=len};
  ci('#e6e9ee',sum?0:C);if(sum)for(const k of['protein','carb','fat'])ci(MC[k],C*split[k]/sum);return sv}
function macroMini(){const m=macroT();const pc=k=>m.sum?Math.round(100*m.split[k]/m.sum)+'%':'—';
  return h('div',{cls:'card macmini',role:'button',tabindex:0,on:{click:()=>go('macro')}},h('b',{},Math.round(m.kc)+' kcal'),m.eer?h('span',{cls:'sub'},' of ~'+m.eer+' est.'):null,
   ...['protein','carb','fat'].map(k=>h('span',{cls:'mm'},h('i',{style:{background:MC[k]}}),({protein:'Protein ',carb:'Carbs ',fat:'Fat '})[k]+Math.round(m.t[k]||0)+' g · '+pc(k))),h('span',{cls:'sub'},'Macros ›'))}
RENDER.macro=()=>{const m=macroT(),t=m.t,g=k=>t[k]||0,pc=k=>m.sum?Math.round(100*m.split[k]/m.sum):0;
  const row=(lbl,val,unit,tgt,note,cites)=>h('div',{cls:'item'},h('div',{cls:'row'},h('b',{},lbl),h('span',{},(val==null?'—':Math.round(val*10)/10)+' '+unit+(tgt?' / '+tgt:''))),tgt&&typeof tgt==='string'?null:null,note?h('div',{cls:'sub'},note,' ',chips(cites||[])):chips(cites||[]));
  const amdr=(k,lo,hi)=>{const p=pc(k);return m.sum?(p+'% of calories (AMDR '+lo+'–'+hi+'%'+(p<lo?', below range':p>hi?', above range':', within range')+')'):'AMDR '+lo+'–'+hi+'% of calories'};
  return[h('div',{cls:'ptitle'},'Macros'),h('div',{cls:'disc'},'Today’s totals from your Food log. Estimates for general information, not medical advice.'),
   h('div',{cls:'card flex macring'},ring(m.split,m.sum),h('div',{},h('div',{cls:'hello'},Math.round(m.kc)+' kcal'),
     ...['protein','carb','fat'].map(k=>h('div',{cls:'mm'},h('i',{style:{background:MC[k]}}),({protein:'Protein',carb:'Carbohydrate',fat:'Fat'})[k]+' '+pc(k)+'%')))),
   row('Calories',m.kc,'kcal',m.eer?'~'+m.eer+' kcal/day est.':null,m.eer?'Estimated Energy Requirement from the DRI EER equation for your age, sex, height and weight at a “low active” level. An estimate only; needs vary with activity and body composition.':'EER estimate is shown for ages 19+ (set your date of birth in My profile).',['nasem-macro']),
   row('Protein',g('protein'),'g',m.prot?Math.round(m.prot)+' g RDA':null,'RDA 0.8 g per kg body weight for adults · '+amdr('protein',10,35),['nasem-macro','nasem-dri']),
   row('Carbohydrate (total)',g('carb'),'g',null,amdr('carb',45,65),['nasem-macro']),
   row('  Fiber',g('fiber'),'g',m.fiberT+' g AI','AI 14 g per 1,000 kcal'+(m.eer?' (from your EER)':' (at 2,000 kcal)'),['nasem-macro']),
   row('  Total sugars',g('sugar'),'g',null,'USDA SR Legacy reports total sugars, not added sugars. Dietary Guidelines: keep added sugars under 10% of calories'+(m.eer?' (< '+Math.round(m.eer*.1/4)+' g/day at your EER)':'')+'.',['dga-2020','usda-fdc']),
   row('Fat (total)',g('fat'),'g',null,amdr('fat',20,35),['nasem-macro']),
   row('  Saturated fat',g('satfat'),'g',m.eer?'< '+Math.round(m.eer*.1/9)+' g':null,'Dietary Guidelines: under 10% of calories'+(m.kc?' · today '+Math.round(100*g('satfat')*9/m.kc)+'%':''),['dga-2020']),
   row('  Trans fat',t.transfat,'g',null,'Not reported for every food in SR Legacy, so this can undercount.',['usda-fdc']),
   h('div',{cls:'sub'},'Sodium, cholesterol and water appear under Nutrients and Hydration. Food values: USDA FoodData Central SR Legacy. ',chips(['usda-fdc'])),DISC()]};
RENDER.me=()=>{const n=(S.profile.name||'').trim();return [h('div',{cls:'ptitle'},'My profile'),h('div',{cls:'hello'},n?'Hi, '+n+' 👋':'Hi there 👋'),
 h('div',{cls:'sub'},'Your age group, height and weight set your nutrient targets, protein target, hydration and calorie-burn estimates, and the 3D body shape.'),profile(),
 h('div',{cls:'sub'},'🔒 Your name, birth date, height and weight stay on this device only (localStorage). Nothing is uploaded.'),
 h('div',{cls:'flex'},h('button',{cls:'chip',on:{click:()=>{if(confirm('Clear your name and date of birth from this device?')){delete S.profile.name;delete S.profile.dob;save();applyView();go('me')}}}},'Clear name & birth date'),
  h('button',{cls:'btn danger',on:{click:()=>{if(confirm('Delete all your Mosaic Bond data from this device?')){localStorage.removeItem(KEY);location.reload()}}}},'Delete all my data')),DISC()]};
RENDER.set=()=>{const th=S.view.theme==='dark'?'dark':'light';const seg=(cur,opts,f)=>h('div',{cls:'flex'},...opts.map(([v,l])=>h('button',{cls:'chip'+(cur===v?' on':''),on:{click:()=>{f(v);save();go('set')}}},l)));
 return [h('div',{cls:'ptitle'},'Settings'),h('h3',{},'Appearance'),seg(th,[['light','Light'],['dark','Dark']],v=>{S.view.theme=v;document.documentElement.dataset.theme=v}),
 h('h3',{},'3D body style'),seg(S.view.style,[['real','Realistic'],['holo','Holographic']],v=>{S.view.style=v;applyView()}),h('div',{cls:'sub'},'Color-by-system and skin opacity are in the View menu on the Body screen.'),
 h('h3',{},'Profile'),profile(),h('h3',{},'Privacy'),h('div',{cls:'sub'},'Everything stays on this device (localStorage). No accounts, analytics, cookies or trackers. Camera images from the barcode scanner are never stored or sent. Apple Health files and Shortcut data are read inside this browser and stored only here (delete them any time in More › Apple Health). Photos read for autofill are processed on this device and discarded unless you choose to attach a compressed copy; attached copies are erased by “Delete all my data”.'),
 h('h3',{},'Barcode lookup'),seg(S.lookup.fdc?'on':'off',[['off','Off'],['on','USDA lookup on']],v=>{S.lookup.fdc=v==='on'}),
 h('div',{cls:'sub'},'When on, a scanned barcode number (only that, plus an API key) is sent to USDA FoodData Central (api.nal.usda.gov). The shared DEMO_KEY is heavily rate-limited; a free personal key from api.data.gov raises the limit. Open Food Facts is used only when you tap it after a miss. ',chip('usda-fdc')),
 (()=>{const k=h('input',{type:'text','aria-label':'api.data.gov key',placeholder:'Optional api.data.gov key (stored on this device)',value:S.lookup.key||'',cls:'search',autocomplete:'off'});k.addEventListener('change',()=>{S.lookup.key=k.value.trim();save()});return k})(),
 h('button',{cls:'btn danger',on:{click:()=>{if(confirm('Delete all your Mosaic Bond data from this device?')){localStorage.removeItem(KEY);location.reload()}}}},'Delete all my data'),DISC()]};

/* v20: Exposures + Connective tissue */
S.exp=Object.assign({on:{},d:{}},S.exp||{});
const expOn=()=>EXP.exposures.filter(e=>S.exp.on[e.id]);
{const a=ovParts,b=ovScores,c=ovHues;
 ovParts=function(o){return o==='exp'?[...new Set(expOn().flatMap(e=>e.parts))]:a(o)};
 ovScores=function(o,p){if(o!=='exp')return b(o,p);const ps=ovParts('exp'),s={};for(const id in PARTS)s[id]=ps.includes(id)?75:4;return s};
 ovHues=function(o){if(o!=='exp')return c(o);const ps=ovParts('exp');return Object.fromEntries(Object.keys(PARTS).map(i=>[i,ps.includes(i)?0x2aa3a3:0xb8bec8]))}}
const pq=(q,ci,pl)=>h('div',{cls:'ev'},'“'+q+'” ',chip(ci),pl?h('div',{cls:'plain'},h('b',{},'In plain words: '),pl):null);
TABS.push(['exp','Exposures'],['conn','Connective tissue']);TLAB.exp='Exposures';TLAB.conn='Connective tissue';
for(const g of GROUPS){if(g[0]==='track')g[2].push('exp');if(g[0]==='more')g[2].splice(3,0,'conn')}
RENDER.exp=()=>{const out=[h('div',{cls:'ptitle'},'Exposures'),h('div',{cls:'sub'},'Turn on what applies to you. You’ll see sourced safety facts and the affected body areas. Educational only — not a diagnosis. Saved only on this device.')];
 for(const f of EXP.flags.filter(f=>S.exp.on[f.for]))out.push(h('div',{cls:'warn redflag',role:'alert'},h('b',{},'🚨 '+f.t),h('div',{},'“'+f.q+'” ',chip(f.c)),h('div',{cls:'sub'},'If someone is unconscious, not breathing, or having a seizure, call 911. Poison Control: 1-800-222-1222.')));
 for(const e of EXP.exposures){const on=!!S.exp.on[e.id],d=S.exp.d[e.id]||(S.exp.d[e.id]=[]);
  out.push(h('div',{cls:'card expc'},h('label',{cls:'flex'},h('input',{type:'checkbox',checked:on,'aria-label':e.name,on:{change:ev=>{S.exp.on[e.id]=ev.target.checked;save();go('exp')}}}),h('b',{},' '+e.name)),
   on?h('div',{cls:'flex'},...e.chips.map(k=>h('button',{cls:'chip'+(d.includes(k)?' on':''),'aria-pressed':String(d.includes(k)),on:{click:()=>{const i=d.indexOf(k);i<0?d.push(k):d.splice(i,1);save();go('exp')}}},k))):null,
   ...(on?e.facts.filter(f=>!f[3]||f[3]==='lead'?(f[3]!=='lead'||d.includes('Metals / lead')||!d.length):(d.includes(f[3])||!d.length)).map(f=>pq(f[0],f[1],f[2])):[]),
   on?h('div',{cls:'sub'},e.note):null)) }
 out.push(h('div',{cls:'flex'},h('button',{cls:'chip'+(S.view.overlay==='exp'?' on':''),on:{click:()=>{S.view.overlay=S.view.overlay==='exp'?null:'exp';save();go('scan')}}},S.view.overlay==='exp'?'Hide exposures on body':'Show affected areas on body (teal)'),h('button',{cls:'chip',on:{click:()=>go('cell')}},'Oxidative stress & antioxidants (Cellular) ›')));
 out.push(DISC());return out};
RENDER.conn=()=>{const C=EXP.connective;return [h('div',{cls:'ptitle'},'Connective tissue'),
 h('div',{cls:'sub'},'Tendons, ligaments, cartilage and fascia hold the body together. They are built mostly from collagen (strength) with elastin (stretch-and-recoil).'),
 ...C.parts.map(x=>h('div',{},h('h3',{},x[0]),pq(x[1],x[2],x[3]))),
 h('h3',{},'Nutrients that help build it'),...C.nutr.map(x=>h('div',{},h('button',{cls:'chip',on:{click:()=>go(x[0]==='protein'?'macro':'nutr')}},NAME(x[0])+' ›'),pq(x[1],x[2],x[3]))),
 h('div',{cls:'sub'},'Manganese is not listed here because we did not find a reliable source tying it to connective tissue in this app’s citation set.'),
 h('h3',{},'Collagen supplements'),pq(C.supp[0],C.supp[1],C.supp[2]),pq(C.supp2[0],C.supp2[1],'So far, collagen pills have limited, mixed evidence; protein from food plus vitamin C covers the building blocks.'),
 h('h3',{},'Flexibility'),pq(C.flex[0],C.flex[1],C.flex[2]),
 h('div',{cls:'flex'},h('button',{cls:'chip',on:{click:()=>go('ex')}},'Stretching & exercise ›'),h('button',{cls:'chip',on:{click:()=>go('rec')}},'Recovery ›'),h('button',{cls:'chip',on:{click:()=>openPart('skin')}},'Skin ›')),
 h('div',{cls:'sub'},'3D body: there are no separate tendon, ligament or cartilage meshes in this model yet, so tapping the body can’t select them; this part highlights with the muscles and bones.'),DISC()]};
{const op=openPart;openPart=function(id){if(id==='connective'){go('conn');return}op(id);if(id==='skin'||id==='muscles'||id==='bones'){panel.append(h('button',{cls:'chip',on:{click:()=>{closePanel();go('conn')}}},'Connective tissue (tendons, ligaments, cartilage) ›'))}}}
{const om=RENDER.me;RENDER.me=function(){const o=om.call(this);o.splice(2,0,h('button',{cls:'chip',on:{click:()=>go('exp')}},'My exposures (sun, chemicals, environment) ›'));return o}}

/* v20: Food ideas */
TABS.push(['ideas','Food ideas']);TLAB.ideas='Food ideas';for(const g of GROUPS)if(g[0]==='food')g[2].splice(1,0,'ideas');
const MICRO=Object.keys(N).filter(k=>k!=='omega3'&&k!=='choline');
const PROC=/bacon|sausage|\bham\b|frankfurter|hot dog|salami|bologna|pepperoni|jerky|luncheon|cured/i,MERC=/king mackerel|marlin|orange roughy|shark|swordfish|tilefish|bigeye/i,TYR=/cheese|salami|sauerkraut|soy sauce|miso|tempeh|cured|aged/i;
function servOf(f){const p=(f.portions||[]).find(x=>x.g>=20&&x.g<=300)||{label:'100 g',g:100};return p}
function foodSafety(f,nk,amt){const w=[],meds=medObjs(),cat=c=>meds.filter(m=>m.interactions.some(i=>i.category===c));
 const per=x=>(f.per100g[x]||0)*servOf(f).g/100;
 if(per('vitK')>30)for(const m of cat('vitaminK'))w.push([m.name+': keep vitamin K intake steady — don’t suddenly add large amounts. Ask your prescriber/pharmacist.',m.interactions.find(i=>i.category==='vitaminK').cites]);
 if(/grapefruit/i.test(f.name))for(const m of cat('grapefruit'))w.push([m.name+' label mentions grapefruit. Ask your pharmacist before eating it.',m.interactions.find(i=>i.category==='grapefruit').cites]);
 if(per('k')>300){for(const m of cat('potassium'))w.push([m.name+' label mentions potassium. High-potassium foods may need limits — ask your clinician.',m.interactions.find(i=>i.category==='potassium').cites]);if(S.conds.some(c=>c==='ckd'||c==='dialysis'))w.push(['Kidney disease: potassium may need to be limited. Follow your care team’s plan.',['ods-k']])}
 if(TYR.test(f.name))for(const m of cat('tyramine'))w.push([m.name+': aged/fermented foods can be high in tyramine. Follow your label’s food list.',m.interactions.find(i=>i.category==='tyramine').cites]);
 return w}
function ideaList(nk,n=6){const T=tgt(nk),U=ul(nk),t=totals(),preg=S.profile.pregnant||S.conds.includes('preg');const out=[];
 for(const f of FOOD.values()){if(!f.per100g||!(f.per100g[nk]>0)||PROC.test(f.name)||(preg&&MERC.test(f.name)))continue;const sv=servOf(f),a=f.per100g[nk]*sv.g/100;
  if(U&&!/supplement/i.test(DRI[nk].ulNote||'')&&(t[nk]||0)+a>U)continue;out.push({f,sv,a,pc:T?100*a/T:0})}
 return out.sort((x,y)=>y.a-x.a).slice(0,n)}
function ideaRow(nk,o){const{f,sv,a,pc}=o,pr=PREP.prep&&PREP.prep[f.fdcId],alt=pr&&pr.find(x=>x.id==='boiled'&&x.mode!=='none');let altTxt=null;
 if(alt){try{const v=itemNut({fdcId:f.fdcId,grams:sv.g,prep:'boiled'}).n[nk];if(v!=null)altTxt=' · boiled: '+Math.round(100*v/tgt(nk))+'%'}catch(e){}}
 const w=foodSafety(f,nk,a);
 return h('div',{cls:'idea'},h('div',{cls:'flex'},h("b",{},f.name.split(",").slice(0,2).join(",")),h('span',{cls:'pill'},sv.label),h('span',{cls:'pill amberp'},Math.round(pc)+'% of target'+(alt?' (raw)':'')),altTxt?h('span',{cls:'sub'},altTxt):null,
  h('button',{cls:'btn',on:{click:()=>{log().push({fdcId:f.fdcId,grams:sv.g,label:sv.label+' ×1',prep:'asis'});save();go('ideas')}}},'Log it'),chip('usda-fdc')),
  ...w.map(x=>h('div',{cls:'warn'},'⚠ '+x[0]+' ',chips(x[1]))))}
UI.ideaN=UI.ideaN||null;
RENDER.ideas=()=>{const p=pcts(totals()),low=MICRO.filter(k=>tgt(k)&&(p[k]||0)<50).sort((a,b)=>(p[a]||0)-(p[b]||0));
 const out=[h('div',{cls:'ptitle'},'Food ideas'),h('div',{cls:'plain'},h('b',{},'In plain words: '),'Foods that are naturally high in the vitamins and minerals you’re low on today. Amounts are for a typical serving from USDA FoodData Central.'),
  h('h3',{},'You’re low today'),low.length?h('div',{cls:'sub'},'Under 50% of your daily target so far (based only on what you logged). Tap a nutrient to see where it acts on the body.'):h('div',{cls:'sub'},'Nothing is under 50% of target today. 🎉')];
 for(const k of low.slice(0,6)){out.push(h('div',{cls:'lowcard'},h('div',{cls:'flex'},h('button',{cls:'chip lowchip',on:{click:()=>{body.setSelected(new Set(N[k].map.map(m=>m.part)));go('scan')}}},NAME(k)+' · '+Math.round(p[k]||0)+'% ›'),chip(N[k].map[0]?.odsCite||'ods-'+k)),...ideaList(k,3).map(o=>ideaRow(k,o))))}
 const sel=h('select',{'aria-label':'Nutrient',on:{change:e=>{UI.ideaN=e.target.value;go('ideas')}}},...MICRO.map(k=>h('option',{value:k,selected:(UI.ideaN||low[0]||'mg')===k},NAME(k))));
 const nk=UI.ideaN||low[0]||'mg';
 out.push(h('h3',{},'Browse by nutrient'),sel,h('div',{cls:'sub'},'Top foods per typical serving. Food-source tables: ',chip(N[nk].map[0]?.odsCite||'ods-'+nk),' ',chip('usda-fdc')),...ideaList(nk,8).map(o=>ideaRow(nk,o)),
  h('div',{cls:'sub'},'Left out on purpose: processed meats (IARC Group 1) ',chip('iarc-list'),(S.profile.pregnant||S.conds.includes('preg'))?[' and highest-mercury fish during pregnancy ',chip('fda-fish')]:'',', and any food that would push you over a tolerable upper limit.'),
  h('div',{cls:'disc'},'Not medical advice. For supplements or a lab-confirmed deficiency, talk to your clinician. Interaction notes come from your logged medicines and conditions — ask your pharmacist.'));
 return out};
{const orf=refresh3d;refresh3d=function(){const r=orf.apply(this,arguments);try{let n=document.getElementById('nudge');if(!n){n=h('button',{id:'nudge',cls:'nudge',on:{click:()=>go('ideas')}});document.getElementById('legend3d').before(n)}const p=pcts(totals()),low=MICRO.filter(k=>tgt(k)&&(p[k]||0)<50).sort((a,b)=>(p[a]||0)-(p[b]||0));n.textContent=low.length?'Low on '+NAME(low[0]).toLowerCase()+' today — see food ideas ›':'';n.hidden=!(low.length&&log().length)}catch(e){}return r}}

/* v20: collapsible notices */
S.view.notes=S.view.notes||{};
const URG=/911|988|222-1222|🚨|⚠|emergency|red flag|seek (immediate|emergency)/i;
const nkey=t=>{let x=0;for(const c of t.slice(0,80))x=(x*31+c.charCodeAt(0))|0;return 'n'+(x>>>0).toString(36)};
function noteify(root){for(const el of root.querySelectorAll('.disc:not([data-nt]),.warn:not([data-nt])')){el.dataset.nt=1;if(el.closest('#modal'))continue;
  if(el.classList.contains('redflag')||(el.classList.contains('warn')&&URG.test(el.textContent)))continue;
  const b=el.querySelector('b'),title=(b&&b.textContent.trim().replace(/[.:]\s*$/,''))||(el.classList.contains('disc')?'Educational only — not medical advice':'Note'),k=nkey(el.textContent);
  const st=S.view.notes[k];let open=S.view.allOpen||st==='open'||!st;if(!st){S.view.notes[k]='seen';save()}
  const bodyDiv=h('div',{cls:'nb'});bodyDiv.append(...el.childNodes);
  const hd=h('button',{cls:'nh','aria-expanded':String(open)},h('span',{},'ⓘ '+title),h('span',{cls:'chev'},'▾'));
  hd.addEventListener('click',e=>{e.stopPropagation();open=!open;S.view.notes[k]=open?'open':'closed';save();el.classList.toggle('closed',!open);hd.setAttribute('aria-expanded',String(open))});
  el.classList.add('note');el.classList.toggle('closed',!open);el.append(hd,bodyDiv)}}
for(const id of ['pages','panel']){const r=document.getElementById(id);noteify(r);new MutationObserver(()=>noteify(r)).observe(r,{childList:true,subtree:true})}
{const os=RENDER.set;RENDER.set=function(){const o=os.apply(this,arguments);const row=h('label',{cls:'flex'},h('input',{type:'checkbox',checked:!!S.view.allOpen,on:{change:e=>{S.view.allOpen=e.target.checked;save();go('set')}}}),' Show all notices expanded');(Array.isArray(o)?o:[o]).splice(2,0,row);return o}}

/* v20: online food search + custom foods */
function onlineBox(q,done){const box=h('div',{cls:'onl'}),st=h('div',{cls:'sub',role:'status'});
 const addP=p=>{const sv={g:100,label:'100 g'};S.products[p.fdcId]=Object.assign({portions:[]},p);FOOD.set(p.fdcId,S.products[p.fdcId]);CIT[p.cite.id]=p.cite;save()};
 const row=p=>{const g=h('input',{type:'number',cls:'qty','aria-label':'Grams',value:100,min:1,step:1});return h('div',{cls:'res'},h('div',{cls:'fname'},p.name),h('div',{cls:'flex'},chip((CIT[p.cite.id]=p.cite).id),h('span',{cls:'sub'},p.dataType||'crowd-sourced'),h('span',{cls:'sub'},Object.keys(p.per100g).length+' nutrients')),
   h('div',{cls:'addrow'},g,h('span',{cls:'sub'},'g'),h('button',{cls:'btn primary',on:{click:()=>{addP(p);log().push({fdcId:p.fdcId,grams:+g.value||100,label:(+g.value||100)+' g',prep:'asis'});save();box.replaceChildren(h('div',{cls:'sub'},'Logged and saved on this device as “'+p.name+'” — it works offline from now on.'));done&&done()}}},'Log it')))};
 const off=async()=>{st.textContent='Searching Open Food Facts…';try{const r=await SC.offSearch(q);box.replaceChildren(h('div',{cls:'sub'},'Open Food Facts results — crowd-sourced, unverified (T4).'),...(r.length?r.map(row):[h('div',{cls:'sub'},'Nothing found there either. You can create a custom food below.')]),customBtn())}catch(e){st.textContent='Open Food Facts search failed (offline?).'}};
 const run=async()=>{st.textContent='Searching USDA FoodData Central…';box.replaceChildren(st);try{const r=await SC.fdcSearch(q,S.lookup.key);if(!r.length)return off();box.replaceChildren(h('div',{cls:'sub'},'USDA results (Foundation, SR Legacy and Survey first, then Branded):'),...r.map(row),h('button',{cls:'btn ghost',on:{click:off}},'Not here? Try Open Food Facts (crowd-sourced)'),customBtn())}
  catch(e){box.replaceChildren(st,h('button',{cls:'btn ghost',on:{click:off}},'Try Open Food Facts instead'),customBtn());st.textContent=e.message==='rate'?'USDA search limit reached (the shared DEMO_KEY allows only a few searches per hour). Add a free api.data.gov key in Settings, try later, or use Open Food Facts.':e.message==='key'?'The API key was rejected. Check it in Settings.':'Online search failed (offline?).'}};
 const ask=()=>box.replaceChildren(h('div',{cls:'item'},h('b',{},'Search online?'),h('div',{cls:'sub'},'Sends only the search text “'+q+'” (plus a public API key) to USDA FoodData Central (api.nal.usda.gov); Open Food Facts only if you tap it. Nothing from your log or profile is sent. Uses the same setting as barcode lookup — you can turn it off in Settings.')),
   h('div',{cls:'flex'},h('button',{cls:'btn primary',on:{click:()=>{S.lookup.fdc=true;save();run()}}},'Allow & search'),h('button',{cls:'btn',on:{click:()=>box.replaceChildren(customBtn())}},'Not now')));
 box.append(h('div',{cls:'flex'},h('button',{cls:'btn',on:{click:()=>S.lookup.fdc?run():ask()}},'🔎 Search online for “'+q+'”'),customBtn()));return box}
function customBtn(){return h('button',{cls:'btn ghost',on:{click:customFood}},'＋ Create custom food')}
function customFood(){const m=document.getElementById('modal');const close=()=>{m.classList.add('hidden');m.replaceChildren()};
 const F=[['kcal','Calories (kcal)'],['protein','Protein (g)'],['carb','Carbs (g)'],['fiber','Fiber (g)'],['sugar','Total sugars (g)'],['fat','Fat (g)'],['satfat','Saturated fat (g)'],['na','Sodium (mg)'],['k','Potassium (mg)'],['ca','Calcium (mg)'],['fe','Iron (mg)'],['vitC','Vitamin C (mg)'],['vitD','Vitamin D (µg)']];
 const nm=h('input',{type:'text',cls:'search',maxlength:60,'aria-label':'Food name',placeholder:'Name (e.g. Butterhead lettuce from my Gardyn)'}),sg=h('input',{type:'number',cls:'qty','aria-label':'Serving grams',value:100,min:1});
 const ins=Object.fromEntries(F.map(([k])=>[k,h('input',{type:'number',cls:'qty',min:0,step:'any','aria-label':k})]));
 m.replaceChildren(h('div',{cls:'box'},h('div',{cls:'fhead'},h('h2',{},'Create custom food'),h('button',{cls:'icon-btn','aria-label':'Close',on:{click:close}},'✕')),nm,
  h('div',{cls:'addrow'},h('span',{cls:'sub'},'Values are per serving of'),sg,h('span',{cls:'sub'},'g')),...F.map(([k,l])=>h('label',{cls:'addrow'},ins[k],h('span',{cls:'sub'},l))),
  h('div',{cls:'flex'},h('button',{cls:'btn primary',on:{click:()=>{const n=nm.value.trim().slice(0,60);if(!n)return nm.focus();const g=+sg.value||100,per={};for(const[k]of F){const v=parseFloat(ins[k].value);if(!isNaN(v))per[k]=v*100/g}
    const id='custom:'+Date.now();S.products[id]={fdcId:id,name:n,short:n,per100g:per,portions:[{label:'1 serving',g}],custom:true,cite:{id:'cust-'+id.slice(7),retrieved:new Date().toISOString().slice(0,10),type:'User-entered',publisher:'You (custom entry)',title:n+' — entered by you',url:'',date:new Date().toISOString().slice(0,10),tier:4,tierRationale:'Entered by the user; not verified.'}};FOOD.set(id,S.products[id]);CIT[S.products[id].cite.id]=S.products[id].cite;save();close();go('log')}}},'Save food'),
   h('button',{cls:'btn ghost',on:{click:()=>{close();X19.ocrFlow('nut')}}},'📷 Fill from a Nutrition Facts photo')),
  h('div',{cls:'sub'},'Saved only on this device. Custom foods are labeled T4 (unverified).')));m.classList.remove('hidden')}
