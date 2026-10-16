'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const userHtml=read('garapon-event-test.html');
const adminHtml=read('admin-garapon-event-test.html');
const walletHtml=read('my-funy-coin-test.html');
const userJs=read('garapon-event-test.js');
const adminJs=read('admin-garapon-event-test.js');
const authJs=read('web-auth.js');

const PUBLIC_ENTRY_FILES=[
  'index.html','tcg-tools.html','my.html','app.js','cms-frontend-renderer.js',
  'cms-frontend-mount.js','cms-link-enhancements.js','funy-i18n.js'
].filter(name=>fs.existsSync(path.join(root,name)));

test('all development-only pages explicitly block indexing',()=>{
  for(const [name,html] of [['user',userHtml],['admin',adminHtml],['wallet',walletHtml]]){
    assert.match(html,/name="robots"\s+content="noindex,nofollow,noarchive,nosnippet"/i,`${name} page must be noindex`);
  }
});

test('hidden event is not linked from public entry surfaces',()=>{
  for(const name of PUBLIC_ENTRY_FILES){
    const content=read(name);
    assert.equal(content.includes('garapon-event-test.html'),false,`${name} must not expose user test page`);
    assert.equal(content.includes('admin-garapon-event-test.html'),false,`${name} must not expose admin test page`);
    assert.equal(content.includes('my-funy-coin-test.html'),false,`${name} must not expose test wallet`);
  }
});

test('user client relies on authenticated server RPC and never selects a random result locally',()=>{
  assert.match(userJs,/garapon_join_event/);
  assert.match(userJs,/garapon_get_event_state/);
  assert.match(userJs,/Authorization:`Bearer \$\{accessToken\}`/);
  assert.doesNotMatch(userJs,/Math\.random\(\).*result/i);
  assert.doesNotMatch(userJs,/secureInt\s*\(/);
});

test('admin console keeps public and signup switches locked off',()=>{
  assert.match(adminJs,/p_system_enabled:false/);
  assert.match(adminJs,/p_signup_bonus_enabled:false/);
  assert.match(adminJs,/p_garapon_public_enabled:false/);
  assert.match(adminJs,/visibility:'test'/);
});

test('web auth cleanup is finite and no longer self-recursive',()=>{
  const block=authJs.match(/function clearStoredAuth\(\)\{([\s\S]*?)\n  \}/);
  assert.ok(block,'clearStoredAuth function should exist');
  assert.equal(/clearStoredAuth\(\)/.test(block[1]),false,'clearStoredAuth must not call itself');
  assert.match(block[1],/localStorage\.removeItem/);
});

test('hidden pages load only dedicated files and do not alter public garapon entry',()=>{
  assert.match(userHtml,/garapon-event-test\.js/);
  assert.match(adminHtml,/admin-garapon-event-test\.js/);
  assert.equal(userHtml.includes('garapon-three-v2.js'),false,'event page must not execute public local simulation logic');
  assert.match(userJs,/GaraponMachine/);
});
