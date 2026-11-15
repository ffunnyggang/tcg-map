/* HOME hero: render only published banners; never flash obsolete HTML assets. */
(()=>{'use strict';
const root=document.querySelector('.home-hero-banner');
if(!root)return;
const track=root.querySelector('.home-hero-track'),dotWrap=root.querySelector('.home-hero-dots');
if(!track||!dotWrap)return;
const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co';
const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
let slides=[],dots=[],index=0,timer=null,interval=4500,signature='',loading=false,firstLoaded=false;
let startX=0,deltaX=0;
root.dataset.heroState='loading';
const safe=value=>{try{const u=new URL(value,location.origin);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
const stop=()=>{clearInterval(timer);timer=null};
const show=i=>{if(!slides.length)return;index=(i+slides.length)%slides.length;track.style.transform='translateX(-'+index*100+'%)';dots.forEach((d,n)=>{d.classList.toggle('is-active',n===index);d.setAttribute('aria-current',n===index?'true':'false')})};
const play=()=>{stop();if(firstLoaded&&slides.length>1&&!document.hidden)timer=setInterval(()=>show(index+1),interval)};
const connect=()=>{
  slides=[...track.querySelectorAll('.home-hero-slide')];
  dots=[...dotWrap.querySelectorAll('button')];
  dotWrap.hidden=slides.length<2;dotWrap.style.display=slides.length<2?'none':'';
  dots.forEach((d,i)=>{d.onclick=()=>{show(i);play()};d.setAttribute('aria-label',(i+1)+'번 배너')});
  show(0);play();
};
const setState=state=>{root.dataset.heroState=state;root.setAttribute('aria-busy',state==='loading'?'true':'false')};
const loaded=img=>new Promise((resolve,reject)=>{
  if(img.complete){img.naturalWidth?resolve():reject(new Error('banner image unavailable'));return}
  const timeout=setTimeout(()=>{cleanup();reject(new Error('banner image timed out'))},8000);
  const cleanup=()=>{clearTimeout(timeout);img.removeEventListener('load',ok);img.removeEventListener('error',bad)};
  const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error('banner image unavailable'))};
  img.addEventListener('load',ok,{once:true});img.addEventListener('error',bad,{once:true});
});
async function refresh(){
  if(loading||document.hidden)return;
  loading=true;
  try{
    const headers={apikey:KEY,Accept:'application/json'};
    const [sr,br]=await Promise.all([
      fetch(BASE+'/rest/v1/home_hero_settings?select=interval_seconds,revision&id=eq.default',{headers,cache:'no-store'}),
      fetch(BASE+'/rest/v1/home_hero_banners?select=*&order=slot.asc',{headers,cache:'no-store'})
    ]);
    if(!sr.ok||!br.ok)throw Error('Hero config unavailable');
    const [settings,rows]=await Promise.all([sr.json(),br.json()]);
    if(!Array.isArray(rows)||!settings?.[0])throw Error('Invalid hero config');
    const now=Date.now();
    const visible=rows.filter(x=>x.is_active&&(!x.starts_at||Date.parse(x.starts_at)<=now)
      &&(!x.ends_at||Date.parse(x.ends_at)>now)&&safe(x.image_url)&&safe(x.target_url)).slice(0,5);
    const next=JSON.stringify([settings[0].interval_seconds,visible]);
    if(next===signature&&firstLoaded)return;
    if(!visible.length){stop();track.replaceChildren();dotWrap.replaceChildren();root.hidden=true;firstLoaded=false;signature=next;setState('empty');return}
    const firstUrl=safe(visible[0].image_url);
    const firstImage=new Image();
    firstImage.decoding='async';
    firstImage.src=firstUrl;
    await loaded(firstImage);
    if(document.hidden)return;
    const newSlides=document.createDocumentFragment(),newDots=document.createDocumentFragment();
    for(const [i,x] of visible.entries()){
      const a=document.createElement('a'),img=i===0?firstImage:document.createElement('img'),d=document.createElement('button');
      a.className='home-hero-slide';a.href=safe(x.target_url);
      a.setAttribute('aria-label',x.title||'주요 콘텐츠');
      a.dataset.funyLinkMode=x.link_mode==='external'?'external':'inapp';
      a.dataset.funyInappPresentation=x.inapp_presentation==='bottom_sheet'?'bottom_sheet':'page';
      a.dataset.funyLinkSource='home_hero';
      if(x.link_mode==='external'){a.target='_blank';a.rel='noopener noreferrer'}
      if(i!==0){img.loading='lazy';img.decoding='async';img.src=safe(x.image_url)}
      else img.fetchPriority='high';
      img.alt=x.title||'';
      a.append(img);newSlides.append(a);newDots.append(d);
    }
    stop();
    track.replaceChildren(newSlides);dotWrap.replaceChildren(newDots);
    signature=next;firstLoaded=true;
    interval=Math.max(2000,Math.min(30000,Number(settings[0].interval_seconds)*1000||4500));
    root.hidden=false;setState('ready');connect();
    try{performance.mark('funypin-home-hero-ready')}catch(_){}
  }catch(e){
    console.warn('HOME hero load failed',e.message);
    // Never revive the old static banners if the current campaign cannot be loaded.
    if(!firstLoaded)setState('error');
  }finally{loading=false}
}
track.replaceChildren();dotWrap.replaceChildren();
root.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;deltaX=0;stop()},{passive:true});
root.addEventListener('touchmove',e=>{deltaX=e.touches[0].clientX-startX},{passive:true});
root.addEventListener('touchend',()=>{if(Math.abs(deltaX)>45)show(index+(deltaX<0?1:-1));play()},{passive:true});
root.addEventListener('touchcancel',play,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{play();void refresh()}});
window.addEventListener('focus',()=>void refresh());
setInterval(()=>void refresh(),60000);
void refresh();
})();
