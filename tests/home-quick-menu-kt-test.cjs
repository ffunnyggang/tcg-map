const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict');
(async()=>{
 const b=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setViewport({width:390,height:844});await p.goto('file:///C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa/home-quick-menu-test.html',{waitUntil:'domcontentloaded'});
  const getIds=()=>p.$$eval('.quick-items a',x=>x.map(n=>n.getAttribute('href')));
  assert.equal((await getIds()).length,4);assert.equal(await p.$eval('.quick-items .add',x=>x.textContent),'+');
  await p.click('#openEditor');assert.equal(await p.$$eval('.menu-choice',xs=>xs.length),14);
  assert.equal(await p.$eval('#selectionCount',el=>el.textContent),'4 / 10개 선택');
  await p.click('[data-menu-id="graded"]');
  assert.equal(await p.$eval('#selectionCount',el=>el.textContent),'5 / 10개 선택');
  for(const id of ['talk','events','coupons','mon','ranking'])await p.click('[data-menu-id="'+id+'"]');
  assert.equal(await p.$eval('#selectionCount',el=>el.textContent),'10 / 10개 선택');
  await p.click('[data-menu-id="market"]');
  assert.equal(await p.$eval('#selectionCount',el=>el.textContent),'10 / 10개 선택');
  await p.click('[data-menu-id="ranking"]');
  assert.equal(await p.$eval('#selectionCount',el=>el.textContent),'9 / 10개 선택');
  await p.click('[data-menu-id="market"]');
  await p.click('#saveEditor');assert.equal((await getIds()).length,10);
  await p.reload({waitUntil:'domcontentloaded'});assert.equal((await getIds()).length,10);
  await p.click('#openHomeSettings');await p.click('#clearAll');
  assert.equal(await p.$eval('#selectionCount',el=>el.textContent),'0 / 10개 선택');
  await p.click('#saveEditor');assert.equal((await getIds()).length,0);
  await p.click('.quick-items .add');await p.click('[data-menu-id="shops"]');await p.click('[data-menu-id="box"]');
  await p.\u0024eval('.section-config',el=>el.open=true);await p.click('#positionAfter');await p.click('#sectionToggle');await p.click('#saveEditor');
  assert.equal(await p.$eval('#quickSection',el=>el.hidden),true);
  await p.click('#openHomeSettings');await p.\u0024eval('.section-config',el=>el.open=true);await p.click('#sectionToggle');await p.click('#saveEditor');
  assert.equal(await p.$eval('#quickSection',el=>el.hidden),false);
  assert.equal(await p.evaluate(()=>document.querySelector('#recommendSection').compareDocumentPosition(document.querySelector('#quickSection'))&Node.DOCUMENT_POSITION_FOLLOWING),4);
  await p.click('#openEditor');
  assert.equal(await p.$('#selectedOrder'),null,'manual reorder UI removed');
  assert.equal(await p.$('[data-drag]'),null,'drag handles removed');
  await p.click('[data-menu-id="pick"]');
  await p.click('#saveEditor');
  assert.deepEqual(await getIds(),['/shops.html','/products.html?kind=box','/pick.html'],'menu order follows click sequence');
  await p.click('#openEditor');
  await p.click('[data-menu-id="shops"]');
  await p.click('[data-menu-id="shops"]');
  await p.click('#saveEditor');
  assert.deepEqual(await getIds(),['/products.html?kind=box','/pick.html','/shops.html'],'reselected menu moves to end');
  await p.reload({waitUntil:'domcontentloaded'});
  assert.deepEqual(await getIds(),['/products.html?kind=box','/pick.html','/shops.html'],'selection order persists after reload');
  await p.click('#openEditor');await p.click('[data-menu-id="graded"]');
  await p.click('#closeEditor');
  assert.equal((await getIds()).length,3,'cancel edits should not persist');
  for(const width of [320,360,375,390,420,600,768]){
    await p.setViewport({width,height:844});
    const d=await p.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,frame:Math.round(document.querySelector('.phone').getBoundingClientRect().width),tile:Math.round(document.querySelector('.quick-tile').getBoundingClientRect().width)}));
    assert.equal(d.doc,d.viewport,'overflow '+width);assert(d.frame<=420);console.log('QA_WIDTH',JSON.stringify(d));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS 14 candidates, max10, choose/cancel, clear all, selection-order persistence, section hide/show and placement, 7 widths');
 }finally{await b.close()}
})().catch(e=>{console.error('QA_ERROR',e.stack);process.exitCode=1});