param(
  [string]$Prd = "PRD.md",
  [string]$Engine = "--copilot"
)

$ErrorActionPreference = "Stop"

Write-Host "[ralphy-loop] ensuring ralphy-cli is installed..."
npm install -g ralphy-cli

Write-Host "[ralphy-loop] initializing project config if needed..."
if (-not (Test-Path ".ralphy/config.yaml")) {
  ralphy --init
}

Write-Host "[ralphy-loop] running autonomous loop with PRD: $Prd"
ralphy $Engine --prd $Prd --max-retries 3 --retry-delay 5
