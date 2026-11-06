/* HOME mobile-web install banner; keeps the existing sticky portal header unchanged. */
(()=>{'use strict';
 const root=document.getElementById('funyAppInstallBanner');
 if(!root)return;
 const q=new URLSearchParams(location.search),ua=navigator.userAgent||'';
 const isMobile=/Android|iPhone|iPod/i.test(ua)&&window.matchMedia('(max-width:767px)').matches;
 const isApp=!!window.ReactNativeWebView||q.get('app')==='1'||document.documentElement.classList.contains('app-shell');
 if(!isMobile||isApp)return;
 const isIOS=/iPhone|iPod/i.test(ua),platform=isIOS?'ios':'android';
 const store=isIOS?'https://apps.apple.com/kr/app/funy-pin/id6817652126':'https://play.google.com/store/search?q=FUNY%20PIN&c=apps';
 const action=root.querySelector('[data-app-install-action]'),close=root.querySelector('[data-app-install-close]');
 const name=root.querySelector('.funy-app-install-name');
 const subtitle=root.querySelector('.funy-app-install-subtitle');
 const meta=root.querySelector('.funy-app-install-meta');
 const icon=root.querySelector('.funy-app-install-icon');
 const getLang=()=>{try{return window.FUNY_I18N?.getLang?.()||localStorage.getItem('funy-pin-lang')||'ko'}catch(_){return document.documentElement.lang||'ko'}};
 const updateLanguage=()=>{
  const en=getLang()==='en';
  root.setAttribute('aria-label',en?'Install the FUNY PIN app':'FUNY PIN 앱 설치 안내');
  if(name)name.textContent=en?'FUNY PIN App':'FUNY PIN 앱';
  if(subtitle)subtitle.textContent=en?'Your TCG card shop map, on the go':'내 손안의 TCG 카드샵 지도';
  if(meta)meta.textContent=en?'Free · iOS / Android':'무료 · iOS / Android';
  if(icon)icon.alt=en?'FUNY PIN app icon':'FUNY PIN 앱 아이콘';
  action.textContent=en?(isIOS?'Get':'Find app'):(isIOS?'설치':'앱 찾기');
  action.setAttribute('aria-label',en?(isIOS?'Get FUNY PIN on the App Store':'Find FUNY PIN on Google Play'):(isIOS?'App Store에서 FUNY PIN 설치':'Google Play에서 FUNY PIN 검색'));
  close.setAttribute('aria-label',en?'Dismiss app install banner':'앱 설치 배너 닫기');
 };
 root.setAttribute('data-funy-i18n','off');
 window.addEventListener('funy:languagechange',updateLanguage);
 if(!action||!close)return;
 const dismissKey='funypin:install-banner:dismissed-until:v1';
 const now=Date.now();let hiddenUntil=0;
 try{hiddenUntil=Number(localStorage.getItem(dismissKey)||0)||0}catch(_){}
 if(hiddenUntil>now)return;
 const report=(type,extra={})=>{
  const params={promo_placement:'top_banner',source_page:'home',target_platform:platform,client_surface:'WEB',app_platform:'web',promo_variant:'v1',...extra};
  try{if(typeof window.gtag==='function')window.gtag('event',type,params)}catch(_){}
 };
 const suppress=days=>{try{localStorage.setItem(dismissKey,String(Date.now()+days*86400000))}catch(_){}};
 action.href=store;action.target='_blank';action.rel='noopener noreferrer';
 updateLanguage();
 action.addEventListener('click',()=>{report('app_install_promo_click',{action_type:isIOS?'install':'store_search'});suppress(1)});
 close.addEventListener('click',()=>{report('app_install_promo_dismiss',{action_type:'dismiss'});suppress(7);root.hidden=true});
 root.hidden=false;
 let viewed=false;
 const onView=()=>{if(viewed||root.hidden)return;viewed=true;report('app_install_promo_view',{action_type:'view'})};
 if('IntersectionObserver' in window){
  const obs=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=0.5)){onView();obs.disconnect()}},{threshold:[0.5]});
  obs.observe(root);
 }else onView();
})();
