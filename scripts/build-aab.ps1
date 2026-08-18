# Build a Play Store release AAB. Gradle cache stays under this repo on D:.
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$GradleHome = Join-Path $Root '.gradle-home'
$AndroidDir = Join-Path $Root 'android'
$LocalProps = Join-Path $AndroidDir 'local.properties'
$KeystoreProps = Join-Path $AndroidDir 'keystore.properties'
$KeystoreFile = Join-Path $AndroidDir 'app\yaad-upload.keystore'

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

function Find-Keytool {
  $sdk = Find-AndroidSdk
  if ($sdk) {
    $candidate = Join-Path $sdk 'build-tools\36.0.0\keytool.exe'
    if (Test-Path $candidate) { return $candidate }
    $found = Get-ChildItem (Join-Path $sdk 'build-tools') -Filter keytool.exe -Recurse -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  $javaKeytool = Get-Command keytool -ErrorAction SilentlyContinue
  if ($javaKeytool) { return $javaKeytool.Source }
  return $null
}

function Ensure-UploadKeystore {
  if ((Test-Path $KeystoreFile) -and (Test-Path $KeystoreProps)) { return }

  $keytool = Find-Keytool
  if (-not $keytool) {
    Write-Error 'Upload keystore missing and keytool not found. Install Android SDK build-tools or Java.'
  }

  $password = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  Write-Host 'Creating Play Store upload keystore (first time only)...'
  & $keytool -genkeypair -v `
    -storetype PKCS12 `
    -keystore $KeystoreFile `
    -alias yaad-upload `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $password `
    -keypass $password `
    -dname 'CN=Yaad, OU=Mobile, O=pkhokhali, L=Kathmandu, ST=Bagmati, C=NP'
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  @(
    "storePassword=$password"
    "keyPassword=$password"
    'keyAlias=yaad-upload'
    'storeFile=yaad-upload.keystore'
  ) | Set-Content -Path $KeystoreProps -Encoding ASCII

  Write-Host ''
  Write-Host 'IMPORTANT: Back up these files for all future Play Store updates:'
  Write-Host "  $KeystoreFile"
  Write-Host "  $KeystoreProps"
  Write-Host ''
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
