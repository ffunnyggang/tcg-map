import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const BASE=Deno.env.get('SUPABASE_URL')!,ANON=Deno.env.get('SUPABASE_ANON_KEY')!,SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors={'Access-Control-Allow-Origin':'https://funypin.kr','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const canonical=(v:unknown)=>{try{const u=new URL(String(v));if(u.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(u.hostname)||u.username||u.password||u.port||!/^\/(p|reel)\/[A-Za-z0-9_-]{1,100}\/?$/.test(u.pathname))return null;return 'https://www.instagram.com'+u.pathname.replace(/\/?$/,'/')}catch{return null}};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return reply({error:'POST only'},405);
 try{
 const jwt=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'',user=createClient(BASE,ANON,{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false}}),{data:auth,error:authError}=await user.auth.getUser(jwt);
 if(authError||!auth.user)return reply({error:'로그인이 필요합니다.'},401);
 const multipart=(req.headers.get('content-type')||'').includes('multipart/form-data');
 if(Number(req.headers.get('content-length')||0)>9*1024*1024)return reply({error:'이미지가 너무 큽니다.'},413);
 // Permission is checked before reading an upload or touching storage/CMS rows.
 const {data:isAdmin}=await user.rpc('is_funypin_admin'),{data:allowed,error:permissionError}=await user.rpc('can_manage_shop_news');
 const db=createClient(BASE,SERVICE,{auth:{persistSession:false}});
 if(!multipart){const body=await req.json(),action=String(body.action||'');
  if(action==='permission_list'||action==='permission_set'){
   if(isAdmin!==true)return reply({error:'전체 관리자만 권한을 관리할 수 있습니다.'},403);
   if(action==='permission_list'){const r=await db.from('funy_admin_page_permissions').select('email,box_price_manage,shop_news_manage,updated_at').order('email');if(r.error)throw r.error;return reply({rows:r.data})}
   const email=String(body.email||'').trim().toLowerCase(),permission=String(body.permission||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180||!['box_price_manage','shop_news_manage'].includes(permission)||typeof body.enabled!=='boolean')return reply({error:'권한 설정값을 확인해주세요.'},400);
   const payload={[permission]:body.enabled,updated_at:new Date().toISOString()},found=await db.from('funy_admin_page_permissions').select('email').eq('email',email).maybeSingle();if(found.error)throw found.error;
   let result=found.data?await db.from('funy_admin_page_permissions').update(payload).eq('email',email):await db.from('funy_admin_page_permissions').insert({email,...payload});if(result.error?.code==='23505')result=await db.from('funy_admin_page_permissions').update(payload).eq('email',email);if(result.error)throw result.error;return reply({saved:true});
  }
  if(permissionError||allowed!==true)return reply({error:'카드샵 소식 관리 권한이 없습니다.'},403);
  if(action==='bootstrap'){const shops=await db.from('shops').select('id,name').eq('is_active',true).order('name');if(shops.error)throw shops.error;return reply({shops:shops.data})}
  if(action==='remove'){if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(body.content_id||''))return reply({error:'콘텐츠를 확인해주세요.'},400);const r=await user.rpc('remove_shop_news',{p_content:body.content_id});if(r.error)return reply({error:r.error.code==='P0002'?'이 페이지에서 등록한 소식만 삭제할 수 있습니다.':'삭제하지 못했습니다. 다시 시도해주세요.'},r.error.code==='42501'?403:400);return reply(r.data)}
  if(action==='manage_list'){const page=Math.max(0,Math.min(100000,Number.isInteger(body.page)?body.page:0)),r=await db.from('shop_news_submissions').select('content_id,block_id,created_at,cms_blocks!inner(placement),cms_contents!inner(id,title,target_url,shop_id,image_url)',{count:'exact'}).order('created_at',{ascending:false}).order('request_id').range(page*20,page*20+19);if(r.error)throw r.error;const ids=(r.data||[]).map(x=>x.content_id);let active=new Set<string>();if(ids.length){const links=await db.from('cms_block_items').select('content_id,block_id,cms_blocks!inner(placement)').in('content_id',ids).eq('is_active',true).in('cms_blocks.placement',['pick_shop_news','pick_information']);if(links.error)throw links.error;active=new Set(links.data.map(x=>x.content_id+':'+x.block_id))}return reply({rows:(r.data||[]).map(x=>({...x.cms_contents,placement:x.cms_blocks?.placement||'pick_shop_news',created_at:x.created_at,active:active.has(x.content_id+':'+x.block_id)})),total:r.count||0,page})}
  if(action==='recent'){const blocks=await db.from('cms_blocks').select('id').eq('placement','pick_shop_news').eq('is_active',true).eq('status','published');if(blocks.error)throw blocks.error;if(!blocks.data.length)return reply({rows:[]});const items=await db.from('cms_block_items').select('content_id').in('block_id',blocks.data.map(x=>x.id)).eq('is_active',true).not('content_id','is',null);if(items.error)throw items.error;const ids=[...new Set(items.data.map(x=>x.content_id))];if(!ids.length)return reply({rows:[]});const rows=await db.from('cms_contents').select('id,title,target_url,shop_id,image_url,created_at').in('id',ids).order('created_at',{ascending:false}).limit(20);if(rows.error)throw rows.error;return reply({rows:rows.data})}
  return reply({error:'지원하지 않는 요청입니다.'},400);
 }
 if(permissionError||allowed!==true)return reply({error:'카드샵 소식 관리 권한이 없습니다.'},403);
 const form=await req.formData(),data=JSON.parse(String(form.get('payload')||'{}')),file=form.get('image');
 const url=canonical(data.url),title=String(data.title||'').trim(),settings=data.instagram_embed;
 if(!url||!title||title.length>180||!/^[a-f0-9-]{36}$/i.test(data.request_id||'')||data.reviewed!==true)return reply({error:'URL·제목·이미지 및 카드샵 확인 항목을 점검해주세요.'},400);
 if(!(file instanceof File)||file.type!=='image/png'||file.size<100||file.size>8*1024*1024)return reply({error:'정상적인 캡처 이미지가 필요합니다.'},400);
 const source=new URL(url),parts=source.pathname.split('/'),prefix=BASE+'/storage/v1/object/public/cms-images/instagram-capture/'+parts[1]+'-'+parts[2]+'/';
 if(!settings||settings.kind!=='screenshot'||settings.enabled!==false||canonical(settings.source_url)!==url||!String(settings.source_image||'').startsWith(prefix))return reply({error:'현재 URL의 썸네일을 수집하고 이미지 영역에 적용해주세요.'},400);
 const placement=data.placement??'pick_shop_news';if(!['pick_shop_news','pick_information'].includes(placement))return reply({error:'등록 위치를 확인해주세요.'},400);
 const linkMode=data.link_mode??'external',presentation=data.inapp_presentation??'page';if(!['inapp','external'].includes(linkMode)||!['bottom_sheet','page'].includes(presentation))return reply({error:'연결 방식을 확인해주세요.'},400);
 const bytes=new Uint8Array(await file.arrayBuffer());if([137,80,78,71,13,10,26,10].some((v,i)=>bytes[i]!==v))return reply({error:'PNG 이미지 형식이 아닙니다.'},400);const view=new DataView(bytes.buffer),w=view.getUint32(16),h=view.getUint32(20);if(!w||!h||w>2160||h>2160)return reply({error:'썸네일 이미지 크기를 확인해주세요.'},400);
 const path='shop-news/'+auth.user.id+'/'+crypto.randomUUID()+'.png',image=db.storage.from('cms-images').getPublicUrl(path).data.publicUrl;
 const upload=await db.storage.from('cms-images').upload(path,bytes,{contentType:'image/png',upsert:false,cacheControl:'31536000'});if(upload.error)throw upload.error;
 const result=await user.rpc('publish_instagram_content',{p_request:data.request_id,p_title:title,p_url:url,p_shop_id:placement==='pick_information'?null:data.shop_id||null,p_image:image,p_settings:settings,p_link_mode:linkMode,p_inapp_presentation:presentation,p_placement:placement});
 if(result.error){await db.storage.from('cms-images').remove([path]);return reply({error:result.error.message.includes('NEWS_ALREADY_REGISTERED')?'이미 카드샵 소식에 등록된 URL입니다.':result.error.message},result.error.code==='23505'?409:400)}
 if(result.data.already_registered&&result.data.image_url!==image)await db.storage.from('cms-images').remove([path]);return reply({...result.data,registered:true});
 }catch{return reply({error:'처리에 실패했습니다. 잠시 후 다시 시도해주세요.'},500)}
});
