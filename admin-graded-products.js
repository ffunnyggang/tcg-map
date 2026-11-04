(()=>{'use strict';
const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq',$=id=>document.getElementById(id),A=window.FUNY_WEB_AUTH;
let token='',shops=[],timer;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,6000)}
async function call(action,data={}){const r=await fetch(BASE+'/functions/v1/graded-shop-admin',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...data})}),d=await r.json().catch(()=>({}));if(!r.ok){const e=Error(d.error||'요청을 처리하지 못했습니다.');e.status=r.status;throw e}return d}
function mountShop(shop){
 const root=$('shopWorkspaceTemplate').content.firstElementChild.cloneNode(true);
 const names=new Map();
 root.querySelectorAll('[id]').forEach(n=>{const name=n.id;names.set(name,shop.id+'-'+name);n.dataset.field=name;n.id=shop.id+'-'+name});
 root.querySelectorAll('label[for]').forEach(n=>{const id=names.get(n.htmlFor);if(id)n.htmlFor=id});
 root.setAttribute('aria-label',shop.name+' 등급카드 등록');
 $('shopWorkspaces').append(root);
 initShop(root,shop);
}
function initShop(root,shop){
 const $=name=>root.querySelector('[data-field="'+name+'"]');
 let draft=null,busy=false,confirmed=false,shopVersion=0;
function reset(){draft=null;confirmed=false;$('preview').hidden=true;$('pricePanel').hidden=true;$('success').hidden=true;$('salePrice').value='';$('priceHint').textContent='';$('step2').classList.remove('on');$('step3').classList.remove('on');$('confirmCard').disabled=false;sync()}
function sync(){document.getElementById('adminShopSelect').disabled=busy;$('certNumber').disabled=busy;$('lookupBtn').disabled=busy;$('publishBtn').disabled=busy||!draft||!confirmed;$('confirmCard').disabled=busy;$('nextCard').disabled=busy}
function selected(){return shop}
async function refreshList(){const version=shopVersion,shop=selected();if(!shop)return;$('productsList').textContent='상품을 불러오는 중입니다.';try{const d=await call('list',{shop_id:shop.id});if(version!==shopVersion)return;const rows=d.rows||[];$('productsList').replaceChildren(...rows.map(p=>{const item=el('div','registered-item'),a=el('a','registered-title',[p.issue_year,p.set_name,p.card_number?'#'+p.card_number:'',p.card_name].filter(Boolean).join(' ')),copy=el('div','registered-copy');if(p.image_urls?.[0]){try{const u=new URL(p.image_urls[0]);if(u.protocol==='https:'){const im=el('img','registered-thumb');im.src=u.href;im.alt='';im.loading='lazy';im.referrerPolicy='no-referrer';item.append(im)}}catch(_){}}a.href='/graded-card-detail.html?id='+encodeURIComponent(p.id);a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='page';copy.append(a,el('div','',p.price_krw==null?'가격 미정':Number(p.price_krw).toLocaleString('ko-KR')+'원'),el('small','','PSA '+p.cert_number+(p.is_sample?' · 샘플':'')+' · '+({active:'판매 중',sold:'판매 완료',hidden:'비노출',draft:'임시 저장'}[p.status]||p.status)));item.append(copy);return item}));if(!rows.length)$('productsList').textContent='아직 등록한 상품이 없습니다.'}catch(e){if(version===shopVersion)$('productsList').textContent=e.message}}
function changeShop(){shopVersion++;reset();$('certNumber').value='';$('lookupStatus').textContent='';const s=selected();const typeLabel=root.querySelector('.eyebrow');if(typeLabel)typeLabel.textContent=s?.kind==='online'?'판매 온라인샵':'판매 카드샵';$('shopName').textContent=s?.name||'';$('shopAddress').textContent=s?.address||'';if(s)void refreshList()}
function showPreview(d){draft=d;const c=d.card;$('photos').replaceChildren(...c.image_urls.map((url,i)=>{const figure=el('figure'),im=el('img');im.src=url;im.alt=i?'카드슬랩 뒷면':'카드슬랩 앞면';im.referrerPolicy='no-referrer';im.onerror=()=>{im.replaceWith(el('p','muted','이미지를 불러오지 못했습니다. 번호를 다시 조회해주세요.'));draft=null;confirmed=false;sync()};figure.append(im,el('figcaption','',i?'뒷면':'앞면'));return figure}));$('cardChips').replaceChildren(el('span','',c.tcg_type==='pokemon'?'포켓몬':'원피스'),el('span','','PSA '+c.grade));$('cardTitle').textContent=[c.issue_year,c.set_name,'#'+c.card_number,c.card_name].join(' ');$('cardMeta').replaceChildren();for(const [label,value]of [['PSA 번호',c.cert_number],['카드명',c.card_name],['세트',c.set_name],['발행년도',c.issue_year],['카드번호',c.card_number]])$('cardMeta').append(el('dt','',label),el('dd','',value));$('preview').hidden=false;$('step2').classList.add('on');$('lookupStatus').textContent='카드정보를 확인해주세요.';$('preview').scrollIntoView({behavior:'smooth',block:'start'})}
$('lookupForm').onsubmit=async e=>{e.preventDefault();if(busy||!selected())return;reset();busy=true;sync();$('lookupStatus').textContent='카드정보를 조회 중입니다. 처음 조회하는 번호는 시간이 걸릴 수 있습니다.';try{const d=await call('lookup',{shop_id:selected().id,cert_number:$('certNumber').value});showPreview(d)}catch(e){$('lookupStatus').textContent=e.message}finally{busy=false;sync()}};
$('certNumber').addEventListener('input',()=>{reset();$('lookupStatus').textContent=''});
$('confirmCard').onclick=()=>{if(!draft)return;confirmed=true;$('pricePanel').hidden=false;$('step3').classList.add('on');$('salePrice').focus();sync()};
$('salePrice').oninput=()=>{const raw=$('salePrice').value.replace(/,/g,'');$('priceHint').textContent=/^\d+$/.test(raw)?Number(raw).toLocaleString('ko-KR')+'원':''};
$('registerForm').onsubmit=async e=>{e.preventDefault();if(busy||!draft||!confirmed)return;const raw=$('salePrice').value.trim().replace(/,/g,'');if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<1||Number(raw)>9999999999){toast('판매가격을 원 단위 정수로 입력해주세요.');return}busy=true;sync();$('publishBtn').textContent='등록 중…';try{const d=await call('register',{draft_id:draft.draft_id,price_krw:Number(raw)});draft=null;confirmed=false;$('pricePanel').hidden=true;$('preview').hidden=true;$('success').hidden=false;$('detailLink').href='/graded-card-detail.html?id='+encodeURIComponent(d.product_id);$('success').scrollIntoView({behavior:'smooth',block:'start'});void refreshList()}catch(e){toast(e.message)}finally{busy=false;$('publishBtn').textContent='상품 등록';sync()}};
$('nextCard').onclick=()=>{reset();$('certNumber').value='';$('lookupStatus').textContent='';$('certNumber').focus()};
$('refreshList').onclick=refreshList;
changeShop();
}
$('loginBtn').onclick=()=>A.goLogin('/admin-graded-products.html');
async function boot(){
 await A.init();
 const candidates=[sessionStorage.getItem('funypin_admin_token'),A.session?.access_token].filter(Boolean);
 if(!candidates.length){$('authText').textContent='퍼니핀 계정으로 로그인해주세요.';$('loginBtn').hidden=false;$('adminLogin').hidden=false;return}
 let data,lastError;
 for(const value of [...new Set(candidates)]){token=value;try{data=await call('bootstrap');break}catch(e){lastError=e;if(e.status!==401)throw e}}
 if(!data)throw lastError;
 shops=data.shops||[];
 $('authNotice').hidden=true;$('app').hidden=false;$('noAccess').hidden=shops.length>0;
 $('permissionLink').hidden=!data.is_admin;
 if(data.is_admin&&shops.length){
  $('adminShopPicker').hidden=shops.length<=1;
  for(const shop of shops)$('adminShopSelect').add(new Option(shop.name+(shop.kind==='online'?' · 온라인샵':''),shop.id));
  const requested=new URLSearchParams(location.search).get('shop');if(shops.some(s=>s.id===requested))$('adminShopSelect').value=requested;
  const render=()=>{$('shopWorkspaces').replaceChildren();const shop=shops.find(s=>s.id===$('adminShopSelect').value);if(shop)mountShop(shop)};
  $('adminShopSelect').onchange=render;render();
 }else{for(const shop of shops)mountShop(shop)}
}
boot().catch(e=>{$('authText').textContent=e.message;$('loginBtn').hidden=false;$('adminLogin').hidden=false});
})();
