param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$ruleName = "e service Next.js dev port $Port"

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
  Write-Host "Please run PowerShell as Administrator, then run this script again."
  exit 1
}

$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
  Write-Host "Firewall rule already exists: $ruleName"
  exit 0
}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort $Port `
  -Profile Private | Out-Null

Write-Host "Allowed inbound TCP port $Port for Private networks."
