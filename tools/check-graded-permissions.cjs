const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path'),src=fs.readFileSync(path.resolve(__dirname,'../admin-graded-permissions.js'),'utf8');
class El{constructor(){this.children=[];this.hidden=true;this.value='';this.attrs={}}append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}add(x){this.children.push(x);if(!this.value)this.value=x.value}setAttribute(k,v){this.attrs[k]=v}}
const tick=()=>new Promise(r=>setImmediate(r));
async function test(admin,hasToken=true){
 const nodes=Object.fromEntries(['gradedPermissionStatus','gradedPermissionForm','gradedPermissionShop','gradedPermissionEmail','gradedGrantBtn','gradedPermissionList'].map(id=>[id,new El()])),calls=[];
 const ctx={document:{getElementById:id=>nodes[id],createElement:()=>new El()},sessionStorage:{getItem:()=>hasToken?'test-only':null},Option:function(text,value){this.text=text;this.value=value},fetch:async(_,o)=>{const b=JSON.parse(o.body);calls.push(b);return{ok:true,json:async()=>b.action==='bootstrap'?{is_admin:admin,shops:[{id:'shop-a',name:'Shop A'}]}:b.action==='permission_list'?{rows:[{shop_id:'shop-a',email:'manager@example.com',shops:{name:'Shop A'},is_active:true}]}:{saved:true}}}};
 vm.runInNewContext(src,ctx);await tick();if(!admin||!hasToken){assert.equal(nodes.gradedPermissionForm.hidden,true);assert(!calls.some(x=>x.action==='permission_list'));return}
 assert.equal(nodes.gradedPermissionForm.hidden,false);nodes.gradedPermissionEmail.value='new@example.com';await nodes.gradedPermissionForm.onsubmit({preventDefault(){}});assert.deepEqual(calls.find(x=>x.action==='permission_set'),{action:'permission_set',shop_id:'shop-a',email:'new@example.com',enabled:true});
 await nodes.gradedPermissionList.children[0].children[1].onclick();assert.deepEqual(calls.filter(x=>x.action==='permission_set').at(-1),{action:'permission_set',shop_id:'shop-a',email:'manager@example.com',enabled:false});
}
(async()=>{await test(true);await test(false);await test(true,false);console.log('PASS: centralized grant/revoke, shop/email binding, admin-only form and unauthenticated/non-admin guards')})().catch(e=>{console.error(e);process.exit(1)});
