(()=>{'use strict';const style=document.createElement('style');style.textContent='.visitqr-wrap{display:grid;gap:16px}.visitqr-card{padding:18px;border:1px solid #e9e4ef;border-radius:14px;background:white}.visitqr-card h2{font-size:17px;margin:0 0 12px}.visitqr-card p{font-size:12px;color:#81798b;line-height:1.6}.visitqr-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.visitqr-card input{flex:1;min-width:190px;max-width:340px;border:1px solid #dfd6eb;border-radius:10px;padding:12px;font:inherit}.visitqr-card button{border:0;background:#7b3dff;color:#fff;padding:12px;border-radius:10px;font:750 12px Pretendard,sans-serif;cursor:pointer}.visitqr-card button:disabled{opacity:.5}.visitqr-card button.secondary{background:#f4f0fa;color:#6648b3}.visitqr-item{padding:12px 0;border-bottom:1px solid #eee8f2;display:flex;align-items:center;gap:10px;justify-content:space-between}.visitqr-item small{display:block;color:#857b8c;margin-top:5px}.visitqr-url{font-size:12px;overflow-wrap:anywhere;color:#684abd}.visitqr-qr{display:inline-block;padding:12px;border:1px solid #eee;border-radius:10px;margin:9px 0}.visitqr-search{display:grid;gap:8px;max-width:510px}.visitqr-search-results{border:1px solid #e9e3f1;border-radius:11px;overflow:hidden;max-height:248px;overflow-y:auto;background:white}.visitqr-search-results[hidden]{display:none!important}.visitqr-search-results button{display:block;width:100%;padding:11px 12px;background:#fff;color:#30283b;text-align:left;border:0;border-bottom:1px solid #f1edf5;border-radius:0;font:inherit;font-size:12px}.visitqr-search-results button:hover{background:#f7f2ff}.visitqr-search-results button small{display:block;color:#867c92;margin-top:4px;font-size:11px}.visitqr-selected{font-size:12px;color:#6646b5;font-weight:750}.visitqr-selected[hidden]{display:none!important}.visitqr-search-help{font-size:11px;color:#8c8394}';document.head.append(style);let lastToken='';let qrPromise;const getQR=()=>{if(window.QRCode)return Promise.resolve(window.QRCode);if(qrPromise)return qrPromise;return qrPromise=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';s.onload=()=>window.QRCode?res(window.QRCode):rej(Error('QR 라이브러리 오류'));s.onerror=()=>rej(Error('QR 라이브러리 로드 오류'));document.head.append(s)})};window.loadAdminVisitQR=async()=>{const host=document.getElementById('feed');if(!host)return;host.innerHTML='<div class="visitqr-wrap"><section class="visitqr-card"><h2>매장 QR 발급 관리</h2><p>QR을 발급한 후 매장 내부에 부착하세요. 생성된 URL은 최초 발급할 때만 확인할 수 있습니다. 기존 GPS 방문인증은 유지됩니다.</p><div class="visitqr-search"><input id="visitqrShop" type="search" placeholder="카드샵명 또는 지역 검색" maxlength="80" autocomplete="off" aria-label="카드샵명 또는 지역 검색"><div id="visitqrSearchResults" class="visitqr-search-results" hidden></div><div id="visitqrSelected" class="visitqr-selected" hidden></div><div class="visitqr-row"><button type="button" id="visitqrCreate" disabled>선택한 카드샵 QR 발급</button></div><span class="visitqr-search-help">검색 결과에서 매장을 선택해 주세요. 매장 ID는 자동으로 연결됩니다.</span></div><div id="visitqrOutput" hidden><h2 style="margin-top:20px">신규 발급 QR</h2><div class="visitqr-qr" id="visitqrCode"></div><p class="visitqr-url" id="visitqrLink"></p><div class="visitqr-row"><button class="secondary" type="button" id="visitqrCopy">URL 복사</button><button class="secondary" type="button" id="visitqrPrint">인쇄</button></div></div><p id="visitqrMessage" role="status"></p><button type="button" class="secondary" id="visitqrRelogin" hidden>Google 관리자 다시 로그인</button></section><section class="visitqr-card"><h2>발급 이력</h2><div id="visitqrList">불러오는 중...</div></section></div>';const $=id=>host.querySelector('#'+id),notice=t=>{$('visitqrMessage').textContent=t};
const searchInput=$('visitqrShop'),results=$('visitqrSearchResults'),selectedLabel=$('visitqrSelected'),createButton=$('visitqrCreate');
let selectedShop=null,searchRequest=0,searchTimer;
const setSelection=(item)=>{
 selectedShop=item||null;
 createButton.disabled=!selectedShop;
 selectedLabel.hidden=!selectedShop;
 selectedLabel.textContent=selectedShop?'선택: '+selectedShop.name+' · '+selectedShop.id:'';
};
function resultMessage(message){results.replaceChildren();const el=document.createElement('div');el.style.padding='12px';el.style.fontSize='12px';el.textContent=message;results.append(el);results.hidden=false;}
async function searchShops(query){
 const request=++searchRequest;
 const term=query.trim().replace(/[(),.*%_]/g,' ').replace(/\s+/g,' ').trim();
 if(term.length<2){results.hidden=true;return}
 resultMessage('검색 중...');
 try{
   const like='*'+term+'*';
   const condition='(name.ilike.'+like+',city.ilike.'+like+',area.ilike.'+like+',address.ilike.'+like+')';
   const path='/rest/v1/shops?select=id,name,city,area,address&country_code=eq.KR&is_active=eq.true&or='+encodeURIComponent(condition)+'&order=name.asc&limit=20';
   const shops=await api(path);
   if(request!==searchRequest)return;
   results.replaceChildren();
   if(!Array.isArray(shops)||!shops.length){resultMessage('검색 결과가 없습니다.');return}
   for(const item of shops){
     const button=document.createElement('button');button.type='button';
     const name=document.createElement('strong');name.textContent=item.name;
     const meta=document.createElement('small');meta.textContent=[item.city,item.area,item.address,item.id].filter(Boolean).join(' · ');
     button.append(name,meta);
     button.onclick=()=>{setSelection(item);searchInput.value=item.name;results.hidden=true;searchRequest++};
     results.append(button);
   }
   results.hidden=false;
 }catch(e){
   if(request===searchRequest)resultMessage('매장 검색 실패: '+String(e.message||e));
 }
}
searchInput.addEventListener('input',()=>{
 setSelection(null);
 searchRequest++;
 clearTimeout(searchTimer);
 searchTimer=setTimeout(()=>searchShops(searchInput.value),260);
});
searchInput.addEventListener('keydown',event=>{if(event.key==='Escape')results.hidden=true});

const relogin=$('visitqrRelogin');
const sessionExpired=e=>/관리자 세션|세션 갱신|JWT|401|login_required|invalid.?token|refresh.?token|session.?expired/i.test(String(e?.message||e||''));
function showRelogin(){
 relogin.hidden=false;
 notice('관리자 로그인 세션이 만료됐어요. 다시 로그인한 뒤 QR을 발급해 주세요.');
}
relogin.onclick=async()=>{
 relogin.disabled=true;
 try{
  const auth=window.FUNY_WEB_AUTH;
  if(!auth)throw Error('관리자 로그인 모듈을 찾을 수 없습니다.');
  await auth.init();
  auth.rememberReturn('/admin.html?tab=visitqr');
  const {error}=await auth.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/login.html',queryParams:{prompt:'select_account'}}});
  if(error)throw error;
 }catch(e){notice('다시 로그인 연결 실패: '+String(e?.message||e));relogin.disabled=false;}
};
const call=async(action,rest={})=>{
 try{
  // Refresh before expiry to avoid sending stale admin tokens to the QR Edge Function.
  if(token&&refreshToken){
   let exp=0;
   try{exp=Number(JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp||0)}catch(_){}
   if(exp&&exp*1000<Date.now()+45000)await refreshSession();
  }
  const x=await api('/functions/v1/shop-visit-qr-otp',{method:'POST',body:JSON.stringify({action,...rest})});
  if(!x?.ok)throw Error(x?.error||'요청 실패');
  return x;
 }catch(e){
  if(sessionExpired(e)){showRelogin();throw Error('관리자 로그인 세션이 만료됐어요. 다시 로그인해 주세요.');}
  throw e;
 }
};async function list(){try{const x=await call('admin_list'),area=$('visitqrList');area.replaceChildren();if(!x.tags?.length){area.textContent='발급된 QR이 없습니다.';return}for(const t of x.tags){const div=document.createElement('div');div.className='visitqr-item';const left=document.createElement('div'),name=document.createElement('strong'),time=document.createElement('small');name.textContent=t.shop_id+' · '+(t.status==='active'?'활성':'폐기');time.textContent=new Date(t.created_at).toLocaleString('ko-KR');left.append(name,time);div.append(left);if(t.status==='active'){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='QR 폐기';b.onclick=async()=>{if(!confirm(t.shop_id+' QR을 폐기하시겠습니까?'))return;b.disabled=true;try{await call('admin_disable',{tag_id:t.id});notice('QR 폐기 완료');await list()}catch(e){notice('QR 폐기 실패: '+e.message)}finally{b.disabled=false}};div.append(b)}area.append(div)}}catch(e){$('visitqrList').textContent='발급 내역 조회 실패: '+e.message}}$('visitqrCreate').onclick=async()=>{const button=$('visitqrCreate'),shop=selectedShop?.id||'';if(!selectedShop){notice('검색 결과에서 카드샵을 선택해 주세요.');return}button.disabled=true;notice('QR 발급 중...');try{const x=await call('admin_create',{shop_id:shop});lastToken=x.url;$('visitqrOutput').hidden=false;$('visitqrLink').textContent=x.url;const place=$('visitqrCode');place.replaceChildren();try{const QR=await getQR();new QR(place,{text:x.url,width:220,height:220,correctLevel:QR.CorrectLevel.M})}catch(e){place.textContent='QR 이미지 생성에 실패했습니다. URL을 복사해 생성해 주세요.'}notice((x.shop_name||shop)+' QR 발급 완료');await list()}catch(e){notice('QR 발급 실패: '+e.message)}finally{button.disabled=false}};$('visitqrCopy').onclick=async()=>{try{await navigator.clipboard.writeText(lastToken);notice('URL 복사 완료')}catch(e){notice('복사 오류 · 아래 URL을 직접 복사해 주세요.')}};$('visitqrPrint').onclick=()=>window.print();await list()}})();