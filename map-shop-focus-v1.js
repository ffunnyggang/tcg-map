/* FUNY PIN shop focus deep link
 * Runs only when ?focus=shop&shopId=... is present.
 * Flow: country -> target marker -> max zoom -> selected marker -> current popup.
 */
(function(){
  'use strict';
  if(window.__FUNY_SHOP_FOCUS_DEEPLINK)return;
  window.__FUNY_SHOP_FOCUS_DEEPLINK=true;

  let params;
  try{params=new URLSearchParams(location.search)}catch(_){return}
  if(params.get('focus')!=='shop'){
    try{
      const raw=localStorage.getItem('funypin-map-focus-pending');
      const pending=raw?JSON.parse(raw):null;
      const fresh=pending&&pending.focus==='shop'&&Date.now()-Number(pending.at||0)<15000;
      if(fresh){
        params.set('focus','shop');
        params.set('shopId',String(pending.shopId||''));
        params.set('zoom',String(pending.zoom||'max'));
        params.set('popup',String(pending.popup||'1'));
        localStorage.removeItem('funypin-map-focus-pending');
      }
    }catch(_){}
  }
  if(params.get('focus')!=='shop')return;

  const shopId=String(params.get('shopId')||'').trim().toUpperCase();
  if(!/^(KR|JP)-[A-Z]{3}-\d{3}$/.test(shopId)){
    console.warn('[FUNY PIN] invalid shop focus deep link:',shopId);
    return;
  }

  const targetCountry=shopId.startsWith('JP-')?'JP':'KR';
  const popupEnabled=params.get('popup')!=='0';
  const requestedZoom=String(params.get('zoom')||'max').trim().toLowerCase();
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function waitValue(getter,timeout=15000,step=100){
    const started=Date.now();
    while(Date.now()-started<timeout){
      try{const value=getter();if(value)return value}catch(_){}
      await sleep(step);
    }
    return null;
  }

  function naverMaxZoom(map){
    let max=19;
    try{
      const value=Number(map?.getOptions?.('maxZoom'));
      if(Number.isFinite(value))max=value;
    }catch(_){}
    return max;
  }

  function googleMaxZoom(map){
    let max=20;
    try{
      const typeId=map?.getMapTypeId?.();
      const type=map?.mapTypes?.get?.(typeId);
      const value=Number(type?.maxZoom);
      if(Number.isFinite(value))max=value;
    }catch(_){}
    return max;
  }

  function resolveZoom(max){
    if(requestedZoom==='max')return max;
    const parsed=Number(requestedZoom);
    if(!Number.isFinite(parsed))return max;
    return Math.max(1,Math.min(max,Math.round(parsed)));
  }

  async function collapseMapSheet(){
    const api=await waitValue(()=>window.FUNY_MAP_SHEET,6000,80);
    try{api?.collapse?.();await sleep(120);return true}catch(_){return false}
  }

  async function ensureCountry(){
    const api=await waitValue(()=>window.FUNY_MAP_COUNTRY,12000);
    if(!api)return false;
    try{
      if(api.get?.()!==targetCountry)api.set?.(targetCountry);
      await waitValue(()=>api.get?.()===targetCountry,5000,80);
      await sleep(220);
      return true;
    }catch(_){return false}
  }

  async function ensureKoreaShopLayer(){
    const chip=await waitValue(()=>document.querySelector('.qa-layer-chip[data-layer="shops"]'),4500,120);
    if(chip&&!chip.classList.contains('active')){
      try{chip.click();await sleep(180)}catch(_){}
    }
  }

  async function focusKorea(){
    await ensureKoreaShopLayer();
    const api=await waitValue(()=>window.FUNY_NAVER_MAP_API,12000);
    const map=await waitValue(()=>api?.getMap?.(),12000);
    if(!api||!map)return false;

    const shop=await waitValue(()=>api.getShops?.()?.find?.(x=>String(x.id).toUpperCase()===shopId),10000);
    const marker=await waitValue(()=>api.getMarkers?.()?.get?.(shopId),15000);
    if(!shop||!marker)return false;

    try{marker.setMap(map)}catch(_){}
    const pos=marker.getPosition?.();
    if(!pos)return false;

    try{naver.maps.Event.trigger(map,'resize')}catch(_){}
    try{map.setCenter(pos)}catch(_){}
    try{map.setZoom(resolveZoom(naverMaxZoom(map)))}catch(_){}
    await sleep(180);
    try{marker.setMap(map)}catch(_){}

    if(popupEnabled){
      await waitValue(()=>marker.__funyShopId===shopId||document.querySelector('.map-popup-bubble'),4500,100);
      try{window.FUNY_MAP_POPUP?.clear?.()}catch(_){}
      try{naver.maps.Event.trigger(marker,'click')}catch(_){}
    }

    try{map.setCenter(pos)}catch(_){}
    return true;
  }

  async function focusJapan(){
    const api=await waitValue(()=>window.FUNY_GOOGLE_MAP_API,15000);
    const map=await waitValue(()=>api?.getMap?.(),15000);
    if(!api||!map)return false;

    const marker=await waitValue(()=>api.getMarkers?.()?.get?.(shopId),15000);
    if(!marker)return false;

    try{marker.setMap(map)}catch(_){}
    const pos=marker.pos||marker.getPosition?.();
    if(!pos)return false;

    try{map.setCenter(pos)}catch(_){}
    try{map.setZoom(resolveZoom(googleMaxZoom(map)))}catch(_){}
    await sleep(220);

    if(popupEnabled){
      try{api.clearSelection?.(true)}catch(_){}
      if(marker.el){
        try{marker.el.click()}catch(_){}
      }else{
        const button=await waitValue(()=>marker.el,3000,100);
        try{button?.click()}catch(_){}
      }
    }
    try{map.setCenter(pos)}catch(_){}
    return true;
  }

  (async()=>{
    await collapseMapSheet();
    const ready=await ensureCountry();
    if(!ready)return;
    await collapseMapSheet();
    const ok=targetCountry==='JP'?await focusJapan():await focusKorea();
    if(!ok){
      console.warn('[FUNY PIN] shop focus target was not ready:',shopId);
      return;
    }
    await collapseMapSheet();
    try{
      if(typeof gtag==='function')gtag('event','map_shop_focus_deeplink',{shop_id:shopId,country:targetCountry});
    }catch(_){}
  })();
})();
