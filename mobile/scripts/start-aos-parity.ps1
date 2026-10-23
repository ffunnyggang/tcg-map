param([int]$Port=8083)
$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$env:APP_VARIANT='development'
$adbPath=Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if(Test-Path $adbPath){
  & $adbPath reverse "tcp:$Port" "tcp:$Port"
  Write-Host "Unlock the Galaxy, then open FUNY PIN DEV at http://127.0.0.1:$Port"
}else{Write-Warning 'ADB not found. Connect the development client manually.'}
& node node_modules/expo/bin/cli start --dev-client --host localhost --port $Port
exit $LASTEXITCODE
