const fs=require('fs'),assert=require('node:assert/strict'),vm=require('vm'),ts=require('typescript'),path=require('path');
const root=path.resolve(__dirname,'..'),helper=fs.readFileSync(path.join(root,'lib/binder-header.ts'),'utf8');
const out=ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};new Function('exports','module',out)(mod.exports,mod);
const {binderDetailRoute,binderHeaderContext,canShowBinderHeader}=mod.exports;
const url='https://funypin.kr/binder.html?view=detail&id=b1&app=1',wrapper='https://funypin.kr/cms-inapp-page.html?target='+encodeURIComponent(url);
assert.equal(binderDetailRoute(url).id,'b1');assert.equal(binderDetailRoute(wrapper).id,'b1');
for(const bad of ['https://evil.test/binder.html?view=detail&id=b1','https://funypin.kr/binder.html?view=mine','https://funypin.kr/binder.html?view=detail','about:blank'])assert.equal(binderDetailRoute(bad),null);
assert.equal(binderDetailRoute('http://127.0.0.1:8084/binder.html?view=detail&id=b1'),null);
assert.equal(binderDetailRoute('http://127.0.0.1:8084/binder.html?view=detail&id=b1',true).id,'b1');
const source=fs.readFileSync(path.join(root,'components/FunyWebView.tsx'),'utf8'),ast=ts.createSourceFile('web.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler;
(function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='onMessage')handler=n.initializer.arguments[0].getText(ast);ts.forEachChild(n,visit);})(ast);
assert(handler);const handlerJs=ts.transpileModule('const handle='+handler,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const state={route:wrapper,context:null,closed:0,injected:[]};
const ctx={URL,__DEV__:false,console,binderHeaderContext,binderDetailRoute,url,lastReportedRoute:{current:wrapper},reportRoute:next=>{state.route=next;ctx.lastReportedRoute.current=next;},setBinderContext:c=>state.context=c,setTalkMenuOpen:v=>{if(v===false)state.closed++},isShopDetail:()=>false,isTopLayerToolPage:()=>false,isMapWebView:false,surface:'page',ref:{current:{injectJavaScript:s=>state.injected.push(s)}}};
vm.createContext(ctx);vm.runInContext(handlerJs,ctx);
function send(data){vm.runInContext('handle',ctx)({nativeEvent:{data:JSON.stringify(data)}});}
for(const mine of [true,false]){
 state.context=null;state.route=wrapper;send({type:'BINDER_DETAIL_CONTEXT',url,mine,preview:false});
 assert.equal(state.route,url);assert.equal(state.context.mine,mine);assert(canShowBinderHeader(true,state.route,state.context));
 assert.equal(state.injected.length,0,'receipt must not acknowledge before the header render');
 assert(!canShowBinderHeader(false,state.route,state.context),'tab/sheet without a header cannot acknowledge');
 assert(!canShowBinderHeader(true,url.replace('b1','b2'),state.context),'other binder must not reuse stale menu');
}
send({type:'BINDER_DETAIL_CONTEXT',url,mine:true,preview:true});assert(!canShowBinderHeader(true,url,state.context),'preview has no showcase menu');
const before=state.context;ctx.lastReportedRoute.current=url.replace('b1','b2');send({type:'BINDER_DETAIL_CONTEXT',url,mine:true,preview:false});assert.equal(state.context,before,'late old document context ignored after navigating to another binder');ctx.lastReportedRoute.current=url;
send({type:'BINDER_DETAIL_CONTEXT',url:'https://evil.test/binder.html?view=detail&id=b1',mine:true,preview:false});assert.equal(state.context,before);
send({type:'WEB_ROUTE',url});assert.equal(state.closed,0,'binder route refresh must not close its dropdown');
send({type:'WEB_ROUTE',url:'https://funypin.kr/talk.html'});assert.equal(state.closed,1);
console.log('PASS actual native handler: atomic route/context, owner/other, preview, stale identity, wrapper/direct, invalid URL, no premature ACK, menu survives binder route refresh');

let effect;
(function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes('funy:native-binder-header-ready'))effect=n.arguments[0].getText(ast);ts.forEachChild(n,visit);})(ast);
assert(effect);
vm.runInContext(ts.transpileModule('const ackEffect='+effect,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,ctx);
ctx.binderContext=binderHeaderContext({url,mine:true,preview:false},url);
ctx.isBinderMenu=false;assert.equal(vm.runInContext('ackEffect()',ctx),undefined);assert.equal(state.injected.length,0);
ctx.isBinderMenu=true;const cleanup=vm.runInContext('ackEffect()',ctx);assert.equal(state.injected.length,1);
const classes=new Set(),events=[];
const dom={document:{documentElement:{classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x))}}},window:{dispatchEvent:e=>events.push(e)},CustomEvent:function(type,options){this.type=type;this.detail=options.detail;}};
vm.runInNewContext(state.injected[0],dom);assert(classes.has('binder-native-menu'));assert.equal(events[0].detail.id,'b1');
cleanup();vm.runInNewContext(state.injected[1],dom);assert(!classes.has('binder-native-menu'));
console.log('PASS actual post-render ACK effect and cleanup; unavailable native header preserves fallback');
