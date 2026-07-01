# Copia certificado leg para pasta local do eturnal (legivel pelo servico Windows)
# Executar como Administrador no cgrafsysvm.
# Fase 2 TURN: o cert em C:\nginx\conf\ssl\cgrafsysvm-leg-chain.crt deve incluir SAN
# turn.cgrafsysvm.camara.leg.br (solicitar renovacao a infra antes de ativar-turn-fase2.bat).

$ErrorActionPreference = 'Stop'

$eturnalHome = 'C:\Program Files\eturnal'
$sslDir = Join-Path $eturnalHome 'etc\ssl'
$srcChain = 'C:\nginx\conf\ssl\cgrafsysvm-leg-chain.crt'
$srcKey = 'C:\nginx\conf\ssl\cgrafsysvm-leg.key'

if (-not (Test-Path $srcChain)) { throw "Chain ausente: $srcChain" }
if (-not (Test-Path $srcKey)) { throw "Key ausente: $srcKey" }

New-Item -ItemType Directory -Force -Path $sslDir | Out-Null

Copy-Item $srcChain (Join-Path $sslDir 'cgrafsysvm-leg-chain.crt') -Force
Copy-Item $srcKey (Join-Path $sslDir 'cgrafsysvm-leg.key') -Force

# Permissao de leitura para SYSTEM / Administrators / Users (servico eturnal)
icacls $sslDir /inheritance:r /T /C | Out-Null
icacls $sslDir /grant 'SYSTEM:(R)' 'Administrators:(F)' 'Users:(R)' /T /C | Out-Null

Write-Host "[OK] TLS copiado para $sslDir"
Write-Host "Reinicie eturnal: cd `"$eturnalHome\bin`" && eturnal.cmd restart"
