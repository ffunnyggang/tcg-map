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
 const db={rpc:async()=>({data:[binder],error:null}),from(table){let single=false;const q=new Proxy({}, {get(_,key){if(key==='then')return resolve=>Promise.resolve({data:table==='binder_publications'||table==='binders'?(single?binder:[binder]):[],count:0,error:null}).then(resolve);return()=>{if(key==='single'||key==='maybeSingle')single=true;return q;};}});return q;},storage:{from(){return {download:async()=>({data:new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#cbb8e0"/><path d="M0 0H300V8H0Z" fill="#e03030"/><path d="M0 392H300V400H0Z" fill="#3050e0"/><path d="M0 0H8V400H0Z" fill="#30b060"/><path d="M292 0H300V400H292Z" fill="#e0b030"/><text x="35" y="180" font-size="28">CARD COLLECTION</text></svg>'],{type:'image/svg+xml'})})}}}};
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
 const bounds=await page.locator('.binder-flip-root').boundingBox();assert(bounds.x<=20 && bounds.width>=350,'narrow showcase gutters');
 assert.equal(await page.locator('.binder-book-stack').count(),0);
 assert.equal(await page.locator('#viewerArrows svg').count(),2);
 const arrows=await page.locator('.viewer-arrow').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return {background:s.backgroundImage,color:s.backgroundColor,border:s.borderWidth,shadow:s.boxShadow};}));
 assert(arrows.every(a=>a.background==='none'&&a.color==='rgba(0, 0, 0, 0)'&&a.border==='0px'&&a.shadow==='none'),'no rectangular arrow background');
 assert.equal(await page.locator('.binder-flip-cover .cover').evaluate(el=>getComputedStyle(el).borderTopRightRadius),'12px');
 assert.equal(await page.locator('.binder-flip-cover .cover').evaluate(el=>getComputedStyle(el,'::before').left),'9px');
 await page.locator('[data-act=next]').click();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/1페이지/);
 // All pages share a single dark-average mat and a precise 1% inset.
 await page.waitForFunction(()=>document.querySelector('#viewerContent').style.getPropertyValue('--binder-mat-color'));
 const mats=await page.locator('.binder-photo-mat').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
 assert.equal(new Set(mats).size,1);assert.notEqual(mats[0],'rgb(41, 38, 45)');
 assert(mats[0].match(/\d+/g).map(Number).reduce((a,b)=>a+b,0)/3<170);
 const inset=await page.locator('.binder-photo-mat img').first().evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();return (r.left-p.left)/p.width;});assert(Math.abs(inset-.01)<.002);
 const shading=await page.locator('.binder-flip-page:not(.binder-flip-cover) .binder-flip-face').first().evaluate(el=>{const s=getComputedStyle(el,'::after');return {gradient:s.backgroundImage,shadow:s.boxShadow};});assert(shading.gradient.includes('linear-gradient')&&shading.shadow!=='none');
 // Partial drag returns to the same page.
 await page.locator('.binder-flip-root').scrollIntoViewIfNeeded();let b=await page.locator('.binder-flip-root').boundingBox();
 await page.mouse.move(b.x+b.width-5,b.y+b.height*.75);await page.mouse.down();await page.mouse.move(b.x+b.width-35,b.y+b.height*.7,{steps:8});await page.mouse.up();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/1페이지/);
 // Full drag advances exactly once.
 b=await page.locator('.binder-flip-root').boundingBox();await page.mouse.move(b.x+b.width-5,b.y+b.height*.75);await page.mouse.down();await page.mouse.move(b.x+8,b.y+b.height*.7,{steps:16});await page.mouse.up();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 // Reverse drag also completes inside the visible page.
 b=await page.locator('.binder-flip-root').boundingBox();await page.mouse.move(b.x+5,b.y+b.height*.75);await page.mouse.down();await page.mouse.move(b.x+b.width-8,b.y+b.height*.7,{steps:16});await page.mouse.up();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/1페이지/);
 await page.locator('[data-act=next]').click();await page.waitForTimeout(750);assert.match(await page.locator('#pageNav').innerText(),/2페이지/);
 // Pinch handler: zoom stops flipping; reset restores it.
 await page.evaluate(()=>{const el=document.querySelector('#viewer');function ev(type,pts){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:pts.map(([clientX,clientY])=>({clientX,clientY}))});el.dispatchEvent(e);}const r=el.querySelector('.binder-flip-root').getBoundingClientRect(),v=el.getBoundingClientRect(),x=Math.max(r.left,v.left)+60,y=Math.max(r.top,v.top)+50;ev('touchstart',[[x,y],[x+100,y]]);ev('touchmove',[[x-25,y],[x+125,y]]);ev('touchend',[]);});
 assert(await page.locator('.binder-book-zoomed').count());const z=await page.locator('.binder-flip-root').evaluate(el=>el.style.transform);assert.equal(z,'scale(1.5)');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.body.scrollWidth<=innerWidth),'zoom is contained in the viewer');
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
 for(const pockets of [4,6,12]){const p=await browser.newPage({viewport:{width:360,height:800}});await fixture(p,pockets);await p.goto(base+'/binder.html?view=detail&id=fixture');await p.waitForSelector('.stf__item');const rect=await p.locator('.binder-flip-root').boundingBox();assert(rect.width<=324 && rect.width>=310);await p.locator('[data-act=next]').click();await p.waitForTimeout(700);assert.match(await p.locator('#pageNav').innerText(),/1페이지/);await p.close();}
 // App viewport: lock shelf/overview zoom; single-page and full-page image zoom stay local.
 await page.goto(base+'/binder.html?view=detail&id=fixture&app=1');await page.waitForSelector('.stf__item');
 assert.match(await page.locator('meta[name=viewport]').getAttribute('content'),/maximum-scale=1/);
 const blocked=await page.evaluate(()=>{const e=new Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:[{clientX:20,clientY:20},{clientX:120,clientY:20}]});document.querySelector('.detail-head').dispatchEvent(e);return e.defaultPrevented;});assert(blocked);
 await page.evaluate(()=>{const el=document.querySelector('#viewer');const e=new Event('touchstart',{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:[{clientX:10,clientY:10},{clientX:100,clientY:10}]});el.dispatchEvent(e);const m=new Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(m,'touches',{value:[{clientX:0,clientY:10},{clientX:150,clientY:10}]});el.dispatchEvent(m);});
 assert.equal(await page.locator('.binder-flip-root').evaluate(el=>el.style.transform),'scale(1)');
 await page.locator('[data-act=mode-all]').click();assert.match(await page.locator('meta[name=viewport]').getAttribute('content'),/maximum-scale=1/);
 assert(await page.locator('.viewer.all .cover').evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('linear-gradient')));
 const overviewWidth=await page.locator('#viewerContent').evaluate(el=>el.getBoundingClientRect().width);
 await page.evaluate(()=>{const el=document.querySelector('#viewer');for(const [type,gap] of [['touchstart',100],['touchmove',200],['touchend',0]]){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:gap?[{clientX:60,clientY:200},{clientX:60+gap,clientY:200}]:[]});el.dispatchEvent(e);}});
 assert.equal(await page.locator('#viewerContent').evaluate(el=>el.getBoundingClientRect().width),overviewWidth,'overview pinch cannot enlarge binder');
 // Selected page opens alone, fits the screen, and retains overview position on close.
 await page.locator('[data-act=full-page][data-index="2"]').scrollIntoViewIfNeeded();const beforeScroll=await page.evaluate(()=>scrollY);
 await page.locator('[data-act=full-page][data-index="2"]').click();await page.waitForFunction(()=>document.querySelector('#pageFullview').open);
 await page.waitForFunction(()=>document.querySelector('#pageFullview img')?.naturalWidth>0);
 assert.equal(await page.locator('#pageFullviewTitle').innerText(),'2페이지');assert.equal(await page.locator('#pageFullview img').count(),1);
 const fullRect=await page.locator('#pageFullview').boundingBox();assert.equal(fullRect.width,480);assert.equal(fullRect.height,844);
 await page.locator('[data-act=full-page-in]').click();assert.equal(await page.locator('[data-page-zoom]').innerText(),'125%');
 assert.equal(await page.locator('#viewerContent').evaluate(el=>el.getBoundingClientRect().width),overviewWidth);
 await page.screenshot({path:'/tmp/binder-fullpage-qa.png',fullPage:false});
 await page.locator('[data-act=close-full-page]').click();await page.waitForFunction(()=>!document.querySelector('#pageFullview').open);
 assert(Math.abs(await page.evaluate(()=>scrollY)-beforeScroll)<2,'close preserves overview scroll');
 await page.locator('[data-act=full-page][data-index="1"]').click();await page.waitForFunction(()=>document.querySelector('#pageFullview').open);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#pageFullview').open);
 await page.locator('[data-act=full-page][data-index="3"]').click();await page.waitForFunction(()=>document.querySelector('#pageFullview').open);await page.goBack();await page.waitForFunction(()=>!document.querySelector('#pageFullview').open);assert(await page.locator('.viewer.all').count());
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.body.scrollWidth<=innerWidth),'app overview cannot widen document');
 await page.goto(base+'/binder.html?view=mine&app=1');await page.waitForSelector('#binderList .cover');assert.match(await page.locator('meta[name=viewport]').getAttribute('content'),/maximum-scale=1/);
 const shelfPinchBlocked=await page.evaluate(()=>{const e=new Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(e,'touches',{value:[{clientX:20,clientY:100},{clientX:200,clientY:100}]});document.querySelector('#binderList').dispatchEvent(e);return e.defaultPrevented;});assert(shelfPinchBlocked);
 assert(await page.locator('#binderList .cover').evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('linear-gradient')));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.body.scrollWidth<=innerWidth),'app shelf cannot widen document');
 await page.screenshot({path:'/tmp/binder-shelf-qa.png',fullPage:true});
 await page.goto(base+'/binder.html?view=edit&id=fixture&app=1');await page.waitForSelector('#draftTitle');assert(!await page.locator('meta[name=viewport]').getAttribute('content').then(s=>s.includes('maximum-scale=1')));
 // Native menu handshake: retry late shell startup, route before context, hide only after ACK.
 const nativePage=await browser.newPage({viewport:{width:390,height:844}});await fixture(nativePage);
 await nativePage.addInitScript(()=>{window.__binderMessages=[];setTimeout(()=>{window.ReactNativeWebView={postMessage(raw){const m=JSON.parse(raw);window.__binderMessages.push(m);if(m.type==='BINDER_DETAIL_CONTEXT')document.documentElement.classList.add('binder-native-menu','binder-native-header');}};},650);});
 await nativePage.goto(base+'/binder.html?view=detail&id=fixture&app=1');
 await nativePage.waitForFunction(()=>document.documentElement.classList.contains('binder-native-menu'));
 const handshake=await nativePage.evaluate(()=>window.__binderMessages);const contextIndex=handshake.findIndex(m=>m.type==='BINDER_DETAIL_CONTEXT');assert.equal(handshake[contextIndex-1].type,'WEB_ROUTE');assert.equal(handshake[contextIndex].mine,true);
 assert.equal(await nativePage.locator('.detail-author [data-detail-menu]').isVisible(),false);
 await nativePage.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));});
 await nativePage.waitForFunction(()=>window.__binderMessages.filter(m=>m.type==='BINDER_DETAIL_CONTEXT').length>=2);
 await nativePage.close();
 // Actual TALK renderers use the same depth on the all-feed rail and binder grid.
 await page.route('**/popup-runtime-v1.js*',route=>route.fulfill({body:''}));
 await page.route('**/talk-safety-v1.js*',route=>route.fulfill({body:''}));
 await page.route('**/funy-mon-account-migrate.js*',route=>route.fulfill({body:''}));
 await page.route('**/data/pokamo-feed.json*',route=>route.fulfill({json:{items:[]}}));
 await page.route('https://wdttzpbmqavaqfcbaywj.supabase.co/**',route=>route.fulfill({json:[{id:'post',user_id:'owner',category:'자유 게시판',title:'바인더 표지 테스트',body:'테스트',created_at:'2026-10-24',community_post_images:[]}]}));
 await page.goto(base+'/talk.html?app=1');await page.waitForSelector('.binder-rail-cover');
 assert(await page.locator('.binder-rail-cover').evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('linear-gradient')));
 await page.screenshot({path:'/tmp/binder-talk-rail-qa.png',fullPage:true});
 await page.locator('[data-cat="카드 자랑"]').click();await page.locator('[data-showcase=binders]').click();await page.waitForSelector('.talk-binder-cover');
 assert(await page.locator('.talk-binder-cover').evaluate(el=>getComputedStyle(el,'::after').backgroundImage.includes('linear-gradient')));
 await page.screenshot({path:'/tmp/binder-talk-grid-qa.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: showcase scope, drag complete/cancel, depth, pinch lock, overview, resize, reduced motion, boundaries, preview isolation, all pocket ratios');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
