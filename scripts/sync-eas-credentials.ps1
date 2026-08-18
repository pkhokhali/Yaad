# Sync Play upload key into credentials.json for EAS Build (local + cloud backup).
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$PropsPath = Join-Path $Root 'credentials\keystore.properties'
$KeystorePath = Join-Path $Root 'credentials\yaad-upload.keystore'
$LegacyKeystore = Join-Path $Root 'android\app\yaad-upload.keystore'
$LegacyProps = Join-Path $Root 'android\keystore.properties'
$CredentialsJson = Join-Path $Root 'credentials.json'

function Read-Props([string]$Path) {
  $map = @{}
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)=(.*)$') {
      $map[$Matches[1].Trim()] = $Matches[2].Trim()
    }
  }
  return $map
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'credentials') | Out-Null

if (-not (Test-Path $KeystorePath) -and (Test-Path $LegacyKeystore)) {
  Copy-Item $LegacyKeystore $KeystorePath -Force
  Write-Host "Copied keystore -> credentials/yaad-upload.keystore"
}

if (-not (Test-Path $PropsPath) -and (Test-Path $LegacyProps)) {
  $legacy = Read-Props $LegacyProps
  @(
    'storeFile=../credentials/yaad-upload.keystore'
    "storePassword=$($legacy['storePassword'])"
    "keyAlias=$($legacy['keyAlias'])"
    "keyPassword=$($legacy['keyPassword'])"
  ) | Set-Content -Path $PropsPath -Encoding ASCII
  Write-Host 'Created credentials/keystore.properties from android/keystore.properties'
}

if (-not (Test-Path $PropsPath) -or -not (Test-Path $KeystorePath)) {
  Write-Error 'Missing credentials/yaad-upload.keystore or credentials/keystore.properties'
}

$props = Read-Props $PropsPath
$json = @{
  android = @{
    keystore = @{
      keystorePath = 'credentials/yaad-upload.keystore'
      keystorePassword = $props['storePassword']
      keyAlias = $props['keyAlias']
      keyPassword = $props['keyPassword']
    }
  }
} | ConvertTo-Json -Depth 4

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($CredentialsJson, $json, $utf8NoBom)
Write-Host "Wrote $CredentialsJson"

Write-Host ''
Write-Host 'Next: back up the upload key to Expo (EAS) cloud so it is not lost locally:'
Write-Host '  npx eas-cli login'
Write-Host '  npx eas-cli credentials -p android'
Write-Host '  -> Keystore -> Upload existing keystore -> credentials.json'
Write-Host ''
Write-Host 'Or build on EAS (uses credentials.json automatically):'
Write-Host '  npx eas-cli build -p android --profile production'
exit 0
