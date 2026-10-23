param([ValidatePattern('^[0-9a-fA-F-]{36}$')][string]$BuildId='dd0fbeec-0570-4640-9194-f2f66c644af5')
$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$env:APP_VARIANT='development'
$adbPath=Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$qaDir=Join-Path (Get-Location) '.expo\qa'
New-Item -ItemType Directory -Force $qaDir | Out-Null
$lastStatus=''
for($attempt=0;$attempt -lt 45;$attempt++){
  $json=& eas.cmd build:view $BuildId --json
  if($LASTEXITCODE -ne 0){throw 'Could not read EAS build status.'}
  $build=$json | ConvertFrom-Json
  if($build.appIdentifier -ne 'kr.funypin.app.dev'){throw 'Refusing to install a non-development package.'}
  if($build.status -ne $lastStatus){Write-Host ('BUILD '+$build.status);$lastStatus=$build.status}
  if($build.status -in @('ERRORED','CANCELED')){throw ('Build stopped: '+$build.status)}
  if($build.status -eq 'FINISHED'){
    $apkPath=Join-Path $qaDir ('funypin-dev-'+$BuildId+'.apk')
    $downloadUrl=$build.artifacts.applicationArchiveUrl
    if(-not $downloadUrl){$downloadUrl=$build.artifacts.buildUrl}
    if(-not $downloadUrl){throw 'Finished build has no download URL.'}
    Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $apkPath
    Write-Host ('APK downloaded: '+$apkPath)
    & $adbPath install -r $apkPath
    if($LASTEXITCODE -ne 0){throw 'Update install failed; existing app data has NOT been removed.'}
    & $adbPath reverse tcp:8083 tcp:8083
    & $adbPath shell am start -a android.intent.action.VIEW -d 'funypin-dev://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8083' kr.funypin.app.dev
    & $adbPath shell dumpsys package kr.funypin.app.dev | Select-String 'versionCode=|versionName=|POST_NOTIFICATIONS'
    Write-Host 'PASS development APK update installed. Remote push receipt still requires Firebase/FCM setup and QA.'
    exit 0
  }
  Start-Sleep -Seconds 30
}
throw 'Build did not finish within polling window.'
