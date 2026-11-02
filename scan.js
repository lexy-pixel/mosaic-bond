// Barcode scanning + optional product lookup. No images are stored; frames live only in an in-memory canvas.
let zxLoad=null;
export function loadZX(){return zxLoad||(zxLoad=new Promise((res,rej)=>{if(window.ZXing)return res(window.ZXing);const s=document.createElement('script');s.src='vendor/zxing.min.js';s.onload=()=>res(window.ZXing);s.onerror=rej;document.head.appendChild(s)}))}
// ---- GTIN helpers
const ck=d=>{let s=0;const n=d.length;for(let i=0;i<n-1;i++)s+=(+d[i])*((n-1-i)%2?3:1);return (10-s%10)%10};
export function upcE2A(e){// 8-digit UPC-E (with number system + check) -> 12-digit UPC-A
  const ns=e[0],d=e.slice(1,7),c=e[7],l=d[5];let m;
  if('012'.includes(l))m=d.slice(0,2)+l+'0000'+d.slice(2,5);else if(l==='3')m=d.slice(0,3)+'00000'+d.slice(3,5);else if(l==='4')m=d.slice(0,4)+'00000'+d[4];else m=d.slice(0,5)+'0000'+l;
  return ns+m+c}
export function normalize(raw,fmt){const d=String(raw||'').replace(/\D/g,'');
  if(fmt==='UPC_E'&&d.length===8){const a=upcE2A(d);return ck(a)===+a[11]?a:null}
  if(!fmt&&d.length===8&&ck(d)!==+d[7]&&'01'.includes(d[0])){const a=upcE2A(d);return ck(a)===+a[11]?a:null}
  if(![8,12,13,14].includes(d.length))return null;return ck(d)===+d[d.length-1]?d:null}
