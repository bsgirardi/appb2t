#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
$global:b2tBuildFixture = Join-Path ([IO.Path]::GetTempPath()) ('b2t-build-test-' + [guid]::NewGuid().ToString('N'))
$global:b2tBuildCalls = [Collections.Generic.List[string]]::new()
$global:b2tBuildCase = 'success'
$global:b2tBuildCommit = 'b' * 40
[void](New-Item -ItemType Directory "$global:b2tBuildFixture/source" -Force)
Set-Content "$global:b2tBuildFixture/source/package.json" '{"version":"1.21.0"}'
Set-Content "$global:b2tBuildFixture/source/compose.production.yaml" 'name: appb2t'
function git {
    $global:LASTEXITCODE = 0
    if ($args -contains '--show-toplevel') { return "$global:b2tBuildFixture/source" }
    if ($args -contains 'archive') {
        $output = ($args | Where-Object { $_ -like '--output=*' }) -replace '^--output=', ''
        & tar -cf $output -C "$global:b2tBuildFixture/source" .
    }
}
function docker {
    $global:LASTEXITCODE = 0
    $global:b2tBuildCalls.Add(($args -join ' '))
    if ($args -contains '.RepoDigests}}') { throw 'Formato inesperado.' }
    if ($args[0] -eq 'build' -and $args -contains 'verify' -and $global:b2tBuildCase -eq 'verify-failure') { $global:LASTEXITCODE=1; return }
    if ($args -contains '{{json .RepoDigests}}') { return ('["node@sha256:' + ('a' * 64) + '"]') }
    if ($args[0] -eq 'image') {
        return (@(@{ Id = 'sha256:' + ('a' * 64); Size = 1024; Config = @{ Labels = @{ 'org.opencontainers.image.revision' = $global:b2tBuildCommit } } }) | ConvertTo-Json -Depth 8 -AsArray)
    }
    if ($args[0] -eq 'save') { [IO.File]::WriteAllText($args[2], 'linux image fixture') }
}
try {
    foreach ($buildId in @('first', 'second')) {
        & "$PSScriptRoot/../../scripts/distribution/build.ps1" -Commit $global:b2tBuildCommit -BuildId $buildId -OutputDirectory "$global:b2tBuildFixture/$buildId"
        $m = Get-Content "$global:b2tBuildFixture/$buildId/manifest.json" -Raw | ConvertFrom-Json
        if ($m.release -ne '1.21.0') { throw 'Release deve usar somente a versao.' }
        if ($m.images.app.tag -notlike "*-$buildId") { throw 'Reconstrucao sem identidade propria.' }
        if ($m.files.Count -ne 2 -or $m.baseReference -notmatch '@sha256:') { throw 'Manifesto incompleto.' }
        $stream = [IO.File]::OpenRead("$global:b2tBuildFixture/$buildId/images.tar.gz")
        $gzip = [IO.Compression.GZipStream]::new($stream, [IO.Compression.CompressionMode]::Decompress)
        $reader = [IO.StreamReader]::new($gzip)
        try { if ($reader.ReadToEnd() -ne 'linux image fixture') { throw 'Arquivo binario corrompido.' } } finally { $reader.Dispose(); $gzip.Dispose(); $stream.Dispose() }
    }
    $global:b2tBuildCase = 'verify-failure'; $global:b2tBuildCalls.Clear()
    $failed = $false
    try { & "$PSScriptRoot/../../scripts/distribution/build.ps1" -Commit $global:b2tBuildCommit -BuildId failed -OutputDirectory "$global:b2tBuildFixture/failed" }
    catch { $failed = $true; if ($_.Exception.Message -notmatch 'Falha em docker') { throw } }
    if (-not $failed -or @($global:b2tBuildCalls | Where-Object { $_ -like 'save *' }).Count) { throw 'Exportou apos falha de verificacao.' }
    Write-Host 'PASS: pacote validado, gzip intacto, reconstrucoes distintas, verificacao obrigatoria.'
} finally {
    $target = [IO.Path]::GetFullPath($global:b2tBuildFixture)
    if ($target.StartsWith([IO.Path]::GetTempPath(), [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $target -Leaf) -like 'b2t-build-test-*') { Remove-Item -LiteralPath $target -Recurse -Force }
}
