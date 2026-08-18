# Build a Play Store release AAB. Gradle cache stays under this repo on D:.
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$GradleHome = Join-Path $Root '.gradle-home'
$AndroidDir = Join-Path $Root 'android'
$LocalProps = Join-Path $AndroidDir 'local.properties'
$CredentialsKeystore = Join-Path $Root 'credentials\yaad-upload.keystore'
$CredentialsProps = Join-Path $Root 'credentials\keystore.properties'

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

function Ensure-UploadKeystore {
  if ((Test-Path $CredentialsKeystore) -and (Test-Path $CredentialsProps)) {
    Write-Host "Using existing Play upload key: $CredentialsKeystore"
    return
  }

  Write-Error @"
Play upload keystore not found in credentials/.
Refusing to create a new key — Play Console would reject the AAB if an earlier build used a different upload key.
Restore:
  credentials\yaad-upload.keystore
  credentials\keystore.properties
"@
}

$SdkDir = Find-AndroidSdk
if (-not $SdkDir) {
  Write-Error 'Android SDK not found. Set ANDROID_HOME or install the SDK.'
}

if (-not (Test-Path $AndroidDir)) {
  Write-Host 'android/ folder missing — running Expo prebuild...'
  Push-Location $Root
  try {
    npx expo prebuild --platform android --non-interactive
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
}

Ensure-UploadKeystore

Write-Host 'Bumping Android version for Play Store...'
& (Join-Path $Root 'scripts\bump-android-version.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

New-Item -ItemType Directory -Force -Path $GradleHome | Out-Null
$escapedSdk = ($SdkDir -replace '\\', '\\')
Set-Content -Path $LocalProps -Value "sdk.dir=$escapedSdk`n" -Encoding ASCII

Push-Location $AndroidDir
try {
  & .\gradlew.bat bundleRelease @args
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  $aab = Join-Path $AndroidDir 'app\build\outputs\bundle\release\app-release.aab'
  if (Test-Path $aab) {
    $sizeMb = [math]::Round((Get-Item $aab).Length / 1MB, 1)
    Write-Host ''
    Write-Host "AAB ($sizeMb MB): $aab"
  }
} finally {
  Pop-Location
}
