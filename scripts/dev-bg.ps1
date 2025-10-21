param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('start','stop','status','logs')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$root   = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $root
$logDir = Join-Path $root '.logs'
$log    = Join-Path $logDir 'dev.log'
$pidFile= Join-Path $logDir 'dev.pid'
New-Item -Force -ItemType Directory $logDir | Out-Null

function Get-DevPid {
  if (Test-Path $pidFile) {
    try { (Get-Content $pidFile | Select-Object -First 1) -as [int] } catch { $null }
  } else { $null }
}

switch ($Action) {
  'start' {
    $devPid = Get-DevPid
    if ($devPid) {
      $proc = Get-Process -Id $devPid -ErrorAction SilentlyContinue
      if ($proc) { Write-Output "Dev already running. PID: $devPid. Logs: $log"; exit 0 }
      else { Remove-Item $pidFile -ErrorAction SilentlyContinue }
    }

    # Force dev server port to 9006; if occupied, quasar will fail instead of picking another
    $cmd = '$env:FORCE_COLOR="1"; $env:CHECKS="0"; pnpm run dev -- -p 9006 *>> ".logs\\dev.log"'
    $p = Start-Process pwsh -WorkingDirectory $root -WindowStyle Hidden -ArgumentList @('-NoProfile','-Command', $cmd) -PassThru
    $p.Id | Set-Content $pidFile
    Start-Sleep -Seconds 2
    Write-Output "Started Quasar dev. PID: $($p.Id)"
    Write-Output "Log: $log"
    if (Test-Path $log) { Write-Output '--- Log tail ---'; Get-Content $log -Tail 40 }
  }
  'stop' {
    $devPid = Get-DevPid
    if ($devPid) {
      Stop-Process -Id $devPid -Force -ErrorAction SilentlyContinue
      Remove-Item $pidFile -ErrorAction SilentlyContinue
      Write-Output "Stopped PID $devPid"
    } else {
      Write-Output 'No PID file. Attempting by ports 9005/9006...'
      foreach ($port in 9005,9006) {
        $own = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $port } | Select-Object -First 1 -ExpandProperty OwningProcess
        if ($own) { Stop-Process -Id $own -Force -ErrorAction SilentlyContinue; Write-Output "Stopped process on port $port (PID $own)" }
      }
    }
  }
  'status' {
    $devPid = Get-DevPid
    $alive = $false
    if ($devPid) { $alive = (Get-Process -Id $devPid -ErrorAction SilentlyContinue) -ne $null }
    $port9005 = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 9005 }
    $port9006 = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 9006 }
    [PSCustomObject]@{
      ProcId   = $devPid
      Running  = $alive
      Log      = $log
      Port9005 = [bool]$port9005
      Port9006 = [bool]$port9006
      URLs     = @('http://localhost:9005/','http://localhost:9006/')
    } | Format-List
  }
  'logs' {
    if (!(Test-Path $log)) { Write-Output "Log not found: $log"; exit 1 }
    Get-Content $log -Wait
  }
}
