import numpy as np,re
def load():
  V=[];G={};cur=None
  for l in open('base.obj'):
    if l.startswith('v '):V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('g '):cur=l.split()[1];G.setdefault(cur,[])
    elif l.startswith('f '):G[cur].append([int(t.split('/')[0])-1 for t in l.split()[1:]])
  V=np.array(V)
  D=np.zeros_like(V)
  for r in ['caucasian','african','asian']:
    for l in open(r+'-female-young.target'):
      if l[0]in'#\n':continue
      p=l.split();D[int(p[0])]+=np.array([float(x) for x in p[1:4]])/3
  return V+D,G
if __name__=='__main__':
  V,G=load();b=np.unique(np.concatenate([np.array(f).ravel() for f in G['body']]))
  print(len(b),V[b].min(0),V[b].max(0))
  for k in G:
    if k.startswith('joint') and any(s in k for s in['shoulder','elbow','wrist','upper-leg','knee','ankle','clavicle','neck','head','pelvis','spine','ground']):
      vi=np.unique(np.concatenate([np.array(f).ravel() for f in G[k]]));print(k,V[vi].mean(0).round(3))
