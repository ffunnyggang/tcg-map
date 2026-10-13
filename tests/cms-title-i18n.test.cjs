const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const renderer=fs.readFileSync('cms-frontend-renderer.js','utf8'),helper=renderer.slice(renderer.indexOf('const english='),renderer.indexOf('const esc='));
for(const language of ['ko','en']){
 const ctx={localStorage:{getItem:()=>language},window:{FUNY_I18N:{t:()=>{throw Error('Authored title must not auto-translate')}}}};vm.createContext(ctx);
 vm.runInContext(helper+'this.translated=cmsText({title:"국문 제목",title_en:"English title"},"title");this.blank=cmsText({title:"국문 제목",title_en:" "},"title");',ctx);
 assert.equal(ctx.translated,language==='en'?'English title':'국문 제목');assert.equal(ctx.blank,'국문 제목');
}
assert(renderer.includes('data-funy-i18n="off"'));
const i18n=fs.readFileSync('funy-i18n.js','utf8');assert(i18n.includes('node.parentElement?.closest'));
for(const [path,id] of [['cms-content-library.js','clTitleEn'],['cms-link-enhancements.js','cmsBlockTitleEn'],['cms-final-fixes.js','fTitleEn'],['cms-collection-enhancements.js','cmsCollectionTitleEn']]){
 const source=fs.readFileSync(path,'utf8');assert(source.includes('id="'+id+'"'),path);assert(source.includes('title_en:' )||source.includes('title,title_en,'),path);
}
const admin=fs.readFileSync('admin.html','utf8'),base=admin.indexOf("field('address_en'");assert(admin.indexOf("field('nearest_station_en'",base)<admin.indexOf("field('phone'",base));
assert(admin.includes('align-self:start;justify-content:flex-start'));
console.log('CMS English title fallback, authored text protection, editor payloads and admin field order passed.');
