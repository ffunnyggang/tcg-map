(()=> {
  'use strict';

  const PAGE_LABELS={HOME:'HOME',TCG_MAP:'TCG MAP',PICK:'PICK',TALK:'TALK'};
  let popupRows=[];

  const toLocalInput=v=>{
    if(!v)return '';
    const d=new Date(v); if(Number.isNaN(d.getTime()))return '';
    const p=n=>String(n).padStart(2,'0');
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
  };
  const toIso=v=>v?new Date(v).toISOString():null;
  const fmt=v=>v?new Date(v).toLocaleString('ko-KR'):'제한 없음';
  const pagesText=a=>(Array.isArray(a)?a:[]).map(x=>PAGE_LABELS[x]||x).join(' · ')||'-';
  const isB64Url=url=>{try{return /\.b64$/i.test(new URL(url,location.href).pathname)}catch(_){return false}};
  const storagePublic=path=>BASE+'/storage/v1/object/public/cms-images/'+path.split('/').map(encodeURIComponent).join('/');

  function ensurePopupAdminStyle(){
    if(document.getElementById('popup-admin-style'))return;
    const s=document.createElement('style');
    s.id='popup-admin-style';
    s.textContent=`
      .popup-admin-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
      .popup-admin-head h2{margin:0;font-size:17px}
      .popup-admin-head p{margin:4px 0 0;color:#817887;font-size:11px}
      .popup-admin-new{border:0;border-radius:12px;background:#7653e8;color:#fff;font-weight:800;height:40px;padding:0 16px;cursor:pointer}
      .popup-admin-list{display:grid;gap:12px}
      .popup-admin-card{display:grid;grid-template-columns:108px minmax(0,1fr) auto;gap:14px;align-items:start;padding:14px;border:1px solid #ece7f1;border-radius:16px;background:#fff}
      .popup-admin-thumb{width:108px;min-height:108px;border-radius:12px;background:#f5f1fa;overflow:hidden;display:grid;place-items:center}
      .popup-admin-thumb img{display:block;width:100%;height:auto;max-height:160px;object-fit:contain}
      .popup-admin-info{min-width:0}
      .popup-admin-title{font-size:14px;font-weight:850;color:#211b27;word-break:break-word}
      .popup-admin-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
      .popup-admin-badge{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:99px;background:#f4f0fb;color:#67577b;font-size:10px;font-weight:750}
      .popup-admin-badge.active{background:#eaf8ee;color:#277644}
      .popup-admin-badge.off{background:#f4f2f5;color:#8b838f}
      .popup-admin-detail{margin-top:9px;font-size:10.5px;line-height:1.65;color:#6d6574;word-break:break-all}
      .popup-admin-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:190px}
      .popup-admin-actions button{height:34px;border-radius:9px;border:1px solid #ded7e5;background:#fff;color:#51485d;font-size:10.5px;font-weight:750;padding:0 10px;cursor:pointer}
      .popup-admin-actions .danger{color:#c23d55;border-color:#f0cbd2}
      .popup-editor{max-width:760px;margin:0 auto;padding:18px;border:1px solid #e9e3ef;border-radius:18px;background:#fff}
      .popup-editor-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}
      .popup-editor-head h2{margin:0;font-size:18px}.popup-editor-head p{margin:5px 0 0;font-size:11px;color:#817887}
      .popup-editor-back{border:1px solid #ddd5e6;background:#fff;border-radius:10px;height:36px;padding:0 12px;font-weight:750;color:#5e536b;cursor:pointer}
      .popup-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .popup-field{display:grid;gap:7px}.popup-field.wide{grid-column:1/-1}
      .popup-field label{font-size:11px;font-weight:800;color:#51485d}
      .popup-field input[type=text],.popup-field input[type=url],.popup-field input[type=number],.popup-field input[type=datetime-local]{width:100%;height:42px;border:1px solid #ddd5e5;border-radius:11px;padding:0 12px;font:inherit;color:#211b27;background:#fff}
      .popup-upload{border:1px dashed #cfc4db;border-radius:13px;padding:12px;background:#fbf9fd}
      .popup-preview{margin-top:10px;display:none;width:min(100%,360px);border-radius:12px;overflow:hidden;background:#f4f0f8}
      .popup-preview.show{display:block}.popup-preview img{display:block;width:100%;height:auto;max-height:520px;object-fit:contain}
      .popup-page-checks{display:flex;gap:8px;flex-wrap:wrap}
      .popup-page-checks label{display:inline-flex;align-items:center;gap:6px;border:1px solid #ded7e5;border-radius:10px;padding:9px 11px;font-weight:750;background:#fff;cursor:pointer}
      .popup-toggle{display:flex;align-items:center;gap:8px;height:42px}
      .popup-help{font-size:10px;color:#938b99;line-height:1.55}
      .popup-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid #eee9f1}
      .popup-editor-actions button{height:42px;border-radius:11px;padding:0 17px;font-weight:800;cursor:pointer}
      .popup-cancel{border:1px solid #ddd5e5;background:#fff;color:#5f5666}.popup-save{border:0;background:#7653e8;color:#fff}
      @media(max-width:760px){.popup-admin-card{grid-template-columns:84px minmax(0,1fr)}.popup-admin-thumb{width:84px;min-height:84px}.popup-admin-actions{grid-column:1/-1;justify-content:flex-start;max-width:none}.popup-form-grid{grid-template-columns:1fr}.popup-field.wide{grid-column:1}}
    `;
    document.head.appendChild(s);
  }

  async function adminResolveImage(url,img){
    if(!url||!img)return;
    if(isB64Url(url)){
      try{
        const r=await fetch(url,{cache:'no-store'});
        if(!r.ok)return;
        img.src='data:image/webp;base64,'+(await r.text()).trim();
      }catch(_){}
      return;
    }
    img.src=url;
  }

  async function uploadPopupImage(file,retried=false){
    if(!file)throw new Error('팝업 이미지를 선택해주세요.');
    if(file.size>10*1024*1024)throw new Error('이미지는 10MB 이하만 업로드할 수 있습니다.');
    if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type))throw new Error('JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다.');
    const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif' })[file.type]||'img';
    const name='popups/'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+ext;
    const r=await fetch(BASE+'/storage/v1/object/cms-images/'+name,{
      method:'POST',
      headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':file.type,'x-upsert':'false'},
      body:file
    });
    if(!r.ok){
      let msg='이미지 업로드에 실패했습니다.';
      try{const d=await r.json();msg=d.message||d.error||msg}catch{}
      if(!retried&&(r.status===401||/expired/i.test(msg))){await refreshSession();return uploadPopupImage(file,true)}
      throw new Error(msg);
    }
    return {path:name,url:storagePublic(name)};
  }

  async function deletePopupImage(path){
    if(!path)return;
    try{
      await fetch(BASE+'/storage/v1/object/cms-images/'+path,{
        method:'DELETE',
        headers:{apikey:KEY,Authorization:'Bearer '+token}
      });
    }catch(_){}
  }

  function renderList(){
    const f=$('feed');
    f.innerHTML=
      '<div class="popup-admin-head"><div><h2>팝업 관리</h2><p>HOME / TCG MAP / PICK / TALK 진입 팝업을 관리합니다.</p></div><button id="popupNew" class="popup-admin-new" type="button">+ 팝업 등록</button></div>'+
      (popupRows.length?'<div id="popupAdminList" class="popup-admin-list"></div>':'<div class="empty">등록된 팝업이 없습니다.</div>');
    $('popupNew').onclick=()=>renderEditor(null);
    const list=$('popupAdminList'); if(!list)return;

    popupRows.forEach(row=>{
      const el=document.createElement('article');
      el.className='popup-admin-card';
      el.innerHTML=
        '<div class="popup-admin-thumb"><img alt=""></div>'+
        '<div class="popup-admin-info">'+
          '<div class="popup-admin-title">'+esc(row.title||'제목 없음')+'</div>'+
          '<div class="popup-admin-meta">'+
            '<span class="popup-admin-badge '+(row.is_active?'active':'off')+'">'+(row.is_active?'노출 ON':'노출 OFF')+'</span>'+
            '<span class="popup-admin-badge">'+esc(pagesText(row.target_pages))+'</span>'+
            '<span class="popup-admin-badge">우선순위 '+Number(row.priority||0)+'</span>'+
          '</div>'+
          '<div class="popup-admin-detail">노출 시작: '+esc(fmt(row.starts_at))+'<br>노출 종료: '+esc(fmt(row.ends_at))+
          (row.link_url?'<br>이동 URL: '+esc(row.link_url):'<br>이동 URL: 없음')+'</div>'+
        '</div>'+
        '<div class="popup-admin-actions">'+
          '<button type="button" data-popup-edit="'+row.id+'">수정</button>'+
          '<button type="button" data-popup-toggle="'+row.id+'">'+(row.is_active?'노출 끄기':'노출 켜기')+'</button>'+
          '<button type="button" class="danger" data-popup-delete="'+row.id+'">삭제</button>'+
        '</div>';
      list.appendChild(el);
      adminResolveImage(row.image_url,el.querySelector('img'));
    });

    list.querySelectorAll('[data-popup-edit]').forEach(b=>b.onclick=()=>renderEditor(popupRows.find(x=>x.id===b.dataset.popupEdit)));
    list.querySelectorAll('[data-popup-toggle]').forEach(b=>b.onclick=()=>togglePopup(b.dataset.popupToggle));
    list.querySelectorAll('[data-popup-delete]').forEach(b=>b.onclick=()=>removePopup(b.dataset.popupDelete));
  }

  function renderEditor(row){
    const f=$('feed');
    const edit=!!row;
    const pages=new Set(row?.target_pages||['HOME']);
    f.innerHTML=`
      <div class="popup-editor">
        <div class="popup-editor-head">
          <div><h2>${edit?'팝업 수정':'팝업 등록'}</h2><p>이미지 비율에 맞춰 팝업 높이가 자동으로 적용됩니다.</p></div>
          <button id="popupBack" class="popup-editor-back" type="button">목록</button>
        </div>
        <div class="popup-form-grid">
          <div class="popup-field wide">
            <label for="popupTitle">관리용 제목</label>
            <input id="popupTitle" type="text" maxlength="100" value="${esc(row?.title||'')}" placeholder="예: 더카드룸 퍼니몬 이벤트">
          </div>
          <div class="popup-field wide">
            <label>팝업 이미지</label>
            <div class="popup-upload">
              <input id="popupImage" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
              <div class="popup-help">JPG / PNG / WEBP / GIF, 최대 10MB · 원본 이미지 비율을 그대로 사용합니다.</div>
              <div id="popupPreview" class="popup-preview${row?.image_url?' show':''}"><img id="popupPreviewImg" alt="팝업 이미지 미리보기"></div>
            </div>
          </div>
          <div class="popup-field wide">
            <label for="popupLink">이미지 클릭 이동 URL</label>
            <input id="popupLink" type="url" value="${esc(row?.link_url||'')}" placeholder="https://funypin.kr/event.html">
            <div class="popup-help">비워두면 이미지 클릭 시 이동하지 않습니다. FUNY PIN 내부 URL은 앱에서 인앱 페이지로 열립니다.</div>
          </div>
          <div class="popup-field wide">
            <label>팝업 노출 페이지</label>
            <div class="popup-page-checks">
              ${Object.entries(PAGE_LABELS).map(([v,n])=>'<label><input type="checkbox" name="popupPage" value="'+v+'" '+(pages.has(v)?'checked':'')+'> '+n+'</label>').join('')}
            </div>
          </div>
          <div class="popup-field">
            <label for="popupStart">노출 시작</label>
            <input id="popupStart" type="datetime-local" value="${toLocalInput(row?.starts_at)}">
          </div>
          <div class="popup-field">
            <label for="popupEnd">노출 종료</label>
            <input id="popupEnd" type="datetime-local" value="${toLocalInput(row?.ends_at)}">
          </div>
          <div class="popup-field">
            <label for="popupPriority">노출 우선순위</label>
            <input id="popupPriority" type="number" value="${Number(row?.priority||0)}" step="1">
            <div class="popup-help">같은 페이지에 여러 팝업이 있을 경우 숫자가 큰 팝업이 먼저 노출됩니다.</div>
          </div>
          <div class="popup-field">
            <label>노출 상태</label>
            <div class="popup-toggle"><input id="popupActive" type="checkbox" ${row?.is_active?'checked':''}><label for="popupActive">팝업 노출 ON</label></div>
          </div>
        </div>
        <div class="popup-editor-actions">
          <button id="popupCancel" class="popup-cancel" type="button">취소</button>
          <button id="popupSave" class="popup-save" type="button">${edit?'수정 저장':'등록'}</button>
        </div>
      </div>`;

    $('popupBack').onclick=renderList;
    $('popupCancel').onclick=renderList;
    const preview=$('popupPreview'),previewImg=$('popupPreviewImg'),fileInput=$('popupImage');
    if(row?.image_url)adminResolveImage(row.image_url,previewImg);
    fileInput.onchange=()=>{
      const file=fileInput.files?.[0];
      if(!file)return;
      const u=URL.createObjectURL(file);
      preview.classList.add('show');
      previewImg.onload=()=>URL.revokeObjectURL(u);
      previewImg.src=u;
    };
    $('popupSave').onclick=()=>savePopup(row);
  }

  async function savePopup(row){
    const btn=$('popupSave');
    const title=$('popupTitle').value.trim();
    const pages=[...document.querySelectorAll('input[name="popupPage"]:checked')].map(x=>x.value);
    const link=$('popupLink').value.trim();
    const start=$('popupStart').value;
    const end=$('popupEnd').value;
    const file=$('popupImage').files?.[0]||null;
    if(!title){alert('관리용 제목을 입력해주세요.');return}
    if(!pages.length){alert('팝업 노출 페이지를 1개 이상 선택해주세요.');return}
    if(!row?.image_url&&!file){alert('팝업 이미지를 등록해주세요.');return}
    if(start&&end&&new Date(end)<=new Date(start)){alert('노출 종료일은 시작일보다 이후여야 합니다.');return}
    let uploaded=null;
    btn.disabled=true;btn.textContent='저장 중...';
    try{
      if(file)uploaded=await uploadPopupImage(file);
      const body={
        title,
        image_url:uploaded?.url||row.image_url,
        image_path:uploaded?.path||row?.image_path||null,
        link_url:link||null,
        target_pages:pages,
        starts_at:toIso(start),
        ends_at:toIso(end),
        is_active:$('popupActive').checked,
        priority:Number($('popupPriority').value||0),
        updated_at:new Date().toISOString()
      };
      if(row){
        await api('/rest/v1/site_popups?id=eq.'+encodeURIComponent(row.id),{
          method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)
        });
        if(uploaded&&row.image_path&&row.image_path!==uploaded.path)deletePopupImage(row.image_path);
      }else{
        await api('/rest/v1/site_popups',{
          method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)
        });
      }
      await window.loadAdminPopups();
      alert(row?'팝업이 수정되었습니다.':'팝업이 등록되었습니다.');
    }catch(e){
      if(uploaded)deletePopupImage(uploaded.path);
      alert('저장 실패: '+e.message);
      btn.disabled=false;btn.textContent=row?'수정 저장':'등록';
    }
  }

  async function togglePopup(id){
    const row=popupRows.find(x=>x.id===id);if(!row)return;
    try{
      await api('/rest/v1/site_popups?id=eq.'+encodeURIComponent(id),{
        method:'PATCH',headers:{Prefer:'return=minimal'},
        body:JSON.stringify({is_active:!row.is_active,updated_at:new Date().toISOString()})
      });
      await window.loadAdminPopups();
    }catch(e){alert('노출 상태 변경 실패: '+e.message)}
  }

  async function removePopup(id){
    const row=popupRows.find(x=>x.id===id);if(!row)return;
    if(!confirm('팝업을 삭제할까요?\n\n삭제 후 복구할 수 없습니다.'))return;
    try{
      await api('/rest/v1/site_popups?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      if(row.image_path)deletePopupImage(row.image_path);
      await window.loadAdminPopups();
    }catch(e){alert('팝업 삭제 실패: '+e.message)}
  }

  window.loadAdminPopups=async function(){
    ensurePopupAdminStyle();
    const f=$('feed');
    f.innerHTML='<div class="empty">팝업 정보를 불러오는 중...</div>';
    try{
      popupRows=await api('/rest/v1/site_popups?select=*&order=priority.desc,created_at.desc');
      renderList();
    }catch(e){
      f.innerHTML='<div class="empty error">팝업 조회 실패: '+esc(e.message)+'</div>';
    }
  };
})();