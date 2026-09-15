param(
  [string]$BackupRoot = "backups",
  [string]$DatabaseName = "service_management_db",
  [string]$MysqlUser = "service_user",
  [string]$MysqlPassword = "",
  [string]$MysqlHost = "127.0.0.1",
  [int]$MysqlPort = 3306
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path $BackupRoot $timestamp
$dbFile = Join-Path $targetDir "$DatabaseName.sql"
$uploadsZip = Join-Path $targetDir "uploads.zip"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Backing up database to $dbFile"
$dumpArgs = @(
  "--host=$MysqlHost",
  "--port=$MysqlPort",
  "--user=$MysqlUser",
  "--single-transaction",
  "--routines",
  "--triggers",
  $DatabaseName
)

if ($MysqlPassword) {
  $dumpArgs = @("--password=$MysqlPassword") + $dumpArgs
} else {
  $dumpArgs = @("--password") + $dumpArgs
}

& mysqldump @dumpArgs > $dbFile

Write-Host "Backing up uploaded files to $uploadsZip"
if (Test-Path "public\uploads") {
  Compress-Archive -Path "public\uploads" -DestinationPath $uploadsZip -Force
} else {
  Write-Host "public\uploads does not exist yet. Skipping uploads archive."
}

Write-Host "Backup completed: $targetDir"
