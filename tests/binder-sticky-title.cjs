// Rendering regression: default single mode, real window scrolling, and title before module/auth load.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),existing=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8');
const fixture=new Function('return ('+existing.slice(existing.indexOf('async function fixture('),existing.indexOf('\n(async()=>{'))+')')();
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;let file=path.join(root,pathname);if(pathname==='/binder.css'&&process.env.BINDER_QA_CSS)file=process.env.BINDER_QA_CSS;try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));await fixture(page);
 await page.goto(base+'/binder.html?view=detail&id=fixture');await page.waitForSelector('.binder-flip-root');
 await page.locator('.comments').evaluate(el=>{const content=document.createElement('div');content.style.height='1800px';content.textContent='Long comment fixture';el.append(content);});
 for(const mode of ['single','all','single']){
  await page.evaluate(()=>window.scrollTo(0,0));await page.locator('[data-act=mode-'+mode+']').click();await page.waitForTimeout(100);
  await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(100);
  const info=await page.evaluate(()=>({y:scrollY,headerTop:document.querySelector('.binder-header').getBoundingClientRect().top,width:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert(info.y>=500,mode+' test must actually scroll the window');
  assert.equal(Math.round(info.headerTop),0,mode+' header stays at viewport top');
  assert(info.width<=info.viewport,mode+' no horizontal overflow');
 }
 await page.close();
 for(const [view,title,ready] of [['detail','바인더 자랑하기','.binder-flip-root'],['feed','바인더 자랑하기','.binder-card'],['mine','바인더 보관함','.binder-card'],['edit','내 바인더 만들기','#draftTitle']]){
  const p=await browser.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));await fixture(p);
  await p.addInitScript(()=>{window.__binderTitleHistory=[];new MutationObserver(()=>{const value=document.getElementById('pageTitle')?.textContent.trim();if(value&&window.__binderTitleHistory.at(-1)!==value)window.__binderTitleHistory.push(value);}).observe(document,{childList:true,subtree:true,characterData:true});});
  let release;const pending=new Promise(r=>release=r);await p.route('**/binder.js?*',async route=>{await pending;await route.continue();});
  try{
   await p.goto(base+'/binder.html?view='+view+'&id=fixture',{waitUntil:'commit'});
   await p.waitForFunction(()=>!!document.getElementById('pageTitle')?.textContent.trim());
   assert.equal(await p.locator('#pageTitle').innerText(),title,view+' initial title before module/auth');
   assert.equal(await p.title(),title+' | FUNY PIN');
   release();await p.waitForSelector(ready);
   assert.deepEqual(await p.evaluate(()=>window.__binderTitleHistory),[title],view+' must not briefly show another page title');
  }finally{release();await p.close();}
 }
 assert.deepEqual(errors,[]);
 console.log('PASS single -> all -> single: actual window scroll >=500px, header y=0, no overflow. Correct initial route title before module/auth and no title flash for detail/feed/mine/edit.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
