const puppeteer=require('C:/Users/ALIC/AppData/Local/npm-cache/_npx/4b4c857f6efdfb61/node_modules/puppeteer');
const assert=require('node:assert/strict'),fs=require('fs');
const root='C:/Users/ALIC/Desktop/tcg-map-web-preference-heart-qa';
const s=fs.readFileSync(root+'/admin.html','utf8').replace(/\r\n/g,'\n');
const start=s.indexOf('const saveOrder=async()=>{'),mid=s.indexOf('  const render=()=>{',start),dragStart=s.indexOf("const cmsList=$('cmsBlockList');",mid),dragEnd=s.indexOf("\n  };\n  $('cmsPage').onchange",dragStart);
assert(start>0&&mid>start&&dragStart>mid&&dragEnd>dragStart);
const implementation=s.slice(start,mid)+'\n'+s.slice(dragStart,dragEnd);
(async()=>{
 const b=await puppeteer.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent('<style>.cms-block-card{height:70px;display:flex;align-items:center;border:1px solid gray;margin-bottom:4px}</style><div id="feed"><div class="cms-builder-main"><select id="cmsPage"><option value="home">HOME</option></select><div id="cmsBlockList"><div class="cms-block-card" draggable="true" data-block-id="a">추천 카드샵</div><div class="cms-block-card" draggable="true" data-block-id="b">TCG 뉴스</div></div></div></div>');
  await p.evaluate(()=>{
   window.settings={id:1,is_enabled:true,position:'before_recommend',sort_order:5};
   window.native=[{id:'a',sort_order:10},{id:'b',sort_order:20}];
   window.writes=[];
   window.api=async(path,opts={})=>{
    if(opts.method==='PATCH'){
     const patch=JSON.parse(opts.body);window.writes.push({path,patch});
     if(path.includes('home_quick_menu_settings'))Object.assign(window.settings,patch);
     else{const row=window.native.find(x=>path.includes(x.id));if(!row)throw Error('unknown CMS '+path);Object.assign(row,patch)}
     return null;
    }
    if(path.includes('home_quick_menu_settings'))return[{...window.settings}];
    if(path.includes('cms_blocks'))return window.native.map(x=>({...x}));
    throw Error('unexpected GET '+path);
   };
  });
  await p.addScriptTag({path:root+'/admin-home-quick-menu.js'});
  await p.waitForSelector('[data-quick-menu-block]');
  await p.evaluate(src=>{
    const $=id=>document.getElementById(id);
    const blocks=[{id:'a',placement:'home',block_type:'home_shop_discovery',sort_order:10},{id:'b',placement:'home',block_type:'home_news_feed',sort_order:20}];
    const refreshPreview=()=>{};let dragId=null;
    async function loadContentManager(){throw Error('unexpected reload')}
    eval(src);
  },implementation);
  const getOrder=()=>p.$$eval('#cmsBlockList > .cms-block-card',els=>els.map(el=>el.hasAttribute('data-quick-menu-block')?'quick':el.dataset.blockId));
  assert.deepEqual(await getOrder(),['quick','a','b']);
  // Use native DragEvent dispatcher; this exercises the actual CMS delegated handler code.
  await p.evaluate(async()=>{
   const list=document.getElementById('cmsBlockList'),quick=list.querySelector('[data-quick-menu-block]'),target=list.querySelector('[data-block-id="b"]'),rect=target.getBoundingClientRect(),data=new DataTransfer();
   quick.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:data}));
   target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,clientY:rect.bottom-1,dataTransfer:data}));
   target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,clientY:rect.bottom-1,dataTransfer:data}));
  });
  await p.waitForFunction(()=>window.settings.sort_order===30);
  assert.deepEqual(await getOrder(),['a','b','quick']);
  assert.deepEqual(await p.evaluate(()=>({sort:window.settings.sort_order,position:window.settings.position,native:window.native.map(x=>x.sort_order)})),{sort:30,position:'after_recommend',native:[10,20]});
  await p.evaluate(()=>{
   const list=document.getElementById('cmsBlockList'),quick=list.querySelector('[data-quick-menu-block]'),target=list.querySelector('[data-block-id="a"]'),r=target.getBoundingClientRect(),data=new DataTransfer();
   quick.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:data}));
   target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,clientY:r.top+1,dataTransfer:data}));
  });
  await p.waitForFunction(()=>window.settings.sort_order===10&&window.settings.position==='before_recommend');
  assert.deepEqual(await getOrder(),['quick','a','b']);
  assert.deepEqual(await p.evaluate(()=>window.native.map(x=>x.sort_order)),[20,30]);
  assert.deepEqual(errors,[]);
  console.log('PASS real CMS delegated drag events quick after/before native HOME blocks and persist all block order');
 }finally{await b.close()}
})().catch(e=>{console.error('ADMIN ORDER FAIL',e.stack);process.exitCode=1});