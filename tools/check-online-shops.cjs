const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),src=fs.readFileSync(path.resolve(__dirname,'../admin-online-shops.js'),'utf8');
class El{constructor(){this.value='';this.hidden=true;this.checked=true;this.children=[];this.disabled=false}append(...n){this.children.push(...n)}replaceChildren(...n){this.children=n}scrollIntoView(){}focus(){}reset(){}}
const tick=()=>new Promise(r=>setImmediate(r));
async function test(admin=true){
 const names=['authNotice','authStatus','adminSignIn','app','shopCount','newShop','listStatus','onlineList','editor','editorTitle','shopForm','shopName','shopAddress','shopWebsite','shopContact','shopActive','formStatus','cancelEdit','saveShop','toast'],nodes=Object.fromEntries(names.map(k=>[k,new El()])),calls=[];
 const row={id:'one',name:'퍼니카드',address:'서울 용산구',website_url:null,contact_url:null,is_active:true,updated_at:'2026-11-04T00:00:00Z',graded_products:[{count:5}]};
 const ctx={document:{getElementById:k=>nodes[k],createElement:()=>new El()},window:{FUNY_WEB_AUTH:{init:async()=>{},session:null}},sessionStorage:{getItem:()=> 'test-only'},URL,setTimeout:()=>0,clearTimeout(){},fetch:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>url.includes('is_funypin_admin')?admin:options.method==='POST'?[row]:options.method==='PATCH'?[]:[row]}}};
 vm.runInNewContext(src,ctx);await tick();
 if(!admin){assert.equal(nodes.app.hidden,true);assert(!calls.some(x=>x.url.includes('online_shops')));return}
 assert.equal(nodes.app.hidden,false);assert.equal(nodes.shopCount.textContent,'1개');assert.equal(nodes.onlineList.children.length,1);assert(nodes.onlineList.children[0].children.some(x=>x.textContent==='연결된 등급카드 5개'));
 nodes.shopName.value='New shop';nodes.shopWebsite.value='javascript:bad';await nodes.shopForm.onsubmit({preventDefault(){}});assert(!calls.some(x=>x.options.method==='POST'&&!x.url.includes('rpc/')));
 nodes.shopWebsite.value='https://example.com/shop';await nodes.shopForm.onsubmit({preventDefault(){}});const saved=calls.find(x=>x.options.method==='POST'&&!x.url.includes('rpc/'));assert(saved);assert.deepEqual(JSON.parse(saved.options.body),{name:'New shop',address:null,website_url:'https://example.com/shop',contact_url:null,is_active:true});
 await nodes.shopForm.onsubmit({preventDefault(){}});const patch=calls.find(x=>x.options.method==='PATCH');assert(patch.url.includes('updated_at=eq.'));assert(nodes.formStatus.textContent.includes('다른 곳에서 수정'));
}
(async()=>{await test();await test(false);console.log('PASS: admin guard, linked product count, safe URL validation, create payload, optimistic update conflict')})().catch(e=>{console.error(e);process.exit(1)});

