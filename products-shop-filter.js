/* FUNY PIN product shop selector — uses only currently listed BOX quotes and active graded listings. */
(()=>{
 'use strict';
 const node=document.createElement('nav');
 node.id='productShopFilter';node.className='product-shop-filter';node.setAttribute('aria-label','판매 카드샵 필터');
 const track=document.createElement('div');track.className='product-shop-track';node.append(track);
 const kindTabs=document.querySelector('.product-kind-tabs');
 const typeTabs=document.querySelector('.box-type-tabs');
 if(!kindTabs||!typeTabs)return;
 kindTabs.after(node);
 const state={selected:'',boxIds:new Set()};
 window.FUNY_PRODUCT_SHOP_FILTER=state;
 const metadata=new Map();
 let lastIds='',loadingMeta=false;
 const kind=()=>document.querySelector('.product-kind-tab[aria-selected="true"]')?.dataset.kind||'box';
 const type=()=>document.querySelector('.box-type-tab.is-active')?.dataset.type||'all';
 const products=()=>new Map((window.BOX_PRODUCTS||[]).map(p=>[p.id,p.tcg_type||(p.id.startsWith('op_')?'one_piece':'pokemon')]));
 const boxSource=()=>window.FUNY_BOX_SHOP_QUOTES||{rows:[],sellerShopIds:{},sellerNames:{}};
 function options(){
   const choices=new Map(),game=type(),current=kind();
   if(current==='box'){
     const data=boxSource(),types=products();
     for(const row of data.rows){
       if((game!=='all'&&types.get(row.product_id)!==game)||!(Number(row.price_krw)>0))continue;
       const shopId=data.sellerShopIds[row.seller]||'name:'+row.seller;
       const name=data.sellerNames[row.seller]||row.seller;
       if(!choices.has(shopId))choices.set(shopId,{id:shopId,name,products:new Set()});
       choices.get(shopId).products.add(row.product_id);
     }
   }else{
     for(const row of window.FUNY_GRADED_SHOPS||[]){
       if(game!=='all'&&row.tcg_type!==game)continue;
       const id=row.shop_id||'name:'+row.seller_name;
       if(!row.seller_name||id==='name:')continue;
       if(!choices.has(id))choices.set(id,{id,name:row.seller_name,logo_url:row.logo_url||'',products:new Set()});
     }
   }
   return [...choices.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 }
 function thumbnail(info){
   if(info.logo_url){try{const url=new URL(info.logo_url,location.origin);if(url.protocol==='https:')return url.href}catch{}}
   const online=window.FUNY_HOBBYSELECT_BOX;
   if(online&&info.id===online.shopKey)return online.logo;
   const images=metadata.get(info.id)?.images;
   if(!Array.isArray(images))return '';
   const first=images.find(x=>x.is_primary)||images.find(x=>x.type==='thumbnail')||images[0];
   const val=first?.storage_path||first?.source_path||'';
   if(!val)return '';
   try{const url=new URL(val,location.origin);if(!['https:','http:'].includes(url.protocol))return '';return url.href;}catch{return '';}
 }
 function avatar(info){
   const shell=document.createElement('span');shell.className='shop-avatar';
   const uri=thumbnail(info);
   if(uri){
     const img=document.createElement('img');img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.src=uri;
     img.onerror=()=>{img.remove();shell.textContent=info.name.slice(0,2)};
     shell.append(img);
   }else shell.textContent=info.name.slice(0,2);
   return shell;
 }
 function refresh(){
   const all=options();
   if(state.selected&&!all.some(x=>x.id===state.selected))state.selected='';
   state.boxIds=new Set(all.find(x=>x.id===state.selected)?.products||[]);
   const fragment=document.createDocumentFragment();
   for(const info of [{id:'',name:'전체'},...all]){
     const b=document.createElement('button');b.type='button';
     b.className='product-shop-option';
     if(info.id===state.selected)b.classList.add('is-active');
     b.setAttribute('aria-pressed',String(info.id===state.selected));
     b.setAttribute('aria-label',info.name+' 상품만 보기');
     if(!info.id){const icon=document.createElement('span');icon.className='shop-avatar all-avatar';icon.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor"/></svg>';b.append(icon)}
     else b.append(avatar(info));
     const caption=document.createElement('span');caption.className='shop-option-name';caption.textContent=info.name;b.append(caption);
     b.addEventListener('click',()=>{
       if(state.selected===info.id)return;
       state.selected=info.id;
       if(kind()==='box'){state.boxIds=new Set(all.find(x=>x.id===info.id)?.products||[]);window.render?.();}
       else window.FUNY_GRADED?.renderGraded?.();
       refresh();
     });
     fragment.append(b);
   }
   const left=track.scrollLeft;
   track.replaceChildren(fragment);
   track.scrollLeft=state.selected?left:0;
   const ids=all.map(x=>x.id).filter(id=>!metadata.has(id)&&!id.startsWith('name:')&&!id.startsWith('online:')).sort().join(',');
   if(ids&&ids!==lastIds&&!loadingMeta){lastIds=ids;void loadMetadata(ids.split(','));}
 }
 async function loadMetadata(ids){
   loadingMeta=true;
   try{
     const auth=window.FUNY_WEB_AUTH;
     if(!auth)return;
     await auth.init();
     const {data,error}=await auth.client.from('v_app_shops').select('id,name,images').in('id',ids);
     if(error)throw error;
     for(const shop of data||[])metadata.set(shop.id,shop);
   }catch(e){console.warn('Product shop thumbnails unavailable',e)}
   finally{loadingMeta=false;refresh();}
 }
 for(const tab of document.querySelectorAll('.product-kind-tab')){
   tab.addEventListener('click',()=>{state.selected='';state.boxIds=new Set();refresh();window.render?.();window.FUNY_GRADED?.renderGraded?.()});
 }
 for(const tab of document.querySelectorAll('.box-type-tab')){
   tab.addEventListener('click',()=>{state.selected='';state.boxIds=new Set();refresh();window.render?.();window.FUNY_GRADED?.renderGraded?.()});
 }
 window.addEventListener('funy:box-shop-quotes-ready',()=>{refresh();if(kind()==='box')window.render?.()});
 window.addEventListener('funy:graded-shops-ready',refresh);
 // Catalogue may arrive after approved price quotes. Rebuild options after its first render.
 const grid=document.getElementById('grid');
 if(grid)new MutationObserver(()=>{if(!window.funyBoxCatalogReady)return;refresh()}).observe(grid,{childList:true});
 refresh();
})();
