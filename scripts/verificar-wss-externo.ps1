# Verifica WSS externo e alinhamento buildId (ShareScreen producao)
# Executar no cgrafsysvm ou de qualquer PC com acesso a cgrafsysvm.camara.leg.br
#
# Se OK no servidor mas falha em 4G: problema no perimetro/proxy corporativo (nao no origin).

param(
    [string]$BaseUrl = 'https://cgrafsysvm.camara.leg.br',
    [int]$WsTimeoutSec = 15
)

$ErrorActionPreference = 'Continue'
$fail = 0
$wsOk = $false

function Write-Tag {
    param(
        [string]$Tag,
        [string]$Message
    )
    Write-Host "[$Tag] $Message"
}

$hostName = ([Uri]$BaseUrl).Host

Write-Host '=== Verificacao WSS + buildId ==='
Write-Host "Base: $BaseUrl"
Write-Host ''

# --- DNS (comparar com celular 4G se IPs diferirem) ---
Write-Host '--- DNS ---'
try {
    $dns = [System.Net.Dns]::GetHostAddresses($hostName) |
        ForEach-Object { $_.IPAddressToString } |
        Sort-Object -Unique
    Write-Host "Host: $hostName"
    Write-Host "IPs:  $($dns -join ', ')"
    Write-Tag 'INFO' 'Se o IP no celular 4G for diferente, o trafego passa por proxy/WAF na borda.'
} catch {
    Write-Tag 'AVISO' "DNS: $($_.Exception.Message)"
}

Write-Host ''
Write-Host '--- GET /api/info ---'
try {
    $info = Invoke-RestMethod -Uri "$BaseUrl/api/info" -TimeoutSec 20 -UseBasicParsing
    $buildId = $info.buildId
    $turnEnabled = $info.turnEnabled
    Write-Host "buildId:     $buildId"
    Write-Host "turnEnabled: $turnEnabled"
    if (-not $buildId) {
        Write-Tag 'FALHA' 'buildId ausente na resposta'
        $fail++
    }
    if ($turnEnabled -ne $true) {
        Write-Tag 'AVISO' 'turnEnabled nao e true - relay externo pode falhar'
    }
} catch {
    Write-Tag 'FALHA' "/api/info: $($_.Exception.Message)"
    $fail++
    $buildId = $null
}

Write-Host ''
Write-Host '--- HTTP GET /ws com headers Upgrade (origin) ---'
try {
    $wsBytes = 1..16 | ForEach-Object { [byte](Get-Random -Maximum 256) }
    $wsKey = [Convert]::ToBase64String($wsBytes)
    $headers = @{
        Upgrade               = 'websocket'
        Connection            = 'Upgrade'
        'Sec-WebSocket-Key'   = $wsKey
        'Sec-WebSocket-Version' = '13'
    }
    $resp = Invoke-WebRequest -Uri "$BaseUrl/ws" -Method GET -Headers $headers -TimeoutSec 20 -UseBasicParsing
    $status = [int]$resp.StatusCode
    Write-Host "HTTP status: $status"
    if ($status -eq 101) {
        Write-Tag 'OK' 'Origin respondeu 101 Switching Protocols'
    } elseif ($status -ge 400 -and $status -lt 500) {
        Write-Tag 'OK' "Origin alcancavel ($status) - handshake WS rejeitado sem cliente completo e esperado"
    } else {
        Write-Tag 'AVISO' "Status inesperado: $status"
    }
} catch {
    $status = $null
    if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
    }
    if ($status -eq 101) {
        Write-Tag 'OK' 'Origin respondeu 101 Switching Protocols'
    } elseif ($status -eq 400 -or $status -eq 426) {
        Write-Tag 'OK' "Origin alcancavel (HTTP $status)"
    } elseif ($status -eq 502 -or $status -eq 504) {
        Write-Tag 'FALHA' "HTTP $status - NGINX nao alcanca Node em :3443"
        $fail++
    } elseif ($status -eq 403 -or $status -eq 404) {
        Write-Tag 'FALHA' "HTTP $status - rota /ws bloqueada ou inexistente neste caminho"
        $fail++
    } else {
        Write-Tag 'AVISO' "HTTP upgrade teste: $($_.Exception.Message)"
    }
}

Write-Host ''
Write-Host '--- WebSocket wss://.../ws ---'
$wsUri = ($BaseUrl -replace '^http', 'ws') + '/ws'
$cts = [System.Threading.CancellationTokenSource]::new()
$cts.CancelAfter([TimeSpan]::FromSeconds($WsTimeoutSec))
try {
    $ws = [System.Net.WebSockets.ClientWebSocket]::new()
    $connectTask = $ws.ConnectAsync([Uri]$wsUri, $cts.Token)
    $connectTask.Wait($cts.Token)
    if ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        Write-Tag 'OK' "WebSocket conectou: $wsUri"
        $wsOk = $true
        $ws.CloseAsync(
            [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
            'verificacao',
            [System.Threading.CancellationToken]::None
        ).Wait(5000) | Out-Null
    } else {
        Write-Tag 'FALHA' "WebSocket estado: $($ws.State)"
        $fail++
    }
} catch {
    Write-Tag 'FALHA' "WebSocket: $($_.Exception.Message)"
    if ($_.Exception.InnerException) {
        Write-Host "        $($_.Exception.InnerException.Message)"
    }
    $fail++
}

if ($buildId) {
    Write-Host ''
    Write-Host '--- Bundle buildId ---'
    Write-Tag 'INFO' "Confira app.bundle.js?v= coincide com: $buildId"
}

Write-Host ''
Write-Host '--- Diagnostico perimetro ---'
if ($wsOk) {
    Write-Tag 'INFO' 'WSS OK nesta maquina/rede.'
    Write-Tag 'INFO' 'Se o browser em 4G ainda falha: abra chamado infra (scripts/chamado-infra-wss.txt).'
    Write-Tag 'INFO' 'No celular: DevTools Network - filtro WS - veja status (502/403 = proxy; sem status = TLS na borda).'
} else {
    Write-Tag 'INFO' 'WSS falhou aqui: corrija origin (Node, NGINX /ws) antes de culpar o perimetro.'
}

Write-Host ''
if ($fail -eq 0) {
    Write-Tag 'OK' 'Verificacao concluida sem falhas criticas no origin.'
    exit 0
}

Write-Tag 'FALHA' "$fail problema(s) no origin."
exit 1
