$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$rootNodeModules = Join-Path $repoRoot 'node_modules'
$pnpmStore = Join-Path $rootNodeModules '.pnpm'

if (-not (Test-Path $pnpmStore)) {
  throw "No se encontro $pnpmStore. Corre una instalacion base antes de ejecutar este script."
}

function Ensure-Directory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Remove-IfExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (Test-Path $Path) {
    Remove-Item -LiteralPath $Path -Force -Recurse
  }
}

function Ensure-Junction {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LinkPath,
    [Parameter(Mandatory = $true)]
    [string]$TargetPath
  )

  if (-not (Test-Path $TargetPath)) {
    throw "No existe el destino para el enlace: $TargetPath"
  }

  if (Test-Path $LinkPath) {
    $existing = Get-Item -LiteralPath $LinkPath -Force
    if ($existing.LinkType -eq 'Junction' -and $existing.Target -contains $TargetPath) {
      return
    }

    Remove-Item -LiteralPath $LinkPath -Force -Recurse
  }

  $parent = Split-Path -Parent $LinkPath
  Ensure-Directory -Path $parent
  New-Item -ItemType Junction -Path $LinkPath -Target $TargetPath | Out-Null
}

function Find-PnpmPackagePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PackageName
  )

  $prefix = $PackageName.Replace('/', '+')

  $target = Get-ChildItem -LiteralPath $pnpmStore -Directory | Where-Object {
    $_.Name.StartsWith("$prefix@")
  } | ForEach-Object {
    $candidate = Join-Path $_.FullName "node_modules\$PackageName"
    if (Test-Path $candidate) {
      return $candidate
    }
  } | Select-Object -First 1

  if (-not $target) {
    $target = Get-ChildItem -LiteralPath $pnpmStore -Directory | ForEach-Object {
      $candidate = Join-Path $_.FullName "node_modules\$PackageName"
      if (Test-Path $candidate) {
        return $candidate
      }
    } | Select-Object -First 1
  }

  if (-not $target) {
    $shortPrefix = if ($prefix.Length -gt 28) { $prefix.Substring(0, 28) } else { $prefix }
    $target = Get-ChildItem -LiteralPath $pnpmStore -Directory | Where-Object {
      $_.Name.StartsWith($shortPrefix)
    } | ForEach-Object {
      $candidate = Join-Path $_.FullName "node_modules\$PackageName"
      if (Test-Path $candidate) {
        return $candidate
      }
    } | Select-Object -First 1
  }

  if (-not $target) {
    throw "No se encontro el paquete $PackageName dentro de $pnpmStore"
  }

  return $target
}

function Ensure-RegistryPackageLink {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PackageName
  )

  $targetPath = Find-PnpmPackagePath -PackageName $PackageName
  if ($PackageName.Contains('/')) {
    $scope, $name = $PackageName.Split('/', 2)
    $linkPath = Join-Path (Join-Path $rootNodeModules $scope) $name
  } else {
    $linkPath = Join-Path $rootNodeModules $PackageName
  }

  Ensure-Junction -LinkPath $linkPath -TargetPath $targetPath
}

function Ensure-WorkspacePackageLink {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PackageName,
    [Parameter(Mandatory = $true)]
    [string]$RelativeTarget
  )

  $scope, $name = $PackageName.Split('/', 2)
  $targetPath = Join-Path $repoRoot $RelativeTarget
  $linkPath = Join-Path (Join-Path $rootNodeModules $scope) $name
  Ensure-Junction -LinkPath $linkPath -TargetPath $targetPath
}

function Write-CmdShim {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  $binDir = Join-Path $rootNodeModules '.bin'
  Ensure-Directory -Path $binDir
  $shimPath = Join-Path $binDir "$Name.cmd"
  Set-Content -LiteralPath $shimPath -Value "@echo off`r`n$Command %*`r`n" -Encoding ASCII
}

Ensure-Directory -Path $rootNodeModules
Ensure-Directory -Path (Join-Path $rootNodeModules '@cosmetics')
Ensure-Directory -Path (Join-Path $rootNodeModules '@radix-ui')
Ensure-Directory -Path (Join-Path $rootNodeModules '@tanstack')

$workspacePackages = @{
  '@cosmetics/api-client' = 'packages/api-client'
  '@cosmetics/auth' = 'packages/auth'
  '@cosmetics/types' = 'packages/types'
  '@cosmetics/ui' = 'packages/ui'
}

$registryPackages = @(
  'autoprefixer',
  'class-variance-authority',
  'clsx',
  'date-fns',
  'eslint',
  'eslint-config-next',
  'lucide-react',
  'next',
  'postcss',
  'react',
  'react-day-picker',
  'react-dom',
  'react-hook-form',
  'sonner',
  'tailwind-merge',
  'tailwindcss',
  'typescript',
  'zod',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-dialog',
  '@radix-ui/react-label',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-select',
  '@radix-ui/react-slot',
  '@radix-ui/react-tooltip',
  '@tanstack/react-table'
  '@types/node',
  '@types/react',
  '@types/react-dom'
)

foreach ($item in $workspacePackages.GetEnumerator()) {
  Ensure-WorkspacePackageLink -PackageName $item.Key -RelativeTarget $item.Value
}

foreach ($packageName in $registryPackages) {
  Ensure-RegistryPackageLink -PackageName $packageName
}

Ensure-Junction -LinkPath (Join-Path $repoRoot 'apps/scheduler/node_modules') -TargetPath $rootNodeModules
Ensure-Junction -LinkPath (Join-Path $repoRoot 'packages/ui/node_modules') -TargetPath $rootNodeModules

Write-CmdShim -Name 'next' -Command 'node "%~dp0..\next\dist\bin\next"'
Write-CmdShim -Name 'tsc' -Command 'node "%~dp0..\typescript\bin\tsc"'

Write-Host 'Scheduler workspace reparado.'
