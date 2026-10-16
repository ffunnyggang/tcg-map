'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const userHtml=read('garapon-event-test.html');
const adminHtml=read('admin-garapon-event-test.html');
const opsHtml=read('admin-garapon-ops-test.html');
const adminLoginHtml=read('admin-garapon-login.html');
const walletHtml=read('my-funy-coin-test.html');
const userJs=read('garapon-event-test.js');
const adminJs=read('admin-garapon-event-test.js');
const opsJs=read('admin-garapon-ops-test.js');
const adminAuthJs=read('admin-garapon-auth.js');
const authJs=read('web-auth.js');
const opsMigration=read('supabase/migrations/20261016025000_add_garapon_internal_ops_dashboard.sql');

const PUBLIC_ENTRY_FILES=[
  'index.html','tcg-tools.html','my.html','app.js','cms-frontend-renderer.js',
  'cms-frontend-mount.js','cms-link-enhancements.js','funy-i18n.js'
].filter(name=>fs.existsSync(path.join(root,name)));

const HIDDEN_URLS=[
  'garapon-event-test.html',
  'admin-garapon-event-test.html',
  'admin-garapon-ops-test.html',
  'admin-garapon-login.html',
  'my-funy-coin-test.html'
];

test('all development-only pages explicitly block indexing',()=>{
  for(const [name,html] of [['user',userHtml],['admin',adminHtml],['ops',opsHtml],['admin-login',adminLoginHtml],['wallet',walletHtml]]){
    assert.match(html,/name="robots"\s+content="noindex,nofollow,noarchive,nosnippet"/i,`${name} page must be noindex`);
  }
});

test('hidden event and internal ops pages are not linked from public entry surfaces',()=>{
  for(const name of PUBLIC_ENTRY_FILES){
    const content=read(name);
    for(const hiddenUrl of HIDDEN_URLS){
      assert.equal(content.includes(hiddenUrl),false,`${name} must not expose ${hiddenUrl}`);
    }
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

test('hidden admin pages use isolated administrator session instead of customer web session',()=>{
  assert.match(adminHtml,/admin-garapon-auth\.js/);
  assert.match(opsHtml,/admin-garapon-auth\.js/);
  assert.doesNotMatch(adminHtml,/web-auth\.js/);
  assert.doesNotMatch(opsHtml,/web-auth\.js/);
  assert.match(adminAuthJs,/funypin_admin_token/);
  assert.match(adminAuthJs,/funypin_admin_refresh/);
  assert.match(adminAuthJs,/admin-garapon-login\.html/);
  assert.match(adminLoginHtml,/grant_type=password/);
  assert.match(adminLoginHtml,/admin_users\?select=user_id/);
  assert.doesNotMatch(adminAuthJs,/localStorage/);
});

test('internal ops dashboard is admin RPC only and cannot release customer features',()=>{
  assert.match(opsJs,/admin_get_garapon_ops/);
  assert.match(opsJs,/admin_run_garapon_maintenance/);
  assert.doesNotMatch(opsJs,/admin_update_funy_coin_settings/);
  assert.doesNotMatch(opsJs,/p_garapon_public_enabled\s*:\s*true/);
  assert.doesNotMatch(opsJs,/p_system_enabled\s*:\s*true/);
  assert.doesNotMatch(opsJs,/p_signup_bonus_enabled\s*:\s*true/);
});

test('internal ops database RPC enforces admin checks and authenticated-only execution',()=>{
  assert.match(opsMigration,/if not public\.is_funypin_admin\(\)/i);
  assert.match(opsMigration,/revoke all on function public\.admin_get_garapon_ops\(uuid\) from public,anon,authenticated/i);
  assert.match(opsMigration,/grant execute on function public\.admin_get_garapon_ops\(uuid\) to authenticated/i);
  assert.match(opsMigration,/revoke all on function public\.admin_run_garapon_maintenance\(uuid,boolean\) from public,anon,authenticated/i);
  assert.match(opsMigration,/release_locked/i);
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
  assert.match(opsHtml,/admin-garapon-ops-test\.js/);
  assert.match(opsHtml,/admin-garapon-ops-test\.css/);
  assert.equal(userHtml.includes('garapon-three-v2.js'),false,'event page must not execute public local simulation logic');
  assert.match(userJs,/GaraponMachine/);
});
