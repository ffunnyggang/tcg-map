// Test-only endpoint. No generation is enabled without explicit server-side configuration.
const origins = new Set(['https://funypin.kr','https://www.funypin.kr']);
const env=(key:string)=>Deno.env.get(key)?.trim()||'';
function png(data:unknown){
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>8_000_000)throw Error('PNG_REQUIRED');
 const raw=atob(data.slice(22)),b=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(b.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>b[i]!==v))throw Error('PNG_REQUIRED');
 const d=new DataView(b.buffer);if(d.getUint32(16)!==1024||d.getUint32(20)!==1536)throw Error('INVALID_SIZE');return b;
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
 try{
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:token},signal:AbortSignal.timeout(10000)});
  const user=await auth.json();if(!auth.ok||!user.id||user.is_anonymous)return reply({error:'로그인 후 이용해 주세요.'},401);
  if(Number(req.headers.get('content-length')||0)>17_000_000)return reply({error:'이미지 크기가 너무 큽니다.'},413);
  const body=await req.text();if(body.length>17_000_000)return reply({error:'이미지 크기가 너무 큽니다.'},413);
  let data;try{data=JSON.parse(body);}catch{return reply({error:'올바른 요청이 아닙니다.'},400);}
  // app_metadata is admin-controlled; never authorize from user_metadata.
  const allowed=user.app_metadata?.card_overlay_test===true||env('OVERLAY_TEST_USER_IDS').split(',').map(s=>s.trim()).filter(Boolean).includes(user.id);
  const key=env('OPENAI_API_KEY'),enabled=env('OVERLAY_ENABLED')==='true';
  const ready=allowed&&enabled&&!!key;
  if(data.action==='status')return reply({ready,allowed,apiConfigured:allowed?!!key:undefined,message:!allowed?'현재 지정된 테스트 계정만 AI 생성을 사용할 수 있습니다.':!key?'테스트 계정 등록 완료 · AI API 키 연결 준비 중입니다. 확장 아트 불러오기는 사용할 수 있습니다.':!enabled?'테스트 계정 등록 완료 · AI 생성 활성화 준비 중입니다.':'AI 연결 완료 · 1일 계정당 최대 3회 시도 · 실패·시간 초과도 시도 횟수에 포함됩니다.'});
  if(data.action!=='generate')return reply({error:'지원하지 않는 요청입니다.'},400);
  if(!allowed)return reply({error:'AI 생성 테스트 대상 계정이 아닙니다.'},403);
  if(!ready)return reply({error:'AI 생성 연결 준비 중입니다.'},503);
  let image,mask;try{image=png(data.image);mask=png(data.mask);}catch{return reply({error:'이미지 형식 또는 크기가 올바르지 않습니다.'},400);}
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
  if(!await reserve(user.id,3))return reply({error:'오늘 생성 시도 3회를 모두 사용했어요. 내일 다시 이용해 주세요.'},429);
  if(!await reserve('global',20))return reply({error:'오늘 테스트 전체 생성 한도에 도달했어요.'},429);
  const form=new FormData();form.set('model',env('OVERLAY_IMAGE_MODEL')||'gpt-image-2.5-sunburst');form.set('size','1024x1536');form.set('quality','medium');form.set('n','1');form.set('output_format','png');
  form.set('image[]',new Blob([image],{type:'image/png'}),'source.png');form.set('mask',new Blob([mask],{type:'image/png'}),'mask.png');
  form.set('prompt','Outpaint the illustration into all masked space. Keep the provided illustration precisely at its original position and scale. Seamlessly extend only its existing environment, colors, lighting, texture, brushwork and perspective to the whole canvas. Do not add text, borders, frames, card UI, logos, additional characters, or new body parts. The white empty area is not a frame: replace it entirely with the continued scenery. This will be printed as an overlay with the original illustration cut out.');
  const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+key},body:form,signal:AbortSignal.timeout(140000)});
  const result=await response.json();
  if(!response.ok){console.error('overlay provider failure',{status:response.status,requestId:response.headers.get('x-request-id')});return reply({error:'AI 생성 요청을 완료하지 못했어요. 운영자에게 문의해 주세요. 사용 한도에는 이번 시도가 포함됩니다.'},502);}
  const output=result.data?.[0]?.b64_json;if(typeof output!=='string')throw Error('NO_IMAGE');
  return reply({image:output});
 }catch(error){console.error('overlay failure',error instanceof Error?error.name:'unknown');return reply({error:'요청을 완료하지 못했어요. 자동으로 다시 생성하지 않으며, 생성 시도가 한도에 포함될 수 있습니다.'},503);}
});
