const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('app.js','utf8');const start=source.indexOf('window.FUNY_SHOP_LOCATION_TEXT=');const helpers=source.slice(0,source.indexOf('\n};',start)+4);
for(const lang of ['ko','en']){
 const context={window:{},localStorage:{getItem:()=>lang}};vm.createContext(context);vm.runInContext(helpers,context);
 const original={address:'한글 주소',addressEn:'English Address',station:'한글 역',stationEn:'English Station',city:'한글 도시',cityEn:'English City',area:'한글 지역',areaEn:'English Area',walkMin:3,lat:37,lng:127};
 const displayed=context.window.FUNY_SHOP_DISPLAY(original);
 assert.equal(displayed.address,lang==='en'?'English Address':'한글 주소');assert.equal(displayed.station,lang==='en'?'English Station':'한글 역');
 assert.equal(displayed.city,lang==='en'?'English City':'한글 도시');assert.equal(displayed.area,lang==='en'?'English Area':'한글 지역');
 assert.equal(original.address,'한글 주소');assert.equal(original.station,'한글 역');assert.equal(displayed.lat,37);
 assert.equal(context.window.FUNY_SHOP_LOCATION_TEXT(original),lang==='en'?'English Area · English Station 3 min walk':'한글 지역 · 한글 역 도보 3분');
 const fallback=context.window.FUNY_SHOP_DISPLAY({address:'원문',addressEn:'  ',area:'지역',station:'역'});assert.equal(fallback.address,'원문');assert.equal(fallback.area,'지역');assert.equal(fallback.station,'역');
}
const admin=fs.readFileSync('admin.html','utf8');
for(const key of ['address_en','nearest_station_en','city_en','area_en']){assert(admin.includes("field('"+key+"'"));assert(admin.includes(key+":nullableInput('"+key+"')"))}
assert(source.includes('cityEn:s.city_en,areaEn:s.area_en,addressEn:s.address_en,stationEn:s.nearest_station_en'));
console.log('English location fields, original fallback, unchanged geocoding data, and admin payload passed.');
