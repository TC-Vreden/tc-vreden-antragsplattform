[CmdletBinding()]
param(
  [switch]$Quiet,
  [switch]$SkipSupabase,
  [switch]$SkipVercel,
  [switch]$SkipRuntimeEnv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ConfigPath = Join-Path $ProjectRoot ".codex-project.json"
$DeployLocalPath = Join-Path $ProjectRoot ".deploy.local.ps1"
$EnvLocalPath = Join-Path $ProjectRoot ".env.local"

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

function Test-ObjectProperty {
  param(
    [object]$Object,
    [string]$Name
  )

  return $null -ne $Object -and $Object.PSObject.Properties.Name -contains $Name
}

function Test-ProcessEnvValue {
  param([string]$Name)

  return [bool]([Environment]::GetEnvironmentVariable($Name, "Process"))
}

function Read-DotEnvFile {
  param([string]$Path)

  $values = @{}

  if (-not (Test-Path -Path $Path)) {
    return $values
  }

  foreach ($line in Get-Content -Path $Path) {
    if ($line -match "^\s*#" -or -not $line.Trim()) {
      continue
    }

    if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") {
      $key = $matches[1]
      $value = $matches[2].Trim()

      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      $values[$key] = $value
    }
  }

  return $values
}

$LocalEnv = Read-DotEnvFile $EnvLocalPath

function Get-LocalEnvValue {
  param([string]$Name)

  $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")

  if ($processValue) {
    return $processValue
  }

  if ($LocalEnv.ContainsKey($Name)) {
    return [string]$LocalEnv[$Name]
  }

  return ""
}

function Test-LocalEnvValue {
  param([string]$Name)

  return [bool](Get-LocalEnvValue $Name)
}

function Invoke-TextCommand {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference

  try {
    $ErrorActionPreference = "Continue"
    $output = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Text = ($output -join "`n").Trim()
  }
}

function Get-BlockedProxyEnvNames {
  $proxyNames = @(
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "GIT_HTTP_PROXY",
    "GIT_HTTPS_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy"
  )
  $blockedNames = @()

  foreach ($name in $proxyNames) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")

    if ($value -and ($value -match "127\.0\.0\.1:9" -or $value -match "localhost:9" -or $value -match "\[::1\]:9")) {
      $blockedNames += $name
    }
  }

  return $blockedNames
}

function Invoke-WithTemporaryProcessEnvironment {
  param(
    [string[]]$ClearNames = @(),
    [hashtable]$SetValues = @{},
    [scriptblock]$ScriptBlock
  )

  $names = @()

  foreach ($name in @($ClearNames)) {
    if ($name -and $names -notcontains $name) {
      $names += $name
    }
  }

  foreach ($entry in $SetValues.GetEnumerator()) {
    $name = [string]$entry.Key

    if ($name -and $names -notcontains $name) {
      $names += $name
    }
  }

  $previousValues = @{}

  foreach ($name in $names) {
    $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
  }

  try {
    foreach ($name in @($ClearNames)) {
      if ($name) {
        [Environment]::SetEnvironmentVariable($name, $null, "Process")
      }
    }

    foreach ($entry in $SetValues.GetEnumerator()) {
      [Environment]::SetEnvironmentVariable([string]$entry.Key, [string]$entry.Value, "Process")
    }

    & $ScriptBlock
  } finally {
    foreach ($name in $names) {
      [Environment]::SetEnvironmentVariable($name, $previousValues[$name], "Process")
    }
  }
}

function Invoke-WithProjectCliEnvironment {
  param([scriptblock]$ScriptBlock)

  Invoke-WithTemporaryProcessEnvironment `
    -ClearNames (Get-BlockedProxyEnvNames) `
    -SetValues @{
      "CI" = "1"
      "DO_NOT_TRACK" = "1"
      "NEXT_TELEMETRY_DISABLED" = "1"
      "NO_UPDATE_NOTIFIER" = "1"
      "VERCEL_TELEMETRY_DISABLED" = "1"
    } `
    -ScriptBlock $ScriptBlock
}

function Get-VercelGlobalConfigDir {
  $path = Join-Path ([IO.Path]::GetTempPath()) "tc-vreden-vercel-global-config"

  if (-not (Test-Path -Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }

  return $path
}

function Invoke-VercelTextCommand {
  param([string[]]$Arguments)

  $vercelArgs = @("exec", "--", "vercel", "--global-config", (Get-VercelGlobalConfigDir)) + $Arguments

  Invoke-WithProjectCliEnvironment {
    Invoke-TextCommand "npm.cmd" $vercelArgs
  }
}

function Get-GitHubTokenEnvName {
  if (Test-ObjectProperty $Config.github "tokenEnv" -and $Config.github.tokenEnv) {
    return [string]$Config.github.tokenEnv
  }

  return "TCVREDEN_GITHUB_TOKEN"
}

function Invoke-GitHubTextCommand {
  param(
    [string]$Token,
    [string[]]$Arguments
  )

  $basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$Token"))
  $gitArgs = @(
    "-c",
    "http.sslBackend=openssl",
    "-c",
    "http.extraHeader=Authorization: Basic $basicAuth"
  ) + $Arguments

  Invoke-WithTemporaryProcessEnvironment `
    -ClearNames (Get-BlockedProxyEnvNames) `
    -SetValues @{
      "GIT_SSL_BACKEND" = "openssl"
    } `
    -ScriptBlock {
      Invoke-TextCommand "git" $gitArgs
    }
}

