// Real browser checks against binder.html, with isolated fixture data (no live DB writes).
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=path.join(root,pathname);try{res.setHeader('content-type',pathname.endsWith('.js')||pathname.endsWith('.mjs')?'text/javascript':pathname.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
async function fixture(page,pockets=9){
 await page.route('https://**/*',route=>route.abort());
 await page.route('**/web-auth.js*',route=>route.fulfill({body:''}));
 await page.route('**/funy-efficiency-v1.js*',route=>route.fulfill({body:''}));
 await page.addInitScript(({pockets})=>{
 const binder={id:'fixture',user_id:'owner',title:'플립북 테스트',description:'수집한 카드',cover:null,cover_color:'#b9a6ca',pockets,created_at:'2026-10-23',pages:[1,2,3].map(i=>({id:'p'+i,path:'page'+i})),author_nickname:'수집가'};
 const db={from(table){let single=false;const q=new Proxy({}, {get(_,key){if(key==='then')return resolve=>Promise.resolve({data:table==='binder_publications'||table==='binders'?(single?binder:[binder]):[],count:0,error:null}).then(resolve);return()=>{if(key==='single'||key==='maybeSingle')single=true;return q;};}});return q;},storage:{from(){return {download:async()=>({data:new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#cbb8e0"/><text x="35" y="180" font-size="28">CARD COLLECTION</text></svg>'],{type:'image/svg+xml'})})}}}};
 window.FUNY_WEB_AUTH={init:async()=>{},session:{user:{id:'owner'}},client:db};
 },{pockets});
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);
 await page.goto(base+'/binder.html?view=detail&id=fixture');await page.waitForSelector('.binder-flip-root .stf__item');
 assert.equal(await page.locator('.binder-flip-page').count(),4);
 assert.match(await page.locator('#pageNav').innerText(),/표지/);
 await page.locator('[data-act=next]').click();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/1페이지/);
 // Partial drag returns to the same page.
 await page.locator('.binder-flip-root').scrollIntoViewIfNeeded();let b=await page.locator('.binder-flip-root').boundingBox();
 await page.mouse.move(b.x+b.width-5,b.y+b.height*.75);await page.mouse.down();await page.mouse.move(b.x+b.width-35,b.y+b.height*.7,{steps:8});await page.mouse.up();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/1페이지/);
 // Full drag advances exactly once.
 b=await page.locator('.binder-flip-root').boundingBox();await page.mouse.move(b.x+b.width-5,b.y+b.height*.75);await page.mouse.down();await page.mouse.move(b.x+8,b.y+b.height*.7,{steps:16});await page.mouse.up();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 // Reverse drag also completes inside the visible page.
 b=await page.locator('.binder-flip-root').boundingBox();await page.mouse.move(b.x+5,b.y+b.height*.75);await page.mouse.down();await page.mouse.move(b.x+b.width-8,b.y+b.height*.7,{steps:16});await page.mouse.up();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/1페이지/);
 await page.locator('[data-act=next]').click();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 // Pinch handler: zoom stops flipping; reset restores it.
 await page.evaluate(()=>{const el=document.querySelector('#viewer');function ev(type,pts){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:pts.map(([clientX,clientY])=>({clientX,clientY}))});el.dispatchEvent(e);}ev('touchstart',[[100,200],[200,200]]);ev('touchmove',[[75,200],[225,200]]);ev('touchend',[]);});
 assert(await page.locator('.binder-book-zoomed').count());const z=await page.locator('.binder-flip-root').evaluate(el=>el.style.transform);assert.equal(z,'scale(1.5)');
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(650);assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 await page.locator('[data-act=mode-all]').click();assert.equal(await page.locator('.binder-flip-root').count(),0);assert.equal(await page.locator('#viewerContent .sheet').count(),3);
 await page.locator('[data-act=mode-single]').click();await page.waitForSelector('.binder-flip-root');assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 await page.setViewportSize({width:480,height:844});await page.waitForTimeout(250);assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('ArrowRight');await page.waitForTimeout(50);assert.match(await page.locator('#pageNav').innerText(),/3페이지/);
 await page.keyboard.press('ArrowRight');assert.match(await page.locator('#pageNav').innerText(),/3페이지/);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.keyboard.press('ArrowLeft');await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 await page.screenshot({path:'/tmp/binder-flipbook-qa.png',fullPage:true});
 // Editing preview retains the previous renderer, and each pocket ratio fits a phone.
 await page.goto(base+'/binder.html?view=edit&id=fixture');await page.locator('[data-act=preview]').click();await page.waitForSelector('#viewer');assert.equal(await page.locator('.binder-flip-root').count(),0);assert(await page.locator('.viewer-page').count());
 for(const pockets of [4,6,12]){const p=await browser.newPage({viewport:{width:360,height:800}});await fixture(p,pockets);await p.goto(base+'/binder.html?view=detail&id=fixture');await p.waitForSelector('.stf__item');const rect=await p.locator('.binder-flip-root').boundingBox();assert(rect.width<=300);await p.locator('[data-act=next]').click();await p.waitForTimeout(700);assert.match(await p.locator('#pageNav').innerText(),/1페이지/);await p.close();}
 assert.deepEqual(errors,[]);console.log('PASS: showcase scope, drag complete/cancel, depth, pinch lock, overview, resize, reduced motion, boundaries, preview isolation, all pocket ratios');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
