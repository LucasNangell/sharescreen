param(
    [Parameter(Mandatory = $true)]
    [int[]] $Ports,
    [string] $DebugLog = '',
    [string] $SessionId = 'b07cf8'
)

function Write-DebugLog {
    param([string] $HypothesisId, [string] $Message, [hashtable] $Data = @{})
    if (-not $DebugLog) { return }
    $entry = @{
        sessionId    = $SessionId
        hypothesisId = $HypothesisId
        location     = 'liberar-portas.ps1'
        message      = $Message
        data         = $Data
        timestamp    = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        runId        = 'pre-fix'
    } | ConvertTo-Json -Compress
    Add-Content -Path $DebugLog -Value $entry -Encoding UTF8
}

function Get-ListenersOnPort {
    param([int] $Port)
    $pids = @()
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        }
    } catch {
        Write-DebugLog 'B' 'Get-NetTCPConnection failed' @{ port = $Port; error = $_.Exception.Message }
    }
    if (-not $pids -or $pids.Count -eq 0) {
        $lines = netstat -ano | Select-String ":$Port\s" | Select-String -Pattern 'LISTENING|OUVINDO'
        foreach ($line in $lines) {
            $parts = ($line -replace '\s+', ' ').ToString().Trim().Split(' ')
            $pid = $parts[-1]
            if ($pid -match '^\d+$') { $pids += [int]$pid }
        }
        Write-DebugLog 'A' 'netstat fallback' @{ port = $Port; lines = @($lines) }
    }
    return @($pids | Select-Object -Unique)
}

function Stop-PortListeners {
    param([int] $Port)
    $killed = @()
    $failed = @()
    foreach ($procId in (Get-ListenersOnPort -Port $Port)) {
        if ($procId -le 0) { continue }
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            $name = if ($proc) { $proc.ProcessName } else { '?' }
            Stop-Process -Id $procId -Force -ErrorAction Stop
            $killed += @{ pid = $procId; name = $name }
            Write-Host "  Porta $Port — encerrado PID $procId ($name)"
        } catch {
            $failed += @{ pid = $procId; error = $_.Exception.Message }
            Write-Host "  [AVISO] Nao foi possivel encerrar PID $procId na porta $Port"
        }
    }
    Write-DebugLog 'C' 'kill attempt' @{ port = $Port; killed = $killed; failed = $failed }
    return @{ killed = $killed; failed = $failed }
}

$allKilled = @()
foreach ($port in $Ports) {
    $before = Get-ListenersOnPort -Port $port
    Write-DebugLog 'E' 'before kill' @{ port = $port; pids = @($before) }
    if ($before.Count -gt 0) {
        $result = Stop-PortListeners -Port $port
        $allKilled += $result.killed
    }
}

$deadline = (Get-Date).AddSeconds(12)
$stillBusy = @()
do {
    $stillBusy = @()
    foreach ($port in $Ports) {
        $left = Get-ListenersOnPort -Port $port
        if ($left.Count -gt 0) { $stillBusy += @{ port = $port; pids = @($left) } }
    }
    if ($stillBusy.Count -eq 0) { break }
    Start-Sleep -Milliseconds 400
} while ((Get-Date) -lt $deadline)

Write-DebugLog 'D' 'after wait' @{ stillBusy = $stillBusy; killed = $allKilled }

if ($stillBusy.Count -gt 0) {
    Write-Host "[ERRO] Portas ainda em uso:"
    foreach ($item in $stillBusy) {
        Write-Host "  Porta $($item.port): PID(s) $($item.pids -join ', ')"
    }
    exit 1
}

Write-Host "[OK] Portas livres: $($Ports -join ', ')"
exit 0
