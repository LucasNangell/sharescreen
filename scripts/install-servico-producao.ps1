# Instala ou reconfigura o servico Windows ShareScreenLAN via NSSM ja presente no servidor.
# Execute no cgrafsysvm como Administrador: install-servico-producao.bat
# Nao chama liberar-portas.ps1 e nao executa nada em outra maquina.

param(
    [string]$NssmPath = '',
    [string]$NodePath = ''
)

$ErrorActionPreference = 'Stop'
$serviceName = 'ShareScreenLAN'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $root 'scripts\env-producao.cmd'
$logsDir = Join-Path $root 'logs'

Set-Location $root

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-ToolPath {
    param(
        [string]$Name,
        [string]$Explicit,
        [string[]]$Fallbacks
    )
    if ($Explicit) {
        if (-not (Test-Path -LiteralPath $Explicit)) {
            throw "$Name nao encontrado: $Explicit"
        }
        return (Resolve-Path -LiteralPath $Explicit).Path
    }
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) {
        return $cmd.Source
    }
    foreach ($candidate in $Fallbacks) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }
    $typed = Read-Host "Informe o caminho absoluto de $Name.exe (PATH vazio nesta sessao)"
    if (-not $typed -or -not (Test-Path -LiteralPath $typed)) {
        throw "$Name nao encontrado. Instale ou informe o caminho absoluto."
    }
    return (Resolve-Path -LiteralPath $typed).Path
}

function Invoke-Nssm {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Nssm,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$Optional
    )
    & $Nssm @Arguments
    if ($LASTEXITCODE -eq 0) { return }
    $detail = "nssm $($Arguments -join ' ') falhou com codigo $LASTEXITCODE"
    if ($Optional) {
        Write-Host "[AVISO] $detail (ignorado nesta versao do NSSM)"
        return
    }
    throw $detail
}

function Start-ShareScreenService {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Nssm,
        [int]$TimeoutSeconds = 45
    )
    Write-Host "Iniciando $serviceName..."
    $already = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($already -and $already.Status -eq 'Running') {
        Write-Host 'Servico ja estava em RUNNING.'
        & $Nssm status $serviceName | Out-Host
        return
    }
    # nssm start devolve 1 com SERVICE_START_PENDING enquanto o Node/mediasoup ainda sobe.
    & $Nssm start $serviceName | Out-Host
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        Start-Sleep -Seconds 2
        $svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
        if (-not $svc) {
            throw "Servico $serviceName desapareceu apos o start."
        }
        Write-Host ("  estado: {0}" -f $svc.Status)
        if ($svc.Status -eq 'Running') {
            & $Nssm status $serviceName | Out-Host
            Write-Host 'Servico em RUNNING. Diagnostico: https://10.1.1.73:3443/api/diagnostico'
            return
        }
        if ($svc.Status -eq 'Stopped') {
            throw "Servico $serviceName parou apos o start. Veja logs\service-stderr.log e o Event Viewer (Application)."
        }
    } while ((Get-Date) -lt $deadline)

    $svc = Get-Service -Name $serviceName
    throw "Timeout: $serviceName ficou em $($svc.Status). Veja logs\service-stderr.log e o Event Viewer (Application)."
}

function Read-ProdEnv {
    param([string]$Path)
    $vars = [ordered]@{}
    foreach ($raw in Get-Content -LiteralPath $Path -Encoding UTF8) {
        $line = $raw.Trim()
        if (-not $line) { continue }
        $upper = $line.ToUpperInvariant()
        if ($upper.StartsWith('REM ') -or $upper.StartsWith('::') -or $upper.StartsWith('@ECHO')) { continue }
        if (-not $upper.StartsWith('SET ')) { continue }
        $rest = $line.Substring(4).Trim()
        if ($rest.StartsWith('"') -and $rest.EndsWith('"') -and $rest.Length -ge 2) {
            $rest = $rest.Substring(1, $rest.Length - 2)
        }
        $eq = $rest.IndexOf('=')
        if ($eq -lt 1) { continue }
        $vars[$rest.Substring(0, $eq)] = $rest.Substring($eq + 1)
    }
    return $vars
}

function Test-PortInUse {
    param([int]$Port)
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) { return $true }
    } catch {
        # fallback abaixo
    }
    $pattern = ":$Port\s"
    $lines = netstat -ano | Select-String $pattern | Select-String -Pattern 'LISTENING|OUVINDO'
    return [bool]$lines
}

function Require-File {
    param([string]$RelPath, [string]$Label)
    $full = Join-Path $root $RelPath
    if (-not (Test-Path -LiteralPath $full)) {
        throw "Arquivo obrigatorio ausente: $Label ($full)"
    }
}

if (-not (Test-Administrator)) {
    throw 'Execute este instalador como Administrador no servidor cgrafsysvm.'
}

Write-Host '=== ShareScreen - instalar servico NSSM ===' -ForegroundColor Cyan
Write-Host "Pasta do app: $root"

$nssm = Resolve-ToolPath -Name 'nssm' -Explicit $NssmPath -Fallbacks @(
    'C:\nssm\nssm.exe',
    'C:\nssm\win64\nssm.exe',
    'C:\Program Files\nssm\nssm.exe',
    'C:\Program Files\nssm\win64\nssm.exe',
    'C:\Windows\System32\nssm.exe'
)
$nodeExe = Resolve-ToolPath -Name 'node' -Explicit $NodePath -Fallbacks @(
    'C:\Program Files\nodejs\node.exe',
    'C:\Program Files (x86)\nodejs\node.exe'
)