export function variants(g){const z=g.replace(/^0+/,'');const out=new Set();for(const L of [8,12,13,14])if(z.length<=L)out.add(z.padStart(L,'0'));return [...out]}
const strip=s=>String(s||'').replace(/^0+/,'');
// ---- nutrient mapping (FDC nutrient ids -> app keys); values per 100 g
const NID={1008:'kcal',1003:'protein',1079:'fiber',1087:'ca',1089:'fe',1090:'mg',1091:'p',1092:'k',1093:'na',1095:'zn',1098:'cu',1101:'mn',1103:'se',1106:'vitA',1162:'vitC',1114:'vitD',1109:'vitE',1185:'vitK',1165:'b1',1166:'b2',1167:'b3',1170:'b5',1175:'b6',1176:'b7',1190:'b9',1178:'b12',1180:'choline'};
const title=s=>String(s||'').toLowerCase().replace(/\b([a-z])/g,c=>c.toUpperCase());
export async function fdcLookup(g,key){const v=variants(g);
  const u='https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+encodeURIComponent(key||'DEMO_KEY')+'&dataType=Branded&pageSize=10&query='+encodeURIComponent(v.join(' OR '));
  const r=await fetch(u,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
  if(r.status===429)throw new Error('rate');if(r.status===403)throw new Error('key');if(!r.ok)throw new Error('http '+r.status);
  const d=await r.json();const f=(d.foods||[]).filter(x=>strip(x.gtinUpc)===strip(g)).sort((a,b)=>String(b.publishedDate||'').localeCompare(String(a.publishedDate||'')))[0];if(!f)return null;
  const per={};for(const n of f.foodNutrients||[]){const k=NID[n.nutrientId];if(k&&n.value!=null){if(k==='kcal'&&String(n.unitName).toUpperCase()!=='KCAL')continue;per[k]=+n.value}
    if(n.nutrientId===1110&&per.vitD==null&&n.value!=null)per.vitD=+n.value/40}
  const unit=String(f.servingSizeUnit||'').toLowerCase();const sg=f.servingSize&&/^(g|grm|ml|mlt)$/.test(unit)?+f.servingSize:null;
  const name=title(f.description);const bn=String(f.brandName||f.brandOwner||'').toLowerCase();let sh=name;if(bn&&sh.toLowerCase().startsWith(bn))sh=sh.slice(bn.length).replace(/^[\s,]+/,'');sh=sh.replace(/\b\d+(\.\d+)?\s*(ounce|oz|fl oz|lb|g|ml)\b/ig,'').replace(/\s+/g,' ').trim()||name;const date=f.publishedDate||f.modifiedDate||null;
  return {fdcId:f.fdcId,name:name+(f.brandOwner&&!name.toLowerCase().includes(String(f.brandName||'').toLowerCase())?' ('+f.brandOwner+')':''),brand:f.brandOwner||'',short:sh,gtin:g,per100g:per,
    serving:sg?{g:sg,label:(f.householdServingFullText?f.householdServingFullText+' ':'1 serving ')+'('+Math.round(sg)+(/ml|mlt/.test(unit)?' mL':' g')+')',ml:/ml|mlt/.test(unit)}:null,
    cite:{id:'fdcb-'+f.fdcId,retrieved:new Date().toISOString().slice(0,10),type:'Branded food label data',publisher:'USDA FoodData Central — Branded Foods (manufacturer label data)',title:name+' — '+(f.brandOwner||'')+' (GTIN '+f.gtinUpc+')',url:'https://fdc.nal.usda.gov/food-details/'+f.fdcId+'/nutrients',date,tier:2,tierRationale:'Manufacturer-submitted label data published by USDA FoodData Central; not USDA laboratory-analyzed.'},src:'fdc'}}
export async function offLookup(g){const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(g)+'.json?fields=code,product_name,brands,nutriments,serving_quantity,serving_size,last_modified_t',{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
  if(r.status===404)return null;if(!r.ok)throw new Error('http '+r.status);const d=await r.json();if(d.status!==1||!d.product)return null;const p=d.product,n=p.nutriments||{};
  const G=(k,m)=>n[k+'_100g']!=null?+n[k+'_100g']*m:undefined;const per={kcal:n['energy-kcal_100g'],protein:G('proteins',1),fiber:G('fiber',1),na:G('sodium',1000),ca:G('calcium',1000),fe:G('iron',1000),k:G('potassium',1000),vitC:G('vitamin-c',1000),vitD:G('vitamin-d',1e6),mg:G('magnesium',1000),zn:G('zinc',1000)};
  for(const k in per)if(per[k]==null||isNaN(per[k]))delete per[k];const sg=+p.serving_quantity||null;const date=p.last_modified_t?new Date(p.last_modified_t*1000).toISOString().slice(0,10):null;
  const name=(p.product_name||'Unnamed product')+(p.brands?' ('+String(p.brands).split(',')[0]+')':'');
  return {fdcId:'off:'+g,name,brand:p.brands||'',short:p.product_name||name,gtin:g,per100g:per,serving:sg?{g:sg,label:(p.serving_size||'1 serving')+(String(p.serving_size||'').includes('g')?'':' ('+Math.round(sg)+' g)')}:null,
    cite:{id:'off-'+g,retrieved:new Date().toISOString().slice(0,10),type:'Crowd-sourced product data',publisher:'Open Food Facts contributors (crowd-sourced, ODbL)',title:name+' (barcode '+g+')',url:'https://world.openfoodfacts.org/product/'+g,date,tier:4,tierRationale:'Crowd-sourced, unverified label transcription. Data © Open Food Facts contributors, Open Database License (ODbL).'},src:'off'}}
// ---- camera + decoder
export async function startCamera(video,onCode,onStatus){const ZX=await loadZX();const F=ZX.BarcodeFormat;const hints=new Map();hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS,[F.UPC_A,F.UPC_E,F.EAN_13,F.EAN_8]);hints.set(ZX.DecodeHintType.TRY_HARDER,true);
  const rd=new ZX.MultiFormatReader();rd.setHints(hints);
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  video.srcObject=stream;video.setAttribute('playsinline','');video.muted=true;await video.play();
  const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});let stop=false,t=0,hits={};
  const tick=()=>{if(stop)return;if(video.readyState>=2&&video.videoWidth){const w=Math.min(960,video.videoWidth),h=Math.round(w*video.videoHeight/video.videoWidth);cv.width=w;cv.height=h;cx.drawImage(video,0,0,w,h);
      try{const src=new ZX.HTMLCanvasElementLuminanceSource(cv),bm=new ZX.BinaryBitmap(new ZX.HybridBinarizer(src));const res=rd.decodeWithState(bm);const fmt=F[res.getBarcodeFormat()];const g=normalize(res.getText(),fmt);
        if(g){hits[g]=(hits[g]||0)+1;if(hits[g]>=2){api.stop();onCode(g,fmt);return}}}catch(e){/* no code in frame */}
      cx.clearRect(0,0,cv.width,cv.height)}
    t=setTimeout(tick,180)};
  const api={stop(){stop=true;clearTimeout(t);stream.getTracks().forEach(x=>x.stop());video.srcObject=null;cv.width=cv.height=0}};tick();return api}
