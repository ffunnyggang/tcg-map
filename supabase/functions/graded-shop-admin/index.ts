import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {normalizeCard} from './normalize.ts';
const BASE=Deno.env.get('SUPABASE_URL')!,ANON=Deno.env.get('SUPABASE_ANON_KEY')!,SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'https://funypin.kr','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const errorMessages:Record<string,string>={REGISTERED_USER_REQUIRED:'퍼니핀 가입과 이메일 확인을 마친 계정이 필요합니다.',SHOP_NOT_FOUND:'운영 중인 카드샵을 선택해주세요.',SHOP_PERMISSION_REQUIRED:'해당 카드샵의 등록 권한이 없습니다.',DRAFT_EXPIRED:'카드정보 확인 시간이 만료됐습니다. PSA 번호를 다시 조회해주세요.',DRAFT_NOT_FOUND:'조회한 카드정보를 찾을 수 없습니다.',INVALID_PRICE:'판매가격은 1원부터 9,999,999,999원까지 정수로 입력해주세요.',ADMIN_REQUIRED:'전체 관리자만 권한을 설정할 수 있습니다.'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST only'},405);
 if(Number(req.headers.get('content-length')||0)>8192)return reply({error:'요청 크기가 너무 큽니다.'},413);
 try{
 const jwt=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
 if(!jwt)return reply({error:'로그인이 필요합니다.'},401);
 const user=createClient(BASE,ANON,{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false}});
 const {data:auth,error:authError}=await user.auth.getUser(jwt);
 if(authError||!auth.user||auth.user.is_anonymous)return reply({error:'로그인이 필요합니다.'},401);
 const db=createClient(BASE,SERVICE,{auth:{persistSession:false}}),body=await req.json(),action=body.action;
 const {data:isAdmin,error:adminError}=await user.rpc('is_funypin_admin');
 if(adminError)throw adminError;
 if(action==='bootstrap'){
  let shops;
  if(isAdmin===true){shops=await db.from('shops').select('id,name,address').eq('is_active',true).order('name')}
  else{const managers=await user.from('graded_shop_managers').select('shop_id').eq('user_id',auth.user.id).eq('is_active',true);if(managers.error)throw managers.error;const ids=managers.data.map(x=>x.shop_id);shops=ids.length?await db.from('shops').select('id,name,address').in('id',ids).eq('is_active',true).order('name'):{data:[],error:null}}
  if(shops.error)throw shops.error;
  return reply({is_admin:isAdmin===true,shops:shops.data,api_mode:Deno.env.get('RENAISS_API_KEY')&&Deno.env.get('RENAISS_API_SECRET')?'partner':'public'});
 }
 if(action==='permission_list'){
  if(isAdmin!==true)return reply({error:errorMessages.ADMIN_REQUIRED},403);
  const r=await db.from('graded_shop_managers').select('shop_id,user_id,is_active,updated_at,shops(name)').order('updated_at',{ascending:false}).limit(100);
  if(r.error)throw r.error;
  const ids=[...new Set(r.data.map(x=>x.user_id))],emails=new Map();
  for(const id of ids){const r=await db.auth.admin.getUserById(id);emails.set(id,r.data.user?.email||id)}
  return reply({rows:r.data.map(x=>({...x,email:emails.get(x.user_id)}))});
 }
 if(action==='permission_set'){
  if(isAdmin!==true)return reply({error:errorMessages.ADMIN_REQUIRED},403);
  if(typeof body.enabled!=='boolean'||!/^.{1,150}$/.test(body.shop_id||'')||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email||'')||body.email.length>254)return reply({error:'카드샵·가입 이메일·권한을 확인해주세요.'},400);
  const r=await user.rpc('set_graded_shop_manager',{p_shop_id:body.shop_id,p_email:body.email,p_enabled:body.enabled});
  if(r.error)return reply({error:errorMessages[r.error.message]||'권한 설정을 저장하지 못했습니다.'},r.error.code==='42501'?403:400);
  return reply(r.data);
 }
 if(action==='register'){
  if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(body.draft_id||'')||!Number.isSafeInteger(body.price_krw)||body.price_krw<1||body.price_krw>9999999999)return reply({error:errorMessages.INVALID_PRICE},400);
  const r=await user.rpc('register_shop_graded_card',{p_draft_id:body.draft_id,p_price_krw:body.price_krw});
  if(r.error)return reply({error:r.error.code==='23505'?'이미 판매 중으로 등록된 PSA 번호입니다.':errorMessages[r.error.message]||'상품을 등록하지 못했습니다. 다시 확인해주세요.'},r.error.code==='23505'?409:r.error.code==='42501'?403:400);
  return reply({registered:true,product_id:r.data});
 }
 const shop=String(body.shop_id||'');
 const {data:allowed,error:permissionError}=await user.rpc('can_manage_graded_shop',{p_shop_id:shop});
 if(permissionError||allowed!==true)return reply({error:errorMessages.SHOP_PERMISSION_REQUIRED},403);
 if(action==='list'){
  const r=await user.from('graded_products').select('id,card_name,price_krw,status,cert_number,created_at').eq('shop_id',shop).eq('is_sample',false).order('created_at',{ascending:false}).limit(50);
  if(r.error)throw r.error;return reply({rows:r.data});
 }
 if(action!=='lookup')return reply({error:'지원하지 않는 요청입니다.'},400);
 const cert=String(body.cert_number||'').trim().replace(/^PSA\s*/i,'');
 if(!/^[0-9]{6,12}$/.test(cert))return reply({error:'PSA 번호는 숫자 6~12자리로 입력해주세요.'},400);
 const cached=await db.from('graded_cert_cache').select('metadata,fetched_at').eq('cert_number',cert).maybeSingle();if(cached.error)throw cached.error;
 let metadata=cached.data&&Date.now()-Date.parse(cached.data.fetched_at)<6*3600000?cached.data.metadata:null;
 let quota=null;
 if(!metadata){
  const key=Deno.env.get('RENAISS_API_KEY'),secret=Deno.env.get('RENAISS_API_SECRET'),headers:Record<string,string>={Accept:'application/json'};
  if(Boolean(key)!==Boolean(secret))return reply({error:'Renaiss API 인증 설정을 확인해주세요.'},503);
  if(key&&secret){headers['X-Api-Key']=key;headers['X-Api-Secret']=secret}
  const response=await fetch('https://api.renaissos.com/v1/graded/PSA'+cert,{headers,redirect:'error',signal:AbortSignal.timeout(75000)});
  quota={remaining:response.headers.get('X-RateLimit-Remaining'),reset:response.headers.get('X-RateLimit-Reset')};
  if(response.status===429)return reply({error:'Renaiss 일일 조회 한도에 도달했습니다. 한도 초기화 후 다시 시도해주세요.',quota},429);
  if([401,403].includes(response.status))return reply({error:'Renaiss API 접근 권한을 확인해주세요.'},502);
  if(response.status===202)return reply({error:'Renaiss에서 카드정보를 확인 중입니다. 잠시 후 다시 조회해주세요.'},503);
  if(!response.ok)return reply({error:'Renaiss에서 카드정보를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.'},502);
  const raw=await response.json();
  try{metadata=normalizeCard(raw,cert)}catch(e){return reply({error:e instanceof Error?e.message:'카드정보를 확인할 수 없습니다.'},422)}
  const saved=await db.from('graded_cert_cache').upsert({cert_number:cert,metadata,fetched_at:new Date().toISOString()});
  if(saved.error)throw saved.error;
 }
 // Recheck assignment after a potentially slow upstream request.
 const check=await user.rpc('can_manage_graded_shop',{p_shop_id:shop});
 if(check.error||check.data!==true)return reply({error:errorMessages.SHOP_PERMISSION_REQUIRED},403);
 const draft=await db.from('graded_registration_drafts').insert({user_id:auth.user.id,shop_id:shop,cert_number:cert,metadata}).select('id,expires_at').single();
 if(draft.error)throw draft.error;
 return reply({card:metadata,draft_id:draft.data.id,expires_at:draft.data.expires_at,quota});
 }catch(e){if(e instanceof SyntaxError)return reply({error:'요청 형식을 확인해주세요.'},400);return reply({error:'처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.'},502)}
});
