(()=>{'use strict';
const css=document.createElement('style');
css.textContent='.nfcadm{display:grid;gap:16px}.nfcadm .panel{border:1px solid #e8e2ee;background:#fff;border-radius:14px;padding:18px}.nfcadm h2{margin:0 0 12px;font-size:17px}.nfcadm p{color:#847988;font-size:12px;line-height:1.6}.nfcadm .field{display:grid;gap:8px;max-width:530px}.nfcadm input{padding:12px;border-radius:10px;border:1px solid #dfd5e8;font:inherit;font-size:13px;min-width:0}.nfcadm button{border:0;background:#7b3dff;color:#fff;padding:11px 14px;border-radius:10px;font-size:12px;font-weight:750;cursor:pointer}.nfcadm button[disabled]{opacity:.5;cursor:default}.nfcadm .secondary{background:#f3eef9;color:#6442a9}.nfcadm .results{border:1px solid #ece5f3;border-radius:11px;max-height:240px;overflow:auto}.nfcadm .results[hidden],.nfcadm .selected[hidden],.nfcadm .output[hidden]{display:none!important}.nfcadm .results button{display:block;border:0;border-bottom:1px solid #f0eaf5;background:white;color:#342c3d;width:100%;border-radius:0;text-align:left}.nfcadm .results small{display:block;color:#887b91;margin-top:4px}.nfcadm .row{display:flex;flex-wrap:wrap;gap:9px;align-items:center}.nfcadm .selected,.nfcadm .message{font-size:12px;color:#7150bb}.nfcadm .url{overflow-wrap:anywhere;color:#724cbb;font-size:12px;user-select:all}.nfcadm .tag{padding:11px 0;border-bottom:1px solid #eee6f3;display:flex;justify-content:space-between;align-items:center;gap:10px}.nfcadm .tag small{display:block;color:#847e89;margin-top:4px}.nfcadm .qrPreview{display:inline-block;padding:10px;border:1px solid #ece5f3;border-radius:10px;margin:10px 0}@media(max-width:550px){.nfcadm .panel{padding:14px}.nfcadm .tag{align-items:flex-start}}';
document.head.append(css);
const endpoint='/functions/v1/shop-visit-nfc-pilot';
let qrPromise;
function qrLib(){if(window.QRCode)return Promise.resolve(window.QRCode);if(qrPromise)return qrPromise;return qrPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';s.onload=()=>window.QRCode?resolve(window.QRCode):reject(Error('QR 표시 기능을 불러오지 못했어요.'));s.onerror=()=>reject(Error('QR 라이브러리 오류'));document.head.append(s)})}
window.loadAdminNfcVisit=async()=>{
 const feed=document.getElementById('feed');if(!feed)return;
 feed.innerHTML='<section class="nfcadm"><div class="panel"><h2>NFC 매장 방문인증 · NTAG213 파일럿</h2><p>기존 QR 발급 관리와 분리된 NFC 테스트 기능입니다. 발급 URL을 NTAG213에 NDEF 웹사이트 주소로 기록하세요. NFC 성공은 기존 MY 미션·코인에 반영되지 않습니다.</p><div class="field"><input id="nfcSearch" type="search" placeholder="카드샵명 · 지역 · 주소 검색" autocomplete="off" maxlength="80"><div class="results" id="nfcResults" hidden></div><div class="selected" id="nfcSelected" hidden></div><input id="nfcLabel" maxlength="50" placeholder="태그 이름 (선택, 예: 계산대)"><div class="row"><button type="button" id="nfcCreate" disabled>NFC URL 발급</button></div></div><div class="output" id="nfcOutput" hidden><h2 style="margin-top:20px">신규 NFC 태그 URL · 최초 표시</h2><div id="nfcQR" class="qrPreview"></div><p id="nfcURL" class="url"></p><div class="row"><button class="secondary" type="button" id="nfcCopy">URL 복사</button><button class="secondary" type="button" id="nfcDownload" disabled hidden>QR 다운로드</button></div><p>이 URL을 NFC Tools 앱의 URL/URI 쓰기 기능으로 NTAG213에 기록하세요. 테스트 중에는 태그를 영구 읽기 전용으로 잠그지 마세요.</p></div><p class="message" id="nfcMessage" role="status"></p><button type="button" id="nfcRelogin" class="secondary" hidden>Google 관리자 다시 로그인</button></div><div class="panel"><h2>NFC 태그 발급 이력</h2><div id="nfcList">불러오는 중…</div></div></section>';
 const $=id=>feed.querySelector('#'+id),input=$('nfcSearch'),results=$('nfcResults'),selected=$('nfcSelected'),create=$('nfcCreate'),note=$('nfcMessage');
 let selectedShop=null,requestSeq=0,delay=0,currentURL='';
 const say=s=>note.textContent=s;
 function choose(shop){selectedShop=shop;selected.hidden=!shop;selected.textContent=shop?'선택: '+shop.name+' · '+shop.id:'';create.disabled=!shop}
 function resultsText(t){results.replaceChildren();const el=document.createElement('p');el.style.padding='0 12px';el.textContent=t;results.append(el);results.hidden=false}
 const relogin=$('nfcRelogin');
 const authExpired=e=>/401|JWT|login_required|관리자 세션|세션 갱신|refresh.?token|invalid.?token/i.test(String(e?.message||e));
 relogin.onclick=async()=>{relogin.disabled=true;try{const auth=window.FUNY_WEB_AUTH;await auth.init();auth.rememberReturn('/admin.html?tab=nfcvisit');const {error}=await auth.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/login.html',queryParams:{prompt:'select_account'}}});if(error)throw error}catch(e){say('로그인 연결 실패: '+e.message);relogin.disabled=false}};
 async function apiCall(action,body={}){
  try{
   if(token&&refreshToken){
    let exp=0;try{exp=Number(JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp||0)}catch(_){}
    if(exp&&exp*1000<Date.now()+45000)await refreshSession();
   }
   const out=await api(endpoint,{method:'POST',body:JSON.stringify({action,...body})});
   if(!out?.ok)throw Error(out?.error||'요청 실패');
   return out;
  }catch(e){if(authExpired(e)){relogin.hidden=false;throw Error('관리자 세션이 만료됐어요. 다시 로그인해 주세요.')}throw e}
 }
 async function search(q){
  const seq=++requestSeq;const term=q.replace(/[(),.*%_]/g,' ').trim();
  if(term.length<2){results.hidden=true;return}
  resultsText('검색 중…');
  try{
   const like='*'+term+'*';
   const filter='(name.ilike.'+like+',city.ilike.'+like+',area.ilike.'+like+',address.ilike.'+like+')';
   const shops=await api('/rest/v1/shops?select=id,name,city,area,address&country_code=eq.KR&is_active=eq.true&or='+encodeURIComponent(filter)+'&order=name.asc&limit=20');
   if(seq!==requestSeq)return;
   results.replaceChildren();if(!shops?.length){resultsText('검색 결과가 없어요.');return}
   for(const shop of shops){
    const b=document.createElement('button');b.type='button';
    const name=document.createElement('strong');name.textContent=shop.name;
    const meta=document.createElement('small');meta.textContent=[shop.city,shop.area,shop.address,shop.id].filter(Boolean).join(' · ');
    b.append(name,meta);b.onclick=()=>{choose(shop);input.value=shop.name;results.hidden=true;requestSeq++};results.append(b);
   }
   results.hidden=false;
  }catch(e){if(seq===requestSeq)resultsText('검색 실패: '+e.message)}
 }
 input.oninput=()=>{choose(null);requestSeq++;clearTimeout(delay);delay=setTimeout(()=>search(input.value),280)};
 input.onkeydown=e=>{if(e.key==='Escape')results.hidden=true};
 async function list(){
  try{const r=await apiCall('admin_list'),box=$('nfcList');box.replaceChildren();if(!r.tags?.length){box.textContent='발급된 NFC 태그가 없습니다.';return}
   for(const t of r.tags){
    const item=document.createElement('div');item.className='tag';
    const title=document.createElement('div');const strong=document.createElement('strong');strong.textContent=t.shop_id+(t.label?' · '+t.label:'');
    const sub=document.createElement('small');sub.textContent=(t.status==='active'?'활성':t.status==='revoked'?'폐기':'중지')+' · '+new Date(t.created_at).toLocaleString('ko-KR');
    title.append(strong,sub);item.append(title);
    if(t.status==='active'){const b=document.createElement('button');b.className='secondary';b.textContent='사용 정지';b.onclick=async()=>{if(!confirm('이 NFC 태그를 폐기할까요? 이후 URL이 무효화됩니다.'))return;b.disabled=true;try{await apiCall('admin_disable',{tag_id:t.id});say('NFC 태그 사용을 정지했어요.');await list()}catch(e){say(e.message)}finally{b.disabled=false}};item.append(b)}
    box.append(item);
   }
  }catch(e){$('nfcList').textContent='태그 목록을 불러오지 못했어요: '+e.message}
 }
 create.onclick=async()=>{
  if(!selectedShop){say('카드샵을 선택해 주세요.');return}
  create.disabled=true;say('NFC URL을 발급 중입니다.');
  try{
   const r=await apiCall('admin_create',{shop_id:selectedShop.id,label:$('nfcLabel').value});
   currentURL=r.url;$('nfcOutput').hidden=false;$('nfcURL').textContent=currentURL;
   const qr=$('nfcQR');qr.replaceChildren();
   try{const QR=await qrLib();new QR(qr,{text:currentURL,width:200,height:200,correctLevel:QR.CorrectLevel.M})}catch(e){qr.textContent='QR 이미지 표시 실패 (URL 복사 가능)'}
   say('NFC URL 발급 완료 · 태그에 URL을 기록해 주세요.');await list();
  }catch(e){say('NFC 발급 실패: '+e.message)}finally{create.disabled=!selectedShop}
 };
 $('nfcCopy').onclick=async()=>{try{await navigator.clipboard.writeText(currentURL);say('URL을 복사했어요.')}catch(e){say('복사 실패 · URL을 직접 복사해 주세요.')}};
 await list();
};
})();