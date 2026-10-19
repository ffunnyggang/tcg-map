[CmdletBinding()]
param(
  [ValidateSet('native','web','off','mixed')]
  [string]$Preset = 'native',

  [ValidateSet('native','web','off')]
  [string]$HomeMode,

  [ValidateSet('native','web','off')]
  [string]$MapMode,

  [ValidateSet('native','web','off')]
  [string]$PickMode,

  [ValidateSet('native','web','off')]
  [string]$TalkMode,

  [switch]$NoClear,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path -Parent $PSScriptRoot
Set-Location $mobileRoot

$presets = @{
  native = @{ home='native'; map='native'; pick='native'; talk='native' }
  web    = @{ home='web';    map='web';    pick='web';    talk='web' }
  off    = @{ home='off';    map='off';    pick='off';    talk='off' }
  mixed  = @{ home='native'; map='native'; pick='web';    talk='off' }
}

$resolved = $presets[$Preset].Clone()
if ($PSBoundParameters.ContainsKey('HomeMode')) { $resolved.home = $HomeMode }
if ($PSBoundParameters.ContainsKey('MapMode'))  { $resolved.map  = $MapMode }
if ($PSBoundParameters.ContainsKey('PickMode')) { $resolved.pick = $PickMode }
if ($PSBoundParameters.ContainsKey('TalkMode')) { $resolved.talk = $TalkMode }

$env:EXPO_PUBLIC_FLOATING_MODE_HOME = $resolved.home
$env:EXPO_PUBLIC_FLOATING_MODE_MAP = $resolved.map
$env:EXPO_PUBLIC_FLOATING_MODE_PICK = $resolved.pick
$env:EXPO_PUBLIC_FLOATING_MODE_TALK = $resolved.talk

Write-Host ''
Write-Host 'FUNY PIN AOS floating action local mode' -ForegroundColor Cyan
Write-Host ('  HOME : ' + $resolved.home)
Write-Host ('  MAP  : ' + $resolved.map)
Write-Host ('  PICK : ' + $resolved.pick)
Write-Host ('  TALK : ' + $resolved.talk)
Write-Host ('  ROOT : ' + $mobileRoot)
Write-Host ''

if ($DryRun) {
  Write-Host 'DryRun: Metro was not started.' -ForegroundColor Yellow
  exit 0
}

$args = @('expo','start','--android')
if (-not $NoClear) { $args += '--clear' }
& npx.cmd @args
exit $LASTEXITCODE
