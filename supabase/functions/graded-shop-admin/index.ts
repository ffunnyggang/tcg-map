import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {normalizeCard} from './normalize.ts';
const BASE=Deno.env.get('SUPABASE_URL')!,ANON=Deno.env.get('SUPABASE_ANON_KEY')!,SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'https://funypin.kr','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const errorMessages:Record<string,string>={REGISTERED_USER_REQUIRED:'퍼니핀 가입과 이메일 확인을 마친 계정이 필요합니다.',SHOP_NOT_FOUND:'운영 중인 카드샵을 선택해주세요.',SHOP_PERMISSION_REQUIRED:'해당 카드샵의 등록 권한이 없습니다.',DRAFT_EXPIRED:'카드정보 확인 시간이 만료됐습니다. PSA 번호를 다시 조회해주세요.',DRAFT_NOT_FOUND:'조회한 카드정보를 찾을 수 없습니다.',INVALID_PRICE:'판매가격은 1원부터 9,999,999,999원까지 정수로 입력해주세요.',PRODUCT_NOT_FOUND:'상품을 찾을 수 없습니다.',PRODUCT_CONFLICT:'다른 곳에서 수정된 상품입니다. 목록을 새로 불러온 뒤 다시 수정해주세요.',INVALID_CONTACT:'문의 방식과 연락처를 확인해주세요.',INVALID_STATUS:'판매 상태를 확인해주세요.',ADMIN_REQUIRED:'전체 관리자만 권한을 설정할 수 있습니다.'};
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
  let physicalIds:string[]|null=null,onlineIds:string[]|null=null;
  if(isAdmin!==true){
   const [p,o]=await Promise.all([user.from('graded_shop_managers').select('shop_id').eq('user_id',auth.user.id).eq('is_active',true),user.from('graded_online_shop_managers').select('online_shop_id').eq('user_id',auth.user.id).eq('is_active',true)]);
   if(p.error||o.error)throw p.error||o.error;
   physicalIds=p.data.map(x=>x.shop_id);onlineIds=o.data.map(x=>x.online_shop_id);
  }
  let pQuery=db.from('shops').select('id,name,address').eq('is_active',true).order('name'),oQuery=db.from('online_shops').select('id,name,address').eq('is_active',true).order('name');
  if(physicalIds)pQuery=pQuery.in('id',physicalIds);
  if(onlineIds)oQuery=oQuery.in('id',onlineIds);
  const [p,o]=await Promise.all([physicalIds?.length===0?Promise.resolve({data:[],error:null}):pQuery,onlineIds?.length===0?Promise.resolve({data:[],error:null}):oQuery]);
  if(p.error||o.error)throw p.error||o.error;
  const shops=[...(p.data||[]).map(s=>({...s,kind:'physical'})),...(o.data||[]).map(s=>({...s,id:'online:'+s.id,kind:'online'}))];
  return reply({is_admin:isAdmin===true,shops,api_mode:Deno.env.get('RENAISS_API_KEY')&&Deno.env.get('RENAISS_API_SECRET')?'partner':'public'});
 }
 if(action==='permission_list'){
  if(isAdmin!==true)return reply({error:errorMessages.ADMIN_REQUIRED},403);
  const [p,o]=await Promise.all([db.from('graded_shop_managers').select('shop_id,user_id,is_active,updated_at,shops(name)').order('updated_at',{ascending:false}).limit(100),db.from('graded_online_shop_managers').select('online_shop_id,user_id,is_active,updated_at,online_shops(name)').order('updated_at',{ascending:false}).limit(100)]);
  if(p.error||o.error)throw p.error||o.error;
  const rows=[...(p.data||[]).map(x=>({...x,kind:'physical'})),...(o.data||[]).map(x=>({...x,shop_id:'online:'+x.online_shop_id,shops:x.online_shops,kind:'online'}))].sort((a,b)=>b.updated_at.localeCompare(a.updated_at));
  const ids=[...new Set(rows.map(x=>x.user_id))],emails=new Map();
  for(const id of ids){const r=await db.auth.admin.getUserById(id);emails.set(id,r.data.user?.email||id)}
  return reply({rows:rows.map(x=>({...x,email:emails.get(x.user_id)}))});
 }
 if(action==='permission_set'){
  if(isAdmin!==true)return reply({error:errorMessages.ADMIN_REQUIRED},403);
  if(typeof body.enabled!=='boolean'||!/^.{1,150}$/.test(body.shop_id||'')||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email||'')||body.email.length>254)return reply({error:'카드샵·가입 이메일·권한을 확인해주세요.'},400);
  const r=await user.rpc('set_graded_shop_manager',{p_shop_id:body.shop_id,p_email:body.email,p_enabled:body.enabled});
  if(r.error)return reply({error:errorMessages[r.error.message]||'권한 설정을 저장하지 못했습니다.'},r.error.code==='42501'?403:400);
  return reply(r.data);
 }
 const validPrice=()=>body.price_on_request===true?body.price_krw===null:((body.price_on_request===undefined||body.price_on_request===false)&&Number.isSafeInteger(body.price_krw)&&body.price_krw>=1&&body.price_krw<=9999999999);
 if(action==='register'){
  if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(body.draft_id||'')||!validPrice())return reply({error:errorMessages.INVALID_PRICE},400);
  const r=await user.rpc('register_shop_graded_card_priced',{p_draft_id:body.draft_id,p_price_krw:body.price_krw,p_contact_type:body.contact_type??'none',p_contact_value:body.contact_value??null,p_price_on_request:body.price_on_request??false});
  if(r.error)return reply({error:r.error.code==='23505'?'이미 판매 중으로 등록된 PSA 번호입니다.':errorMessages[r.error.message]||'상품을 등록하지 못했습니다. 다시 확인해주세요.'},r.error.code==='23505'?409:r.error.code==='42501'?403:400);
  return reply({registered:true,product_id:r.data});
 }
 const shop=String(body.shop_id||'');
 const {data:allowed,error:permissionError}=await user.rpc('can_manage_graded_shop',{p_shop_id:shop});
 if(permissionError||allowed!==true)return reply({error:errorMessages.SHOP_PERMISSION_REQUIRED},403);
 if(action==='update'||action==='delete'){
  if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(body.product_id||'')||!Number.isSafeInteger(body.revision)||body.revision<0)return reply({error:'상품 정보를 확인해주세요.'},400);
  if(action==='update'&&(!validPrice()))return reply({error:errorMessages.INVALID_PRICE},400);
  const r=await user.rpc('manage_shop_graded_card_priced',{p_shop_id:shop,p_product_id:body.product_id,p_action:action,p_revision:body.revision,p_price_krw:body.price_krw??null,p_status:body.status??null,p_contact_type:body.contact_type??'none',p_contact_value:body.contact_value??null,p_price_on_request:body.price_on_request??false});
  if(r.error)return reply({error:r.error.code==='23505'?'이미 판매 중인 동일 PSA 번호가 있습니다.':errorMessages[r.error.message]||'상품 변경을 저장하지 못했습니다.'},r.error.code==='42501'?403:['40001','23505'].includes(r.error.code)?409:400);
  return reply({product_id:r.data,updated:true});
 }
 if(action==='list'){
  const offset=body.offset??0;if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return reply({error:'목록 범위를 확인해주세요.'},400);
  const query=user.from('graded_products').select('id,tcg_type,grading_company,grade,issue_year,set_name,card_number,card_name,image_urls,price_krw,price_on_request,status,cert_number,is_sample,created_at,contact_type,contact_value,revision').is('deleted_at',null);
  const r=await (shop.startsWith('online:')?query.eq('online_shop_id',shop.slice(7)):query.eq('shop_id',shop)).order('created_at',{ascending:false}).order('id').range(offset,offset+49);
  if(r.error)throw r.error;return reply({rows:r.data,has_more:r.data.length===50});
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
 const draft=await db.from('graded_registration_drafts').insert({user_id:auth.user.id,shop_id:shop.startsWith('online:')?null:shop,online_shop_id:shop.startsWith('online:')?shop.slice(7):null,cert_number:cert,metadata}).select('id,expires_at').single();
 if(draft.error)throw draft.error;
 return reply({card:metadata,draft_id:draft.data.id,expires_at:draft.data.expires_at,quota});
 }catch(e){if(e instanceof SyntaxError)return reply({error:'요청 형식을 확인해주세요.'},400);return reply({error:'처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.'},502)}
});



