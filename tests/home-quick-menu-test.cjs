const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();await page.setViewport({width:390,height:844});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://funypin.kr/home-quick-menu-test.html?qa=blocks-20261106',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('#homeLayoutBtn',{timeout:20000});
  const labels=()=>page.$$eval('.shortcut-label',nodes=>nodes.map(n=>n.textContent));
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','BOX 시세','PICK 콘텐츠']);
  await page.click('#openEditor');
  assert.equal(await page.$eval('#counter',x=>x.textContent),'4 / 4');
  assert.equal(await page.$$eval('.menu-block',x=>x.length),14);
  assert.equal(await page.$eval('[data-toggle-id="graded"]',x=>x.disabled),true);
  // Drag the first active block onto the third block, then back with the arrow controls.
  const dragFrom=await page.$eval('[data-drag-id="shops"]',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
  const dragTo=await page.$eval('#activeBlocks [data-block-id="box"]',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
  await page.mouse.move(dragFrom.x,dragFrom.y);await page.mouse.down();
  await page.mouse.move(dragTo.x,dragTo.y,{steps:12});await page.mouse.up();
  assert.deepEqual(await page.$$eval('#activeBlocks .menu-block',a=>a.map(x=>x.dataset.blockId)),['favorite','box','shops','pick'],'pointer drag must reorder');
  await page.click('[data-move-id="shops"][data-step="-1"]');
  await page.click('[data-move-id="shops"][data-step="-1"]');
  await page.click('[data-toggle-id="pick"]');
  assert.equal(await page.$eval('#counter',x=>x.textContent),'3 / 4');
  await page.click('[data-toggle-id="talk"]');
  await page.click('[data-move-id="talk"][data-step="-1"]');
  await page.click('#positionBottom');
  await page.click('#saveEditor');
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','TALK','BOX 시세']);
  assert(await page.evaluate(()=>document.querySelector('#recommendSection').compareDocumentPosition(document.querySelector('#quickSection'))&Node.DOCUMENT_POSITION_FOLLOWING));
  await page.reload({waitUntil:'domcontentloaded'});
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','TALK','BOX 시세']);
  await page.click('#homeLayoutBtn');
  await page.click('#toggleSection');
  await page.click('#saveEditor');
  assert.equal(await page.$eval('#quickSection',el=>el.hidden),true);
  assert.equal(await page.$eval('#homeLayoutBtn',el=>getComputedStyle(el).display!=='none'),true);
  await page.click('#homeLayoutBtn');await page.click('#toggleSection');await page.click('#positionTop');await page.click('#saveEditor');
  assert.equal(await page.$eval('#quickSection',el=>el.hidden),false);
  await page.click('#homeLayoutBtn');await page.click('#toggleSection');await page.click('#closeEditor');
  assert.equal(await page.$eval('#quickSection',el=>el.hidden),false,'cancel must not persist');
  await page.click('#homeLayoutBtn');await page.click('#resetEditor');await page.click('#saveEditor');
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','BOX 시세','PICK 콘텐츠']);
  for(const width of [320,360,390,420,600,768]){
    await page.setViewport({width,height:844});
    const d=await page.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,frame:Math.round(document.querySelector('.phone').getBoundingClientRect().width)}));
    assert.equal(d.doc,width,'horizontal overflow at '+width);assert(d.frame<=420);console.log('VIEWPORT',JSON.stringify(d));
  }
  assert.deepEqual(errors,[],'no page JavaScript errors');
  console.log('PASS toggles, count limit, reorder arrows, HOME section position/visibility, cancel, reload persistence, reset, six widths');
 }finally{await browser.close()}
})().catch(e=>{console.error('QA FAIL',e.stack);process.exitCode=1});