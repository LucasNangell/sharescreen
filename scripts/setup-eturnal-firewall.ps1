# ShareScreen — regras firewall Windows para eturnal (interno, nao periodo NAT)
# Executar como Administrador no cgrafsysvm.

$ErrorActionPreference = 'SilentlyContinue'

$rules = @(
    @{
        Name     = 'ShareScreen eturnal TURNS 5349 TCP'
        Protocol = 'TCP'
        Port     = 5349
    },
    @{
        Name     = 'ShareScreen eturnal STUN 3478 UDP'
        Protocol = 'UDP'
        Port     = 3478
    },
    @{
        Name     = 'ShareScreen eturnal STUN 3478 TCP'
        Protocol = 'TCP'
        Port     = 3478
    },
    @{
        Name     = 'ShareScreen eturnal relay 49160-49252 UDP'
        Protocol = 'UDP'
        Port     = '49160-49252'
    }
)

foreach ($r in $rules) {
    New-NetFirewallRule `
        -DisplayName $r.Name `
        -Direction Inbound `
        -Action Allow `
        -Protocol $r.Protocol `
        -LocalPort $r.Port `
        -Profile Any | Out-Null
    Write-Host "[OK] $($r.Name)"
}

Write-Host ""
Write-Host "Concluido. Portas 5349/3478/relay sao internas; convidados externos usam TURNS:443."
