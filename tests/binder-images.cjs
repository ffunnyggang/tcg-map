const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),http=require('http'),path=require('path');
const root=path.resolve(__dirname,'..'),existing=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8');
const fixture=new Function('return ('+existing.slice(existing.indexOf('async function fixture('),existing.indexOf('\n(async()=>{'))+')')();
const server=http.createServer((req,res)=>{const p=path.join(root,new URL(req.url,'http://localhost').pathname);try{res.setHeader('Content-Type',/\.m?js$/.test(p)?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{for(const engine of ['chromium','webkit']){
 const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.platform==='win32'?{channel:'msedge'}:{})});
 try{for(const owner of [true,false]){
  const page=await browser.newPage({viewport:{width:390,height:844},userAgent:engine==='webkit'?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148':'Mozilla/5.0 Android'});
  await fixture(page);
  await page.addInitScript(({owner})=>{
   window.FUNY_WEB_AUTH.session.user.id=owner?'owner':'viewer';
   const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;const ctx=canvas.getContext('2d');ctx.fillStyle='#80b3ca';ctx.fillRect(0,0,1200,1600);ctx.fillStyle='#f5b132';ctx.fillRect(100,100,1000,1400);
   window.__downloads=0;window.FUNY_WEB_AUTH.client.storage.from=()=>({download:async()=>{
    window.__downloads++;await new Promise(r=>setTimeout(r,100));return {data:await new Promise(r=>canvas.toBlob(r,'image/jpeg',.85)),error:null};
   }});
  },{owner});
  await page.goto(base+'/binder.html?view=detail&id=fixture&app=1');
  await page.waitForFunction(()=>[...document.querySelectorAll('.binder-photo-mat img')].length===3&&[...document.querySelectorAll('.binder-photo-mat img')].every(i=>i.naturalWidth===1200));
  const prefix=engine==='webkit'?'data:image/jpeg':'blob:';
  assert(await page.locator('.binder-photo-mat img').evaluateAll((a,p)=>a.every(i=>i.src.startsWith(p)),prefix));
  await page.locator('[data-act=next]').click();await page.waitForTimeout(650);
  assert((await page.locator('.binder-photo-mat img').first().boundingBox()).width>300);
  await page.locator('[data-act=mode-all]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#viewerContent img')].every(i=>i.naturalWidth===1200));
  await page.locator('[data-act=full-page]').first().click();await page.waitForFunction(()=>document.querySelector('#pageFullview img')?.naturalWidth===1200);
  await page.evaluate(()=>document.querySelector('#pageFullview').close());
  assert.equal(await page.evaluate(()=>window.__downloads),3,'reuse authenticated download for all modes');
  // A bad blob URL recovers through a data URL on non-iOS engines.
  assert(await page.evaluate(async()=>{
   const {imageSource}=await import('/binder-images.mjs');const c=document.createElement('canvas');c.width=c.height=10;
   const blob=await new Promise(r=>c.toBlob(r,'image/png')),original=URL.createObjectURL;
   URL.createObjectURL=()=> 'blob:invalid';
   try{return (await imageSource(blob)).startsWith('data:image/png');}finally{URL.createObjectURL=original;}
  }));
  await page.close();
 }
 const page=await browser.newPage();await fixture(page);
 await page.addInitScript(()=>{window.FUNY_WEB_AUTH.client.storage.from=()=>({download:async()=>({data:new Blob(['invalid image'],{type:'image/jpeg'}),error:null})});});
 await page.goto(base+'/binder.html?view=detail&id=fixture&app=1');await page.waitForSelector('img[data-image-error]',{state:'attached'});
 const failure=await page.locator('.binder-photo-mat').first().evaluate(el=>getComputedStyle(el,'::before').content);assert(failure.includes('다시 열어주세요'));
 await page.close();console.log('PASS '+engine+': owner/non-owner cold JPEG, single/all/full-page, source fallback, readable failure');
 }finally{await browser.close();}
}}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
