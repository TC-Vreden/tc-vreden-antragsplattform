[CmdletBinding()]
param(
  [switch]$Quiet,
  [switch]$SkipSupabase,
  [switch]$SkipVercel
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ConfigPath = Join-Path $ProjectRoot ".codex-project.json"
$DeployLocalPath = Join-Path $ProjectRoot ".deploy.local.ps1"

Set-Location $ProjectRoot

if (-not (Test-Path -Path $ConfigPath)) {
  throw "Missing project routing file: $ConfigPath"
}

$Config = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json

if (Test-Path -Path $DeployLocalPath) {
  . $DeployLocalPath
}

$Checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Message
  )

  $Checks.Add([pscustomobject]@{
    Name = $Name
    Ok = $Ok
    Message = $Message
  }) | Out-Null
}

function Test-EnvValue {
  param([string]$Name)

  return [bool]([Environment]::GetEnvironmentVariable($Name, "Process"))
}

function Invoke-TextCommand {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  $output = & $FilePath @Arguments 2>&1
  $exitCode = $LASTEXITCODE

  return [pscustomobject]@{
    ExitCode = $exitCode
    Text = ($output -join "`n").Trim()
  }
}

$gitDir = Join-Path $ProjectRoot ".git"
Add-Check "Project folder" (Test-Path -Path $gitDir) "Working directory: $ProjectRoot"

$remoteResult = Invoke-TextCommand "git" @("remote", "get-url", $Config.github.remoteName)
$remoteOk = $remoteResult.ExitCode -eq 0 -and $remoteResult.Text -eq $Config.github.remoteUrl
Add-Check "Git remote" $remoteOk "Expected $($Config.github.remoteName) -> $($Config.github.remoteUrl); actual: $($remoteResult.Text)"

$branchResult = Invoke-TextCommand "git" @("branch", "--show-current")
$branchOk = $branchResult.ExitCode -eq 0 -and $branchResult.Text -eq $Config.defaultBranch
Add-Check "Git branch" $branchOk "Expected $($Config.defaultBranch); actual: $($branchResult.Text)"

$npmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
Add-Check "Node/npm" ($null -ne $npmCommand) "npm.cmd available for project scripts and npx-style CLI execution."

if ($SkipVercel) {
  Add-Check "Vercel token" $true "Skipped by -SkipVercel."
} else {
  $vercelTokenName = [string]$Config.vercel.tokenEnv
  $hasVercelToken = Test-EnvValue $vercelTokenName
  Add-Check "Vercel token" $hasVercelToken "Set `$env:$vercelTokenName in .deploy.local.ps1 for scope '$($Config.vercel.scope)' and project '$($Config.vercel.projectName)'."

  if ($hasVercelToken) {
    $vercelWhoami = Invoke-TextCommand "npm.cmd" @("exec", "--", "vercel", "whoami", "--token", [Environment]::GetEnvironmentVariable($vercelTokenName, "Process"))
    Add-Check "Vercel token login" ($vercelWhoami.ExitCode -eq 0) "Vercel CLI whoami must succeed with the project-local token."
  }
}

if ($SkipSupabase) {
  Add-Check "Supabase credentials" $true "Skipped by -SkipSupabase."
} else {
  $supabaseAccessTokenName = [string]$Config.supabase.accessTokenEnv
  $supabasePasswordName = [string]$Config.supabase.dbPasswordEnv
  $supabaseDbUrlName = [string]$Config.supabase.dbUrlEnv
  $hasSupabaseDbUrl = Test-EnvValue $supabaseDbUrlName
  $hasSupabaseLinkCreds = (Test-EnvValue $supabaseAccessTokenName) -and (Test-EnvValue $supabasePasswordName)
  $supabaseOk = $hasSupabaseDbUrl -or $hasSupabaseLinkCreds
  Add-Check "Supabase credentials" $supabaseOk "Set either `$env:$supabaseDbUrlName or both `$env:$supabaseAccessTokenName and `$env:$supabasePasswordName for project $($Config.supabase.projectRef)."
}

if (-not $Quiet) {
  Write-Host ""
  Write-Host "Codex Project Doctor: $($Config.projectName)" -ForegroundColor Cyan
  Write-Host "Project root: $ProjectRoot"
  Write-Host ""

  foreach ($check in $Checks) {
    $mark = if ($check.Ok) { "OK" } else { "FAIL" }
    $color = if ($check.Ok) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1}" -f $mark, $check.Name) -ForegroundColor $color
    Write-Host "     $($check.Message)"
  }
}

$failed = @($Checks | Where-Object { -not $_.Ok })

if ($failed.Count -gt 0) {
  if (-not $Quiet) {
    Write-Host ""
    Write-Host "Doctor found $($failed.Count) blocker(s). Fix them before running scripts/codex-release.ps1." -ForegroundColor Red
  }

  exit 1
}

if (-not $Quiet) {
  Write-Host ""
  Write-Host "Doctor passed. Release automation can run for this project." -ForegroundColor Green
}

exit 0
