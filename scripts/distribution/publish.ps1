#Requires -Version 7.0
[CmdletBinding()]
param([Parameter(Mandatory)][string]$PackageDirectory, [Parameter(Mandatory)][string]$Repository)
. "$PSScriptRoot/common.ps1"
Invoke-Checked node @("$PSScriptRoot/manifest.mjs", 'validate', $PackageDirectory) | Out-Host
$m = Get-Content -LiteralPath (Join-Path $PackageDirectory 'manifest.json') -Raw | ConvertFrom-Json
Assert-PrivateRepository $Repository
$tags = @(Invoke-Checked gh @('api', "repos/$Repository/releases", '--paginate', '--jq', '.[].tag_name'))
if ($tags -contains $m.release) { throw 'Entrega existente: nao substituir assets ou tags.' }
$files = @('manifest.json', 'images.tar.gz', 'compose.production.yaml')
foreach ($name in $files) {
    if ((Get-Item -LiteralPath (Join-Path $PackageDirectory $name)).Length -ge 2GB) { throw 'Asset excede o limite de 2 GiB.' }
}
# This creates a tag only in the distribution repository; never in the source repo.
Invoke-Checked gh @('release', 'create', $m.release, '--repo', $Repository, '--draft', '--title', "APP B2T $($m.appVersion)", '--notes', "Entrega $($m.release). Codigo: $($m.sourceCommit). Plataforma: $($m.platform).")
Invoke-Checked gh (@('release', 'upload', $m.release, '--repo', $Repository) + @($files | ForEach-Object { Join-Path $PackageDirectory $_ }))
# Unpublished drafts may have no Git tag yet. Resolve the numeric release ID
# through the authenticated listing, then verify assets through that stable ID.
$idQuery = '.[] | select(.tag_name == "' + $m.release + '") | .id'
$releaseIds = @(Invoke-Checked gh @('api', "repos/$Repository/releases", '--paginate', '--jq', $idQuery))
if ($releaseIds.Count -ne 1 -or [string]$releaseIds[0] -notmatch '^[1-9][0-9]*$') { throw 'Identificador do draft nao confirmado; mantido sem publicar.' }
$releaseId = [string]$releaseIds[0]
$assetsJson = Invoke-Checked gh @('api', "repos/$Repository/releases/$releaseId")
$assets = (($assetsJson -join "`n") | ConvertFrom-Json).assets
if (@($assets).Count -ne 3) { throw 'Draft incompleto; mantido sem publicar.' }
foreach ($name in $files) {
    $asset = @($assets | Where-Object name -CEQ $name)
    $path = Join-Path $PackageDirectory $name
    $sha = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($asset.Count -ne 1 -or $asset[0].size -ne (Get-Item -LiteralPath $path).Length -or $asset[0].digest -cne "sha256:$sha") {
        throw 'Asset nao confirmado; draft mantido sem publicar.'
    }
}
Invoke-Checked gh @('release', 'edit', $m.release, '--repo', $Repository, '--draft=false')
Write-Host "Entrega publicada em $Repository. Nenhum servidor foi alterado."
