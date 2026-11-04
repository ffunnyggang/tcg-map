const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),{stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync(path.resolve(__dirname,'../supabase/functions/graded-shop-admin/index.ts'),'utf8')).replace(/^import .*;\n/gm,'');
async function run(admin=false){
 let handler;const drafts=[];
 const tables={shops:[{id:'p1',name:'Physical 1',is_active:true},{id:'p2',name:'Physical 2',is_active:true}],online_shops:[{id:'o1',name:'Online 1',is_active:true},{id:'o2',name:'Online 2',is_active:true}],graded_shop_managers:[{shop_id:'p1',user_id:'u1',is_active:true,updated_at:'2026-11-04',shops:{name:'Physical 1'}}],graded_online_shop_managers:[{online_shop_id:'o1',user_id:'u1',is_active:true,updated_at:'2026-11-05',online_shops:{name:'Online 1'}}],graded_products:[{id:'c1',online_shop_id:'o1',is_sample:true},{id:'c2',online_shop_id:'o2',is_sample:false}],graded_cert_cache:[{cert_number:'153578569',metadata:{card_name:'Bulbasaur'},fetched_at:new Date().toISOString()}]};
 class Query{
  constructor(table){this.table=table;this.rows=(tables[table]||[]).slice()}
  select(){return this}eq(k,v){this.rows=this.rows.filter(x=>x[k]===v);return this}in(k,values){this.rows=this.rows.filter(x=>values.includes(x[k]));return this}order(){return this}limit(n){this.rows=this.rows.slice(0,n);return this}
  insert(payload){drafts.push(payload);this.rows=[{...payload,id:'draft-test',expires_at:'future'}];return this}
  single(){return Promise.resolve({data:this.rows[0],error:null})}maybeSingle(){return this.single()}then(resolve){resolve({data:this.rows,error:null})}
 }
 const client={auth:{getUser:async()=>({data:{user:{id:'u1'}},error:null}),admin:{getUserById:async()=>({data:{user:{email:'user@example.com'}}})}},from:t=>new Query(t),rpc:async(name,params)=>({data:name==='is_funypin_admin'?admin:name==='can_manage_graded_shop'?(admin||['p1','online:o1'].includes(params.p_shop_id)):null,error:null})};
 vm.runInNewContext(source,{createClient:()=>client,normalizeCard:()=>{throw Error('Unexpected cold lookup')},Deno:{env:{get:n=>n},serve:f=>handler=f},Response,URL,AbortSignal,console,fetch:()=>{throw Error('Unexpected API request')}});
 const call=async b=>{const r=await handler(new Request('https://example.com',{method:'POST',headers:{Authorization:'Bearer test-only','Content-Type':'application/json'},body:JSON.stringify(b)}));return {status:r.status,data:await r.json()}};
 const boot=await call({action:'bootstrap'});assert.equal(boot.status,200);assert.deepEqual(boot.data.shops.map(x=>x.id),admin?['p1','p2','online:o1','online:o2']:['p1','online:o1']);
 const list=await call({action:'list',shop_id:'online:o1'});assert.equal(list.data.rows.length,1);assert.equal(list.data.rows[0].id,'c1');assert.equal(list.data.rows[0].is_sample,true);
 const permissions=await call({action:'permission_list'});assert.equal(permissions.status,admin?200:403);if(admin)assert(permissions.data.rows.some(x=>x.kind==='online'&&x.shop_id==='online:o1'&&x.shops.name==='Online 1'));
 if(!admin){assert.equal((await call({action:'list',shop_id:'online:o2'})).status,403);const lookup=await call({action:'lookup',shop_id:'online:o1',cert_number:'153578569'});assert.equal(lookup.status,200);assert.deepEqual(drafts[0],{user_id:'u1',shop_id:null,online_shop_id:'o1',cert_number:'153578569',metadata:{card_name:'Bulbasaur'}})}
 const unauth=await handler(new Request('https://example.com',{method:'POST',body:'{}'}));assert.equal(unauth.status,401);
}
(async()=>{await run();await run(true);console.log('PASS: Edge physical/online bootstrap, manager isolation, sample listings, admin permission merge, online draft binding, missing-token denial')})().catch(e=>{console.error(e);process.exit(1)});

