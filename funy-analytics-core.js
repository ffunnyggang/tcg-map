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

  /* Dynamic TCG type compatibility: Riftbound + Other TCG. */
  const pathname=String(location.pathname||'').toLowerCase();
  const english=()=>{try{return localStorage.getItem('funy-pin-lang')==='en'}catch(_){return false}};

  function installShopRequestTcgOptions(){
    const root=document.getElementById('items');if(!root)return false;
    let other=[...root.querySelectorAll('.chip')].find(x=>['기타 TCG','기타','Other TCG'].includes(String(x.dataset.value||x.textContent||'').trim()));
    if(other){other.dataset.value='기타 TCG';other.textContent=english()?'Other TCG':'기타 TCG'}
    if(!root.querySelector('[data-value="리프트바운드"]')){
      const btn=document.createElement('button');btn.className='chip';btn.type='button';btn.dataset.value='리프트바운드';btn.textContent=english()?'Riftbound':'리프트바운드';btn.onclick=()=>btn.classList.toggle('on');
      if(other)root.insertBefore(btn,other);else root.appendChild(btn);
    }
    return true;
  }
  if(/\/shop-request\.html$/.test(pathname)){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installShopRequestTcgOptions,{once:true});else installShopRequestTcgOptions();
  }

  if(/\/shops\.html$/.test(pathname)){
    let installed=false,loading=false,loaded=false;
    const API='https://wdttzpbmqavaqfcbaywj.supabase.co';
    const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
    const label=key=>{
      const ko={pokemon:'포켓몬',onePiece:'원피스',dragonBall:'드래곤볼',riftbound:'리프트바운드',other:'기타 TCG'};
      const en={pokemon:'Pokémon',onePiece:'One Piece',dragonBall:'Dragon Ball',riftbound:'Riftbound',other:'Other TCG'};
      return (english()?en:ko)[key]||key;
    };
    const refresh=()=>{
      try{if(typeof renderFilters==='function')renderFilters()}catch(_){}
      try{if(typeof renderList==='function')renderList()}catch(_){}
      try{if(typeof syncMapMarkers==='function')syncMapMarkers(false)}catch(_){}
      try{if(typeof state!=='undefined'&&state.current&&typeof openDetail==='function')openDetail(state.current)}catch(_){}
    };
    const enrichFallback=()=>{
      try{SHOPS.forEach(s=>{s.tcg=s.tcg||{};if(!Object.prototype.hasOwnProperty.call(s.tcg,'riftbound'))s.tcg.riftbound=null;if(!Object.prototype.hasOwnProperty.call(s.tcg,'other'))s.tcg.other=s.otherTcg?true:null})}catch(_){}
    };
    const loadStatuses=async()=>{
      if(loading||loaded)return;loading=true;
      try{
        const res=await fetch(API+'/rest/v1/v_app_shops?select=id,tcg,other_tcg_note',{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'});if(!res.ok)throw new Error('TCG '+res.status);
        const rows=await res.json(),by=new Map((rows||[]).map(x=>[String(x.id),x]));
        SHOPS.forEach(s=>{const row=by.get(String(s.id)),raw=row?.tcg||{};s.tcg=s.tcg||{};s.tcg.riftbound=raw.riftbound?.status??null;s.tcg.other=raw.other?.status??(row?.other_tcg_note?true:null)});
        loaded=true;refresh();
      }catch(e){console.warn('[FUNY PIN] extended TCG fallback:',e?.message||e)}finally{loading=false}
    };
    const install=()=>{
      try{
        if(typeof FILTERS==='undefined'||typeof SHOPS==='undefined')return false;
        if(!installed){
          const baseLabel=window.FUNY_TCG_LABEL;
          window.FUNY_TCG_LABEL=key=>['riftbound','other'].includes(key)?label(key):(typeof baseLabel==='function'?baseLabel(key):label(key));
          const insertAt=Math.max(0,FILTERS.findIndex(x=>x.id==='dragonBall')+1);
          if(!FILTERS.some(x=>x.id==='riftbound'))FILTERS.splice(insertAt,0,{id:'riftbound',label:label('riftbound'),test:s=>s.tcg?.riftbound===true});
          const existingOther=FILTERS.find(x=>x.id==='otherTcg'||x.id==='other');
          if(existingOther){
            existingOther.label=label('other');
            existingOther.test=s=>s.tcg?.other===true;
            for(let i=FILTERS.length-1;i>=0;i--){
              const item=FILTERS[i];
              if(item!==existingOther&&(item?.id==='otherTcg'||item?.id==='other'))FILTERS.splice(i,1);
            }
          }else{
            const otherAt=Math.max(0,FILTERS.findIndex(x=>x.id==='riftbound')+1);
            FILTERS.splice(otherAt,0,{id:'other',label:label('other'),test:s=>s.tcg?.other===true});
          }
          const extendedComp=(s,rv)=>{const en=window.FUNY_IS_ENGLISH?.()===true;const tcg=[s.tcg?.pokemon&&window.FUNY_TCG_LABEL('pokemon'),s.tcg?.onePiece&&window.FUNY_TCG_LABEL('onePiece'),s.tcg?.dragonBall&&window.FUNY_TCG_LABEL('dragonBall'),s.tcg?.riftbound&&window.FUNY_TCG_LABEL('riftbound'),s.tcg?.other&&window.FUNY_TCG_LABEL('other')].filter(Boolean).join(' · ');const bars=en?[['Singles',rv.single],['Graded Cards',rv.graded],['Boxes',rv.box],['Oripa',rv.oripa]]:[['싱글카드',rv.single],['등급카드',rv.graded],['박스제품',rv.box],['오리파',rv.oripa]];return '<div class="comp-card"><h3 class="sub-title with-icon"><span class="sub-icon">'+icon('cards')+'</span>'+(en?'Product Mix':'상품 구성 상세')+'</h3>'+(tcg?'<div class="tcg-line"><span class="tcg-label">'+(en?'TCG Titles':'취급 TCG')+'</span><span class="tcg-value">'+tcg+'</span></div>':'')+'<div class="bar-list">'+bars.map(([l,v])=>'<div class="bar-row"><div class="bar-label">'+l+'</div><div class="bar-track"><div class="bar-fill" style="width:'+(v/5*100)+'%"></div></div></div>').join('')+'</div></div>'};
          try{compHTML=extendedComp}catch(_){window.compHTML=extendedComp}
          installed=true;
        }
        enrichFallback();refresh();loadStatuses();return true;
      }catch(_){return false}
    };
    let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},50);
    window.addEventListener('funy:shops-source',()=>{loaded=false;setTimeout(install,0)});
  }
})();
