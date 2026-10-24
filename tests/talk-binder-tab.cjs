const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
async function fixture(page,{app=false,legacy=false,loggedIn=true}={}){
 await page.route('https://**/*',r=>r.abort());
 for(const name of ['web-auth','funy-efficiency-v1','ga4-events','popup-runtime-v1','talk-safety-v1','funy-mon-account-migrate'])await page.route('**/'+name+'.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/data/pokamo-feed.json*',r=>r.fulfill({json:{items:[{id:'external-card',title:'External card',excerpt:'Card post',category:'카드 자랑',author:'Collector',publishedAt:'2026-10-24',url:'https://example.test/post'}]}}));
 await page.route('https://wdttzpbmqavaqfcbaywj.supabase.co/**',r=>r.fulfill({json:r.request().url().includes('/community_posts?')?[{id:'card-post',user_id:'owner',category:'카드 자랑',title:'Single card post',body:'Cards only',created_at:'2026-10-24',community_post_images:[]},{id:'general-post',user_id:'owner',category:'자유 게시판',title:'General post',body:'General only',created_at:'2026-10-24',community_post_images:[]}]:[]}));
 await page.addInitScript(({app,legacy,loggedIn})=>{
  const binder={id:'fixture-0',user_id:'owner',title:'Binder fixture',description:'Collection',cover:null,cover_color:'#b9a6ca',pockets:9,published_at:'2026-10-24',created_at:'2026-10-24',pages:Array.from({length:8},(_,i)=>({id:'p'+i,path:'photo'+i})),author_nickname:'Collector'};
  const publications=Array.from({length:8},(_,i)=>({...binder,id:'fixture-'+i,title:'Binder '+i}));
  const db={rpc:async()=>({data:publications,error:null}),from(table){let single=false,from=0,to=19,id=null;const q=new Proxy({}, {get(_,key){if(key==='then')return resolve=>new Promise(r=>setTimeout(()=>{let rows=table==='binders'||table==='binder_publications'?publications:[];if(id)rows=rows.filter(x=>x.id===id);r({data:single?(rows[0]||null):rows.slice(from,to+1),count:0,error:null});},table==='binder_publications'?80:0)).then(resolve);return(...args)=>{if(key==='single'||key==='maybeSingle')single=true;if(key==='eq'&&args[0]==='id')id=args[1];if(key==='range')[from,to]=args;return q;};}});return q;},storage:{from(){return{download:async()=>({data:new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#cbb8e0"/></svg>'],{type:'image/svg+xml'}),error:null})}}}};
  window.FUNY_WEB_AUTH={init:async()=>{},session:loggedIn?{user:{id:'owner'},access_token:'fixture-token'}:null,client:db,onChange:()=>()=>{}};
  if(app){document.documentElement?.classList.add('app-shell');document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('app-shell'),{once:true});window.ReactNativeWebView={postMessage(){}};}
  if(legacy)sessionStorage.setItem('funy-talk-list-state-v2',JSON.stringify({current:'카드 자랑',showcaseTab:'binders',scroll:0,pages:1,at:Date.now()}));
 },{app,legacy,loggedIn});
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})}),errors=[];
try{
 for(const app of [false,true]){
  const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.stack));await fixture(p,{app});await p.goto(base+'/talk.html'+(app?'?app=1':''));await p.waitForSelector('[data-funy-post=card-post]');
  const order=await p.locator('.filters>.filter').evaluateAll(els=>els.map(e=>e.dataset.cat));assert.equal(order[order.indexOf('카드 자랑')+1],'바인더 자랑');assert.equal(await p.locator('#showcaseTabs,[data-showcase]').count(),0);
  await p.locator('[data-cat="카드 자랑"]').click();assert.equal(await p.locator('#feed .card').count(),2);assert.equal(await p.locator('[data-funy-post=general-post]').count(),0);
  await p.locator('[data-cat="바인더 자랑"]').click();await p.waitForSelector('.talk-binder-cover');assert.equal(await p.locator('#feed .card').count(),0);assert.equal(await p.locator('.talk-binder-cover').count(),8);assert.equal(await p.locator('.talk-binder-more').count(),0);
  assert(await p.locator('[data-cat="바인더 자랑"]').evaluate(b=>{const t=b.parentElement.getBoundingClientRect(),r=b.getBoundingClientRect();return r.left>=t.left&&r.right<=t.right+1;}),'restored active chip is horizontally visible');
  await p.locator('[data-cat="전체"]').click();await p.waitForSelector('.binder-rail-more');await p.locator('.binder-rail-more').click();await p.waitForSelector('.talk-binder-cover');assert.equal(await p.locator('.filters>.active').getAttribute('data-cat'),'바인더 자랑');
  await p.locator('[data-cat="카드 자랑"]').click();await p.locator('[data-cat="바인더 자랑"]').click();await p.locator('[data-cat="카드 자랑"]').click();await p.waitForTimeout(150);assert.equal(await p.locator('#feed .card').count(),2,'late binder response cannot replace card list');
  if(!app){
   await p.locator('[data-cat="바인더 자랑"]').click();await p.waitForSelector('.talk-binder-cover');await p.evaluate(()=>window.scrollTo(0,250));await p.waitForTimeout(80);await p.locator('.talk-binder-cover[href*="fixture-2"]').click();await p.waitForURL('**/binder.html?*');await p.goBack();await p.waitForSelector('.talk-binder-cover');await p.waitForTimeout(150);
   assert.equal(await p.locator('.filters>.active').getAttribute('data-cat'),'바인더 자랑');assert(Math.abs(await p.evaluate(()=>scrollY)-250)<3,'back restores binder grid scroll');
   const saved=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('funy-talk-list-state-v2')));assert.equal(saved.current,'바인더 자랑');assert(!('showcaseTab' in saved));
  }
  await p.locator('[data-cat="바인더 자랑"]').click();await p.waitForSelector('.talk-binder-cover');await p.evaluate(()=>scrollTo(0,250));await p.reload();await p.waitForSelector('[data-funy-post=card-post]');assert.equal(await p.locator('.filters>.active').getAttribute('data-cat'),'전체');assert.equal(await p.evaluate(()=>scrollY),0);
  await p.locator('[data-cat="바인더 자랑"]').click();await p.waitForSelector('.talk-binder-cover');await p.goto(base+'/talk.html?entry=menu'+(app?'&app=1':''));await p.waitForSelector('[data-funy-post=card-post]');assert.equal(await p.locator('.filters>.active').getAttribute('data-cat'),'전체');assert.equal(await p.evaluate(()=>scrollY),0);
  await p.close();
 }
 const legacy=await browser.newPage({viewport:{width:390,height:844}});await fixture(legacy,{legacy:true});await legacy.goto(base+'/talk.html');await legacy.waitForSelector('[data-funy-post=card-post]');assert.equal(await legacy.locator('.filters>.active').getAttribute('data-cat'),'전체');assert.equal(await legacy.evaluate(()=>scrollY),0);await legacy.close();
 const en=await browser.newPage({viewport:{width:390,height:844}});await fixture(en);await en.addInitScript(()=>localStorage.setItem('funy-pin-lang','en'));await en.goto(base+'/talk.html');await en.waitForFunction(()=>document.querySelector('[data-cat="바인더 자랑"]')?.textContent.includes('Binder Showcase'));await en.locator('[data-cat="바인더 자랑"]').click();await en.waitForSelector('.talk-binder-cover');await en.close();
 const guest=await browser.newPage({viewport:{width:390,height:844}});await fixture(guest,{loggedIn:false});await guest.goto(base+'/talk.html');await guest.waitForSelector('[data-funy-post=card-post]');await guest.locator('[data-cat="바인더 자랑"]').click();await guest.waitForSelector('#binderLogin');assert.equal(await guest.locator('.talk-binder-cover').count(),0);await guest.close();
 assert.deepEqual(errors,[]);console.log('PASS TALK web/app: primary tab order, cards/binders separated, no legacy sub-tabs, rail more destination, late response isolation, back state+scroll, legacy migration, guest login gate');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