// ---- v20 text search (only the search text + API key is sent)
const DTR={'Foundation':0,'SR Legacy':1,'Survey (FNDDS)':2,'Branded':3};
export async function fdcSearch(q,key){const u='https://api.nal.usda.gov/fdc/v1/foods/search?api_key='+encodeURIComponent(key||'DEMO_KEY')+'&pageSize=25&dataType='+encodeURIComponent('Foundation,SR Legacy,Survey (FNDDS),Branded')+'&query='+encodeURIComponent(q);
  const r=await fetch(u,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
  if(r.status===429)throw new Error('rate');if(r.status===403)throw new Error('key');if(!r.ok)throw new Error('http '+r.status);
  const d=await r.json();return (d.foods||[]).sort((a,b)=>(DTR[a.dataType]??9)-(DTR[b.dataType]??9)).slice(0,12).map(f=>{const per={};
    for(const n of f.foodNutrients||[]){const k=NID[n.nutrientId];if(k&&n.value!=null){if(k==='kcal'&&String(n.unitName).toUpperCase()!=='KCAL')continue;per[k]=+n.value}if(n.nutrientId===1110&&per.vitD==null&&n.value!=null)per.vitD=+n.value/40}
    const br=f.dataType==='Branded',name=br?title(f.description)+(f.brandOwner?' ('+f.brandOwner+')':''):f.description;
    return {fdcId:'fdc:'+f.fdcId,name,short:name,per100g:per,dataType:f.dataType,custom:true,
      cite:{id:'fdcs-'+f.fdcId,retrieved:new Date().toISOString().slice(0,10),type:br?'Branded food label data':'Government database',publisher:'USDA FoodData Central — '+f.dataType,title:name+' (FDC '+f.fdcId+')',url:'https://fdc.nal.usda.gov/food-details/'+f.fdcId+'/nutrients',date:f.publishedDate||null,tier:br?2:1,tierRationale:br?'Manufacturer-submitted label data published by USDA.':'USDA analyzed/compiled food composition data.'},src:'fdc'}})}
export async function offSearch(q){const r=await fetch('https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=10&fields=code,product_name,brands,nutriments,last_modified_t&search_terms='+encodeURIComponent(q),{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
  if(!r.ok)throw new Error('http '+r.status);const d=await r.json();return (d.products||[]).filter(p=>p.product_name).map(p=>{const n=p.nutriments||{},G=(k,m)=>n[k+'_100g']!=null?+n[k+'_100g']*m:undefined;
    const per={kcal:n['energy-kcal_100g'],protein:G('proteins',1),fiber:G('fiber',1),na:G('sodium',1000),ca:G('calcium',1000),fe:G('iron',1000),k:G('potassium',1000),vitC:G('vitamin-c',1000),vitD:G('vitamin-d',1e6),mg:G('magnesium',1000),zn:G('zinc',1000)};for(const k in per)if(per[k]==null||isNaN(per[k]))delete per[k];
    const name=p.product_name+(p.brands?' ('+String(p.brands).split(',')[0]+')':''),date=p.last_modified_t?new Date(p.last_modified_t*1000).toISOString().slice(0,10):null;
    return {fdcId:'off:'+p.code,name,short:p.product_name,per100g:per,custom:true,cite:{id:'off-'+p.code,retrieved:new Date().toISOString().slice(0,10),type:'Crowd-sourced product data',publisher:'Open Food Facts contributors (crowd-sourced, ODbL)',title:name,url:'https://world.openfoodfacts.org/product/'+p.code,date,tier:4,tierRationale:'Crowd-sourced, unverified label transcription. Data © Open Food Facts contributors, ODbL.'},src:'off'}})}
