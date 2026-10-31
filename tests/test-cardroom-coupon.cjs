const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../admin-test-cardroom-coupons.html','utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
const id='11111111-1111-4111-8111-111111111111';
async function setup(mode){
 const elements=Object.fromEntries(['couponId','lookup','result','redeem','form'].map(k=>[k,{value:id,hidden:false,disabled:false,textContent:'',events:{},addEventListener(n,f){this.events[n]=f}}]));
 elements.lookup.disabled=true;elements.redeem.disabled=true;elements.redeem.hidden=true;
 let state='issued',calls=0,failInspect=false,timeoutOnce=true,timerId=0;
 const timers=new Map();
 const client={rpc:async(name)=>{
 if(name==='is_funypin_admin')return {data:mode!=='unauthorized'};
 if(name==='inspect_test_cardroom_coupon'){
 if(failInspect)return {error:{message:'offline'}};
 return {data:{id,title:'TEST',code:'TEST-CODE',status:state,can_redeem:state==='issued',expires_at:null}};
 }
 calls++;
 if(mode==='before-send')return {error:{message:'offline'}};
 state='used';
 if(mode==='lost-response')return {error:{message:'connection lost'}};
 if(mode==='timeout'&&timeoutOnce){timeoutOnce=false;return new Promise(()=>{})}
 return {data:true};
 }};
 const ctx={FUNY_MY_WEB:{ready:async()=>({client})},document:{getElementById:k=>elements[k]},confirm:()=>true,setTimeout:f=>{const n=++timerId;timers.set(n,f);return n},clearTimeout:n=>timers.delete(n),console,Date,Error};
 await vm.runInNewContext(code,ctx);
 return {elements,inspect:()=>elements.form.events.submit({preventDefault(){}}),redeem:()=>elements.redeem.events.click(),state:()=>state,calls:()=>calls,timers,failInspect:()=>{failInspect=true}};
}
(async()=>{
 let t=await setup('unauthorized');assert.equal(t.elements.lookup.disabled,true);assert.equal(t.calls(),0);
 for(const mode of ['normal','before-send','lost-response','timeout']){
 t=await setup(mode);await t.inspect();assert.equal(t.elements.redeem.disabled,false);
 const p=t.redeem();
 if(mode==='timeout'){await Promise.resolve();for(const f of t.timers.values())f()}
 await p;
 if(mode==='normal'){assert.equal(t.state(),'used');assert.equal(t.elements.redeem.hidden,true)}
 else {assert.equal(t.elements.redeem.hidden,true);assert.equal(t.elements.lookup.disabled,false);await t.inspect();assert.equal(t.elements.redeem.hidden,mode!=='before-send')}
 if(mode!=='before-send'){await t.redeem();assert.equal(t.calls(),1)}
 }
 t=await setup('normal');await t.inspect();t.failInspect();await t.redeem();assert.equal(t.elements.redeem.hidden,true);assert.match(t.elements.result.textContent,/상태를 다시 조회/);
 t=await setup('normal');await t.inspect();t.elements.couponId.events.input();await t.redeem();assert.equal(t.calls(),0);
 const customer=fs.readFileSync(__dirname+'/../my-coupons.html','utf8');assert(!customer.includes(".rpc("));assert(customer.includes("x.source_type==='event_test'"));new Function([...customer.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1]);
 console.log('PASS: operator authorization UI, successful use, offline before send, lost response after commit, timeout, refresh failure, retry status reconciliation, input change; customer has no redemption RPC');
})().catch(e=>{console.error(e);process.exit(1)});
