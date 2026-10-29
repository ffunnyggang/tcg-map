import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors={"Access-Control-Allow-Origin":"https://funypin.kr","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:cors});
const active=new Set<string>();
export function parseInstagram(value:unknown){try{const u=new URL(String(value)),m=u.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]{1,100})\/?$/);if(u.protocol!=="https:"||!["instagram.com","www.instagram.com"].includes(u.hostname)||u.username||u.password||u.port||!m)return null;return {url:`https://www.instagram.com/${m[1]}/${m[2]}/`,kind:m[1],code:m[2]}}catch{return null}}
export function pngSize(b:Uint8Array){if(b.length<24||[137,80,78,71,13,10,26,10].some((n,i)=>b[i]!==n))return null;const d=new DataView(b.buffer,b.byteOffset,b.byteLength);return {width:d.getUint32(16),height:d.getUint32(20)}}
async function boundedBody(r:Response,max:number){if(Number(r.headers.get('content-length')||0)>max)throw Error('캡처 이미지가 너무 큽니다.');const reader=r.body!.getReader(),chunks:Uint8Array[]=[];let total=0;for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('캡처 이미지가 너무 큽니다.')}chunks.push(value)}const out=new Uint8Array(total);let n=0;for(const c of chunks){out.set(c,n);n+=c.length}return out}

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST only'},405);
 let lock='';
 try{
  const url=Deno.env.get('SUPABASE_URL')!,jwt=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!jwt)return reply({error:'관리자 로그인이 필요합니다.'},401);
  const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false}});
  const {data:auth,error:authError}=await user.auth.getUser(jwt);
  if(authError||!auth.user)return reply({error:'관리자 로그인이 필요합니다.'},401);
  const {data:isAdmin,error:adminError}=await user.rpc('is_funypin_admin');
  if(adminError||isAdmin!==true)return reply({error:'관리자 권한이 필요합니다.'},403);
  if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'요청이 너무 큽니다.'},413);
  const input=parseInstagram((await req.json()).url);
  if(!input)return reply({error:'Instagram 게시물 또는 릴스 URL을 입력해주세요.',code:'INVALID_URL'},400);
  const userId=auth.user.id;if(active.has(userId))return reply({error:'진행 중인 캡처가 있습니다. 잠시 후 다시 시도해주세요.'},429);lock=userId;active.add(lock);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  // Immutable daily source cache avoids repeated external renders and preserves previous images.
  const path=`instagram-capture/${input.kind}-${input.code}/${new Date().toISOString().slice(0,10)}-frame-v1.png`;
  const image=db.storage.from('cms-images').getPublicUrl(path).data.publicUrl;
  const {data:cached}=await db.storage.from('cms-images').download(path);
  if(cached)return reply({image,source_url:input.url,provider:'thum.io',cached:true,width:1200,height:760,embed_width:540,embed_height:760});
  const target='https://funypin.kr/cms-instagram-capture-frame.html?url='+encodeURIComponent(input.url);
  const endpoint='https://image.thum.io/get/width/1200/crop/760/png/noanimate/?url='+encodeURIComponent(target);
  const r=await fetch(endpoint,{signal:AbortSignal.timeout(50000),redirect:'error'});
  if(!r.ok)return reply({error:'캡처 서비스가 응답하지 않았습니다. 잠시 후 다시 시도해주세요.',code:'CAPTURE_UNAVAILABLE'},502);
  const bytes=await boundedBody(r,8*1024*1024),size=pngSize(bytes);
  if(!size||size.width!==1200||size.height!==760)return reply({error:'정상 크기의 캡처 이미지를 받지 못했습니다.',code:'INVALID_CAPTURE'},502);
  const {error:upErr}=await db.storage.from('cms-images').upload(path,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'});
  if(upErr&&!/already exists|duplicate/i.test(upErr.message))return reply({error:'캡처 이미지 저장에 실패했습니다.',code:'STORAGE_FAILED'},502);
  return reply({image,source_url:input.url,provider:'thum.io',cached:false,width:1200,height:760,embed_width:540,embed_height:760});
 }catch(e){return reply({error:e instanceof Error&&e.name==='TimeoutError'?'캡처 시간이 초과되었습니다. 다시 시도해주세요.':'캡처에 실패했습니다. 기존 이미지는 유지됩니다.',code:'CAPTURE_FAILED'},502)}
 finally{if(lock)active.delete(lock)}
});
