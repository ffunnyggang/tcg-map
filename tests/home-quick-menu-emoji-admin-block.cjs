const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer'),assert=require('node:assert/strict'),fs=require('fs');
const root='C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa';
(async()=>{
const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.setViewport({width:390,height:844});
 await p.evaluateOnNewDocument(()=>{window.fetch=async()=>({ok:true,json:async()=>[{is_enabled:true,position:'before_recommend',sort_order:5}]})});
 await p.goto('file:///'+root+'/home-quick-menu-test.html',{waitUntil:'domcontentloaded'});
 await p.waitForSelector('.quick-tile');
 assert.equal(await p.$('.preview-variants'),null,'icon style comparator removed');
 assert.equal(await p.$eval('.quick-tile .quick-emoji',x=>x.textContent),'💜');
 assert.equal(await p.$$eval('.quick-items .quick-emoji',x=>x.length),4,'all four shortcuts use emoji');
 const sc=await p.evaluate(()=>({view:document.querySelector('.quick-scroller').clientWidth,scroll:document.querySelector('.quick-scroller').scrollWidth}));
 assert(sc.scroll>sc.view,'horizontal scroll available');
 await p.locator('.quick-tile.add').click();
 await p.waitForFunction(()=>getComputedStyle(document.querySelector('.sheet')).animationPlayState==='running'||true);
 await new Promise(done=>setTimeout(done,350));
 const info=await p.evaluate(()=>{const sheet=document.querySelector('.sheet').getBoundingClientRect(),footer=document.querySelector('.sheet-footer').getBoundingClientRect(),save=document.querySelector('.save').getBoundingClientRect(),handle=document.querySelector('.sheet-handle').getBoundingClientRect();return{sheetBottom:sheet.bottom,footerBottom:footer.bottom,saveBottom:save.bottom,handleWidth:handle.width,handleHeight:handle.height,buttonAlign:getComputedStyle(document.querySelector('.save')).alignItems}});
 assert.equal(info.sheetBottom,844);assert.equal(info.footerBottom,844);assert.equal(info.saveBottom,844,'no blank bottom after save button');
 assert(info.handleWidth>=35&&info.handleHeight>=4);
 assert.equal(info.buttonAlign,'center');
 assert.equal(await p.$eval('.menu-choice span',x=>getComputedStyle(x).textAlign),'center');
 await p.click('[data-menu-id="box"]');await p.click('[data-menu-id="box"]');
 assert.equal(await p.$eval('.menu-choice.selected .indicator',x=>x.textContent),'1');
 await p.click('#saveEditor');await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('.quick-tile');
 assert.equal(await p.$$eval('.quick-items .quick-emoji',x=>x.length),4);
 for(const width of [320,360,390,420,600,768]){await p.setViewport({width,height:844});const v=await p.evaluate(()=>({doc:document.documentElement.scrollWidth,window:innerWidth}));assert.equal(v.doc,v.window)}
 assert.deepEqual(errors,[]);
 console.log('USER UI PASS emoji fixed, sheet handle, flush footer, centered text, selection, 6 widths');
 const a=await browser.newPage(),adminErrors=[];
 a.on('pageerror',e=>adminErrors.push(e.message));
 await a.setContent('<div id="feed"><div class="cms-builder-main"><select id="cmsPage"><option value="home">HOME</option><option value="pick_creator">PICK</option></select><div id="cmsBlockList"><div class="cms-block-card" draggable="true" data-block-id="a">A</div><div class="cms-block-card" draggable="true" data-block-id="b">B</div></div></div></div>');
 await a.evaluate(()=>{
  window.cmsWrites=[];
  window.settings={id:1,is_enabled:true,position:'before_recommend',sort_order:5};
  window.api=async(path,opts={})=>{
    if(opts.method==='PATCH'){const patch=JSON.parse(opts.body);window.cmsWrites.push({path,patch});Object.assign(window.settings,patch);return null}
    if(path.includes('home_quick_menu_settings'))return [{...window.settings}];
    if(path.includes('cms_blocks'))return [{id:'a',sort_order:10},{id:'b',sort_order:20}];
    throw Error('Unexpected API '+path);
  };
 });
 await a.addScriptTag({path:root+'/admin-home-quick-menu.js'});
 await a.waitForSelector('#cmsBlockList [data-quick-menu-block]');
 const initial=await a.$$eval('#cmsBlockList > .cms-block-card',x=>x.map(el=>el.dataset.quickMenuBlock?'quick':el.dataset.blockId));
 assert.deepEqual(initial,['quick','a','b']);
 const button=a.locator('#cmsBlockList [data-quick-menu-toggle]');await button.click();
 await a.waitForFunction(()=>window.settings.is_enabled===false);
 assert.equal(await a.$eval('#cmsBlockList [data-quick-menu-toggle]',x=>x.classList.contains('on')),false);
 assert.equal(await a.$eval('#cmsBlockList [data-quick-menu-block]',x=>x.draggable),true);
 assert.deepEqual(adminErrors,[]);
 console.log('ADMIN BLOCK PASS insertion in CMS HOME list, ON/OFF write and verification, draggable');
 const adminSrc=fs.readFileSync(root+'/admin.html','utf8');
 for(const x of ['data-quick-menu-block','home_quick_menu_settings?id=eq.1','cmsList.ondragstart','cmsList.ondrop','onOrderSaved'])assert(adminSrc.includes(x),'admin integration missing '+x);
 console.log('CMS SOURCE PASS unified sortable and persistent settings logic');
}finally{await browser.close()}
})().catch(e=>{console.error('QA ERROR',e.stack);process.exitCode=1});