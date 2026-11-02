import numpy as np,json,trimesh
from mh import load
V,G=load();V=V*.1
def jc(n):
  vi=np.unique(np.concatenate([np.array(f).ravel() for f in G[n]]));return V[vi].mean(0)
F=[f for f in G['body']];bi=np.unique(np.concatenate([np.array(f) for f in F]))
top=V[bi,1].max();sole=V[bi,1].min()
JM={s:{'sh':jc(f'joint-{c}-shoulder'),'el':jc(f'joint-{c}-elbow'),'wr':jc(f'joint-{c}-hand'),'hip':jc(f'joint-{c}-upper-leg'),'kn':jc(f'joint-{c}-knee'),'an':jc(f'joint-{c}-ankle')} for s,c in((1,'l'),(-1,'r'))}
T0={'sh':(.188,1.305,.075),'el':(.235,1.015,.066),'wr':(.262,.78,.118),'hip':(.085,.84,.08),'kn':(.09,.36,.088),'an':(.085,0.0,.085)}
JT={s:{k:np.array([s*v[0],v[1],v[2]]) for k,v in T0.items()} for s in(1,-1)}
sh=1.719/(top-sole)  # height ratio
SM=np.load('skinM.npy')
# torso map
ky_m=[sole,JM[1]['an'][1],JM[1]['kn'][1],JM[1]['hip'][1],JM[1]['sh'][1],top];ky_t=[-.078,0,.36,.84,1.305,1.641]
Y=lambda y:np.interp(y,ky_m,ky_t,left=None,right=None)
def zmid(P,y):m=np.abs(P[:,1]-y)<.01;m&=np.abs(P[:,0])<.06;return (P[m,2].min()+P[m,2].max())/2,(P[m,2].max()-P[m,2].min()),np.abs(P[m][:,0]).max() if m.any() else 0
def xw(P,y):m=np.abs(P[:,1]-y)<.01;return np.abs(P[m,0]).max()
MB=V[bi].copy();MB[:,1]=Y(MB[:,1])
lv=[.86,1.05,1.2,1.42,1.55]
zs=[];xs=[]
for y in lv:
  a=zmid(SM,y);b=zmid(MB,y);zs.append((a[0],b[0],a[1]/b[1]))
xh=JT[1]['hip'][0]/JM[1]['hip'][0];xsh=JT[1]['sh'][0]/JM[1]['sh'][0];xhead=xw(SM,1.55)/xw(MB,1.55)
print('x scales hip,sh,head',xh,xsh,xhead,'z',np.round(zs,3))
def torso(P):
  y=Y(P[:,1]);sx=np.interp(y,[.84,1.305,1.42,1.5],[xh,xsh,xsh*.85+xhead*.15,xhead]);
  zt=np.interp(y,lv,[z[0] for z in zs]);zm=np.interp(y,lv,[z[1] for z in zs]);sz=np.interp(y,lv,[min(max(z[2],.9),1.2) for z in zs])
  return np.c_[P[:,0]*sx,y,zt+(P[:,2]-zm)*sz]
import trimesh as _t
_sc=_t.load('dec2.glb');IN=[]
for n in _sc.graph.nodes_geometry:
  if n.startswith(('skin','reproductive','hair')):continue
  Tm,g=_sc.graph[n];IN.append(_t.transform_points(_sc.geometry[g].vertices,Tm))
IN=np.concatenate(IN);IN=IN[~((np.abs(IN[:,0])<.08)&(IN[:,1]>.6)&(IN[:,1]<.86)&(IN[:,2]>.1))]
YB=np.arange(.70,1.66,.01);CORR=None
def corr(P):
  if CORR is None:return P
  y=P[:,1];kx=np.interp(y,YB,CORR[0]);zc=np.interp(y,YB,CORR[1]);kz=np.interp(y,YB,CORR[2]);dz=np.interp(y,YB,CORR[3])
  return np.c_[P[:,0]*kx,y,zc+(P[:,2]-zc)*kz+dz]
_torso=torso
def torso(P):return corr(_torso(P))
def build_corr(Ft):
  global CORR
  kx=[];zc=[];kz=[];dz=[]
  for y in YB:
    lim=.175 if y<1.33 else .11
    f=Ft[np.abs(Ft[:,1]-y)<.006];f=f[np.abs(f[:,0])<lim];i=IN[np.abs(IN[:,1]-y)<.006];i=i[np.abs(i[:,0])<lim-.01]
    if len(f)<6 or len(i)<6:kx.append(1);zc.append(0);kz.append(1);dz.append(0);continue
    W=np.abs(f[:,0]).max();Wi=np.abs(i[:,0]).max()+.007;kx.append(min(1.35,max(1,Wi/W)))
    F,B=f[:,2].max(),f[:,2].min();Fi,Bi=i[:,2].max()+.007,i[:,2].min()-.007
    c=(F+B)/2;k=min(1.4,max(1,(Fi-Bi)/(F-B)));F2,B2=c+(F-c)*k,c+(B-c)*k;d=max(0,Fi-F2)-max(0,B2-Bi);zc.append(c);kz.append(k);dz.append(d)
  sm=lambda a:np.convolve(np.pad(np.array(a,float),4,mode='edge'),np.ones(9)/9,'valid')
  CORR=[sm(kx),sm(zc),sm(kz),sm(dz)];print('kx max',CORR[0].max().round(3),'kz max',CORR[2].max().round(3))
