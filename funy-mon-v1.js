/* FUNY PIN map creature MVP */
(function(){
  const ENDPOINT='https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/funy-mon-catch';
  const TARGET_SHOP_ID='KR-SEO-038';
  const ANON_KEY='funypin_mon_anon_id';
  const HISTORY_KEY='funypin_mon_history_v1';
  const DAILY_KEY='funypin_mon_daily_catch_v1';
  const defs=[
    {id:'moru',name:'모루',cls:'mon-a',svg:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="2" width="2" height="2" fill="#6f58c9"/><rect x="9" y="2" width="2" height="2" fill="#6f58c9"/><rect x="4" y="4" width="8" height="7" fill="#8b73df"/><rect x="3" y="6" width="2" height="4" fill="#8b73df"/><rect x="11" y="6" width="2" height="4" fill="#8b73df"/><rect x="6" y="6" width="1" height="1" fill="#fff"/><rect x="9" y="6" width="1" height="1" fill="#fff"/><rect x="7" y="8" width="2" height="1" fill="#f7d36b"/><rect x="5" y="11" width="2" height="2" fill="#6f58c9"/><rect x="9" y="11" width="2" height="2" fill="#6f58c9"/></svg>'},
    {id:'nubi',name:'누비',cls:'mon-b',svg:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="3" height="2" fill="#4da47b"/><rect x="10" y="2" width="2" height="3" fill="#4da47b"/><rect x="4" y="5" width="8" height="6" fill="#6dc69a"/><rect x="2" y="7" width="2" height="3" fill="#6dc69a"/><rect x="12" y="7" width="2" height="3" fill="#6dc69a"/><rect x="6" y="7" width="1" height="1" fill="#18392d"/><rect x="9" y="7" width="1" height="1" fill="#18392d"/><rect x="7" y="9" width="2" height="1" fill="#fff"/><rect x="5" y="11" width="2" height="2" fill="#4da47b"/><rect x="9" y="11" width="2" height="2" fill="#4da47b"/></svg>'},
    {id:'piri',name:'피리',cls:'mon-c',svg:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="7" y="1" width="2" height="3" fill="#df7551"/><rect x="5" y="4" width="6" height="7" fill="#f08c61"/><rect x="3" y="6" width="2" height="3" fill="#f08c61"/><rect x="11" y="6" width="2" height="3" fill="#f08c61"/><rect x="6" y="6" width="1" height="1" fill="#38251e"/><rect x="9" y="6" width="1" height="1" fill="#38251e"/><rect x="7" y="8" width="2" height="1" fill="#ffe6a3"/><rect x="5" y="11" width="2" height="2" fill="#df7551"/><rect x="9" y="11" width="2" height="2" fill="#df7551"/><rect x="12" y="4" width="2" height="2" fill="#ffd35e"/></svg>'}
  ];
  const offsets=[
    {lat:0.00010,lng:0.00013},
    {lat:-0.00009,lng:0.00012},
    {lat:0.00006,lng:-0.00015}
  ];
  const markers=[];
  let started=false,tries=0,busy=false;

  function todayKst(){
    const d=new Date(Date.now()+9*60*60*1000);
    return d.toISOString().slice(0,10);
  }
  function uuid(){
    if(crypto.randomUUID)return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]&15,v=c==='x'?r:(r&3|8);return v.toString(16)});
  }
  function anonId(){
    try{
      let v=localStorage.getItem(ANON_KEY);
      if(v)return v;
      v=uuid();localStorage.setItem(ANON_KEY,v);return v;
    }catch(_){return uuid()}
  }
  function saveHistory(item){
    try{
      const arr=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      arr.unshift(item);
      localStorage.setItem(HISTORY_KEY,JSON.stringify(arr.slice(0,100)));
    }catch(_){}
  }
  function markCaughtToday(){
    try{localStorage.setItem(DAILY_KEY,JSON.stringify({shop_id:TARGET_SHOP_ID,date:todayKst()}))}catch(_){}
  }
  function caughtToday(){
    try{
      const v=JSON.parse(localStorage.getItem(DAILY_KEY)||'null');
      return !!(v&&v.shop_id===TARGET_SHOP_ID&&v.date===todayKst());
    }catch(_){return false}
  }
  function hiddenByRoute(){
    return location.hash.includes('/shop/')||document.body.classList.contains('country-japan')||caughtToday();
  }
  function currentZoom(){try{return naverMap.getZoom()}catch(_){return 0}}
  function syncVisibility(){
    const hide=hiddenByRoute()||currentZoom()<14;
    markers.forEach(m=>{try{m.setMap(hide?null:naverMap)}catch(_){}});
  }
  function hideAll(){markers.forEach(m=>{try{m.setMap(null)}catch(_){}})}
  function clear(){hideAll();markers.length=0}
  function defById(id){return defs.find(x=>x.id===id)||defs[0]}

  function ensureModal(){
    if(document.getElementById('funyMonModal'))return;
    const el=document.createElement('div');
    el.id='funyMonModal';el.className='funy-mon-modal';el.hidden=true;
    el.innerHTML='<div class="funy-mon-backdrop" data-mon-close></div><section class="funy-mon-sheet" role="dialog" aria-modal="true" aria-labelledby="funyMonTitle"><button class="funy-mon-close" type="button" data-mon-close aria-label="닫기">×</button><div class="funy-mon-result-icon" id="funyMonIcon"></div><div class="funy-mon-kicker" id="funyMonKicker">FUNY MON</div><h3 id="funyMonTitle"></h3><p id="funyMonCopy"></p><div class="funy-mon-reward" id="funyMonReward" hidden></div><div class="funy-mon-code" id="funyMonCode" hidden></div><div class="funy-mon-actions"><button class="funy-mon-primary" id="funyMonSave" type="button" hidden>당첨 이미지 저장</button><button class="funy-mon-secondary" type="button" data-mon-close>닫기</button></div></section>';
    document.body.appendChild(el);
    el.querySelectorAll('[data-mon-close]').forEach(b=>b.addEventListener('click',closeModal));
  }
  function closeModal(){
    const el=document.getElementById('funyMonModal');
    if(!el)return;
    el.hidden=true;document.body.style.overflow='';document.body.classList.remove('funy-mon-open');
  }
  function showMessage(title,copy){
    ensureModal();
    document.getElementById('funyMonIcon').innerHTML='📍';
    document.getElementById('funyMonKicker').textContent='FUNY MON';
    document.getElementById('funyMonTitle').textContent=title;
    document.getElementById('funyMonCopy').textContent=copy;
    document.getElementById('funyMonReward').hidden=true;
    document.getElementById('funyMonCode').hidden=true;
    document.getElementById('funyMonSave').hidden=true;
    document.getElementById('funyMonModal').hidden=false;
    document.body.classList.add('funy-mon-open');
    document.body.style.overflow='hidden';
  }
  function openResult(data,def){
    ensureModal();
    const icon=document.getElementById('funyMonIcon'),title=document.getElementById('funyMonTitle'),copy=document.getElementById('funyMonCopy'),reward=document.getElementById('funyMonReward'),code=document.getElementById('funyMonCode'),save=document.getElementById('funyMonSave');
    icon.innerHTML=def.svg;reward.hidden=true;code.hidden=true;save.hidden=true;
    if(data.result==='winner'){
      document.getElementById('funyMonKicker').textContent='FUNY MON · WINNER';
      title.textContent=def.name+' 포획 성공! 🎉';
      copy.textContent=data.shop_name+'에서 특별한 상품에 당첨됐어요.';
      reward.textContent='🎁 '+data.reward.title;reward.hidden=false;
      code.textContent='당첨코드 '+data.reward.claim_code;code.hidden=false;
      save.hidden=false;save.onclick=()=>savePrizeImage(data,def);
    }else{
      document.getElementById('funyMonKicker').textContent='FUNY MON · CATCH';
      title.textContent=def.name+' 포획 성공!';
      copy.textContent=data.shop_name+'에서 오늘의 포획을 완료했어요.';
    }
    document.getElementById('funyMonModal').hidden=false;
    document.body.classList.add('funy-mon-open');
    document.body.style.overflow='hidden';
  }
  function getPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:10000});
    });
  }
  async function catchMonster(meta){
    if(busy)return;
    if(caughtToday()){showMessage('오늘은 이미 포획했어요','티씨지서울에서는 하루에 한 번만 포획할 수 있어요.');return}
    busy=true;
    try{
      const pos=await getPosition();
      const res=await fetch(ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          anonymous_id:anonId(),
          shop_id:TARGET_SHOP_ID,
          monster_id:meta.def.id,
          latitude:pos.coords.latitude,
          longitude:pos.coords.longitude
        })
      });
      const data=await res.json().catch(()=>({error:'invalid_response'}));
      if(!res.ok){
        if(data.error==='too_far')showMessage('조금 더 가까이 가보세요','티씨지서울까지 약 '+data.distance_m+'m예요. 100m 이내에서 포획할 수 있어요.');
        else if(data.error==='already_caught_today'){
          markCaughtToday();hideAll();
          showMessage('오늘은 이미 포획했어요','티씨지서울에서는 하루에 한 번만 포획할 수 있어요.');
        }else showMessage('포획하지 못했어요','잠시 후 다시 시도해주세요.');
        return;
      }
      markCaughtToday();hideAll();
      saveHistory({monster_id:meta.def.id,shop_id:TARGET_SHOP_ID,shop_name:data.shop_name,caught_at:data.caught_at,result:data.result,reward:data.reward||null});
      openResult(data,meta.def);
    }catch(err){
      const code=err&&typeof err==='object'&&'code' in err?err.code:null;
      if(code===1)showMessage('위치 권한이 필요해요','현재 위치를 확인해야 가까운 FUNY MON을 포획할 수 있어요.');
      else showMessage('현재 위치를 확인하지 못했어요','위치 서비스를 켠 뒤 다시 시도해주세요.');
    }finally{busy=false}
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
  }
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines){
    const words=String(text||'').split(' ');let line='',lines=[];
    for(const w of words){
      const test=line?line+' '+w:w;
      if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test;
    }
    if(line)lines.push(line);
    lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
  }
  async function savePrizeImage(data,def){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d');
    const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#faf7ff');g.addColorStop(1,'#eee7ff');
    ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
    ctx.fillStyle='#8062d8';ctx.font='800 54px sans-serif';ctx.fillText('FUNY PIN',70,105);
    ctx.fillStyle='#68606e';ctx.font='700 28px sans-serif';ctx.fillText('FUNY MON · WINNER',70,155);
    ctx.fillStyle='#2d2832';ctx.font='800 62px sans-serif';ctx.fillText(def.name+' 포획 성공!',70,270);
    ctx.fillStyle='#6749bd';ctx.font='900 54px sans-serif';wrapText(ctx,'🎁 '+data.reward.title,70,390,940,72,3);
    ctx.fillStyle='#6f6874';ctx.font='600 32px sans-serif';ctx.fillText('포획 매장  '+data.shop_name,70,650);
    ctx.fillText('포획 일시  '+new Date(data.caught_at).toLocaleString('ko-KR'),70,710);
    ctx.fillStyle='#fff';roundRect(ctx,70,790,940,180,28);
    ctx.fillStyle='#8062d8';ctx.font='800 30px sans-serif';ctx.fillText('당첨 코드',110,855);
    ctx.fillStyle='#2d2832';ctx.font='900 52px sans-serif';ctx.fillText(data.reward.claim_code,110,925);
    ctx.fillStyle='#716a77';ctx.font='600 28px sans-serif';wrapText(ctx,'이 이미지를 저장해 본인 게시물에 업로드한 뒤 FUNY PIN 안내에 따라 당첨을 인증해주세요.',70,1060,940,46,3);
    ctx.fillStyle='#9a92a0';ctx.font='600 24px sans-serif';ctx.fillText('by 깽퐌커플',70,1265);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
    if(!blob)return;
    const file=new File([blob],'funypin-winner-'+data.reward.claim_code+'.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:'FUNY PIN 당첨 이미지'});return}catch(_){}
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function spawn(){
    if(started||caughtToday())return;
    if(!(window.naver&&naver.maps&&typeof naverMap!=='undefined'&&naverMap)){if(tries++<80)setTimeout(spawn,250);return}
    const shop=(typeof SHOPS!=='undefined'?SHOPS:[]).find(s=>s.id===TARGET_SHOP_ID&&s._coord);
    if(!shop){if(tries++<80)setTimeout(spawn,250);return}
    started=true;
    defs.forEach((d,i)=>{
      const off=offsets[i],lat=Number(shop._coord.lat)+off.lat,lng=Number(shop._coord.lng)+off.lng;
      const html='<div class="funy-mon-marker '+d.cls+'" role="button" aria-label="'+d.name+' 포획">'+d.svg+'<span class="funy-mon-shadow"></span></div>';
      const marker=new naver.maps.Marker({
        position:new naver.maps.LatLng(lat,lng),
        map:hiddenByRoute()||currentZoom()<14?null:naverMap,
        clickable:true,zIndex:120,
        icon:{content:html,anchor:new naver.maps.Point(17,24)}
      });
      const meta={marker,shop,def:d};
      markers.push(marker);
      naver.maps.Event.addListener(marker,'click',()=>catchMonster(meta));
    });
    try{naver.maps.Event.addListener(naverMap,'zoom_changed',syncVisibility)}catch(_){}
    syncVisibility();
  }
  window.addEventListener('hashchange',syncVisibility);
  window.addEventListener('funy:shops-source',()=>{if(!started){tries=0;spawn()}});
  new MutationObserver(syncVisibility).observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(spawn,450);
  window.FUNY_MON_PROTO={
    respawn:()=>{clear();started=false;tries=0;try{localStorage.removeItem(DAILY_KEY)}catch(_){}spawn()},
    count:()=>markers.length,
    history:()=>{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch(_){return[]}},
    targetShop:TARGET_SHOP_ID
  };
})();