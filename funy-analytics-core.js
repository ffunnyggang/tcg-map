/* FUNY PIN shared analytics. Loaded before page event handlers. */
(function(){
  if(window.__FUNY_ANALYTICS_CORE)return;
  const script=document.currentScript,init=script?.dataset.gaInit==='1';
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  const context=()=>{
    const c=window.__FUNY_APP_CONTEXT||{},q=new URLSearchParams(location.search);
    const app=!!window.ReactNativeWebView||q.get('app')==='1';
    return {client_surface:c.surface||(app?'app_webview':'web'),app_platform:c.platform||(app?(q.get('appPlatform')||'unknown'):'web'),app_version:c.appVersion||'',app_build:c.buildVersion||'',login_state:typeof c.loggedIn==='boolean'?(c.loggedIn?'logged_in':'logged_out'):'unknown'};
  };
  const track=(name,params={})=>{try{window.gtag('event',name,{...context(),...params})}catch(_){}};
  window.__FUNY_ANALYTICS_CORE={track,context};window.FUNY_TRACK=track;
  window.gtag('set',context());
  // Window capture runs before the existing app's document navigation capture.
  // Keep native navigation intact while recording the initiating action once.
  if(window.ReactNativeWebView||new URLSearchParams(location.search).get('app')==='1'){
    let start=null,moved=false,lastTouch=0;
    window.addEventListener('touchstart',e=>{const t=e.touches?.[0];start=t?{x:t.clientX,y:t.clientY}:null;moved=false},{capture:true,passive:true});
    window.addEventListener('touchmove',e=>{const t=e.touches?.[0];if(t&&start&&(Math.abs(t.clientX-start.x)>10||Math.abs(t.clientY-start.y)>10))moved=true},{capture:true,passive:true});
    const capture=e=>{
      if(e.type==='touchend'&&(moved||!start))return;
      if(e.type==='click'&&Date.now()-lastTouch<650){e.__funyAnalyticsCaptured=true;return;}
      const t=e.target instanceof Element?e.target:null;if(!t)return;
      const card=t.closest('.shop-card[data-id]'),popup=t.closest('.map-shop-popup'),cms=t.closest('a[data-funy-link-mode]');
      if(!card&&!popup&&!cms)return;
      if(card)track('shop_list_click',{shop_id:card.dataset.id||''});
      if(popup)track('map_popup_click',{shop_id:popup.getAttribute('data-id')||popup.getAttribute('data-jp-shop')||''});
      if(cms)track('cms_link_click',{link_mode:cms.dataset.funyLinkMode||'inapp',inapp_presentation:cms.dataset.funyInappPresentation||'page',link_url:(cms.getAttribute('href')||'').slice(0,100)});
      e.__funyAnalyticsCaptured=true;if(e.type==='touchend')lastTouch=Date.now();
    };
    window.addEventListener('touchend',capture,{capture:true,passive:true});window.addEventListener('click',capture,true);
  }
  if(init){
    window.gtag('js',new Date());window.gtag('config','G-3ZERNC71PH');
    const tag=document.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id=G-3ZERNC71PH';document.head.appendChild(tag);
  }
  // Pages without the legacy interaction bundle still get consistent route context.
  if(script?.dataset.routeTracking==='1'){
    track('funy_page_view',{page_path:location.pathname});
    const route=()=>track('funy_route_view',{page_path:location.pathname,route_hash:location.hash.slice(0,100),screen_type:/live-pin/.test(location.pathname)?'live_pin':/coin-flip|oripa-calculator/.test(location.pathname)?'tcg_tool':'form'});
    route();window.addEventListener('hashchange',route);
  }
  document.addEventListener('click',e=>{
    const t=e.target instanceof Element?e.target:null;if(!t)return;
    if(t.closest('#map-location-btn'))track('map_my_location_click');
    const sort=t.closest('#list-sort-menu [data-sort-value]');
    if(sort)track('shop_sort_click',{sort_type:sort.dataset.sortValue});
    const layer=t.closest('.qa-layer-chip,#liveTempLayer');
    if(layer){const name=layer.id==='liveTempLayer'?'live_pin':layer.dataset.layer;setTimeout(()=>track('map_layer_toggle',{layer_name:name,enabled:layer.classList.contains('active')}),0);}
    const popup=t.closest('.live-temp-popup');if(popup)track('live_pin_map_open');
  },true);
})();
