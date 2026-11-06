#Requires -Version 7.0
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Repository)
. "$PSScriptRoot/common.ps1"
Assert-PrivateRepository $Repository
$sourceRepo = (Invoke-Checked git @('-C', "$PSScriptRoot/../..", 'rev-parse', '--show-toplevel')).Trim()
if (@(Invoke-Checked git @('-C', $sourceRepo, 'status', '--porcelain')).Count) { throw 'Publique somente scripts revisados e commitados em checkout limpo.' }
$sourceCommit = (Invoke-Checked git @('-C', $sourceRepo, 'rev-parse', 'HEAD')).Trim()
$syncTemp = Join-Path ([IO.Path]::GetTempPath()) ('b2t-updater-' + [guid]::NewGuid().ToString('N'))
try {
    Invoke-Checked gh @('repo', 'clone', $Repository, $syncTemp)
    $dest = Join-Path $syncTemp 'scripts/distribution'
    [void](New-Item -ItemType Directory -Path $dest -Force)
    foreach ($file in @('update.sh', 'deploy.sh', 'validate-manifest.jq')) { Copy-Item -LiteralPath "$PSScriptRoot/$file" -Destination $dest }
    Copy-Item -LiteralPath "$sourceRepo/docs/DISTRIBUICAO_IMAGENS.md" -Destination "$syncTemp/README.md"
    Copy-Item -LiteralPath "$sourceRepo/.gitattributes" -Destination "$syncTemp/.gitattributes"
    Set-Content -LiteralPath "$syncTemp/SOURCE_COMMIT" -Value $sourceCommit -Encoding utf8NoBOM
    Invoke-Checked git @('-C', $syncTemp, 'add', 'scripts', 'README.md', 'SOURCE_COMMIT', '.gitattributes')
    & git -C $syncTemp diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Write-Host 'Atualizador ja sincronizado.'; return }
    if ($LASTEXITCODE -ne 1) { throw 'Falha ao conferir alteracoes.' }
    Invoke-Checked git @('-C', $syncTemp, 'commit', '-m', "Atualizador revisado do APP B2T $sourceCommit")
    Invoke-Checked git @('-C', $syncTemp, 'push', 'origin', 'HEAD:main')
    Write-Host 'Scripts publicados. A instalacao no servidor continua manual e fixada em commit.'
} finally {
    $resolved = [IO.Path]::GetFullPath($syncTemp)
    if ($resolved.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()), [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolved -Leaf) -like 'b2t-updater-*' -and (Test-Path -LiteralPath $resolved)) {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
