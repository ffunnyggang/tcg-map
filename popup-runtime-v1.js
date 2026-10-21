(()=> {
  'use strict';

  const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const path=String(location.pathname||'/').toLowerCase();
  const page=path==='/'||/\/index\.html$/.test(path)?'HOME':
    /\/shops\.html$/.test(path)?'TCG_MAP':
    /\/reviews\.html$/.test(path)?'PICK':
    /\/talk\.html$/.test(path)?'TALK':'';

  if(!page)return;
  if(page==='TCG_MAP'&&/\/shop\//i.test(location.hash))return;
  if(page==='TALK'&&/^#\/post\//i.test(location.hash))return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const post=data=>{try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(data))}catch(_){}};
  const isApp=()=>!!window.ReactNativeWebView;
  const overlaySource='admin-popup';
  let root=null,assertTimer=0,assertCount=0,current=null;

  function overlay(open){
    post({type:'FUNY_WEB_OVERLAY_STATE',open:!!open,source:overlaySource,navMode:page==='TCG_MAP'?'dim':'hide'});
  }
  function stopAssert(){
    if(assertTimer){clearInterval(assertTimer);assertTimer=0}
    assertCount=0;
  }
  function startAssert(){
    stopAssert();
    overlay(true);
    assertTimer=setInterval(()=>{
      if(!root||root.hidden){stopAssert();return}
      overlay(true);
      if(++assertCount>=12)stopAssert();
    },120);
  }
  function dismissKey(row){
    return String(row.dismiss_key||('funypin_popup_hide_'+row.id));
  }
  function dismissed(row){
    try{return localStorage.getItem(dismissKey(row))==='1'}catch(_){return false}
  }
  function close(){
    if(!root)return;
    root.hidden=true;
    stopAssert();
    overlay(false);
  }
  function hideForever(){
    if(current){try{localStorage.setItem(dismissKey(current),'1')}catch(_){}}
    close();
  }
  function normalizeUrl(value){
    try{return new URL(String(value||''),location.href).toString()}catch(_){return ''}
  }
  function isFuny(url){
    try{const u=new URL(url);return /(^|\.)funypin\.kr$/i.test(u.hostname)}catch(_){return false}
  }
  function followLink(){
    if(!current?.link_url)return;
    const target=normalizeUrl(current.link_url);
    if(!target)return;
    close();
    if(isApp()){
      if(isFuny(target))post({type:'OPEN_INAPP_PAGE',url:target,title:current.title||'',source:overlaySource});
      else post({type:'OPEN_EXTERNAL',url:target,source:overlaySource});
      return;
    }
    location.href=target;
  }
  async function resolveImage(url){
    const target=normalizeUrl(url);
    if(!target)return '';
    try{
      const u=new URL(target);
      if(/\.b64$/i.test(u.pathname)){
        const r=await fetch(target,{cache:'no-store'});
        if(!r.ok)throw new Error('image');
        const b64=(await r.text()).trim();
        return b64?'data:image/webp;base64,'+b64:'';
      }
    }catch(_){}
    return target;
  }
  function ensureStyle(){
    if(document.getElementById('funy-admin-popup-style'))return;
    const s=document.createElement('style');
    s.id='funy-admin-popup-style';
    s.textContent=`
      #funyAdminPopup[hidden]{display:none!important}
      #funyAdminPopup{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(18,14,26,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
      .funy-admin-popup-card{position:relative;width:min(92vw,420px);height:auto;max-height:calc(100dvh - 36px);display:flex;flex-direction:column;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 20px 60px rgba(20,14,34,.32)}
      .funy-admin-popup-media{display:block;width:100%;height:auto;max-height:calc(100dvh - 104px);object-fit:contain;background:#f6f1ff;user-select:none;-webkit-user-drag:none}
      .funy-admin-popup-media.is-link{cursor:pointer}
      .funy-admin-popup-x{position:absolute;right:10px;top:10px;z-index:2;width:34px;height:34px;border:1px solid rgba(255,255,255,.9);border-radius:50%;background:rgba(28,19,42,.72);color:#fff;font:300 24px/30px Arial,sans-serif;display:grid;place-items:center;padding:0;box-shadow:0 3px 10px rgba(0,0,0,.18)}
      .funy-admin-popup-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px;background:#fff;flex:0 0 auto}
      .funy-admin-popup-actions button{height:44px;border-radius:12px;font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:800;letter-spacing:-.02em}
      .funy-admin-popup-hide{border:1px solid #e4dcef;background:#faf8fd;color:#6e617c}
      .funy-admin-popup-close{border:0;background:#8062d8;color:#fff}
      @media(max-height:650px){#funyAdminPopup{padding:10px}.funy-admin-popup-card{max-height:calc(100dvh - 20px)}.funy-admin-popup-media{max-height:calc(100dvh - 88px)}}
    `;
    document.head.appendChild(s);
  }
  async function show(row){
    current=row;
    ensureStyle();
    const imgUrl=await resolveImage(row.image_url);
    if(!imgUrl)return;
    root=document.createElement('div');
    root.id='funyAdminPopup';
    root.hidden=true;
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label',row.title||'FUNY PIN 팝업 안내');
    root.innerHTML=`
      <div class="funy-admin-popup-card" role="document">
        <button class="funy-admin-popup-x" type="button" aria-label="팝업 닫기">×</button>
        <img class="funy-admin-popup-media${row.link_url?' is-link':''}" alt="${esc(row.title||'FUNY PIN 팝업')}" ${row.link_url?'role="button" tabindex="0"':''}>
        <div class="funy-admin-popup-actions">
          <button class="funy-admin-popup-hide" type="button">다시 보지 않기</button>
          <button class="funy-admin-popup-close" type="button">닫기</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const img=root.querySelector('.funy-admin-popup-media');
    const open=()=>{if(root&&!dismissed(row)){root.hidden=false;startAssert()}};
    img.addEventListener('load',open,{once:true});
    img.addEventListener('error',()=>{close();root?.remove();root=null},{once:true});
    img.src=imgUrl;
    root.querySelector('.funy-admin-popup-x').onclick=close;
    root.querySelector('.funy-admin-popup-close').onclick=close;
    root.querySelector('.funy-admin-popup-hide').onclick=hideForever;
    if(row.link_url){
      img.onclick=followLink;
      img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();followLink()}};
    }
    root.addEventListener('click',e=>{if(e.target===root)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root&&!root.hidden)close()});
    if(img.complete&&img.naturalWidth)open();
  }
  async function init(){
    try{
      const r=await fetch(BASE+'/rest/v1/site_popups?select=id,title,image_url,link_url,target_pages,priority,dismiss_key,created_at&is_active=eq.true&order=priority.desc,created_at.desc',{
        headers:{apikey:KEY,Accept:'application/json'},
        cache:'no-store'
      });
      if(!r.ok)return;
      const rows=await r.json();
      const row=(Array.isArray(rows)?rows:[]).find(x=>Array.isArray(x.target_pages)&&x.target_pages.includes(page)&&!dismissed(x));
      if(row)show(row);
    }catch(_){}
  }

  window.addEventListener('pageshow',()=>{if(root&&!root.hidden)startAssert()});
  window.addEventListener('pagehide',()=>{stopAssert();overlay(false)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();