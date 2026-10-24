const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),existing=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8');
const fixture=new Function('return ('+existing.slice(existing.indexOf('async function fixture('),existing.indexOf('\n(async()=>{')).replace('pages:[1,2,3]','pages:Array.from({length:12},(_,i)=>i+1)')+')')();
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;let file=path.join(root,pathname);if(pathname==='/binder.js'&&process.env.BINDER_QA_JS)file=process.env.BINDER_QA_JS;try{res.setHeader('Content-Type',/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})}),base='http://127.0.0.1:'+server.address().port,errors=[];
try{
 for(const app of [false,true]){
  const p=await browser.newPage({viewport:{width:390,height:1000}});p.on('pageerror',e=>errors.push(e.message));await fixture(p);await p.goto(base+'/binder.html?view=detail&id=fixture'+(app?'&app=1':''));await p.waitForSelector('.binder-flip-root');
  for(const longComments of [false,true]){
   if(longComments)await p.locator('.comments').evaluate(el=>{const div=document.createElement('div');div.style.height='1800px';el.append(div);});
   await p.evaluate(()=>scrollTo(0,0));await p.locator('[data-act=mode-all]').click();await p.waitForTimeout(100);
   const target=await p.locator('.viewer-head').evaluate(el=>Math.max(60,Math.round(el.getBoundingClientRect().top+scrollY-140)));
   await p.evaluate(y=>scrollTo(0,y),target);await p.waitForTimeout(80);const before=await p.evaluate(()=>scrollY);assert(before>50,'fixture must be scrolled before transition');
   await p.locator('[data-act=mode-single]').click();await p.waitForTimeout(300);
   const after=await p.evaluate(()=>scrollY);assert(Math.abs(after-before)<2,'all -> single preserves '+(app?'app':'web')+' scroll: '+before+' -> '+after);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   await p.locator('[data-act=mode-all]').click();await p.waitForTimeout(150);assert(Math.abs(await p.evaluate(()=>scrollY)-before)<2,'reverse transition also stable');
   await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(100);assert.equal(await p.locator('body').evaluate(el=>el.style.minHeight),'','temporary scroll floor released when content fits');
  }
  await p.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS web/app: all -> single scroll retained with short and long document; reverse transition, overflow containment, temporary height release');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