function Get-ExpectedConfigValue {
  param(
    [object]$Object,
    [string]$Name
  )

  if (Test-ObjectProperty $Object $Name) {
    return [string]$Object.$Name
  }

  return ""
}

$gitDir = Join-Path $ProjectRoot ".git"
Add-Check "Project folder" (Test-Path -Path $gitDir) "Working directory: $ProjectRoot"
Add-Check "Project identity" ([string]$Config.projectName -eq "TC-Vreden Antragsplattform") "Expected TC-Vreden Antragsplattform; actual: $($Config.projectName)"

$remoteResult = Invoke-TextCommand "git" @("remote", "get-url", $Config.github.remoteName)
$remoteOk = $remoteResult.ExitCode -eq 0 -and $remoteResult.Text -eq $Config.github.remoteUrl
Add-Check "Git remote" $remoteOk "Expected $($Config.github.remoteName) -> $($Config.github.remoteUrl); actual: $($remoteResult.Text)"

$branchResult = Invoke-TextCommand "git" @("branch", "--show-current")
$branchOk = $branchResult.ExitCode -eq 0 -and $branchResult.Text -eq $Config.defaultBranch
Add-Check "Git branch" $branchOk "Expected $($Config.defaultBranch); actual: $($branchResult.Text)"

$githubTokenName = Get-GitHubTokenEnvName
$hasGithubToken = Test-ProcessEnvValue $githubTokenName
Add-Check "GitHub token" $hasGithubToken "Project-local GitHub token env var: $githubTokenName"

if ($hasGithubToken) {
  $githubHead = Invoke-GitHubTextCommand -Token ([Environment]::GetEnvironmentVariable($githubTokenName, "Process")) -Arguments @("ls-remote", [string]$Config.github.remoteUrl, "HEAD")
  Add-Check "GitHub token access" ($githubHead.ExitCode -eq 0) "GitHub token must read repository HEAD with OpenSSL Git transport."
}

$npmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
Add-Check "Node/npm" ($null -ne $npmCommand) "npm.cmd available for project scripts and npx-style CLI execution."

$requiresDeployLocal = (-not $SkipVercel) -or (-not $SkipSupabase)
$hasDeployLocal = Test-Path -Path $DeployLocalPath
$deployLocalOk = (-not $requiresDeployLocal) -or $hasDeployLocal
$deployLocalMessage = if ($deployLocalOk) {
  "Local deployment secret loader is available when needed."
} else {
  "Create from .deploy.local.example.ps1 and fill only TC-Vreden credentials before release/deploy."
}
Add-Check ".deploy.local.ps1" $deployLocalOk $deployLocalMessage

$vercelProjectPath = Join-Path $ProjectRoot ".vercel\project.json"
$vercelOk = $false
$vercelMessage = "Missing .vercel\project.json."

if (Test-Path -Path $vercelProjectPath) {
  try {
    $vercelProject = Get-Content -Path $vercelProjectPath -Raw | ConvertFrom-Json
    $expectedProjectId = Get-ExpectedConfigValue $Config.vercel "projectId"
    $expectedOrgId = Get-ExpectedConfigValue $Config.vercel "orgId"
    $nameOk = [string]$vercelProject.projectName -eq [string]$Config.vercel.projectName
    $projectIdOk = -not $expectedProjectId -or [string]$vercelProject.projectId -eq $expectedProjectId
    $orgIdOk = -not $expectedOrgId -or [string]$vercelProject.orgId -eq $expectedOrgId
    $vercelOk = $nameOk -and $projectIdOk -and $orgIdOk
    $vercelMessage = "Expected project '$($Config.vercel.projectName)' in scope '$($Config.vercel.scope)'; actual project '$($vercelProject.projectName)'."
  } catch {
    $vercelMessage = "Could not parse .vercel\project.json: $($_.Exception.Message)"
  }
}

Add-Check "Vercel local project" $vercelOk $vercelMessage

if ($SkipVercel) {
  Add-Check "Vercel token" $true "Skipped by -SkipVercel."
} else {
  $vercelTokenName = [string]$Config.vercel.tokenEnv
  $hasVercelToken = Test-ProcessEnvValue $vercelTokenName
  $vercelTokenMessage = if ($hasVercelToken) {
    "Project-local Vercel token is present for scope '$($Config.vercel.scope)' and project '$($Config.vercel.projectName)'."
  } else {
    "Set `$env:$vercelTokenName in .deploy.local.ps1 for scope '$($Config.vercel.scope)' and project '$($Config.vercel.projectName)'."
  }
  Add-Check "Vercel token" $hasVercelToken $vercelTokenMessage

  if ($hasVercelToken) {
    $vercelWhoami = Invoke-VercelTextCommand @("whoami", "--token", [Environment]::GetEnvironmentVariable($vercelTokenName, "Process"))
    Add-Check "Vercel token login" ($vercelWhoami.ExitCode -eq 0) "Vercel CLI whoami must succeed with the project-local token."
  }
}

