
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(__dirname,'binder-flipbook.cjs'),'utf8');
const f=source.slice(source.indexOf('async function fixture('),source.indexOf('\n(async()=>{')).replace('const binder={','const binder=window.__binderFixture={revision:0,').replace("return()=>{if(key","return(...args)=>{if(key==='update'){Object.assign(binder,args[0]);}if(key");
const fixture=new Function('return ('+f+')')();
const server=http.createServer((req,res)=>{try{const file=path.join(root,new URL(req.url,'http://local').pathname);res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{for(const engine of ['chromium','webkit']){const b=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.platform==='win32'?{channel:'msedge'}:{})});try{
const p=await b.newPage({viewport:{width:390,height:844}});await fixture(p);await p.goto(base+'/binder.html?view=edit&id=fixture');await p.waitForSelector('.editor-dock');
assert.equal(await p.locator('.layout-choice').first().evaluate(el=>getComputedStyle(el).flexDirection),'row');
assert.equal(await p.locator('.color-swatch.on').evaluate(el=>getComputedStyle(el).outlineColor),'rgba(0, 0, 0, 0)');
assert.equal(await p.locator('[data-act=page-menu],[data-act=move-left],[data-act=move-right]').count(),0);
const bottom=async()=>{const r=await p.locator('.editor-dock').boundingBox();assert(Math.abs(r.y+r.height-844)<1);assert(r.x>=0&&r.x+r.width<=391);};await bottom();
await p.locator('.page-photo').first().scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('#pages .spread').style.getPropertyValue('--endpaper-mat-color'));
const colors=await p.locator('#pages .spread').first().locator('.sheet').evaluateAll(a=>a.map(el=>getComputedStyle(el).backgroundColor));assert.equal(colors[0],colors[1]);assert.notEqual(colors[0],'rgb(255, 255, 255)');
assert.equal(await p.locator('.page-photo').first().evaluate(el=>getComputedStyle(el).borderWidth),'0px');
await p.locator('[data-act=add-page]').click();assert.equal(await p.locator('.page-photo').count(),6);await bottom();
for(const sel of ['[data-act=add-page]','[data-act=preview]'])assert.equal(await p.locator(sel).evaluate(el=>getComputedStyle(el).color),'rgb(41, 37, 50)');
const count=await p.locator('.spread').count();p.once('dialog',d=>d.dismiss());await p.locator('[data-act=delete-spread][data-spread="1"]').click();assert.equal(await p.locator('.page-photo').count(),6);
let confirmation='';p.once('dialog',d=>{confirmation=d.message();return d.accept();});await p.locator('[data-act=delete-spread][data-spread="1"]').click();assert(confirmation.includes('사진 2장'));assert.equal(await p.locator('.page-photo').count(),4);assert.equal(await p.locator('.spread').count(),count-1);
await p.waitForFunction(()=>document.querySelector('#saveState').textContent==='자동저장됨');assert.deepEqual(await p.evaluate(()=>window.__binderFixture.pages.filter(x=>x.path).map(x=>x.id)),['p1']);
await p.locator('#pages .spread').first().scrollIntoViewIfNeeded();await p.screenshot({path:path.join(process.env.TEMP||'/tmp','binder-spread-edit-'+engine+'-qa.png')});
await p.locator('[data-act=preview]').click();await p.locator('[data-act=back-edit]').click();assert.equal(await p.locator('.page-photo').count(),4);await bottom();
await p.close();console.log('PASS '+engine+': inline layout, check-only swatch, matching endpaper, borderless photo, add pair, cancel/delete pair, preserved other photo, fixed dock and explicit colors');
}finally{await b.close();}}}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
