const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ts=require('C:/Users/ALIC/Desktop/tcg-map-aos-parity-20261023/mobile/node_modules/typescript');
function fn(file,name){const text=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);let n;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)n=node;ts.forEachChild(node,visit)}visit(ast);assert(n,name);return n.getText(ast);}
(async()=>{
 const messages=[],copied=[];let shared=[];
 const ctx={window:{ReactNativeWebView:{postMessage:s=>messages.push(JSON.parse(s))}},location:{origin:'http://127.0.0.1:8084'},navigator:{share:async p=>shared.push(p),clipboard:{writeText:async p=>copied.push(p)}},detail:{id:'b1',title:'나의 바인더'},toast(){},showModal(){},head(){},esc:s=>s};
 vm.createContext(ctx);vm.runInContext(fn('binder.js','share'),ctx);await ctx.share();
 assert.equal(messages[0].type,'SHARE_URL');assert.equal(messages[0].url,'https://funypin.kr/binder.html?view=detail&id=b1');assert.equal(copied.length,0);assert.equal(shared.length,0);
 delete ctx.window.ReactNativeWebView;await ctx.share();assert.equal(shared.length,1);
 ctx.navigator.share=async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'})};await ctx.share();assert.equal(copied.length,0);
 ctx.navigator.share=undefined;await ctx.share();assert.equal(copied.length,1);
 ctx.uid='owner';ctx.detail.user_id='owner';vm.runInContext(fn('binder.js','detailMenu'),ctx);let menu=ctx.detailMenu();assert(menu.includes('자랑 멈추기'));assert(!menu.includes('신고하기'));
 ctx.detail.user_id='other';menu=ctx.detailMenu();assert(menu.includes('공유하기')&&menu.includes('신고하기')&&menu.includes('차단하기'));assert(!menu.includes('자랑 멈추기'));
 ctx.view='mine';ctx.head=()=>'';ctx.showModal=s=>ctx.menu=s;vm.runInContext(fn('binder.js','listMenu'),ctx);ctx.listMenu({});assert(ctx.menu.indexOf('showcase')<ctx.menu.indexOf('shelf-share'));assert(ctx.menu.indexOf('shelf-share')<ctx.menu.indexOf('shelf-delete'));
 const events=[];const talk={reloadingTalk:false,currentPost:{id:'p'},current:'카드 자랑',showcaseTab:'binders',popularMode:'likes',pendingListScroll:650,rememberedBinderPages:3,exitAppPostPage(){talk.currentPost=null},document:{querySelectorAll:()=>[]},location:{hash:'#/post/p',pathname:'/talk.html',search:'?app=1'},history:{replaceState(a,b,url){events.push(url);talk.location.hash=''}},window:{scrollTo:(x,y)=>events.push(y)},rememberTalkList(){events.push('remember')},render(){},async refresh(){assert.equal(talk.current,'전체');assert.equal(talk.pendingListScroll,0);assert.equal(talk.currentPost,null)}};
 vm.createContext(talk);vm.runInContext(fn('talk-community-v1.js','reloadTalk'),talk);await talk.reloadTalk();assert.equal(talk.location.hash,'');assert.equal(talk.showcaseTab,'cards');assert.equal(events.at(-1),0);
 console.log('PASS native/web/cancel sharing, owner/other menus, shelf order, TALK reset from detail to all/top');
})().catch(e=>{console.error(e);process.exitCode=1});
