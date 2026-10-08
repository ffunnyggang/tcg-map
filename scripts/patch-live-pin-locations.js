const fs = require('fs');

const file = 'live-pin-test.html';
let source = fs.readFileSync(file, 'utf8');

if (source.includes('data-live-location-source="db-v1"')) {
  console.log('LIVE PIN database location selector is already installed.');
  process.exit(0);
}

function replaceOnce(needle, replacement, label) {
  const before = source;
  source = source.replace(needle, replacement);
  if (source === before) throw new Error(`Patch anchor not found: ${label}`);
}

replaceOnce(
  /<label class="label">카드샵<\/label><select class="select" id="shop">[\s\S]*?<\/select><label class="label" id="typeLabel">/,
  '<label class="label">구분</label><select class="select" id="locationType" data-live-location-source="db-v1"><option value="shop">카드샵</option><option value="vending">자판기</option></select><label class="label" id="locationLabel">카드샵</label><select class="select" id="shop" disabled><option value="">카드샵을 불러오는 중...</option></select><label class="label" id="typeLabel">',
  'static shop options'
);

source = source
  .replace('id="shopFilterTitle">매장 선택', 'id="shopFilterTitle">위치 선택')
  .replace('id="shopFilterLabel">전체 매장', 'id="shopFilterLabel">전체 위치')
  .replaceAll('현재 카드샵 현황을 가장 먼저 공유해보세요.', '현재 카드샵·자판기 현황을 가장 먼저 공유해보세요.')
  .replace('같은 매장 반복 제보 제한', '같은 위치 반복 제보 제한');

replaceOnce(
  "const bg=document.getElementById('bg'),feed=document.querySelector('.feed'),shop=document.getElementById('shop'),memo=document.getElementById('memo');",
  "const bg=document.getElementById('bg'),feed=document.querySelector('.feed'),shop=document.getElementById('shop'),locationType=document.getElementById('locationType'),locationLabel=document.getElementById('locationLabel'),memo=document.getElementById('memo');",
  'location element constants'
);

const locationLoader = `
const locationCache={shop:null,vending:null};
const locationSortName=v=>String(v?.name||'').replace(/^\\[[^\\]]+\\]\\s*/,'').trim();
const sortLocations=(a,b)=>locationSortName(a).localeCompare(locationSortName(b),'ko-KR',{numeric:true,sensitivity:'base'});
const vendingRegion=address=>{const p=String(address||'').trim().split(/\\s+/).filter(Boolean);if(!p.length)return '';const a=p[0].replace(/특별자치도|특별자치시|특별시|광역시/g,''),b=(p[1]||'').replace(/[시군구]$/,'');return [a,b].filter(Boolean).join(' ')};
async function fetchLocationRows(kind){
 const q=new URLSearchParams();
 let endpoint='shops';
 if(kind==='vending'){
  endpoint='v_public_pokemon_card_vending_machines';q.set('select','id,name,address,operator');q.set('is_active','eq.true');q.set('status','eq.active');
 }else{
  q.set('select','id,name,area,city');q.set('country_code','eq.KR');q.set('is_active','eq.true');q.set('status','eq.운영');
 }
 const r=await fetch(URL+'/rest/v1/'+endpoint+'?'+q.toString(),{headers:directHeaders,cache:'no-store'});
 if(!r.ok){let msg='HTTP '+r.status;try{const e=await r.json();msg=e.message||e.details||msg}catch(_){}throw new Error(msg)}
 const rows=await r.json();return (Array.isArray(rows)?rows:[]).filter(x=>x?.id&&x?.name);
}
async function loadLocationOptions(kind=locationType?.value||'shop',force=true,selectedId=''){
 if(!locationType||!locationLabel||!shop)return;
 kind=kind==='vending'?'vending':'shop';locationType.value=kind;locationLabel.textContent=kind==='vending'?'포켓몬카드 자판기':'카드샵';
 const previous=selectedId||shop.value;shop.disabled=true;shop.innerHTML='<option value="">'+(kind==='vending'?'자판기':'카드샵')+'를 불러오는 중...</option>';
 let rows;
 try{rows=!force&&locationCache[kind]?locationCache[kind]:await fetchLocationRows(kind);locationCache[kind]=rows}
 catch(e){if(locationCache[kind])rows=locationCache[kind];else{shop.innerHTML='<option value="">목록을 불러오지 못했어요. 다시 열어주세요.</option>';shop.disabled=false;throw e}}
 rows=[...new Map(rows.map(x=>[String(x.id),x])).values()].sort(sortLocations);
 shop.innerHTML='';const placeholder=new Option((kind==='vending'?'자판기':'카드샵')+'를 선택해주세요 ('+rows.length+'개)','');shop.add(placeholder);
 rows.forEach(row=>{const region=kind==='vending'?vendingRegion(row.address):(row.area||row.city||'');const option=new Option(row.name+(region?' · '+region:''),row.id);option.dataset.name=row.name;option.dataset.kind=kind;shop.add(option)});
 if(kind==='shop'){const other=new Option('기타 · 등록되지 않은 카드샵','KR-OTHER');other.dataset.name='기타 · 등록되지 않은 카드샵';other.dataset.kind='shop';shop.add(other)}
 if(previous&&[...shop.options].some(o=>o.value===previous))shop.value=previous;shop.disabled=false;
}
locationType?.addEventListener('change',()=>loadLocationOptions(locationType.value,true,'').catch(e=>console.warn('[LIVE PIN] location load failed',e)));
`;

