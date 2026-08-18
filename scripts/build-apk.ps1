# Build a release APK with Gradle caches under this repo (not the user profile).
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$GradleHome = Join-Path $Root '.gradle-home'
$AndroidDir = Join-Path $Root 'android'
$LocalProps = Join-Path $AndroidDir 'local.properties'

$env:GRADLE_USER_HOME = $GradleHome
$env:GRADLE_OPTS = '-Dorg.gradle.daemon=false'

function Find-AndroidSdk {
  foreach ($candidate in @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    'D:\Android\Sdk',
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
  )) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  return $null
}

$SdkDir = Find-AndroidSdk
if (-not $SdkDir) {
  Write-Error 'Android SDK not found. Set ANDROID_HOME or install the SDK.'
}

if (-not (Test-Path $AndroidDir)) {
  Write-Host 'android/ folder missing - running Expo prebuild...'
} else {
  Write-Host 'Syncing native Android project from app.json (AdMob, plugins)...'
}
Push-Location $Root
try {
  npx expo prebuild --platform android --non-interactive
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force -Path $GradleHome | Out-Null
$escapedSdk = ($SdkDir -replace '\\', '\\')
Set-Content -Path $LocalProps -Value "sdk.dir=$escapedSdk`n" -Encoding ASCII

Push-Location $AndroidDir
try {
  & .\gradlew.bat assembleRelease @args
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $apk = Join-Path $AndroidDir 'app\build\outputs\apk\release\app-release.apk'
  if (Test-Path $apk) {
    $sizeMb = [math]::Round((Get-Item $apk).Length / 1MB, 1)
    Write-Host ''
    Write-Host "APK ($sizeMb MB): $apk"
  }
} finally {
  Pop-Location
}
