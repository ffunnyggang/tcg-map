const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=require('node:path').join(__dirname,'..');
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
for(const p of ['admin-box-prices.html','products.html','box-detail.html','index.html']){
 for(const m of read(p).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/src=|application\/(?:ld\+)?json/.test(m[1])||!m[2].trim())continue;
  new vm.Script(m[2],{filename:p});
 }
}
const now=Date.parse('2026-11-07T15:00:00Z'),day=86400000;
const record=(seller,product,age,date='2026-11-07')=>({seller_name:seller,product_id:product,price_date:date,price_krw:10000,updated_at:new Date(now-age).toISOString()});
function api(file,db){let handler;class Clock extends Date{static now(){return now}}
 const source=read(file).replace(/^import .*\n/,'').replaceAll("Deno.env.get('SUPABASE_URL')!","Deno.env.get('SUPABASE_URL')").replaceAll("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!","Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
 vm.runInNewContext(source,{createClient:()=>db,Deno:{env:{get:()=> 'test'},serve:f=>handler=f},Date:Clock,Intl,Response,Request,console,crypto});return handler;
}
function query(result,log=[]){const q={then:(a,b)=>Promise.resolve(result).then(a,b)};for(const op of ['select','order','limit','in','eq','lte','delete','maybeSingle','single','insert'])q[op]=(...args)=>{log.push([op,...args]);return q};return q}
(async()=>{
 const data=[record('fresh','p',day),record('boundary','p',5*day),record('expired','p',5*day+1),record('expired','p',day,'2026-11-06'),{...record('invalid','p',0),updated_at:null}];
 const handler=api('supabase/functions/box-price-public/index.ts',{from:t=>query({data:t==='box_price_daily'?data:[],error:null})});
 const response=await handler(new Request('https://test/'));
 assert.equal(response.status,200);const payload=await response.json();assert.deepEqual(payload.rows.map(r=>r.seller),['fresh','boundary']);
 data[2].updated_at=new Date(now).toISOString();assert((await (await handler(new Request('https://test/'))).json()).rows.some(r=>r.seller==='expired'));
 let permitted=true;const calls=[];
 const db={auth:{getUser:async()=>({data:{user:{id:'test-user'}}})},rpc:async()=>({data:permitted}),from:t=>{calls.push(['table',t]);return query({error:null,count:3},calls)}};
 const admin=api('supabase/functions/box-price-admin/index.ts',db);
 const req=()=>new Request('https://test/',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({action:'manual_delete',seller:'seller A',product_id:'p'})});
 assert.equal((await admin(new Request('https://test/',{method:'POST'}))).status,401);
 permitted=false;assert.equal((await admin(req())).status,403);assert.equal(calls.length,0);
 permitted=true;assert.equal((await (await admin(req())).json()).deleted,3);
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['table','box_price_daily'],['delete',{count:'exact'}],['eq','seller_name','seller A'],['eq','product_id','p']]);
 assert(!read('supabase/functions/box-price-admin/index.ts').includes('if(price===p.current_price_krw)continue'));
 console.log('PASS: inline syntax, 5-day boundary, stale latest without fallback, refresh, unauthenticated/unauthorized delete, seller/product-only deletion.');
})().catch(e=>{console.error(e);process.exitCode=1});
