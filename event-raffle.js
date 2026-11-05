(()=>{'use strict';
const $=id=>document.getElementById(id);
const setup=true;let generation=0,departed=false,memberId=null;const initialFields=Array.from(document.querySelectorAll('input,textarea,select')).map(el=>({el,value:el.value,checked:el.checked}));
const THEMES=['purple','gold','halloween','ocean','image'];
function themeId(id){return THEMES.includes(id)?id:'purple'}
function safePattern(value){return typeof value==='string'&&value.length<700000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)?value:''}
function safeFull(value){return typeof value==='string'&&value.length<1000000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)?value:''}
let patternImage='',fullImage='',imageMode='pattern',imageLoading=false;
function applyTheme(id,image,full,mode){document.body.dataset.theme=themeId(id);const pattern=safePattern(image),photo=safeFull(full),fullMode=mode==='full'&&!!photo;document.body.dataset.imageMode=fullMode?'full':'pattern';document.body.style.setProperty('--draw-pattern',pattern?'url("'+pattern+'")':'none');document.body.style.setProperty('--draw-full',photo?'url("'+photo+'")':'none');if($('imageThemeControls')){$('imageThemeControls').hidden=themeId(id)!=='image';$('patternPreview').hidden=!(photo||pattern);if(photo||pattern)$('patternPreview').src=photo||pattern;$('imageLayoutOptions').hidden=!(photo||pattern);$('imageFull').checked=fullMode;$('imagePattern').checked=!fullMode;$('imageFull').disabled=!photo}}

function decodeImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('이미지를 읽을 수 없습니다. PNG·JPG·WebP 파일로 다시 시도해주세요.'))};img.src=url})}
async function uploadPattern(){const file=$('configPattern').files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){$('imageStatus').textContent='10MB 이하의 PNG·JPG·WebP 이미지를 선택해주세요.';$('configPattern').value='';return}
 imageLoading=true;$('complete').disabled=true;$('imageStatus').textContent='배경 이미지를 준비하는 중입니다.';
 const epoch=generation;try{const img=await decodeImage(file);if(epoch!==generation||departed)return;const canvas=document.createElement('canvas');canvas.width=300;canvas.height=220;const ctx=canvas.getContext('2d'),scale=Math.min(180/img.naturalWidth,105/img.naturalHeight);ctx.translate(150,110);ctx.rotate(-24*Math.PI/180);ctx.drawImage(img,-img.naturalWidth*scale/2,-img.naturalHeight*scale/2,img.naturalWidth*scale,img.naturalHeight*scale);const result=safePattern(canvas.toDataURL('image/png'));if(!result)throw Error('이미지 변환에 실패했습니다. 다른 이미지를 선택해주세요.');const large=document.createElement('canvas');let photo='';for(const limit of [1280,960,640]){const ratio=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));large.width=Math.max(1,Math.round(img.naturalWidth*ratio));large.height=Math.max(1,Math.round(img.naturalHeight*ratio));large.getContext('2d').drawImage(img,0,0,large.width,large.height);photo=safeFull(large.toDataURL('image/webp',.82));if(photo)break}if(!photo)throw Error('이미지를 저장 가능한 크기로 변환하지 못했습니다. 다른 이미지를 선택해주세요.');fullImage=photo;patternImage=result;$('configTheme').value='image';sync();$('imageStatus').textContent='이미지를 첨부했습니다. 전체 배경 또는 패턴 배경을 선택하세요.'}catch(e){if(epoch===generation&&!departed)$('imageStatus').textContent=e.message}finally{if(epoch===generation&&!departed){imageLoading=false;updateComplete();$('configPattern').value=''}}
}
let authorized=false,busy=false,confirmed=false,pool=[],winners=[],config=null,prizes=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function rnd(n){const a=new Uint32Array(1),lim=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a)}while(a[0]>=lim);return a[0]%n}
function parseEntries(text){const raw=text.split(/[\n,;\t ]+/).map(s=>s.trim().replace(/^@/,'').toLowerCase()).filter(Boolean);const invalid=raw.filter(x=>!/^[a-z0-9._]{1,30}$/.test(x));return {list:[...new Set(raw)],invalid,duplicates:raw.length-new Set(raw).size}}
function total(){const n=Number($('configTotal').value);return Number.isInteger(n)&&n>=1&&n<=100?n:0}
function ranked(c){return c?.rankMode==='medals'}
function winnerLabel(i,c){const rank=c.prizes.length-i;return ranked(c)?(rank===1?'🥇 ':rank===2?'🥈 ':rank===3?'🥉 ':'')+rank+'등':(i+1)+'번째 당첨자'}
function readDraft(){return {effect:$('configEffect')?.value==='fancy'?'fancy':'basic',fullImage,imageMode,patternImage,rankMode:$('configRankMode')?.value==='medals'?'medals':'sequence',theme:themeId($('configTheme')?.value),title:$('configTitle').value,description:$('configDescription').value,total:$('configTotal').value,prizes:prizes.slice(),warning:$('configWarning').value,entries:$('entries').value}}
function preview(c,list){document.body.dataset.effect=c.effect==='fancy'?'fancy':'basic';applyTheme(c.theme,c.patternImage,c.fullImage,c.imageMode);$('eventTitle').textContent=c.title.trim()||'이벤트 추첨';$('eventDescription').textContent=c.description.trim();const oldPrizes=$('previewPrizes');if(oldPrizes){oldPrizes.replaceChildren();oldPrizes.hidden=true}$('previewCount').textContent='당첨 '+c.prizes.length+'명 · 참여자 '+list.length+'명'}
function updateComplete(){
 const d=readDraft(),n=total(),data=parseEntries(d.entries);
 const ready=!!d.title.trim()&&!!d.description.trim()&&n>0&&prizes.slice(0,n).length===n&&prizes.slice(0,n).every(x=>typeof x==='string'&&!!x.trim())&&!data.invalid.length&&data.list.length>=n&&(d.theme!=='image'||!!safePattern(d.patternImage));
 $('complete').disabled=!authorized||imageLoading||!ready;
}
function sync(){const data=parseEntries($('entries').value),n=total();preview({...readDraft(),prizes:prizes.slice(0,n)},data.list);$('count').textContent='참여자 '+data.list.length+'명'+(data.duplicates?' · 중복 '+data.duplicates+'건 제외':'')+(data.invalid.length?' · 잘못된 ID: '+data.invalid.slice(0,5).join(', '):'');updateComplete();}
function renderPrizes(){const n=total();$('prizeFields').replaceChildren();for(let i=0;i<n;i++){if(typeof prizes[i]!=='string')prizes[i]='';const row=document.createElement('div');row.className='prize-row';const label=document.createElement('label');label.htmlFor='gift-'+i;label.textContent=ranked(readDraft())?winnerLabel(i,{rankMode:'medals',prizes:Array(n)} )+' 경품':(i+1)+'번째 경품';const input=document.createElement('input');input.id='gift-'+i;input.maxLength=200;input.placeholder='경품 입력 (예: 🎁포켓몬 30주년 기념 일판 1팩)';input.value=prizes[i];input.addEventListener('input',()=>{prizes[i]=input.value;sync()});row.append(label,input);$('prizeFields').append(row)}sync()}
function setupPage(){
 $('setupView').hidden=false;
 $('configPattern').addEventListener('change',uploadPattern);
 for(const id of ['imageFull','imagePattern'])$(id).addEventListener('change',()=>{imageMode=$('imageFull').checked?'full':'pattern';sync()});
 $('removePattern').onclick=()=>{patternImage='';fullImage='';imageMode='pattern';$('imageStatus').textContent='배경 이미지를 제거했습니다.';sync()};

 renderPrizes();
 ['configTitle','configDescription','configWarning','entries','configTheme','configEffect'].forEach(id=>$(id).addEventListener('input',sync));
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
  const snapshot={effect:d.effect,fullImage:safeFull(d.fullImage),imageMode:d.imageMode,patternImage:safePattern(d.patternImage),rankMode:d.rankMode,theme:themeId(d.theme),title:d.title.trim(),description:d.description.trim(),prizes:prizes.slice(0,n).map(x=>x.trim()),warning:d.warning.trim(),entries:data.list};
  config=snapshot;winners=[];drawPage();$('setupView').hidden=true;window.scrollTo(0,0);
 };
}
function validConfig(c){return c&&typeof c.title==='string'&&typeof c.description==='string'&&typeof c.warning==='string'&&Array.isArray(c.prizes)&&c.prizes.length>=1&&c.prizes.length<=100&&c.prizes.every(x=>typeof x==='string'&&x.trim())&&Array.isArray(c.entries)&&c.entries.length>=c.prizes.length&&new Set(c.entries).size===c.entries.length&&c.entries.every(x=>typeof x==='string'&&/^[a-z0-9._]{1,30}$/.test(x))}
function update(){if(!config)return;const n=winners.length,next=n+1,done=n>=config.prizes.length;$('round').textContent=done?'추첨 완료':winnerLabel(n,config);$('stage').textContent=Math.min(next,config.prizes.length)+' / '+config.prizes.length;$('prizeText').textContent=done?'모든 당첨자가 선정됐습니다.':config.prizes[n];$('draw').disabled=!authorized||!confirmed||busy||!pool.length||done;$('draw').textContent=done?'추첨 완료':winnerLabel(n,config)+' 추첨 시작';$('downloadResults').disabled=!n;$('editConfig').textContent=n>0?'다시 추첨하기':'설정 수정';$('editConfig').disabled=!authorized||busy;$('newEvent').disabled=!authorized||busy}
function renderWinner(w,i){const item=document.createElement('div');item.className='winner on';const num=document.createElement('div');num.className='num';num.textContent=ranked(config)?winnerLabel(i,config):i+1;if(ranked(config)){const rank=config.prizes.length-i;num.className+=' rank-badge'+(rank<=3?' medal-'+rank:'');}const body=document.createElement('div'),name=document.createElement('b'),gift=document.createElement('small');name.textContent='@'+w;gift.textContent=config.prizes[i];body.append(name,gift);item.append(num,body);ranked(config)?$('results').prepend(item):$('results').append(item)}
function drawPage(){
 const state=config?{config,winners}:null;
 if(!state||!validConfig(state.config)||!Array.isArray(state.winners)||state.winners.length>state.config.prizes.length||new Set(state.winners).size!==state.winners.length||state.winners.some(x=>!state.config.entries.includes(x))){showSetup(true);return false}
 config=state.config;winners=state.winners;pool=config.entries.filter(x=>!winners.includes(x));
 $('drawView').hidden=false;preview(config,config.entries);
 winners.forEach(renderWinner);if(winners.length)$('slotId').textContent='@'+winners[winners.length-1];
 $('warningText').textContent=config.warning;$('rules').hidden=winners.length>=config.prizes.length;
 $('accept').onclick=()=>{confirmed=true;$('rules').hidden=true;$('status').textContent='추첨 준비 완료';update()};
 $('editConfig').onclick=async()=>{
  if(!authorized||busy)return;
  if(!winners.length){showSetup(false);return}
  
  winners=[];pool=config.entries.slice();confirmed=true;$('results').replaceChildren();$('slot').classList.remove('won');$('slotId').textContent='READY?';$('finale').classList.remove('show');update();
  $('status').textContent='재추첨 준비 완료 · 추첨 시작 버튼을 눌러주세요.';
 };
 $('newEvent').onclick=()=>{if(!authorized||busy)return;if(winners.length&&!confirm('새 이벤트 설정으로 이동할까요? 현재 결과는 먼저 복사해주세요.'))return;showSetup(true)};
 $('draw').onclick=async()=>{
  if(!authorized||!confirmed||busy||!pool.length||winners.length>=config.prizes.length)return;
  const epoch=generation;busy=true;update();const fancy=config.effect==='fancy';if(fancy)$('slot').classList.add('run');$('status').textContent='참여자 셔플 중...';
  for(let i=0;i<30;i++){$('slotId').textContent='@'+pool[rnd(pool.length)];await wait(55+i*2);if(epoch!==generation||departed)return}
  if(fancy){for(const number of ['3','2','1']){$('slotId').textContent=number;await wait(number==='1'?400:350);if(epoch!==generation||departed)return}}
  const index=rnd(pool.length),winner=pool[index],next=[...winners,winner];
  
  pool.splice(index,1);const gift=config.prizes[winners.length];winners=next;
  $('slot').classList.remove('run');renderWinner(winner,winners.length-1);$('slotId').textContent='@'+winner;$('slot').classList.add('won');$('status').textContent='🎉 '+winnerLabel(winners.length-1,config)+' 선정';
  $('finaleTitle').textContent='🎉 '+winnerLabel(winners.length-1,config);$('finaleId').textContent='@'+winner;$('finalePrize').textContent=gift;$('finale').classList.add('show');if(fancy){const rank=ranked(config)?config.prizes.length-winners.length+1:2;fancyConfetti(rank);if(rank===1){const flash=document.createElement('div');flash.className='draw-fancy-flash';document.body.append(flash);setTimeout(()=>flash.remove(),750)}await wait(rank===1?3400:2500)}else{confetti();await wait(2400)}
  if(epoch!==generation||departed)return;$('finale').classList.remove('show');$('slot').classList.remove('won');busy=false;update();
 };
 $('downloadResults').onclick=async()=>{
  if(!authorized||!config||!winners.length)return;
  const lines=[config.title,config.description,''];
  winners.forEach((id,i)=>lines.push(winnerLabel(i,config)+' · @'+id+' · '+config.prizes[i]));
  const text=lines.join('\n'),epoch=generation;
  let copied=false;
  // Copy inside the tap gesture for older iOS/Android WebViews.
  const active=document.activeElement,field=document.createElement('textarea');
  field.value=text;field.readOnly=true;field.setAttribute('aria-label','추첨 결과 복사');
  Object.assign(field.style,{position:'fixed',top:'0',left:'0',width:'1px',height:'1px',opacity:'0',fontSize:'16px'});
  try{document.body.append(field);field.focus({preventScroll:true});field.select();field.setSelectionRange(0,field.value.length);copied=document.execCommand('copy')}catch(_){}finally{field.remove();try{active?.focus({preventScroll:true})}catch(_){}}
  if(!copied&&navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);copied=true}catch(_){}}
  if(epoch!==generation||departed)return;
  resultCopyToast(copied?'추첨 결과를 복사했어요.':'복사하지 못했어요. 다시 시도해주세요.');
 };
 update();return true;
}
let resultCopyTimer;
function resultCopyToast(message){const el=$('shareToast');el.textContent=message;el.hidden=false;clearTimeout(resultCopyTimer);resultCopyTimer=setTimeout(()=>{if(!departed)el.hidden=true},2200)}
function fancyConfetti(rank){const colors=['#ffe8a9','#ffcb63','#ffffff','#bcb7c4','#e6a75d'];for(let i=0;i<(rank===1?125:rank===2?75:40);i++){const e=document.createElement('span');e.className='confetti fancy-confetti';e.style.left=rnd(100)+'vw';e.style.background=colors[rnd(3)];e.style.animationDelay=(rnd(400)/1000)+'s';document.body.append(e);setTimeout(()=>e.remove(),2200)}}
function confetti(){const colors=['#ffe18e','#c8a0ff','#ff77c6','#fff'];for(let i=0;i<70;i++){const e=document.createElement('span');e.className='confetti';e.style.left=rnd(100)+'vw';e.style.background=colors[rnd(colors.length)];e.style.animationDelay=rnd(400)+'ms';document.body.append(e);setTimeout(()=>e.remove(),2500)}}

