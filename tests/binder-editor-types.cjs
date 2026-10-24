
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8');
const f=source.slice(source.indexOf('async function fixture('),source.indexOf('\n(async()=>{')).replace("const binder={","const binder=window.__binderFixture={revision:0,tcg_types:[],").replace("return()=>{if(key", "return(...args)=>{if(key==='update'){Object.assign(binder,args[0]);window.__savedTypes=binder.tcg_types;}if(key");
const fixture=new Function('return ('+f+')')();
const server=http.createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://local').pathname);res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{for(const engine of ['chromium','webkit']){const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.platform==='win32'?{channel:'msedge'}:{})});
try{const p=await browser.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await fixture(p,6);
await p.goto(base+'/binder.html?view=edit&id=fixture');await p.waitForSelector('[data-act=tcg-type]');
assert.deepEqual(await p.locator('[data-act=layout]').evaluateAll(a=>a.map(x=>x.dataset.pockets)),['4','9','12']);
assert.equal(await p.locator('#pages').evaluate(el=>el.style.getPropertyValue('--ratio')),'0.52','existing 6-pocket geometry retained');
await p.locator('[data-type=포켓몬]').click();await p.locator('[data-type=원피스]').click();await p.waitForFunction(()=>window.__savedTypes?.length===2);
assert.deepEqual(await p.evaluate(()=>window.__savedTypes),['포켓몬','원피스']);
await p.locator('[data-act=preview]').click();await p.locator('[data-act=back-edit]').click();assert.equal(await p.locator('[data-type=포켓몬]').getAttribute('aria-pressed'),'true');
await p.locator('[data-type=원피스]').click();await p.waitForFunction(()=>window.__savedTypes?.length===1);
assert.equal(await p.locator('#pages .page-photo').count(),4,'all existing photos preserved');
for(const sheet of [p.locator('#pages .spread .sheet').first(),p.locator('#pages .spread .sheet').last()]){assert(await sheet.evaluate(el=>el.classList.contains('binder-blank')));assert.equal(await sheet.locator('button').count(),0);}
await p.locator('#pages .page-photo').first().scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#pages .sheet:not(.binder-blank)').style.getPropertyValue('--page-mat-color'));
assert.equal(await p.locator('#pages .sheet:not(.binder-blank)').first().evaluate(el=>getComputedStyle(el).backgroundColor==='rgb(255, 255, 255)'),false);
await p.locator('[data-act=add-page]').click();assert.equal(await p.locator('#pages .page-photo').count(),6);assert.equal(await p.locator('#pages .spread:last-of-type .sheet:last-child button').count(),0);
await p.screenshot({path:path.join(process.env.TEMP||'/tmp','binder-editor-types-'+engine+'-qa.png'),fullPage:true});
await p.waitForFunction(()=>document.querySelector('#saveState')?.textContent==='자동저장됨');await p.goto(base+'/binder.html?view=new');await p.waitForSelector('[data-act=tcg-type]');assert.equal(await p.locator('#pages .page-photo').count(),10);assert.equal(await p.locator('#pages .spread').count(),6);
assert.equal(await p.locator('#pages .sheet.binder-blank').count(),2);assert.equal(await p.locator('#saveState').textContent(),'사진을 추가하면 자동저장이 시작돼요.');
assert.deepEqual(errors,[]);await p.close();console.log('PASS '+engine+': legacy 6-pocket preservation, multi-type save/restore, page mats, read-only endpapers, add page, 10 editable defaults');
}finally{await browser.close();}}}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
