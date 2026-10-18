param(
  [switch]$StartDevClient
)

$ErrorActionPreference = 'Stop'
$MobileRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$RepoRoot = Resolve-Path (Join-Path $MobileRoot '..')
Set-Location $RepoRoot

Write-Host "[FUNY PIN] AOS local QA — no AAB build" -ForegroundColor Cyan
Write-Host "Project: $RepoRoot"

$branch = git branch --show-current
$allowedBranches = @('qa/aos-web-sync-20261019','rc/aos-closed-test-20261019')
if ($allowedBranches -notcontains $branch) {
  throw "AOS QA/RC branch required. Current branch: $branch"
}

git fetch origin app-mvp --quiet

Write-Host "1/8 Locked native files"
$locked = @(
  'mobile/app/(tabs)/map.tsx',
  'mobile/app/(tabs)/_layout.tsx',
  'mobile/lib/auth.ts',
  'mobile/lib/socialAuth.ts',
  'mobile/lib/supabase.ts',
  'mobile/app/login.tsx',
  'mobile/app.json',
  'mobile/app.config.js',
  'mobile/eas.json'
)
git diff --exit-code origin/app-mvp -- $locked

Set-Location $MobileRoot
Write-Host "2/8 Reproducible dependency install"
npm ci

Write-Host "3/8 TypeScript"
npx tsc --noEmit

Write-Host "4/8 Expo Doctor"
npx expo-doctor

Write-Host "5/8 Expo public config"
npx expo config --type public | Out-File -Encoding utf8 (Join-Path $MobileRoot '.qa-expo-config.json')

Set-Location $RepoRoot
Write-Host "6/8 WebView injected JavaScript syntax"
node mobile/scripts/check-injected-js.mjs

Set-Location $MobileRoot
Write-Host "7/8 Android Metro export (not an AAB build)"
$ExportPath = Join-Path $MobileRoot '.qa-android-export'
if (Test-Path $ExportPath) { Remove-Item $ExportPath -Recurse -Force }
npx expo export --platform android --output-dir $ExportPath --clear

Write-Host "8/8 Temporary Android prebuild (no Gradle assemble/bundle)"
$TempRoot = Join-Path $env:TEMP 'funy-mobile-prebuild'
if (Test-Path $TempRoot) { Remove-Item $TempRoot -Recurse -Force }
New-Item -ItemType Directory -Path $TempRoot | Out-Null
Get-ChildItem $MobileRoot -Force | Where-Object { $_.Name -notin @('node_modules','.qa-android-export') } | ForEach-Object {
  Copy-Item $_.FullName -Destination $TempRoot -Recurse -Force
}
cmd /c mklink /J "$TempRoot\node_modules" "$MobileRoot\node_modules" | Out-Null
Push-Location $TempRoot
try {
  $env:CI = '1'
  npx expo prebuild --platform android --no-install --clean
  if (!(Test-Path (Join-Path $TempRoot 'android\settings.gradle'))) { throw 'android/settings.gradle was not generated' }
  if (!(Test-Path (Join-Path $TempRoot 'android\app\build.gradle'))) { throw 'android/app/build.gradle was not generated' }
} finally {
  Pop-Location
  Remove-Item Env:CI -ErrorAction SilentlyContinue
}

Write-Host "Automated local QA passed. No EAS build or AAB was started." -ForegroundColor Green
Write-Host "Next: Android device QA for gesture navigation and 3-button navigation."

if ($StartDevClient) {
  Set-Location $MobileRoot
  Write-Host "Starting the existing development client..." -ForegroundColor Yellow
  npx expo start --dev-client -c
}
