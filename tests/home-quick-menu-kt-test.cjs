const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict');
const root='C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa';
(async()=>{
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
try {
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:390,height:844});
 await page.evaluateOnNewDocument(()=>{
  window.__testAdminSettings={is_enabled:true,position:'before_recommend'};
  window.fetch=async function(){return {ok:true,json:async()=>[{...window.__testAdminSettings}]}};
 });
 await page.goto('file:///'+root+'/home-quick-menu-test.html',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.quick-tile');
 const ids=()=>page.$$eval('.quick-items a',a=>a.map(x=>x.getAttribute('href')));
 const order=()=>page.$$eval('.menu-choice',a=>a.map(x=>({id:x.dataset.menuId,badge:x.querySelector('.indicator').textContent})));
 assert.deepEqual(await ids(),['/shops.html','/my-favorites.html','/products.html?kind=box','/pick.html']);
 await page.click('#openEditor');
 let items=await order();
 assert.deepEqual(items.slice(0,4).map(x=>x.id),['shops','favorite','box','pick']);
 assert.deepEqual(items.slice(0,4).map(x=>x.badge),['1','2','3','4']);
 assert(items.slice(4).every(x=>x.badge==='+'));
 assert.equal(await page.$('#sectionToggle'),null,'no user-level display switch');
 assert.equal(await page.$('#positionBefore'),null,'no user-level positioning');
 await page.click('[data-menu-id="box"]');
 items=await order();assert.deepEqual(items.slice(0,3).map(x=>x.id),['shops','favorite','pick']);
 await page.click('[data-menu-id="box"]');
 items=await order();assert.deepEqual(items.slice(0,4).map(x=>x.id),['shops','favorite','pick','box']);
 assert.deepEqual(items.slice(0,4).map(x=>x.badge),['1','2','3','4']);
 await page.click('[data-menu-id="graded"]');
 items=await order();assert.deepEqual(items.slice(0,5).map(x=>x.id),['shops','favorite','pick','box','graded']);
 assert.equal(items[4].badge,'5');
 await page.click('#saveEditor');
 assert.deepEqual(await ids(),['/shops.html','/my-favorites.html','/pick.html','/products.html?kind=box','/products.html?kind=graded']);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('.quick-tile');
 assert.deepEqual(await ids(),['/shops.html','/my-favorites.html','/pick.html','/products.html?kind=box','/products.html?kind=graded']);
 await page.click('#openEditor');await page.click('#clearAll');
 assert.equal(await page.$eval('#selectionCount',x=>x.textContent),'0 / 10개 선택');
 await page.click('[data-menu-id="talk"]');await page.click('[data-menu-id="shops"]');
 await page.click('#closeEditor');
 assert.equal((await ids()).length,5,'cancel should keep saved state');
 for(const width of [320,360,375,390,420,600,768]){
  await page.setViewport({width,height:844});
  const sizes=await page.evaluate(()=>({vw:innerWidth,doc:document.documentElement.scrollWidth,frame:Math.round(document.querySelector('.phone').getBoundingClientRect().width)}));
  assert.equal(sizes.vw,sizes.doc,'overflow at '+width);assert(sizes.frame<=420);
 }
 // Admin-only controls mount in CMS HOME and persist through the existing authenticated api().
 const admin=await browser.newPage(),errorsAdmin=[];admin.on('pageerror',e=>errorsAdmin.push(e.message));
 await admin.setContent('<div id="feed"><div class="cms-builder-main"><div class="cms-builder-top"><select id="cmsPage"><option value="home">HOME</option><option value="pick_creator">PICK</option></select></div><div id="cmsBlockList"></div></div></div>');
 await admin.evaluate(()=>{
  window.__quickRow={id:1,is_enabled:true,position:'before_recommend'};
  window.api=async function(path,options={}){
   if(options.method==='PATCH'){Object.assign(window.__quickRow,JSON.parse(options.body));return null}
   return [{...window.__quickRow}];
  };
 });
 await admin.addScriptTag({path:root+'/admin-home-quick-menu.js'});
 await admin.waitForFunction(()=>document.querySelector('#ahqEnabled')?.disabled===false);
 assert.equal(await admin.$eval('#ahqEnabled',x=>x.value),'true');
 await admin.select('#ahqEnabled','false');
 await admin.select('#ahqPosition','after_recommend');
 await admin.click('#ahqSave');
 await admin.waitForFunction(()=>document.querySelector('#ahqMessage')?.textContent.includes('저장 완료'));
 assert.deepEqual(await admin.evaluate(()=>({enabled:window.__quickRow.is_enabled,position:window.__quickRow.position})),{enabled:false,position:'after_recommend'});
 await admin.select('#cmsPage','pick_creator');
 assert.equal(await admin.$eval('#adminHomeQuickMenuSettings',x=>x.hidden),true);
 await admin.select('#cmsPage','home');
 assert.equal(await admin.$eval('#adminHomeQuickMenuSettings',x=>x.hidden),false);
 assert.deepEqual(errors,[]);assert.deepEqual(errorsAdmin,[]);
 console.log('PASS selected-first numbered menu, append reselect, save/cancel, 7 widths, admin HOME controls and save, other tab hidden');
}finally{await browser.close()}
})().catch(e=>{console.error('QA FAILURE',e.stack);process.exitCode=1});