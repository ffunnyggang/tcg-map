const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();await page.setViewport({width:390,height:844});
  const url='file:///C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa/home-quick-menu-test.html';
  page.on('pageerror',e=>console.error('PAGE_ERROR',e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const labels=()=>page.$$eval('.shortcut-label',nodes=>nodes.map(n=>n.textContent));
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','BOX 시세','PICK 콘텐츠']);
  await page.click('#openEditor');
  assert.equal(await page.$eval('#counter',e=>e.textContent),'4 / 4');
  assert.equal(await page.$$eval('.option',els=>els.length),14);
  await page.click('[data-choose="pick"]');
  await page.click('[data-choose="talk"]');
  assert.equal(await page.$eval('#counter',e=>e.textContent),'4 / 4');
  await page.click('[data-pos="3"][data-dir="-1"]');
  await page.click('#saveEditor');
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','TALK','BOX 시세']);
  await page.reload({waitUntil:'domcontentloaded'});
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','TALK','BOX 시세']);
  await page.click('#openEditor');
  await page.click('[data-choose="talk"]');
  await page.click('#closeEditor');
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','TALK','BOX 시세']);
  await page.click('#openEditor');await page.click('#resetEditor');await page.click('#saveEditor');
  assert.deepEqual(await labels(),['카드샵 찾기','관심 목록','BOX 시세','PICK 콘텐츠']);
  for(const width of [320,360,390,420,600,768]){
   await page.setViewport({width,height:844});
   const d=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,slots:document.querySelectorAll('.shortcut').length,frameWidth:Math.round(document.querySelector('.phone').getBoundingClientRect().width)}));
   assert.equal(d.documentWidth,d.width,'horizontal overflow at '+width);
   assert.equal(d.slots,4);assert(d.frameWidth<=420);console.log('LAYOUT',JSON.stringify(d));
  }
  console.log('PASS edit, 14 options, reorder, local persistence, cancellation, reset, 6 viewport widths');
 }finally{await browser.close()}
})().catch(e=>{console.error('QA FAIL',e.stack);process.exitCode=1});