def rot(u,t):
  u=u/np.linalg.norm(u);t=t/np.linalg.norm(t);v=np.cross(u,t);c=u@t;K=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]);return np.eye(3)+K+K@K/(1+c)
def seg(a,b,A,B):
  u=b-a;t=B-A;k=np.linalg.norm(t)/np.linalg.norm(u);un=u/np.linalg.norm(u);M=rot(u,t)@(k*np.outer(un,un)+sh*(np.eye(3)-np.outer(un,un)));return lambda P:A+(P-a)@M.T,M
W=json.load(open('default_weights.mhw'))['weights']
def grp(n):
  b=n.split('.')[0];s=1 if n.endswith('.L') else -1 if n.endswith('.R') else 0
  if b.startswith('upperarm'):return 'UA',s
  if b.startswith('lowerarm'):return ('LA2' if b=='lowerarm02' else 'LA'),s
  if b.startswith(('wrist','metacarpal','finger')):return 'HA',s
  if b.startswith('upperleg'):return 'UL',s
  if b.startswith('lowerleg'):return 'LL',s
  if b.startswith(('foot','toe')):return 'FT',s
  return 'TO',0
N=len(V);acc={};
for n,l in W.items():
  g=grp(n)
  for i,w in l:acc.setdefault(g,np.zeros(N))[i]+=w
# check side
for s_ in(1,-1):acc[('LA',s_)]=acc[('LA',s_)]+acc[('LA2',s_)]
from scipy.spatial.transform import Rotation as Rot
Bn=np.load('bones.npy')
def frame(P,c0,thumb):
  L=P.mean(0)-c0;L/=np.linalg.norm(L);Wd=thumb-c0;Wd=Wd-(Wd@L)*L;Wd/=np.linalg.norm(Wd);return np.c_[L,Wd,np.cross(L,Wd)]
def handR(s):
  hb=Bn[(s*Bn[:,0]>.2)&(Bn[:,1]<.775)&(Bn[:,1]>.6)];Ft=frame(hb[hb[:,1]<.72],JT[s]['wr'],JT[s]['wr']+np.array([s*.2,0,0]))
  hm=V[acc[('HA',s)]>.5];hm=hm[hm[:,1]<np.percentile(hm[:,1],40)];th=jc('joint-%s-finger-1-2'%('l' if s>0 else 'r'));Fm=frame(hm,JM[s]['wr'],th)
  return Ft@Fm.T
ua=acc[('UA',1)];print('UA.L mean x',(V[:,0]*ua).sum()/ua.sum())
out=np.zeros((N,3));tw=np.zeros(N)
def add(g,P):
  global out,tw
  if g in acc:out+=acc[g][:,None]*P;tw+=acc[g]
build_corr(_torso(V)[acc[('TO',0)]>.6]);add(('TO',0),torso(V))
for s in(1,-1):
  m,t=JM[s],JT[s]
  f,_=seg(m['sh'],m['el'],t['sh'],t['el']);add(('UA',s),f(V))
  f,M=seg(m['el'],m['wr'],t['el'],t['wr']);RH=handR(s);
  # swing-twist: twist of RH*inv(M_rot) about forearm axis
  ax=(t['wr']-t['el']);ax/=np.linalg.norm(ax);q=Rot.from_matrix(RH@np.linalg.inv(rot(m['wr']-m['el'],t['wr']-t['el']))).as_quat();p=np.dot(q[:3],ax)*ax;tq=np.r_[p,q[3]];tq/=np.linalg.norm(tq);tw_=Rot.from_quat(tq);
  w2=acc.get(('LA2',s));la=acc[('LA',s)]
  for frac,wv in((0.0,la-w2),(0.5,w2)):
    Rt=Rot.from_rotvec(tw_.as_rotvec()*frac).as_matrix();P_=t['el']+(V-m['el'])@(Rt@M).T;out[:]+=wv[:,None]*P_;tw[:]+=wv
  add(('HA',s),t['wr']+(V-m['wr'])@(RH*sh).T)
  f,_=seg(m['hip'],m['kn'],t['hip'],t['kn']);add(('UL',s),f(V))
  f,M=seg(m['kn'],m['an'],t['kn'],t['an']);add(('LL',s),f(V))
  add(('FT',s),t['an']+(V-m['an'])*sh)
z=tw<1e-6;out[z]=torso(V[z]);out[~z]/=tw[~z,None]
tris=[];
for f in F:
  tris.append([f[0],f[1],f[2]])
  if len(f)==4:tris.append([f[0],f[2],f[3]])
tris=np.array(tris);u,inv=np.unique(tris.ravel(),return_inverse=True);P=out[u];T=inv.reshape(-1,3)
np.save('fem_raw.npy',P);np.save('fem_tri.npy',T)
print(P.min(0),P.max(0),len(P),len(T))
