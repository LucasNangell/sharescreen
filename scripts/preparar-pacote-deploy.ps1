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

Write-Host '=== ShareScreen — preparar pacote para servidor ===' -ForegroundColor Cyan

Write-Host '[1/4] npm install (baixa/compila mediasoup-worker neste PC)...'
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install falhou' }

$worker = Join-Path $root 'node_modules\mediasoup\worker\out\Release\mediasoup-worker.exe'
Require-File $worker 'mediasoup-worker.exe'

Write-Host '[2/4] Certificado producao (10.1.1.73)...'
npm run cert:prod
if ($LASTEXITCODE -ne 0) { throw 'cert:prod falhou' }

Write-Host '[3/4] Build frontend producao...'
npm run build:prod
if ($LASTEXITCODE -ne 0) { throw 'build:prod falhou' }

Require-File (Join-Path $root 'public\host\app.bundle.js') 'host bundle'
Require-File (Join-Path $root 'public\client\app.bundle.js') 'client bundle'
Require-File (Join-Path $root 'certs\server.crt') 'certificado'

# Remove lixo de compilacao do mediasoup (mantem so o .exe)
$buildDir = Join-Path $root 'node_modules\mediasoup\worker\out\Release\build'
if (Test-Path $buildDir) {
    Write-Host 'Limpando artefatos de compilacao do mediasoup...'
    Remove-Item $buildDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host '[4/4] Montando pasta pacote-servidor...'
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
New-Item -ItemType Directory -Path $dest | Out-Null

$itens = @(
    'server',
    'config',
    'public',
    'certs',
    'scripts',
    'node_modules',
    'nginx',
    'package.json',
    'package-lock.json',
    'start-producao.bat',
    'verificar-producao.bat',
    'DEPLOY-PRODUCAO.md',
    'DEPLOY-COPIAR.txt'
)

foreach ($item in $itens) {
    $src = Join-Path $root $item
    if (-not (Test-Path $src)) {
        Write-Warning "Ignorado (nao existe): $item"
        continue
    }
    Copy-Item $src -Destination (Join-Path $dest $item) -Recurse -Force
}

# Modulos usados pelo Node no servidor (import ESM, fora do bundle do browser)
$serverSharedModules = @(
    'src\shared\recording-filename.js',
    'src\shared\http-signaling-wire.js'
)
$destSrcShared = Join-Path $dest 'src\shared'
New-Item -ItemType Directory -Path $destSrcShared -Force | Out-Null
foreach ($rel in $serverSharedModules) {
    $srcMod = Join-Path $root $rel
    Require-File $srcMod $rel
    Copy-Item $srcMod -Destination $destSrcShared -Force
}

# Nao copiar sourcemaps de producao
Get-ChildItem (Join-Path $dest 'public') -Recurse -Filter '*.map' -ErrorAction SilentlyContinue |
    Remove-Item -Force

$adminPublic = Join-Path $dest 'public\admin'
if (Test-Path $adminPublic) { Remove-Item $adminPublic -Recurse -Force }

$dataSrc = Join-Path $root 'data'
if (Test-Path $dataSrc) {
    Copy-Item $dataSrc -Destination (Join-Path $dest 'data') -Recurse -Force
}

$usersJson = Join-Path $root 'users.json'
if (Test-Path $usersJson) {
    Copy-Item $usersJson -Destination $dest -Force
}

$readme = @"
PACOTE PRONTO PARA O SERVIDOR
=============================

Copie TODO o conteudo desta pasta para:
  C:\Sistemas CGraf\Screen Share

No servidor (so precisa Node.js 18+ instalado):
  1. verificar-producao.bat
  2. start-producao.bat

Nao execute npm install no servidor.
"@

Set-Content -Path (Join-Path $dest 'LEIA-ME-SERVIDOR.txt') -Value $readme -Encoding UTF8

Write-Host ''
Write-Host '=== Pacote criado ===' -ForegroundColor Green
Write-Host "Pasta: $dest"
Write-Host 'Copie o conteudo para C:\Sistemas CGraf\Screen Share no cgrafsysvm'
Write-Host ''
