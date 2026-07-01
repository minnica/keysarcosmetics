$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'repair-scheduler-workspace.ps1')

Push-Location $repoRoot
try {
  cmd /c node_modules\.bin\tsc.cmd -p apps\scheduler\tsconfig.json --noEmit --pretty false
  Push-Location (Join-Path $repoRoot 'apps/scheduler')
  try {
    cmd /c ..\..\node_modules\.bin\next.cmd build
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
