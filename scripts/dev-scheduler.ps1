$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'repair-scheduler-workspace.ps1')

Push-Location (Join-Path $repoRoot 'apps/scheduler')
try {
  cmd /c ..\..\node_modules\.bin\next.cmd dev -p 3004
} finally {
  Pop-Location
}
