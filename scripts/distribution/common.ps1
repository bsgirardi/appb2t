Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha em $Program (codigo $LASTEXITCODE)." }
}
function Assert-PrivateRepository {
    param([string]$Repository)
    if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw 'Repositorio invalido.' }
    $json = Invoke-Checked gh @('repo', 'view', $Repository, '--json', 'isPrivate,nameWithOwner')
    $repo = ($json -join "`n") | ConvertFrom-Json
    if (-not $repo.isPrivate -or $repo.nameWithOwner -ine $Repository) { throw 'O destino deve ser o repositorio privado informado.' }
}
