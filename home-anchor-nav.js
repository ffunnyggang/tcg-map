/* HOME section navigation: no route changes or duplicate native navigation. */
(function(){
'use strict';
function start(){
 const nav=document.getElementById('homeAnchorNav'),hero=document.querySelector('.home-hero-banner'),flow=document.querySelector('.home-content-flow'),shell=document.querySelector('.portal-shell');
 if(!nav||!hero||!flow||!shell||window.FUNY_HOME_ANCHORS)return;
 const groups=[
  {key:'discover',selectors:['#funy-home-shops']},
  {key:'news',selectors:['#homeUpcomingSchedule','#funy-home-news']},
  {key:'products',selectors:['#homeBoxMarket','#funy-home-graded']},
  {key:'talk',selectors:['#homePopularTalk','#homeCardCollections','#funy-home-shorts']},
  {key:'tools',selectors:['.home-content-flow [data-cms-placement="home"]>.fp-cms-block:has(a[href*="coin-flip.html"],a[data-funy-target-url*="coin-flip.html"])']},
  {key:'notice',selectors:['.home-notice-strip']}
 ];
 const buttons=[...nav.querySelectorAll('[data-home-anchor]')];let frame=0,active='',entries=[],top=0,barHeight=44;
 const visible=el=>el&&!el.hidden&&el.getClientRects().length>0&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
 const headerBottom=()=>{const header=document.querySelector('.portal-header');return visible(header)?Math.max(0,header.getBoundingClientRect().bottom):0};
 const setVar=(name,value)=>{if(nav.style.getPropertyValue(name)!==value)nav.style.setProperty(name,value)};
 function collect(){const rows=[];for(const group of groups){for(const selector of group.selectors){document.querySelectorAll(selector).forEach(el=>{if(visible(el)&&!rows.some(x=>x.el===el))rows.push({key:group.key,el,top:el.getBoundingClientRect().top+Math.max(0,window.scrollY||0)})})}}return rows.sort((a,b)=>a.top-b.top)}
 function select(key){if(active===key)return;active=key;for(const b of buttons){if(b.dataset.homeAnchor===key)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current')}
  const current=buttons.find(b=>b.dataset.homeAnchor===key);if(!current||nav.hidden)return;const r=current.getBoundingClientRect(),n=nav.getBoundingClientRect();if(r.left<n.left||r.right>n.right)nav.scrollTo({left:Math.max(0,current.offsetLeft-(nav.clientWidth-current.offsetWidth)/2),behavior:'auto'});
 }
 function update(){frame=0;top=headerBottom();const rect=shell.getBoundingClientRect();setVar('--home-anchor-top',top+'px');setVar('--home-anchor-left',rect.left+'px');setVar('--home-anchor-width',rect.width+'px');entries=collect();
  for(const b of buttons){const available=entries.some(x=>x.key===b.dataset.homeAnchor);b.hidden=!available;b.disabled=!available;}
  nav.hidden=!(Math.max(0,window.scrollY||0)>1&&hero.getBoundingClientRect().bottom<=top+1&&entries.length);
  barHeight=nav.hidden?44:nav.getBoundingClientRect().height||44;
  const line=Math.max(0,window.scrollY||0)+top+barHeight+12;let current=entries[0];for(const row of entries){if(row.top>line+1)break;current=row}const atBottom=(window.scrollY||0)>1&&(window.scrollY||0)+window.innerHeight>=document.documentElement.scrollHeight-2;if(atBottom&&entries.length)current=entries[entries.length-1];if(current)select(current.key);else select('');
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(update)}
 for(const b of buttons)b.addEventListener('click',()=>{update();const row=entries.find(x=>x.key===b.dataset.homeAnchor);if(!row)return;const destination=Math.max(0,row.el.getBoundingClientRect().top+Math.max(0,window.scrollY||0)-top-barHeight-12);window.scrollTo({top:destination,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
 const observer=new MutationObserver(schedule);const sizes=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
 function observe(){observer.observe(flow,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});sizes?.observe(flow);sizes?.observe(hero);const header=document.querySelector('.portal-header');if(header)sizes?.observe(header);}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});window.visualViewport?.addEventListener('resize',schedule,{passive:true});window.addEventListener('scrollend',schedule,{passive:true});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;observer.disconnect();sizes?.disconnect()});window.addEventListener('pageshow',()=>{observe();schedule()});
 document.fonts?.ready.then(schedule);window.FUNY_HOME_ANCHORS={refresh:schedule};observe();update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
