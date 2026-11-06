const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict');
const ROOT='C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa';
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setViewport({width:390,height:844});
  await p.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><div class="fp-cms-quick-menu-slot"></div></main></body></html>');
  await p.addStyleTag({path:ROOT+'/home-quick-menu-v1.css'});
  await p.evaluate(()=>{
   window.messages=[];
   window.ReactNativeWebView={postMessage:s=>window.messages.push(JSON.parse(s))};
   window.FUNY_WEB_AUTH={getSession:async()=>null};
   window.fetch=async()=>({ok:true,status:200,json:async()=>[]});
  });
  await p.addScriptTag({path:ROOT+'/home-quick-menu-v1.js'});
  await p.waitForSelector('.fqm-add');
  const count=()=>p.evaluate(()=>window.messages.length);
  assert.equal(await count(),0,'no bridge messages on initial load');
  await p.click('.fqm-add');
  assert.equal(await p.$eval('#fqm-overlay',()=>true),true);
  assert.deepEqual(await p.evaluate(()=>window.messages),[{type:'FUNY_WEB_OVERLAY_STATE',open:true,source:'home-quick-menu',navMode:'hide'}]);
  await p.click('#fqm-close');
  assert.deepEqual(await p.evaluate(()=>window.messages.map(x=>[x.open,x.navMode])),[[true,'hide'],[false,'none']]);
  await p.click('.fqm-add');
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent('funy:native-overlay-dismiss')));
  assert.equal(await p.$('#fqm-overlay'),null,'native dismiss closes sheet');
  assert.deepEqual(await p.evaluate(()=>window.messages.map(x=>x.open)),[true,false,true,false]);
  await p.click('.fqm-add');await p.click('[data-quick-id="box"]');await p.click('#fqm-save');
  assert.equal(await p.$('#fqm-overlay'),null,'save closes sheet');
  assert.deepEqual(await p.evaluate(()=>window.messages.map(x=>x.open)),[true,false,true,false,true,false]);
  assert.deepEqual(errors,[]);
  console.log('APP BRIDGE PASS open/close, native dismiss, save close, six paired messages');
  // Browser without native bridge must retain the normal editor flow.
  const web=await browser.newPage();await web.setContent('<div class="fp-cms-quick-menu-slot"></div>');await web.addStyleTag({path:ROOT+'/home-quick-menu-v1.css'});
  await web.evaluate(()=>{window.FUNY_WEB_AUTH={getSession:async()=>null};window.fetch=async()=>({ok:true,status:200,json:async()=>[]})});
  await web.addScriptTag({path:ROOT+'/home-quick-menu-v1.js'});await web.click('.fqm-add');await web.click('#fqm-close');
  assert.equal(await web.$('#fqm-overlay'),null);console.log('WEB PASS no native bridge');
 }finally{await browser.close()}
})().catch(e=>{console.error('QA FAIL',e.stack);process.exitCode=1});