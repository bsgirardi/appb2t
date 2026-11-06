#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
$global:b2tTestCase = 'public'
$global:b2tTestCalls = [Collections.Generic.List[string]]::new()
if (-not (Test-Path "$PSScriptRoot/../../scripts/distribution/publish.ps1")) { throw 'Publicador ausente.' }
function gh {
    $global:b2tTestCalls.Add(($args -join ' '))
    $global:LASTEXITCODE = 0
    if ($args[0] -eq 'repo') { return (@{ isPrivate = ($global:b2tTestCase -ne 'public'); nameWithOwner = 'owner/delivery' } | ConvertTo-Json) }
    if ($args[0] -eq 'api' -and $args[1] -like '*/releases/tags/*') {
        $assets = @('manifest.json', 'images.tar.gz', 'compose.production.yaml') | ForEach-Object {
            @{ name = $_; size = (Get-Item -LiteralPath "$global:b2tTestPackage/$_").Length; digest = 'sha256:' + (Get-FileHash "$global:b2tTestPackage/$_").Hash.ToLowerInvariant() }
        }
        if ($global:b2tTestCase -eq 'incomplete') { $assets = @($assets)[0..1] }
        return (@{ assets = @($assets) } | ConvertTo-Json -Depth 5)
    }
    if ($args[0] -eq 'api') { if ($global:b2tTestCase -eq 'existing') { return 'app-v1.0.0-aaaaaaaaaaaa-test' }; return }
}
function node { $global:LASTEXITCODE = 0 }
$taskTest = Join-Path ([IO.Path]::GetTempPath()) ('b2t-publish-test-' + [guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory $taskTest)
$global:b2tTestPackage = $taskTest
@{ release = 'app-v1.0.0-aaaaaaaaaaaa-test'; appVersion = '1.0.0'; sourceCommit = ('a' * 40); platform = 'linux/amd64' } | ConvertTo-Json | Set-Content "$taskTest/manifest.json"
Set-Content "$taskTest/images.tar.gz" 'image'
Set-Content "$taskTest/compose.production.yaml" 'compose'
try {
    foreach ($global:b2tTestCase in @('public', 'existing', 'incomplete', 'success')) {
        $global:b2tTestCalls.Clear(); $failed = $false
        try { & "$PSScriptRoot/../../scripts/distribution/publish.ps1" -Repository owner/delivery -PackageDirectory $taskTest }
        catch { $failed = $true; if ($_.Exception.Message -notmatch 'privado|existente|incompleto') { throw } }
        if ($global:b2tTestCase -eq 'success') {
            if ($failed -or -not @($global:b2tTestCalls | Where-Object { $_ -match 'release edit.*--draft=false' }).Count) { throw 'Nao publicou entrega completa.' }
        } else {
            if (-not $failed) { throw "Deveria rejeitar $global:b2tTestCase" }
            if (@($global:b2tTestCalls | Where-Object { $_ -match 'release edit' }).Count) { throw 'Publicou draft incompleto.' }
        }
        if ($global:b2tTestCase -in @('public', 'existing') -and @($global:b2tTestCalls | Where-Object { $_ -match 'release (create|upload|edit)' }).Count) { throw 'Publicou antes das verificacoes.' }
    }
    Write-Host 'PASS: publico/existente rejeitados; draft incompleto preservado; entrega completa publicada.'
} finally { Get-ChildItem -LiteralPath $taskTest -File | Remove-Item; Remove-Item -LiteralPath $taskTest }
