import {artEnglish,artText,artError,setArtLanguage,createArtMarkupRenderer} from './card-art-i18n.mjs?v=20261111-pdf1';
import {findAnniversarySymbolCenter,anniversarySymbolPlacement,usesCenteredAnniversarySymbol,PIKACHU_ANNIVERSARY_PLACEMENT} from './card-overlay-symbol.mjs?v=20261110-center1';
import {defaultArtWindow,windowPresetType} from './card-art-window-presets.mjs?v=20261108-presets1';
import {reviewMobileAlignment} from './card-art-align.mjs?v=20261111-pdf1';
import {createLayerFlow,prepareMobileLayerSource} from './card-art-layer-flow.mjs?v=20261108-layercache1';
import {decodeTextLayer} from './card-overlay-header.mjs?v=20261108-fulltext1';
import {IDENTITY_WIDE,renderManual} from './card-overlay-manual.mjs?v=20261108-cardfit1';
import {composeLayers} from './card-overlay-layers.mjs?v=20261110-center1';
import {alignWide} from './card-overlay-wide.mjs?v=20261107-wide3';
import {attachArtGestures} from './card-art-gestures.mjs?v=20261108-controls1';
import {createReviewPublisher} from './card-art-review.mjs?v=20261107-polish1';
import {fillSquareCorners} from './card-art-square.mjs?v=20261107-refine1';
import {pixelWindow,restoreSourceWindow,drawCardOverlay,drawCutGuide} from './card-art-geometry.mjs?v=20261107-flow3';
import {LANGUAGES,validWindow,insetWindow,nudgeWindow,searchArtCards,cardFilename} from './card-art-core.mjs?v=20261108-search1';
import {drawArtWatermark,makePrintSheet,withCardBleed} from './card-overlay-print.mjs?v=20261111-cutout2';
import {makePDF} from './card-overlay-core.mjs?v=20261023-ux3';
const $=id=>document.getElementById(id),A=window.FUNY_WEB_AUTH;
const artTitle=document.title;
const artLanguageButtons=document.querySelectorAll('[data-ui-language]');
const artMessages=new Map();
function showArtMessage(id,render){
 const node=document.createTextNode(render());
 $(id).replaceChildren(node);
 artMessages.set(id,()=>{
  if(node.parentNode===$(id))node.nodeValue=render();
 });
}
let step=1,rows=[],language='all',query='',page=0,selected=null,source=null,cut=null,result=null,resultWindow=null,ready=false,busy=false,selecting=false,exporting=false,renderEpoch=0,selectionEpoch=0,toastTimer,searchTimer,shape='round',catalogEpoch=0;
let draft=null,tuneMode='position',windowPreset=null,presetAdminClient=null,presetOnly=false,savingPreset=false;const refs=new Map();let squareResult=null,reviewPosting=false,reviewPosted=false,showExpanded=true;const reviewPublisher=createReviewPublisher(A);const outputArt=()=>layerSession?result:shape==='square'?(squareResult??=fillSquareCorners(result,canvas)):result;
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
let layerSession=null,assetsPromise=null;
let pdfExport=null,pendingLayerSave=Promise.resolve();
const BORDER_IDS=['holographic-border-v1','silver-glitter-border-v1','gold-star-border-v1','silver-satin-border-v1'];
async function sharedAsset(id){const d=await A.invokeFunction('card-overlay-generate',{action:'symbol_asset',assetId:id});return {id,image:await imageFrom(d.symbol.imageUrl),placement:d.symbol.placement};}
function loadLayerAssets(){if(!assetsPromise)assetsPromise=Promise.all([...BORDER_IDS.map(sharedAsset),sharedAsset('anniversary-yellow-umbreon-v1'),sharedAsset('anniversary-yellow-left-v1')]).then(a=>({borders:a.slice(0,4),right:a[4],left:a[5]})).catch(e=>{assetsPromise=null;throw e;});return assetsPromise;}
const layerFlow=createLayerFlow({invoke:body=>A.invokeFunction('card-overlay-generate',body),canvas,decodeText:decodeTextLayer,imageFrom,loadAssets:loadLayerAssets});
function resetLayers(){layerSession=null;layerFlow.reset();}
function composeMobileLayers(){if(!layerSession?.current)return;layerSession.layers={...layerSession.layers,shape};result=composeLayers(layerSession.source,renderManual(layerSession.image,layerSession.current,canvas),resultWindow,layerSession.layers,canvas);squareResult=null;drawResult();update();}
function saveLayers(){
 if(!layerSession?.data.generationId||!result)return;
 try{
  const payload={action:'save_result',id:layerSession.data.generationId,image:result.toDataURL('image/png'),printRect:resultWindow};
  pendingLayerSave=pendingLayerSave.then(()=>A.invokeFunction('card-overlay-generate',payload))
   .catch(()=>console.warn('Final artwork persistence failed'));
 }catch{console.warn('Final artwork persistence failed');}
}
function syncLayerControls(){if(!layerSession)return;const l=layerSession.layers;const labels={layerText:[artText('텍스트·기호'),l.showText?'ON':'OFF'],layerSymbol:[artText('30주년 심볼'),l.showSymbol?(({left:artText('왼쪽'),right:artText('오른쪽'),center:artText('중앙')}[l.symbolSide]||artText('오른쪽'))):'OFF'],layerBorder:[artText('테두리'),l.showBorder?({'holographic-border-v1':artText('홀로'),'silver-satin-border-v1':artText('실버'),'silver-glitter-border-v1':artText('실버 글리터'),'gold-star-border-v1':artText('골드 글리터')}[l.borderId]):'OFF'],layerCorner:[artText('모서리'),shape==='round'?artText('라운드'):artText('사각')]};for(const [id,[label,value]]of Object.entries(labels)){$(id).querySelector('[data-value]').textContent=value;$(id).setAttribute('aria-label',label+': '+value);$(id).classList.toggle('active',value!=='OFF');}}
async function matchIllustration(){if(!layerSession)return false;const picked=await reviewMobileAlignment({...layerSession,cutRect:layerSession.artRect,layers:null,shape,canvas});if(!picked)return false;layerSession.current=picked.matrix;resultWindow=Object.freeze({...layerSession.artRect});showExpanded=true;$('compareArt').textContent=artText('원본 보기');$('compareArt').setAttribute('aria-pressed','false');$('resultLoading').hidden=false;$('resultCanvas').style.visibility='hidden';goStep(3);try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));composeMobileLayers();syncLayerControls();}finally{$('resultLoading').hidden=true;$('resultCanvas').style.visibility='';}saveLayers();return true;}
$('adjustJoin').onclick=async()=>{if(busy||exporting)return;busy=true;update();try{await matchIllustration();}catch(e){toast(artError(e,'일러스트 창 크기를 확인해 주세요.'));}finally{busy=false;update();}};
function cycleLayer(kind){
 if(!layerSession||busy||exporting||reviewPosting)return;
 const l=layerSession.layers;
 if(kind==='text')l.showText=!l.showText;
 if(kind==='symbol'){
  const centered=usesCenteredAnniversarySymbol(selected);
  const next=l.showSymbol?(centered||l.symbolSide==='left'?'off':'left'):(centered?'center':'right');
  l.showSymbol=next!=='off';
  if(l.showSymbol){
   const asset=layerSession.assets[centered?'right':next];
   if(layerSession.symbolCenter===undefined){
    try{layerSession.symbolCenter=findAnniversarySymbolCenter(layerSession.source,layerSession.assets.right,canvas,{centerOnly:centered});}
    catch{layerSession.symbolCenter=null;}
   }
   l.symbolSide=next;
   l.symbol=asset.image;
   l.placement=centered?(layerSession.symbolCenter||PIKACHU_ANNIVERSARY_PLACEMENT):anniversarySymbolPlacement(asset,layerSession.symbolCenter);
  }
 }
 if(kind==='border'){
  const ids=['holographic-border-v1','silver-satin-border-v1','silver-glitter-border-v1','gold-star-border-v1'];
  const i=l.showBorder?ids.indexOf(l.borderId)+1:0;
  l.showBorder=i<ids.length;
  if(l.showBorder){
   const asset=layerSession.assets.borders.find(a=>a.id===ids[i]);
   l.borderId=asset.id;l.border=asset.image;
  }
 }
 if(kind==='corner')setShape(shape==='round'?'square':'round');
 else composeMobileLayers();
 syncLayerControls();
}
$('layerText').onclick=()=>cycleLayer('text');$('layerSymbol').onclick=()=>cycleLayer('symbol');$('layerBorder').onclick=()=>cycleLayer('border');$('layerCorner').onclick=()=>cycleLayer('corner');
function renderQuota(q,message){if(!q)return;showArtMessage('quotaNotice',()=>q.active&&q.unlimited?artText('관리자 계정 · 생성 횟수 제한 없음'):q.active?artText('11.8–11.14 무료 · 오늘 ')+q.used+artText('/3장 이용 · 매일 00시 초기화'):artText(message));$('quotaNotice').hidden=false;}
async function refreshQuota(){try{const s=await A.invokeFunction('card-overlay-generate',{action:'status',surface:'mobile'});ready=!!s.ready;renderQuota(s.quota,s.message);}catch{} }
function toast(message){$('toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',6000);}
function infoName(){return selected?selected.display_name+' · '+selected.card_number+' · '+artText(LANGUAGES[selected.source_language]||'샘플'):'';}
function update(){
 syncPDF();
 const preparingPDF=step===3&&pdfExport&&!pdfExport.file&&!pdfExport.error;
 const fallback=pdfExport?.fallback;
 $('pdfDelivery').hidden=!fallback;
 $('pdfFallback').hidden=!fallback;
 $('pdfContinue').hidden=!pdfExport?.requested;
 $('pdfDeliveryStatus').textContent=artText(pdfExport?.message||'');
 $('pdfDeliveryStatus').hidden=!pdfExport?.message;
 document.querySelector('.art-shell').classList.toggle('in-progress',step>1);document.querySelector('.art-shell').classList.toggle('is-complete',step===4);document.querySelector('.art-shell').classList.toggle('is-search',step===1);$('headerTitle').hidden=step===4;$('headerTest').hidden=true;$('back').hidden=step===4;$('closeCompletion').hidden=step!==4;$('closeCompletion').disabled=exporting||reviewPosting;
 for(let n=1;n<=3;n++)$('step'+n).hidden=step!==n;
 $('completion').hidden=step!==4;document.querySelector('.stepper').hidden=step===4;document.querySelector('.bottom-action').hidden=step===4;
 document.querySelectorAll('.stepper li').forEach((el,i)=>{el.classList.toggle('done',i+1<step);if(i+1===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
 document.querySelectorAll('.selected-name').forEach(el=>el.textContent=infoName());
 $('next').textContent=(exporting||preparingPDF)?artText('PDF를 준비하고 있어요'):step===1?artText('선택한 카드로 계속'):step===2?(result?artText('완성 아트 보기'):layerFlow.hasPending()?artText('일러스트 연결 맞추기'):artText('확장 아트 만들기')):artText('출력 도안 PDF 받기');
 $('next').disabled=busy||selecting||exporting||!!preparingPDF||(step===1?!source:step===2?!validWindow(cut)||!$('confirm').checked||!ready:!result);
 $('actionHint').textContent=selecting?artText('카드 원본을 불러오고 있어요'):'';$('actionHint').hidden=!selecting;
 $('back').disabled=busy||exporting||reviewPosting;$('downloadAgain').disabled=exporting||reviewPosting;$('completeAgain').disabled=exporting||reviewPosting;$('completeHome').disabled=exporting||reviewPosting;
 document.querySelectorAll('[data-shape],#layerOptions button,#adjustJoin,#openTune').forEach(b=>b.disabled=busy||exporting||reviewPosting);
}

function goStep(n){step=n;update();if(n===2)drawWindow($('windowCanvas'),cut);if(n===3)drawResult();if(n===4){$('reviewImage').src=outputArt().toDataURL('image/jpeg',.9);}window.scrollTo({top:0,behavior:'instant'});}
function drawWindow(c,r){if(!source||!r)return;const g=c.getContext('2d'),p=pixelWindow(r,c.width,c.height);g.clearRect(0,0,c.width,c.height);g.drawImage(source,0,0,c.width,c.height);g.fillStyle='#25143655';g.beginPath();g.rect(0,0,c.width,c.height);g.rect(p.x,p.y,p.w,p.h);g.fill('evenodd');drawCutGuide(g,r,c.width,c.height,.3);}
function drawResult(){if(!source||!result||!resultWindow)return;const c=$('resultCanvas'),g=c.getContext('2d');drawCardOverlay(g,source,outputArt(),resultWindow,c.width,c.height,showExpanded,shape);if(showExpanded){drawCutGuide(g,resultWindow,c.width,c.height,.3);drawArtWatermark(g,0,0,c.width,c.height);}}
async function reference(id){if(!refs.has(id)){const pending=readArtCatalog({action:'reference',id}).then(d=>d.reference).catch(e=>{refs.delete(id);throw e;});refs.set(id,pending);}return refs.get(id);}
async function imageFrom(url){const im=new Image();im.crossOrigin='anonymous';im.src=url;await im.decode();return im;}
function renderCards(){
 $('clearSearch').hidden=!$('search').value.length;
 const epoch=++renderEpoch,p=searchArtCards(rows,language,query,page);page=p.page;$('cards').replaceChildren();$('catalogStatus').textContent=query&&p.total>0?(artText('검색 결과 ')+p.total):'';$('languages').hidden=!query||p.total===0;$('pagination').hidden=!query||p.pages<=1;$('searchEmpty').hidden=!!query&&p.total>0;$('searchEmpty').classList.toggle('search-spacer',!query);$('searchEmpty').textContent=query?artText('검색 결과가 없어요. 카드명이나 번호를 다시 확인해 주세요.'):'';$('pageLabel').textContent=(page+1)+' / '+p.pages;$('prevPage').disabled=page===0;$('nextPage').disabled=page>=p.pages-1;
 const jobs=[];for(const row of p.rows){const b=document.createElement('button'),thumb=document.createElement('span'),name=document.createElement('strong'),number=document.createElement('small');b.type='button';b.className='card-choice'+(row.supported?'':' unsupported');b.setAttribute('aria-pressed',String(selected?.id===row.id));b.setAttribute('aria-label',row.display_name+' '+row.card_number+(row.supported?'':artText(' 확장 미지원')));thumb.className='card-thumb pending';if(!row.supported)thumb.dataset.unsupportedLabel=artText('확장 미지원');name.textContent=row.display_name;number.textContent=row.card_number+' · '+artText(LANGUAGES[row.source_language]);b.append(thumb,name,number);b.onclick=()=>choose(row);$('cards').append(b);jobs.push({row,thumb});}
 let i=0;async function worker(){while(epoch===renderEpoch&&i<jobs.length){const {row,thumb}=jobs[i++];try{const ref=await reference(row.id);if(epoch!==renderEpoch)return;const img=document.createElement('img');img.alt=row.display_name;img.loading='lazy';img.src=ref.imageUrl;img.onerror=()=>{thumb.classList.remove('pending');thumb.textContent=artText('이미지 준비 중');};thumb.replaceChildren(img);thumb.classList.remove('pending');}catch{if(epoch===renderEpoch){thumb.classList.remove('pending');const hint=document.createElement('span');hint.className='unavailable';hint.textContent=artText('이미지 연결 실패');thumb.replaceChildren(hint);}}}}
 for(let n=0;n<Math.min(4,jobs.length);n++)worker();
}
const presetLabels={regular:'일반형',evolution:'진화형',classic:'클래식형'};
const presetTable=(client=A.client)=>client.from('card_art_window_presets');
async function findPresetAdminClient(session){
 if(A.isAppShell())return null;
 let token='';
 try{token=sessionStorage.getItem('funypin_admin_token')||'';}catch{}
 const clients=token?[window.supabase.createClient(A.client.supabaseUrl,A.client.supabaseKey,{
  global:{headers:{Authorization:'Bearer '+token}},
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'funypin-art-preset-admin'}
 })]:[];
 if(session)clients.push(A.client);
 for(const client of clients){
  const {data,error}=await client.rpc('is_funypin_admin');
  if(!error&&data===true)return client;
 }
 return null;
}
async function readArtCatalog(body){
 if(!presetOnly)return A.invokeFunction('card-overlay-generate',body);
 const {data,error}=await presetAdminClient.functions.invoke('card-overlay-generate',{body});
 if(error)throw error;
 return data;
}
async function loadWindowPreset(card){
 const kind=windowPresetType(card);
 if(!kind)return null;
 try{
  const {data,error}=await presetTable().select('kind,x,y,w,h,revision').eq('kind',kind).maybeSingle();
  return !error&&validWindow(data)?data:null;
 }catch{return null;}
}
function currentWindowDefault(){
 if(!windowPreset)return defaultArtWindow(selected);
 const {x,y,w,h}=windowPreset;
 return {x,y,w,h};
}
async function choose(row){if(busy||exporting)return;if(!row.supported){toast(artText('이 카드는 일반 일러스트 창이 없는 타입으로 현재 확장을 지원하지 않아요.'));return;}const epoch=++selectionEpoch;selecting=true;update();try{const ref=await reference(row.id),card={...row,...ref};const [im,preset]=await Promise.all([imageFrom(ref.imageUrl),loadWindowPreset(card)]);if(epoch!==selectionEpoch)return;if(Math.abs(im.width/im.height-63/88)>.025)throw Error('정면 카드 비율이 맞지 않아 사용할 수 없어요.');const nextSource=prepareMobileLayerSource(im,canvas);const nextCut=preset?{x:preset.x,y:preset.y,w:preset.w,h:preset.h}:defaultArtWindow(card);resetLayers();selected=card;windowPreset=preset;source=nextSource;cut=nextCut;result=null;resultWindow=null;squareResult=null;reviewPublisher.reset();reviewPosted=false;$('reviewBody').value='';$('reviewBody').disabled=false;$('reviewSubmit').disabled=false;$('reviewStatus').textContent='';$('reviewLink').hidden=true;$('confirm').checked=false;$('generationError').hidden=true;renderCards();toast(row.display_name+artText(' 카드를 선택했어요.'));}catch(e){toast(artError(e,'카드를 불러오지 못했어요. 다시 선택해 주세요.'));}finally{if(epoch===selectionEpoch){selecting=false;update();}}}
async function connect(){
 const epoch=++catalogEpoch;
 presetAdminClient=null;presetOnly=false;
 $('reloadCatalog').hidden=true;showArtMessage('catalogStatus',()=>artText('카드 목록을 준비하고 있어요.'));
 try{
  const session=await A?.getSession();
  const admin=A?.client?await findPresetAdminClient(session).catch(()=>null):null;
  if(epoch!==catalogEpoch)return;
  presetAdminClient=admin;
  presetOnly=!session&&!!admin;
  if(!session&&!presetOnly){showAccess('로그인 후 카드 목록을 불러올 수 있어요.',true);return;}
  if(presetOnly){
   ready=false;
   showArtMessage('quotaNotice',()=>artText('관리자 · 일러스트 창 기본값 설정'));
   $('quotaNotice').hidden=false;
  }else{
   const status=await A.invokeFunction('card-overlay-generate',{action:'status',surface:'mobile'});
   if(epoch!==catalogEpoch)return;
   ready=!!status.ready;renderQuota(status.quota,status.message);
   if(!status.allowed){showAccess('현재 계정은 이 기능을 이용할 수 없습니다.',false);return;}
   if(!ready)toast(artError({message:status.message},'이미지 생성 서비스를 준비하고 있어요. 잠시 후 다시 이용해 주세요.'));
  }
  $('loginPanel').hidden=true;$('catalogArea').hidden=false;
  const d=await readArtCatalog({action:'mobile_catalog'});
  if(epoch!==catalogEpoch)return;
  rows=d.references||[];renderCards();
 }catch(e){
  if(epoch!==catalogEpoch)return;
  showArtMessage('catalogStatus',()=>e.message==='LOGIN_REQUIRED'?artText('로그인 후 이용해 주세요.'):artText('카드 목록 연결에 실패했어요.'));
  $('reloadCatalog').hidden=false;
  if(e.status===401||e.message==='LOGIN_REQUIRED')showAccess('로그인 세션이 만료됐어요. 다시 로그인해 주세요.',true);
 }finally{if(epoch===catalogEpoch)update();}
}
function showAccess(message,login){ready=false;if(login&&A){$('loginPanel').hidden=true;$('catalogArea').hidden=true;A.goLogin(location.href);return;}$('loginPanel').hidden=false;$('catalogArea').hidden=true;showArtMessage('accessMessage',()=>artText(message));$('login').hidden=!login;update();}
$('login').onclick=()=>A?.goLogin(location.href);$('reloadCatalog').onclick=connect;
for(const b of document.querySelectorAll('[data-language]'))b.onclick=()=>{if(busy)return;language=b.dataset.language;page=0;document.querySelectorAll('[data-language]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCards();};
$('searchForm').onsubmit=e=>{e.preventDefault();query=$('search').value.trim();language='all';page=0;document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language==='all')));renderCards();};$('search').oninput=()=>{$('clearSearch').hidden=!$('search').value.length;if(!$('search').value.trim()){query='';page=0;renderCards();}};$('prevPage').onclick=()=>{page--;renderCards();};$('nextPage').onclick=()=>{page++;renderCards();};
$('next').onclick=()=>{if($('next').disabled)return;if(step===1)goStep(2);else if(step===2)result?goStep(3):generate();else downloadPDF();};$('back').onclick=()=>{if(busy||exporting||reviewPosting)return;if(step>1)goStep(step-1);else location.href='/tcg-tools.html';};$('confirm').onchange=update;$('compareArt').onclick=()=>{showExpanded=!showExpanded;$('compareArt').textContent=showExpanded?artText('원본 보기'):artText('확장 아트 보기');$('compareArt').setAttribute('aria-pressed',String(!showExpanded));drawResult();};
function startAgain(){if(busy||exporting||reviewPosting)return;resetLayers();clearTimeout(searchTimer);query='';page=0;language='all';$('search').value='';document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language==='all')));$('generationError').hidden=true;setShape('round');selectionEpoch++;selected=null;source=null;result=null;resultWindow=null;cut=null;windowPreset=null;selecting=false;squareResult=null;reviewPublisher.reset();reviewPosted=false;$('reviewBody').value='';$('reviewBody').disabled=false;$('reviewSubmit').disabled=false;$('reviewStatus').textContent='';$('reviewLink').hidden=true;$('confirm').checked=false;goStep(1);renderCards();}
async function generate(){
 if(busy||!source||!selected||!validWindow(cut)||!$('confirm').checked)return;
 busy=true;update();$('generationError').hidden=true;$('workingTitle').textContent=artText('카드 밖으로 풍경을 넓히고 있어요');$('workingDialog').showModal();const minimumMotion=new Promise(resolve=>setTimeout(resolve,8000));const sourceSnapshot=source,selectionSnapshot=selected,windowSnapshot={...cut};
 try{
  if(!ready)throw Error('현재 계정은 AI 생성 준비가 되지 않았어요.');
  layerSession=layerSession||await layerFlow.generate(sourceSnapshot,selectionSnapshot.id,windowSnapshot,()=>{},{...selectionSnapshot.art_rect});
  if(!layerSession.initial){layerSession.layers.showSymbol=false;$('workingTitle').textContent=artText('원본과 연결 위치를 비교하고 있어요');try{const aligned=await alignWide(sourceSnapshot,layerSession.image,windowSnapshot,canvas,{allowManual:true});layerSession.initial=aligned.matrix;layerSession.trusted=aligned.trusted;}catch{layerSession.initial=[...IDENTITY_WIDE];layerSession.trusted=false;}}
  await minimumMotion;
  $('workingDialog').close();
  if(!await matchIllustration()){toast(artText('생성 이미지는 유지됩니다. 연결 맞추기를 이어서 완료해 주세요.'));return;}
  reviewPublisher.reset();reviewPosted=false;showExpanded=true;$('compareArt').textContent=artText('원본 보기');$('compareArt').setAttribute('aria-pressed','false');goStep(3);

 }catch(e){const el=$('generationError');el.hidden=false;showArtMessage('generationError',()=>artError(e,'생성 요청을 완료하지 못했어요.')+(e.data?.requestId?artText(' · 문의용 ID: ')+e.data.requestId:''));if(e.status===401||e.message==='LOGIN_REQUIRED'){const b=document.createElement('button');b.dataset.artMessage='다시 로그인하기';b.textContent=artText(b.dataset.artMessage);b.onclick=()=>A.goLogin(location.href);el.append(b);}if(e.data?.code==='moderation_blocked'){ready=false;const b=document.createElement('button');b.type='button';b.className='secondary';b.dataset.artMessage='카드 다시 선택하기';b.textContent=artText(b.dataset.artMessage);b.style.cssText='display:block;margin-top:12px;min-height:44px';b.onclick=()=>{if(busy||exporting||reviewPosting)return;startAgain();connect();$('search').focus();};el.append(b);}}
 finally{await refreshQuota();busy=false;$('workingDialog').close();update();}
}
$('workingDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});window.addEventListener('beforeunload',e=>{if(busy||reviewPosting){e.preventDefault();e.returnValue='';}});
function syncPDF(){
 const valid=step>=3&&result&&resultWindow&&selected;
 if(pdfExport&&(!valid||pdfExport.result!==result||pdfExport.window!==resultWindow||pdfExport.shape!==shape||pdfExport.card!==selected)){
  const oldUrl=pdfExport.url;
  if(oldUrl)setTimeout(()=>URL.revokeObjectURL(oldUrl),60000);
  $('pdfFallback').removeAttribute('href');
  pdfExport=null;
 }
 if(!valid||busy||pdfExport)return;
 const entry={result,window:resultWindow,shape,card:selected,file:null,error:null};
 pdfExport=entry;
 preparePDF(entry);
}
async function preparePDF(entry){
 try{
  // Let the result view paint before encoding the sheet.
  await new Promise(resolve=>setTimeout(resolve,0));
  if(pdfExport!==entry)return;
  const sheet=makePrintSheet(withCardBleed(outputArt()),entry.window,{shape:entry.shape,tolerance:0,bleed:2,windowGuideInset:0,trimMargin:.5,watermark:true,cutoutCard:entry.card});
  const jpg=await new Promise(resolve=>sheet.toBlob(resolve,'image/jpeg',.98));
  if(!jpg)throw Error('출력 도안을 만들지 못했어요.');
  const pdf=makePDF(new Uint8Array(await jpg.arrayBuffer()),sheet.width,sheet.height,83,118);
  if(pdfExport===entry)entry.file=new File([pdf],cardFilename(entry.card),{type:'application/pdf'});
 }catch(error){
  if(pdfExport===entry)entry.error=error;
 }finally{
  if(pdfExport===entry)update();
 }
}
function offerPDFDownload(entry,message){
 const link=$('pdfFallback');
 entry.url??=URL.createObjectURL(entry.file);
 link.href=entry.url;
 link.download=entry.file.name;
 entry.fallback=true;
 entry.message=message;
 if(step===4)goStep(3);
 else update();
}
async function downloadPDF(){
 if(exporting||!pdfExport)return;
 const entry=pdfExport;
 if(entry.error){
  pdfExport=null;
  toast(artError(entry.error,'PDF 저장에 실패했어요.'));
  update();
  return;
 }
 if(!entry.file)return;
 const app=A?.isAppShell?.();
 const shareData={files:[entry.file]};
 exporting=true;
 update();
 try{
  if(app){
   if(navigator.canShare?.(shareData)){
    await navigator.share({...shareData,title:artText('일러스트 확장 출력 도안')});
    saveLayers();
    goStep(4);
   }else{
    offerPDFDownload(entry,'이 환경에서는 파일 공유를 사용할 수 없어요. PDF 직접 저장을 시도해 주세요.');
   }
  }else{
   const url=URL.createObjectURL(entry.file),link=document.createElement('a');
   link.href=url;
   link.download=entry.file.name;
   document.body.append(link);
   try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
   saveLayers();
   goStep(4);
  }
 }catch(error){
  if(app){
   offerPDFDownload(entry,'공유를 완료하지 못했어요. 다시 시도하거나 PDF 직접 저장을 눌러 주세요.');
  }else{
   toast(artError(error,'PDF 저장에 실패했어요.'));
  }
 }finally{
  exporting=false;
  update();
 }
}
$('pdfFallback').onclick=e=>{
 if(exporting||!pdfExport?.fallback){e.preventDefault();return;}
 pdfExport.requested=true;
 pdfExport.message='저장 여부는 기기의 다운로드 목록에서 확인해 주세요.';
 saveLayers();
 update();
};
$('pdfContinue').onclick=()=>{if(!exporting&&pdfExport?.requested)goStep(4);};
function setShape(value){shape=value;document.querySelectorAll('[data-shape]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shape===shape)));$('resultCanvas').style.borderRadius=shape==='round'?'10px':'0';document.querySelector('.card-stage.result').classList.toggle('square',shape==='square');if(layerSession?.current)composeMobileLayers();else if(result){drawResult();update();}}
for(const b of document.querySelectorAll('[data-shape]'))b.onclick=()=>{if(!exporting)setShape(b.dataset.shape);};
$('closeCompletion').onclick=()=>{if(!exporting&&!reviewPosting)location.href='/tcg-tools.html';};
$('completeHome').onclick=()=>{if(exporting||reviewPosting)return;if(window.ReactNativeWebView?.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/(tabs)'}));return;}location.href='/';};
$('reviewLink').onclick=e=>{if(!window.ReactNativeWebView?.postMessage)return;e.preventDefault();e.stopPropagation();const postId=new URL(e.currentTarget.href).hash.split('/')[2];try{const at=Date.now();localStorage.setItem('funypin:talk:pending-tab:v1',JSON.stringify({tab:'all',postId,at}));window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/(tabs)/talk?__tabRefresh='+at}));}catch{location.href=e.currentTarget.href;}};
$('downloadAgain').onclick=downloadPDF;$('completeAgain').onclick=startAgain;
// Adjustment is staged until Apply. Previous results are invalidated only on an actual change.
$('openTune').onclick=()=>{if(!source||!cut)return;draft={...cut};$('presetTools').hidden=!presetAdminClient||!windowPreset;if(windowPreset)$('saveWindowPreset').textContent=artEnglish?'Save '+artText(presetLabels[windowPreset.kind])+' default':artText(presetLabels[windowPreset.kind])+' 기본값으로 저장';tuneMode='position';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode==='position')));renderTune();$('tuneDialog').showModal();tuneGestures.reset();};
function renderTune(){drawWindow($('tuneCanvas'),draft);$('tuneStatus').textContent=artText('왼쪽 ')+draft.x.toFixed(1)+artText(' · 위 ')+draft.y.toFixed(1)+artText(' · 너비 ')+draft.w.toFixed(1)+artText(' · 높이 ')+draft.h.toFixed(1)+'mm';const pad=document.querySelector('.nudge-pad'),buttons=Array.from(document.querySelectorAll('[data-direction]')),order=tuneMode==='position'?['left','right','up','down']:['right','left','up','down'];pad.dataset.editMode=tuneMode;if(order.some((dir,i)=>pad.children?.[i]?.dataset.direction!==dir))for(const dir of order)pad.append(buttons.find(b=>b.dataset.direction===dir));const labels=tuneMode==='position'?{up:artText('창 위로'),down:artText('창 아래로'),left:artText('창 왼쪽으로'),right:artText('창 오른쪽으로')}:{up:artText('높이 늘리기'),down:artText('높이 줄이기'),left:artText('너비 줄이기'),right:artText('너비 늘리기')};for(const b of document.querySelectorAll('[data-direction]')){b.setAttribute('aria-label',labels[b.dataset.direction]+' 0.1mm');b.textContent=(tuneMode==='position'?{up:'↑',down:'↓',left:'←',right:'→'}:{up:artText('높이 +'),down:artText('높이 -'),right:artText('너비 +'),left:artText('너비 -')})[b.dataset.direction];}}
$('cancelTune').onclick=()=>$('tuneDialog').close();const tuneGestures=attachArtGestures($('tuneViewport'),$('tuneCanvas'));$('tuneDialog').addEventListener('close',()=>tuneGestures.clear());
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{tuneMode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderTune();};
for(const b of document.querySelectorAll('[data-direction]')){let start,repeat;const stop=()=>{clearTimeout(start);clearInterval(repeat);};const change=()=>{if(draft&&!savingPreset){draft=nudgeWindow(draft,tuneMode,b.dataset.direction);renderTune();}};b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);change();start=setTimeout(()=>repeat=setInterval(change,80),350);};b.onpointerup=stop;b.onpointercancel=stop;b.onlostpointercapture=stop;b.onclick=e=>{if(e.detail===0)change();};}
$('resetTune').onclick=()=>{if(savingPreset)return;draft=currentWindowDefault();renderTune();};$('applyTune').onclick=()=>{if(savingPreset||!validWindow(draft))return;if(JSON.stringify(cut)!==JSON.stringify(draft)){cut={...draft};if(layerSession)layerSession.artRect={...cut};result=null;resultWindow=null;squareResult=null;reviewPublisher.reset();reviewPosted=false;$('reviewBody').value='';$('reviewBody').disabled=false;$('reviewSubmit').disabled=false;$('reviewStatus').textContent='';$('reviewLink').hidden=true;$('confirm').checked=false;}drawWindow($('windowCanvas'),cut);$('tuneDialog').close();update();};

$('tuneDialog').addEventListener('cancel',e=>{if(savingPreset)e.preventDefault();});
$('saveWindowPreset').onclick=async()=>{
 if(!presetAdminClient||!windowPreset||savingPreset||!validWindow(draft))return;
 const {kind,revision}=windowPreset;
 const rect={...draft};
 if(!window.confirm(artEnglish?'Set this as the default artwork cutout for all '+artText(presetLabels[kind])+' cards?':artText(presetLabels[kind])+' 카드 전체의 기본 일러스트 창을 이 설정으로 변경할까요?'))return;
 const controls=['saveWindowPreset','cancelTune','resetTune','applyTune'].map($);
 savingPreset=true;
 controls.forEach(b=>b.disabled=true);
 try{
  const {data,error}=await presetTable(presetAdminClient).update({...rect,revision:revision+1})
   .eq('kind',kind).eq('revision',revision).select('kind,x,y,w,h,revision').maybeSingle();
  if(error)throw error;
  if(!data){
   windowPreset=await loadWindowPreset(selected);
   $('presetTools').hidden=!windowPreset;
   toast(artText('저장하지 못했어요. 기본값을 다시 확인해 주세요.'));
   return;
  }
  windowPreset=data;
  draft=rect;
 }catch{
  toast(artText('기본값을 저장하지 못했어요. 다시 시도해 주세요.'));
  return;
 }finally{
  savingPreset=false;
  controls.forEach(b=>b.disabled=false);
 }
 $('applyTune').click();
 toast(artEnglish?artText(presetLabels[kind])+' default saved.':artText(presetLabels[kind])+' 기본값을 저장했어요.');
};

// The same entry notice and footer content; always show on page entry.
$('modalNotice').append($('noticeContent').content.cloneNode(true));$('stepNotice').append($('noticeContent').content.cloneNode(true));
$('acceptNotice').onclick=()=>$('noticeDialog').close();$('noticeDialog').showModal();window.addEventListener('pageshow',e=>{if(e.persisted&&!$('noticeDialog').open)$('noticeDialog').showModal();});
$('reviewForm').onsubmit=async e=>{e.preventDefault();if(reviewPosting||reviewPosted||!result)return;const body=$('reviewBody').value.trim();if(!body)return;reviewPosting=true;$('reviewSubmit').disabled=true;$('reviewBody').disabled=true;showArtMessage('reviewStatus',()=>artText('후기를 등록하고 있어요.'));update();try{const id=await reviewPublisher.publish({image:outputArt(),title:(selected.display_name+artText(' 확장 아트 사용 후기')).slice(0,80),body});reviewPosted=true;showArtMessage('reviewStatus',()=>artText('TALK 자유게시판에 후기를 등록했어요.'));$('reviewLink').href='/talk.html?from=card-art#/post/'+encodeURIComponent(id);$('reviewLink').hidden=false;}catch(err){showArtMessage('reviewStatus',()=>artError(err,'후기 등록에 실패했어요.'));$('reviewBody').disabled=false;}finally{reviewPosting=false;$('reviewSubmit').disabled=reviewPosted;update();}};
const renderArtMarkup=createArtMarkupRenderer(document.body);
function renderArtLanguage(){
 document.documentElement.lang=artEnglish?'en':'ko';
 document.title=artText(artTitle);
 for(const button of artLanguageButtons){
  button.setAttribute('aria-pressed',String(button.dataset.uiLanguage===document.documentElement.lang));
 }
 renderArtMarkup();
}
for(const button of artLanguageButtons){
 button.onclick=()=>{
  if(button.dataset.uiLanguage===document.documentElement.lang)return;
  setArtLanguage(button.dataset.uiLanguage);
  renderArtLanguage();
  artMessages.forEach(render=>render());
  $('generationError').querySelectorAll('[data-art-message]').forEach(el=>el.textContent=artText(el.dataset.artMessage));
  $('compareArt').textContent=showExpanded?artText('원본 보기'):artText('확장 아트 보기');
  $('toast').textContent='';
  if(query&&rows.length)renderCards();
  syncLayerControls();
  update();
 };
}
renderArtLanguage();
update();connect();
A?.onChange?.(()=>{if(!busy)connect();});


$('clearSearch').onpointerdown=e=>e.preventDefault();$('clearSearch').onclick=()=>{$('search').value='';$('search').oninput();$('search').focus();};

/* Keep native header/status-bar dim in sync with every artwork dialog. */
let artOverlayOpen=false;
function syncArtOverlay(force=false){
 const open=!!document.querySelector('dialog[open]');
 if(!force&&open===artOverlayOpen)return;
 artOverlayOpen=open;
 try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'FUNY_WEB_OVERLAY_STATE',source:'card-art',open,navMode:open?'dim':'none'}));}catch{}
 window.FUNY_WEB_SAFE_AREA_REFRESH?.();
}
new MutationObserver(()=>syncArtOverlay()).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
window.addEventListener('pageshow',()=>syncArtOverlay(true));
window.addEventListener('pagehide',()=>{
 artOverlayOpen=false;
 try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'FUNY_WEB_OVERLAY_STATE',source:'card-art',open:false,navMode:'none'}));}catch{}
});
syncArtOverlay(true);