if ($SkipSupabase) {
  Add-Check "Supabase release credentials" $true "Skipped by -SkipSupabase."
} else {
  $supabaseAccessTokenName = [string]$Config.supabase.accessTokenEnv
  $supabasePasswordName = [string]$Config.supabase.dbPasswordEnv
  $supabaseDbUrlName = [string]$Config.supabase.dbUrlEnv
  $hasSupabaseDbUrl = Test-ProcessEnvValue $supabaseDbUrlName
  $hasSupabaseLinkCreds = (Test-ProcessEnvValue $supabaseAccessTokenName) -and (Test-ProcessEnvValue $supabasePasswordName)
  $supabaseOk = $hasSupabaseDbUrl -or $hasSupabaseLinkCreds
  $supabaseMessage = if ($supabaseOk) {
    "Supabase release credentials are present for project $($Config.supabase.projectRef)."
  } else {
    "Set either `$env:$supabaseDbUrlName or both `$env:$supabaseAccessTokenName and `$env:$supabasePasswordName for project $($Config.supabase.projectRef)."
  }
  Add-Check "Supabase release credentials" $supabaseOk $supabaseMessage
}

if ($SkipRuntimeEnv) {
  Add-Check "Local runtime env" $true "Skipped by -SkipRuntimeEnv."
} else {
  $runtimeEnvFile = if (Test-ObjectProperty $Config "runtime") { [string]$Config.runtime.envFile } else { ".env.local" }
  $runtimeEnvPath = Join-Path $ProjectRoot $runtimeEnvFile
  Add-Check "Local runtime env file" (Test-Path -Path $runtimeEnvPath) "Expected local runtime env file: $runtimeEnvFile"

  $requiredRuntimeEnv = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "INTERNAL_ACCESS_USERNAME",
    "INTERNAL_ACCESS_PASSWORD",
    "EBUSY_API_BASE_URL",
    "EBUSY_API_USERNAME",
    "EBUSY_API_PASSWORD",
    "EBUSY_MATCH_MODE"
  )

  if (Test-ObjectProperty $Config "runtime" -and Test-ObjectProperty $Config.runtime "requiredLocalEnv") {
    $requiredRuntimeEnv = @($Config.runtime.requiredLocalEnv)
  }

  $missingRuntimeEnv = @($requiredRuntimeEnv | Where-Object { -not (Test-LocalEnvValue $_) })
  $runtimeEnvOk = $missingRuntimeEnv.Count -eq 0
  $runtimeEnvMessage = if ($runtimeEnvOk) {
    "All required local runtime values are present in $runtimeEnvFile or process env."
  } else {
    "Missing in $runtimeEnvFile or process env: $($missingRuntimeEnv -join ', ')"
  }
  Add-Check "Local runtime env values" $runtimeEnvOk $runtimeEnvMessage

  $supabaseUrl = Get-LocalEnvValue "NEXT_PUBLIC_SUPABASE_URL"
  $supabaseUrlOk = $supabaseUrl -and $supabaseUrl.Contains([string]$Config.supabase.projectRef)
  Add-Check "Supabase runtime project" $supabaseUrlOk "NEXT_PUBLIC_SUPABASE_URL must point to project ref $($Config.supabase.projectRef)."
}

$trackedFilesResult = Invoke-TextCommand "git" @("ls-files")
$filterMatches = New-Object System.Collections.Generic.List[string]
$allowedFilterReferenceFiles = @(
  "AGENTS.md",
  "docs/codex-routing-und-lokale-secrets.md",
  "docs/handover-rechte-rollensystem-thread.md",
  "scripts/codex-doctor.ps1"
)

if ($trackedFilesResult.ExitCode -eq 0 -and $trackedFilesResult.Text) {
  $trackedFiles = $trackedFilesResult.Text -split "`n"

  foreach ($file in $trackedFiles) {
    $normalizedFile = $file.Trim()

    if (-not $normalizedFile -or $allowedFilterReferenceFiles -contains $normalizedFile) {
      continue
    }

    $path = Join-Path $ProjectRoot $normalizedFile

    if (Test-Path -Path $path) {
      $matches = Select-String -Path $path -Pattern "filter\.shop|filtershop|filter-shop|filter shop" -ErrorAction SilentlyContinue

      foreach ($match in $matches) {
        $filterMatches.Add("${normalizedFile}:$($match.LineNumber)") | Out-Null
      }
    }
  }
}

$filterReferencesOk = $filterMatches.Count -eq 0
$filterReferencesMessage = if ($filterReferencesOk) {
  "No unexpected Filter.Shop project references found outside routing docs."
} else {
  "Unexpected references outside routing docs: $($filterMatches -join ', ')"
}
Add-Check "No Filter.Shop project references" $filterReferencesOk $filterReferencesMessage

$notifyCommand = [string]$Config.notifications.command
Add-Check "Notification command" (Test-Path -Path $notifyCommand) "Expected phone notification command: $notifyCommand"

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
