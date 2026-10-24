// Browser fixtures only; all external network requests are blocked by fixture().
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),existing=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8');
const fixture=new Function('return ('+existing.slice(existing.indexOf('async function fixture('),existing.indexOf('\n(async()=>{'))+')')();
const server=http.createServer((req,res)=>{const file=path.join(root,new URL(req.url,'http://localhost').pathname);try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});const errors=[];
try{
 for(const view of ['mine','feed','detail']){
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));await fixture(page);
  await page.route('**/web-safe-area.css*',async route=>{const source=fs.readFileSync(path.join(root,'web-safe-area.css'),'utf8').replace(/env\(safe-area-inset-top,0px\)/g,'47px');await route.fulfill({contentType:'text/css',body:source});});
  await page.goto(base+'/binder.html?view='+view+(view==='detail'?'&id=fixture':''));await page.waitForSelector(view==='detail'?'.binder-flip-root':'.binder-card');await page.waitForFunction(()=>document.querySelector('.binder-header').classList.contains('funy-safe-header'));
  const header=page.locator('.binder-header');
  assert.equal(await header.evaluate(h=>getComputedStyle(h).height),'105px');
  assert(await page.locator('#back').evaluate(b=>b.getBoundingClientRect().top>=47));
  if(view==='detail'){await page.locator('[data-act=mode-all]').click();await page.waitForSelector('.overview-page-button');}
  else await page.locator('#app').evaluate(el=>{const spacer=document.createElement('div');spacer.style.height='1700px';el.appendChild(spacer);});
  await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(150);
  assert.equal(Math.round((await header.boundingBox()).y),0,view+' header pinned after scroll');
  assert(await header.evaluate(h=>{const r=h.getBoundingClientRect();return h.contains(document.elementFromPoint(r.right-20,70));}),view+' header above binder content');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view+' no horizontal overflow');
  if(view==='detail'){await page.locator('.overview-page-button').first().click();assert(await page.locator('#pageFullview').evaluate(d=>d.matches(':modal')));assert(await page.locator('#pageFullview').evaluate(d=>d.contains(document.elementFromPoint(20,20))));await page.evaluate(()=>document.getElementById('pageFullview').close());}
  await page.close();
 }
 const editor=await browser.newPage({viewport:{width:390,height:844}});await fixture(editor);await editor.goto(base+'/binder.html?view=edit&id=fixture');await editor.waitForSelector('#draftTitle');assert.equal(await editor.locator('.binder-header').evaluate(h=>getComputedStyle(h).position),'sticky','editor web header stays fixed');assert.equal(await editor.locator('.edit-info').evaluate(h=>getComputedStyle(h).position),'static','saving status scrolls normally');await editor.close();
 const page=await browser.newPage({viewport:{width:390,height:844}});await fixture(page);await page.addInitScript(()=>{window.ReactNativeWebView={postMessage(raw){const m=JSON.parse(raw);if(m.type==='BINDER_DETAIL_CONTEXT'){document.documentElement.classList.add('binder-native-menu','binder-native-header');}}};});await page.goto(base+'/binder.html?view=detail&id=fixture&app=1');await page.waitForFunction(()=>document.documentElement.classList.contains('binder-native-menu'));assert.equal(await page.locator('.binder-header').isVisible(),false);assert.equal(await page.locator('.detail-author .detail-more-native').isVisible(),false);await page.close();
 assert.deepEqual(errors,[]);console.log('PASS browser: shelf/feed/detail sticky y=0 after scroll, 47px safe area, controls below notch, book layering, no overflow, full-view dialog above header; native header ACK suppresses duplicate web/profile menus');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
