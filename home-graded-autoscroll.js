/* HOME graded cards: continuous right-to-left carousel, matching HOME BOX behavior. */
(()=>{'use strict';if(window.FUNY_GRADED_AUTO_SCROLL)return;window.FUNY_GRADED_AUTO_SCROLL=true;
 const style=document.createElement('style');
 style.textContent='.funy-graded-rail.funy-graded-auto-scroll{scroll-snap-type:none!important;scroll-behavior:auto!important}@media(prefers-reduced-motion:reduce){.funy-graded-rail.funy-graded-auto-scroll{scroll-snap-type:x mandatory!important}}';
 document.head.appendChild(style);
 let section=null,rail=null,observer=null,visibility=null,raf=0,baseWidth=0,last=0,position=0,pauseUntil=0,autoSpeed=0,visible=false,touching=false,suppressClickUntil=0,axis='',startX=0,startY=0,startScroll=0;
 const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const app=()=>!!window.ReactNativeWebView||document.documentElement.classList.contains('app-shell')||new URLSearchParams(location.search).get('app')==='1';
 const measure=()=>{const first=rail?.querySelector('.funy-graded-card:not([data-funy-scroll-clone])'),clone=rail?.querySelector('.funy-graded-card[data-funy-scroll-clone]');baseWidth=first&&clone?clone.offsetLeft-first.offsetLeft:0;if(baseWidth<=0)baseWidth=0};
 const pause=()=>{pauseUntil=performance.now()+2000;autoSpeed=0};
 const normalize=v=>baseWidth>0?((v%baseWidth)+baseWidth)%baseWidth:v;
 function duplicate(){
  if(!rail||reduce())return;
  const originals=[...rail.children].filter(n=>n.classList?.contains('funy-graded-card')&&!n.hasAttribute('data-funy-scroll-clone'));
  if(originals.length<2)return;
  if(rail.querySelector('[data-funy-scroll-clone]')){measure();return}
  for(const card of originals){const clone=card.cloneNode(true);clone.setAttribute('data-funy-scroll-clone','');clone.setAttribute('aria-hidden','true');clone.tabIndex=-1;rail.appendChild(clone)}
  rail.classList.add('funy-graded-auto-scroll');measure();position=normalize(rail.scrollLeft);
 }
 function frame(ts){
  if(!rail?.isConnected){raf=0;return}
  if(!last)last=ts;
  if(!reduce()&&!touching&&!document.hidden&&visible&&baseWidth>rail.clientWidth&&ts>pauseUntil){
   const dt=Math.min(ts-last,32),target=app()?.036:.028,decay=Math.exp(-dt/280);
   position+=target*dt+(autoSpeed-target)*280*(1-decay);
   autoSpeed=target+(autoSpeed-target)*decay;
   position=normalize(position);
   rail.scrollLeft=position;
  }else autoSpeed=0;
  last=ts;raf=requestAnimationFrame(frame);
 }
 function attach(target){
  rail=target;section=rail.closest('#funy-home-graded');if(!section)return;
  duplicate();
  observer=new MutationObserver(()=>{if(!rail.isConnected)return;duplicate()});
  observer.observe(rail,{childList:true});
  if(typeof IntersectionObserver!=='undefined'){visibility=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false},{threshold:.04});visibility.observe(section)}else visible=true;
  ['pointerdown','wheel','focusin'].forEach(type=>rail.addEventListener(type,pause,{passive:true}));
  rail.addEventListener('scroll',()=>{if(touching||performance.now()<pauseUntil){position=rail.scrollLeft;pause()}},{passive:true});
  rail.addEventListener('touchstart',e=>{touching=true;pause();const t=e.touches[0];if(!t)return;startX=t.clientX;startY=t.clientY;startScroll=rail.scrollLeft;axis=''}, {passive:true});
  rail.addEventListener('touchmove',e=>{
   if(!touching||e.touches.length!==1)return;
   const t=e.touches[0],dx=t.clientX-startX,dy=t.clientY-startY;
   if(!axis){if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;axis=Math.abs(dx)>Math.abs(dy)?'x':'y'}
   if(axis!=='x')return;
   if(e.cancelable)e.preventDefault();
   let next=startScroll-dx;
   if(baseWidth>rail.clientWidth){if(next<0){startScroll+=baseWidth;next+=baseWidth}else if(next>=baseWidth){startScroll-=baseWidth;next-=baseWidth}}
   rail.scrollLeft=next;position=next;suppressClickUntil=performance.now()+500;
  },{passive:false});
  const finish=()=>{touching=false;axis='';position=rail.scrollLeft;pause()};
  ['touchend','touchcancel'].forEach(type=>rail.addEventListener(type,finish,{passive:true}));
  rail.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  window.addEventListener('resize',measure,{passive:true});
  raf=requestAnimationFrame(frame);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer?.disconnect();visibility?.disconnect();window.removeEventListener('resize',measure)},{once:true});
 }
 const target=document.querySelector('#funy-home-graded .funy-graded-rail');
 if(target)attach(target);
 else{const parent=document.querySelector('.home-content-flow')||document.body;const watcher=new MutationObserver(()=>{const found=document.querySelector('#funy-home-graded .funy-graded-rail');if(found){watcher.disconnect();attach(found)}});watcher.observe(parent,{childList:true,subtree:true})}
})();
