// Mosaic Bond unit conversions. Everything is stored in metric; these convert for display/input only.
export const OZ=28.349523125,LB=0.45359237,IN=2.54,FLOZ=29.5735295625,CUP=236.5882365,MI=1.609344,KJ=4.184;
export const PRESETS={us:{food:'g',vol:'cup',wt:'lb',ht:'ftin',temp:'F',hyd:'floz',dist:'mi',energy:'kcal'},metric:{food:'g',vol:'mL',wt:'kg',ht:'cm',temp:'C',hyd:'mL',dist:'km',energy:'kcal'}};
export const OPTS={food:[['g','g'],['oz','oz']],vol:[['mL','mL'],['floz','fl oz'],['cup','cups']],wt:[['lb','lb'],['kg','kg']],ht:[['ftin','ft-in'],['cm','cm']],temp:[['F','°F'],['C','°C']],hyd:[['floz','fl oz'],['mL','mL'],['cup','cups']],dist:[['mi','mi'],['km','km']],energy:[['kcal','kcal'],['kJ','kJ']]};
const r=(v,d)=>{const m=10**d;return Math.round(v*m)/m};
// metric base units: g, mL, kg, cm, °C, mL, km, kcal
export function toU(kind,v,u){switch(kind){case'food':return u==='oz'?v/OZ:v;case'vol':case'hyd':return u==='floz'?v/FLOZ:u==='cup'?v/CUP:v;case'wt':return u==='lb'?v/LB:v;case'ht':return u==='ftin'?v/IN:v;case'temp':return u==='F'?v*9/5+32:v;case'dist':return u==='mi'?v/MI:v;case'energy':return u==='kJ'?v*KJ:v}return v}
export function fromU(kind,v,u){switch(kind){case'food':return u==='oz'?v*OZ:v;case'vol':case'hyd':return u==='floz'?v*FLOZ:u==='cup'?v*CUP:v;case'wt':return u==='lb'?v*LB:v;case'ht':return u==='ftin'?v*IN:v;case'temp':return u==='F'?(v-32)*5/9:v;case'dist':return u==='mi'?v*MI:v;case'energy':return u==='kJ'?v/KJ:v}return v}
export function fmtU(kind,v,u){const x=toU(kind,v,u);switch(kind){
 case'food':return u==='oz'?r(x,1)+' oz':Math.round(x)+' g';
 case'vol':case'hyd':return u==='floz'?r(x,x<10?1:0)+' fl oz':u==='cup'?r(x,x<4?2:1)+' cups':Math.round(x)+' mL';
 case'wt':return r(x,1)+' '+u;
 case'ht':if(u==='ftin'){let ft=Math.floor(x/12),i=Math.round(x-ft*12);if(i===12){ft++;i=0}return ft+' ft '+i+' in'}return Math.round(x)+' cm';
 case'temp':return Math.round(x)+' °'+u;
 case'dist':return r(x,x<10?2:1)+' '+u;
 case'energy':return Math.round(x)+' '+u}return String(v)}
// "160 °F" / "160°F" / "160 degrees F" in text -> add the other scale; primary follows the user's choice
export function tempText(s,u){s=String(s);if(/\d °C \(\d+ °F\)/.test(s))return s;return s.replace(/(\d{2,3})\s*(?:°|degrees\s*)F\b(?:\s*\(\s*\d+(?:\.\d+)?\s*(?:°|degrees\s*)C\)|\s*\/\s*\d+(?:\.\d+)?\s*°\s*C)?/g,(m,f)=>{const c=Math.round((+f-32)*5/9);return u==='C'?c+' °C ('+f+' °F)':f+' °F ('+c+' °C)'})}
// NIH ODS fact-sheet conversions
export const IU={vitD:{per:'µg',f:40,txt:'1 µg vitamin D = 40 IU'},vitA:{per:'µg RAE',f:1/0.3,txt:'1 IU retinol = 0.3 µg RAE (beta-carotene IU convert differently)'},vitE:{per:'mg',f:1/0.67,f2:1/0.45,txt:'1 IU natural vitamin E = 0.67 mg; 1 IU synthetic = 0.45 mg'}};
export function iuOf(k,v){const c=IU[k];if(!c)return null;return k==='vitE'?[Math.round(v*c.f),Math.round(v*c.f2)]:[Math.round(v*c.f)]}
