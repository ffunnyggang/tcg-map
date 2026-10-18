#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOBILE_ROOT="$REPO_ROOT/mobile"
cd "$REPO_ROOT"

printf '\n[FUNY PIN] Final Android QA without AAB build\n'

python - <<'PY'
from pathlib import Path
p=Path('mobile/components/FunyWebView.tsx')
s=p.read_text(encoding='utf-8')
duplicated='my-community|my-market|my-favorites|my-blocked-users|my-security|my-funy-coin|my-badges|my-funymon|my-entries|my-coupons|ranking|my-community|my-market|my-favorites|my-blocked-users|my-security|my-funy-coin|my-badges|my-funymon|my-entries|my-coupons|ranking'
single='my-community|my-market|my-favorites|my-blocked-users|my-security|my-funy-coin|my-badges|my-funymon|my-entries|my-coupons|ranking'
if duplicated in s:
    s=s.replace(duplicated,single)
if s.count(single)<1:
    raise SystemExit('MY route set is missing')
p.write_text(s,encoding='utf-8')
PY

echo '[1/11] Locked native files'
git diff --exit-code origin/app-mvp -- \
  'mobile/app/(tabs)/map.tsx' \
  'mobile/app/(tabs)/_layout.tsx' \
  mobile/lib/auth.ts \
  mobile/lib/socialAuth.ts \
  mobile/lib/supabase.ts \
  mobile/app/login.tsx \
  mobile/app.json \
  mobile/app.config.js \
  mobile/eas.json

echo '[2/11] Intended changed-file boundary'
python - <<'PY'
import subprocess
allowed={
  '.github/workflows/aos-qa-apply.yml',
  '.github/workflows/aos-qa-final-validate.yml',
  '.github/workflows/aos-qa-final-validate-v2.yml',
  'admin.html',
  'mobile/QA_AOS_PREBUILD_20261019.md',
  'mobile/app/(tabs)/index.tsx',
  'mobile/app/(tabs)/pick.tsx',
  'mobile/app/account.tsx',
  'mobile/app/live-pin.tsx',
  'mobile/app/my/profile-edit.tsx',
  'mobile/app/shop/[id].tsx',
  'mobile/components/FunyBackButton.tsx',
  'mobile/components/FunyHeader.tsx',
  'mobile/components/FunyWebView.tsx',
  'mobile/components/MySubHeader.tsx',
  'mobile/lib/shops.ts',
  'mobile/package-lock.json',
  'mobile/package.json',
  'mobile/scripts/check-injected-js.mjs',
  'mobile/scripts/harden-aos-webview.py',
  'mobile/scripts/qa-aos-ci.sh',
  'mobile/scripts/qa-aos-local.ps1',
  'scripts/apply-aos-qa-update.py',
}
changed=set(subprocess.check_output(['git','diff','--name-only','origin/app-mvp...HEAD'],text=True).splitlines())
unexpected=sorted(changed-allowed)
if unexpected:
    raise SystemExit('Unexpected changed files: '+', '.join(unexpected))
print('Changed-file boundary OK:',len(changed),'files')
PY

echo '[3/11] Reproducible dependency install'
cd "$MOBILE_ROOT"
npm ci

echo '[4/11] TypeScript'
npx tsc --noEmit

echo '[5/11] Expo Doctor'
npx expo-doctor

echo '[6/11] Expo public config'
npx expo config --type public > /tmp/funy-expo-config.json

cd "$REPO_ROOT"
echo '[7/11] Static regression assertions'
python - <<'PY'
from pathlib import Path
web=Path('mobile/components/FunyWebView.tsx').read_text(encoding='utf-8')
account=Path('mobile/app/account.tsx').read_text(encoding='utf-8')
live=Path('mobile/app/live-pin.tsx').read_text(encoding='utf-8')
package=Path('mobile/package.json').read_text(encoding='utf-8')
checks={
  'MAP keep-alive': 'const keepMapAlive=isMapWebView' in web,
  'Android MAP early reveal': "Number(e.nativeEvent.progress)>=0.35" in web,
  'Android web floating owner': 'funy-android-web-floating' in web,
  'Native safe-bottom bridge': '--funy-native-safe-bottom' in web,
  'TALK direct block exit': 'FUNY_TALK_HANDLE_BLOCKED_OWNER' in web and 'exitBlockedTalkPost' in web,
  'Android image bridge': 'SAVE_APP_IMAGE' in web and 'expo-file-system/legacy' in web,
  'Image bridge scoped to images': 'var imageDownload=' in web,
  'MY market detail native return': "target.closest('#marketDetailBack')" in web and 'showBackHeader&&!isMarketDetail?' in web,
  'Coin flip scoped audio': 'isCoinFlipWebView' in web and 'mediaPlaybackRequiresUserAction' in web,
  'Android cached location': 'getLastKnownPositionAsync' in web and 'Location.Accuracy.Balanced' in web,
  'Production LIVE PIN': 'https://funypin.kr/live-pin.html' in live and 'live-pin-test.html' not in live,
  'Current MY pages': all(x in account for x in ['my-community.html','my-market.html','my-favorites.html','my-blocked-users.html']),
  'Tester-only prepared pages': all(x in account for x in ['my-funy-coin.html','ranking.html','my-badges.html','is_my_feature_tester']),
  'Image modules locked': 'expo-file-system' in package and 'expo-sharing' in package,
  'No legacy market pages': all(x not in web+account for x in ['market-detail-test.html','market-register-test.html','shops-market-test.html']),
}
failed=[name for name,ok in checks.items() if not ok]
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL'),name)
if failed: raise SystemExit('Static assertions failed: '+', '.join(failed))
PY

echo '[8/11] WebView injected JavaScript syntax'
node mobile/scripts/check-injected-js.mjs

echo '[9/11] Current production web syntax'
mkdir -p /tmp/funy-current-web
for file in talk-community-v1.js talk-safety-v1.js funy-mon-v1.js map-market-v1.js; do
  curl -fsSL "https://raw.githubusercontent.com/ffunnyggang/tcg-map/main/${file}" -o "/tmp/funy-current-web/${file}"
  node --check "/tmp/funy-current-web/${file}"
done

echo '[10/11] Android Metro export (no AAB)'
cd "$MOBILE_ROOT"
CI=1 npx expo export --platform android --output-dir /tmp/funy-android-export --clear

echo '[11/11] Temporary Android prebuild (no Gradle build)'
cd "$REPO_ROOT"
rm -rf /tmp/funy-mobile-prebuild
mkdir -p /tmp/funy-mobile-prebuild
rsync -a --exclude node_modules --exclude .qa-android-export mobile/ /tmp/funy-mobile-prebuild/
ln -s "$MOBILE_ROOT/node_modules" /tmp/funy-mobile-prebuild/node_modules
cd /tmp/funy-mobile-prebuild
CI=1 npx expo prebuild --platform android --no-install --clean
test -f android/settings.gradle
test -f android/app/build.gradle

cat > /tmp/AOS_FINAL_QA_RESULT.md <<'EOF'
# FUNY PIN AOS final non-build QA

- Locked MAP/navigation/auth/app-config files unchanged
- Changed-file boundary passed
- npm ci passed
- TypeScript passed
- Expo Doctor passed
- Expo public config passed
- WebView injected JavaScript syntax passed
- Current production web JavaScript syntax passed
- Android Metro export passed
- Temporary Android Expo prebuild passed
- No EAS build, AAB bundle, Gradle assemble, or store submission was started

Physical Android device QA remains required before release build.
EOF

cat /tmp/AOS_FINAL_QA_RESULT.md
