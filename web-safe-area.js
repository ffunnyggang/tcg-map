/* Mobile browser safe areas. No native bridge, auth, or user data changes. */
(function(){
 'use strict';
 const root=document.documentElement;
 if(new URLSearchParams(location.search).get('app')==='1'||root.classList.contains('app-shell')||window.top!==window.self)return;
 root.classList.add('funy-web-safe');
 const mobile=matchMedia('(max-width:767px)'),prepared=new WeakSet();
 const headers='header:not(article header),.market-overlay-head,.market-register-head';
 let frame=0,lastColor='',theme=document.querySelector('meta[name="theme-color"]');
 if(!theme){theme=document.createElement('meta');theme.name='theme-color';document.head.appendChild(theme);}
 function color(value){
  const n=String(value).match(/[\d.]+/g)?.map(Number);
  return n&&n.length>=3?[n[0],n[1],n[2],n[3]??1]:[255,255,255,0];
 }
 function blend(base,paint){return base.map((v,i)=>i<3?Math.round(v*(1-paint[3])+paint[i]*paint[3]):1);}
 function visible(el){if(!el||el.hidden)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;}
 function prepare(){
  for(const el of document.querySelectorAll(headers)){
   if(prepared.has(el)||!visible(el)||el.closest('dialog,.talk-community-sheet,.market-register-sheet,article'))continue;
   // Market list headers already include env(safe-area-inset-top) in their CSS.
   if(el.matches('.market-overlay-head,.market-detail-head'))continue;
   const s=getComputedStyle(el);
   el.style.setProperty('--funy-safe-header-height',s.height);
   el.style.setProperty('--funy-safe-header-padding',s.paddingTop);
   prepared.add(el);el.classList.add('funy-safe-header');
  }
 }
 function update(){
  frame=0;if(root.classList.contains('app-shell'))return;
  prepare();if(!mobile.matches)return;
  const shop=document.querySelector('#detail-view'),market=document.querySelector('.market-detail-overlay');
  const immersive=visible(market)?market.classList.contains('has-media')&&!market.classList.contains('is-scrolled'):
   visible(shop)?!shop.querySelector('.detail-sticky.show'):!!document.querySelector('#naver-map');
  const header=[...document.querySelectorAll('.funy-safe-header,.market-overlay-head')].find(visible);
  let tone=immersive?[232,237,240,1]:blend([255,255,255,1],color(header?getComputedStyle(header).backgroundColor:'#fff'));
  // Read the actual topmost paints. Full-viewport dim masks participate here,
  // while bottom-sheet cards below the safe area do not. Closing restores tone.
  const x=Math.min(innerWidth/2,innerWidth-1);
  for(const el of document.elementsFromPoint(x,1).reverse()){
   if(el===root||el===document.body)continue;
   const s=getComputedStyle(el),r=el.getBoundingClientRect();
   if(r.top>0||r.bottom<=1||s.visibility==='hidden')continue;
   tone=blend(tone,color(s.backgroundColor));
  }
  for(const dialog of document.querySelectorAll('dialog[open]')){
   if(dialog.matches(':modal'))tone=blend(tone,color(getComputedStyle(dialog,'::backdrop').backgroundColor));
  }
  const next='#'+tone.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');
  if(next!==lastColor){lastColor=next;root.style.setProperty('--funy-web-top-color',next);theme.content=next;}
 }
 function schedule(){if(!frame)frame=setTimeout(update,80);}
 const observer=new MutationObserver(schedule);
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','open','style']});
 window.addEventListener('hashchange',schedule);
 window.addEventListener('resize',schedule);
 // Only image detail changes its top surface as it scrolls.
 document.addEventListener('scroll',()=>{if(document.querySelector('#detail-view:not([hidden]),.market-detail-overlay'))schedule();},{passive:true,capture:true});
 window.addEventListener('pageshow',schedule);
 schedule();
})();
