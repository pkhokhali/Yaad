# Bump Android versionCode + patch versionName before Play Store builds.
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent

$appJsonPath = Join-Path $Root 'app.json'
$packageJsonPath = Join-Path $Root 'package.json'
$gradlePath = Join-Path $Root 'android\app\build.gradle'

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Read-Utf8([string]$Path) {
  $text = [System.IO.File]::ReadAllText($Path)
  if ($text.Length -gt 0 -and [int][char]$text[0] -eq 0xFEFF) {
    $text = $text.Substring(1)
  }
  return $text
}

if (-not (Test-Path $appJsonPath)) {
  Write-Error "app.json not found at $appJsonPath"
}

$appJson = Read-Utf8 $appJsonPath

if ($appJson -notmatch '"versionCode":\s*(\d+)') {
  Write-Error 'Could not read expo.android.versionCode from app.json'
}
$oldCode = [int]$Matches[1]
$newCode = $oldCode + 1

if ($appJson -notmatch '"version":\s*"([\d.]+)"') {
  Write-Error 'Could not read expo.version from app.json'
}
$oldName = $Matches[1]
$segments = $oldName.Split('.')
$patchIndex = $segments.Length - 1
$segments[$patchIndex] = [string]([int]$segments[$patchIndex] + 1)
$newName = $segments -join '.'

$appJson = [regex]::Replace($appJson, '"version":\s*"[\d.]+"', "`"version`": `"$newName`"", 1)
$appJson = [regex]::Replace($appJson, '"versionCode":\s*\d+', "`"versionCode`": $newCode", 1)
Write-Utf8NoBom $appJsonPath $appJson

$packageJson = Read-Utf8 $packageJsonPath
$packageJson = [regex]::Replace($packageJson, '"version":\s*"[\d.]+"', "`"version`": `"$newName`"", 1)
Write-Utf8NoBom $packageJsonPath $packageJson

if (Test-Path $gradlePath) {
  $gradle = Read-Utf8 $gradlePath
  $gradle = $gradle -replace 'versionCode\s+\d+', "versionCode $newCode"
  $gradle = $gradle -replace 'versionName\s+"[^"]+"', "versionName `"$newName`""
  Write-Utf8NoBom $gradlePath $gradle
}

Write-Host "Version bumped: $oldName ($oldCode) -> $newName ($newCode)"
exit 0
