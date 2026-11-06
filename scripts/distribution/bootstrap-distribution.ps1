#Requires -Version 7.0
[CmdletBinding()]
param([string]$Repository = 'bsgirardi/appb2t-distribuicao')
. "$PSScriptRoot/common.ps1"
if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw 'Repositorio invalido.' }
# Explicit initialization, separate from build/publish. Existing repos are not overwritten.
Invoke-Checked gh @('repo', 'create', $Repository, '--private', '--add-readme', '--description', 'Entregas privadas APP B2T; imagens prontas nas Releases.')
Assert-PrivateRepository $Repository
Write-Host "Repositorio privado criado: $Repository. Instale os scripts revisados conforme docs/DISTRIBUICAO_IMAGENS.md."
