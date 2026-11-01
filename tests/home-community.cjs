// Shared ranking/data and HOME-to-TALK menu contracts. Run: node tests/home-community.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const load=file=>fs.readFileSync(path.join(root,file),'utf8');
(async()=>{
 const window={},document={createElement:()=>({}),head:{appendChild(){}}};let calls=[];
 const fixtures=Array.from({length:501},(_,i)=>({id:String(i),title:'Post '+i,user_id:'owner',category:i%2?'카드 자랑':'자유 게시판',created_at:'2026-11-01',view_count:1,like_count:i===500?100:0,community_post_images:[]}));
 const ctx={window,document,Set,Number,URL,JSON,console,fetch:async url=>{calls.push(url);return {ok:true,json:async()=>url.includes('community_user_blocks')?[{blocked_user_id:'blocked'}]:fixtures.slice(Number(new URL(url).searchParams.get('offset')),Number(new URL(url).searchParams.get('offset'))+500)}}};
 vm.runInNewContext(load('talk-home-shared.js'),ctx);const model=window.FUNY_TALK_SHARED;
 const posts=await model.loadPosts();assert.equal(posts.length,501);assert.equal(calls.length,2);assert(calls.every(x=>x.includes('status=eq.published')));assert.equal(model.rankPosts(posts,'popular',3)[0].id,'500','older posts beyond a page participate');
 const rows=[{id:'likes',likes:4,comments:0,popularityScore:8},{id:'comments',likes:0,comments:5,popularityScore:15},{id:'views',likes:0,comments:0,popularityScore:50},{id:'none',likes:0,comments:0,popularityScore:0}];
 for(const [mode,id] of [['popular','views'],['likes','likes'],['comments','comments']]){const ranked=model.rankPosts(rows,mode,3);assert.equal(ranked[0].id,id);assert.equal(ranked.length,3);assert(!ranked.some(x=>x.id==='none'));}assert.equal(rows[0].id,'likes','ranking does not mutate the source');
 calls=[];assert.equal((await model.loadBlockedOwners('','')).size,0);assert.equal(calls.length,0);assert((await model.loadBlockedOwners('me','token')).has('blocked'));
 ctx.fetch=async()=>({ok:false,status:403});await assert.rejects(model.loadBlockedOwners('me','token'));await assert.rejects(model.loadPosts());
 const talk=load('talk-community-v1.js');const code=talk.slice(talk.indexOf("const homeTalkIntentKey="),talk.indexOf('async function applyHomeTalkIntent'));
 const storage=new Map(),key='funypin:talk:pending-tab:v1';const intentContext={current:'인기',pendingListScroll:99,rememberedBinderPages:3,Date,Number,JSON,URLSearchParams,location:{search:''},localStorage:{getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)}};
 storage.set(key,JSON.stringify({tab:'binders',at:Date.now()}));vm.runInNewContext(code,intentContext);assert.equal(intentContext.current,'바인더 자랑');assert.equal(intentContext.pendingListScroll,0);assert.equal(storage.size,0);
 const run=value=>{storage.clear();storage.set(key,value);const c={...intentContext,current:'전체'};vm.runInNewContext(code,c);return c.current;};assert.equal(run(JSON.stringify({tab:'binders',at:Date.now()-61000})),'전체');assert.equal(run('bad json'),'전체');
 const c={...intentContext,current:'전체',location:{search:'?tab=binders'}};storage.clear();vm.runInNewContext(code,c);assert.equal(c.current,'바인더 자랑','web menu deep link');
 assert(load('index.html').includes('home-community-widget.js?v=20261102-community1'));assert(load('talk.html').indexOf('talk-home-shared.js')<load('talk.html').indexOf('data-funy-talk-community'));
 for(const file of ['talk-home-shared.js','home-community-widget.js','talk-community-v1.js','cms-frontend-renderer.js'])new vm.Script(load(file),{filename:file});
 for(const file of ['index.html','talk.html','admin.html','cms-builder-preview.html'])for(const match of load(file).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){if(match[0].includes('application/ld+json'))continue;new vm.Script(match[1],{filename:file});}
 console.log('PASS full-feed pagination; TALK ranking parity/top3; auth block failures; native intent expiry/one-shot; web binder destination; page script syntax');
})().catch(e=>{console.error(e);process.exitCode=1});