function resetTool(){
 generation++;busy=false;confirmed=false;pool=[];winners=[];config=null;prizes=[];patternImage='';fullImage='';imageMode='pattern';imageLoading=false;
 initialFields.forEach(({el,value,checked})=>{el.value=value;if(typeof checked==='boolean')el.checked=checked});
 $('results').replaceChildren();$('patternPreview').removeAttribute('src');$('imageStatus').textContent='';$('configStatus').textContent='';$('slot').classList.remove('run','won');$('slotId').textContent='READY?';$('finale').classList.remove('show');$('rules').hidden=true;
 renderPrizes();updateComplete();
}
function showSetup(fresh){if(fresh)resetTool();$('drawView').hidden=true;$('setupView').hidden=false;$('rules').hidden=true;sync();window.scrollTo(0,0)}
function lockMember(message){$('memberLoading').hidden=true;authorized=false;memberId=null;resetTool();$('memberContent').hidden=true;$('memberGate').hidden=false;$('memberMessage').textContent=message||'로그인 회원만 이용할 수 있어요.'}
let authEpoch=0;
async function checkMember(){
 const check=++authEpoch;
 if(!authorized){$('memberLoading').hidden=false;$('memberGate').hidden=true}
 try{const auth=window.FUNY_WEB_AUTH;await auth.init();const session=auth.session;
 if(!session?.access_token){if(check===authEpoch&&!departed)lockMember();return}
 const {data,error}=await auth.client.auth.getUser(session.access_token);
 if(check!==authEpoch||departed)return;
 if(error||!data?.user||data.user.is_anonymous){lockMember('로그인 후 이벤트 추첨기를 이용해주세요.');return}
 if(memberId&&memberId!==data.user.id)resetTool();
 $('memberLoading').hidden=true;memberId=data.user.id;authorized=true;updateComplete();$('memberGate').hidden=true;$('memberContent').hidden=false;if(config)update();
 }catch(e){if(check===authEpoch&&!departed)lockMember('로그인 상태를 확인하지 못했어요. 다시 확인해주세요.')}
}
async function init(){
 setupPage();$('memberLogin').onclick=()=>window.FUNY_WEB_AUTH.goLogin('/event-raffle.html');$('memberRetry').onclick=checkMember;
 if(window.FUNY_WEB_AUTH){window.FUNY_WEB_AUTH.onChange(()=>{if(!departed)checkMember()});await checkMember()}
 else lockMember('로그인 기능을 불러오지 못했어요. 페이지를 새로고침해주세요.');
}
window.addEventListener('pagehide',()=>{departed=true;generation++;authEpoch++;authorized=false;memberId=null;pool=[];winners=[];prizes=[];config=null;patternImage='';fullImage='';initialFields.length=0;document.body.style.removeProperty('--draw-pattern');document.body.style.removeProperty('--draw-full');document.body.replaceChildren()});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
init();
})();