const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function translations(language){
 const window={},document={documentElement:{},body:{classList:{toggle(){}}},readyState:'loading',addEventListener(){}};
 const context={window,document,location:{pathname:'/faq.html'},localStorage:{getItem:()=>language},MutationObserver:class{observe(){}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('funy-i18n.js','utf8'),context);return window.FUNY_I18N.t;
}
const en=translations('en'),ko=translations('ko');
for(const text of ['FUNY PIN은 어떤 서비스인가요?','개인정보 수집 및 이용에 동의해주세요.','미완료 응모','Instagram 아이디 입력','이미지 저장','조회중','문의가 접수되었습니다.']){assert.notEqual(en(text),text);assert.equal(ko(text),text)}
assert.equal(en('이벤트 기간 중 1일 3회 응모 가능(중복 응모 가능)'),'3 entries per day during the event. Repeat entries are allowed.');
assert.equal(en('응모 완료! · 오늘 2/3회 · 누적 5회'),'Entry complete! · Today 2/3 · Total 5');
assert.equal(en('📍 MY SHOP에서 포획했어요'),'📍 Caught at MY SHOP');
assert.equal(en('현재 위치에서 MY SHOP까지 약 120m예요. 포획 가능 거리는 100m 이내예요.'),'You are about 120 m from MY SHOP. Catch range: 100 m.');
assert.equal(en('MY SHOP에서 도보 5분'),'5 min walk from MY SHOP');
assert.equal(en('작성자가 입력한 콘텐츠'),'작성자가 입력한 콘텐츠');
const form=fs.readFileSync('shop-request.html','utf8');assert(form.includes(".map(x=>x.dataset.value),hours:"));assert(form.includes('data-value="포켓몬"'));assert(form.includes("closed.push(day+'요일')"));
const cms=fs.readFileSync('cms-frontend-renderer.js','utf8');const helper=cms.slice(cms.indexOf('const english='),cms.indexOf('const esc='));
for(const language of ['ko','en']){const ctx={localStorage:{getItem:()=>language},window:{FUNY_I18N:{t:en}}};vm.createContext(ctx);vm.runInContext(helper+'this.title=cmsText({title:"원문",title_en:"English"},"title");this.fallback=cmsText({title:"원문"},"title");',ctx);assert.equal(ctx.title,language==='en'?'English':'원문');assert.equal(ctx.fallback,'원문')}
for(const page of ['faq.html','partner.html','shop-request.html','feedback.html','support.html','notice.html','event-thecardroom.html','event-cardvault.html','event-koreatcgfair.html'])assert(fs.readFileSync(page,'utf8').includes('funy-i18n.js?v=20261013-web-en-v6'),page);
console.log('KO/EN UI, dynamic limits, CMS fallback and canonical form values passed.');
