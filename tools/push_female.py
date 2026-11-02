import numpy as np,trimesh,sys
from scipy.spatial import cKDTree
P=np.load('fem_raw.npy');T=np.load('fem_tri.npy')
sc=trimesh.load('dec2.glb');I=[];names=[]
for n in sc.graph.nodes_geometry:
  if n.startswith(('skin','reproductive','hair')):continue
  Tm,g=sc.graph[n];x=trimesh.transform_points(sc.geometry[g].vertices,Tm);I.append(x);names+= [n]*len(x)
I=np.concatenate(I);names=np.array(names);ex=(np.abs(I[:,0])<.08)&(I[:,1]>.6)&(I[:,1]<.86)&(I[:,2]>.1);ex|=np.isin(names,['teeth','eyes','brain'])|((I[:,1]>1.4)&(I[:,1]<1.52)&(np.abs(I[:,0])<.035)&(I[:,2]>.1));I=I[~ex];names=names[~ex]
nb=[[] for _ in P]
for a,b,c in T:nb[a]+=[b,c];nb[b]+=[a,c];nb[c]+=[a,b]
nb=[np.unique(x) for x in nb]
M=.003;kd=cKDTree(I)
def check(P):
  mesh=trimesh.Trimesh(P,T,process=False);d,_=cKDTree(P).query(I);c=np.where(d<.05)[0]
  cp,dist,tri=trimesh.proximity.closest_point(mesh,I[c]);s=np.einsum('ij,ij->i',I[c]-cp,mesh.face_normals[tri])
  return mesh,c,s,tri
N0=trimesh.Trimesh(P,T,process=False).vertex_normals.copy()
def wind(P,Q):
  A=P[T[:,0]];B=P[T[:,1]];C=P[T[:,2]];w=np.zeros(len(Q))
  for i in range(0,len(Q),400):
    q=Q[i:i+400,None,:];a=A[None]-q;b=B[None]-q;c=C[None]-q
    la,lb,lc=[np.linalg.norm(x,axis=2) for x in(a,b,c)]
    det=np.einsum('ijk,ijk->ij',a,np.cross(b,c))
    den=la*lb*lc+np.einsum('ijk,ijk->ij',a,b)*lc+np.einsum('ijk,ijk->ij',b,c)*la+np.einsum('ijk,ijk->ij',c,a)*lb
    w[i:i+400]=np.arctan2(det,den).sum(1)/(2*np.pi)
  return w
best=None
for it in range(int(sys.argv[1]) if len(sys.argv)>1 else 12):
  mesh,c,s,tri=check(P);o=(s+M>0)&(s<.035)
  oi=np.where(o)[0];w=wind(P,I[c[oi]]);deep=w>.5;o[oi[deep]]=(s[oi[deep]]>-M)&False;print(' winding says inside:',deep.sum(),flush=True)
  print(it,'outside',((s>0)&(s<.035)).sum(),'margin',o.sum(),'far-misclass',(s>=.035).sum(),flush=True)
  if best is not None and o.sum()>best[0]:P=best[1];print('stop: worse');break
  best=(o.sum(),P.copy())
  if o.sum()==0:break
  D=np.zeros(len(P))
  for k in range(3):np.maximum.at(D,T[tri[o],k],s[o]+M)
  for _ in range(2):D=np.maximum(D,.6*np.array([D[x].max() for x in nb]))
  for _ in range(2):D=.5*D+.5*np.array([D[x].mean() for x in nb])
  P=P+N0*D[:,None]
np.save('fem.npy',P)
if len(sys.argv)>2:
  import matplotlib;matplotlib.use('Agg');import matplotlib.pyplot as plt
  mesh,c,s,tri=check(P);O=I[c[s>0]]
  f,a=plt.subplots(1,2,figsize=(14,12),gridspec_kw={'width_ratios':[2,1]})
  for i,c0 in enumerate([0,2]):a[i].scatter(P[:,c0],P[:,1],s=.05,c='g',alpha=.5);a[i].scatter(O[:,c0],O[:,1],s=.3,c=np.clip(s[s>0],0,.02),cmap='autumn_r');a[i].set_aspect('equal');a[i].grid(True)
  plt.tight_layout();plt.savefig(sys.argv[2],dpi=55)
