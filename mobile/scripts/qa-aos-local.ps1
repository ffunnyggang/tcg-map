param(
  [switch]$StartDevClient
)

$ErrorActionPreference = 'Stop'
$MobileRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $MobileRoot

Write-Host "[FUNY PIN] AOS local QA" -ForegroundColor Cyan
Write-Host "Project: $MobileRoot"

$branch = git branch --show-current
if ($branch -ne 'qa/aos-web-sync-20261019') {
  throw "QA branch required. Current branch: $branch"
}

Write-Host "1/5 Reproducible dependency install"
npm ci

Write-Host "2/5 TypeScript"
npx tsc --noEmit

Write-Host "3/5 Expo Doctor"
npx expo-doctor

Write-Host "4/5 Android Metro export (not an AAB build)"
$ExportPath = Join-Path $MobileRoot '.qa-android-export'
if (Test-Path $ExportPath) { Remove-Item $ExportPath -Recurse -Force }
npx expo export --platform android --output-dir $ExportPath --clear

Write-Host "5/5 Locked native files"
$locked = @(
  'app/(tabs)/map.tsx',
  'app/(tabs)/_layout.tsx',
  'lib/auth.ts',
  'lib/socialAuth.ts',
  'lib/supabase.ts',
  'app/login.tsx',
  'app.json',
  'app.config.js',
  'eas.json'
)
git diff --exit-code app-mvp -- $locked

Write-Host "Static QA passed. No EAS build was started." -ForegroundColor Green
Write-Host "Next: test gesture navigation and 3-button navigation on an Android device."

if ($StartDevClient) {
  Write-Host "Starting the existing development client..." -ForegroundColor Yellow
  npx expo start --dev-client -c
}
