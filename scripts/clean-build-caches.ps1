# Remove Gradle/build caches. Keeps Android SDK on C (required to compile).
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent

Write-Host 'Stopping Gradle daemons...'
Get-Process -Name java -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -like '*gradle*' -or $_.CommandLine -like '*GradleDaemon*' } |
  Stop-Process -Force -ErrorAction SilentlyContinue

$targets = @(
  "$env:USERPROFILE\.gradle",
  'D:\g',
  (Join-Path $Root '.gradle-home'),
  (Join-Path $Root 'android\app\build'),
  (Join-Path $Root 'android\build'),
  (Join-Path $Root 'android\.gradle'),
  (Join-Path $Root 'modules\yaad-native\android\build'),
  (Join-Path $Root '.expo\web\cache'),
  (Join-Path $Root 'node_modules\@react-native\gradle-plugin\.gradle'),
  (Join-Path $Root 'node_modules\expo-modules-autolinking\android\expo-gradle-plugin\.gradle')
)

foreach ($path in $targets) {
  if (-not (Test-Path $path)) { continue }
  Write-Host "Removing $path"
  Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Done. C:\Users\User\.gradle and old D:\g caches removed if present.'
