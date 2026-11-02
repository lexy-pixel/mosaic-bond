export function ocrFix(t){return String(t).replace(/\bA[lI|]c\b/g,'A1c').replace(/\bm[lI|]U\//g,'mIU/').replace(/\b[O](?=\s*(?:mg|mcg|g|%)\b)/g,'0').replace(/\((\d+)9\)/g,'($1g)').replace(/(\d)\s*rng\b/g,'$1 mg')}
// v19 OCR text parsers (pure). Every result carries a confidence; the UI always asks the user to review.
const num=s=>{if(s==null)return null;const n=parseFloat(String(s).replace(/,/g,'').replace(/[oO](?=\d)|(?<=\d)[oO]/g,'0'));return isFinite(n)?n:null};
const norm=s=>s.toLowerCase().replace(/[^a-z0-9%(),\- ]/g,' ').replace(/\s+/g,' ').trim();
export function lineConf(words,line){if(!words||!words.length)return 90;const toks=line.split(/\s+/).filter(Boolean);let c=[],i=0;for(const w of words){if(toks.includes(w.text)){c.push(w.confidence);i++}}return c.length?Math.min(...c):70}
const UNITRE='(ng\\/mL|ng\\/ml|nmol\\/L|nmol\\/l|pg\\/mL|pg\\/ml|pmol\\/L|g\\/dL|g\\/dl|g\\/L|mg\\/dL|mg\\/dl|mmol\\/L|mmol\\/l|mmol\\/mol|mEq\\/L|mIU\\/L|uIU\\/mL|µIU\\/mL|mIU\\/mL|U\\/L|IU\\/L|umol\\/L|µmol\\/L|µg\\/L|ug\\/L|%)';
const UFIX=u=>u?u.replace(/ml$/,'mL').replace(/dl$/,'dL').replace(/\/l$/,'/L').replace(/^ug/,'µg').replace(/^uIU/,'µIU').replace(/^umol/,'µmol').replace('mIU/mL','µIU/mL'):u;
export function parseLab(text,analytes,words){text=ocrFix(text);const out={date:null,rows:[]};const dm=text.match(/(?:collect(?:ed|ion)?(?: date)?|drawn|date collected)[:\s]*([01]?\d)[\/\-]([0-3]?\d)[\/\-]((?:20)?\d\d)/i)||text.match(/(?:collect(?:ed|ion)?(?: date)?|drawn)[:\s]*(\d{4})-(\d{2})-(\d{2})/i);
  if(dm){out.date=dm[1].length===4?`${dm[1]}-${dm[2]}-${dm[3]}`:`${dm[3].length===2?'20'+dm[3]:dm[3]}-${dm[1].padStart(2,'0')}-${dm[2].padStart(2,'0')}`}
  const syn=[];for(const a of analytes)for(const s of a.syn)syn.push([s,a]);syn.sort((x,y)=>y[0].length-x[0].length);
  const seen=new Set();
  for(const raw of text.split(/\n/)){const L=norm(raw);if(!L)continue;let hit=null;for(const[s,a]of syn){const re=new RegExp('^'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z])');if(re.test(L)){hit=[s,a];break}}
    if(!hit||seen.has(hit[1].id))continue;const rest=raw.slice(raw.toLowerCase().indexOf(hit[0].split(' ').pop())+hit[0].split(' ').pop().length).replace(/^(?:[\s,:()]+|25[- ]?(?:OH|hydroxy)\b|total\b|serum\b|plasma\b|d[23]?\b)+/i,' ');
    const m=rest.match(new RegExp('(-?\\d[\\d,]*\\.?\\d*)\\s*(H|L|HH|LL|High|Low|C|\\*)?\\s*'+UNITRE+'?','i'));if(!m)continue;
    const rr=rest.slice(m.index+m[0].length).match(/(\d[\d,]*\.?\d*)\s*[-–]\s*(\d[\d,]*\.?\d*)|([<>]=?)\s*(\d[\d,]*\.?\d*)/);
    const after=rest.slice(m.index+m[0].length).replace(/[a-zµ]+\/[a-z]+|\d[\d.,]*\s*[-–]\s*\d[\d.,]*/gi,' ');let flag=m[2]||((after.match(/\b(HH|LL|H|L|High|Low|Critical|Crit|Panic|C)\b/i)||[])[1])||'';flag=flag.toUpperCase().replace('HIGH','H').replace('LOW','L');
    const unit=UFIX(m[3]||(rest.match(new RegExp(UNITRE,'i'))||[])[1]||'');
    const row={analyte:hit[1].id,name:hit[1].name,value:num(m[1]),unit,lo:rr&&rr[1]?num(rr[1]):rr&&rr[3]&&rr[3][0]==='>'?num(rr[4]):null,hi:rr&&rr[2]?num(rr[2]):rr&&rr[3]&&rr[3][0]==='<'?num(rr[4]):null,flag,conf:lineConf(words,raw)};
    if(unit&&!(unit in hit[1].units))row.unitWarn=true;if(row.value==null)continue;seen.add(hit[1].id);out.rows.push(row)}
  return out}
const NF=[['kcal',/^calories\b/i,''],['fat',/^total fat\b/i,'g'],['na',/^sodium\b/i,'mg'],['carb',/^total carbohydrate\b/i,'g'],['fiber',/^dietary fiber\b/i,'g'],['sugar',/^total sugars?\b/i,'g'],['protein',/^protein\b/i,'g'],['vitD',/^vitamin d\b/i,'µg'],['ca',/^calcium\b/i,'mg'],['fe',/^iron\b/i,'mg'],['k',/^potassium\b/i,'mg']];
export function parseNutrition(text,words){text=ocrFix(text);const r={serving:null,servingG:null,rows:[]};const sm=text.match(/serving size\s*([^\n]*?)\(?\s*(\d+\.?\d*)\s*(g|ml|mL)\s*\)?/i);if(sm){r.serving=(sm[1]||'').trim()||null;r.servingG=num(sm[2])}
  for(const raw of text.split(/\n/)){const L=raw.trim().replace(/^[^A-Za-z]+/,'');for(const[k,re,u]of NF){if(r.rows.some(x=>x.k===k))continue;if(!re.test(L))continue;
    const m=k==='kcal'?L.match(/calories\s*(\d+)/i):L.match(/(\d+\.?\d*)\s*(mcg|µg|ug|mg|g)\b/i);if(!m)continue;let v=num(m[1]);const uu=(m[2]||'').toLowerCase();if(k==='vitD'&&uu==='mg')v*=1000;if(u==='mg'&&uu==='g')v*=1000;
    const dv=(L.match(/(\d+)\s*%/)||[])[1];r.rows.push({k,v,dv:dv?+dv:null,conf:lineConf(words,raw)})}}return r}
const SF=[['vitA',/vitamin a\b/i,'µg'],['vitC',/vitamin c\b/i,'mg'],['vitD',/vitamin d\d?\b/i,'µg'],['vitE',/vitamin e\b/i,'mg'],['vitK',/vitamin k\d?\b/i,'µg'],['b1',/thiamin/i,'mg'],['b2',/riboflavin/i,'mg'],['b3',/niacin/i,'mg'],['b6',/vitamin b6|vitamin b-6/i,'mg'],['b9',/folate|folic acid/i,'µg'],['b12',/vitamin b12|vitamin b-12|cobalamin/i,'µg'],['b7',/biotin/i,'µg'],['b5',/pantothenic/i,'mg'],['ca',/calcium/i,'mg'],['fe',/\biron\b/i,'mg'],['mg',/magnesium/i,'mg'],['zn',/\bzinc\b/i,'mg'],['se',/selenium/i,'µg'],['cu',/copper/i,'mg'],['mn',/manganese/i,'mg'],['iodine',/iodine/i,'µg'],['k',/potassium/i,'mg'],['choline',/choline/i,'mg'],['omega3',/omega-?3|epa|dha/i,'g']];
export function parseSupplement(text,words){text=ocrFix(text);const r={serving:(text.match(/serving size\s*[:\-]?\s*([^\n]+)/i)||[])[1]?.trim()||null,rows:[],name:null};
  for(const raw of text.split(/\n/)){const L=raw.trim();for(const[k,re,u]of SF){if(r.rows.some(x=>x.k===k))continue;if(!re.test(L))continue;const m=L.match(/(\d[\d,]*\.?\d*)\s*(mcg|µg|ug|mg|g|IU)\b/i);if(!m)continue;
    let v=num(m[1]),uu=m[2].toLowerCase();if(uu==='iu'){if(k==='vitD')v=v/40;else continue}else if(u==='µg'&&uu==='mg')v*=1000;else if(u==='mg'&&(uu==='mcg'||uu==='µg'||uu==='ug'))v/=1000;else if(u==='mg'&&uu==='g')v*=1000;
    r.rows.push({k,v:Math.round(v*1000)/1000,label:L.slice(0,60),conf:lineConf(words,raw)})}}return r}
export function parseMed(text,meds){const t=text.toLowerCase();const hits=meds.filter(m=>t.includes(m.id.replace('_',' '))||t.includes(m.name.toLowerCase().split(' (')[0]));const st=text.match(/(\d+\.?\d*)\s*(mg|mcg|µg)\b/i);return{matches:hits.map(m=>m.id),strength:st?st[1]+' '+st[2]:null}}
