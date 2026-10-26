# Downloads the official Electron runtime into runtime\electron and verifies its SHA256.
# Usage (from the repository root):  powershell -ExecutionPolicy Bypass -File tools\fetch-electron.ps1
$ErrorActionPreference = 'Stop'

$Version = '45.0.0'
$Url     = "https://github.com/electron/electron/releases/download/v$Version/electron-v$Version-win32-x64.zip"
$Sha256  = 'AE53887A23BB640369C93DBD38C408A2AF5C0DEB86F2FA76C6C244CB444B7F47'

$Root   = Split-Path -Parent $PSScriptRoot
$Target = Join-Path $Root 'runtime\electron'
$Zip    = Join-Path ([IO.Path]::GetTempPath()) "electron-v$Version-win32-x64.zip"

if (Test-Path (Join-Path $Target 'electron.exe')) {
  Write-Host "Electron already present in $Target"
  exit 0
}

Write-Host "Downloading Electron $Version..."
Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing

$Actual = (Get-FileHash -Algorithm SHA256 $Zip).Hash
if ($Actual -ne $Sha256) {
  Remove-Item $Zip -Force
  throw "SHA256 mismatch: expected $Sha256, got $Actual"
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null
Expand-Archive -Path $Zip -DestinationPath $Target -Force
Remove-Item $Zip -Force
Write-Host "Electron $Version unpacked to $Target"
