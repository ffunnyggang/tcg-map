const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),s=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8'),fixture=new Function('return ('+s.slice(s.indexOf('async function fixture('),s.indexOf('\n(async()=>{'))+')')();
const server=http.createServer((req,res)=>{const p=path.join(root,new URL(req.url,'http://localhost').pathname);try{res.setHeader('Content-Type',/\.m?js$/.test(p)?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{for(const engine of ['chromium','webkit']){
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.platform==='win32'?{channel:'msedge'}:{})});
 try{const page=await browser.newPage({viewport:{width:390,height:844}});await fixture(page);
 await page.goto(base+'/binder.html?view=detail&id=fixture');
 await page.waitForFunction(()=>document.querySelector('#viewerContent')?.style.getPropertyValue('--binder-mat-color'));
 const mat=await page.locator('#viewerContent').evaluate(el=>el.style.getPropertyValue('--binder-mat-color'));
 await page.locator('[data-act=next]').click();await page.waitForTimeout(650);
 for(const selector of ['.binder-flip-root','.binder-flip-page:not(.binder-flip-cover)','.binder-flip-page:not(.binder-flip-cover) .binder-flip-face']){
  assert.equal(await page.locator(selector).first().evaluate(el=>getComputedStyle(el).borderTopRightRadius),'12px');
 }
 assert.equal(await page.locator('[data-detail-menu] option').evaluateAll(a=>a.some(x=>x.textContent.includes('바인더 메뉴'))),false);
 assert.equal(await page.locator('[data-detail-menu]').first().evaluate(el=>el.selectedIndex),-1);
 await page.locator('[data-act=mode-all]').click();
 assert.equal(await page.locator('.viewer.all .spread').first().evaluate(el=>getComputedStyle(el).backgroundColor.replace(/\s/g,'')),mat);
 assert.equal(await page.locator('.viewer.all .viewer-page').first().evaluate(el=>getComputedStyle(el).borderTopRightRadius),'3px');
 const nums=await page.locator('.viewer.all .sheet .page-number').evaluateAll(a=>a.slice(0,2).map(el=>({left:getComputedStyle(el).left,right:getComputedStyle(el).right})));
 assert.equal(nums[0].left,'11px');assert.equal(nums[1].right,'11px');
 await page.screenshot({path:path.join(process.env.TEMP||'/tmp','binder-polish-overview-'+engine+'-qa.png'),fullPage:true});
 await page.locator('[data-act=full-page][data-index="2"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-page-count]')?.textContent==='2 / 3');
 assert.equal(await page.locator('#pageFullview').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(9, 9, 11)');
 await page.screenshot({path:path.join(process.env.TEMP||'/tmp','binder-polish-gallery-'+engine+'-qa.png')});
 assert.equal(await page.locator('.page-fullview-tools').count(),0);
 const close=await page.locator('[data-act=close-full-page]').boundingBox(),count=await page.locator('[data-page-count]').boundingBox();assert(close.x<count.x);
 await page.evaluate(()=>{const track=document.querySelector('.page-fullview-track');track.scrollLeft=track.clientWidth*2;});
 await page.waitForFunction(()=>document.querySelector('[data-page-count]').textContent==='3 / 3');
 await page.locator('.page-fullview-stage').nth(2).dblclick();
 assert.equal(await page.locator('.page-fullview-plane').nth(2).evaluate(el=>el.style.width),'200%');
 await page.locator('[data-act=close-full-page]').click();await page.waitForFunction(()=>!document.querySelector('#pageFullview').open);
 assert(await page.locator('.viewer.all').count());
 await page.goto(base+'/binder.html?view=edit&id=fixture');await page.waitForSelector('.page-photo');
 assert.equal(await page.locator('.spread').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
 await page.goto(base+'/binder.html?view=mine');await page.waitForSelector('[data-shelf-menu]');
 assert.equal(await page.locator('[data-shelf-menu]').first().evaluate(el=>el.selectedIndex),-1);
 assert.deepEqual(await page.locator('[data-shelf-menu]').first().locator('option').allTextContents(),['자랑하기','공유하기','삭제하기']);
 console.log('PASS '+engine+': page radius, unchanged overview/editor, shared mat, outer numbering, menus, gallery layout/navigation/zoom/back');
 await page.close();
 }finally{await browser.close();}
}}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
