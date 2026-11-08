import {createClient} from 'npm:@supabase/supabase-js@2';
const BASE=Deno.env.get('SUPABASE_URL')!,PUB=Deno.env.get('SUPABASE_ANON_KEY')!,SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={'Access-Control-Allow-Origin':'https://funypin.kr','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const out=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers});
Deno.serve(async req=>{if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return out({error:'METHOD'},405);
const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!jwt)return out({error:'LOGIN_REQUIRED'},401);
const user=createClient(BASE,PUB,{global:{headers:{Authorization:'Bearer '+jwt}}});
const verified=await user.auth.getUser(jwt);if(verified.error||!verified.data.user)return out({error:'LOGIN_REQUIRED'},401);
const admin=await user.rpc('is_funypin_admin');if(admin.error||admin.data!==true)return out({error:'ADMIN_REQUIRED'},403);
try{const db=createClient(BASE,SERVICE);const body=await req.json();const action=body.action;
 if(action==='seller_visibility'){
   const seller=String(body.seller||'').trim(),productId=String(body.product_id||'').trim();
   const visible=body.is_visible;
   if(!seller||seller.length>100||!productId||productId.length>200||typeof visible!=='boolean')return out({error:'INVALID_VISIBILITY'},400);
   const exists=await db.from('box_price_daily').select('product_id').eq('seller_name',seller).eq('product_id',productId).limit(1);
   if(exists.error)throw exists.error;if(!exists.data?.length)return out({error:'NOT_FOUND'},404);
   const saved=await db.from('box_seller_product_visibility').upsert({seller_name:seller,product_id:productId,is_visible:visible,updated_at:new Date().toISOString()},{onConflict:'seller_name,product_id'});
   if(saved.error)throw saved.error;
   return out({saved:true,is_visible:visible});
 }

if(action==='edit_price'){
 const id=String(body.product_id||''),seller=String(body.seller||''),date=String(body.price_date||''),price=body.price_krw,expected=String(body.expected_updated_at||'');
 if(!id||id.length>200||!seller||seller.length>100||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!Number.isInteger(price)||price<1000||price>5000000||!Number.isFinite(Date.parse(expected)))return out({error:'INVALID_PRICE',message:'가격은 1,000~5,000,000원의 정수로 입력해 주세요.'},400);
 // Update exactly one existing daily record; uploaded source documents remain original audit evidence.
 const result=await db.from('box_price_daily').update({price_krw:price,updated_at:new Date().toISOString()}).eq('product_id',id).eq('seller_name',seller).eq('price_date',date).eq('updated_at',expected).select('seller_name,price_date,price_krw,updated_at');
 if(result.error)throw result.error;
 if(!result.data?.length)return out({error:'PRICE_CHANGED',message:'다른 작업에서 가격이 변경되었습니다. 상세를 다시 열어 확인해 주세요.'},409);
 return out({saved:true,row:result.data[0]});
}
if(action==='list'){const {data,error}=await db.from('box_products').select('product_id,product_code,product_name_ko,product_name_short_ko,product_name_short_en,product_name_en,contents_description,retail_price_amount,retail_price_currency,tcg_type,language,release_date,image_path,is_active,price_enabled').order('created_at');if(error)throw error;return out({products:data})}
if(action==='history'){const id=String(body.product_id||'');if(!/^[a-z0-9_]{2,100}$/.test(id))return out({error:'PRODUCT_ID'},400);const [p,h]=await Promise.all([db.from('box_products').select('product_id,product_code,product_name_ko,product_name_short_ko,product_name_short_en,product_name_en,contents_description,retail_price_amount,retail_price_currency,tcg_type,language,release_date,image_path,is_active,price_enabled').eq('product_id',id).maybeSingle(),db.from('box_price_daily').select('seller_name,price_date,price_krw,updated_at').eq('product_id',id).order('price_date',{ascending:false}).order('updated_at',{ascending:false}).limit(3000)]);if(p.error||h.error)throw p.error||h.error;if(!p.data)return out({error:'NOT_FOUND'},404);const v=await db.from('box_seller_product_visibility').select('seller_name,is_visible').eq('product_id',id);if(v.error)throw v.error;return out({product:p.data,history:h.data,visibility:v.data})}
if(action==='save_visibility'){const id=String(body.product_id||'');if(!/^[a-z0-9_]{2,100}$/.test(id)||typeof body.is_active!=='boolean'||typeof body.price_enabled!=='boolean')return out({error:'INVALID_VISIBILITY'},400);const {error}=await db.from('box_products').update({is_active:body.is_active,price_enabled:body.price_enabled}).eq('product_id',id);if(error)throw error;return out({saved:true})}
if(action==='save_names'){const id=String(body.product_id||'');const full=String(body.name_ko||'').trim(),short=String(body.short_ko||'').trim(),eng=String(body.name_en||'').trim(),shortEn=String(body.short_en||'').trim(),contents=String(body.contents_description||'').trim(),date=body.release_date||null,amount=body.retail_price_amount===''||body.retail_price_amount==null?null:Number(body.retail_price_amount),currency=String(body.retail_price_currency||'');
if(!/^[a-z0-9_]{2,100}$/.test(id)||!full||!short||full.length>300||short.length>300||eng.length>300||shortEn.length>300||contents.length>500||date&&!/^\d{4}-\d{2}-\d{2}$/.test(date)||amount!==null&&(!Number.isFinite(amount)||amount<0)||currency&&!['JPY','KRW','USD','EUR'].includes(currency)||(amount!==null&&!currency))return out({error:'INVALID_PRODUCT_INFO',message:'상품명은 각 300자 이내, 구성은 500자 이내여야 하며 발매 정가를 입력하면 통화를 선택해야 합니다.'},400);
const {data,error}=await db.from('box_products').update({product_name_ko:full,product_name_short_ko:short,product_name_en:eng||null,product_name_short_en:shortEn||null,contents_description:contents||null,release_date:date,retail_price_amount:amount,retail_price_currency:currency||null}).eq('product_id',id).select('product_id').single();if(error)throw error;return out({saved:true,product_id:data.product_id})}
return out({error:'ACTION'},400)
}catch(e){return out({error:'SERVER_ERROR',message:String(e?.message||e).slice(0,180)},500)}
});
