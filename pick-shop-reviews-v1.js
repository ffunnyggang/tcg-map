/* FUNY PIN PICK · shop reviews */
(function(){
'use strict';
if(!/(^|\/)pick\.html$/.test(location.pathname||''))return;
const SB='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const panel=document.querySelector('.info-panel[data-panel="shop-review"]');
if(!panel)return;
const style=document.createElement('style');style.id='pick-shop-review-style';style.textContent='.pick-shop-review-controls{display:flex;justify-content:flex-start;align-items:center;padding:10px 0 12px}.pick-shop-filter{position:relative;display:inline-flex;align-items:center;justify-content:flex-start;gap:4px;flex:0 1 auto;width:max-content;max-width:138px;min-width:0;height:37px;margin-left:0;padding:0 3px 0 2px;border:0;border-radius:7px;background:transparent}.pick-shop-filter:focus-within{outline:2px solid #8568d9;outline-offset:2px}.pick-shop-filter>svg{position:static;flex:0 0 17px;width:17px;height:17px;color:#8162d6;pointer-events:none}.pick-shop-filter-label{display:block;flex:0 1 auto;max-width:105px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#504658;font-size:11px;font-weight:780;pointer-events:none}.pick-shop-filter:after{content:"";display:block;position:static;flex:0 0 6px;width:6px;height:6px;margin:0 2px 3px 1px;border-right:1.6px solid #7f7885;border-bottom:1.6px solid #7f7885;transform:rotate(45deg);pointer-events:none}.pick-shop-filter select{position:absolute;inset:0;z-index:1;display:block;width:100%;height:100%;margin:0;padding:0;border:0;outline:0;background:transparent;opacity:0;appearance:none;-webkit-appearance:none;cursor:pointer}.pick-shop-review-list{border-top:1px solid #f0edf2}.pick-shop-review-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:15px 0;border-bottom:1px solid #eeeaf2;color:inherit;text-decoration:none}.pick-shop-review-copy{min-width:0}.pick-shop-review-shop{display:block;margin-bottom:7px;color:#7658c7;font-size:9.5px;font-weight:800}.pick-shop-review-card h3{margin:0;font-size:14.5px;line-height:1.4;color:#27232d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pick-shop-review-card p{margin:6px 0 0;color:#77717f;font-size:11.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pick-shop-review-meta{margin-top:8px;color:#aaa3af;font-size:10px}.pick-shop-review-stats{display:flex;gap:11px;margin-top:7px;color:#9a919f;font-size:9.5px}.pick-shop-review-thumb{width:82px;height:82px;border-radius:11px;overflow:hidden;background:#f3f0f6;align-self:center}.pick-shop-review-thumb img{width:100%;height:100%;object-fit:cover}.pick-shop-review-empty{padding:48px 12px;text-align:center;color:#99909f;font-size:12px}';document.head.appendChild(style);
const filter=panel.querySelector('#pickShopReviewFilter'),label=panel.querySelector('#pickShopReviewFilterLabel'),list=panel.querySelector('#pickShopReviewList');
let shops=[],posts=[],shopId='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago=s=>{if(!s)return'-';const d=new Date(s);if(Number.isNaN(d.getTime()))return'-';const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(m<1)return'방금 전';if(m<60)return m+'분 전';if(m<1440)return Math.floor(m/60)+'시간 전';if(m<10080)return Math.floor(m/1440)+'일 전';return d.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})};
const publicImage=path=>SB+'/storage/v1/object/public/community-posts/'+String(path||'').split('/').map(encodeURIComponent).join('/');
function shopLabel(s){const area=String(s.area||s.city||'').trim();return String(s.name||s.id)+(area?' · '+area:'')}
function updateLabel(){const opt=filter.options[filter.selectedIndex];label.textContent=opt?opt.textContent:'전체 카드샵'}
function render(){
 const rows=shopId?posts.filter(x=>x.shop_id===shopId):posts;
 if(!rows.length){list.innerHTML='<div class="pick-shop-review-empty">등록된 카드샵 후기가 없습니다.</div>';return}
 list.innerHTML=rows.map(x=>{
   const imageRows=(x.community_post_images||[]).slice().sort((a,b)=>a.sort_order-b.sort_order);
   const image=imageRows[0]?.storage_path?'<img src="'+esc(publicImage(imageRows[0].storage_path)+(String(imageRows[0].storage_path).split('/').pop().startsWith('fp1-')?'.thumb.webp':''))+'" alt="" loading="lazy">':'';
   const shop=shops.find(s=>s.id===x.shop_id),shopName=shop?shop.name:x.shop_id;
   return '<a class="pick-shop-review-card" href="talk.html#/post/'+encodeURIComponent(x.id)+'"><div class="pick-shop-review-copy"><span class="pick-shop-review-shop">📍 '+esc(shopName)+'</span><h3>'+esc(x.title)+'</h3><p>'+esc(x.body)+'</p><div class="pick-shop-review-meta">'+esc(x.author_nickname||'FUNY PIN 사용자')+' · '+ago(x.created_at)+'</div><div class="pick-shop-review-stats"><span>♡ '+Number(x.like_count||0)+'</span><span>댓글 '+Number(x.comment_count||0)+'</span><span>조회 '+Number(x.view_count||0)+'</span></div></div>'+ (image?'<div class="pick-shop-review-thumb">'+image+'</div>':'') +'</a>'
 }).join('');
}
async function load(){
 try{
  const h={apikey:KEY,Authorization:'Bearer '+KEY};
  const [sr,pr]=await Promise.all([
   fetch(SB+'/rest/v1/shops?select=id,name,country_code,area,city&is_active=eq.true&order=country_code.asc,name.asc',{headers:h,cache:'no-store'}),
   fetch(SB+'/rest/v1/community_posts?select=id,shop_id,author_nickname,title,body,created_at,view_count,like_count,comment_count,community_post_images(storage_path,sort_order)&status=eq.published&category=eq.'+encodeURIComponent('카드샵 후기')+'&shop_id=not.is.null&order=created_at.desc&limit=100',{headers:h,cache:'no-store'})
  ]);
  if(!sr.ok||!pr.ok)throw Error('review load failed');
  shops=await sr.json();posts=await pr.json();
  const params=new URLSearchParams(location.search),requested=String(params.get('shop')||'');
  filter.innerHTML='<option value="">전체 카드샵</option>'+shops.map(s=>'<option value="'+esc(s.id)+'">'+esc(shopLabel(s))+'</option>').join('');
  if(requested&&shops.some(s=>s.id===requested)){shopId=requested;filter.value=requested}
  updateLabel();render();
 }catch(e){list.innerHTML='<div class="pick-shop-review-empty">카드샵 후기를 불러오지 못했습니다.</div>'}
}
filter.addEventListener('change',()=>{shopId=filter.value;updateLabel();render()});
const params=new URLSearchParams(location.search);
if(params.get('tab')==='shop-review'||params.get('shop')){
 const tab=document.querySelector('.info-tab[data-tab="shop-review"]');
 if(tab)setTimeout(()=>tab.click(),0);
}
load();
})();