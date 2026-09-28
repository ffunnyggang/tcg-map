(()=>{
  const STYLE_ID='cms-collection-list-extension-style';
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .cms-collection-layout-extra{margin-top:12px}.cms-collection-layout-extra>label{display:block;margin-bottom:6px;font-size:10px;font-weight:700;color:#3c3640}.cms-collection-layout-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.cms-collection-layout-buttons button{height:38px;border:1px solid #e4dfe8;border-radius:9px;background:#fff;font-size:10px;font-weight:750;cursor:pointer}.cms-collection-layout-buttons button.on{border-color:#8062d8;background:#f3effc;color:#6749bd;font-weight:800}.cms-collection-title-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding:10px 0}.cms-collection-title-toggle span{font-size:10px;font-weight:700;color:#3c3640}.cms-collection-title-toggle button{min-width:72px;height:34px;border:1px solid #e4dfe8;border-radius:9px;background:#fff;font-size:10px;font-weight:750}.cms-collection-title-toggle button.on{border-color:#8062d8;background:#f3effc;color:#6749bd}.cms-collection-list-preview{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}.cms-collection-list-preview>*{width:100%!important;min-height:72px!important;display:grid!important;grid-template-columns:72px minmax(0,1fr)!important;align-items:center!important;gap:10px!important}.cms-collection-list-preview img{width:72px!important;height:72px!important;object-fit:cover!important;border-radius:10px!important}
    `;document.head.appendChild(s);
  }
  const key=id=>'funypin_collection_ext_'+id;
  const get=id=>{try{return JSON.parse(localStorage.getItem(key(id))||'{}')}catch(_){return{}}};
  const set=(id,v)=>localStorage.setItem(key(id),JSON.stringify({...get(id),...v}));
  const collectionId=()=>document.querySelector('[data-block-id].editing,[data-block-id][aria-current="true"]')?.dataset.blockId||new URLSearchParams(location.search).get('block')||new URLSearchParams(location.search).get('id')||'';
  function preview(){return document.querySelector('.cms-collection-preview,.cms-collection-grid,[data-collection-preview]')}
  function applyPreview(id){const st=get(id),p=preview();if(!p)return;p.classList.toggle('cms-collection-list-preview',st.layout==='list');const title=p.parentElement?.querySelector('.cms-preview-title,.collection-title,h2,h3');if(title)title.style.display=st.titleHidden?'none':''}
  function install(){
    const save=document.querySelector('#cmsCollectionSave');
    if(!save)return false;
    const form=save.closest('.cms-block-editor,.cms-editor-panel,.modal,.sheet')||save.parentElement?.parentElement;
    if(!form||form.querySelector('.cms-collection-layout-extra'))return true;
    const id=collectionId()||'new',st=get(id),anchor=form.querySelector('.cms-title-size-row,.cms-collection-align')||save;
    const box=document.createElement('div');box.className='cms-collection-layout-extra';box.innerHTML=`<label>레이아웃</label><div class="cms-collection-layout-buttons"><button type="button" data-layout="list">1열 리스트</button><button type="button" data-layout="2">2열</button><button type="button" data-layout="3">3열</button></div><div class="cms-collection-title-toggle"><span>제목 숨기기</span><button type="button" data-title-hidden>${st.titleHidden?'숨김':'표시'}</button></div>`;
    anchor.parentElement.insertBefore(box,anchor.nextSibling);
    const mark=()=>box.querySelectorAll('[data-layout]').forEach(b=>b.classList.toggle('on',b.dataset.layout===(get(id).layout||'2')));mark();box.querySelector('[data-title-hidden]').classList.toggle('on',!!st.titleHidden);
    box.onclick=e=>{const l=e.target.closest('[data-layout]'),t=e.target.closest('[data-title-hidden]');if(l){set(id,{layout:l.dataset.layout});mark();applyPreview(id)}if(t){const v=!get(id).titleHidden;set(id,{titleHidden:v});t.textContent=v?'숨김':'표시';t.classList.toggle('on',v);applyPreview(id)}};
    save.addEventListener('click',()=>{const sid=collectionId();if(sid&&sid!==id){const v=get(id);localStorage.setItem(key(sid),JSON.stringify(v));if(id==='new')localStorage.removeItem(key(id))}},true);
    applyPreview(id);return true
  }
  if(!install())new MutationObserver(()=>install()).observe(document.body,{childList:true,subtree:true});
})();