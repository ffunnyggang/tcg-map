import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.4";
import {parsePost,profileUsername,extractHeaderAuthors,resolveShop} from './matcher.mjs';
const cors={'Access-Control-Allow-Origin':'https://funypin.kr','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:cors});
async function text(r:Response,max=1500000){if(!r.ok)throw Error('lookup');const reader=r.body!.getReader();let total=0,out='';const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw Error('too_large')}out+=decoder.decode(value,{stream:true})}return out+decoder.decode()}
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return reply({error:'POST only'},405);try{
 const jwt=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'',user=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false}});
 const {data:auth,error}=await user.auth.getUser(jwt);if(error||!auth.user)return reply({error:'관리자 로그인 필요'},401);
 const {data:admin,error:adminError}=await user.rpc('is_funypin_admin');if(adminError||admin!==true)return reply({error:'관리자 권한 필요'},403);
 if(Number(req.headers.get('content-length')||0)>2048)return reply({error:'요청이 너무 큽니다.'},413);
 const input=parsePost((await req.json()).url);if(!input)return reply({status:'unassigned',reason:'invalid_url'},400);
 const {data:shops,error:shopError}=await user.from('shops').select('id,name,instagram_url,is_active').eq('is_active',true);if(shopError)throw shopError;
 const exactIds:string[]=[],authors:string[]=[];
 // Only an exact normalized post code is trusted; never title text or OCR.
 try{const r=await fetch('https://funypin.kr/data/instagram-feed.json',{signal:AbortSignal.timeout(4000)}),feed=JSON.parse(await text(r));for(const [id,value] of Object.entries(feed.shops||{})){const row=value as {username?:string,posts?:{permalink:string}[]};if(row.posts?.some(p=>parsePost(p.permalink)?.code===input.code)){exactIds.push(id);if(row.username)authors.push(row.username)}}}catch{}
 try{const {data:rows}=await user.from('shop_contents').select('shop_id,url').eq('status','published').ilike('url','%'+input.code+'%').limit(100);for(const row of rows||[])if(parsePost(row.url)?.code===input.code){exactIds.push(row.shop_id);const shop=shops?.find(s=>s.id===row.shop_id),name=profileUsername(shop?.instagram_url);if(name)authors.push(name)}}catch{}
 if(exactIds.length){const match=resolveShop(shops||[],{authors,exactIds,source:'collected_url'});if(match.status==='matched'||match.reason==='ambiguous')return reply({...match,url:input.url})}
 try{const r=await fetch(input.url+'embed/',{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'Mozilla/5.0 (compatible; FUNYPIN CMS)','Accept':'text/html'}}),html=await text(r),owner=extractHeaderAuthors(html);if(!owner.length)return reply({status:'unassigned',reason:'author_unavailable',url:input.url});return reply({...resolveShop(shops||[],{authors:owner,source:'instagram_author'}),url:input.url})}catch{return reply({status:'unassigned',reason:'lookup_failed',url:input.url})}
 }catch{return reply({status:'unassigned',reason:'lookup_failed'},502)}});
