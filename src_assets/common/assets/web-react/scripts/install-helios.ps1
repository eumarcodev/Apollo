<#
.SYNOPSIS
  Silent install of a Helios build (or the official release) on this machine, for the installed-build e2e run.

.DESCRIPTION
  -Installer <path>  installs a build of the React web UI and checks that the installed index.html is the React UI.
  -Restore   <path>  reinstalls an official release the same way (no React check).
  Runs the NSIS installer with /S elevated (Start-Process -Verb RunAs -Wait), waits up to 120 s for the
  HeliosService service and for https://localhost:47990/login, writes a log under %TEMP%\helios-install-logs
  and prints "OK <version>" or "ABORT <reason>" as its last line.
#>
[CmdletBinding(DefaultParameterSetName = 'Install')]
param(
  [Parameter(Mandatory = $true, ParameterSetName = 'Install')][string]$Installer,
  [Parameter(Mandatory = $true, ParameterSetName = 'Restore')][string]$Restore,
  [int]$TimeoutSeconds = 120,
  [string]$WebUrl = 'https://localhost:47990'
)

$ServiceName = 'HeliosService'
$InstallDir = Join-Path $env:ProgramFiles 'Helios'
$IndexHtml = Join-Path $InstallDir 'assets\web\index.html'
$ReactMarker = 'helios-web-ui" content="react"'

$exe = if ($PSCmdlet.ParameterSetName -eq 'Restore') { $Restore } else { $Installer }
$checkReact = $PSCmdlet.ParameterSetName -eq 'Install'

if (-not (Test-Path -LiteralPath $exe)) {
  Write-Output "ABORT installer not found: $exe"
  exit 1
}
$exe = (Resolve-Path -LiteralPath $exe).Path
$logDir = Join-Path $env:TEMP "helios-install-logs"
New-Item -ItemType Directory -Force $logDir | Out-Null
$logFile = Join-Path $logDir ("install-helios-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

function Write-Log([string]$message) {
  $line = '{0} {1}' -f (Get-Date -Format 'HH:mm:ss'), $message
  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
  Write-Host $line
}

function Stop-WithAbort([string]$reason) {
  Write-Log "ABORT $reason"
  Write-Output "ABORT $reason"
  exit 1
}

function Get-RegistryVersion {
  $keys = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )
  $entry = Get-ItemProperty $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq 'Helios' } | Select-Object -First 1
  if ($entry) { return [string]$entry.DisplayVersion }
  return $null
}

function Test-WebUi {
  # The host uses a self-signed certificate; curl.exe ships with Windows 10+.
  $code = & curl.exe -k -s -o NUL -w '%{http_code}' --max-time 5 "$WebUrl/login" 2>$null
  return ($code -match '^(200|307)$')
}

Write-Log "installer: $exe"
$before = Get-RegistryVersion
Write-Log ("installed before: {0}" -f $(if ($before) { $before } else { 'none' }))

try {
  $process = Start-Process -FilePath $exe -ArgumentList '/S' -Verb RunAs -Wait -PassThru
} catch {
  Stop-WithAbort "could not start the installer elevated: $($_.Exception.Message)"
}
Write-Log "installer exit code: $($process.ExitCode)"
if ($process.ExitCode -ne 0) {
  Stop-WithAbort "installer exit code $($process.ExitCode)"
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$serviceOk = $false
$webOk = $false
while ((Get-Date) -lt $deadline) {
  $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  $serviceOk = $service -and $service.Status -eq 'Running'
  if ($serviceOk) {
    $webOk = Test-WebUi
    if ($webOk) { break }
  }
  Start-Sleep -Seconds 2
}
if (-not $serviceOk) { Stop-WithAbort "$ServiceName is not running after $TimeoutSeconds s" }
if (-not $webOk) { Stop-WithAbort "$WebUrl/login did not answer after $TimeoutSeconds s" }
Write-Log "$ServiceName running, web UI answering"

if ($checkReact) {
  if (-not (Test-Path -LiteralPath $IndexHtml)) { Stop-WithAbort "missing $IndexHtml" }
  $index = Get-Content -LiteralPath $IndexHtml -Raw
  if (-not $index.Contains($ReactMarker)) { Stop-WithAbort "$IndexHtml is not the React web UI" }
  Write-Log 'installed index.html is the React web UI'
}

$after = Get-RegistryVersion
if (-not $after) { Stop-WithAbort 'no Helios entry in the uninstall registry after install' }
Write-Log "OK $after"
Write-Output "OK $after"
exit 0
