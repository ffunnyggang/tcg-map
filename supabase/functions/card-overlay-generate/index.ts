// Test-only endpoint. No generation is enabled without explicit server-side configuration.
// verify_jwt=false: validate every user token with this project Auth /user below.
// This accepts current signing keys without trusting decoded client JWT claims.
const origins = new Set(['https://funypin.kr','https://www.funypin.kr']);
const env=(key:string)=>Deno.env.get(key)?.trim()||'';
function png(data:unknown){
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>8_000_000)throw Error('PNG_REQUIRED');
 const raw=atob(data.slice(22)),b=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(b.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>b[i]!==v))throw Error('PNG_REQUIRED');
 const d=new DataView(b.buffer);if(!((d.getUint32(16)===1024&&d.getUint32(20)===1536)||(d.getUint32(16)===1072&&d.getUint32(20)===1472)))throw Error('INVALID_SIZE');return b;
}
console.info('overlay_config '+JSON.stringify({apiKeyConfigured:!!env('OPENAI_API_KEY'),enabled:env('OVERLAY_ENABLED')==='true'}));
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='authorization,apikey,content-type,x-client-info';headers['Access-Control-Allow-Methods']='POST,OPTIONS';
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'허용되지 않은 요청입니다.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'POST 요청만 가능합니다.'},405);
 const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),service=env('SUPABASE_SERVICE_ROLE_KEY'),token=req.headers.get('Authorization')||'';
 const unauthorized=()=>reply({error:'로그인 세션이 만료됐거나 유효하지 않습니다. 다시 로그인해 주세요.',code:'AUTH_REQUIRED'},401);
 if(!/^Bearer [^\s]+$/i.test(token)||token.length>8192)return unauthorized();
 try{
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:token},signal:AbortSignal.timeout(10000)});
  if(auth.status===429||auth.status>=500)return reply({error:'로그인 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',code:'AUTH_UNAVAILABLE'},503);
  const user=await auth.json().catch(()=>null);
  if(!auth.ok||!user||typeof user.id!=='string'||!user.id||user.is_anonymous)return unauthorized();
  if(Number(req.headers.get('content-length')||0)>17_000_000)return reply({error:'이미지 크기가 너무 큽니다.'},413);
  const body=await req.text();if(body.length>17_000_000)return reply({error:'이미지 크기가 너무 큽니다.'},413);
  let data;try{data=JSON.parse(body);}catch{return reply({error:'올바른 요청이 아닙니다.'},400);}
  // app_metadata is admin-controlled; never authorize from user_metadata.
  const allowed=user.app_metadata?.card_overlay_test===true||env('OVERLAY_TEST_USER_IDS').split(',').map(s=>s.trim()).filter(Boolean).includes(user.id);
  const key=env('OPENAI_API_KEY'),enabled=env('OVERLAY_ENABLED')==='true';
  const ready=allowed&&enabled&&!!key;
  if(data.action==='status')return reply({ready,allowed,apiConfigured:allowed?!!key:undefined,message:!allowed?'현재 지정된 테스트 계정만 AI 생성을 사용할 수 있습니다.':!key?'테스트 계정 등록 완료 · AI API 키 연결 준비 중입니다. 확장 아트 불러오기는 사용할 수 있습니다.':!enabled?'테스트 계정 등록 완료 · AI 생성 활성화 준비 중입니다.':'AI 연결 완료 · 테스트 계정별 횟수 제한 없음 · 전체 하루 50회 시도 한도'});
  if(data.action==='references'||data.action==='reference'){
   if(!allowed)return reply({error:'테스트 계정만 사용할 수 있습니다.'},403);
   const h={apikey:service,Authorization:'Bearer '+service};
   if(data.action==='references'){
    const res=await fetch(url+'/rest/v1/overlay_art_references?select=id,card_number,display_name,art_rect,descriptor&order=card_number.asc&limit=500',{headers:h});
    if(!res.ok)throw Error('CATALOG_UNAVAILABLE');return reply({references:await res.json()});
   }
   if(typeof data.id!=='string'||!/^30th-en-[0-9]{3}$/.test(data.id))return reply({error:'올바른 참조 카드가 아닙니다.'},400);
   const res=await fetch(url+'/rest/v1/overlay_art_references?select=id,display_name,card_number,image_path,art_rect&id=eq.'+data.id,{headers:h});if(!res.ok)throw Error('CATALOG_UNAVAILABLE');const row=(await res.json())[0];if(!row)return reply({error:'등록된 이미지가 없습니다.'},404);
   const sign=await fetch(url+'/storage/v1/object/sign/overlay-art-references/'+row.image_path,{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});if(!sign.ok)throw Error('IMAGE_UNAVAILABLE');const signed=await sign.json();return reply({reference:{...row,imageUrl:url+'/storage/v1'+signed.signedURL}});
  }
  if(data.action==='report_quality'){
   if(!allowed)return reply({error:'테스트 계정만 보고할 수 있습니다.'},403);
   const valid=typeof data.requestId==='string'&&/^req_[a-zA-Z0-9]{1,100}$/.test(data.requestId)&&typeof data.accepted==='boolean'&&Number.isFinite(data.correlation)&&data.correlation>=-1.001&&data.correlation<=1.001&&Number.isFinite(data.mae)&&data.mae>=0&&data.mae<=255;
   if(!valid)return reply({error:'올바른 품질 보고가 아닙니다.'},400);
   console.info('overlay client quality',{requestId:data.requestId,accepted:data.accepted,correlation:data.correlation,mae:data.mae});
   return reply({reported:true});
  }
  const independent=data.action==='generate_background';
  const themes:Record<string,string>={forest:'a sunlit woodland clearing with foliage, moss and grasses',meadow:'an open grassy meadow under a softly clouded sky',ocean:'a calm ocean shoreline with gentle waves',space:'a quiet starfield with soft distant nebulae'};
  if(independent&&(!Object.hasOwn(themes,data.theme)||Object.keys(data).some(k=>!['action','theme'].includes(k))))return reply({error:'배경 테마만 전송해 주세요. 원본 이미지는 사용할 수 없습니다.'},400);
  if(data.action!=='generate'&&!independent)return reply({error:'지원하지 않는 요청입니다.'},400);
  if(!allowed)return reply({error:'AI 생성 테스트 대상 계정이 아닙니다.'},403);
  if(!ready)return reply({error:'AI 생성 연결 준비 중입니다.'},503);
  let image=new Uint8Array(),mask=new Uint8Array();try{if(!independent){image=png(data.image);mask=png(data.mask);}}catch{return reply({error:'이미지 형식 또는 크기가 올바르지 않습니다.'},400);}
  const imageView=new DataView(image.buffer),maskView=new DataView(mask.buffer),imageWidth=independent?1072:imageView.getUint32(16),imageHeight=independent?1472:imageView.getUint32(20);
  if(!independent&&(imageWidth!==maskView.getUint32(16)||imageHeight!==maskView.getUint32(20)))return reply({error:'이미지와 마스크 크기가 다릅니다.'},400);
  // Durable atomic quota slots, shared by all edge isolates. Markers are private,
  // created using service credentials; clients receive no bucket access.
  const storageHeaders={apikey:service,Authorization:'Bearer '+service};
  const bucket='overlay-generation-limits';
  const bucketRes=await fetch(url+'/storage/v1/bucket/'+bucket,{headers:storageHeaders});
  if(bucketRes.status===404||bucketRes.status===400){
   const create=await fetch(url+'/storage/v1/bucket',{method:'POST',headers:{...storageHeaders,'Content-Type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false,file_size_limit:1024,allowed_mime_types:['application/json']})});
   if(!create.ok){const check=await fetch(url+'/storage/v1/bucket/'+bucket,{headers:storageHeaders});if(!check.ok)throw Error('QUOTA_UNAVAILABLE');}
  }else if(!bucketRes.ok)throw Error('QUOTA_UNAVAILABLE');
  const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  async function reserve(prefix:string,max:number){for(let i=0;i<max;i++){
   const res=await fetch(`${url}/storage/v1/object/${bucket}/${day}/${prefix}/${i}.json`,{method:'POST',headers:{...storageHeaders,'Content-Type':'application/json','x-upsert':'false'},body:JSON.stringify({at:new Date().toISOString()})});
   if(res.ok)return true;const error=await res.json().catch(()=>({}));if(res.status!==409&&error.error!=='Duplicate'&&error.code!=='Duplicate'&&error.message!=='The resource already exists')throw Error('QUOTA_UNAVAILABLE');
  }return false;}
  // Allowlisted QA accounts have no per-account daily attempt limit.
  if(!await reserve('global',50))return reply({error:'오늘 테스트 전체 생성 한도에 도달했어요.'},429);
  const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const model=env('OVERLAY_IMAGE_MODEL')||'gpt-image-2.5-sunburst';
  const diagnostic={model,promptVersion:'overlay-background-continuity-v2',imageHash:await digest(image),maskHash:await digest(mask)};
  const form=new FormData();form.set('model',model);form.set('size',imageWidth+'x'+imageHeight);form.set('quality','medium');form.set('n','1');form.set('output_format','png');
  form.set('image[]',new Blob([image],{type:'image/png'}),'source.png');form.set('mask',new Blob([mask],{type:'image/png'}),'mask.png');
  const anchor=data.anchor;
  const hasAnchor=anchor&&['x','y','w','h'].every(k=>typeof anchor[k]==='number'&&Number.isFinite(anchor[k]))&&anchor.x>=0&&anchor.y>=0&&anchor.w>0&&anchor.h>0&&anchor.x+anchor.w<=imageWidth&&anchor.y+anchor.h<=imageHeight;
  const placement=hasAnchor?' The fixed source rectangle in the '+imageWidth+' by '+imageHeight+' canvas is x='+anchor.x.toFixed(1)+', y='+anchor.y.toFixed(1)+', width='+anchor.w.toFixed(1)+', height='+anchor.h.toFixed(1)+'.':'';
  form.set('prompt','Perform a localized background outpainting edit of the supplied canvas. The opaque region of the mask contains the fixed source illustration; keep this region unchanged at its exact pixel position and scale.'+placement+' Fill only the transparent masked area with the continuation of the existing environment. Continue the sky, horizon, ground, water, shadows, lighting and surface texture directly from each source edge. Keep the same horizon height and perspective. Do not recompose, recenter, zoom, rescale or move the source illustration. Do not redraw, repeat, mirror or duplicate its subject anywhere else. Do not extend a character or invent new body parts; only continue the surrounding scenery. Do not add characters, text, logos, borders, card UI or frames. Match the existing colors and texture at the boundary, without placing an outline, panel, collage seam or second copy of the illustration.');
  const background={model,size:'1072x1472',quality:'medium',n:1,output_format:'png',prompt:'Create a completely original portrait landscape of '+themes[data.theme]+'. Hand-painted illustration with subtle paper texture and calm natural colors. Continuous scenery across the entire canvas. No characters, creatures, animals, people, text, logos, frames or borders. This is an independent landscape, not a continuation of an existing image.'};
  if(independent)Object.assign(diagnostic,{promptVersion:'independent-landscape-v1',imageHash:undefined,maskHash:undefined});
  const response=await fetch('https://api.openai.com/v1/images/'+(independent?'generations':'edits'),{method:'POST',headers:{Authorization:'Bearer '+key,...(independent?{'Content-Type':'application/json'}:{})},body:independent?JSON.stringify(background):form,signal:AbortSignal.timeout(140000)});
  const result=await response.json();
  if(!response.ok){
   const safe=(v:unknown)=>typeof v==='string'?v.replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,100):'';
   const code=safe(result.error?.code),type=safe(result.error?.type);
   const requestId=response.headers.get('x-request-id');
   // Provider text stays server-side; redact credentials/data URLs and bound log size.
   const providerMessage=(typeof result.error?.message==='string'?result.error.message:'')
    .split(key).join('[redacted-key]').replace(/sk-[a-zA-Z0-9_-]+/g,'[redacted-key]')
    .replace(/data:image\/[^\s]+/g,'[redacted-image]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]').slice(0,700);
   console.error('overlay provider failure',{status:response.status,code,type,requestId,providerMessage,...diagnostic});
   let message='AI 생성 요청을 완료하지 못했어요. 운영자에게 문의해 주세요.';
   if(code==='moderation_blocked')message='OpenAI 이미지 생성 안전 검사에서 이 요청이 차단됐어요. 같은 요청을 반복하지 말고 운영자에게 문의해 주세요.';
   else if(code==='insufficient_quota'||type==='insufficient_quota'||code==='billing_hard_limit_reached')message='OpenAI API 잔액 또는 사용 한도가 부족합니다. OpenAI API 결제 설정에서 잔액과 한도를 확인해 주세요.';
   else if(response.status===429)message='OpenAI가 요청을 제한했습니다. API 결제 잔액·사용 한도를 확인하고, 문제가 없으면 잠시 후 다시 시도해 주세요.';
   else if(response.status===401)message='OpenAI API 키 인증에 실패했습니다. 서버에 등록한 키의 유효기간과 상태를 확인해 주세요.';
   else if(response.status===403)message='OpenAI 이미지 생성 권한이 없습니다. API 프로젝트의 모델 권한과 필요한 인증을 확인해 주세요.';
   else if(code==='model_not_found'||response.status===404)message='설정된 이미지 생성 모델을 사용할 수 없습니다. 운영자가 모델 설정과 접근 권한을 확인해야 합니다.';
   return reply({error:message+' 이번 요청은 생성 시도 횟수에 포함됩니다.',code:code||'PROVIDER_ERROR',requestId},code==='moderation_blocked'?400:response.status===429?429:502);
  }
  const output=result.data?.[0]?.b64_json;if(typeof output!=='string')throw Error('NO_IMAGE');
  console.info('overlay generation completed',{requestId:response.headers.get('x-request-id'),...diagnostic});
  return reply({image:output,requestId:response.headers.get('x-request-id')});
 }catch(error){console.error('overlay failure',error instanceof Error?error.name:'unknown');return reply({error:'요청을 완료하지 못했어요. 자동으로 다시 생성하지 않으며, 생성 시도가 한도에 포함될 수 있습니다.'},503);}
});
