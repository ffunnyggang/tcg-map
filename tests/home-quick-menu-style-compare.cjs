const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict');
(async()=>{
const b=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:390,height:844});
 await p.evaluateOnNewDocument(()=>{window.fetch=async()=>({ok:true,json:async()=>[{is_enabled:true,position:'before_recommend'}]})});
 await p.goto('file:///C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa/home-quick-menu-test.html',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('.quick-tile');
 assert.equal(await p.$('#openEditor'),null);assert.equal(await p.$('#openHomeSettings'),null);
 assert.equal(await p.$('.quick-heading'),null);assert.equal(await p.$('.order-hint'),null);
 let data=await p.evaluate(()=>{const s=document.querySelector('.quick-scroller'),tiles=[...document.querySelectorAll('.quick-tile')];return{viewport:innerWidth,scroller:s.clientWidth,scrollWidth:s.scrollWidth,tile:tiles[0].getBoundingClientRect().width,gap:parseFloat(getComputedStyle(document.querySelector('.quick-items')).gap),count:tiles.length,label:document.querySelector('#quickSection').getAttribute('aria-label')}});
 assert.equal(data.count,5);assert(data.scrollWidth>data.scroller);const visible=(data.scroller+data.gap)/(data.tile+data.gap);assert(visible>=4.35&&visible<=4.85,'expected approximately 4.5 tiles, got '+visible);console.log('FIRST_VIEW',JSON.stringify({...data,visible:visible.toFixed(2)}));
 assert.equal(await p.$eval('#variantSvg',x=>x.getAttribute('aria-pressed')),'true');
 assert.equal(await p.$$eval('.quick-emoji',els=>els.length),0);
 await p.click('#variantEmoji');assert.equal(await p.$$eval('.quick-emoji',els=>els.length),4);
 await p.click('#variantSvg');assert.equal(await p.$$eval('.quick-emoji',els=>els.length),0);
 const add=await p.$('.quick-tile.add');await add.evaluate(x=>x.scrollIntoView({block:'nearest',inline:'end'}));await add.click();
 assert.equal(await p.$eval('.scrim',x=>x.classList.contains('open')),true);
 assert.equal(await p.$eval('.menu-choice:not(.selected) .indicator',x=>!!x.querySelector('svg')),true,'plus must be SVG icon');
 assert.equal(await p.$eval('.menu-choice.selected .indicator',x=>x.textContent),'1');
 await p.click('[data-menu-id="favorite"]');await p.click('[data-menu-id="favorite"]');assert.equal(await p.$eval('.menu-choice.selected .indicator',x=>x.textContent),'1');
 await p.click('#closeEditor');
 for(const width of [320,360,375,390,420,600,768]){await p.setViewport({width,height:844});const info=await p.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,frame:document.querySelector('.phone').clientWidth,scroller:document.querySelector('.quick-scroller').clientWidth,scrollWidth:document.querySelector('.quick-scroller').scrollWidth}));assert.equal(info.documentWidth,width,'horizontal page overflow '+width);assert(info.scrollWidth>info.scroller,'horizontal menu scroll '+width);console.log('WIDTH',JSON.stringify(info))}
 assert.deepEqual(errors,[]);console.log('PASS removed headings/edit/hint, scroll 4.5 tiles, two visual styles, plus icon editor, numbering, 7 viewport widths');
}finally{await b.close()}
})().catch(e=>{console.error('QA FAILURE',e.stack);process.exitCode=1});