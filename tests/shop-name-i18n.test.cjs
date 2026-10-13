const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8'),start=app.indexOf('window.FUNY_SHOP_LOCATION_TEXT='),helper=app.slice(0,app.indexOf('\n};',start)+4);
for(const lang of ['ko','en']){
 const context={window:{},localStorage:{getItem:()=>lang}};vm.createContext(context);vm.runInContext(helper,context);
 const shop={name:'국문명',en:'English Name',address:'주소',area:'지역',station:'역',walkMin:2};
 const shown=context.window.FUNY_SHOP_DISPLAY(shop);assert.equal(shown.name,lang==='en'?'English Name':'국문명');assert.equal(shown.en,lang==='en'?'국문명':'English Name');
 const again=context.window.FUNY_SHOP_DISPLAY(shown);assert.equal(again.name,shown.name);assert.equal(again.en,shown.en);assert.equal(shop.name,'국문명');
 for(const empty of ['',null,'  '])assert.equal(context.window.FUNY_SHOP_DISPLAY({...shop,en:empty}).name,'국문명');
}
const list=fs.readFileSync('list-card-v1.js','utf8');assert(list.includes('function card(s){\n    s=window.FUNY_SHOP_DISPLAY(s);'));
const detail=fs.readFileSync('detail-funy-v2.js','utf8');assert(detail.includes('detailHTML = function(s){s=window.FUNY_SHOP_DISPLAY(s);'));assert(detail.includes('<h1 class="d-name">'));
const admin=fs.readFileSync('admin.html','utf8');assert(admin.includes('.shop-language-pair{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));for(const key of ['name','city','area','address','nearest_station'])assert(admin.includes("field('"+key+"_en'"));
assert(fs.readFileSync('cms-frontend-renderer.js','utf8').includes('select=id,name,name_en,nearest_station'));
console.log('English shop name fallback, repeated rendering, bilingual detail and paired admin fields passed.');
