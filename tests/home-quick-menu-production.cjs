const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict'),fs=require('fs');
const root='C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa';
const UUID='77777777-7777-4777-8777-777777777777';
async function setup(browser,{active=true,order=5,user=false}={}){
 const page=await browser.newPage();await page.setViewport({width:390,height:844});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div class="portal-main"><div class="home-content-flow"><div class="fp-cms-shell"><div class="fp-cms-pilot" data-cms-placement="home"></div></div></div></div></body></html>');
 await page.addStyleTag({path:root+'/home-quick-menu-v1.css'});
 await page.evaluate(({active,order,user,UUID})=>{
  window.config={is_enabled:active,sort_order:order};
  window.savedPref=null;window.posts=[];
  window.FUNY_WEB_AUTH={
   getSession:async()=>user?{access_token:'fake-user-token',user:{id:UUID}}:null,
   session:user?{access_token:'fake-user-token',user:{id:UUID}}:null
  };
  window.fetch=async(url,opts={})=>{
   const u=String(url),response=(data,status=200)=>({ok:true,status,json:async()=>data,text:async()=>JSON.stringify(data)});
   if(u.includes('/home_quick_menu_settings'))return response([{...window.config}]);
   if(u.includes('home_quick_menu_user_preferences')){
    if(opts.method==='POST'){window.posts.push({url:u,headers:opts.headers,body:JSON.parse(opts.body)});window.savedPref=JSON.parse(opts.body).selected_menu_ids;return response([],204)}
    return response(window.savedPref?[{selected_menu_ids:window.savedPref}]:[]);
   }
   if(u.includes('/cms_blocks?'))return response([
    {id:'11111111-1111-4111-8111-111111111111',placement:'home',block_type:'home_shop_discovery',sort_order:10,status:'published',is_active:true},
    {id:'22222222-2222-4222-8222-222222222222',placement:'home',block_type:'home_tcg_schedule',sort_order:100,status:'published',is_active:true},
    {id:'33333333-3333-4333-8333-333333333333',placement:'home',block_type:'home_popular_talk',sort_order:170,status:'published',is_active:true}
   ]);
   if(u.includes('/cms_block_items?')||u.includes('/cms_contents?')||u.includes('/shops?'))return response([]);
   throw Error('Unexpected API '+u);
  };
 },{active,order,user,UUID});
 await page.addScriptTag({path:root+'/home-quick-menu-v1.js'});
 await page.addScriptTag({path:root+'/cms-frontend-renderer.js'});
 const el=()=>page.$('.fp-cms-pilot');
 await page.waitForFunction(()=>!!document.querySelector('.fp-cms-home-shops-slot'));
 return {page,errors};
}
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const {page,errors}=await setup(browser);
  await page.waitForSelector('.fqm-tile');
  assert.deepEqual(await page.$$eval('.fp-cms-pilot > div',x=>x.slice(0,4).map(e=>e.className)),['fp-cms-quick-menu-slot','fp-cms-home-shops-slot','fp-cms-home-schedule-slot','fp-cms-home-talk-slot']);
  assert.equal(await page.$$eval('.fqm-tile[href]',x=>x.length),4);
  assert.equal(await page.$eval('.fqm-emoji',x=>x.textContent),'💜');
  await page.locator('.fqm-add').click();
  assert.equal(await page.$eval('.fqm-handle',x=>x.getBoundingClientRect().width>=35),true);
  assert.equal(await page.$$eval('.fqm-choice',x=>x.length),15);
  await page.locator('[data-quick-id="box"]').click();
  await page.locator('[data-quick-id="box"]').click();
  assert.deepEqual(await page.$$eval('.fqm-choice.selected .fqm-choice-badge',x=>x.map(el=>el.textContent)),['1','2','3','4']);
  await page.locator('#fqm-save').click();
  assert.deepEqual(await page.$$eval('.fqm-tile[href]',x=>x.map(el=>el.getAttribute('href'))),['/my-favorites.html','/store.html?kind=graded','/market.html','/store.html?kind=box']);
  assert.equal(await page.$eval('.fqm-sheet',()=>false).catch(()=>true),true);
  for(const width of [320,360,390,420,600,768]){
   await page.setViewport({width,height:844});
   const w=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,rail:document.querySelector('.fqm-scroll').scrollWidth,visible:document.querySelector('.fqm-scroll').clientWidth}));
   assert.equal(w.document,w.viewport,'no body horizontal scroll '+width);if(width<=420)assert(w.rail>w.visible,'rail scroll enabled '+width);
  }
  await page.evaluate(()=>{window.config.sort_order=115});
  await page.evaluate(()=>window.FunyCMS.renderAll());
  await page.waitForFunction(()=>document.querySelector('.fp-cms-pilot > div')?.className==='fp-cms-home-shops-slot');
  assert.deepEqual(await page.$$eval('.fp-cms-pilot > div',x=>x.slice(0,4).map(e=>e.className)),['fp-cms-home-shops-slot','fp-cms-home-schedule-slot','fp-cms-quick-menu-slot','fp-cms-home-talk-slot']);
  await page.evaluate(()=>{window.config.is_enabled=false;window.FunyCMS.renderAll()});
  await page.waitForFunction(()=>!document.querySelector('.fp-cms-quick-menu-slot'));
  assert.equal(await page.$('.fqm-tile'),null,'OFF removes quick menu');
  assert.deepEqual(errors,[]);
  console.log('GUEST PASS admin sort ON/OFF, 15 options, emoji, local save, 6 widths');
  const auth=await setup(browser,{user:true});const a=auth.page;
  await a.waitForSelector('.fqm-add');await a.locator('.fqm-add').click();
  await a.locator('[data-quick-id="events"]').click();
  await a.locator('#fqm-save').click();
  await a.waitForFunction(()=>window.posts.length===1);
  const posts=await a.evaluate(()=>window.posts);
  assert.equal(posts[0].body.user_id,UUID);
  assert.deepEqual(posts[0].body.selected_menu_ids,['favorite','box','graded','market','events']);
  assert(posts[0].headers.Authorization==='Bearer fake-user-token');
  assert.deepEqual(auth.errors,[]);
  console.log('SIGNED-IN PASS RLS-scoped user preference POST, 15-item picker');
  const index=fs.readFileSync(root+'/index.html','utf8');
  assert(index.includes('home-quick-menu-v1.js?v=20261106-appnavsheet2'));
  assert(index.includes('home-quick-menu-v1.css?v=20261106-left20'));
  console.log('INDEX ASSET PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error('QA FAIL',e.stack);process.exitCode=1});