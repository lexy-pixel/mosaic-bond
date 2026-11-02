// v19 muscle-recovery ESTIMATE (general timelines, not a measurement). Pure functions.
// Window to "mostly recovered" (level < 10% of start): 24 h light/stretch, 48 h typical, 72 h high-load or eccentric-heavy
// (soreness typically peaks 24–72 h after damaging exercise — PMID 25352440; eccentric work causes more micro-injury — PMID 12617692).
export const ECC=new Set(['lunges','barbell-squat','bodyweight-squats','deadlift','hiking','stair-climbing','jogging','running-mph','jump-rope','hiit-vigorous','soccer-casual','basketball-general','tennis-singles','kettlebell-swings']);
export function load(e,x){const met=x.met||3;let L=met*(e.min||0)/60;if(e.sets&&e.reps)L+=e.sets*e.reps/30;else if(e.sets)L+=e.sets/3;if(e.rpe!=null)L*=0.6+e.rpe/12.5;return L}
export function windowH(e,x,L,sore){let W=x.type==='stretch'||x.type==='flexibility'||x.type==='balance'||(x.met||3)<3?24:48;if(W===48&&(L>=4||ECC.has(e.id||x.id)))W=72;
  const f=sore>=7?1.5:sore>=4?1.25:1;return {W:W*f,base:W,f}}
export function sessions(log,EXL,soreFor){return log.map(e=>{const x=EXL.get(e.id);if(!x)return null;const t=e.t||Date.parse(e.d+'T18:00:00');const L=load(e,x);const a=Math.min(1,L/4);const w=windowH(e,x,L,soreFor?soreFor(t):0);return{e,x,t,L,a,...w}}).filter(Boolean)}
const lv=(s,now)=>{const dt=(now-s.t)/36e5;if(dt<0)return 0;return s.a*Math.exp(-Math.LN10*dt/s.W)};
export function levels(ss,now){const out={},why={};for(const s of ss){for(const[r,m]of[...s.x.primary.map(r=>[r,1]),...s.x.secondary.map(r=>[r,.5])]){const v=lv(s,now)*m;if(v<0.005)continue;out[r]=Math.min(1,(out[r]||0)+v);(why[r]||(why[r]=[])).push({s,v,role:m===1?'primary':'secondary'})}}return{lv:out,why}}
export function hoursToMostly(ss,region,now){for(let h=0;h<=240;h++){const{lv:l}=levels(ss,now+h*36e5);if(!(l[region]>=0.1))return h}return 240}
