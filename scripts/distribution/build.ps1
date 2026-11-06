#Requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Commit,
    [Parameter(Mandatory)][string]$OutputDirectory,
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$')][string]$BuildId = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'),
    [ValidateSet('linux/amd64', 'linux/arm64')][string]$Platform = 'linux/amd64',
    [ValidatePattern('^node:22-bookworm-slim(@sha256:[a-f0-9]{64})?$')][string]$BaseReference = 'node:22-bookworm-slim',
    [switch]$RefreshSystemPackages
)
. "$PSScriptRoot/common.ps1"
$repo = (Invoke-Checked git @('-C', "$PSScriptRoot/../..", 'rev-parse', '--show-toplevel')).Trim()
$output = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $output) { throw 'O diretorio de entrega deve ser novo.' }
Invoke-Checked git @('-C', $repo, 'fetch', 'origin', 'main')
if ($Commit -notmatch '^[a-f0-9]{40}$') { throw 'Informe o commit completo de 40 caracteres.' }
Invoke-Checked git @('-C', $repo, 'merge-base', '--is-ancestor', $Commit, 'origin/main')
$taskTemp = Join-Path ([IO.Path]::GetTempPath()) ('b2t-build-' + [guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $taskTemp)
try {
    $source = Join-Path $taskTemp 'source'; [void](New-Item -ItemType Directory -Path $source)
    Invoke-Checked git @('-C', $repo, 'archive', '--format=tar', "--output=$taskTemp/source.tar", $Commit)
    Invoke-Checked tar @('-xf', "$taskTemp/source.tar", '-C', $source)
    $package = Get-Content -LiteralPath "$source/package.json" -Raw | ConvertFrom-Json
    $release = "app-v$($package.version)-$($Commit.Substring(0,12))-$BuildId"
    if ($release.Length -gt 128) { throw 'Identificador de entrega muito longo.' }
    # Refresh only the builder. Production receives the complete saved image.
    Invoke-Checked docker @('pull', '--platform', $Platform, $BaseReference)
    $digests = (Invoke-Checked docker @('image', 'inspect', '--format', '{{json .RepoDigests}}', $BaseReference)) | ConvertFrom-Json
    $digest = @($digests | Where-Object { $_ -match '(^|/)node@sha256:[a-f0-9]{64}$' })[0]
    if (-not $digest) { throw 'Digest da base nao encontrado.' }
    $pinnedBase = 'node:22-bookworm-slim@' + ($digest -split '@')[1]
    $argsBase = @('build', '--platform', $Platform, '--build-arg', "NODE_BASE=$pinnedBase", '--build-arg', "APP_REVISION=$Commit")
    if ($RefreshSystemPackages) { $argsBase += '--no-cache' }
    # Verification is local and uses synthetic configuration; no production database.
    Invoke-Checked docker ($argsBase + @('--target', 'verify', $source))
    $images = @{}
    foreach ($entry in @(@('tools', 'tools'), @('app', 'runtime'))) {
        $tag = "appb2t-$($entry[0]):$release"
        Invoke-Checked docker ($argsBase + @('--target', $entry[1], '-t', $tag, $source))
        $inspect = ((Invoke-Checked docker @('image', 'inspect', $tag)) -join "`n") | ConvertFrom-Json
        if ($inspect[0].Config.Labels.'org.opencontainers.image.revision' -ne $Commit) { throw 'Revisao da imagem incorreta.' }
        $images[$entry[0]] = @{ tag = $tag; imageId = $inspect[0].Id; sizeBytes = $inspect[0].Size }
    }
    [void](New-Item -ItemType Directory -Path $output)
    Invoke-Checked docker @('save', '--output', "$taskTemp/images.tar", $images.app.tag, $images.tools.tag)
    $inputStream = [IO.File]::OpenRead("$taskTemp/images.tar")
    $outputStream = [IO.File]::Create("$output/images.tar.gz")
    $gzip = [IO.Compression.GZipStream]::new($outputStream, [IO.Compression.CompressionLevel]::Fastest)
    try { $inputStream.CopyTo($gzip) } finally { $gzip.Dispose(); $outputStream.Dispose(); $inputStream.Dispose() }
    Copy-Item -LiteralPath "$source/compose.production.yaml" -Destination "$output/compose.production.yaml"
    $metadata = @{ schemaVersion = 1; release = $release; appVersion = $package.version; sourceRepository = 'bsgirardi/appb2t'; sourceCommit = $Commit; platform = $Platform; baseReference = $pinnedBase; images = $images }
    $metadata | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath "$output/metadata.json" -Encoding utf8NoBOM
    Invoke-Checked node @("$PSScriptRoot/manifest.mjs", 'create', $output)
    Remove-Item -LiteralPath "$output/metadata.json"
    Write-Host "Entrega pronta: $output ($release). Ainda nao publicada."
} finally {
    $resolvedTemp = [IO.Path]::GetFullPath($taskTemp)
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolvedTemp -Leaf) -like 'b2t-build-*') {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
