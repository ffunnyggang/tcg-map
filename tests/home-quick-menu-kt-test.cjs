const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict'),fs=require('fs');
const root='C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa';
const expected=[
['favorite','관심 목록','/my-favorites.html'],
['box','BOX 시세','/products.html?kind=box'],
['graded','등급카드','/products.html?kind=graded'],
['market','TCG 거래','/market.html'],
['events','이벤트','/my-events.html'],
['coupons','쿠폰함','/my-coupons.html'],
['mon','퍼니몬 도감','/my-funymon.html'],
['ranking','랭킹','/ranking.html'],
['shop_news','카드샵 소식','/pick.html?tab=shop_news'],
['information','TCG 정보','/pick.html?tab=information'],
['schedule','TCG 일정','/pick.html?tab=schedule'],
['creator','CREATOR','/pick.html?tab=creator'],
['tools','TCG TOOL','/tcg-tools.html'],
['entries','내 응모 내역','/my-entries.html'],
['binder','내 바인더','/binder.html']
];
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844});
  await page.evaluateOnNewDocument(()=>{
   window.fetch=async()=>({ok:true,json:async()=>[{is_enabled:true,position:'before_recommend'}]});
  });
  await page.goto('file:///'+root+'/home-quick-menu-test.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.quick-tile');
  const menu=()=>page.$$eval('.menu-choice',els=>els.map(el=>({id:el.dataset.menuId,label:el.querySelector('span').textContent,badge:el.querySelector('.indicator').textContent})));
  assert.deepEqual(await page.$$eval('.quick-items a',els=>els.map(el=>el.getAttribute('href'))),expected.slice(0,4).map(x=>x[2]),'fresh defaults from allowed catalog');
  await page.click('.quick-tile.add');
  const observed=await menu();
  assert.equal(observed.length,15,'exactly 15 entries');
  assert.deepEqual(observed.map(x=>[x.id,x.label]),expected.map(x=>x.slice(0,2)));
  assert.deepEqual(observed.slice(0,4).map(x=>x.badge),['1','2','3','4']);
  for(const [id,label,href] of expected)assert(fs.existsSync(root+href.split('?')[0]),'missing destination '+href);
  assert.equal(await page.$('#sectionToggle'),null,'admin controls must not be in user picker');
  await page.click('#clearAll');
  for(const id of ['creator','shop_news','schedule','information','tools'])await page.click('[data-menu-id="'+id+'"]');
  assert.deepEqual((await menu()).slice(0,5).map(x=>x.id),['creator','shop_news','schedule','information','tools']);
  assert.deepEqual((await menu()).slice(0,5).map(x=>x.badge),['1','2','3','4','5']);
  await page.click('#saveEditor');
  const urls=await page.$$eval('.quick-items a',els=>els.map(el=>el.getAttribute('href')));
  assert.deepEqual(urls,['/pick.html?tab=creator','/pick.html?tab=shop_news','/pick.html?tab=schedule','/pick.html?tab=information','/tcg-tools.html']);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.deepEqual(await page.$$eval('.quick-items a',els=>els.map(el=>el.getAttribute('href'))),urls,'saved selection maintained');
  await page.click('.quick-tile.add');
  await page.click('[data-menu-id="shop_news"]');await page.click('[data-menu-id="shop_news"]');
  assert.deepEqual((await menu()).slice(0,5).map(x=>x.id),['creator','schedule','information','tools','shop_news']);
  await page.click('#closeEditor');
  assert.deepEqual(await page.$$eval('.quick-items a',els=>els.map(el=>el.getAttribute('href'))),urls,'cancel does not save');
  for(const width of [320,360,390,420,600,768]){
   await page.setViewport({width,height:844});
   const size=await page.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,frame:Math.round(document.querySelector('.phone').getBoundingClientRect().width)}));
   assert.equal(size.doc,size.viewport,'horizontal overflow '+width);assert(size.frame<=420);
  }
  // Existing user selection is filtered to the 15 allowed IDs without scrambling it.
  const second=await browser.newPage();
  await second.evaluateOnNewDocument(()=>{
   localStorage.setItem('funypin.home.quick-menu.test.kt.v1',JSON.stringify({selected:['talk','box','graded','raffle','favorite']}));
   window.fetch=async()=>({ok:true,json:async()=>[{is_enabled:true,position:'before_recommend'}]});
  });
  await second.goto('file:///'+root+'/home-quick-menu-test.html',{waitUntil:'domcontentloaded'});
  assert.deepEqual(await second.$$eval('.quick-items a',els=>els.map(el=>el.getAttribute('href'))),['/products.html?kind=box','/products.html?kind=graded','/my-favorites.html']);
  const pickSource=fs.readFileSync(root+'/pick.html','utf8');
  assert(pickSource.includes("['shop_news','information','schedule','creator','tools','review'].includes(requestedTab)"),'PICK direct tab whitelist');
  const actualTabs=[...pickSource.matchAll(/data-tab="([^"]+)"/g)].map(m=>m[1]);
  for(const key of ['shop_news','information','schedule','creator','tools'])assert(actualTabs.includes(key),'PICK tab missing '+key);
  assert.deepEqual(errors,[]);
  console.log('PASS 15 allowed menus, destinations, PICK tab deep links, selection order, local persistence, legacy filter, 6 widths');
 }finally{await browser.close()}
})().catch(e=>{console.error('QA FAIL',e.stack);process.exitCode=1});