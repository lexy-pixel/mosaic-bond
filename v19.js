// v19 sections: Activity, Sleep, Recovery (+ muscle-recovery overlay), Hydration, Supplements, Labs (+ My lab's ranges),
// Mood & stress, Caffeine & alcohol, Apple Health import, OCR autofill. All data stays in localStorage (S).
import * as AH from './ahparse.js';
import * as RM from './recmodel.js';
import * as OP from './ocrparse.js';
export function install(X){
const {h,rc,chips,S,save,today,go,body,PARTS,EXL,EXD,DISC,NAME,fmt,ul,DRI,medObjs,MEDS,P,preg,CIT,V,weekProg,cycOn,cycStat,FOOD,log}=X;
const NOW=()=>Date.now()+(window.__mbClockOffset||0)+(UI.prev||0)*36e5;const UI={prev:0,labView:null};
const dstr=d=>AH.localDay(d);const dayN=n=>dstr(new Date(NOW()-n*864e5));const TODAY=()=>dstr(new Date(NOW()-(window.__mbClockOffset?0:0)));
// ---- state
S.act=Object.assign({days:{}},S.act||{});S.sleep=Object.assign({log:{}},S.sleep||{});S.rec=Object.assign({sore:{}},S.rec||{});
S.hyd=Object.assign({log:{},pre:null,post:null},S.hyd||{});S.supps=S.supps||[];S.suppTaken=S.suppTaken||{};S.labs=S.labs||[];S.labRanges=S.labRanges||{};
S.mood=S.mood||{};S.caf=Object.assign({log:[]},S.caf||{});S.hk=Object.assign({days:{},imports:[]},S.hk||{});
const sec=(t,...k)=>h('div',{cls:'card'},h('h3',{},t),...k);
const q=(e)=>h('div',{cls:'ev'},'“'+e.evidence+'” ',chips(e.cites));
const num=(lbl,val,opt={})=>{const i=h('input',Object.assign({type:'number',cls:'qty','aria-label':lbl,value:val??''},opt));return i};
const row=(...k)=>h('div',{cls:'addrow'},...k);
const btn=(t,f,cls='chip')=>h('button',{cls,on:{click:f}},t);
const SV='http://www.w3.org/2000/svg';const sv=(t,a,...k)=>{const e=document.createElementNS(SV,t);for(const[x,y]of Object.entries(a||{}))e.setAttribute(x,y);e.append(...k);return e};
function bars(vals,labels,target,unit,lbl){const W=330,H=120,mx=Math.max(target||0,...vals.map(v=>v||0))*1.15||1,bw=W/vals.length;
  const s=sv('svg',{viewBox:`0 0 ${W} ${H+18}`,width:'100%',role:'img','aria-label':lbl,class:'chart'});
  vals.forEach((v,i)=>{const bh=(v||0)/mx*H;s.append(sv('rect',{x:i*bw+4,y:H-bh,width:bw-8,height:bh,rx:4,class:v&&target&&v>=target?'cbar ok':'cbar'}),sv('text',{x:i*bw+bw/2,y:H+13,'text-anchor':'middle',class:'ax'},labels[i]))});
  if(target)s.append(sv('line',{x1:0,x2:W,y1:H-target/mx*H,y2:H-target/mx*H,class:'tgt'}),sv('text',{x:W-2,y:H-target/mx*H-3,'text-anchor':'end',class:'ax'},'target '+target+(unit||'')));return s}
const last7=()=>[...Array(7)].map((_,i)=>dayN(6-i));const wk=d=>'SMTWTFS'[new Date(d+'T12:00:00').getDay()];
const age=()=>({0:2,1:6,2:11,3:16,4:25,5:40,6:60,7:75})[P().age]??30;
const hk=d=>S.hk.days[d]||{};
// ================= ACTIVITY
function actDay(d){const m=S.act.days[d]||{},a=hk(d);return{steps:m.steps??a.steps??null,exMin:m.exMin??a.exMin??null,kcal:m.kcal??a.kcal??null,src:m.steps!=null?'you':a.steps!=null?'Apple Health':null}}
function act(){const d=TODAY(),D=S.act.days[d]||(S.act.days[d]={}),cur=actDay(d),A=V.activity;const wp=weekProg(),G=EXD.guidelines;
  const st=num('Steps today',D.steps??'',{min:0,max:200000}),mi=num('Active minutes',D.exMin??'',{min:0,max:1440}),kc=num('Active energy kcal',D.kcal??'',{min:0,max:20000});
  const sv_=()=>{for(const[k,i]of[['steps',st],['exMin',mi],['kcal',kc]]){const v=i.value===''?null:+i.value;if(v==null)delete D[k];else if(v>=0)D[k]=v}save();go('act')};
  const L=last7(),steps=L.map(x=>actDay(x).steps);
  return[h('h2',{},'Activity'),
   sec('Today',h('div',{cls:'stat3'},h('div',{},h('b',{},cur.steps??'—'),h('span',{},'steps')),h('div',{},h('b',{},cur.exMin??'—'),h('span',{},'active min')),h('div',{},h('b',{},cur.kcal??'—'),h('span',{},'active kcal'))),
     cur.src?h('div',{cls:'sub'},'Source: '+cur.src+(cur.src==='Apple Health'?' (imported)':'')):null,
     row(h('label',{},'Steps ',st),h('label',{},'Active min ',mi),h('label',{},'kcal ',kc),btn('Save',sv_,'chip on'))),
   sec('Steps, last 7 days',bars(steps,L.map(wk),null,'','Steps per day for the last 7 days'),
     h('div',{cls:'sub'},A.note),q(A.steps),q(A.stepsMore)),
   sec('This week vs Physical Activity Guidelines',h('div',{cls:'prog'},h('div',{style:{width:Math.min(100,wp.eq/150*100)+'%'}})),
     h('div',{},`${wp.eq} of 150 moderate-equivalent minutes (vigorous counts double) · strength days: ${wp.sd} of 2`),
     h('div',{cls:'sub'},'From your Exercise log (Track › Exercise). Apple Watch exercise minutes are shown above but not added here, to avoid counting the same workout twice.'),
     h('div',{cls:'ev'},'“'+G.adult+'” ',chips(G.cites)),h('div',{cls:'ev'},'“'+G.strength+'” ',chips(G.cites)),btn('Open Exercise log',()=>go('ex'))),DISC()]}
// ================= SLEEP
function sleepTarget(){const a=age(),Sl=V.sleep;if(a>=18)return{lo:7,hi:null,ev:Sl.adult,txt:'7 h or more'};const k=Sl.kids.find(k=>a>=k.age[0]&&a<k.age[1]);return k?{lo:k.lo,hi:k.hi,ev:{evidence:k.ev,cites:Sl.kidsCites},txt:k.lo+'–'+k.hi+' h per 24 h (incl. naps)'}:null}
const sleepH=d=>{const s=S.sleep.log[d];if(s&&s.dur!=null)return s.dur/60+(s.nap||0)/60;const a=hk(d);return a.sleepMin!=null?a.sleepMin/60:null};
function durFrom(b,w){if(!b||!w)return null;const[bh,bm]=b.split(':').map(Number),[wh,wm]=w.split(':').map(Number);let m=wh*60+wm-(bh*60+bm);if(m<=0)m+=1440;return m}
function sleep(){const d=TODAY(),E=S.sleep.log[d]||{},T=sleepTarget(),Sl=V.sleep;
  const b=h('input',{type:'time','aria-label':'Bedtime',value:E.bed||''}),w=h('input',{type:'time','aria-label':'Wake time',value:E.wake||''}),qq=h('select',{'aria-label':'Sleep quality'},...['','1 poor','2','3 okay','4','5 great'].map((x,i)=>h('option',{value:i||'',selected:E.q===i},x||'Quality…'))),nap=num('Nap minutes',E.nap??'',{min:0,max:600});
  const sn=h('input',{type:'checkbox',checked:!!E.snore}),sl=h('input',{type:'checkbox',checked:!!E.sleepy}),sh=h('input',{type:'checkbox',checked:!!S.sleep.shift});
  const save_=()=>{const dur=durFrom(b.value,w.value);S.sleep.log[d]={bed:b.value,wake:w.value,dur,q:qq.value?+qq.value:null,nap:+nap.value||0,snore:sn.checked,sleepy:sl.checked};S.sleep.shift=sh.checked;save();go('sleep')};
  const L=last7(),vals=L.map(sleepH);const flag=Object.values(S.sleep.log).slice(-14).some(x=>x.snore)&&Object.values(S.sleep.log).slice(-14).some(x=>x.sleepy);
  return[h('h2',{},'Sleep'),flag?h('div',{cls:'disc red'},h('b',{},'Loud snoring plus daytime sleepiness: worth raising with a clinician. '),'NHLBI: “'+Sl.apnea.evidence+'” ',chips(Sl.apnea.cites)):null,
   sec('Last night ('+d+')',row(h('label',{},'Bed ',b),h('label',{},'Wake ',w)),row(qq,h('label',{},'Nap min ',nap)),
     h('label',{cls:'chk'},sn,' Loud snoring (someone noticed)'),h('label',{cls:'chk'},sl,' Very sleepy during the day'),h('label',{cls:'chk'},sh,' I work shifts / nights'),btn('Save',save_,'chip on'),
     E.dur!=null?h('div',{},'Logged: '+(E.dur/60).toFixed(1)+' h'+(E.nap?' + '+E.nap+' min nap':'')):hk(d).sleepMin!=null?h('div',{cls:'sub'},'Apple Health (imported): '+(hk(d).sleepMin/60).toFixed(1)+' h asleep'):null),
   sec('Last 7 nights vs recommendation',T?h('div',{},'Your age-based recommendation: ',h('b',{},T.txt)):null,bars(vals.map(v=>v&&Math.round(v*10)/10),L.map(wk),T&&T.lo,' h','Sleep hours for the last 7 nights'),T?q(T.ev):null,age()>=18?q(Sl.adultMore):null,
     h('div',{cls:'sub'},'Secondary reference (National Sleep Foundation ranges):'),q(Sl.nsf)),
   sec('What affects sleep',...Sl.links.map(l=>h('div',{},h('b',{},l.title+': '),q(l))),h('div',{cls:'sub'},'See Food › Caffeine & alcohol to log drinks; it shows caffeine likely still in your body at bedtime.')),
   sec('Sleep habits (NHLBI)',...Sl.hygiene.map(q)),
   S.sleep.shift?sec('Shift work',q(Sl.shift)):null,
   sec('Body systems',h('div',{cls:'sub'},'Sleep is regulated by the brain (nervous system) and hormones (endocrine system).'),btn('Highlight nervous + endocrine on body',()=>{S.view.overlay=null;go('scan');setTimeout(()=>body.setSelected(new Set(Sl.parts)),50)})),DISC()]}
// ================= RECOVERY (+ muscle overlay)
const soreAt=t=>{let m=0;for(const[d,v]of Object.entries(S.rec.sore)){const dt=(t-Date.parse(d+'T12:00:00'))/36e5;if(dt>-48&&dt<72)m=Math.max(m,v)}return m};
const allEx=()=>S.ex.log;
function recSessions(){return RM.sessions(allEx(),EXL,t=>soreAt(t))}
X.recLevels=()=>RM.levels(recSessions(),NOW());
function checkin(){const d=TODAY(),T=sleepTarget(),sh=sleepH(d)??sleepH(dayN(1));const sp=sh==null?null:Math.round(40*Math.min(1,sh/(T?T.lo:7)));
  const L48=recSessions().filter(s=>NOW()-s.t<48*36e5&&NOW()>=s.t).reduce((a,s)=>a+s.L,0),lp=Math.round(30*Math.max(0,1-L48/8));const so=S.rec.sore[d]??null,spts=so==null?null:Math.round(30*(1-so/10));
  const parts=[sp,lp,spts];const tot=parts.every(x=>x!=null)?sp+lp+spts:null;
  const base=k=>{const v=[...Array(14)].map((_,i)=>hk(dayN(i+1))[k]).filter(x=>x!=null);return v.length>=3?v.reduce((a,b)=>a+b,0)/v.length:null};
  return{sp,lp,spts,tot,sh,L48,so,rhr:hk(d).rhr??hk(dayN(1)).rhr,rhrB:base('rhr'),hrv:hk(d).hrv??hk(dayN(1)).hrv,hrvB:base('hrv')}}
function rec(){const c=checkin(),R=V.recovery,d=TODAY();const so=h('input',{type:'range',min:0,max:10,step:1,value:c.so??0,'aria-label':'Soreness 0 to 10'});const sl=h('span',{},String(c.so??0));so.addEventListener('input',()=>sl.textContent=so.value);
  const {lv}=X.recLevels();const top=Object.entries(lv).sort((a,b)=>b[1]-a[1]);const on=S.view.overlay==='rec';
  return[h('h2',{},'Recovery'),
   sec('Today’s check-in',h('div',{cls:'big'},c.tot==null?'Add sleep and soreness to see a summary':c.tot+' / 100'),
     h('table',{cls:'tbl'},h('tr',{},h('td',{},'Sleep last night'),h('td',{},c.sh==null?'not logged':c.sh.toFixed(1)+' h'),h('td',{},c.sp==null?'—':c.sp+' / 40')),
       h('tr',{},h('td',{},'Exercise load, last 48 h'),h('td',{},c.L48.toFixed(1)+' MET-h'),h('td',{},c.lp+' / 30')),h('tr',{},h('td',{},'Soreness today'),h('td',{},c.so==null?'not logged':c.so+' / 10'),h('td',{},c.spts==null?'—':c.spts+' / 30'))),
     h('div',{cls:'sub'},'How it’s calculated: sleep points = 40 × (hours ÷ your recommended minimum, capped at 1); load points = 30 × (1 − MET-hours in last 48 h ÷ 8, floored at 0); soreness points = 30 × (1 − soreness ÷ 10).'),
     h('div',{cls:'disc'},h('b',{},'Not validated. '),R.scoreNote),
     c.rhr!=null||c.hrv!=null?h('div',{},'Imported from Apple Health (shown, not scored): ',c.rhr!=null?`resting HR ${c.rhr} bpm${c.rhrB?' (14-day avg '+c.rhrB.toFixed(0)+')':''}`:'',c.hrv!=null?` · HRV SDNN ${c.hrv} ms${c.hrvB?' (14-day avg '+c.hrvB.toFixed(0)+')':''}`:''):null,
     row(h('label',{},'Soreness 0–10 ',so,' ',sl),btn('Save soreness',()=>{S.rec.sore[d]=+so.value;save();go('rec')},'chip on'))),
   sec('Muscle recovery overlay',btn(on?'Hide muscle-recovery overlay':'Show muscle recovery on body',()=>{S.view.overlay=on?null:'rec';save();go(on?'rec':'scan')},'chip'+(on?' on':'')),
     h('div',{cls:'disc'},h('b',{},'Estimate, not a measurement. '),'Colors come from general recovery timelines applied to what you logged — not from your muscles.'),
     top.length?h('table',{cls:'tbl'},...top.slice(0,8).map(([r,v])=>h('tr',{},h('td',{},r),h('td',{},h('span',{cls:'swatch',style:{opacity:String(.25+.75*v)}})),h('td',{},'~'+RM.hoursToMostly(recSessions(),r,NOW())+' h to mostly recovered')))):h('div',{cls:'sub'},'Nothing recently worked. Log a workout in Exercise or import from Apple Health.'),
     h('div',{cls:'sub'},'Model: each session starts at a level scaled by load (MET × hours, plus sets×reps) and fades so it is ~90% gone after ~24 h (light activity or stretching), ~48 h (typical) or ~72 h (high load or eccentric-heavy: lunges, squats, deadlifts, running, hiking, jumping). Soreness 4–6 adds 25%, 7+ adds 50%. Sessions stack, capped at full.'),
     q(R.doms),q(R.ecc),q(R.freq)),
   sec('Rest, protein and fluids after exercise',q(R.timing),q(R.protein),q(R.fluid)),DISC()]}
X.recLegend=()=>'muscle recovery estimate: amber = just worked → fades as it recovers (not a measurement)';
X.recPanel=(region,panel,closePanel)=>{const ss=recSessions(),{lv,why}=RM.levels(ss,NOW());if(!region){return false}
  const w=(why[region]||[]).sort((a,b)=>b.s.t-a.s.t);
  rc(panel,h('div',{cls:'crumb'},h('a',{on:{click:closePanel}},'Body'),' › Muscle recovery › ',region),h('h2',{},region[0].toUpperCase()+region.slice(1)),
   h('div',{cls:'disc'},h('b',{},'Estimate. '),'Based on general recovery timelines, not a measurement of your muscles.'),
   w.length?[h('div',{},'Current level: '+Math.round((lv[region]||0)*100)+'% · ~'+RM.hoursToMostly(ss,region,NOW())+' h until mostly recovered'),
     ...w.map(x=>h('div',{cls:'ev'},h('b',{},x.s.x.name),' ('+x.role+') · '+new Date(x.s.t).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'})+' · '+x.s.e.min+' min'+(x.s.e.sets?` · ${x.s.e.sets}×${x.s.e.reps||'?'}`:'')+(x.s.e.src==='ah'?' · Apple Health':'')+' · window ~'+Math.round(x.s.W)+' h'))]:h('div',{cls:'sub'},'No recent logged activity worked this area.'),
   chips(V.recovery.doms.cites));panel.classList.remove('hidden');return true};
X.recScrub=()=>h('div',{cls:'scrub',role:'group','aria-label':'Recovery preview time'},...[0,24,48].map(n=>h('button',{cls:'chip'+(UI.prev===n?' on':''),on:{click:()=>{UI.prev=n;X.refresh()}}},n?'+'+n+'h':'now')));
// ================= HYDRATION
const DR={water:['Water',1],coffee:['Coffee',1],tea:['Tea',1],milk:['Milk',1],juice:['Juice',1],soda:['Soda',1],sports:['Sports drink',1],other:['Other',1]};
function hydTarget(){const a=age();if(a<19)return null;return P().sex==='M'?{tot:3.7,fl:3.0}:{tot:2.7,fl:2.2}}
const hydDay=d=>(S.hyd.log[d]||[]).reduce((a,x)=>a+x.ml,0)+((hk(d).water)||0);
function hyd(){const d=TODAY(),L=S.hyd.log[d]||(S.hyd.log[d]=[]),T=hydTarget(),H=V.hydration;const UN=window.__UN,hu=(S.units||{}).hyd||'mL',HF=x=>UN.fmtU('hyd',x,hu);const ml=num('Amount in '+({mL:'mL',floz:'fl oz',cup:'cups'})[hu],hu==='mL'?250:hu==='floz'?8:1,{min:hu==='mL'?10:0.1,max:hu==='mL'?3000:101,step:'any'}),ty=h('select',{'aria-label':'Drink'},...Object.entries(DR).map(([k,[n]])=>h('option',{value:k},n)));
  const tot=hydDay(d);const hr=L.filter(x=>NOW()-x.t<36e5).reduce((a,x)=>a+x.ml,0);const ex=(S.ex.log.filter(e=>e.d===d).reduce((a,e)=>a+e.min,0));
  const pre=num('Weight before exercise (kg)',S.hyd.pre??'',{step:.1}),post=num('Weight after (kg)',S.hyd.post??'',{step:.1});
  return[h('h2',{},'Hydration'),hr>1000?h('div',{cls:'disc red'},h('b',{},'You logged over 1 L in the last hour. '),'Drinking a lot very fast can be dangerous. ',q(H.toxic),q(H.hypo)):null,
   sec('Today',h('div',{cls:'big'},(hu==='mL'?(tot/1000).toFixed(2)+' L':HF(tot))+' from drinks'),T?h('div',{cls:'prog'},h('div',{style:{width:Math.min(100,tot/1000/T.fl*100)+'%'}})):null,
     T?h('div',{},`Adequate Intake for total water: ${T.tot} L/day; about 80% from drinks ≈ ${T.fl} L`+(hu==='mL'?'.':' ('+HF(T.fl*1000)+').')):h('div',{cls:'sub'},'Targets shown for adults only.'),hk(d).water?h('div',{cls:'sub'},'Includes '+HF(hk(d).water)+' imported from Apple Health.'):null,
     row(ty,ml,btn('Add',()=>{const v=Math.round(UN.fromU('hyd',+ml.value,hu));if(v>0&&v<=3000){L.push({ty:ty.value,ml:v,t:NOW()});save();go('hyd')}},'chip on')),
     L.length?h('div',{cls:'sub'},L.map(x=>DR[x.ty][0]+' '+HF(x.ml)).join(' · ')):null,q(H.ai),q(H.food)),
   sec('Exercise days',ex?h('div',{},'You logged '+ex+' min of exercise today. Sweat losses vary a lot between people, so there is no single add-on amount.'):h('div',{cls:'sub'},'No exercise logged today.'),
     row(h('label',{},'Before ',pre),h('label',{},'After ',post),btn('Compare',()=>{S.hyd.pre=+pre.value||null;S.hyd.post=+post.value||null;save();go('hyd')})),
     S.hyd.pre&&S.hyd.post?h('div',{},'Weight change: '+(S.hyd.post-S.hyd.pre).toFixed(1)+' kg. Per ACSM, replace the fluid you lost after exercise — gradually, not all at once.'):null,q(H.exercise)),
   sec('Too much, too fast',q(H.toxic),q(H.exhypo)),
   sec('Body systems',btn('Show kidneys + bladder (urinary system)',()=>{S.view.overlay=null;go('scan');setTimeout(()=>body.setSelected(new Set(H.parts)),50)})),DISC()]}
// ================= SUPPLEMENTS
const SK=Object.keys(DRI).filter(k=>k!=='fiber'&&k!=='na');
const suppToday=()=>{const d=TODAY(),t={};for(const s of S.supps){if(!s.on)continue;const taken=s.freq==='daily'||(S.suppTaken[d]||[]).includes(s.id);if(!taken)continue;for(const[k,v]of Object.entries(s.doses||{}))t[k]=(t[k]||0)+v*(s.servings||1)}return t};
X.addSupp=t=>{const s=suppToday();t.__supp=s;for(const[k,v]of Object.entries(s))t[k]=(t[k]||0)+v;return t};
function supp(){const d=TODAY(),V2=V.supplements,s=suppToday();const tot=X.totals();
  const w=[];for(const k of Object.keys(s)){const u=ul(k);if(!u)continue;const suppOnly=/supplement|preformed|folic/i.test(DRI[k].ulNote||'');const v=suppOnly?s[k]:tot[k];if(v>u)w.push(h('div',{cls:'warn'},`${NAME(k)}: ${fmt(v,k)} ${suppOnly?'from supplements':'from food + supplements'} is above the Tolerable Upper Intake Level (${fmt(u,k)}). `,DRI[k].ulNote?h('span',{cls:'sub'},DRI[k].ulNote+' '):null,chips(DRI[k].cites)))}
  const myMeds=new Set(S.meds);const ints=[];for(const r of V2.rules){for(const sp of S.supps.filter(x=>x.on)){const hit=r.herb?sp.herb===r.herb&&myMeds.size:(sp.doses||{})[r.nutrient]>0&&myMeds.has(r.med);if(hit)ints.push(h('div',{cls:'warn'},h('b',{},sp.name+(r.med==='*'?' + your medicines: ':' + '+(MEDS.meds.find(m=>m.id===r.med)||{}).name+': ')),'“'+r.evidence+'” ',chips(r.cites)))}}
  const nm=h('input',{type:'text',maxlength:80,'aria-label':'Product name',placeholder:'Product name'}),fr=h('select',{'aria-label':'Frequency'},h('option',{value:'daily'},'Daily'),h('option',{value:'asneeded'},'When I mark it taken')),
    nk=h('select',{'aria-label':'Nutrient'},...SK.map(k=>h('option',{value:k},NAME(k)+' ('+DRI[k].unit+')'))),amt=num('Amount per serving',''),herb=h('input',{type:'checkbox'});
  return[h('h2',{},'Supplements'),
   h('div',{cls:'disc'},h('b',{},'Before you buy: '),q(V2.fda),q(V2.seal)),w.length?sec('Upper-limit check (today)',...w):null,ints.length?sec('Possible interactions with your medicines',...ints,h('div',{cls:'sub'},'Talk with your pharmacist or clinician. Do not stop or change a medicine on your own.'),q(V2.interact)):null,
   sec('My supplements',...S.supps.map(sp=>h('div',{cls:'item'},h('b',{},sp.name),' · '+(sp.freq==='daily'?'daily':'as marked'),h('div',{cls:'sub'},Object.entries(sp.doses||{}).map(([k,v])=>NAME(k)+' '+fmt(v,k)).join(', ')||(sp.herb?'herbal: St. John’s wort':'no nutrient amounts')),
       sp.freq!=='daily'?btn((S.suppTaken[d]||[]).includes(sp.id)?'Taken today ✓':'Mark taken today',()=>{const a=S.suppTaken[d]||(S.suppTaken[d]=[]);const i=a.indexOf(sp.id);i<0?a.push(sp.id):a.splice(i,1);save();go('supp')}):null,
       btn('Remove',()=>{S.supps=S.supps.filter(x=>x!==sp);save();go('supp')}),sp.img?h('img',{src:sp.img,alt:'Attached label photo',cls:'thumb'}):null)),
     S.supps.length?null:h('div',{cls:'sub'},'None yet.')),
   sec('Add a supplement',row(nm,fr),row(nk,amt,h('label',{cls:'chk'},herb,' St. John’s wort')),
     btn('Add',()=>{const n=nm.value.trim();if(!n)return;const doses={};if(+amt.value>0)doses[nk.value]=+amt.value;S.supps.push({id:'s'+Date.now(),name:n,freq:fr.value,doses,on:true,herb:herb.checked?'sjw':null});save();go('supp')},'chip on'),
     btn('📷 Read a Supplement Facts label',()=>X.ocrFlow('supp'))),
   s&&Object.keys(s).length?h('div',{cls:'sub'},'Today’s supplement amounts are added to your nutrient totals and body glow, marked “incl. supplements”.'):null,DISC()]}
// ================= LABS
const AN=new Map(V.labs.analytes.map(a=>[a.id,a]));
const toBase=(a,v,u)=>{const f=a.units[u];if(f==null)return null;if(f==='ifcc')return v/10.929+2.15;return v/f};const fromBase=(a,v,u)=>{const f=a.units[u];if(f==='ifcc')return 10.929*(v-2.15);return v*f};
function interp(e){const a=AN.get(e.analyte);if(!a)return{};const vb=toBase(a,e.value,e.unit);const own=e.range&&(e.range.lo!=null||e.range.hi!=null)?e.range:null;
  if(own){const lo=own.lo!=null?toBase(a,own.lo,own.unit||e.unit):null,hi=own.hi!=null?toBase(a,own.hi,own.unit||e.unit):null;const st=lo!=null&&vb<lo?'below':hi!=null&&vb>hi?'above':'within';return{src:own.src==='saved'?'Your saved range for this lab':'Range from your lab report',st,txt:`${own.lo??'–'}–${own.hi??'–'} ${own.unit||e.unit}${own.lab?' ('+own.lab+')':''}`}}
  const r=a.ref;if(!r)return{src:null,st:null,txt:'No default range here — enter the range printed on your report.'};if(r.minAge&&age()<r.minAge)return{src:null,txt:'Default range is for adults; use your report’s range.'};
  if(r.kind==='band'){const b=r.bands.find(b=>vb>=b[0]&&vb<b[1]);return{src:'Default cited cut-off',st:'band',txt:b?b[2]:'',ref:r}}
  const lo=typeof r.lo==='object'?r.lo[P().sex]:r.lo;if(r.kind==='low')return{src:'Default cited cut-off',st:vb<lo?'below':'at/above',txt:`cut-off ${lo} ${r.unit}`,ref:r};return{src:'Default cited cut-off',st:vb>r.hi?'above':'below',txt:`healthy level below ${r.hi} ${r.unit}`,ref:r}}
const CRIT=e=>e.critical||/^(HH|LL|C|CRIT|CRITICAL|PANIC)$/i.test(e.flag||'');
function labForm(pre,onSave){const a0=pre.analyte||'ferritin';const an=h('select',{'aria-label':'Analyte'},...V.labs.analytes.map(a=>h('option',{value:a.id,selected:a.id===a0},a.name)));
  const val=num('Value',pre.value??'',{step:'any'}),un=h('select',{'aria-label':'Units'}),dt=h('input',{type:'date','aria-label':'Collection date',value:pre.date||TODAY()}),fl=h('input',{type:'text',maxlength:8,'aria-label':'Flag',placeholder:'Flag (H, L, HH…)',value:pre.flag||'',cls:'qty'}),
    lo=num('Range low',pre.lo??'',{step:'any'}),hi=num('Range high',pre.hi??'',{step:'any'}),ru=h('select',{'aria-label':'Range units'}),lab=h('input',{type:'text',maxlength:60,'aria-label':'Lab name',placeholder:'Lab name (optional)',value:pre.lab||''}),
    sx=h('input',{type:'checkbox',checked:!!pre.sexAge}),cr=h('input',{type:'checkbox',checked:!!pre.critical}),keep=h('input',{type:'checkbox',checked:true}),msg=h('div',{cls:'warn',role:'status','data-ui':'1'});
  const fillU=()=>{const a=AN.get(an.value);const SIU=(S.units||{}).lab==='si',ks=Object.keys(a.units),pu=pre.unit||(SIU&&ks.length>1?ks.find(u=>a.units[u]!==1)||ks[0]:ks[0]);for(const s of[un,ru])s.replaceChildren(...ks.map(u=>h('option',{value:u,selected:u===pu},u)));const sr=S.labRanges[an.value];if(sr&&lo.value===''&&hi.value===''){lo.value=sr.lo??'';hi.value=sr.hi??'';ru.value=sr.unit;lab.value=sr.lab||'';msg.textContent='Using your saved range for this analyte ('+(sr.lab||'my lab')+').';msg.className='sub'}};
  an.addEventListener('change',()=>{pre.unit=null;lo.value='';hi.value='';fillU()});fillU();if(pre.unit&&!(pre.unit in AN.get(a0).units))msg.textContent='Unit “'+pre.unit+'” is not valid for '+AN.get(a0).name+' — pick one from the list.';
  const go_=()=>{const a=AN.get(an.value),v=parseFloat(val.value);if(!isFinite(v)){msg.textContent='Enter a number.';return}if(!(un.value in a.units)){msg.textContent='Choose a valid unit.';return}
    const L=lo.value===''?null:+lo.value,H=hi.value===''?null:+hi.value;if(L!=null&&H!=null&&L>H){msg.textContent='Range low is above range high.';return}
    const rg=L!=null||H!=null?{lo:L,hi:H,unit:ru.value,lab:lab.value.trim()||null,sexAge:sx.checked,src:S.labRanges[a.id]&&S.labRanges[a.id].lo===L&&S.labRanges[a.id].hi===H?'saved':'report'}:null;
    if(rg&&keep.checked)S.labRanges[a.id]={lo:L,hi:H,unit:ru.value,lab:rg.lab,sexAge:sx.checked};
    onSave({id:'l'+Date.now()+Math.random().toString(36).slice(2,5),analyte:a.id,value:v,unit:un.value,date:dt.value||TODAY(),flag:fl.value.trim().toUpperCase(),critical:cr.checked,range:rg})};
  const el=h('div',{cls:'labform'},row(an,val,un),row(h('label',{},'Collected ',dt),fl),h('div',{cls:'sub'},'Reference range from your report:'),row(lo,h('span',{},'–'),hi,ru),row(lab,h('label',{cls:'chk'},sx,' sex/age-specific')),
    h('label',{cls:'chk'},keep,' Save as my lab’s range for this analyte'),h('label',{cls:'chk'},cr,' Report marks this as critical'),msg);el.go_=go_;return el}
function trend(a,list){const pts=list.map(e=>({d:e.date,v:toBase(a,e.value,e.unit)})).filter(p=>p.v!=null).sort((x,y)=>x.d.localeCompare(y.d));if(pts.length<2)return null;
  const W=320,H=90,mn=Math.min(...pts.map(p=>p.v)),mx=Math.max(...pts.map(p=>p.v)),sp=(mx-mn)||1,u=Object.keys(a.units)[0];const X_=i=>10+i*(W-20)/(pts.length-1),Y=v=>H-8-(v-mn)/sp*(H-20);
  return sv('svg',{viewBox:`0 0 ${W} ${H+14}`,width:'100%',role:'img','aria-label':a.name+' trend',class:'chart'},sv('polyline',{points:pts.map((p,i)=>X_(i)+','+Y(p.v)).join(' '),class:'line'}),...pts.map((p,i)=>sv('circle',{cx:X_(i),cy:Y(p.v),r:3,class:'pt'})),...pts.map((p,i)=>sv('text',{x:X_(i),y:H+11,'text-anchor':'middle',class:'ax'},p.d.slice(5))),sv('text',{x:4,y:10,class:'ax'},u))}
function labs(){if(UI.labView==='ranges')return ranges();const V3=V.labs;const crit=S.labs.filter(CRIT);
  const f=labForm({},e=>{S.labs.push(e);save();go('labs')});const by={};for(const e of S.labs)(by[e.analyte]||(by[e.analyte]=[])).push(e);
  return[h('h2',{},'Lab results'),crit.length?h('div',{cls:'disc red'},h('b',{},'A result is marked critical. '),'Contact your clinician or the ordering provider today. If you feel very unwell, call 911.'):null,
   h('div',{cls:'disc'},h('b',{},'Ranges vary by lab. '),'Use the reference range printed on your own report — you can enter it with each result. ',q(V3.vary)),
   sec('Add a result',f,row(btn('Save result',()=>f.go_(),'chip on'),btn('📷 Read a lab report',()=>X.ocrFlow('lab')),btn('My lab’s ranges',()=>{UI.labView='ranges';go('labs')}))),
   ...Object.entries(by).map(([id,list])=>{const a=AN.get(id),lst=list.sort((x,y)=>y.date.localeCompare(x.date)),e=lst[0],I=interp(e);
     return sec(a.name,h('div',{cls:'big'},e.value+' '+e.unit,(()=>{const ks=Object.keys(a.units).filter(u=>u!==e.unit&&a.units[u]!==a.units[e.unit]&&!/^u/.test(u));if(!ks.length)return null;const b=toBase(a,e.value,e.unit);return h('span',{cls:'sub'},' ≈ '+ks.map(u=>{const x=fromBase(a,b,u);return(Math.abs(x)>=100?Math.round(x):Math.round(x*100)/100)+' '+u}).join(' · ')+' ',chips([a.id==='vitd'?'ods-vitD':'labcorp-si']))})(),e.flag?h('span',{cls:'tag'},e.flag):null),h('div',{},e.date+' · '+(I.st?I.st+' — ':'')+I.txt),h('div',{cls:'sub'},'Range in use: '+(I.src||'none')),CRIT(e)?h('div',{cls:'warn','data-ui':'1'},'Marked critical — contact your clinician.'):null,
      I.ref?q(I.ref):null,trend(a,lst),h('div',{cls:'sub'},'Related: '+[...a.parts.map(p=>PARTS[p]?.name),...a.nut.map(NAME)].filter(Boolean).join(', ')),
      row(btn('Show on body',()=>{S.view.overlay=null;go('scan');setTimeout(()=>body.setSelected(new Set(a.parts)),50)}),btn('Delete latest',()=>{S.labs=S.labs.filter(x=>x!==e);save();go('labs')})),e.img?h('img',{src:e.img,alt:'Attached report photo',cls:'thumb'}):null,chips(a.cites))}),
   h('div',{cls:'sub'},V3.convNote),DISC()]}
function ranges(){const E=Object.entries(S.labRanges);return[h('h2',{},'My lab’s ranges'),h('div',{cls:'sub'},'Ranges you saved are filled in automatically for new results of the same test, and take priority over the default cited cut-offs.'),
  ...E.map(([id,r])=>h('div',{cls:'item'},h('b',{},AN.get(id)?.name||id),' '+(r.lo??'–')+'–'+(r.hi??'–')+' '+r.unit+(r.lab?' · '+r.lab:'')+(r.sexAge?' · sex/age-specific':''),btn('Delete',()=>{delete S.labRanges[id];save();go('labs')}))),
  E.length?null:h('div',{cls:'sub'},'No saved ranges yet. Tick “Save as my lab’s range” when adding a result.'),btn('‹ Back to results',()=>{UI.labView=null;go('labs')}),DISC()]}
// ================= MOOD & STRESS
const pear=(a,b)=>{const n=a.length;if(n<5)return null;const ma=a.reduce((x,y)=>x+y,0)/n,mb=b.reduce((x,y)=>x+y,0)/n;let s=0,sa=0,sb=0;for(let i=0;i<n;i++){s+=(a[i]-ma)*(b[i]-mb);sa+=(a[i]-ma)**2;sb+=(b[i]-mb)**2}return sa&&sb?s/Math.sqrt(sa*sb):null};
const cafDay=d=>S.caf.log.filter(x=>x.d===d&&x.mg).reduce((a,x)=>a+x.mg,0),alcDay=d=>S.caf.log.filter(x=>x.d===d&&x.std).reduce((a,x)=>a+x.std,0);
function mood(){const d=TODAY(),M=S.mood[d]||{},MV=V.mood;const sl=(k,l)=>{const i=h('input',{type:'range',min:1,max:5,step:1,value:M[k]||3,'aria-label':l});return[h('label',{cls:'slab'},l,i),i]};
  const [a1,mi]=sl('mood','Mood (1 low – 5 good)'),[a2,si]=sl('stress','Stress (1 calm – 5 high)'),[a3,ei]=sl('energy','Energy (1 – 5)'),[a4,ai]=sl('anx','Anxiety (1 – 5)');
  const scr=(key,S2)=>{const sel=S2.items.map((it,j)=>h('select',{'aria-label':it},h('option',{value:''},'—'),...MV.answers.map((x,v)=>h('option',{value:v,selected:(M[key]||[])[j]===v},x))));return{sel,el:h('div',{cls:'item'},h('div',{cls:'sub'},S2.stem),...S2.items.map((it,j)=>h('div',{cls:'qrow'},h('span',{},it),sel[j])))}};
  const P2=scr('phq',MV.phq2),G2=scr('gad',MV.gad2),note=h('input',{type:'text',maxlength:200,'aria-label':'Note',placeholder:'Note (optional, stays on this device)',value:M.note||''}),harm=h('input',{type:'checkbox',checked:!!M.harm});
  const sum=a=>a&&a.length===2&&a.every(x=>x!=null)?a[0]+a[1]:null;const ps=sum(M.phq),gs=sum(M.gad);const SH=/\b(suicid|kill myself|end my life|self[- ]?harm|hurt myself|want to die)\b/i.test(M.note||'');
  const crisis=M.harm||SH||ps>=3||gs>=3;
  const days=[...Array(30)].map((_,i)=>dayN(i)).filter(x=>S.mood[x]&&S.mood[x].mood);const ys=days.map(x=>S.mood[x].mood);
  const corr=[['Sleep hours',x=>sleepH(x)],['Exercise minutes',x=>S.ex.log.filter(e=>e.d===x).reduce((a,e)=>a+e.min,0)],['Caffeine mg',cafDay],['Alcohol (standard drinks)',alcDay],['Steps',x=>actDay(x).steps]].map(([n,f])=>{const pr=days.map(x=>[f(x),S.mood[x].mood]).filter(p=>p[0]!=null);return[n,pear(pr.map(p=>p[0]),pr.map(p=>p[1])),pr.length]});
  let ph=null;if(cycOn()){const by={};for(const x of days){const c=cycStat();}ph=cycStat().phase}
  return[h('h2',{},'Mood & stress'),crisis?h('div',{cls:'disc red'},h('b',{},'You don’t have to handle this alone. '),'Call or text 988 (Suicide & Crisis Lifeline, US) any time, or call 911 if you are in danger. ',q(MV.crisis),h('a',{href:'tel:988',cls:'btn'},'Call 988'),h('a',{href:'sms:988',cls:'btn'},'Text 988')):null,
   sec('Quick check-in ('+d+')',a1,a2,a3,a4,note,h('label',{cls:'chk'},harm,' I’m having thoughts of harming myself'),btn('Save',()=>{S.mood[d]=Object.assign(S.mood[d]||{},{mood:+mi.value,stress:+si.value,energy:+ei.value,anx:+ai.value,note:note.value.slice(0,200),harm:harm.checked});save();go('mood')},'chip on')),
   sec('Optional 2-question screeners',h('div',{cls:'sub'},'Screeners are not a diagnosis. A score of 3 or more on either means it’s worth talking with a clinician.'),h('b',{},'PHQ-2'),P2.el,ps!=null?h('div',{},'PHQ-2 score: '+ps+' of 6'+(ps>=3?' — positive screen':'')):null,q(MV.phq2),
     h('b',{},'GAD-2'),G2.el,gs!=null?h('div',{},'GAD-2 score: '+gs+' of 6'+(gs>=3?' — positive screen':'')):null,q(MV.gad2),
     btn('Save screeners',()=>{const g=a=>a.map(s=>s.value===''?null:+s.value);S.mood[d]=Object.assign(S.mood[d]||{},{phq:g(P2.sel),gad:g(G2.sel)});save();go('mood')},'chip on'),h('div',{cls:'sub'},MV.attrib)),
   sec('Patterns (last 30 days)',h('div',{cls:'sub'},'Correlation only — it can’t show cause. Needs at least 5 days with both values.'),h('table',{cls:'tbl'},...corr.map(([n,r,k])=>h('tr',{},h('td',{},'Mood vs '+n),h('td',{},r==null?'not enough data':(r>0?'+':'')+r.toFixed(2)),h('td',{},k+' days')))),ph?h('div',{cls:'sub'},'Cycle phase today: '+ph+' (from your Cycle log).'):null),DISC()]}
// ================= CAFFEINE & ALCOHOL
const HL=[3,6];
function cafRemain(t,hl){return S.caf.log.filter(x=>x.mg&&x.t<=t).reduce((a,x)=>a+x.mg*Math.pow(.5,(t-x.t)/36e5/hl),0)}
function caf(){const d=TODAY(),C=V.caffeine;const dr=h('select',{'aria-label':'Drink'},...C.drinks.map(x=>h('option',{value:x.id},x.name+' ('+x.ml+' mL ≈ '+Math.round(x.mgPer100*x.ml/100)+' mg)'))),n=num('Servings',1,{min:.25,step:.25});
  const al=h('select',{'aria-label':'Alcoholic drink'},h('option',{value:'1'},'Beer 12 oz, 5% (1 standard drink)'),h('option',{value:'1w'},'Wine 5 oz, 12% (1)'),h('option',{value:'1s'},'Spirits 1.5 oz, 40% (1)'),h('option',{value:'c'},'Custom (enter below)')),oz=num('Fluid ounces',''),abv=num('ABV %','');
  const mg=cafDay(d),lim=preg()?200:400,std=alcDay(d);const now=NOW();const bed=(S.sleep.log[dayN(1)]||{}).bed||'22:30';const bt=new Date(d+'T'+bed+':00').getTime();
  const W=320,H=90,pts=k=>[...Array(25)].map((_,i)=>{const t=now+i*36e5;return[10+i*(W-20)/24,H-8-Math.min(1,cafRemain(t,HL[k])/Math.max(100,mg||100))*(H-16)]});
  const band=sv('svg',{viewBox:`0 0 ${W} ${H+14}`,width:'100%',role:'img','aria-label':'Estimated caffeine remaining over the next 24 hours',class:'chart'},sv('polygon',{points:[...pts(1),...pts(0).reverse()].map(p=>p.join(',')).join(' '),class:'band'}),sv('text',{x:10,y:H+11,class:'ax'},'now'),sv('text',{x:W-10,y:H+11,'text-anchor':'end',class:'ax'},'+24 h'));
  const ints=medObjs().flatMap(m=>m.interactions.filter(i=>i.category==='caffeine'||i.category==='alcohol').map(i=>h('div',{cls:'warn'},h('b',{},m.name+' + '+i.category+': '),'“'+(i.evidence||i.text||'')+'” ',chips(i.cites))));
  return[h('h2',{},'Caffeine & alcohol'),
   sec('Caffeine today',h('div',{cls:'big'},Math.round(mg)+' mg'),h('div',{cls:'prog'+(mg>lim?' over':'')},h('div',{style:{width:Math.min(100,mg/lim*100)+'%'}})),h('div',{},(preg()?'Pregnancy guidance: under 200 mg/day (ACOG).':'FDA: up to 400 mg/day for most adults.')),
     row(dr,n,btn('Add',()=>{const x=C.drinks.find(y=>y.id===dr.value),k=+n.value||1;S.caf.log.push({d,t:NOW(),kind:x.id,mg:Math.round(x.mgPer100*x.ml/100*k),fdc:x.fdc});save();go('caf')},'chip on')),
     h('div',{cls:'sub'},C.drinksNote),q(preg()?C.preg:C.fda)),
   sec('Still in your body (estimate)',band,h('div',{},`At ${bed} tonight: about ${Math.round(cafRemain(bt>now?bt:now,HL[0]))}–${Math.round(cafRemain(bt>now?bt:now,HL[1]))} mg (half-life 3–6 h; it varies a lot between people).`),q(C.half),q(C.vary),h('div',{cls:'ev'},h('b',{},'Sleep: '),'“'+V.sleep.links[0].evidence+'” ',chips(V.sleep.links[0].cites)),btn('Open Sleep',()=>go('sleep'))),
   sec('Alcohol today',h('div',{cls:'big'},std.toFixed(1)+' standard drinks'),row(al,oz,abv,btn('Add',()=>{let s=1;if(al.value==='c'){const o=+oz.value,a=+abv.value;if(!(o>0&&a>0&&a<100))return;s=o*29.5735*a/100*0.789/14}S.caf.log.push({d,t:NOW(),std:Math.round(s*10)/10});save();go('caf')},'chip on')),
     q(C.std),h('div',{cls:'ev'},h('b',{},'Sleep: '),'“'+V.sleep.links[1].evidence+'” ',chips(V.sleep.links[1].cites)),
     h('div',{cls:'sub'},'Cancer link: alcohol is classified by IARC as Group 1 (carcinogenic to humans) — see Health › Cancer links for the sourced details.'),btn('Open Cancer links',()=>go('onc'))),
   ints.length?sec('Your medicines (from labels)',...ints):null,
   S.caf.log.some(x=>x.d===d)?btn('Undo last drink',()=>{S.caf.log.pop();save();go('caf')}):null,DISC()]}
// ================= APPLE HEALTH IMPORT
function applyImport(res,src,range,types){let w=0,s=0;for(const[d,v]of Object.entries(res.days)){S.hk.days[d]=Object.assign(S.hk.days[d]||{},v);if(v.flow&&S.cycle){S.cycle.days[d]=Object.assign(S.cycle.days[d]||{},{flow:v.flow,src:'ah'})}if(v.sleepMin)s++}
  for(const wo of res.workouts){const id=AH.WMAP[wo.type];if(!id||!EXL.get(id))continue;const t=Date.parse(wo.start);if(S.ex.log.some(e=>e.src==='ah'&&e.t===t))continue;S.ex.log.push({d:wo.d,id,min:wo.min,t,src:'ah',ahType:wo.type,kcal:wo.kcal});w++}
  S.hk.imports.push({at:new Date().toISOString(),src,range,types,counts:res.counts,days:Object.keys(res.days).length,workouts:w,rejected:res.rejected||0});save();return{w,s}}
X.importShortcut=(text,src)=>{const res=AH.parseShortcut(text,{});return Object.assign(applyImport(res,src||'Shortcut',null,Object.keys(res.counts)),{res})};
async function importFile(file,from,to,types,stat){const t0=performance.now();const A=AH.makeAcc({from,to,types});const dec=new TextDecoder();let tail='',bytes=0;
  const feed=(chunk,final)=>{bytes+=chunk.length;tail=AH.scanChunk(A,tail+dec.decode(chunk,{stream:!final}));};
  if(/\.zip$/i.test(file.name)){const {Unzip,UnzipInflate}=await import('./vendor/fflate.js');await new Promise((res,rej)=>{const uz=new Unzip();uz.register(UnzipInflate);let found=false;
      uz.onfile=f=>{if(/(^|\/)export\.xml$/.test(f.name)){found=true;f.ondata=(err,dat,fin)=>{if(err)return rej(err);feed(dat,fin);stat.textContent='Reading… '+(bytes/1e6).toFixed(0)+' MB';if(fin)res()};f.start()}};
      const rd=file.stream().getReader();(async()=>{for(;;){const{done,value}=await rd.read();if(done){uz.push(new Uint8Array(0),true);if(!found)rej(new Error('No export.xml inside this zip'));break}uz.push(value)}})().catch(rej)})}
  else{const rd=file.stream().getReader();for(;;){const{done,value}=await rd.read();if(done){feed(new Uint8Array(0),true);break}feed(value,false);stat.textContent='Reading… '+(bytes/1e6).toFixed(0)+' MB'}}
  const res=AH.finish(A);const r=applyImport(res,file.name,[from,to],types);return Object.assign(r,{res,ms:performance.now()-t0,bytes})}
X.importFile=importFile;
function ah(){const from=h('input',{type:'date','aria-label':'From',value:dayN(30)}),to=h('input',{type:'date','aria-label':'To',value:TODAY()}),stat=h('div',{cls:'sub',role:'status'});
  const LBL={steps:'Steps',kcal:'Active energy',exMin:'Exercise minutes',workouts:'Workouts',sleep:'Sleep analysis',rhr:'Resting heart rate',hrv:'HRV (SDNN)',wt:'Weight',flow:'Menstrual flow',water:'Dietary water'};
  const cb=Object.fromEntries(AH.TYPES.map(k=>[k,h('input',{type:'checkbox',checked:true})]));const fi=h('input',{type:'file',accept:'.zip,.xml,application/zip,text/xml','aria-label':'Apple Health export file'});
  const ta=h('textarea',{rows:4,'aria-label':'Paste Shortcut data',placeholder:'Paste the text your Shortcut copied'});
  return[h('h2',{},'Apple Health import'),h('div',{cls:'disc'},h('b',{},'Stays on this device. '),'Files are read inside this browser tab; nothing is uploaded. There is no live connection to Apple Health — a web app can’t read HealthKit directly — so you import a snapshot whenever you like.'),
   sec('1 · Import the Health export file',h('ol',{cls:'steps'},h('li',{},'On iPhone open Health → tap your picture (top right) → Export All Health Data → Export.'),h('li',{},'Save to Files. Then come back here and pick export.zip.')),
     row(h('label',{},'From ',from),h('label',{},'To ',to)),h('div',{cls:'grid2'},...AH.TYPES.map(k=>h('label',{cls:'chk'},cb[k],' '+LBL[k]))),fi,
     btn('Import file',async()=>{const f=fi.files[0];if(!f){stat.textContent='Pick a file first.';return}stat.textContent='Reading…';try{const r=await importFile(f,from.value,to.value,AH.TYPES.filter(k=>cb[k].checked),stat);stat.textContent=`Done: ${Object.keys(r.res.days).length} days, ${r.w} workouts added (${(r.ms/1000).toFixed(1)} s).`;setTimeout(()=>go('ah'),900)}catch(e){stat.textContent='Import failed: '+e.message}},'chip on'),stat),
   sec('2 · Or use an iPhone Shortcut (quicker, last few days)',h('div',{cls:'sub'},'The Shortcut copies a short text summary; paste it here. Opening a link with the data after # also works — the data never leaves your phone.'),ta,
     btn('Import pasted data',()=>{try{const r=X.importShortcut(ta.value,'Shortcut (paste)');stat.textContent=`Imported ${Object.keys(r.res.days).length} days, ${r.w} workouts${r.res.rejected?', skipped '+r.res.rejected+' invalid items':''}.`;setTimeout(()=>go('ah'),900)}catch(e){stat.textContent='Could not read that: '+e.message}},'chip on')),
   sec('Import history',...(S.hk.imports.length?S.hk.imports.slice().reverse().map(i=>h('div',{cls:'item'},h('b',{},new Date(i.at).toLocaleString()),' · '+i.src,h('div',{cls:'sub'},`${i.days} days · ${i.workouts} workouts · `+Object.entries(i.counts||{}).map(([k,v])=>(LBL[k]||k)+' '+v).join(', ')))):[h('div',{cls:'sub'},'Nothing imported yet.')]),
     btn('Delete imported data',()=>{if(!confirm('Delete everything imported from Apple Health (daily values, imported workouts, imported cycle flow)? Your own entries are kept.'))return;S.hk={days:{},imports:[]};S.ex.log=S.ex.log.filter(e=>e.src!=='ah');for(const[d,v]of Object.entries(S.cycle.days||{}))if(v.src==='ah')delete S.cycle.days[d];save();go('ah')},'btn danger')),DISC()]}
// hash import from a Shortcut link: #mbimport=<URI-encoded JSON or lines>
X.hashImport=()=>{const m=location.hash.match(/^#mbimport=(.+)$/s);if(!m)return null;let txt=null;try{txt=decodeURIComponent(m[1])}catch(e){}history.replaceState(null,'',location.pathname+location.search);if(!txt)return null;
  if(!confirm('Import health data from your Shortcut? It stays on this device.'))return null;try{const r=X.importShortcut(txt,'Shortcut (link)');alert('Imported '+Object.keys(r.res.days).length+' days.');return r}catch(e){alert('Could not import: '+e.message);return null}};
// ================= OCR autofill (lazy; vendored Tesseract.js; image never leaves device)
let TW=null;async function worker(stat){if(TW)return TW;stat&&(stat.textContent='Loading text reader (first time ~10 MB, then cached offline)…');const T=await import('./vendor/tess/tesseract.esm.min.js');const TT=T.default||T;
  TW=await TT.createWorker('eng',1,{workerPath:new URL('vendor/tess/worker.min.js',location.href).href,corePath:new URL('vendor/tess/core',location.href).href,langPath:new URL('vendor/tess/lang',location.href).href,workerBlobURL:false,gzip:true,cacheMethod:'none'});return TW}
X.ocrText=async(src,stat)=>{const w=await worker(stat);stat&&(stat.textContent='Reading text…');const t0=performance.now();const r=await w.recognize(src);return{text:r.data.text,words:(r.data.words||[]).map(x=>({text:x.text,confidence:x.confidence})),conf:r.data.confidence,ms:performance.now()-t0}};
const readURL=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)});
async function compress(url){const im=new Image();im.src=url;await im.decode();const s=Math.min(1,900/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.6)}
X.ocrFlow=(kind,preFile)=>{const m=document.getElementById('modal');const close=()=>{m.classList.add('hidden');m.replaceChildren()};const box=h('div',{cls:'box ocrbox'}),bodyEl=h('div'),stat=h('div',{cls:'sub',role:'status'});
  const title={lab:'Read a lab report',nut:'Read a Nutrition Facts label',supp:'Read a Supplement Facts label',med:'Read a medicine label'}[kind];
  const pick=()=>{const fi=h('input',{type:'file',accept:'image/*','aria-label':'Choose photo or screenshot'});fi.addEventListener('change',()=>fi.files[0]&&run(fi.files[0]));
    rc(bodyEl,h('div',{cls:'sub'},'Take a photo or choose a screenshot. The text is read on this device; the image is never uploaded and is discarded after review unless you choose to attach it.'),fi,stat)};
  const run=async f=>{try{const url=await readURL(f);rc(bodyEl,h('img',{src:url,alt:'Selected image',cls:'ocrimg'}),stat);const r=await X.ocrText(url,stat);X.lastOcr=r;review(url,r)}catch(e){stat.textContent='Could not read the image: '+(e.message||e)}};
  const LOW=70,cls=c=>c<LOW?'low':'';
  const review=(url,r)=>{const att=h('input',{type:'checkbox'});let form,saveF;
    if(kind==='nut'){const p=OP.parseNutrition(r.text,r.words);const nm=h('input',{type:'text',value:'My food (from label)','aria-label':'Food name',maxlength:80}),sg=num('Serving grams',p.servingG??'',{min:1});
      const ins=p.rows.map(x=>[x,num(x.k,x.v,{step:'any',cls:'qty '+cls(x.conf)})]);
      form=h('div',{},row(nm),row(h('label',{},'Serving size (g) ',sg)),...ins.map(([x,i])=>h('div',{cls:'qrow'+(x.conf<LOW?' low':'')},h('span',{},(x.k==='kcal'?'Calories':x.k==='fat'?'Total fat (g)':x.k==='carb'?'Carbohydrate (g)':x.k==='sugar'?'Sugars (g)':NAME(x.k))+(x.dv!=null?' · '+x.dv+'% DV':'')),i)));
      saveF=async()=>{const g=+sg.value;if(!(g>0))throw new Error('Enter the serving size in grams');const id='ocr'+Date.now(),per={};for(const[x,i]of ins){if(['fat','carb','sugar'].includes(x.k))continue;per[x.k]=(+i.value||0)*100/g}
        const cite={id:'user-'+id,retrieved:TODAY(),type:'Your label photo',publisher:'Your label',title:nm.value+' (read from your photo)',url:'',date:TODAY(),tier:4,tierRationale:'Read by on-device OCR from a label you photographed and checked.'};
        const p2={fdcId:id,name:nm.value.slice(0,80),per100g:per,serving:{g,label:g+' g'},portions:[{label:g+' g',g}],cite,src:'ocr',img:att.checked?await compress(url):null};S.products[id]=p2;FOOD.set(id,p2);CIT[cite.id]=cite;return null}}
    if(kind==='supp'){const p=OP.parseSupplement(r.text,r.words);const nm=h('input',{type:'text',value:'Supplement (from label)','aria-label':'Product name',maxlength:80});const ins=p.rows.map(x=>[x,num(x.k,x.v,{step:'any',cls:'qty '+cls(x.conf)})]);
      form=h('div',{},row(nm),p.serving?h('div',{cls:'sub'},'Serving size: '+p.serving):null,...ins.map(([x,i])=>h('div',{cls:'qrow'+(x.conf<LOW?' low':'')},h('span',{},NAME(x.k)+' ('+DRI[x.k].unit+')'),i)),ins.length?null:h('div',{cls:'warn','data-ui':'1'},'No nutrient amounts recognized.'));
      saveF=async()=>{const doses={};for(const[x,i]of ins)if(+i.value>0)doses[x.k]=+i.value;S.supps.push({id:'s'+Date.now(),name:nm.value.slice(0,80),freq:'daily',doses,on:true,img:att.checked?await compress(url):null});return null}}
    if(kind==='med'){const p=OP.parseMed(r.text,MEDS.meds);const sel=h('select',{'aria-label':'Medicine'},h('option',{value:''},'No match'),...MEDS.meds.map(x=>h('option',{value:x.id,selected:p.matches[0]===x.id},x.name)));form=h('div',{},sel,p.strength?h('div',{},'Strength read: '+p.strength):null);saveF=async()=>{if(sel.value&&!S.meds.includes(sel.value))S.meds.push(sel.value);return null}}
    let pendingImg=null;
    if(kind==='lab'){// re-create forms so onSave collects
      const p=OP.parseLab(r.text,V.labs.analytes,r.words);const got=[];const forms=p.rows.map(x=>{const f=labForm({analyte:x.analyte,value:x.value,unit:x.unit,lo:x.lo,hi:x.hi,flag:x.flag,date:p.date},e=>got.push(e));return[f,x]});
      form=h('div',{},p.date?h('div',{cls:'sub'},'Collection date found: '+p.date):h('div',{cls:'warn','data-ui':'1'},'No collection date found — please check the date.'),forms.length?forms.map(([f,x])=>h('div',{cls:'item'+(x.conf<LOW?' low':'')},x.conf<LOW?h('div',{cls:'sub'},'Low confidence ('+Math.round(x.conf)+'%) — check this row'):null,x.unitWarn?h('div',{cls:'warn'},'Unit read as “'+x.unit+'” is not valid for this test'):null,f)):h('div',{cls:'warn'},'No known tests found. You can enter them by hand.'));
      saveF=async()=>{for(const[f]of forms)f.go_();const img=att.checked?await compress(url):null;for(const e of got){if(img)e.img=img;S.labs.push(e)}if(forms.length&&got.length<forms.length)throw new Error('Fix the highlighted rows');return null}}
    rc(bodyEl,h('div',{cls:'ocrrev'},h('div',{cls:'ocrleft'},h('img',{src:url,alt:'Original image',cls:'ocrimg'})),h('div',{cls:'ocrright'},h('div',{cls:'disc'},h('b',{},'Check every field against the image. '),'Text recognition can make mistakes. Fields highlighted in amber had low confidence.'),form,
      h('label',{cls:'chk'},att,' Attach a compressed copy of this image to the entry (stored only on this device)'),
      row(btn('Confirm & save',async()=>{try{await saveF();save();close();go({lab:'labs',nut:'log',supp:'supp',med:'meds'}[kind])}catch(e){stat.textContent=e.message}},'btn primary'),btn('Cancel',close,'btn')),stat,h('details',{},h('summary',{},'Raw text ('+Math.round(r.conf)+'% overall, '+(r.ms/1000).toFixed(1)+' s)'),h('pre',{cls:'raw'},r.text)))))};
  box.append(h('div',{cls:'fhead'},h('h2',{},title),h('button',{cls:'icon-btn','aria-label':'Close',on:{click:close}},'✕')),bodyEl);m.replaceChildren(box);m.classList.remove('hidden');preFile?run(preFile):pick()};
return{act,sleep,rec,hyd,supp,labs,mood,caf,ah}}
