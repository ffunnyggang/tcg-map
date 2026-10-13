const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('map-live-pin-v1.js','utf8'),saved={};
async function boot(blocked=false){
 const elements=new Map();
 const make=()=>({style:{},attrs:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v},appendChild(e){if(e.id)elements.set(e.id,e)},remove(){}});
 elements.set('filters',make());
 const window={FUNY_LIVE_TIME:{bounds:()=>({day:'2026-10-13',start:0,end:Infinity}),current:()=>true},addEventListener(){}};
 const document={head:make(),body:{classList:{contains:()=>false}},hidden:false,getElementById:id=>elements.get(id),createElement:make,addEventListener(){}};
 const context={window,document,localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return saved[k]??null},setItem:(k,v)=>{if(blocked)throw Error('blocked');saved[k]=v}},Date,URL,URLSearchParams,AbortController,location:{href:'https://funypin.kr/shops.html',search:''},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,fetch:async()=>({ok:true,json:async()=>[]}),console};
 vm.runInNewContext(source,context);for(let i=0;i<20;i++)await Promise.resolve();
 return elements.get('liveTempLayer');
}
(async()=>{
 const click=b=>b.onclick({preventDefault(){},stopPropagation(){}});
 let b=await boot();assert.equal(b.attrs['aria-pressed'],'true');click(b);assert.equal(b.attrs['aria-pressed'],'false');
 b=await boot();assert.equal(b.attrs['aria-pressed'],'false');click(b);assert.equal(b.attrs['aria-pressed'],'true');
 b=await boot();assert.equal(b.attrs['aria-pressed'],'true');
 saved.funypin_map_live_pin_layer_v1='invalid';b=await boot();assert.equal(b.attrs['aria-pressed'],'true');
 b=await boot(true);assert.equal(b.attrs['aria-pressed'],'true');click(b);assert.equal(b.attrs['aria-pressed'],'false');
 console.log('LIVE PIN default ON, persisted OFF/ON, reload and unavailable storage passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
