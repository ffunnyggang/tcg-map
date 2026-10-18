(()=>{
'use strict';
const providerNames={daangn:'당근',bunjang:'번개장터',break:'BREAK'};
const listingStatusNames={active:'노출중',reserved:'예약중',sold:'판매완료',hidden:'비노출',expired:'만료',deleted:'판매자 삭제'};
const sourceStatusNames={unknown:'미확인',active:'판매중',sold:'판매완료',deleted:'삭제됨',unavailable:'접근불가'};
const reportTypeNames={rights:'권리침해',fraud:'사기 의심',prohibited:'부적절한 매물',sold_or_unavailable:'판매완료·접근불가',other:'기타'};
const reportStatusNames={received:'접수',reviewing:'조사중',hidden:'비노출',resolved:'처리완료',dismissed:'문제없음'};
let marketAdminListings=[],marketAdminReports=[];

function e(v){return typeof esc==='function'?esc(v):String(v??'')}
function money(v){return v==null?'가격 없음':Number(v).toLocaleString('ko-KR')+'원'}
function dt(v){return v?new Date(v).toLocaleString('ko-KR'):'-'}
function feed(){return document.getElementById('feed')}
function ensureStyle(){
 if(document.getElementById('adminMarketStyle'))return;
 const s=document.createElement('style');s.id='adminMarketStyle';s.textContent=`
 .market-admin-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
 .market-admin-toolbar .input,.market-admin-toolbar .select{height:38px;min-width:150px}
 .market-admin-list{display:grid;gap:10px}
 .market-admin-card{border:1px solid #e9e5ec;border-radius:14px;background:#fff;padding:14px}
 .market-admin-head{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
 .market-admin-badge{display:inline-flex;align-items:center;height:23px;padding:0 8px;border-radius:999px;background:#f3effc;color:#6749bd;font-size:10px;font-weight:850}
 .market-admin-badge.hidden{background:#fff0f2;color:#b85e6a}
 .market-admin-badge.done{background:#edf8f0;color:#4d8c60}
 .market-admin-time{margin-left:auto;color:#aaa3af;font-size:10px}
 .market-admin-title{margin-top:9px;font-size:15px;font-weight:850;color:#302a34}
 .market-admin-price{margin-top:3px;font-size:14px;font-weight:900;color:#302a34}
 .market-admin-meta{margin-top:7px;color:#817a86;font-size:10px;line-height:1.55}
 .market-admin-note{margin-top:9px;padding:9px 10px;border-radius:10px;background:#faf8fb;color:#77707b;font-size:10px;line-height:1.5}
 .market-admin-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
 .market-admin-actions button,.market-admin-actions a{min-height:34px;padding:0 11px;border:1px solid #e4dfe8;border-radius:10px;background:#fff;color:#625b67;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800}
 .market-admin-actions button.danger{border-color:#efd7dc;background:#fffafb;color:#b85e6a}
 .market-admin-actions button.primary{border-color:#d9cef0;background:#f5f1fc;color:#6749bd}
 .market-admin-actions button:disabled{opacity:.45}
 .market-report-reason{margin-top:9px;white-space:pre-wrap;color:#59525e;font-size:11px;line-height:1.6}
 .market-access-box{margin:0 0 14px;padding:14px;border:1px solid #e6e0eb;border-radius:14px;background:#fbf9fd}
 .market-access-box h3{margin:0 0 8px;font-size:13px;color:#342e39}
 .market-access-add{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
 .market-access-add .input{min-width:250px;flex:1}
 .market-access-list{display:grid;gap:7px;margin-top:10px}
 .market-access-row{display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:10px;background:#fff;border:1px solid #eee9f1;font-size:10px}
 .market-access-row .copy{min-width:0;flex:1}
 .market-access-row .copy b{display:block;font-size:11px;color:#3c3541;overflow:hidden;text-overflow:ellipsis}
 .market-access-row .copy span{display:block;margin-top:2px;color:#8d8591}
 .market-access-row button{height:30px;padding:0 10px;border:1px solid #e2dce6;border-radius:9px;background:#fff;font-size:10px;font-weight:800}
 .market-access-row button.on{background:#f0f8f2;color:#47815a;border-color:#d4e9da}
 @media(max-width:699px){.market-admin-toolbar>*{width:100%;min-width:0!important}.market-admin-time{width:100%;margin-left:0}}
 `;document.head.appendChild(s);
}
async function adminAction(body){
 return api('/functions/v1/market-admin-action-test',{method:'POST',body:JSON.stringify(body)});
}
function currentReportCount(id){
 return marketAdminReports.filter(r=>r.listing_id===id&&['received','reviewing'].includes(r.status)).length;
}
async function renderMarketSellerAccess(){
 const f=feed();if(!f)return;
 document.getElementById('marketSellerAccessBox')?.remove();
 let data={rows:[]},loadError='';
 try{data=await adminAction({action:'list_seller_access'})}catch(err){loadError=err?.message||String(err);console.warn('[MARKET ADMIN] seller access load failed',err)}
 const rows=Array.isArray(data?.rows)?data.rows:[];
 const box=document.createElement('section');box.id='marketSellerAccessBox';box.className='market-access-box';
 box.innerHTML=`<h3>매물 등록 허용 계정</h3>
  <div class="market-access-add">
   <input id="marketAccessEmail" class="input" type="email" placeholder="FUNY PIN 회원 이메일">
   <button id="marketAccessAdd" class="shop-edit" type="button">등록 허용</button>
  </div>
  <div class="market-access-list">${loadError?'<div class="empty error">허용 계정 조회 실패: '+e(loadError)+'</div>':rows.length?rows.map(r=>`<div class="market-access-row">
   <div class="copy"><b>${e(r.email||r.nickname||r.user_id)}</b><span>${e(r.nickname||'닉네임 없음')} · ${r.is_active?'등록 허용':'등록 중지'}</span></div>
   <button class="${r.is_active?'on':''}" data-market-access-user="${e(r.user_id)}" data-active="${r.is_active?'1':'0'}">${r.is_active?'허용 중':'중지됨'}</button>
  </div>`).join(''):'<div class="empty">등록 허용 계정이 없습니다.</div>'}</div>`;
 const toolbar=f.querySelector('.market-admin-toolbar');if(toolbar)toolbar.before(box);else f.prepend(box);
 document.getElementById('marketAccessAdd')?.addEventListener('click',async()=>{
  const input=document.getElementById('marketAccessEmail'),email=input?.value?.trim();if(!email){alert('허용할 FUNY PIN 회원 이메일을 입력해주세요.');return}
  const btn=document.getElementById('marketAccessAdd');btn.disabled=true;
  try{const d=await adminAction({action:'set_seller_access',email,is_active:true,note:'Admin approved'});if(!d?.ok)throw new Error(d?.error||'등록 허용 처리에 실패했습니다.');await renderMarketSellerAccess()}
  catch(err){alert('등록 허용 실패: '+err.message);btn.disabled=false}
 });
 box.querySelectorAll('[data-market-access-user]').forEach(b=>b.addEventListener('click',async()=>{
  const next=b.dataset.active!=='1';
  if(!confirm(next?'이 계정의 매물 등록을 허용할까요?':'이 계정의 신규 매물 등록을 중지할까요?\n기존 노출 매물은 유지됩니다.'))return;
  b.disabled=true;
  try{const d=await adminAction({action:'set_seller_access',user_id:b.dataset.marketAccessUser,is_active:next,note:next?'Admin approved':'Admin registration disabled'});if(!d?.ok)throw new Error(d?.error||'처리에 실패했습니다.');await renderMarketSellerAccess()}
  catch(err){alert('등록 권한 변경 실패: '+err.message);b.disabled=false}
 }));
}
function renderMarketListings(){
 const f=feed(),q=(document.getElementById('marketAdminSearch')?.value||'').trim().toLowerCase(),provider=document.getElementById('marketAdminProvider')?.value||'',status=document.getElementById('marketAdminStatus')?.value||'';
 const rows=marketAdminListings.filter(x=>(!provider||x.provider===provider)&&(!status||x.listing_status===status)&&(!q||[x.title,x.seller_nickname,x.location_name,providerNames[x.provider]].filter(Boolean).join(' ').toLowerCase().includes(q)));
 const list=document.getElementById('marketAdminList');if(!list)return;
 list.innerHTML=rows.length?rows.map(x=>{
  const reports=currentReportCount(x.id),hidden=x.listing_status==='hidden';
  return '<article class="market-admin-card"><div class="market-admin-head"><span class="market-admin-badge">'+e(providerNames[x.provider]||x.provider)+'</span><span class="market-admin-badge '+(hidden?'hidden':'')+'">'+e(listingStatusNames[x.listing_status]||x.listing_status)+'</span><span class="market-admin-badge">'+e(sourceStatusNames[x.source_status]||x.source_status)+'</span>'+(reports?'<span class="market-admin-badge hidden">미처리 신고 '+reports+'</span>':'')+'<span class="market-admin-time">'+e(dt(x.created_at))+'</span></div><div class="market-admin-title">'+e(x.title)+'</div><div class="market-admin-price">'+money(x.price)+'</div><div class="market-admin-meta">판매자 · '+e(x.seller_nickname||'-')+'<br>거래 희망 위치 · '+e(x.location_name||'-')+'<br>원본 확인 · '+e(dt(x.source_last_checked_at))+' · 새로고침 '+Number(x.source_refresh_count||0)+'회'+(x.hidden_reason?'<br>비노출 사유 · '+e(x.hidden_reason):'')+'</div><div class="market-admin-actions"><a href="'+e(x.external_url)+'" target="_blank" rel="noopener">원본 열기</a>'+(hidden?'<button class="primary" data-market-show="'+e(x.id)+'">다시 노출</button>':'<button class="danger" data-market-hide="'+e(x.id)+'">즉시 비노출</button>')+'</div></article>';
 }).join(''):'<div class="empty">조건에 맞는 MARKET 매물이 없습니다.</div>';
 list.querySelectorAll('[data-market-hide]').forEach(b=>b.onclick=()=>setMarketListingVisibility(b.dataset.marketHide,false,b));
 list.querySelectorAll('[data-market-show]').forEach(b=>b.onclick=()=>setMarketListingVisibility(b.dataset.marketShow,true,b));
}
async function setMarketListingVisibility(id,show,button){
 if(!show&&!confirm('이 매물을 FUNY PIN에서 즉시 비노출할까요?\n원본 외부 매물은 변경되지 않습니다.'))return;
 if(show&&!confirm('이 매물을 다시 노출할까요?'))return;
 button.disabled=true;
 try{
  const payload=show?{action:'show_listing',listing_id:id}:{action:'hide_listing',listing_id:id,reason:'admin_manual'};
  const d=await adminAction(payload);if(!d?.ok)throw new Error(d?.error||'처리에 실패했습니다.');
  await window.loadAdminMarketListings();
 }catch(err){alert((show?'재노출':'비노출')+' 실패: '+err.message);button.disabled=false}
}
window.loadAdminMarketListings=async function(){
 ensureStyle();const f=feed();f.innerHTML='<div class="empty">MARKET 매물을 불러오는 중...</div>';
 try{
  const [listings,reports]=await Promise.all([
   api('/rest/v1/market_listings?select=id,seller_user_id,seller_nickname,provider,title,price,listing_status,source_status,source_last_checked_at,source_refresh_count,location_name,external_url,created_at,hidden_reason,hidden_at&order=created_at.desc&limit=300'),
   api('/rest/v1/market_listing_reports?select=id,listing_id,status&order=created_at.desc&limit=500')
  ]);
  marketAdminListings=listings||[];marketAdminReports=reports||[];
  const n=s=>marketAdminListings.filter(x=>x.listing_status===s).length,open=marketAdminReports.filter(x=>['received','reviewing'].includes(x.status)).length;
  f.innerHTML='<div class="shop-stats stats-grid"><div class="shop-stat"><b>'+marketAdminListings.length+'</b><span>전체 매물</span></div><div class="shop-stat"><b>'+n('active')+'</b><span>노출중</span></div><div class="shop-stat"><b>'+n('hidden')+'</b><span>비노출</span></div><div class="shop-stat"><b>'+open+'</b><span>미처리 신고</span></div></div><div class="market-admin-toolbar"><input id="marketAdminSearch" class="input" placeholder="상품명 · 판매자 · 위치 검색"><select id="marketAdminProvider" class="select"><option value="">전체 플랫폼</option><option value="daangn">당근</option><option value="bunjang">번개장터</option><option value="break">BREAK</option></select><select id="marketAdminStatus" class="select"><option value="">전체 상태</option><option value="active">노출중</option><option value="reserved">예약중</option><option value="sold">판매완료</option><option value="hidden">비노출</option><option value="expired">만료</option><option value="deleted">판매자 삭제</option></select></div><div id="marketAdminList" class="market-admin-list"></div>';
  ['marketAdminSearch','marketAdminProvider','marketAdminStatus'].forEach(id=>document.getElementById(id)?.addEventListener(id==='marketAdminSearch'?'input':'change',renderMarketListings));
  renderMarketListings();
  await renderMarketSellerAccess();
 }catch(err){f.innerHTML='<div class="empty error">MARKET 매물 조회 실패: '+e(err.message)+'</div>'}
};

function renderMarketReports(){
 const list=document.getElementById('marketReportAdminList');if(!list)return;
 const filter=document.getElementById('marketReportStatusFilter')?.value||'';
 const listingMap=Object.fromEntries(marketAdminListings.map(x=>[x.id,x]));
 const rows=marketAdminReports.filter(r=>!filter||r.status===filter);
 list.innerHTML=rows.length?rows.map(r=>{const l=listingMap[r.listing_id]||{};
  return '<article class="market-admin-card"><div class="market-admin-head"><span class="market-admin-badge hidden">'+e(reportTypeNames[r.report_type]||r.report_type)+'</span><span class="market-admin-badge '+(['resolved','dismissed'].includes(r.status)?'done':'')+'">'+e(reportStatusNames[r.status]||r.status)+'</span><span class="market-admin-time">'+e(dt(r.created_at))+'</span></div><div class="market-admin-title">'+e(l.title||'삭제/미확인 매물')+'</div><div class="market-admin-meta">'+e(providerNames[l.provider]||l.provider||'-')+' · 판매자 '+e(l.seller_nickname||'-')+'</div>'+(r.reason?'<div class="market-report-reason">'+e(r.reason)+'</div>':'')+(r.admin_note?'<div class="market-admin-note">처리 메모 · '+e(r.admin_note)+'</div>':'')+'<div class="market-admin-actions">'+(l.external_url?'<a href="'+e(l.external_url)+'" target="_blank" rel="noopener">원본 열기</a>':'')+'<button data-market-report="'+e(r.id)+'" data-status="reviewing">조사중</button><button class="danger" data-market-report="'+e(r.id)+'" data-status="hidden">즉시 비노출</button><button class="primary" data-market-report="'+e(r.id)+'" data-status="resolved">처리완료</button><button data-market-report="'+e(r.id)+'" data-status="dismissed">문제없음</button></div></article>';
 }).join(''):'<div class="empty">해당 상태의 신고가 없습니다.</div>';
 list.querySelectorAll('[data-market-report]').forEach(b=>b.onclick=()=>setMarketReportStatus(b.dataset.marketReport,b.dataset.status,b));
}
async function setMarketReportStatus(id,status,button){
 const labels={reviewing:'조사중',hidden:'즉시 비노출',resolved:'처리완료',dismissed:'문제없음'};
 if(status==='hidden'&&!confirm('신고 대상 매물을 즉시 비노출하고 신고 상태를 변경할까요?'))return;
 const note=prompt((labels[status]||status)+' 처리 메모 (선택)','');
 if(note===null)return;
 button.disabled=true;
 try{
  const d=await adminAction({action:'report_status',report_id:id,status,admin_note:note.trim()||null});
  if(!d?.ok)throw new Error(d?.error||'처리에 실패했습니다.');
  await window.loadAdminMarketReports();
 }catch(err){alert('신고 처리 실패: '+err.message);button.disabled=false}
}
window.loadAdminMarketReports=async function(){
 ensureStyle();const f=feed();f.innerHTML='<div class="empty">MARKET 신고를 불러오는 중...</div>';
 try{
  const [reports,listings]=await Promise.all([
   api('/rest/v1/market_listing_reports?select=id,listing_id,reporter_user_id,report_type,reason,status,processed_at,processed_by,admin_note,created_at&order=created_at.desc&limit=300'),
   api('/rest/v1/market_listings?select=id,title,provider,seller_nickname,external_url,listing_status&order=created_at.desc&limit=500')
  ]);
  marketAdminReports=reports||[];marketAdminListings=listings||[];
  const count=s=>marketAdminReports.filter(x=>x.status===s).length;
  f.innerHTML='<div class="shop-stats stats-grid"><div class="shop-stat"><b>'+marketAdminReports.length+'</b><span>전체 신고</span></div><div class="shop-stat"><b>'+count('received')+'</b><span>접수</span></div><div class="shop-stat"><b>'+count('reviewing')+'</b><span>조사중</span></div><div class="shop-stat"><b>'+count('hidden')+'</b><span>비노출 조치</span></div></div><div class="market-admin-toolbar"><select id="marketReportStatusFilter" class="select"><option value="">전체 상태</option><option value="received">접수</option><option value="reviewing">조사중</option><option value="hidden">비노출</option><option value="resolved">처리완료</option><option value="dismissed">문제없음</option></select></div><div id="marketReportAdminList" class="market-admin-list"></div>';
  document.getElementById('marketReportStatusFilter')?.addEventListener('change',renderMarketReports);renderMarketReports();
 }catch(err){f.innerHTML='<div class="empty error">MARKET 신고 조회 실패: '+e(err.message)+'</div>'}
};
})();