const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');return res.end('<link rel="stylesheet" href="/binder.css"><div class="viewer showcase-flip" id="viewer" style="width:350px"><div id="host" style="width:350px"></div></div><script src="/vendor/page-flip/page-flip.browser.js"></script><script src="/binder-flipbook.js"></script>');}try{res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(path.join(root,p)));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));try{for(const engine of ['chromium','webkit']){
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.platform==='win32'?{channel:'msedge'}:{})});
 try{const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(()=>{
  window.calls=[];window.pending={};window.active=0;window.maxActive=0;
  window.book=FUNY_BINDER_FLIPBOOK.mount({host:document.querySelector('#host'),viewer:document.querySelector('#viewer'),pages:Array.from({length:21},(_,i)=>'<img data-path="p'+i+'">'),index:0,ratio:.76,onFlip(){},onState(){},loadImage(path){
   calls.push(path);active++;maxActive=Math.max(maxActive,active);return new Promise(resolve=>{pending[path]=()=>{active--;delete pending[path];resolve('data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#aabbcc"/></svg>'));};});
  }});
 });
 assert.deepEqual(await page.evaluate(()=>calls),['p0','p1'],'only current + next start');
 await page.evaluate(()=>{pending.p0();pending.p1();});await page.waitForFunction(()=>calls.length===3);
 assert.deepEqual(await page.evaluate(()=>calls),['p0','p1','p2'],'one background slot');
 await page.evaluate(()=>{book.turn(1);book.turn(1);});await page.waitForFunction(()=>calls.includes('p3'));
 assert.equal(await page.evaluate(()=>maxActive),2,'at most two loads even during navigation');
 await page.evaluate(()=>{pending.p2();pending.p3();});await page.waitForFunction(()=>calls.includes('p4'));
 const before=await page.evaluate(()=>calls.length);await page.evaluate(()=>{book.destroy();Object.values(pending).forEach(fn=>fn());});await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>calls.length),before,'destroy cancels queued work');
 // No IntersectionObserver outside the flipbook may bypass the queue.
 const source=fs.readFileSync(path.join(root,'binder.js'),'utf8');assert(source.includes("if(!el.closest('.binder-flip-root'))observer.observe(el)"));
 console.log('PASS '+engine+': 21 photos start with 2, sequential background, turn priority, max concurrency 2, cancel on teardown');
 await page.close();
 }finally{await browser.close();}
}}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
