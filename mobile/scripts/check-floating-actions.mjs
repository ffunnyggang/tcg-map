import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const mobileRoot=path.resolve(here,'..');
const repoRoot=path.resolve(mobileRoot,'..');
const read=rel=>fs.readFileSync(path.join(repoRoot,rel),'utf8');
const git=(args,options={})=>execFileSync('git',args,{cwd:repoRoot,encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim();
let failed=0;
const check=(name,condition,detail='')=>{
  if(condition){console.log(`PASS ${name}`);return;}
  failed+=1;console.error(`FAIL ${name}${detail?`: ${detail}`:''}`);
};
const contains=(source,parts)=>parts.every(part=>source.includes(part));

try{git(['merge-base','--is-ancestor','9859cb90','HEAD']);check('build 2 baseline ancestry',true);}catch{check('build 2 baseline ancestry',false,'9859cb90 is not an ancestor');}
check('dedicated local branch',git(['branch','--show-current'])==='work/aos-native-floating-toggle-from-9859cb90',git(['branch','--show-current']));
try{git(['diff','--check']);check('git diff whitespace',true);}catch(error){check('git diff whitespace',false,String(error?.stderr||error));}
try{git(['diff','--quiet','9859cb90','--','mobile/app.json','mobile/app.config.js','mobile/eas.json','mobile/package.json','mobile/package-lock.json']);check('build and package config unchanged',true);}catch{check('build and package config unchanged',false);}

const settings=read('mobile/lib/floatingActions.ts');
const metrics=read('mobile/lib/tabMetrics.ts');
const webview=read('mobile/components/FunyWebView.tsx');
const home=read('mobile/app/(tabs)/index.tsx');
const map=read('mobile/app/(tabs)/map.tsx');
const pick=read('mobile/app/(tabs)/pick.tsx');
const talk=read('mobile/app/(tabs)/talk.tsx');
const live=read('mobile/components/LivePinButton.tsx');
const nativeButton=read('mobile/components/NativeFloatingButton.tsx');
const mapButton=read('mobile/components/MapFloatingAction.tsx');
const admin=read('admin.html');
const migration=read('supabase/migrations/20261019_app_floating_actions_v1.sql');

check('three floating modes',contains(settings,["export type FloatingMode='native'|'web'|'off'","mode:'native'"]));
check('four Android surfaces',contains(settings,["home:createDefault('home'","map:createDefault('map'","pick:createDefault('pick'","talk:createDefault('talk'"]));
check('secure local cache',contains(settings,["const CACHE_KEY='funypin_floating_actions_v1'",'SecureStore.getItemAsync(CACHE_KEY)','SecureStore.setItemAsync(CACHE_KEY']));
check('cache readiness gate',contains(settings,['cachePromise:Promise<Snapshot>|null','const [ready,setReady]','setReady(true)']));
check('remote refresh and foreground refresh',contains(settings,['REFRESH_INTERVAL_MS=60_000',"AppState.addEventListener('change'",'setInterval(()=>refreshFloatingActions']));
check('development-only local mode override',contains(settings,['__DEV__&&isMode(override)','EXPO_PUBLIC_FLOATING_MODE_HOME','EXPO_PUBLIC_FLOATING_MODE_MAP','EXPO_PUBLIC_FLOATING_MODE_PICK','EXPO_PUBLIC_FLOATING_MODE_TALK']));
check('shared tab and safe-area metrics',contains(metrics,['TAB_BAR_HEIGHT=58','ANDROID_MIN_SAFE_BOTTOM=16','FLOATING_ACTION_GAP=18','resolveFloatingActionBottom']));
check('native live button uses shared metrics',contains(live,['resolveFloatingActionBottom','label=\'LIVE PIN\'']));
check('generic native button exists',contains(nativeButton,['export default function NativeFloatingButton','resolveFloatingActionBottom','subscribeWebOverlay']));
check('map native menu exists',contains(mapButton,['export default function MapFloatingAction','LIVE PIN 제보','TCG 거래','매물 등록','navTopOffset']));

check('HOME mode wiring',contains(home,["useFloatingAction('home')","ready?setting.mode:'off'",'floatingActionMode={floatingMode}',"floatingMode==='native'",'<LivePinButton']));
check('MAP mode wiring',contains(map,["useFloatingAction('map')","ready?setting.mode:'off'",'nativeFloatingCommand={nativeCommand}','<MapFloatingAction',"action:'open_market'","action:'open_market_register'"]));
check('PICK mode wiring',contains(pick,["useFloatingAction('pick')","ready?setting.mode:'off'",'floatingActionMode={floatingMode}',"floatingMode==='native'",'<LivePinButton']));
check('TALK mode wiring',contains(talk,["useFloatingAction('talk')","ready?setting.mode:'off'",'floatingActionMode={floatingMode}',"floatingMode==='native'",'<NativeFloatingButton','Linking.openURL']));

check('web button mode classes',contains(webview,['app-floating-native','app-floating-web','app-floating-off','floatingActionMode?:FloatingMode']));
check('native and off hide web actions',contains(webview,['.live-pin-entry-wrap,.live-pin-detail-entry','#livePinEntry','[data-live-pin-entry]','.pokamo-fab','.market-fab-wrap','display:none!important']));
check('web mode restores per-page actions',contains(webview,['.pokamo-fab{display:flex!important','.market-fab-wrap{display:flex!important','.live-pin-entry-wrap{display:flex!important']));
check('runtime mode switch without reload',contains(webview,['__funy_floating_mode_runtime__',"window.dispatchEvent(new CustomEvent('funy:floating-action-mode'",'ref.current?.injectJavaScript(js)']));
check('map action bridge',contains(webview,['nativeFloatingCommand?:NativeFloatingCommand',"action==='open_market'","action==='open_market_register'",'FUNY_NATIVE_FLOATING_ACTION']));

check('admin floating tab',contains(admin,['data-admin-tab="floating"','앱 플로팅 버튼','async function loadFloatingActions()']));
check('admin native web off controls',contains(admin,['option value="native"','option value="web"','option value="off"','app_floating_actions?platform=eq.android']));
check('admin upsert',contains(admin,['on_conflict=platform,surface','resolution=merge-duplicates']));
const inlineScripts=[...admin.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(source=>source.trim());
try{inlineScripts.forEach(source=>new Function(source));check('admin inline JavaScript syntax',true,`${inlineScripts.length} script(s)`);}catch(error){check('admin inline JavaScript syntax',false,String(error));}

check('migration table and primary key',contains(migration,['create table if not exists public.app_floating_actions','primary key (platform,surface)']));
check('migration mode constraints',contains(migration,["mode in ('native','web','off')","surface in ('home','map','pick','talk')"]));
check('migration public read and admin write policies',contains(migration,['floating actions public read','floating actions admin manage','public.is_funypin_admin()']));
check('migration default rows',contains(migration,["('android','home','native'","('android','map','native'","('android','pick','native'","('android','talk','native'"]));

console.log('\nLocal commits from build 2 baseline:');
console.log(git(['log','--reverse','--oneline','9859cb90..HEAD'])||'(none)');
if(failed){console.error(`\n${failed} floating-action check(s) failed.`);process.exit(1);}
console.log('\nAll floating-action local checks passed.');
