# Monta a pasta "pacote-servidor" pronta para copiar ao cgrafsysvm (sem npm install la).
# Execute no PC de desenvolvimento:  preparar-deploy.bat

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dest = Join-Path $root 'pacote-servidor'

Set-Location $root

function Require-File($path, $label) {
    if (-not (Test-Path $path)) {
        throw "Arquivo obrigatorio ausente: $label ($path)"
    }
}

function File-Sha256($path) {
    return (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLowerInvariant()
}

Write-Host '=== ShareScreen — preparar pacote para servidor ===' -ForegroundColor Cyan

Write-Host '[1/5] npm install (baixa/compila mediasoup-worker neste PC)...'
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install falhou' }

$worker = Join-Path $root 'node_modules\mediasoup\worker\out\Release\mediasoup-worker.exe'
Require-File $worker 'mediasoup-worker.exe'

Write-Host '[2/5] Certificado producao (10.1.1.73)...'
npm run cert:prod
if ($LASTEXITCODE -ne 0) { throw 'cert:prod falhou' }

Write-Host '[3/5] Build frontend producao...'
npm run build:prod
if ($LASTEXITCODE -ne 0) { throw 'build:prod falhou' }

Require-File (Join-Path $root 'public\host\app.bundle.js') 'host bundle'
Require-File (Join-Path $root 'public\client\app.bundle.js') 'client bundle'
Require-File (Join-Path $root 'public\shared\build-id.json') 'build-id.json'
Require-File (Join-Path $root 'certs\server.crt') 'certificado'

$buildDir = Join-Path $root 'node_modules\mediasoup\worker\out\Release\build'
if (Test-Path $buildDir) {
    Write-Host 'Limpando artefatos de compilacao do mediasoup...'
    Remove-Item $buildDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host '[4/5] Montando pasta pacote-servidor...'
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Path $dest | Out-Null

$itens = @(
    'server',
    'config',
    'public',
    'certs',
    'scripts',
    'node_modules',
    'package.json',
    'package-lock.json',
    'start-producao.bat',
    'verificar-producao.bat'
)

foreach ($item in $itens) {
    $src = Join-Path $root $item
    if (-not (Test-Path $src)) {
        Write-Warning "Ignorado (nao existe): $item"
        continue
    }
    Copy-Item $src -Destination (Join-Path $dest $item) -Recurse -Force
}

# Modulos ESM usados pelo Node no servidor (fora do bundle do browser)
$destSrcShared = Join-Path $dest 'src\shared'
New-Item -ItemType Directory -Path $destSrcShared -Force | Out-Null
$sharedServerModules = @('recording-filename.js')
foreach ($mod in $sharedServerModules) {
    $srcMod = Join-Path $root "src\shared\$mod"
    Require-File $srcMod "src/shared/$mod"
    Copy-Item $srcMod -Destination (Join-Path $destSrcShared $mod) -Force
}

Get-ChildItem (Join-Path $dest 'public') -Recurse -Filter '*.map' -ErrorAction SilentlyContinue |
    Remove-Item -Force

$adminPublic = Join-Path $dest 'public\admin'
if (Test-Path $adminPublic) { Remove-Item $adminPublic -Recurse -Force }

Write-Host '[5/5] Gerando MANIFEST.json...'
$buildIdJson = Get-Content (Join-Path $root 'public\shared\build-id.json') -Raw | ConvertFrom-Json
$manifest = @{
    buildId = $buildIdJson.buildId
    builtAt = $buildIdJson.builtAt
    packagedAt = (Get-Date).ToUniversalTime().ToString('o')
    files = @{
        'public/client/app.bundle.js' = (File-Sha256 (Join-Path $root 'public\client\app.bundle.js'))
        'public/host/app.bundle.js' = (File-Sha256 (Join-Path $root 'public\host\app.bundle.js'))
        'server/signaling.js' = (File-Sha256 (Join-Path $root 'server\signaling.js'))
        'server/room-manager.js' = (File-Sha256 (Join-Path $root 'server\room-manager.js'))
    }
    features = @{
        roomState = $true
        midiaPronta = $true
    }
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $dest 'MANIFEST.json') -Encoding UTF8

$readme = @"
PACOTE PRONTO PARA O SERVIDOR
=============================

Copie TODO o conteudo desta pasta para:
  C:\Sistemas CGraf\Screen Share

No servidor (so precisa Node.js 18+ instalado):
  1. verificar-producao.bat
  2. start-producao.bat

Nao execute npm install no servidor.
A pasta data\ do servidor NAO e sobrescrita pelo deploy (robocopy /XD data).
"@
Set-Content -Path (Join-Path $dest 'LEIA-ME-SERVIDOR.txt') -Value $readme -Encoding UTF8

Write-Host ''
Write-Host '=== Pacote criado ===' -ForegroundColor Green
Write-Host "Pasta: $dest"
Write-Host "Build ID: $($buildIdJson.buildId)"
Write-Host ''
