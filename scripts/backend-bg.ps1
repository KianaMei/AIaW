param(
  [Parameter(Mandatory=$true)]
  [ValidateSet('start','stop','status','logs')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$root    = (Resolve-Path "$PSScriptRoot\..").Path
$workdir = Join-Path $root 'src-backend'
Set-Location $root
$logDir  = Join-Path $root '.logs'
$log     = Join-Path $logDir 'backend.log'
$pidFile = Join-Path $logDir 'backend.pid'
New-Item -Force -ItemType Directory $logDir | Out-Null

function Get-BackendPid {
  if (Test-Path $pidFile) {
    try { (Get-Content $pidFile | Select-Object -First 1) -as [int] } catch { $null }
  } else { $null }
}

function Resolve-PythonCmd {
  # 1) prefer python on PATH if it actually runs
  foreach ($name in @('python','python3','py -3','py')) {
    try {
      $code = & cmd /c "$name -c ""import sys;print('ok')""" 2>$null
      if ($LASTEXITCODE -eq 0 -and $code -match 'ok') { return $name }
    } catch {}
  }
  # 2) try common install paths (conda/user installs)
  $common = @(
    "$env:USERPROFILE\anaconda3\python.exe",
    "C:\\Users\\*\\anaconda3\\python.exe",
    "C:\\ProgramData\\Anaconda3\\python.exe",
    "C:\\Program Files\\Python*\\python.exe",
    "D:\\conda_location\\python.exe"
  )
  foreach ($pattern in $common) {
    $candidates = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    foreach ($exe in $candidates) {
      try {
        & $exe.FullName -c "import sys;print('ok')" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { return $exe.FullName }
      } catch {}
    }
  }
  return $null
}

switch ($Action) {
  'start' {
    $backendPid = Get-BackendPid
    if ($backendPid) {
      $proc = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
      if ($proc) { Write-Output "Backend already running. PID: $backendPid. Logs: $log"; exit 0 }
      else { Remove-Item $pidFile -ErrorAction SilentlyContinue }
    }

    $python = Resolve-PythonCmd
    if (-not $python) { Write-Error "Python not found on PATH. Please install or add to PATH."; exit 1 }

    $env:PORT = $env:PORT -as [int]
    if (-not $env:PORT) { $env:PORT = 8010 }

    # Launch uvicorn with working directory set to src-backend so relative paths (e.g. 'static') resolve correctly
    $cmd = "$python -m uvicorn app:app --host 127.0.0.1 --port $env:PORT *>> '..\\.logs\\backend.log'"
    $p = Start-Process pwsh -WorkingDirectory $workdir -WindowStyle Hidden -ArgumentList @('-NoProfile','-Command', $cmd) -PassThru
    $p.Id | Set-Content $pidFile
    Start-Sleep -Seconds 2
    Write-Output "Started FastAPI backend. PID: $($p.Id)"
    Write-Output "Log: $log"
    if (Test-Path $log) { Write-Output '--- Log tail ---'; Get-Content $log -Tail 40 }
  }
  'stop' {
    $backendPid = Get-BackendPid
    if ($backendPid) {
      Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
      Remove-Item $pidFile -ErrorAction SilentlyContinue
      Write-Output "Stopped PID $backendPid"
    } else {
      Write-Output 'No PID file. Attempting by port 8010...'
      $own = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 8010 } | Select-Object -First 1 -ExpandProperty OwningProcess
      if ($own) { Stop-Process -Id $own -Force -ErrorAction SilentlyContinue; Write-Output "Stopped process on port 8010 (PID $own)" }
    }
  }
  'status' {
    $backendPid = Get-BackendPid
    $alive = $false
    if ($backendPid) { $alive = (Get-Process -Id $backendPid -ErrorAction SilentlyContinue) -ne $null }
    $port = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 8010 }
    [PSCustomObject]@{
      ProcId  = $backendPid
      Running = $alive
      Log     = $log
      Port8010= [bool]$port
      URL     = 'http://localhost:8010/'
    } | Format-List
  }
  'logs' {
    if (!(Test-Path $log)) { Write-Output "Log not found: $log"; exit 1 }
    Get-Content $log -Wait
  }
}