replaceOnce(
  "let mode='report',filter='전체',shopFilter='';",
  "let mode='report',filter='전체',shopFilter='';" + locationLoader,
  'location loader insertion'
);

replaceOnce(
  "q.set('shop_id','like.KR-*');",
  "q.set('or','(shop_id.like.KR-*,shop_id.like.PKVM-*)');",
  'LIVE PIN shop/vending query filter'
);

replaceOnce(
  "card.dataset.id=r.id;card.dataset.shop=r.shop_name||'';",
  "card.dataset.id=r.id;card.dataset.shop=r.shop_name||'';card.dataset.shopId=r.shop_id||'';",
  'card location id dataset'
);

source = source
  .replaceAll("shopFilter||'전체 매장'", "shopFilter||'전체 위치'")
  .replaceAll("n||'전체 매장'", "n||'전체 위치'");

replaceOnce(
  "document.querySelectorAll('.request-action:not(.view-answer)').forEach(b=>b.onclick=()=>{const card=b.closest('.card');linkedRequestId=+card.dataset.id;const req=card.dataset;const row=[...document.querySelectorAll('.card')].find(x=>x.dataset.id===card.dataset.id);const shopName=row?.querySelector('.shop')?.textContent||'';const option=[...shop.options].find(o=>o.textContent===shopName);if(option)shop.value=option.value;mode='report';",
  "document.querySelectorAll('.request-action:not(.view-answer)').forEach(b=>b.onclick=async()=>{const card=b.closest('.card');linkedRequestId=+card.dataset.id;const selectedLocationId=card.dataset.shopId||'';const locationKind=String(selectedLocationId).startsWith('PKVM-')?'vending':'shop';locationType.value=locationKind;mode='report';",
  'request answer location selection'
);

replaceOnce(
  "bg.classList.add('open');lockPage()});document.querySelectorAll('.view-answer')",
  "bg.classList.add('open');lockPage();await loadLocationOptions(locationKind,true,selectedLocationId)});document.querySelectorAll('.view-answer')",
  'request answer location load'
);

replaceOnce(
  "document.getElementById('open').onclick=()=>{",
  "document.getElementById('open').onclick=async()=>{",
  'open LIVE PIN editor async'
);

replaceOnce(
  "bg.classList.add('open');lockPage()};const liveFab=",
  "bg.classList.add('open');lockPage();await loadLocationOptions(locationType.value||'shop',true).catch(e=>console.warn('[LIVE PIN] location load failed',e))};const liveFab=",
  'refresh locations when opening editor'
);

replaceOnce(
  "document.getElementById('submitBtn').onclick=async()=>{if(!shop.value){alert('카드샵을 선택해주세요.');return}",
  "document.getElementById('submitBtn').onclick=async()=>{if(!shop.value){alert('카드샵 또는 자판기를 선택해주세요.');return}",
  'submit validation message'
);

replaceOnce(
  "shop_name:shop.options[shop.selectedIndex].text,",
  "shop_name:shop.options[shop.selectedIndex]?.dataset.name||shop.options[shop.selectedIndex].text,",
  'store actual DB location name'
);

if (!source.includes('v_public_pokemon_card_vending_machines') || !source.includes("country_code','eq.KR") || !source.includes('shop_id.like.PKVM-*')) {
  throw new Error('LIVE PIN database location patch validation failed');
}
if (source.includes('<option value="KR-SEO-010">')) throw new Error('Hardcoded LIVE PIN shop options remain');

const inlineScripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((code) => code.trim());
inlineScripts.forEach((code) => new Function(code));

fs.writeFileSync(file, source, 'utf8');
console.log('LIVE PIN now loads Korean card shops and vending machines from Supabase.');
