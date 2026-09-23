/* FUNY PIN map creature MVP */
(function(){
  const ENDPOINT='https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/funy-mon-catch';
  const SUPABASE_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
  let TARGET_SHOP_ID='';
  const ANON_KEY='funypin_mon_anon_id';
  const HISTORY_KEY='funypin_mon_history_v1';
  const DAILY_KEY='funypin_mon_daily_catch_v2';
  const defs=[
    {id:'ponanyang',no:'01',name:'포냐냥',type:'노말',tier:'COMMON',spawnable:true,cls:'mon-01',asset:'assets/funymon/01-ponanyang.png'},
    {id:'bubblelong',no:'02',name:'버블롱',type:'물',tier:'COMMON',spawnable:true,cls:'mon-02',asset:'assets/funymon/02-bubblelong.png'},
    {id:'hatring',no:'03',name:'하트링',type:'페어리',tier:'UNCOMMON',spawnable:true,cls:'mon-03',asset:'assets/funymon/03-hatring.png'},
    {id:'bulgi',no:'04',name:'불기',type:'불',tier:'UNCOMMON',spawnable:true,cls:'mon-04',asset:'assets/funymon/04-bulgi.png'},
    {id:'namumong',no:'05',name:'나무몽',type:'풀',tier:'UNCOMMON',spawnable:true,cls:'mon-05',asset:'assets/funymon/05-namumong.png'},
    {id:'ggomagureum',no:'06',name:'꼬마구름',type:'비행',tier:'RARE',spawnable:false,cls:'mon-06',asset:'assets/funymon/06-ggomagureum.png'},
    {id:'bawidong',no:'07',name:'바위동',type:'바위',tier:'RARE',spawnable:false,cls:'mon-07',asset:'assets/funymon/07-bawidong.png'},
    {id:'grimjamong',no:'08',name:'그림자몽',type:'고스트',tier:'SUPER RARE',spawnable:false,cls:'mon-08',asset:'assets/funymon/08-grimjamong.png'},
    {id:'beonjjeogi',no:'09',name:'번쩍이',type:'전기',tier:'SUPER RARE',spawnable:false,cls:'mon-09',asset:'assets/funymon/09-beonjjeogi.png'},
    {id:'neon',no:'10',name:'네온',type:'코스믹',tier:'LEGENDARY',spawnable:false,cls:'mon-10',asset:'assets/funymon/10-neon.png'}
  ];
  const offsets=[
    {lat:0.00010,lng:0.00013},
    {lat:-0.00009,lng:0.00012},
    {lat:0.00006,lng:-0.00015},
    {lat:-0.00013,lng:-0.00010},
    {lat:0.00015,lng:-0.00002}
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
    return location.hash.includes('/shop/')||document.body.classList.contains('country-japan');
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
    el.innerHTML='<div class="funy-mon-backdrop" data-mon-close></div><section class="funy-mon-sheet" role="dialog" aria-modal="true" aria-labelledby="funyMonTitle"><div class="funy-mon-handle" aria-hidden="true"></div><button class="funy-mon-close" type="button" data-mon-close aria-label="닫기">×</button><div class="funy-mon-pixel-corners" aria-hidden="true"></div><div class="funy-mon-visual"><div class="funy-mon-fx" id="funyMonFx" aria-hidden="true"></div><div class="funy-mon-result-icon" id="funyMonIcon"></div></div><h3 id="funyMonTitle"></h3><div class="funy-mon-meta" id="funyMonMeta" hidden></div><p class="funy-mon-location" id="funyMonCopy"></p><div class="funy-mon-reward-kuji" id="funyMonReward" hidden><div class="funy-mon-reward-result" id="funyMonRewardResult"></div><div class="funy-mon-reward-cover" id="funyMonRewardCover"><span class="funy-mon-kuji-label">REWARD</span><strong>→ 오른쪽으로 밀어 결과 확인</strong></div></div><div class="funy-mon-actions"><button class="funy-mon-primary" id="funyMonSave" type="button" disabled>이미지 저장</button></div></section>';
    document.body.appendChild(el);
    el.querySelectorAll('[data-mon-close]').forEach(b=>b.addEventListener('click',closeModal));
  }
  function closeModal(){
    const el=document.getElementById('funyMonModal');
    if(!el)return;
    el.hidden=true;document.body.style.overflow='';document.body.classList.remove('funy-mon-open');
  }
  function setResultState(state){
    const sheet=document.querySelector('#funyMonModal .funy-mon-sheet');
    if(!sheet)return;
    sheet.classList.remove('is-fail','is-success','is-prize');
    sheet.classList.add(state);
    const fx=document.getElementById('funyMonFx');
    if(fx)fx.innerHTML=state==='is-fail'?'<i>💔</i><i>·</i><i>·</i>':state==='is-prize'?'<i>✦</i><i>✦</i><i>★</i><i>✦</i><i>✦</i>':'<i>♡</i><i>✦</i><i>♡</i>';
  }
  function ensureCatchOutcome(){
    if(document.getElementById('funyMonOutcome'))return;
    const el=document.createElement('div');
    el.id='funyMonOutcome';el.className='funy-mon-outcome';el.hidden=true;
    el.innerHTML='<div class="funy-mon-outcome-box"><span class="funy-mon-outcome-kicker">FUNY MON</span><strong id="funyMonOutcomeTitle"></strong><p id="funyMonOutcomeCopy"></p><button id="funyMonOutcomeConfirm" type="button">확인</button></div>';
    document.body.appendChild(el);
  }
  function showCatchOutcome(success,copy,onDone){
    ensureCatchOutcome();
    const el=document.getElementById('funyMonOutcome'),btn=document.getElementById('funyMonOutcomeConfirm');
    el.className='funy-mon-outcome '+(success?'is-catch-success':'is-catch-fail');
    document.getElementById('funyMonOutcomeTitle').textContent=success?'포획 성공!':'포획 실패!';
    document.getElementById('funyMonOutcomeCopy').textContent=copy||'';
    btn.onclick=()=>{el.hidden=true;el.className='funy-mon-outcome';btn.onclick=null;if(success&&onDone)onDone()};
    el.hidden=false;
  }
  function showMessage(title,copy){
    showCatchOutcome(false,title+' · '+copy);
  }
  function ensureRewardImageViewer(){
    if(document.getElementById('funyMonRewardImageViewer'))return;
    const el=document.createElement('div');
    el.id='funyMonRewardImageViewer';el.className='funy-mon-reward-viewer';el.hidden=true;
    el.innerHTML='<div class="funy-mon-reward-viewer-bg" data-reward-viewer-close></div><div class="funy-mon-reward-viewer-card"><button type="button" data-reward-viewer-close aria-label="닫기">×</button><img id="funyMonRewardImage" alt="당첨 상품 이미지"></div>';
    document.body.appendChild(el);
    el.querySelectorAll('[data-reward-viewer-close]').forEach(b=>b.addEventListener('click',()=>{el.hidden=true}));
  }
  function openRewardImage(url){
    if(!url)return;
    ensureRewardImageViewer();
    const viewer=document.getElementById('funyMonRewardImageViewer'),img=document.getElementById('funyMonRewardImage');
    img.src=url;viewer.hidden=false;
  }
  function rewardMarkup(data){
    const r=data.reward||{title:'꽝',description:'아쉬워요! 다음 기회에 다시 도전해보세요!',is_win:false,claim_code:null,image_url:null};
    const win=r.is_win===true;
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return '<div class="funy-mon-reward-retro '+(win?'win':'lose')+'">'+(win?'당첨!':'꽝')+'</div>'+
      (win?'<strong class="funy-mon-reward-title">'+esc(r.title||'당첨 상품')+'</strong>':'')+
      (win&&r.image_url?'<button class="funy-mon-reward-detail" type="button" data-reward-image="'+esc(r.image_url)+'">자세히보기</button>':'')+
      (!win?'<p class="funy-mon-lose-copy">아쉬워요! 다음 기회에 다시 도전해보세요!</p>':'')+
      (win&&r.claim_code?'<div class="funy-mon-claim-code"><span>당첨 코드</span><b>'+esc(r.claim_code)+'</b></div>':'')+
      (win?'<div class="funy-mon-post-guide">이미지를 저장한 뒤 이벤트 게시물에 댓글로 등록해주세요.</div>':'');
  }
  function revealReward(data,def){
    const reward=document.getElementById('funyMonReward'),cover=document.getElementById('funyMonRewardCover'),save=document.getElementById('funyMonSave');
    if(!reward||reward.classList.contains('is-revealed'))return;
    reward.classList.remove('is-swiping');reward.classList.add('is-revealed','is-flashing');
    cover.style.transition='transform .34s steps(5,end),opacity .2s ease';
    cover.style.transform='translateX(112%) rotate(2deg)';
    cover.style.opacity='0';cover.style.pointerEvents='none';
    if(data.reward?.is_win===true)document.querySelector('#funyMonModal .funy-mon-sheet')?.classList.add('is-prize');
    reward.querySelector('[data-reward-image]')?.addEventListener('click',e=>openRewardImage(e.currentTarget.dataset.rewardImage));
    save.disabled=false;save.onclick=()=>savePrizeImage(data,def);
    setTimeout(()=>reward.classList.remove('is-flashing'),900);
  }
  function bindRewardSwipe(data,def){
    const reward=document.getElementById('funyMonReward'),cover=document.getElementById('funyMonRewardCover');
    if(!reward||!cover)return;
    let active=false,startX=0,dx=0,revealed=false;
    const reset=()=>{active=false;dx=0;reward.classList.remove('is-swiping');cover.style.transition='transform .18s steps(3,end)';cover.style.transform='translateX(0) rotate(0)';setTimeout(()=>cover.style.transition='',200)};
    cover.onpointerdown=e=>{if(revealed)return;active=true;startX=e.clientX;dx=0;reward.classList.add('is-swiping');cover.setPointerCapture?.(e.pointerId);cover.style.transition='none'};
    cover.onpointermove=e=>{
      if(!active||revealed)return;
      dx=Math.max(0,e.clientX-startX);
      const max=reward.clientWidth||300,ratio=dx/max;
      const jitter=Math.min(10,dx*.045),rot=((Math.floor(dx/12)%2)?1:-1)*Math.min(2.2,dx/90);
      cover.style.transform='translateX('+jitter+'px) rotate('+rot+'deg)';
      if(ratio>=.75){revealed=true;active=false;revealReward(data,def)}
    };
    cover.onpointerup=cover.onpointercancel=()=>{if(!revealed&&active)reset()};
  }
  function funyMonFxMarkup(def){
    const shapes={
      ponanyang:['✦','♡','✧','♡','✦'],
      bubblelong:['○','✦','◌','✦','○'],
      hatring:['♡','♥','✦','♥','♡'],
      bulgi:['✦','◆','✧','◆','✦'],
      namumong:['❖','✦','❧','✦','❖'],
      ggomagureum:['✧','☁','✦','☁','✧'],
      bawidong:['◆','✦','◇','✦','◆'],
      grimjamong:['✦','☾','✧','☾','✦'],
      beonjjeogi:['✦','ϟ','✧','ϟ','✦'],
      neon:['✦','✧','★','✧','✦']
    };
    return (shapes[def.id]||shapes.ponanyang).map(x=>'<i>'+x+'</i>').join('');
  }
  function openResult(data,def){
    ensureModal();
    const icon=document.getElementById('funyMonIcon'),title=document.getElementById('funyMonTitle'),meta=document.getElementById('funyMonMeta'),copy=document.getElementById('funyMonCopy'),reward=document.getElementById('funyMonReward'),rewardResult=document.getElementById('funyMonRewardResult'),cover=document.getElementById('funyMonRewardCover'),save=document.getElementById('funyMonSave'),sheet=document.querySelector('#funyMonModal .funy-mon-sheet');
    [...sheet.classList].filter(x=>x.startsWith('mon-')).forEach(x=>sheet.classList.remove(x));sheet.classList.remove('is-fail','is-prize');sheet.classList.add('is-success','mon-'+def.id);document.getElementById('funyMonFx').innerHTML=funyMonFxMarkup(def);
    icon.innerHTML='<img class="funy-mon-result-sprite" src="'+def.asset+'" alt="" draggable="false">';
    title.textContent=def.name;
    meta.innerHTML='<span>No.'+def.no+'</span><span class="type-'+def.id+'">'+def.type+'</span>';
    meta.hidden=false;
    copy.textContent='📍 '+data.shop_name+'에서 포획했어요';
    rewardResult.innerHTML=rewardMarkup(data);
    reward.hidden=false;reward.classList.remove('is-revealed','is-flashing','is-swiping');
    cover.style.transform='translateX(0)';cover.style.opacity='1';cover.style.pointerEvents='auto';cover.style.transition='';
    save.disabled=true;save.onclick=null;
    document.getElementById('funyMonModal').hidden=false;
    document.body.classList.add('funy-mon-open');
    document.body.style.overflow='hidden';
    bindRewardSwipe(data,def);
  }
  function getPosition(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation)return reject(new Error('unsupported'));
      navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:10000});
    });
  }
  async function catchMonster(meta){
    if(busy)return;
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
          showMessage('테스트 제한 오류','테스트 모드에서는 반복 포획이 가능해야 해요. 잠시 후 다시 시도해주세요.');
        }else showMessage('포획하지 못했어요','잠시 후 다시 시도해주세요.');
        return;
      }
      saveHistory({monster_id:meta.def.id,shop_id:TARGET_SHOP_ID,shop_name:data.shop_name,caught_at:data.caught_at,result:data.result,reward:data.reward||null});
      if(data.result==='failed'){
        showCatchOutcome(false,'다른 퍼니몬을 포획해보세요!');
        return;
      }
      showCatchOutcome(true,'퍼니몬을 포획했어요!',()=>openResult(data,meta.def));
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
  function loadCanvasImage(src){
    return new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=reject;im.src=src});
  }
  async function savePrizeImage(data,def){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
    const ctx=canvas.getContext('2d'),r=data.reward||{title:'꽝',is_win:false},win=r.is_win===true;
    const fxMap={
      ponanyang:['✦','♡','✧','♡','✦'],bubblelong:['○','✦','◌','✦','○'],hatring:['♡','♥','✦','♥','♡'],
      bulgi:['✦','◆','✧','◆','✦'],namumong:['❖','✦','❧','✦','❖'],ggomagureum:['✧','☁','✦','☁','✧'],
      bawidong:['◆','✦','◇','✦','◆'],grimjamong:['✦','☾','✧','☾','✦'],beonjjeogi:['✦','ϟ','✧','ϟ','✦'],neon:['✦','✧','★','✧','✦']
    };
    const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#faf8ff');g.addColorStop(.48,'#ffffff');g.addColorStop(1,'#f4f0f8');
    ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);

    // Header: mirror the restrained FUNY MON sheet instead of a large banner title.
    ctx.textAlign='center';ctx.fillStyle='#786b88';ctx.font='900 23px ui-monospace,monospace';ctx.fillText('FUNY PIN',540,72);
    ctx.fillStyle='#2d2832';ctx.font='950 42px sans-serif';ctx.fillText('FUNY MON',540,120);
    ctx.fillStyle='#d9d2e1';ctx.fillRect(420,145,240,4);

    // Monster aura + individual FX.
    const aura=ctx.createRadialGradient(540,365,30,540,365,270);
    aura.addColorStop(0,'rgba(142,116,202,.20)');aura.addColorStop(.55,'rgba(142,116,202,.07)');aura.addColorStop(1,'rgba(142,116,202,0)');
    ctx.fillStyle=aura;ctx.beginPath();ctx.arc(540,365,270,0,Math.PI*2);ctx.fill();
    const marks=fxMap[def.id]||fxMap.ponanyang,pts=[[300,390],[365,245],[540,215],[715,250],[780,395]];
    ctx.fillStyle='#8f82a7';ctx.font='800 34px sans-serif';marks.forEach((m,i)=>ctx.fillText(m,pts[i][0],pts[i][1]));
    try{
      const mon=await loadCanvasImage(def.asset);
      const size=390,x=(1080-size)/2,y=185;ctx.drawImage(mon,x,y,size,size);
    }catch(_){}

    ctx.fillStyle='#2d2832';ctx.font='950 64px sans-serif';ctx.fillText(def.name,540,650);
    // compact meta chips
    const chip=(x,w,label,bg,fg)=>{ctx.fillStyle=bg;roundRect(ctx,x,684,w,54,8);ctx.fillStyle=fg;ctx.font='850 23px ui-monospace,monospace';ctx.fillText(label,x+w/2,719)};
    chip(397,132,'No.'+def.no,'#302855','#ffffff');chip(541,142,def.type,'#f1edf6','#655d6e');
    ctx.fillStyle='#746d78';ctx.font='700 27px sans-serif';ctx.fillText('📍 '+data.shop_name+'에서 포획했어요',540,790);

    // Coupon-style REWARD area matching the front-end result sheet.
    const rx=80,ry=845,rw=920,rh=330;
    ctx.fillStyle='#8f82a7';roundRect(ctx,rx,ry,rw,rh,12);
    ctx.fillStyle='#fffdf9';roundRect(ctx,rx+8,ry+8,rw-16,rh-16,9);
    ctx.fillStyle='#786b88';ctx.font='900 22px ui-monospace,monospace';ctx.fillText('REWARD',540,900);
    ctx.font='950 52px ui-monospace,monospace';ctx.fillStyle=win?'#6541c0':'#776d7e';ctx.fillText(win?'당첨!':'꽝',540,965);
    if(win){
      ctx.fillStyle='#312944';ctx.font='900 34px sans-serif';wrapText(ctx,r.title||'당첨 상품',540,1025,760,44,2);
      if(r.claim_code){ctx.fillStyle='#6e4fd3';ctx.font='850 24px ui-monospace,monospace';ctx.fillText('당첨 코드  '+r.claim_code,540,1110)}
    }else{
      ctx.fillStyle='#746b78';ctx.font='800 25px sans-serif';ctx.fillText('아쉬워요! 다음 기회에 다시 도전해보세요!',540,1040);
    }
    ctx.fillStyle='#8c8491';ctx.font='700 21px sans-serif';ctx.fillText(win?'이미지를 저장한 뒤 이벤트 게시물 댓글로 등록해주세요.':'FUNY MON 포획 완료',540,1150);

    ctx.fillStyle='#9a92a0';ctx.font='700 22px ui-monospace,monospace';ctx.fillText('funypin.kr',540,1275);
    const fileName='FUNY-MON-'+def.id+'-'+Date.now()+'.png';
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(blob){
      const file=new File([blob],fileName,{type:'image/png'});
      if(navigator.canShare&&navigator.share&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file],title:'FUNY MON 이미지'});return}
        catch(e){if(e&&e.name==='AbortError')return}
      }
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.download=fileName;a.href=url;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }
  }

  async function loadActiveEvent(){
    try{
      const now=new Date().toISOString();
      const r=await fetch(SUPABASE_URL+'/rest/v1/funy_mon_events?select=shop_id&is_force_paused=eq.false&starts_at=lte.'+encodeURIComponent(now)+'&ends_at=gte.'+encodeURIComponent(now)+'&order=starts_at.desc&limit=1',{headers:{apikey:'__ANON_FROM_PAGE__'}});
      if(!r.ok)return null;
      const rows=await r.json();
      return rows&&rows[0]?rows[0]:null;
    }catch(_){return null}
  }
  function pageAnonKey(){
    try{return window.SUPABASE_ANON_KEY||window.FUNY_SUPABASE_ANON_KEY||''}catch(_){return ''}
  }
  async function spawn(){
    if(started)return;
    if(!TARGET_SHOP_ID){
      const key=pageAnonKey();
      if(!key){if(tries++<80)setTimeout(spawn,250);return}
      try{
        const now=new Date().toISOString();
        const r=await fetch(SUPABASE_URL+'/rest/v1/funy_mon_events?select=shop_id&is_force_paused=eq.false&starts_at=lte.'+encodeURIComponent(now)+'&ends_at=gte.'+encodeURIComponent(now)+'&order=starts_at.desc&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key}});
        if(!r.ok)return;
        const rows=await r.json();
        if(!rows||!rows[0]){clear();return}
        TARGET_SHOP_ID=rows[0].shop_id;
      }catch(_){return}
    }
    if(!(window.naver&&naver.maps&&typeof naverMap!=='undefined'&&naverMap)){if(tries++<80)setTimeout(spawn,250);return}
    const shop=(typeof SHOPS!=='undefined'?SHOPS:[]).find(s=>s.id===TARGET_SHOP_ID&&s._coord);
    if(!shop){if(tries++<80)setTimeout(spawn,250);return}
    started=true;
    defs.filter(d=>d.spawnable).forEach((d,i)=>{
      const off=offsets[i],lat=Number(shop._coord.lat)+off.lat,lng=Number(shop._coord.lng)+off.lng;
      const html='<div class="funy-mon-marker '+d.cls+' move-'+(i%3)+'" role="button" aria-label="'+d.name+' 포획"><span class="funy-mon-sprite"><img src="'+d.asset+'" alt="" draggable="false"></span><span class="funy-mon-shadow"></span></div>';
      const marker=new naver.maps.Marker({
        position:new naver.maps.LatLng(lat,lng),
        map:hiddenByRoute()||currentZoom()<14?null:naverMap,
        clickable:true,zIndex:120,
        icon:{content:html,anchor:new naver.maps.Point(24,34)}
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
    targetShop:()=>TARGET_SHOP_ID
  };
})();