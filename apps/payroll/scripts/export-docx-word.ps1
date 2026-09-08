param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPdf
)

$wordApp = $null
$document = $null

try {
  $resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
  $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPdf)
  $outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutput)
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

  $wordApp = New-Object -ComObject Word.Application
  $wordApp.Visible = $false
  $wordApp.DisplayAlerts = 0
  $document = $wordApp.Documents.Open($resolvedInput, $false, $true)
  $document.ExportAsFixedFormat($resolvedOutput, 17)
  Write-Output $resolvedOutput
}
finally {
  if ($null -ne $document) {
    $document.Close($false)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
  }
  if ($null -ne $wordApp) {
    $wordApp.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
