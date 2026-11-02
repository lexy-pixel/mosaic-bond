import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {MeshoptDecoder} from './vendor/meshopt_decoder.module.js';
import {RGBELoader} from './vendor/RGBELoader.js';
import {mergeVertices} from './vendor/BufferGeometryUtils.js';
// Anatomical meshes: BodyParts3D (c) DBCLS — see ATTRIBUTION.md. One mesh per body-part id.
const VS=`varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const FS=`uniform vec3 uColor;uniform float uOpacity;uniform float uRim;uniform vec3 uFlag;uniform float uFlagAmt;uniform float uStripe;varying vec3 vN;varying vec3 vV;
void main(){float f=1.0-abs(dot(normalize(vN),normalize(vV)));float rim=pow(f,uRim);vec3 c=mix(uColor,uFlag,uFlagAmt*rim);float a=uOpacity*(0.25+1.6*rim)+uFlagAmt*rim*0.6;if(uStripe>0.5){gl_FragColor=vec4(mix(vec3(0.015),vec3(0.95),pow(f,2.5)),0.92);return;}gl_FragColor=vec4(c*(0.55+1.2*rim),clamp(a,0.0,1.0));}`;
export function createBody(canvas,onPick,onStatus){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x02080f);
  const scene=new THREE.Scene();const cam=new THREE.PerspectiveCamera(40,1,0.05,50);
  const root=new THREE.Group();scene.add(root);
  const grid=new THREE.PolarGridHelper(1.3,16,6,64,0x006b78,0x003a44);grid.position.y=-1.02;scene.add(grid);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.0,0.005,6,96),new THREE.MeshBasicMaterial({color:0x00f0ff,transparent:true,opacity:.8}));ring.rotation.x=Math.PI/2;scene.add(ring);
  const parts={},pickables=[];const LIMBS=[],GEO={};let style='real',skinOp=.35,sex='M',exOv=[],rcOv=[];const RG={};const exMat1=new THREE.MeshBasicMaterial({color:0xb6ff3a,transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}),exMat2=new THREE.MeshBasicMaterial({color:0x3fae4a,transparent:true,opacity:.8,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
  // Realistic mode: studio lights + procedural env map (no external HDR), gradient background.
  const lights=new THREE.Group();lights.add(new THREE.HemisphereLight(0xf4f6ff,0x3a3028,.7));
  for(const[c,i,x,y,z]of[[0xfff6ee,1.5,2,3,3],[0xdfe8ff,.5,-3,1.5,2],[0xffffff,.9,0,2.5,-3]]){const d=new THREE.DirectionalLight(c,i);d.position.set(x,y,z);lights.add(d)}
  lights.visible=false;scene.add(lights);
  const pm=new THREE.PMREMGenerator(renderer);const es=new THREE.Scene();es.background=new THREE.Color(0x404448);
  for(const[x,y,z,w,hh,c]of[[0,4,0,6,.2,0xffffff],[4,1,2,.2,3,0xfff2e0],[-4,1,2,.2,3,0xe0ecff],[0,-3,0,8,.2,0x302820]]){const b=new THREE.Mesh(new THREE.BoxGeometry(w,hh,w===.2?4:4),new THREE.MeshBasicMaterial({color:c}));b.position.set(x,y,z);es.add(b)}
  let envTex=pm.fromScene(es,.04).texture;
  // Poly Haven 'Studio Small 09' (CC0) HDRI, vendored locally; procedural env above is the fallback.
  new RGBELoader().load('env/studio_small_09_1k.hdr',t=>{t.mapping=THREE.EquirectangularReflectionMapping;const e=pm.fromEquirectangular(t).texture;t.dispose();envTex=e;if(style==='real')scene.environment=e},undefined,()=>{});
  // Soft contact shadow under the feet (radial gradient decal; no shadow maps, cheap on iPhone).
  const shc=document.createElement('canvas');shc.width=shc.height=128;{const x=shc.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(20,24,30,.42)');g.addColorStop(.55,'rgba(20,24,30,.16)');g.addColorStop(1,'rgba(20,24,30,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shc),transparent:true,depthWrite:false,toneMapped:false}));shadow.rotation.x=-Math.PI/2;shadow.visible=false;scene.add(shadow);
  const gc=document.createElement('canvas');gc.width=2;gc.height=256;const gx=gc.getContext('2d');const gr=gx.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#f7f9fb');gr.addColorStop(1,'#dfe5ec');gx.fillStyle=gr;gx.fillRect(0,0,2,256);
  const bgTex=new THREE.CanvasTexture(gc);bgTex.colorSpace=THREE.SRGBColorSpace;
  const mat=(id)=>new THREE.ShaderMaterial({vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:id==='skin'?THREE.FrontSide:THREE.DoubleSide,
    uniforms:{uColor:{value:new THREE.Color(0x00f0ff)},uOpacity:{value:.2},uRim:{value:id==='skin'?3.0:(id==='nerves'||id==='eyes')?0.8:1.6},uFlag:{value:new THREE.Color(0xffb300)},uFlagAmt:{value:0},uStripe:{value:0}}});
  // Tissue colours chosen to match fresh/embalmed-neutral anatomical references (not decorative).
  const NAT={bones:0xe8dcc0,teeth:0xf3ecd9,muscles:0x8a261c,brain:0xd9b0a4,nerves:0xeed77a,eyes:0xf1efe8,heart:0x8c2a22,blood:0x34508f,vessels:0xb02a22,lungs:0xd9a09a,liver:0x6a2519,stomach:0xd08a74,gut:0xd8a08a,immune:0x7c3e58,thyroid:0x9e4436,pancreas:0xdfb488,kidneys:0x7a2c22,bladder:0xd6b08c,glands:0xd8a456,reproductive:0xc98c7c,skin:0xe6b89c,hair:0x3a2a20};
  // Per-tissue PBR: wet organs get a clearcoat, muscle a soft sheen, bone stays matte ivory.
  const TP={bones:{r:.62,cc:0},teeth:{r:.3,cc:.5},muscles:{r:.5,cc:.25,ccr:.45,sh:.12,shc:0xd06a5a},nerves:{r:.5,cc:.15},vessels:{r:.32,cc:.5},blood:{r:.32,cc:.5},skin:{r:.52,cc:.05,sh:.6,shc:0xffd9c6},hair:{r:.7,cc:0},eyes:{r:.15,cc:1}};
  const rmat=id=>{const t=TP[id]||{r:.36,cc:.45,ccr:.3};const m=new THREE.MeshPhysicalMaterial({color:NAT[id]??0xcccccc,roughness:t.r,metalness:0,clearcoat:t.cc,clearcoatRoughness:t.ccr??.35,sheen:t.sh||0,sheenColor:new THREE.Color(t.shc||0xffffff),sheenRoughness:.6,envMapIntensity:.85,
    transparent:id==='skin',opacity:id==='skin'?.35:1,depthWrite:id!=='skin',side:id==='skin'?THREE.FrontSide:THREE.DoubleSide});
    if(id==='skin')m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>','float nbFr=pow(1.0-abs(dot(normalize(normal),normalize(vViewPosition))),2.2);diffuseColor.a=clamp(diffuseColor.a*(0.5+1.9*nbFr),0.0,1.0);\n#include <opaque_fragment>')};
    return m};
  function reg(id,mesh){mesh.userData.hm=mat(id);mesh.userData.rm=rmat(id);mesh.material=style==='real'?mesh.userData.rm:mesh.userData.hm;mesh.userData.part=id;mesh.renderOrder=id==='skin'?10:0;pickables.push(mesh);
    const P=parts[id]||(parts[id]={meshes:[],score:0,visible:true,sel:false,med:false,cond:false,sym:false,hue:null});P.meshes.push(mesh)}
  const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
  const t0=performance.now();
  // v18: low-detail preview (~71k tris) shows while the full model loads; removed once the full model is ready
  let full=false,pv=null;loader.load('models/body_lo.glb',g=>{if(full)return;const m=g.scene;const box=new THREE.Box3().setFromObject(m);const sz=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());const s=2.55/sz.y;m.scale.setScalar(s);m.position.set(-c.x*s,-c.y*s+0.12,-c.z*s);
    m.traverse(o=>{if(o.isMesh){const id=o.name.replace(/_[MF]$/,''),sk=id==='skin';o.material=new THREE.MeshStandardMaterial({color:NAT[id]||0xc98c7c,roughness:.6,transparent:sk,opacity:sk?.25:1,depthWrite:!sk});if(/_[MF]$/.test(o.name))o.visible=false}});root.add(m);pv=m},undefined,()=>{});
  const ready=new Promise((res,rej)=>loader.load('models/body.glb',g=>{
    full=true;if(pv){root.remove(pv);pv.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}});pv=null}
    const m=g.scene;const box=new THREE.Box3().setFromObject(m);const sz=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
    const s=2.55/sz.y;m.scale.setScalar(s);m.position.set(-c.x*s,-c.y*s+0.12,-c.z*s);root.add(m);shadow.position.set(0,(box.min.y-c.y)*s+0.115,0);
    m.traverse(o=>{if(o.isMesh){const sx=(o.name.match(/_([MF])$/)||(o.parent&&o.parent.name.match(/_([MF])$/))||[])[1];let id=o.name.replace(/_[MF]$/,'');let p=o;while(p&&!parts[id]&&!/^[a-z]+$/.test(id)){p=p.parent;id=p?p.name:id}
      {let g=o.geometry.clone();for(const k of Object.keys(g.attributes))if(k!=='position')g.deleteAttribute(k);g=mergeVertices(g,1e-5);g.computeVertexNormals();o.geometry.dispose();o.geometry=g}if(sx&&o.parent&&/_[MF]$/.test(o.parent.name))id=o.parent.name.replace(/_[MF]$/,'');reg(id,o);if(sx)o.userData.sex=sx}});
    // Thyroid gland is not in the BodyParts3D set: stylized placeholder at the neck.
    // v18: real thyroid gland + parathyroids come from Z-Anatomy (BodyParts3D-derived); placeholder removed.
    // Spinal cord + major peripheral nerves are not in BodyParts3D: stylized placeholder tubes (proportional paths).
    root.updateMatrixWorld(true);{const bb=new THREE.Box3();for(const x of parts.brain?parts.brain.meshes:[])bb.expandByObject(x);const bc=bb.getCenter(new THREE.Vector3());
     const H=2.55,T=bb.isEmpty()?1.39:bb.max.y+0.02,z0=bb.isEmpty()?-0.02:bc.z-0.03,V=(x,f,z=0)=>new THREE.Vector3(x*H,T-f*H,z0+z);
     // limb paths follow the BodyParts3D bone centerlines (arms hang in A-pose), so nerves stay inside the skin
     const BP=[];for(const m of (parts.bones?parts.bones.meshes:[])){m.updateWorldMatrix(true,false);const a=m.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<a.count;i+=2){v.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);BP.push([v.x,v.y,v.z])}}
     const line=(sg,f,y0,y1,n)=>{const out=[];for(let k=0;k<n;k++){const ya=y0+(y1-y0)*k/n,yb=y0+(y1-y0)*(k+1)/n;const q=BP.filter(p=>p[1]<=Math.max(ya,yb)&&p[1]>=Math.min(ya,yb)&&f(sg*p[0],p[1]));
        if(q.length>12){const c=q.reduce((s,p)=>[s[0]+p[0],s[1]+p[1],s[2]+p[2]],[0,0,0]).map(x=>x/q.length);out.push(new THREE.Vector3(c[0],c[1],c[2]))}}return out};
     const yN=T-.17*H,yL=T-.5*H;GEO.yN=yN;GEO.top=T;GEO.spine=[V(0,.12),V(0,.5,0)];
     const paths=[[V(0,.12),V(0,.2,-.01),V(0,.35,-.02),V(0,.5,0)],
      ...[1,-1].flatMap(sg=>{const arm=line(sg,(x,y)=>x>.24+(.9-y)*.14&&x<.5,.9,-.02,7),leg=line(sg,(x,y)=>x>.06&&x<.2,-.36,-1.05,7);
        const A=arm.length>3?[V(sg*.02,.17),new THREE.Vector3(sg*.1,yN-.03,z0+.02),new THREE.Vector3(sg*.18,yN-.06,z0+.02),...arm.map(v=>v.add(new THREE.Vector3(-sg*.006,0,.004)))]:[V(sg*.02,.17),V(sg*.06,.195),V(sg*.09,.29,.01)];
        const L=leg.length>3?[V(sg*.02,.48),new THREE.Vector3(sg*.05,yL-.12,z0-.02),new THREE.Vector3(sg*.09,yL-.26,z0-.03),...leg]:[V(sg*.02,.48),V(sg*.05,.53,-.01)];
        LIMBS.push({k:'arm',pts:A},{k:'leg',pts:L});return [A,L]})];
     /* v18: spinal cord and peripheral nerves are real Z-Anatomy meshes; the paths above are kept only as morph/exercise anchors */}
    // ---- female placeholders (BodyParts3D is male-only): stylized, clearly labeled in ATTRIBUTION.md
    {const bx=n=>{const b=new THREE.Box3();for(const x of parts[n]?parts[n].meshes:[])b.expandByObject(x);return b};
     const bl=bx('bladder'),lu=bx('lungs');const bc=bl.isEmpty()?new THREE.Vector3(0,.02,.05):bl.getCenter(new THREE.Vector3());
     for(const m of parts.reproductive?parts.reproductive.meshes:[])if(!m.userData.sex)m.userData.sex='M';
     const realF=(parts.reproductive?parts.reproductive.meshes:[]).some(m=>m.userData.sex==='F');// v18: real female organs (HuBMAP HRA, Visible Human Female, CC BY 4.0)
     const F=(g,pos,sc,id='reproductive')=>{const m=new THREE.Mesh(g,null);m.position.copy(pos);if(sc)m.scale.set(...sc);root.add(m);reg(id,m);m.userData.sex='F';m.userData.ph=1;return m};
     const uc=bc.clone().add(new THREE.Vector3(0,.06,-.035));if(!realF)F(new THREE.SphereGeometry(.03,20,14),uc,[1,1.3,.75]);
     for(const sg of[1,-1]){const ov=uc.clone().add(new THREE.Vector3(sg*.075,.005,-.005));if(!realF)F(new THREE.SphereGeometry(.013,14,10),ov,[1.3,.8,.8]);
       const cv=new THREE.CatmullRomCurve3([uc.clone().add(new THREE.Vector3(sg*.02,.035,0)),uc.clone().add(new THREE.Vector3(sg*.05,.05,0)),uc.clone().add(new THREE.Vector3(sg*.085,.03,.005)),ov.clone().add(new THREE.Vector3(sg*.01,.005,.01))]);
       if(!realF)F(new THREE.TubeGeometry(cv,24,.004,6,false),new THREE.Vector3());
       const cy=lu.isEmpty()?.62:lu.min.y+(lu.max.y-lu.min.y)*.42,cz=lu.isEmpty()?.12:lu.max.z+.035;GEO['br'+sg]=new THREE.Vector3(sg*.085,cy,cz)}
     GEO.pub=bc.clone()}

    // ---- exercise regions: approximate muscle-group / joint regions on the merged BodyParts3D muscle & bone meshes (root-space p0)
    {const side=l=>{const p=l.pts[Math.min(2,l.pts.length-1)];return p.x>=0?0:1};const bySide=a=>{const o=[];for(const l of a)o[side(l)]=o[side(l)]||l;if(!o[0])o[0]=o[1];if(!o[1])o[1]=o[0];return o.filter(Boolean).length?o:a};const arms=bySide(LIMBS.filter(l=>l.k==='arm')),legs=bySide(LIMBS.filter(l=>l.k==='leg'));
      const zAt=(pts,y)=>{let b=pts[0];for(const p of pts)if(Math.abs(p.y-y)<Math.abs(b.y-y))b=p;return b};
      const sh=arms.map(l=>l.pts[2]),wr=arms.map(l=>l.pts[l.pts.length-1]),hp=legs.map(l=>l.pts[2]),an=legs.map(l=>l.pts[l.pts.length-1]);
      const shY=sh[0]?sh[0].y:GEO.yN-.06,elY=sh[0]?(sh[0].y+wr[0].y)/2:.45,hipY=hp[0]?hp[0].y+.06:-.25,knY=hp[0]?(hp[0].y+an[0].y)/2:-.7,yN=GEO.yN;
      GEO.joints={shoulder:sh,elbow:arms.map(l=>zAt(l.pts,elY)),wrist:wr,hip:hp,knee:legs.map(l=>zAt(l.pts,knY)),ankle:an,neck:[new THREE.Vector3(0,yN,(GEO.spine[0]||{z:0}).z)],lowback:[new THREE.Vector3(0,hipY+.2,(GEO.spine[1]||{z:0}).z-.03)]};
      const zc=(GEO.spine[0]?GEO.spine[0].z:0)+.01;
      RG.tag=(x,y,z)=>{const ax=Math.abs(x),sg=x>=0?0:1;
        if(y>yN+.1)return 0;
        const armX=.2+(shY-y)*.12;
        if(y<shY+.02&&y>wr[0].y-.15&&ax>armX&&y>hipY-.25){const lp=zAt(arms[sg].pts,y);if(sh[sg]&&Math.hypot(x-sh[sg].x,y-sh[sg].y)<.1)return 7;if(y>elY)return z>lp.z?8:9;return 10}
        if(y<hipY-.05&&ax>.015){const lp=zAt(legs[sg].pts,y),fr=z>lp.z;if(y>hipY-.2&&!fr)return 11;if(y>knY){if(ax<Math.abs(lp.x)-.03&&y>hipY-.4)return 12;return fr?13:14}return fr?16:15}
        if(y>shY+.02)return ax<.16?6:7;
        const fr=z>zc;if(fr){if(y>shY-.26)return 1;return ax<.1?2:3}
        if(y>shY-.34)return 4;if(y>hipY-.08)return 5;return 11};
      RG.names={1:'chest',2:'abs',3:'obliques',4:'upperback',5:'lowback',6:'traps',7:'shoulders',8:'biceps',9:'triceps',10:'forearms',11:'glutes',12:'adductors',13:'quads',14:'hamstrings',15:'calves',16:'shins'}}
    const exMat1=new THREE.MeshBasicMaterial({color:0xb6ff3a,transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}),exMat2=new THREE.MeshBasicMaterial({color:0x3fae4a,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide});
    
    // ---- morph setup: original positions in root space + skeleton anchors for the skin shell
    root.updateMatrixWorld(true);const segs=[];const addL=(pts,k)=>{for(let i=0;i<pts.length-1;i++)segs.push({a:pts[i],b:pts[i+1],k,t0:i/(pts.length-1),t1:(i+1)/(pts.length-1)})};
    addL([new THREE.Vector3(0,GEO.top,0),new THREE.Vector3(0,GEO.yN,0)],'head');addL([new THREE.Vector3(0,GEO.yN,-.02),new THREE.Vector3(0,(GEO.yN+(-.05))/2,-.03),new THREE.Vector3(0,-.05,-.02)],'torso');
    for(const L of LIMBS){const p=L.pts.slice(1);if(L.k==='arm'&&p.length>1){const a=p[p.length-2],b=p[p.length-1];p.push(b.clone().addScaledVector(b.clone().sub(a).normalize(),.26))}addL(p,L.k)}// v20: arm chain continues through the hand so finger skin binds to the arm, not the thigh
    const ab=new THREE.Vector3(),ap=new THREE.Vector3(),cp=new THREE.Vector3();let foot=1e9;
    const seenG=new Set();for(const id in parts)for(const m of parts[id].meshes){if(seenG.has(m.geometry))m.geometry=m.geometry.clone();seenG.add(m.geometry);{const q=m.geometry.attributes.position;if(!(q.array instanceof Float32Array)||q.normalized||q.isInterleavedBufferAttribute){const f=new Float32Array(q.count*3);for(let i=0;i<q.count;i++){f[i*3]=q.getX(i);f[i*3+1]=q.getY(i);f[i*3+2]=q.getZ(i)}m.geometry.setAttribute('position',new THREE.BufferAttribute(f,3))}}const a=m.geometry.attributes.position;const M=m.matrixWorld.clone(),Mi=M.clone().invert();const p0=new Float32Array(a.count*3);const v=new THREE.Vector3();
      for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(M);p0[i*3]=v.x;p0[i*3+1]=v.y;p0[i*3+2]=v.z;if(v.y<foot)foot=v.y}
      m.userData.mo={p0,Mi};if(id==='muscles'||id==='bones'){const tg=new Uint8Array(a.count);for(let i=0;i<a.count;i++)tg[i]=id==='muscles'?RG.tag(p0[i*3],p0[i*3+1],p0[i*3+2]):0;m.userData.mo.tg=tg}
      if(id==='skin'){const an=new Float32Array(a.count*5);for(let i=0;i<a.count;i++){v.set(p0[i*3],p0[i*3+1],p0[i*3+2]);let best=1e9,bs=null,bt=0;
          for(const S of segs){ab.subVectors(S.b,S.a);const t=Math.max(0,Math.min(1,ap.subVectors(v,S.a).dot(ab)/ab.lengthSq()));cp.copy(S.a).addScaledVector(ab,t);const d=cp.distanceToSquared(v);if(d<best){best=d;bs=S;bt=S.t0+(S.t1-S.t0)*t;an[i*5]=cp.x;an[i*5+1]=cp.y;an[i*5+2]=cp.z}}
          an[i*5+3]={head:0,torso:1,arm:2,leg:3}[bs.k];an[i*5+4]=bt}m.userData.mo.an=an}}
    GEO.foot=foot;
    res({ms:performance.now()-t0})},e=>onStatus&&onStatus(e.lengthComputable?Math.round(100*e.loaded/e.total):null),rej));
  let spin=true,rotY=0,rotX=0.05,dist=4.2,vel=.003,drag=null,pinch=null,moved=0,panX=0,panY=0,lastTap=0;const ptrs=new Map();
  // v20 camera: pan (two-finger / shift- or right-drag), zoom toward pinch/cursor point, clamped to body extents; double-tap resets
  const halfH=()=>dist*(iso?1:FSC)*Math.tan(THREE.MathUtils.degToRad(20));
  const clampPan=()=>{const S=GEO.scale||1,zf=Math.max(0,1-dist/4.2);const ly=1.25*S*Math.max(zf,.15),lx=.55*Math.max(zf,.1);panY=Math.max(-ly,Math.min(ly,panY));panX=Math.max(-lx,Math.min(lx,panX))};
  const ndc=(x,y)=>{const r=canvas.getBoundingClientRect();return[(x-r.left)/r.width*2-1,-((y-r.top)/r.height*2-1),r]};
  const zoomTo=(nd,cx,cy)=>{nd=Math.min(7,Math.max(0.6,nd));const[nx,ny]=ndc(cx,cy),h0=halfH();tdist=0;dist=nd;const dh=h0-halfH();panY+=ny*dh;panX+=nx*dh*cam.aspect;clampPan()};
  const panBy=(dx,dy)=>{const r=canvas.getBoundingClientRect(),u=2*halfH()/Math.max(1,r.height);panX-=dx*u;panY+=dy*u;clampPan()};
  function resetCam(){panX=panY=0;tdist=iso?tdist:4.2*Math.max(.55,GEO.scale||1)}
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;vel=0;
    if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2};drag=null}else drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2||e.button===1}});
  canvas.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.max(20,Math.hypot(a.x-b.x,a.y-b.y)),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      panBy(mx-pinch.mx,my-pinch.my);zoomTo(dist*pinch.d/d,mx,my);pinch={d,mx,my};moved=99;return}
    if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;moved+=Math.abs(dx)+Math.abs(dy);
      if(drag.pan||e.shiftKey){panBy(dx,dy);vel=0}else{rotY+=dx*.01;rotX=Math.max(-.8,Math.min(.8,rotX+dy*.006));vel=dx*.0015}drag={x:e.clientX,y:e.clientY,pan:drag.pan}}});
  const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(ptrs.size===1){const[q]=[...ptrs.values()];drag={x:q.x,y:q.y,pan:false}}
    if(ptrs.size===0){if(moved<8){const t=performance.now();if(t-lastTap<320){resetCam();lastTap=0}else{lastTap=t;pick(e)}}drag=null}};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey&&!e.ctrlKey){panBy(-e.deltaX,-e.deltaY);return}zoomTo(dist*(1+e.deltaY*(e.ctrlKey?.01:.001)),e.clientX,e.clientY)},{passive:false});
  const ray=new THREE.Raycaster(),v2=new THREE.Vector2();
  let lastRegion=null;
  function pick(e){const r=canvas.getBoundingClientRect();v2.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(v2,cam);
    const hits=ray.intersectObjects(pickables.filter(m=>parts[m.userData.part].visible&&m.visible),false);
    const h=hits.find(x=>x.object.userData.part!=='skin')||hits[0];lastRegion=null;if(h&&h.object.userData.part==='muscles'&&h.face){const tg=h.object.userData.mo&&h.object.userData.mo.tg;if(tg)lastRegion=RG.names[tg[h.face.a]]||null}onPick(h?h.object.userData.part:null)}
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==Math.floor(w*renderer.getPixelRatio()))renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
  const ramp=s=>{const c=new THREE.Color();if(s<50)c.setRGB(1,.25+s/50*.55,.2);else c.setRGB(1-(s-50)/50,.8+(s-50)/50*.14,.2+(s-50)/50*.8);return c};
  let fy=0.15,tfy=0.15,tdist=0,iso=false;const FOFF=-0.01,FSC=1.22;let selected=null,T=performance.now(),running=true;
  function frame(t){if(!running)return;requestAnimationFrame(frame);resize();const k=(t-T)/1000;
    if(!drag)rotY+=vel;if(spin&&!drag&&Math.abs(vel)<.003)vel+=(.003-vel)*.02;
    root.rotation.set(rotX,rotY,0);fy+=(tfy-fy)*.1;{const o=iso?0:FOFF;cam.position.set(panX,fy+0.2+o+panY,dist*(iso?1:FSC));cam.lookAt(panX,fy+o+panY,0)}if(tdist){dist+=(tdist-dist)*.1;if(Math.abs(tdist-dist)<.01)tdist=0;clampPan()}ring.position.y=-1.0+((k*.35)%1)*2.6;
    const pul=.5+.5*Math.sin(k*4);
    for(const id in parts){const P=parts[id];const dim=selected&&selected.size&&!selected.has(id);const u0=ramp(P.score);
      const base={muscles:.35,vessels:.6,blood:.6,bones:.8}[id]||1;const thin={nerves:1,eyes:1,brain:.6}[id];let op=id==='skin'?.05:dim?.012:P.sel?(.35+.12*Math.sin(k*6)):base*(.05+P.score/100*.22);if(iso&&!dim&&id!=='skin')op=Math.max(op,thin?.55*thin+.1:.25);
      const big=/^(muscles|vessels|blood|bones|skin)$/.test(id);const fl=[];if(P.med)fl.push(0xffb300);if(P.cond)fl.push(0xff2fb4);if(P.sym)fl.push(0xa64dff);const fc=fl.length?fl[Math.floor(k*1.2)%fl.length]:0xffb300;
      let col=u0,op2=op;if(P.hue){col=P.hue.clone().multiplyScalar(.3+.85*Math.min(100,P.score)/100);if(!dim&&!P.sel)op2=id==='skin'?.05:Math.max(op,{muscles:.1,vessels:.16,blood:.16}[id]||.2)}
      if(style==='real'){const nat=P.hue||new THREE.Color(NAT[id]??0xcccccc);const em=new THREE.Color(0);let ei=0;
        if(fl.length&&!dim){em.set(fc);ei=(big?.06:.12)+(big?.14:.25)*pul}else if(P.sel){em.set(0x00e5ff);ei=.18+.08*Math.sin(k*6)}else if(id!=='skin'){em.copy(u0);ei=.06+.06*Math.min(100,P.score)/100}if(P.stripe&&!dim){nat.set(0x101010);ei=0}
        for(const m of P.meshes){const r=m.material;r.color.copy(nat);r.emissive.copy(em);r.emissiveIntensity=ei;const o=id==='skin'?skinOp*(dim?.3:1):dim?.18:1;r.opacity=o;r.transparent=o<1;r.depthWrite=o>=1;m.visible=P.visible&&o>.01&&(!m.userData.sex||m.userData.sex===sex)}continue}
      for(const m of P.meshes){const u=m.material.uniforms;u.uColor.value.copy(col);u.uOpacity.value=op2;
        u.uFlagAmt.value=fl.length&&!dim?(big?.35:1)*(.55+.45*pul):0;u.uFlag.value.set(fc);u.uStripe.value=P.stripe?1:0;{const bl=P.stripe?THREE.NormalBlending:THREE.AdditiveBlending;if(m.material.blending!==bl){m.material.blending=bl;m.material.needsUpdate=true}}m.visible=P.visible&&(!m.userData.sex||m.userData.sex===sex)}}
    renderer.render(scene,cam)}
  requestAnimationFrame(frame);
  return{parts,ready,
    setStyle(st){style=st;const real=st==='real';for(const id in parts)for(const m of parts[id].meshes)m.material=real?m.userData.rm:m.userData.hm;
      scene.environment=real?envTex:null;scene.background=real?bgTex:null;lights.visible=real;grid.visible=ring.visible=!real;renderer.toneMapping=real?THREE.AgXToneMapping:THREE.NoToneMapping;renderer.toneMappingExposure=real?.95:1;shadow.visible=real;renderer.outputColorSpace=THREE.SRGBColorSpace},
    // Visual approximation only: stature/head ratio (age), skin-shell girth (BMI), female surface shaping. Skeleton/organs keep adult-male anatomy.
    setMorph(o){sex=o.sex==='F'?'F':'M';const S=o.stature||1,hf=o.headFrac||.13,b=Math.max(-.35,Math.min(1.2,((o.bmi||22)-22)/16)),fem=sex==='F';
      const top=GEO.top,yN=GEO.yN,ft=GEO.foot,H0=top-ft,h0=top-yN,L0=yN-ft;const hk=Math.max(.6,Math.min(1.6,hf*S/.133)),bh=(S*H0-hk*h0)/L0,bw=Math.pow(S,.75);
      const sm=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};const v=new THREE.Vector3();
      for(const id in parts)for(const m of parts[id].meshes){const mo=m.userData.mo;if(!mo)continue;const a=m.geometry.attributes.position,p0=mo.p0,an=mo.an;
        for(let i=0;i<a.count;i++){let x=p0[i*3],y=p0[i*3+1],z=p0[i*3+2];
          if(an){const k=an[i*5+3],t=an[i*5+4];let g=k===1?1+.6*b:k===0?1+.06*b:k===2?Math.max(1,1+.4*b*(1-.75*t)):Math.max(1,1+.45*b*(1-.7*t));
            if(fem){if(k===1||k===3)g*=1+.09*sm(y,-.32,-.05)*(1-sm(y,.08,.25));if(k===1)g*=1-.05*sm(y,.7,.85)}
            const ax=an[i*5],ay=an[i*5+1],az=an[i*5+2];x=ax+(x-ax)*g;z=az+(z-az)*(k===1?g*(1+.15*Math.max(0,b)*sm(y,-.1,.3)*(1-sm(y,.45,.7))):g);
            if(fem){if(id==='skin'&&y<.13&&y>-.09&&z>-.03){const w=1-sm(Math.abs(x),.045,.08),zc=-.012+.13*sm(y,-.05,.06);if(w>0&&z>zc)z=zc+(z-zc)*(1-w)}// v20: female surface over the BodyParts3D (male) external genitalia: smooth mons/perineum
              if(id==='skin'&&y>yN){const j=1-sm(y,yN+.07,yN+.15);x*=1-.07*j*sm(y,yN,yN+.04);z=z-.012*j*sm(y,yN,yN+.04)*Math.max(0,Math.sign(z))}}}
          if(fem&&(id==='skin'||id==='muscles'))for(const sg of[1,-1]){const c=GEO['br'+sg];if(!c)continue;const d2=((x-c.x)**2+(y-c.y+.05)**2*1.1)/(.09*.09);if(d2<6&&z>c.z-.12)z+=.065*Math.exp(-d2)}
          if(fem&&id!=='skin'&&!mo.an&&Math.abs(x)<.05&&y<.08&&y>-.09){const zc=-.022+.13*sm(y,-.05,.06);if(z>zc)z=zc}// v20: tuck male penile structures (urethra, vessels, nerves) under the female surface// hide male (penile) urethra
          if(y>yN){y=yN+(y-yN)*hk;x*=hk;z*=hk;y=ft+L0*bh+(y-yN)}else{y=ft+(y-ft)*bh;x*=bw;z*=bw}
          v.set(x,y,z).applyMatrix4(mo.Mi);a.setXYZ(i,v.x,v.y,v.z)}
        a.needsUpdate=true;if(id==='skin')m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();m.geometry.computeBoundingBox()}
      GEO.scale=S;if(!iso){tfy=0.15-(1-S)*1.1;tdist=4.2*Math.max(.55,S)}},

    setExercise(ex){for(const o of exOv)o.parent&&o.parent.remove(o),o.geometry.dispose();exOv=[];if(!ex)return;
      const inv=Object.fromEntries(Object.entries(RG.names).map(([k,v])=>[v,+k]));const P=new Set((ex.primary||[]).map(n=>inv[n])),S2=new Set((ex.secondary||[]).map(n=>inv[n]));
      const J=[...(ex.joints||[])].flatMap(j=>(GEO.joints[j]||[]).map(p=>p));
      const mk=(m,test,mat)=>{const g=m.geometry,ix=g.index,n=ix?ix.count:g.attributes.position.count,out=[];for(let i=0;i<n;i+=3){const a0=ix?ix.getX(i):i,a1=ix?ix.getX(i+1):i+1,a2=ix?ix.getX(i+2):i+2;if(test(a0)&&test(a1)&&test(a2))out.push(a0,a1,a2)}
        if(!out.length)return;const ng=new THREE.BufferGeometry();ng.setAttribute('position',g.attributes.position);ng.setIndex(out);const o=new THREE.Mesh(ng,mat);o.renderOrder=5;o.raycast=()=>{};m.add(o);exOv.push(o)};
      for(const m of parts.muscles?parts.muscles.meshes:[]){const tg=m.userData.mo&&m.userData.mo.tg;if(!tg)continue;mk(m,i=>P.has(tg[i]),exMat1);mk(m,i=>S2.has(tg[i])&&!P.has(tg[i]),exMat2)}
      if(J.length)for(const m of parts.bones?parts.bones.meshes:[]){const p0=m.userData.mo&&m.userData.mo.p0;if(!p0)continue;mk(m,i=>J.some(p=>(p0[i*3]-p.x)**2+(p0[i*3+1]-p.y)**2+(p0[i*3+2]-p.z)**2<.0036),exMat1)}
      return exOv.length},
    // v19 muscle-recovery overlay: lv = {region: 0..1}; warm amber ramp, opacity scales with level
    setRecovery(lv){for(const o of rcOv)o.parent&&o.parent.remove(o),o.geometry.dispose(),o.material.dispose();rcOv=[];if(!lv)return 0;
      const inv=Object.fromEntries(Object.entries(RG.names).map(([k,v])=>[v,+k]));
      for(const[r,l]of Object.entries(lv)){if(!(l>0.02)||!inv[r])continue;const T=inv[r];const c=new THREE.Color(0xffd27a).lerp(new THREE.Color(0xe0782a),Math.min(1,l));
        const mat=new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.15+.75*Math.min(1,l),depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide});
        for(const m of parts.muscles?parts.muscles.meshes:[]){const tg=m.userData.mo&&m.userData.mo.tg;if(!tg)continue;const g=m.geometry,ix=g.index,n=ix?ix.count:g.attributes.position.count,out=[];
          for(let i=0;i<n;i+=3){const a0=ix?ix.getX(i):i,a1=ix?ix.getX(i+1):i+1,a2=ix?ix.getX(i+2):i+2;if(tg[a0]===T&&tg[a1]===T&&tg[a2]===T)out.push(a0,a1,a2)}
          if(!out.length)continue;const ng=new THREE.BufferGeometry();ng.setAttribute('position',g.attributes.position);ng.setIndex(out);const o=new THREE.Mesh(ng,mat);o.renderOrder=5;o.raycast=()=>{};m.add(o);rcOv.push(o)}}
      return rcOv.length},
    lastRegion(){return lastRegion},
    sideCounts(){const c={};for(const m of parts.muscles?parts.muscles.meshes:[]){const mo=m.userData.mo;if(!mo||!mo.tg)continue;for(let i=0;i<mo.tg.length;i++){const r=RG.names[mo.tg[i]];if(!r)continue;const s=mo.p0[i*3]>=0?1:0;(c[r]=c[r]||[0,0])[s]++}}return c},
    exRegions(){return RG.names},
    setSkin(v){skinOp=v},
    setScores(m){for(const id in parts)parts[id].score=m[id]||0},
    setVisible(ids){this._vis=ids;let n=0,N=0;for(const id in parts){parts[id].visible=ids.has(id);N++;if(ids.has(id))n++}
      iso=n>0&&n<N-1;if(!iso){tfy=0.15;tdist=4.2;return}
      const b=new THREE.Box3(),r0=root.rotation.clone();root.rotation.set(0,0,0);root.updateMatrixWorld(true);
      for(const id in parts)if(parts[id].visible&&id!=='skin')for(const m of parts[id].meshes)if(!m.userData.sex||m.userData.sex===sex)b.expandByObject(m);root.rotation.copy(r0);
      if(b.isEmpty())return;const sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());
      tfy=c.y;const h=Math.max(sz.y,sz.x*1.6/Math.max(cam.aspect,.3),.3);tdist=Math.min(7,Math.max(0.8,h*0.62/Math.tan(THREE.MathUtils.degToRad(20))+Math.max(sz.x,sz.z)*.5))},
    setSelected(ids){selected=ids;for(const id in parts)parts[id].sel=!!(ids&&ids.has(id))},
    setFlags(med,cond,sym=new Set()){for(const id in parts){parts[id].med=med.has(id);parts[id].cond=cond.has(id);parts[id].sym=sym.has(id)}},
    setStripe(set){for(const id in parts)parts[id].stripe=!!(set&&set.has(id))},
    setHues(map){for(const id in parts)parts[id].hue=map&&map[id]!=null?new THREE.Color(map[id]):null},
    setView(y,x){rotY=y;if(x!=null)rotX=x;vel=0;setTimeout(()=>{vel=.0},0)},
    resetCam,setCam(o){if(o.dist!=null){dist=o.dist;tdist=0}panX=o.x||0;panY=o.y||0;clampPan()},
    setSpin(on){vel=on?.003:0;spin=on},
    pause(p){if(running===!p)return;running=!p;if(!p)requestAnimationFrame(frame)}};
}
