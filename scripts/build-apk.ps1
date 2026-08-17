# Build release APK with all Gradle caches under this repo (not C:\Users\...\ .gradle).
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$GradleHome = Join-Path $Root '.gradle-home'
$AndroidDir = Join-Path $Root 'android'
$SdkDir = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$LocalProps = Join-Path $AndroidDir 'local.properties'

$env:GRADLE_USER_HOME = $GradleHome
$env:GRADLE_OPTS = '-Dorg.gradle.daemon=false'

if (-not (Test-Path $SdkDir)) {
  Write-Error "Android SDK not found at $SdkDir. Install Android Studio or set ANDROID_HOME."
}

if (-not (Test-Path $AndroidDir)) {
  Write-Error "android/ folder missing. Run: npx expo prebuild --platform android"
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
    Write-Host ""
    Write-Host "APK: $apk"
  }
} finally {
  Pop-Location
}
