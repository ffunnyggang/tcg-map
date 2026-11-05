(()=>{'use strict';
const $=id=>document.getElementById(id),BASE='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const DRAFT='funypin_draw_draft_v3',RUN='funypin_draw_run_v2',setup=document.body.dataset.view==='setup';
const THEMES=['purple','gold','halloween','ocean','image'];
function themeId(id){return THEMES.includes(id)?id:'purple'}
function safePattern(value){return typeof value==='string'&&value.length<700000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)?value:''}
function safeFull(value){return typeof value==='string'&&value.length<1000000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:''}
let patternImage='',fullImage='',imageMode='pattern',imageLoading=false;
function applyTheme(id,image,full,mode){document.body.dataset.theme=themeId(id);const pattern=safePattern(image),photo=safeFull(full),fullMode=mode==='full'&&!!photo;document.body.dataset.imageMode=fullMode?'full':'pattern';document.body.style.setProperty('--draw-pattern',pattern?'url("'+pattern+'")':'none');document.body.style.setProperty('--draw-full',photo?'url("'+photo+'")':'none');if($('imageThemeControls')){$('imageThemeControls').hidden=themeId(id)!=='image';$('patternPreview').hidden=!(photo||pattern);if(photo||pattern)$('patternPreview').src=photo||pattern;$('imageLayoutOptions').hidden=!(photo||pattern);$('imageFull').checked=fullMode;$('imagePattern').checked=!fullMode;$('imageFull').disabled=!photo}}

function decodeImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('이미지를 읽을 수 없습니다. PNG·JPG·WebP 파일로 다시 시도해주세요.'))};img.src=url})}
async function uploadPattern(){const file=$('configPattern').files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){$('imageStatus').textContent='10MB 이하의 PNG·JPG·WebP 이미지를 선택해주세요.';$('configPattern').value='';return}
 imageLoading=true;$('complete').disabled=true;$('imageStatus').textContent='배경 이미지를 준비하는 중입니다.';
 try{const img=await decodeImage(file),canvas=document.createElement('canvas');canvas.width=300;canvas.height=220;const ctx=canvas.getContext('2d'),scale=Math.min(180/img.naturalWidth,105/img.naturalHeight);ctx.translate(150,110);ctx.rotate(-24*Math.PI/180);ctx.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);const result=safePattern(canvas.toDataURL('image/png'));if(!result)throw Error('이미지 변환에 실패했습니다. 다른 이미지를 선택해주세요.');const large=document.createElement('canvas');let photo='';for(const limit of [1280,960,640]){const ratio=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));large.width=Math.max(1,Math.round(img.naturalWidth*ratio));large.height=Math.max(1,Math.round(img.naturalHeight*ratio));large.getContext('2d').drawImage(img,0,0,large.width,large.height);photo=safeFull(large.toDataURL('image/webp',.82));if(photo)break}if(!photo)throw Error('이미지를 저장 가능한 크기로 변환하지 못했습니다. 다른 이미지를 선택해주세요.');fullImage=photo;patternImage=result;$('configTheme').value='image';sync();$('imageStatus').textContent='이미지를 첨부했습니다. 전체 배경 또는 패턴 배경을 선택하세요.'}catch(e){$('imageStatus').textContent=e.message}finally{imageLoading=false;$('complete').disabled=!authorized;$('configPattern').value=''}
}
let authorized=false,busy=false,confirmed=false,pool=[],winners=[],config=null,prizes=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function rnd(n){const a=new Uint32Array(1),lim=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a)}while(a[0]>=lim);return a[0]%n}
async function adminToken(){let token=sessionStorage.getItem('funypin_admin_token')||'',refresh=sessionStorage.getItem('funypin_admin_refresh')||'';const verify=async t=>{const r=await fetch(BASE+'/rest/v1/rpc/is_funypin_admin',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:'{}'});return r.ok&&await r.json()===true};if(token&&await verify(token))return token;if(refresh){const r=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})});if(r.ok){const x=await r.json();if(x.access_token&&await verify(x.access_token)){sessionStorage.setItem('funypin_admin_token',x.access_token);sessionStorage.setItem('funypin_admin_refresh',x.refresh_token||refresh);return x.access_token}}}const a=window.FUNY_WEB_AUTH;if(a){await a.init();if(a.session?.access_token&&await verify(a.session.access_token))return a.session.access_token}throw Error('통합 어드민에서 로그인한 후 같은 탭으로 열어주세요.')}
function parseEntries(text){const raw=text.split(/[\n,;\t ]+/).map(s=>s.trim().replace(/^@/,'').toLowerCase()).filter(Boolean);const invalid=raw.filter(x=>!/^[a-z0-9._]{1,30}$/.test(x));return {list:[...new Set(raw)],invalid,duplicates:raw.length-new Set(raw).size}}
function total(){const n=Number($('configTotal').value);return Number.isInteger(n)&&n>=1&&n<=100?n:0}
function ranked(c){return c?.rankMode==='medals'}
function winnerLabel(i,c){const rank=c.prizes.length-i;return ranked(c)?(rank===1?'🥇 ':rank===2?'🥈 ':rank===3?'🥉 ':'')+rank+'등':(i+1)+'번째 당첨자'}
function readDraft(){return {fullImage,imageMode,patternImage,rankMode:$('configRankMode')?.value==='medals'?'medals':'sequence',theme:themeId($('configTheme')?.value),title:$('configTitle').value,description:$('configDescription').value,total:$('configTotal').value,prizes:prizes.slice(),warning:$('configWarning').value,entries:$('entries').value}}
function preview(c,list){applyTheme(c.theme,c.patternImage,c.fullImage,c.imageMode);$('eventTitle').textContent=c.title.trim()||'이벤트 추첨';$('eventDescription').textContent=c.description.trim();const oldPrizes=$('previewPrizes');if(oldPrizes){oldPrizes.replaceChildren();oldPrizes.hidden=true}$('previewCount').textContent='당첨 '+c.prizes.length+'명 · 참여자 '+list.length+'명'}
function sync(){const data=parseEntries($('entries').value),n=total();preview({...readDraft(),prizes:prizes.slice(0,n)},data.list);$('count').textContent='참여자 '+data.list.length+'명'+(data.duplicates?' · 중복 '+data.duplicates+'건 제외':'')+(data.invalid.length?' · 잘못된 ID: '+data.invalid.slice(0,5).join(', '):'');try{localStorage.setItem(DRAFT,JSON.stringify(readDraft()))}catch(e){}}
function renderPrizes(){const n=total();$('prizeFields').replaceChildren();for(let i=0;i<n;i++){if(typeof prizes[i]!=='string')prizes[i]='경품 입력 (예: 🎁포켓몬 30주년 기념 일판 1팩)';const row=document.createElement('div');row.className='prize-row';const label=document.createElement('label');label.htmlFor='gift-'+i;label.textContent=ranked(readDraft())?winnerLabel(i,{rankMode:'medals',prizes:Array(n)} )+' 경품':(i+1)+'번째 경품';const input=document.createElement('input');input.id='gift-'+i;input.maxLength=200;input.placeholder='경품 입력 (예: 🎁포켓몬 30주년 기념 일판 1팩)';input.value=prizes[i];input.addEventListener('input',()=>{prizes[i]=input.value;sync()});row.append(label,input);$('prizeFields').append(row)}sync()}
function setupPage(){
 $('setupView').hidden=false;
 try{
  const mode=new URLSearchParams(location.search).get('mode');
  let d=mode==='new'?null:JSON.parse(localStorage.getItem(DRAFT)||'null');
  if(mode==='edit'){const run=JSON.parse(sessionStorage.getItem(RUN)||'null');if(run?.config&&validConfig(run.config)){const c=run.config;d={...c,total:String(c.prizes.length),entries:c.entries.join('\n')}}}
  if(d){for(const [id,key] of [['configTitle','title'],['configDescription','description'],['configTotal','total'],['configWarning','warning'],['entries','entries']])if(typeof d[key]==='string')$(id).value=d[key];$('configTheme').value=themeId(d.theme);$('configRankMode').value=d.rankMode==='medals'?'medals':'sequence';patternImage=safePattern(d.patternImage);fullImage=safeFull(d.fullImage);imageMode=d.imageMode==='full'&&fullImage?'full':'pattern';if(Array.isArray(d.prizes))prizes=d.prizes.slice(0,100).map(x=>typeof x==='string'?x:'')}
  if(mode==='new'||mode==='edit')history.replaceState(null,'',location.pathname);
 }catch(e){}
 if(patternImage&&!fullImage)$('imageStatus').textContent='기존 이미지는 패턴으로 저장되어 있습니다. 전체 배경을 사용하려면 이미지를 다시 첨부해주세요.';
 $('configPattern').addEventListener('change',uploadPattern);
 for(const id of ['imageFull','imagePattern'])$(id).addEventListener('change',()=>{imageMode=$('imageFull').checked?'full':'pattern';sync()});
 $('removePattern').onclick=()=>{patternImage='';fullImage='';imageMode='pattern';$('imageStatus').textContent='배경 이미지를 제거했습니다.';sync()};

 renderPrizes();
 ['configTitle','configDescription','configWarning','entries','configTheme'].forEach(id=>$(id).addEventListener('input',sync));
 $('configTotal').addEventListener('input',renderPrizes);$('configRankMode')?.addEventListener('change',renderPrizes);
 $('complete').onclick=()=>{
  if(!authorized||imageLoading)return;
  const d=readDraft(),n=total(),data=parseEntries(d.entries);const fail=m=>$('configStatus').textContent=m;
  if(d.theme==='image'&&!safePattern(d.patternImage))return fail('배경 패턴으로 사용할 이미지를 첨부해주세요.');
  if(!d.title.trim())return fail('이벤트명을 입력해주세요.');
  if(!d.description.trim())return fail('이벤트 내용을 입력해주세요.');
  if(!n)return fail('당첨 인원은 1~100명의 정수로 입력해주세요.');
  if(prizes.slice(0,n).length!==n||prizes.slice(0,n).some(x=>!x.trim()))return fail('모든 당첨 순번의 경품을 입력해주세요.');
  if(data.invalid.length)return fail('형식이 올바르지 않은 참여자 ID를 수정해주세요.');
  if(data.list.length<n)return fail('당첨 인원 이상의 참여자가 필요합니다. 현재 '+data.list.length+'명입니다.');
  const snapshot={fullImage:safeFull(d.fullImage),imageMode:d.imageMode,patternImage:safePattern(d.patternImage),rankMode:d.rankMode,theme:themeId(d.theme),title:d.title.trim(),description:d.description.trim(),prizes:prizes.slice(0,n).map(x=>x.trim()),warning:d.warning.trim(),entries:data.list};
  try{sessionStorage.setItem(RUN,JSON.stringify({config:snapshot,winners:[]}))}catch(e){return fail('추첨 설정을 저장하지 못했습니다. 브라우저 저장 허용 후 다시 시도해주세요.')}
  location.href='/event-draw.html';
 };
}
function validConfig(c){return c&&typeof c.title==='string'&&typeof c.description==='string'&&typeof c.warning==='string'&&Array.isArray(c.prizes)&&c.prizes.length>=1&&c.prizes.length<=100&&c.prizes.every(x=>typeof x==='string'&&x.trim())&&Array.isArray(c.entries)&&c.entries.length>=c.prizes.length&&new Set(c.entries).size===c.entries.length&&c.entries.every(x=>typeof x==='string'&&/^[a-z0-9._]{1,30}$/.test(x))}
function update(){if(!config)return;const n=winners.length,next=n+1,done=n>=config.prizes.length;$('round').textContent=done?'추첨 완료':winnerLabel(n,config);$('stage').textContent=Math.min(next,config.prizes.length)+' / '+config.prizes.length;$('prizeText').textContent=done?'모든 당첨자가 선정됐습니다.':config.prizes[n];$('draw').disabled=!authorized||!confirmed||busy||!pool.length||done;$('draw').textContent=done?'추첨 완료':winnerLabel(n,config)+' 추첨 시작';$('downloadResults').disabled=!n;$('editConfig').disabled=!authorized||busy||n>0;$('newEvent').disabled=!authorized||busy}
function renderWinner(w,i){const item=document.createElement('div');item.className='winner on';const num=document.createElement('div');num.className='num';num.textContent=ranked(config)?winnerLabel(i,config):i+1;if(ranked(config)){const rank=config.prizes.length-i;num.className+=' rank-badge'+(rank<=3?' medal-'+rank:'');}const body=document.createElement('div'),name=document.createElement('b'),gift=document.createElement('small');name.textContent='@'+w;gift.textContent=config.prizes[i];body.append(name,gift);item.append(num,body);ranked(config)?$('results').prepend(item):$('results').append(item)}
function drawPage(){
 let state;try{state=JSON.parse(sessionStorage.getItem(RUN)||'null')}catch(e){}
 if(!state||!validConfig(state.config)||!Array.isArray(state.winners)||state.winners.length>state.config.prizes.length||new Set(state.winners).size!==state.winners.length||state.winners.some(x=>!state.config.entries.includes(x))){location.replace('/event-draw-setup.html');return false}
 config=state.config;winners=state.winners;pool=config.entries.filter(x=>!winners.includes(x));
 $('drawView').hidden=false;preview(config,config.entries);document.title=config.title+' 추첨 | FUNY PIN';
 winners.forEach(renderWinner);if(winners.length)$('slotId').textContent='@'+winners[winners.length-1];
 $('warningText').textContent=config.warning;$('rules').hidden=winners.length>=config.prizes.length;
 $('accept').onclick=()=>{confirmed=true;$('rules').hidden=true;$('status').textContent='추첨 준비 완료';update()};
 $('editConfig').onclick=()=>{if(authorized&&!busy&&!winners.length)location.href='/event-draw-setup.html?mode=edit'};
 $('newEvent').onclick=()=>{if(!authorized||busy)return;if(winners.length&&!confirm('새 이벤트 설정으로 이동할까요? 현재 결과는 먼저 다운로드해주세요.'))return;location.href='/event-draw-setup.html?mode=new'};
 $('draw').onclick=async()=>{
  if(!authorized||!confirmed||busy||!pool.length||winners.length>=config.prizes.length)return;
  busy=true;update();$('status').textContent='참여자 셔플 중...';
  for(let i=0;i<30;i++){$('slotId').textContent='@'+pool[rnd(pool.length)];await wait(55+i*2)}
  const index=rnd(pool.length),winner=pool[index],next=[...winners,winner];
  try{sessionStorage.setItem(RUN,JSON.stringify({config,winners:next}))}catch(e){$('status').textContent='결과 저장 실패로 추첨을 완료하지 못했습니다. 브라우저 저장 공간을 확인해주세요.';busy=false;update();return}
  pool.splice(index,1);const gift=config.prizes[winners.length];winners=next;
  renderWinner(winner,winners.length-1);$('slotId').textContent='@'+winner;$('slot').classList.add('won');$('status').textContent='🎉 '+winnerLabel(winners.length-1,config)+' 선정';
  $('finaleTitle').textContent='🎉 '+winnerLabel(winners.length-1,config);$('finaleId').textContent='@'+winner;$('finalePrize').textContent=gift;$('finale').classList.add('show');confetti();await wait(2400);
  $('finale').classList.remove('show');$('slot').classList.remove('won');busy=false;update();
 };
 $('downloadResults').onclick=()=>{if(!winners.length)return;const lines=[config.title,config.description,''];winners.forEach((id,i)=>lines.push(winnerLabel(i,config)+' · @'+id+' · '+config.prizes[i]));const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='funypin-draw-results.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 update();return true;
}
function confetti(){const colors=['#ffe18e','#c8a0ff','#ff77c6','#fff'];for(let i=0;i<70;i++){const e=document.createElement('span');e.className='confetti';e.style.left=rnd(100)+'vw';e.style.background=colors[rnd(colors.length)];e.style.animationDelay=rnd(400)+'ms';document.body.append(e);setTimeout(()=>e.remove(),2500)}}
async function init(){if(setup)setupPage();else if(!drawPage())return;try{await adminToken();authorized=true;$('authMessage').textContent='';if(setup){$('complete').disabled=false}else{$('status').textContent=winners.length===config.prizes.length?'추첨 완료 · 결과를 다운로드해주세요.':'추첨 안내 확인 후 시작하세요.';update()}}catch(e){$('authMessage').textContent=e.message||String(e)}}
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue=''}});
init();
})();