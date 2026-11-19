// Construct an extra margin from the adjacent artwork. Pixels inside the
// source rectangle are copied exactly at the original physical resolution.
export function makeRestoredOverscan(native, canvas, padX, padY) {
  const {width:w, height:h} = native;
  if (!Number.isInteger(padX) || !Number.isInteger(padY) ||
      padX < 1 || padY < 1 || padX >= w || padY >= h) {
    throw new Error('복원본의 확장 영역을 확인해 주세요.');
  }
  const src = native.getContext('2d').getImageData(0,0,w,h).data;
  const W=w+2*padX,H=h+2*padY,out=canvas(W,H),g=out.getContext('2d');
  const result=g.createImageData(W,H),dst=result.data;
  const clamp=(v,max)=>Math.min(max,Math.max(0,v));
  const at=(x,y)=>4*(clamp(y,h-1)*w+clamp(x,w-1));
  const mix=(a,b,t)=>a+(b-a)*t;
  function side(vertical, end) {
    const limit=(vertical?h:w)-1;
    const boundary=end?(vertical?w:h)-1:0, inward=end?-1:1;
    const index=(t,n)=>vertical?at(boundary+n*inward,t):at(t,boundary+n*inward);
    // A small structure tensor estimates how lines and texture enter the
    // edge. Smooth its direction field before continuing those features.
    const cross=new Float64Array(limit+1),energy=new Float64Array(limit+1);
    for(let t=0;t<=limit;t++) for(let n=2;n<=14;n+=2) {
      const tl=index(t-1,n),tr=index(t+1,n),ni=index(t,n+1),no=index(t,n-1);
      for(let ch=0;ch<3;ch++){
        const dt=src[tr+ch]-src[tl+ch],dn=src[ni+ch]-src[no+ch];
        cross[t]+=dt*dn;energy[t]+=dt*dt+.38*dn*dn;
      }
    }
    const direction=new Float64Array(limit+1);
    for(let t=0;t<=limit;t++){
      let c=0,e=700;
      for(let d=-12;d<=12;d++){
        const q=clamp(t+d,limit),weight=13-Math.abs(d);
        c+=weight*cross[q];e+=weight*energy[q];
      }
      direction[t]=Math.max(-1.15,Math.min(1.15,-c/e));
    }
    return {limit,index,direction};
  }
  const left=side(true,false),right=side(true,true),top=side(false,false),bottom=side(false,true);
  function plan(s,t,d,pad) {
    let u=t;
    // Follow the slowly changing edge field rather than pulling a long,
    // straight stripe from each last pixel.
    for(let step=0;step<6;step++){
      const q=clamp(u,s.limit),i=Math.floor(q);
      u+=d/6*mix(s.direction[i],s.direction[Math.min(s.limit,i+1)],q-i);
    }
    const p=clamp(u,s.limit),i=Math.floor(p);
    const neighbor=Math.round(Math.min(11,d*.14)),n=Math.round(Math.min(7,d*.1));
    return [s.index(i,0),s.index(i+1,0),p-i,s.index(i-neighbor,n),s.index(i,n),
      s.index(i+neighbor,n),Math.min(.60,d/pad*.60)];
  }
  function sample(p,ch) {
    const edge=mix(src[p[0]+ch],src[p[1]+ch],p[2]);
    const detail=(src[p[3]+ch]+2*src[p[4]+ch]+src[p[5]+ch])/4;
    return mix(edge,detail,p[6]);
  }
  for(let y=0;y<H;y++){
    const sy=y-padY,dy=sy<0?-sy:Math.max(0,sy-h+1);
    if(!dy)dst.set(src.subarray(sy*w*4,(sy+1)*w*4),(y*W+padX)*4);
    for(let x=0;x<W;x++){
      const sx=x-padX,dx=sx<0?-sx:Math.max(0,sx-w+1);
      if(!dx&&!dy){x=padX+w-1;continue;}
      const px=dx?plan(sx<0?left:right,sy,dx,padX):null;
      const py=dy?plan(sy<0?top:bottom,sx,dy,padY):null;
      const weight=dy/(dx+dy),k=4*(y*W+x);
      for(let ch=0;ch<4;ch++)dst[k+ch]=px&&py?mix(sample(px,ch),sample(py,ch),weight):sample(px||py,ch);
    }
  }
  g.putImageData(result,0,0);
  return out;
}
