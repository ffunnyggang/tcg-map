// Browser bridge-contract regression; no live database writes or native-device claims.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),existing=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8');
const fixture=new Function('return ('+existing.slice(existing.indexOf('async function fixture('),existing.indexOf('\n(async()=>{'))+')')();
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
 try{
 for(const platform of ['android','ios']){
  for(const wrapped of [false,true]){
   const page=await browser.newPage({viewport:{width:390,height:844}});await fixture(page);
   await page.route('https://funypin.kr/**',route=>{
    const p=new URL(route.request().url()).pathname;
    if(p==='/web-auth.js'||p==='/funy-efficiency-v1.js')return route.fulfill({body:''});
    try{return route.fulfill({contentType:/\.m?js$/.test(p)?'text/javascript':p.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(path.join(root,p))});}
    catch{return route.fulfill({status:404,body:''});}
   });
   await page.addInitScript(({platform})=>{
    if(window!==window.top)return; // Android only injects bridge in main frame.
    window.__messages=[];window.__nativeRoute=location.href;window.__nativeContext=null;
    window.ReactNativeWebView={postMessage(raw){
     const data=JSON.parse(raw);window.__messages.push(data);
     if(data.type==='WEB_ROUTE')window.__nativeRoute=data.url;
     // AOS build 10 contract. iOS build 31 intentionally has no binder handler.
     if(platform==='android'&&data.type==='BINDER_DETAIL_CONTEXT'){
      window.__nativeContext=data;
      document.documentElement.classList.add('binder-native-menu','binder-native-header');
     }
    }};
   },{platform});
   const target='https://funypin.kr/binder.html?view=detail&id=fixture&returnTo=%2Ftalk.html';
   const url=wrapped?'https://funypin.kr/cms-inapp-page.html?app=1&appPlatform='+platform+'&target='+encodeURIComponent(target):target+'&app=1&appPlatform='+platform;
   await page.goto(url);await page.waitForSelector('.binder-flip-root',{timeout:12000});
   assert.equal(new URL(page.url()).pathname,'/binder.html','binder runs in main WebView');
   assert.equal(page.frames().length,1,'no nested iframe');
   assert.equal(new URL(page.url()).searchParams.get('returnTo'),'/talk.html');
   await page.waitForFunction(()=>window.__messages.some(m=>m.type==='BINDER_DETAIL_CONTEXT'));
   if(platform==='android'){
    assert.equal(await page.evaluate(()=>new URL(window.__nativeRoute).pathname),'/binder.html');
    assert.equal(await page.evaluate(()=>window.__nativeContext.mine),true);
    assert.equal(await page.locator('.detail-author .detail-more-native').isVisible(),false);
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('funy:native-binder-action',{detail:{action:'share'}})));
    await page.waitForFunction(()=>window.__messages.some(m=>m.type==='SHARE_URL'));
   }else{
    assert.equal(await page.evaluate(()=>window.__nativeContext),null);
    assert.equal(await page.locator('.detail-author .detail-more-native').isVisible(),true,'old iOS keeps usable fallback');
   }
   await page.close();
  }
 }
 // Non-binder CMS pages retain their iframe layout; external destinations remain blocked.
 for(const target of ['https://funypin.kr/partner.html','https://evil.example/binder.html']){
  const page=await browser.newPage();
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='funypin.kr')throw Error('unexpected network');
   if(u.pathname==='/cms-inapp-page.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'cms-inapp-page.html'))});
   return route.fulfill({contentType:'text/html',body:'<h1>fixture</h1>'});
  });
  await page.goto('https://funypin.kr/cms-inapp-page.html?app=1&target='+encodeURIComponent(target));
  assert.equal(new URL(page.url()).pathname,'/cms-inapp-page.html');
  if(target.includes('evil'))assert(await page.locator('#error').isVisible());else assert.equal(page.frames().length,2);
  await page.close();
 }
 console.log('PASS binder direct/CMS bridge, AOS 10 header ACK and share, iOS31 fallback, returnTo, other CMS and invalid host');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
