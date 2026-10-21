/* FUNY PIN TCG MAP — admin-controlled FUNYMON find button */
(function(){
  'use strict';
  if(window.__FUNY_MON_MAP_FIND)return;
  window.__FUNY_MON_MAP_FIND=true;

  const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const headers={apikey:KEY,Accept:'application/json'};
  const isShopFocusEntry=(()=>{try{const q=new URLSearchParams(location.search);return q.get('focus')==='shop'&&/^(KR|JP)-[A-Z]{3}-\d{3}$/.test(String(q.get('shopId')||'').trim().toUpperCase())}catch(_){return false}})();
  let control=null,collapseTimer=0,lastSignature='',expandedShownThisLoad=isShopFocusEntry;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function get(path){
    const r=await fetch(BASE+'/rest/v1/'+path,{headers,cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }
  function activeEvent(ev){
    if(!ev||ev.is_archived||ev.is_force_paused||ev.target_type!=='shop')return false;
    const now=Date.now(),start=Date.parse(ev.starts_at),end=Date.parse(ev.ends_at);
    return Number.isFinite(start)&&Number.isFinite(end)&&now>=start&&now<=end&&/^(KR|JP)-[A-Z]{3}-\d{3}$/.test(String(ev.shop_id||''));
  }
  function removeControl(){
    clearTimeout(collapseTimer);collapseTimer=0;
    control?.remove();control=null;lastSignature='';
  }
  function buildHref(shopId){
    const u=new URL(location.href);
    u.pathname='/shops.html';u.hash='';
    u.searchParams.set('focus','shop');
    u.searchParams.set('shopId',String(shopId).toUpperCase());
    u.searchParams.set('zoom','max');
    u.searchParams.set('popup','1');
    u.searchParams.delete('country');
    return u.pathname+u.search;
  }
  function scheduleCollapse(seconds){
    clearTimeout(collapseTimer);
    const sec=Math.max(1,Math.min(30,Number(seconds)||4));
    collapseTimer=setTimeout(()=>control?.classList.add('is-collapsed'),sec*1000);
  }
  function render(ev,setting,shop){
    const wrap=document.querySelector('.map-wrap-hero');if(!wrap)return;
    const signature=[ev.id,ev.shop_id,setting.collapse_seconds,shop?.name||''].join('|');
    if(control&&lastSignature===signature)return;
    removeControl();lastSignature=signature;
    control=document.createElement('div');
    control.id='funymonFindControl';
    control.className='funymon-find-control map-location-control';
    control.innerHTML='<button id="funymonFindButton" class="funymon-find-btn map-location-btn" type="button" aria-label="퍼니몬 찾기 · '+esc(shop?.name||ev.shop_id)+'" title="퍼니몬 찾기"><span class="funymon-find-emoji" aria-hidden="true">👾</span><span class="funymon-find-label">퍼니몬 찾기</span><span class="funymon-find-arrow" aria-hidden="true">›</span></button>';
    if(expandedShownThisLoad)control.classList.add('is-collapsed');
    wrap.appendChild(control);
    const btn=control.querySelector('#funymonFindButton');
    btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const href=buildHref(ev.shop_id);
      try{if(typeof gtag==='function')gtag('event','funymon_map_find_click',{event_id:ev.id,shop_id:ev.shop_id})}catch(_){}
      location.assign(href);
    });
    if(!expandedShownThisLoad){
      expandedShownThisLoad=true;
      scheduleCollapse(setting.collapse_seconds);
    }
  }
  async function refresh(){
    try{
      const japan=document.body.classList.contains('country-japan')||window.FUNY_MAP_COUNTRY?.get?.()==='JP';
      if(japan){removeControl();return}
      const settings=await get('funy_mon_map_settings?select=id,is_enabled,event_id,collapse_seconds&id=eq.default&limit=1');
      const setting=settings?.[0];
      if(!setting?.is_enabled||!setting.event_id){removeControl();return}
      const events=await get('funy_mon_events?select=id,shop_id,starts_at,ends_at,is_force_paused,is_archived,target_type&id=eq.'+encodeURIComponent(setting.event_id)+'&limit=1');
      const ev=events?.[0];
      if(!activeEvent(ev)){removeControl();return}
      const shops=await get('shops?select=id,name,is_active&id=eq.'+encodeURIComponent(ev.shop_id)+'&is_active=eq.true&limit=1');
      const shop=shops?.[0];
      if(!shop){removeControl();return}
      render(ev,setting,shop);
    }catch(e){
      console.warn('[FUNY PIN] FUNYMON map find unavailable',e);
      removeControl();
    }
  }

  refresh();
  window.addEventListener('pageshow',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  window.addEventListener('funy:mapdatachange',refresh);
})();
