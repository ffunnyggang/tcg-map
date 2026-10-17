'use strict';
// Camera session lifecycle and temporal quality gate. No identity recognition or liveness authentication.
function liveGuideIssue(result){
 const b=result.box;if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)return '얼굴을 가이드 안에 넣어주세요.';
 if(b.width<.22||b.height<.4)return '카메라에 조금 더 가까이 와주세요.';
 if(b.width>.62||b.height>.94)return '카메라에서 조금만 멀어져 주세요.';
 if(b.x<.03||b.y<.02||b.x+b.width>.97||b.y+b.height>.98)return '얼굴 전체가 가이드 안에 들어오도록 맞춰주세요.';
 if(Math.abs(b.x+b.width/2-.5)>.12||Math.abs(b.y+b.height/2-.5)>.13)return '얼굴을 가운데 가이드에 맞춰주세요.';
 if((result.features.roll??0)>12||result.frontal<.65)return '고개를 반듯하게 하고 정면을 봐주세요.';
 return '';
}
function stableFaceSamples(samples,result){
 if(!samples.length)return true;
 const previous=samples[samples.length-1],a=previous.box,b=result.box;
 if(Math.abs(a.x+a.width/2-b.x-b.width/2)>.035||Math.abs(a.y+a.height/2-b.y-b.height/2)>.04||Math.abs(a.width-b.width)>.05)return false;
 const keys=Object.keys(result.features).filter(k=>k!=='roll');
 return keys.reduce((sum,k)=>sum+Math.abs(result.features[k]-previous.features[k]),0)/keys.length<.12;
}
function aggregateFaceSamples(samples){
 const median=values=>{const a=[...values].sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
 return {features:Object.fromEntries(Object.keys(samples[0].features).map(k=>[k,median(samples.map(s=>s.features[k]))])),rgb:[0,1,2].map(i=>Math.round(median(samples.map(s=>s.rgb[i]))))};
}
class LiveFaceScan{
 constructor(hooks){this.hooks=hooks;this.epoch=0;this.active=false;this.stream=null;this.samples=[];this.timer=null;this.deadline=null;this.now=hooks.now||(()=>performance.now());this.schedule=hooks.schedule||((fn,ms)=>setTimeout(fn,ms));this.cancel=hooks.cancel||clearTimeout;}
 valid(token){return this.active&&token===this.epoch;}
 stop(){this.active=false;this.epoch++;if(this.timer!==null)this.cancel(this.timer);if(this.deadline!==null)this.cancel(this.deadline);this.timer=this.deadline=null;const stream=this.stream;this.stream=null;if(stream)stream.getTracks().forEach(t=>t.stop());this.samples=[];this.hooks.close();}
 fail(error,token){if(!this.valid(token))return;this.stop();this.hooks.onError(error);}
 async start(){
  this.stop();this.active=true;const token=this.epoch;this.hooks.onUpdate({stage:'permission',progress:0,text:'카메라 권한을 확인하고 있어요…'});
  this.deadline=this.schedule(()=>this.fail(new Error('카메라 준비 시간이 길어졌어요. 권한을 확인하고 다시 시도해주세요.'),token),60000);
  try{
   const stream=await this.hooks.getStream();if(!this.valid(token)){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;stream.getVideoTracks().forEach(t=>t.addEventListener?.('ended',()=>this.fail(new Error('카메라 연결이 끊겼어요. 다시 측정해주세요.'),token),{once:true}));
   await this.hooks.open(stream);if(!this.valid(token))return;
   this.hooks.onUpdate({stage:'loading',progress:0,text:'얼굴 측정 도구를 준비하고 있어요…'});
   await this.hooks.prepare();if(!this.valid(token))return;
   this.cancel(this.deadline);this.deadline=this.schedule(()=>this.fail(new Error('측정이 오래 걸리고 있어요. 밝은 곳에서 얼굴을 정면으로 맞춘 뒤 다시 시도해주세요.'),token),45000);
   this.hooks.onUpdate({stage:'guide',progress:0,text:'얼굴을 가이드 안에 넣어주세요.'});this.timer=this.schedule(()=>this.tick(token),0);
  }catch(error){this.fail(error,token);}
 }
 async tick(token){
  if(!this.valid(token))return;
  try{
   if(this.pending){try{await this.pending;}catch{}if(!this.valid(token))return;}
   const pending=Promise.resolve().then(()=>this.hooks.analyze(this.hooks.frame()));this.pending=pending;let result;try{result=await pending;}finally{if(this.pending===pending)this.pending=null;}if(!this.valid(token))return;
   const issue=liveGuideIssue(result);
   if(issue){this.samples=[];this.hooks.onUpdate({stage:'guide',progress:0,text:issue});}
   else{
    if(!stableFaceSamples(this.samples,result))this.samples=[];
    this.samples.push({...result,time:this.now()});
    const elapsed=this.now()-this.samples[0].time,progress=Math.min(1,this.samples.length/6,elapsed/2200);
    this.hooks.onUpdate({stage:'measuring',progress,text:'좋아요! 잠시 그대로 있어주세요.'});
    if(this.samples.length>=6&&elapsed>=2200){const aggregate=aggregateFaceSamples(this.samples.slice(-6));this.stop();this.hooks.onComplete(aggregate);return;}
   }
  }catch(error){if(!this.valid(token))return;this.samples=[];this.hooks.onUpdate({stage:'guide',progress:0,text:error.message||'얼굴을 확인하지 못했어요. 정면을 봐주세요.'});}
  if(this.valid(token))this.timer=this.schedule(()=>this.tick(token),350);
 }
}
