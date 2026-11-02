// v19 Apple Health parsing (pure functions; no DOM) — used by the app and by tests (node).
export const HK={steps:'HKQuantityTypeIdentifierStepCount',kcal:'HKQuantityTypeIdentifierActiveEnergyBurned',exMin:'HKQuantityTypeIdentifierAppleExerciseTime',rhr:'HKQuantityTypeIdentifierRestingHeartRate',hrv:'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',wt:'HKQuantityTypeIdentifierBodyMass',water:'HKQuantityTypeIdentifierDietaryWater',sleep:'HKCategoryTypeIdentifierSleepAnalysis',flow:'HKCategoryTypeIdentifierMenstrualFlow'};
export const TYPES=Object.keys(HK).concat(['workouts']);
export const WMAP={Walking:'brisk-walking',Running:'jogging',Cycling:'cycling-moderate',Hiking:'hiking',Swimming:'swimming-freestyle-slow',Elliptical:'elliptical-moderate',Rowing:'rowing-machine-moderate',StairClimbing:'stair-climbing',TraditionalStrengthTraining:'circuit-training-moderate',FunctionalStrengthTraining:'circuit-training-moderate',HighIntensityIntervalTraining:'hiit-vigorous',Yoga:'hatha-yoga',Pilates:'pilates-general',Dance:'dance-aerobics-low-impact',Basketball:'basketball-general',Soccer:'soccer-casual',Tennis:'tennis-singles',JumpRope:'jump-rope',TaiChi:'tai-chi-qi-gong',CoreTraining:'plank',Flexibility:'hamstring-stretch',MixedCardio:'circuit-training-moderate',CrossTraining:'circuit-training-moderate'};
const DATE=/^\d{4}-\d{2}-\d{2}$/;
export function parseDate(s){if(typeof s!=='string'||s.length>40)return null;const m=s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/);if(!m){return DATE.test(s)?new Date(s+'T12:00:00'):null}
  let z=m[7]||'';if(z&&z!=='Z'&&!z.includes(':'))z=z.slice(0,3)+':'+z.slice(3);const d=new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]||'00'}${z}`);return isNaN(d)?null:d}
export const localDay=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const attrs=tag=>{const o={};tag.replace(/(\w+)="([^"]*)"/g,(_,k,v)=>{o[k]=v.replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');return''});return o};
// Accumulator: per-day, per-source sums (max across sources avoids double counting iPhone + Watch)
export function makeAcc(opts){const from=opts.from||'0000',to=opts.to||'9999',want=new Set(opts.types||TYPES);
  const A={days:{},src:{},sleep:{},workouts:[],n:{},from,to,want};return A}
function addSrc(A,day,k,src,v){const key=day+'|'+k;(A.src[key]||(A.src[key]={}))[src]=(A.src[key][src]||0)+v}
export function feedTag(A,tag){const isW=tag.startsWith('<Workout');const a=attrs(tag);
  if(isW){if(!A.want.has('workouts'))return;const s=parseDate(a.startDate),e=parseDate(a.endDate);if(!s||!e)return;const d=localDay(s);if(d<A.from||d>A.to)return;
    const t=(a.workoutActivityType||'').replace('HKWorkoutActivityType','');let min=+a.duration;if(a.durationUnit==='s')min/=60;else if(a.durationUnit==='hr')min*=60;if(!(min>0))min=(e-s)/6e4;
    A.workouts.push({d,start:s.toISOString(),type:t,min:Math.round(min),kcal:a.totalEnergyBurned?Math.round(+a.totalEnergyBurned):null});A.n.workouts=(A.n.workouts||0)+1;return}
  const k=Object.keys(HK).find(k=>HK[k]===a.type);if(!k||!A.want.has(k))return;const s=parseDate(a.startDate),e=parseDate(a.endDate);if(!s||!e)return;
  const src=(a.sourceName||'?').slice(0,60);
  if(k==='sleep'){const wd=localDay(e);if(wd<A.from||wd>A.to)return;if(!/Asleep/.test(a.value||''))return;const L=A.sleep[wd]||(A.sleep[wd]={});(L[src]||(L[src]=[])).push([+s,+e]);A.n.sleep=(A.n.sleep||0)+1;return}
  const d=localDay(s);if(d<A.from||d>A.to)return;let v=+a.value;
  if(k==='flow'){A.days[d]=Object.assign(A.days[d]||{},{flow:(a.value||'').replace('HKCategoryValueMenstrualFlow','').toLowerCase()||'unspecified'});A.n.flow=(A.n.flow||0)+1;return}
  if(!isFinite(v))return;const u=a.unit||'';
  if(k==='kcal'&&u==='kJ')v/=4.184;if(k==='wt'&&u==='lb')v*=0.45359237;if(k==='water'){v=u==='L'?v*1000:u==='fl_oz_us'?v*29.5735:u==='cup_us'?v*236.6:v}
  A.n[k]=(A.n[k]||0)+1;
  if(k==='rhr'||k==='hrv'||k==='wt'){const D=A.days[d]||(A.days[d]={});const c=D['_'+k]||[0,0];D['_'+k]=[c[0]+v,c[1]+1];return}
  addSrc(A,d,k,src,v)}
const merge=iv=>{iv.sort((a,b)=>a[0]-b[0]);let t=0,cs=null,ce=null;for(const[s,e]of iv){if(cs==null||s>ce){if(cs!=null)t+=ce-cs;cs=s;ce=e}else ce=Math.max(ce,e)}if(cs!=null)t+=ce-cs;return t/6e4};
export function finish(A){for(const[key,m]of Object.entries(A.src)){const[d,k]=key.split('|');const D=A.days[d]||(A.days[d]={});D[k]=Math.round(Math.max(...Object.values(m)))}
  for(const[d,m]of Object.entries(A.sleep)){const D=A.days[d]||(A.days[d]={});D.sleepMin=Math.round(Math.max(...Object.values(m).map(merge)))}
  for(const D of Object.values(A.days))for(const k of['rhr','hrv','wt'])if(D['_'+k]){D[k]=Math.round(10*D['_'+k][0]/D['_'+k][1])/10;delete D['_'+k]}
  return{days:A.days,workouts:A.workouts,counts:A.n}}
// Streaming scan over decoded text chunks: returns leftover tail
export function scanChunk(A,buf){const re=/<(Record|Workout)\s[^>]*?\/?>/g;let m,last=0;while((m=re.exec(buf))){feedTag(A,m[0]);last=re.lastIndex}
  const cut=buf.lastIndexOf('<');return cut>=last?buf.slice(cut):''}
export function parseXmlString(xml,opts){const A=makeAcc(opts);scanChunk(A,xml);return finish(A)}
// ---- Shortcut payload (JSON or simple "type|date|value|unit" lines) → same shape as finish()
const NUM=v=>{const n=typeof v==='number'?v:parseFloat(String(v).replace(/,/g,''));return isFinite(n)&&Math.abs(n)<1e7?n:null};
export function parseShortcut(text,opts={}){if(typeof text!=='string')throw new Error('No data');if(text.length>2e6)throw new Error('Too large (max 2 MB)');
  let j=null;const t=text.trim();
  if(t.startsWith('{')){try{j=JSON.parse(t)}catch(e){throw new Error('Not valid JSON')}}
  else{j={data:{}};for(const line of t.split(/\r?\n/)){const p=line.split('|').map(x=>x.trim());if(p.length<3)continue;const k=p[0].toLowerCase();(j.data[k]||(j.data[k]=[])).push(k==='sleep'?{start:p[1],end:p[2],value:p[3]||'asleep'}:k==='workouts'||k==='workout'?{type:p[1],start:p[2],minutes:p[3],kcal:p[4]}:{date:p[1],value:p[2],unit:p[3]})}}
  const D=j&&typeof j==='object'?(j.data||j):null;if(!D||typeof D!=='object')throw new Error('Missing "data"');
  const AL={steps:'steps',stepcount:'steps',activeenergy:'kcal',active_energy:'kcal',kcal:'kcal',exerciseminutes:'exMin',exercise:'exMin',exmin:'exMin',restinghr:'rhr',resting_hr:'rhr',rhr:'rhr',hrv:'hrv',weight:'wt',water:'water',sleep:'sleep',workouts:'workouts',workout:'workouts',menstrualflow:'flow',flow:'flow'};
  const A=makeAcc(opts),out={days:{},workouts:[],counts:{}};let bad=0;
  for(const[k0,arr]of Object.entries(D)){const k=AL[k0.toLowerCase().replace(/\s/g,'')];if(!k||!Array.isArray(arr)){bad++;continue}if(arr.length>20000)throw new Error('Too many samples');
    for(const r of arr){if(!r||typeof r!=='object'){bad++;continue}
      if(k==='workouts'){const s=parseDate(String(r.start||r.date||''));const min=NUM(r.minutes??r.duration);if(!s||!(min>0)||min>1440){bad++;continue}const d=localDay(s);if(d<A.from||d>A.to)continue;
        out.workouts.push({d,start:s.toISOString(),type:String(r.type||'Other').replace(/[^A-Za-z ]/g,'').replace(/ /g,'').slice(0,40),min:Math.round(min),kcal:NUM(r.kcal)});out.counts.workouts=(out.counts.workouts||0)+1;continue}
      if(k==='sleep'){const s=parseDate(String(r.start||'')),e=parseDate(String(r.end||''));if(!s||!e||e<=s||e-s>864e5){bad++;continue}if(!/asleep|core|deep|rem/i.test(String(r.value||'asleep')))continue;const wd=localDay(e);if(wd<A.from||wd>A.to)continue;((A.sleep[wd]||(A.sleep[wd]={})).sc||(A.sleep[wd].sc=[])).push([+s,+e]);out.counts.sleep=(out.counts.sleep||0)+1;continue}
      const dd=parseDate(String(r.date||r.start||''));let v=NUM(r.value);if(!dd||v==null||v<0){bad++;continue}const d=localDay(dd);if(d<A.from||d>A.to)continue;
      if(k==='flow'){(out.days[d]||(out.days[d]={})).flow=String(r.value).toLowerCase().replace(/[^a-z]/g,'').slice(0,12);continue}
      const u=String(r.unit||'');if(k==='wt'&&/lb/i.test(u))v*=0.45359237;if(k==='water')v=/^l$/i.test(u)?v*1000:/oz/i.test(u)?v*29.5735:v;if(k==='kcal'&&/kj/i.test(u))v/=4.184;
      const LIM={steps:2e5,kcal:2e4,exMin:1440,rhr:250,hrv:500,wt:500,water:2e4};if(v>LIM[k]){bad++;continue}
      out.counts[k]=(out.counts[k]||0)+1;const X=out.days[d]||(out.days[d]={});if(k==='rhr'||k==='hrv'||k==='wt'){const c=X['_'+k]||[0,0];X['_'+k]=[c[0]+v,c[1]+1]}else X[k]=(X[k]||0)+v}}
  for(const[d,m]of Object.entries(A.sleep)){(out.days[d]||(out.days[d]={})).sleepMin=Math.round(merge(m.sc))}
  for(const X of Object.values(out.days)){for(const k of['rhr','hrv','wt'])if(X['_'+k]){X[k]=Math.round(10*X['_'+k][0]/X['_'+k][1])/10;delete X['_'+k]}for(const k of['steps','kcal','exMin','water'])if(X[k]!=null)X[k]=Math.round(X[k])}
  out.rejected=bad;return out}