Write-Host "NSSM: $nssm"
Write-Host "Node: $nodeExe"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "scripts\env-producao.cmd ausente ($envFile)"
}

Require-File 'server\index.js' 'server/index.js'
Require-File 'certs\server.crt' 'certs/server.crt'
Require-File 'public\host\app.bundle.js' 'host bundle'
Require-File 'node_modules\mediasoup\worker\out\Release\mediasoup-worker.exe' 'mediasoup-worker.exe'

$existing = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
$portBusy = Test-PortInUse -Port 3443
if ($portBusy -and (-not $existing -or $existing.Status -ne 'Running')) {
    throw "Porta 3443 em uso. Feche start-producao.bat (ou o Node avulso) antes de instalar o servico."
}

if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

$prodEnv = Read-ProdEnv -Path $envFile
$envArgs = @()
foreach ($key in $prodEnv.Keys) {
    $value = [string]$prodEnv[$key]
    if ([string]::IsNullOrWhiteSpace($value)) { continue }
    $envArgs += "$key=$value"
}
if ($envArgs.Count -eq 0) {
    throw 'Nenhuma variavel de ambiente lida de scripts\env-producao.cmd'
}

Write-Host ''
Write-Host 'Variaveis que serao aplicadas ao servico:'
foreach ($entry in $envArgs) {
    if ($entry -match '^(TURN_PASSWORD|TURN_CREDENTIAL)=') {
        Write-Host '  TURN_PASSWORD=***'
    } else {
        Write-Host "  $entry"
    }
}

Write-Host ''
Write-Host 'Conta do servico: use a mesma conta de dominio que hoje abre start-producao.bat.'
Write-Host 'LocalSystem NAO e o padrao - pode falhar em UNC de gravacao e no DB do agente.'
$account = Read-Host 'Conta (DOMINIO\usuario). Vazio cancela. LocalSystem exige confirmacao extra'
if ([string]::IsNullOrWhiteSpace($account)) {
    throw 'Instalacao cancelada: conta do servico e obrigatoria.'
}

$useLocalSystem = $account -eq 'LocalSystem' -or $account -eq 'NT AUTHORITY\SYSTEM'
if ($useLocalSystem) {
    $confirm = Read-Host 'LocalSystem pode quebrar gravacao UNC e agente. Digite CONFIRMAR para continuar'
    if ($confirm -ne 'CONFIRMAR') {
        throw 'Instalacao cancelada.'
    }
} elseif ($account -notmatch '\\') {
    throw 'Informe a conta no formato DOMINIO\usuario (ou LocalSystem apos CONFIRMAR).'
}

if (-not $existing) {
    Write-Host "Instalando servico $serviceName..."
    Invoke-Nssm -Nssm $nssm -Arguments @('install', $serviceName, $nodeExe, 'server\index.js')
} else {
    Write-Host "Servico $serviceName ja existe - reconfigurando."
}

Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'Application', $nodeExe)
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppParameters', 'server\index.js')
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppDirectory', $root)
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'DisplayName', 'ShareScreen LAN')
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'Description', 'Servidor ShareScreen LAN (Node + mediasoup)')
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'Start', 'SERVICE_DELAYED_AUTO_START')
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'DependOnService', 'Tcpip', 'LanmanWorkstation')
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppStdout', (Join-Path $logsDir 'service-stdout.log'))
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppStderr', (Join-Path $logsDir 'service-stderr.log'))
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppRotateFiles', '1') -Optional
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppRotateBytes', '10485760') -Optional
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppRotateOnline', '1') -Optional
# NSSM 2.24 nao tem AppKillProcessTree; no stop ele ja encerra o processo e os filhos (mediasoup-worker).
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppStopMethodConsole', '15000') -Optional
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppRestartDelay', '8000')
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppThrottle', '15000')
Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'AppExit', 'Default', 'Restart')

# REG_MULTI_SZ evita que o UNC com espaco vire duas variaveis no parse do nssm set.
$paramsKey = "HKLM:\SYSTEM\CurrentControlSet\Services\$serviceName\Parameters"
if (-not (Test-Path -LiteralPath $paramsKey)) {
    New-Item -Path $paramsKey -Force | Out-Null
}
New-ItemProperty -Path $paramsKey -Name AppEnvironmentExtra -Value ([string[]]$envArgs) -PropertyType MultiString -Force | Out-Null

if ($useLocalSystem) {
    Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'ObjectName', 'LocalSystem')
} else {
    $secure = Read-Host "Senha de $account" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
        if ([string]::IsNullOrEmpty($plain)) {
            throw 'Senha vazia nao e permitida para conta de dominio.'
        }
        Invoke-Nssm -Nssm $nssm -Arguments @('set', $serviceName, 'ObjectName', $account, $plain)
    } finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
}

Write-Host ''
Write-Host "Servico $serviceName configurado."
Write-Host 'Diagnostico apos subir: https://10.1.1.73:3443/api/diagnostico'
Write-Host 'Host: https://10.1.1.73:3443/host'
$startNow = Read-Host 'Iniciar o servico agora? (S/N)'
if ($startNow -match '^[sS]') {
    Start-ShareScreenService -Nssm $nssm
} else {
    Write-Host ('Servico instalado sem iniciar. Depois: nssm start ' + $serviceName)
}

Write-Host ''
Write-Host '[OK] Instalacao NSSM concluida.' -ForegroundColor Green
