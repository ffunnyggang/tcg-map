/* FUNY TALK native community + POKAMO mixed feed */
(function(){
'use strict';
if(!/\/talk\.html$/.test(location.pathname)||window.__FUNY_TALK_COMMUNITY)return;
window.__FUNY_TALK_COMMUNITY=true;

const SB='https://wdttzpbmqavaqfcbaywj.supabase.co';
const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const CATS=['자유 게시판','카드 자랑','카드깡/카드샵 후기','정보 공유'];
const feed=document.getElementById('feed'),fab=document.getElementById('pokamoFab'),popularSort=document.getElementById('popularSort');
let mixed=[],current='전체',popularMode='popular';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago=s=>{const d=new Date(s),m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(m<1)return'방금 전';if(m<60)return m+'분 전';if(m<1440)return Math.floor(m/60)+'시간 전';if(m<10080)return Math.floor(m/1440)+'일 전';return d.toLocaleDateString('ko-KR')};
const token=()=>String(window.__FUNY_ACCESS_TOKEN||'');
const uid=()=>{try{const t=token().split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(decodeURIComponent(escape(atob(t)))).sub||''}catch(_){return''}};
const headers=(auth=false)=>{const h={apikey:KEY,'Content-Type':'application/json'};if(auth&&token())h.Authorization='Bearer '+token();return h};
const requestLogin=message=>{alert(message);try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/login?next=talk'}))}catch(_){}};
const publicImage=path=>`${SB}/storage/v1/object/public/community-posts/${String(path||'').split('/').map(encodeURIComponent).join('/')}`;

const style=document.createElement('style');
style.textContent=`
.funy-source{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;margin-right:5px;font-size:9px;font-weight:850;letter-spacing:.02em}.funy-source.funy{background:#eee8fb;color:#704fc5}.funy-source.pokamo{background:#fff0e5;color:#d86418}.funy-category{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;background:#f5f3f7;color:#756e7b;font-size:9px;font-weight:750}.funy-post-card{cursor:pointer}.funy-post-card .thumb-stack{width:88px;height:88px;position:relative}.funy-post-card .thumb-count{position:absolute;right:5px;bottom:5px;padding:2px 6px;border-radius:999px;background:rgba(20,18,24,.72);color:#fff;font-size:9px;font-weight:800}.pokamo-fab{background:linear-gradient(135deg,#8063d7,#6446bd)!important;box-shadow:0 8px 24px rgba(103,74,190,.24)!important;width:146px!important}.talk-community-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(24,20,30,.36)}.talk-community-modal[hidden]{display:none}.talk-community-sheet{width:min(100%,420px);max-height:92dvh;overflow:auto;background:#fff;border-radius:24px 24px 0 0;padding:10px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -18px 45px rgba(32,24,44,.18)}.talk-community-handle{width:42px;height:5px;border-radius:99px;background:#d8d2dd;margin:0 auto 9px}.talk-community-head{display:flex;align-items:center;justify-content:space-between;height:42px}.talk-community-head strong{font-size:17px}.talk-community-close{width:36px;height:36px;border:0;background:transparent;font-size:26px;color:#777}.talk-field{margin-top:14px}.talk-field label{display:block;margin-bottom:7px;font-size:11px;font-weight:800;color:#5b5560}.talk-field select,.talk-field input,.talk-field textarea{width:100%;border:1px solid #e2dde7;border-radius:13px;background:#fff;color:#29252e;font:650 14px 'Pretendard Variable',Pretendard,sans-serif;outline:0}.talk-field select,.talk-field input{height:46px;padding:0 13px}.talk-field textarea{height:170px;padding:12px 13px;resize:none;line-height:1.55}.talk-field input:focus,.talk-field textarea:focus,.talk-field select:focus{border-color:#9c84dc;box-shadow:0 0 0 3px rgba(117,87,200,.08)}.talk-photo-input{display:none}.talk-photo-btn{height:44px;border:1px dashed #cfc5dd;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#7459bf;font-size:12px;font-weight:800;background:#faf8fd}.talk-photo-list{display:flex;gap:8px;margin-top:8px}.talk-photo-item{width:70px;height:70px;position:relative}.talk-photo-item img{width:70px;height:70px;border-radius:10px;object-fit:cover}.talk-photo-item button{position:absolute;right:-5px;top:-5px;width:22px;height:22px;border:0;border-radius:50%;background:#38323e;color:#fff}.talk-submit{width:100%;height:50px;margin-top:20px;border:0;border-radius:14px;background:#684bbf;color:#fff;font-size:13px;font-weight:900}.talk-policy{margin-top:9px;color:#9b94a0;font-size:10px;line-height:1.5}.talk-detail-body{white-space:pre-wrap;font-size:13px;line-height:1.65;color:#514b56;margin:13px 0 18px}.talk-detail-images{display:grid;gap:8px}.talk-detail-images img{display:block;width:100%;border-radius:13px;background:#f3f0f5}.talk-detail-meta{margin-top:5px;font-size:10.5px;color:#9b94a0}.talk-report{margin:18px auto 0;display:block;border:0;background:transparent;color:#a19aa6;font-size:11px;text-decoration:underline}.talk-report-options{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.talk-report-options button{height:42px;border:1px solid #e2dde7;border-radius:11px;background:#fff;color:#5d5661;font-size:11px}.talk-empty-note{padding:45px 20px;text-align:center;color:#999;font-size:13px}
`;
document.head.appendChild(style);

function modalShell(id,title,body){let old=document.getElementById(id);if(old)old.remove();const el=document.createElement('div');el.id=id;el.className='talk-community-modal';el.innerHTML=`<div class="talk-community-sheet"><div class="talk-community-handle"></div><div class="talk-community-head"><strong>${esc(title)}</strong><button class="talk-community-close" type="button" aria-label="닫기">×</button></div>${body}</div>`;el.querySelector('.talk-community-close').onclick=()=>el.remove();el.addEventListener('click',e=>{if(e.target===el)el.remove()});document.body.appendChild(el);return el}

function pokamoLimit(funyCount){if(funyCount>=100)return 0;if(funyCount>=50)return 3;if(funyCount>=25)return 6;if(funyCount>=10)return 12;return 30}

async function loadFuny(){
  const url=SB+'/rest/v1/community_posts?select=id,author_nickname,category,title,body,created_at,report_count,community_post_images(storage_path,sort_order)&status=eq.published&order=created_at.desc&limit=80';
  const r=await fetch(url,{headers:{apikey:KEY}});if(!r.ok)throw Error('FUNY feed '+r.status);const rows=await r.json();
  return rows.map(x=>({source:'funy',id:x.id,category:x.category,title:x.title,excerpt:x.body,body:x.body,author:x.author_nickname,publishedAt:x.created_at,image:(x.community_post_images||[]).sort((a,b)=>a.sort_order-b.sort_order)[0]?.storage_path?publicImage((x.community_post_images||[]).sort((a,b)=>a.sort_order-b.sort_order)[0].storage_path):'',images:(x.community_post_images||[]).sort((a,b)=>a.sort_order-b.sort_order).map(i=>publicImage(i.storage_path)),likes:0,comments:0,popularityScore:0}));
}
async function loadPokamo(){try{const r=await fetch('data/pokamo-feed.json?ts='+Date.now());if(!r.ok)throw Error();const d=await r.json();return(d.items||[]).map(x=>({...x,source:'pokamo'}))}catch(_){return[]}}

function selectedList(){
  let list=current==='인기'?[...mixed].sort((a,b)=>{if(popularMode==='likes')return(Number(b.likes)||0)-(Number(a.likes)||0);if(popularMode==='comments')return(Number(b.comments)||0)-(Number(a.comments)||0);return(Number(b.popularityScore)||0)-(Number(a.popularityScore)||0)}).filter(x=>(Number(x.popularityScore)||0)>0||(Number(x.likes)||0)>0||(Number(x.comments)||0)>0).slice(0,10):(current==='전체'?mixed:mixed.filter(x=>x.category===current));
  return list;
}
function cardHtml(x){
  const source=x.source==='funy'?'<span class="funy-source funy">FUNY PIN</span>':'<span class="funy-source pokamo">POKAMO</span>';
  const tags=source+`<span class="funy-category">${esc(x.category)}</span>`;
  const image=x.image?`<div class="thumb-stack"><img class="thumb" src="${esc(x.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">${x.images&&x.images.length>1?`<span class="thumb-count">+${x.images.length-1}</span>`:''}</div>`:'';
  if(x.source==='funy')return `<article class="card funy-post-card ${image?'':'noimg'}" data-funy-post="${esc(x.id)}"><div><div>${tags}</div><h2>${esc(x.title)}</h2><div class="excerpt">${esc(x.excerpt)}</div><div class="meta">${esc(x.author)} · ${ago(x.publishedAt)}</div></div>${image}</article>`;
  return `<a class="card ${image?'':'noimg'}" href="${esc(x.url)}" target="_blank" rel="noopener"><div><div>${tags}</div><h2>${esc(x.title)}</h2><div class="excerpt">${esc(x.excerpt)}</div><div class="meta">${esc(x.author)} · ${ago(x.publishedAt)}</div></div>${image}</a>`;
}
function render(){const list=selectedList();popularSort?.classList.toggle('show',current==='인기');feed.innerHTML=list.length?list.map(cardHtml).join(''):'<div class="talk-empty-note">해당 카테고리의 게시글이 없습니다.</div>';feed.querySelectorAll('[data-funy-post]').forEach(el=>el.onclick=()=>openDetail(el.dataset.funyPost));}

function bindFilters(){
  document.querySelectorAll('.filter').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');current=b.dataset.cat||'전체';render()}});
  popularSort?.querySelectorAll('button').forEach(b=>{b.onclick=()=>{popularSort.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');popularMode=b.dataset.sort||'popular';render()}});
}

function openDetail(id){const x=mixed.find(v=>v.source==='funy'&&v.id===id);if(!x)return;const images=(x.images||[]).map(src=>`<img src="${esc(src)}" alt="게시물 첨부 이미지" loading="lazy">`).join('');const el=modalShell('funyTalkDetail',x.title,`<div><span class="funy-source funy">FUNY PIN</span><span class="funy-category">${esc(x.category)}</span></div><div class="talk-detail-meta">${esc(x.author)} · ${ago(x.publishedAt)}</div><div class="talk-detail-body">${esc(x.body)}</div>${images?`<div class="talk-detail-images">${images}</div>`:''}<button class="talk-report" type="button">게시물 신고하기</button>`);el.querySelector('.talk-report').onclick=()=>openReport(x.id,el);}

function openReport(postId,parent){
  if(!token()||!uid()){requestLogin('게시물 신고는 로그인 후 이용할 수 있어요.');return}
  const reasons=[['spam','도배 · 광고'],['abuse','욕설 · 괴롭힘'],['inappropriate','부적절한 콘텐츠'],['privacy','개인정보 노출'],['other','기타']];
  const wrap=document.createElement('div');wrap.className='talk-report-options';wrap.innerHTML=reasons.map(([v,l])=>`<button type="button" data-reason="${v}">${l}</button>`).join('');const old=parent.querySelector('.talk-report-options');old?.remove();parent.querySelector('.talk-community-sheet').appendChild(wrap);
  wrap.querySelectorAll('button').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{const r=await fetch(SB+'/rest/v1/community_post_reports',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:postId,reporter_user_id:uid(),reason:btn.dataset.reason})});if(!r.ok){const e=await r.json().catch(()=>({}));if(r.status===409)throw Error('이미 신고한 게시물이에요.');throw Error(e.message||'신고 처리에 실패했습니다.')}alert('신고가 접수되었습니다.');wrap.remove()}catch(e){alert(e.message||String(e))}finally{btn.disabled=false}});
}

function openEditor(){
  if(!token()||!uid()){requestLogin('게시물 등록은 로그인 후 이용할 수 있어요.');return}
  const el=modalShell('funyTalkEditor','게시물 등록',`<div class="talk-field"><label>게시판</label><select id="funyPostCategory">${CATS.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="talk-field"><label>제목</label><input id="funyPostTitle" maxlength="80" placeholder="제목을 입력해주세요"></div><div class="talk-field"><label>내용</label><textarea id="funyPostBody" maxlength="3000" placeholder="함께 나누고 싶은 이야기를 적어주세요"></textarea></div><div class="talk-field"><label>사진 · 최대 3장, 장당 5MB</label><label class="talk-photo-btn" for="funyPostPhotos">+ 사진 첨부</label><input class="talk-photo-input" id="funyPostPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="talk-photo-list" id="funyPhotoList"></div></div><div class="talk-policy">도배 방지를 위해 1분에 1개, 시간당 최대 5개까지 등록할 수 있어요. 카드 거래 게시물은 FUNY PIN 자체 게시판에서 지원하지 않습니다.</div><button class="talk-submit" id="funyPostSubmit" type="button">등록하기</button>`);
  const input=el.querySelector('#funyPostPhotos'),list=el.querySelector('#funyPhotoList');let files=[];
  const draw=()=>{list.innerHTML=files.map((f,i)=>`<div class="talk-photo-item"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-i="${i}">×</button></div>`).join('');list.querySelectorAll('button').forEach(b=>b.onclick=()=>{files.splice(Number(b.dataset.i),1);draw()})};
  input.onchange=()=>{const next=[...input.files];for(const f of next){if(files.length>=3)break;if(!['image/jpeg','image/png','image/webp'].includes(f.type)){alert('JPG, PNG, WebP 이미지만 첨부할 수 있어요.');continue}if(f.size>5*1024*1024){alert('이미지는 장당 5MB 이하만 첨부할 수 있어요.');continue}files.push(f)}draw();input.value=''};
  el.querySelector('#funyPostSubmit').onclick=async e=>{const btn=e.currentTarget,category=el.querySelector('#funyPostCategory').value,title=el.querySelector('#funyPostTitle').value.trim(),body=el.querySelector('#funyPostBody').value.trim();if(!title||!body){alert('제목과 내용을 입력해주세요.');return}btn.disabled=true;btn.textContent='등록 중…';try{const r=await fetch(SB+'/rest/v1/community_posts',{method:'POST',headers:{...headers(true),Prefer:'return=representation'},body:JSON.stringify({user_id:uid(),author_nickname:'-',category,title,body})});const data=await r.json().catch(()=>[]);if(!r.ok){const msg=String(data.message||'');if(msg.includes('POST_RATE_LIMIT_HOURLY'))throw Error('시간당 최대 5개의 게시물을 등록할 수 있어요.');if(msg.includes('POST_RATE_LIMIT_SHORT'))throw Error('게시물은 1분 간격으로 등록할 수 있어요.');throw Error(msg||'게시물 등록에 실패했습니다.')}const post=Array.isArray(data)?data[0]:data;if(!post?.id)throw Error('게시물 등록 결과를 확인하지 못했습니다.');for(let i=0;i<files.length;i++){const f=files[i],ext=f.type==='image/png'?'png':f.type==='image/webp'?'webp':'jpg',path=`${uid()}/${post.id}/${Date.now()}-${i}.${ext}`;const up=await fetch(SB+'/storage/v1/object/community-posts/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token(),'Content-Type':f.type,'x-upsert':'false'},body:f});if(!up.ok)throw Error('이미지 업로드에 실패했습니다.');const ir=await fetch(SB+'/rest/v1/community_post_images',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:post.id,user_id:uid(),storage_path:path,sort_order:i})});if(!ir.ok)throw Error('이미지 정보를 저장하지 못했습니다.')}el.remove();await refresh();alert('게시물이 등록되었습니다.')}catch(err){alert(err.message||String(err))}finally{btn.disabled=false;btn.textContent='등록하기'}};
}

async function refresh(){
  feed.innerHTML='<div class="loading">최신 이야기를 불러오는 중...</div>';
  const [funy,pokamo]=await Promise.all([loadFuny().catch(()=>[]),loadPokamo()]);
  const keep=pokamo.slice(0,pokamoLimit(funy.length));mixed=[...funy,...keep].sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));render();
}

if(fab){fab.removeAttribute('href');fab.removeAttribute('target');fab.setAttribute('aria-label','FUNY PIN에 글쓰기');const full=fab.querySelector('.fab-full');if(full)full.textContent='+ 게시물 등록';fab.onclick=e=>{e.preventDefault();openEditor()}}
bindFilters();
refresh();
})();
