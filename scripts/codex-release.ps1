[CmdletBinding()]
param(
  [string]$CommitMessage = "",
  [switch]$SkipSupabase,
  [switch]$SkipVercel,
  [switch]$NoCommit,
  [switch]$NoPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ConfigPath = Join-Path $ProjectRoot ".codex-project.json"
$DeployLocalPath = Join-Path $ProjectRoot ".deploy.local.ps1"

Set-Location $ProjectRoot

$Config = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json

if (Test-Path -Path $DeployLocalPath) {
  . $DeployLocalPath
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$ScriptBlock
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  & $ScriptBlock
}

function Invoke-External {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
  }
}

function Get-RequiredEnv {
  param([string]$Name)

  $value = [Environment]::GetEnvironmentVariable($Name, "Process")

  if (-not $value) {
    throw "Required env var missing: $Name. Add it to .deploy.local.ps1."
  }

  return $value
}

function Invoke-Notify {
  param([string]$Message)

  $notifyCommand = [string]$Config.notifications.command

  if (Test-Path -Path $notifyCommand) {
    & $notifyCommand $Message | Out-Null
  }
}

function Get-ProjectSlug {
  return ([string]$Config.projectName).ToLowerInvariant() -replace "[^a-z0-9]+", "-"
}

function Backup-LocalEnvFile {
  $envPath = Join-Path $ProjectRoot ".env.local"
  $backupPath = Join-Path ([IO.Path]::GetTempPath()) ((Get-ProjectSlug) + "-env-" + [guid]::NewGuid().ToString("N") + ".local")

  if (Test-Path -Path $envPath) {
    Copy-Item -Path $envPath -Destination $backupPath -Force
    return $backupPath
  }

  return ""
}

function Restore-LocalEnvFile {
  param([string]$BackupPath)

  $envPath = Join-Path $ProjectRoot ".env.local"

  if ($BackupPath -and (Test-Path -Path $BackupPath)) {
    Copy-Item -Path $BackupPath -Destination $envPath -Force
    Remove-Item -Path $BackupPath -Force
    return
  }

  if (-not $BackupPath -and (Test-Path -Path $envPath)) {
    Remove-Item -Path $envPath -Force
  }
}

function Test-VercelProjectLinked {
  $projectPath = Join-Path $ProjectRoot ".vercel\project.json"

  if (-not (Test-Path -Path $projectPath)) {
    return $false
  }

  try {
    $project = Get-Content -Path $projectPath -Raw | ConvertFrom-Json
    return [string]$project.projectName -eq [string]$Config.vercel.projectName
  } catch {
    return $false
  }
}

function Test-NoSecretFilesStaged {
  $stagedFiles = @(& git diff --cached --name-only)
  $blockedPatterns = @(
    "^\.env$",
    "^\.env\.local$",
    "^\.env\.production$",
    "^\.env\.development$",
    "^\.env\..*\.local$",
    "^\.deploy\.local\.ps1$",
    "\.pem$",
    "\.key$",
    "\.pfx$",
    "\.p12$"
  )
  $blockedFiles = New-Object System.Collections.Generic.List[string]

  foreach ($file in $stagedFiles) {
    foreach ($pattern in $blockedPatterns) {
      if ($file -match $pattern) {
        $blockedFiles.Add($file) | Out-Null
        break
      }
    }
  }

  if ($blockedFiles.Count -gt 0) {
    throw "Refusing to commit possible secret/local credential files: $($blockedFiles -join ', ')"
  }
}

try {
  Invoke-Step "Project routing check" {
    $doctorArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "codex-doctor.ps1"), "-Quiet")

    if ($SkipSupabase) {
      $doctorArgs += "-SkipSupabase"
    }

    if ($SkipVercel) {
      $doctorArgs += "-SkipVercel"
    }

    Invoke-External "powershell" $doctorArgs
  }

  Invoke-Step "Lint" {
    Invoke-External "npm.cmd" @("run", "lint")
  }

  Invoke-Step "Build" {
    Invoke-External "npm.cmd" @("run", "build")
  }

  if (-not $SkipSupabase) {
    Invoke-Step "Supabase migrations" {
      $dbUrlName = [string]$Config.supabase.dbUrlEnv
      $accessTokenName = [string]$Config.supabase.accessTokenEnv
      $dbPasswordName = [string]$Config.supabase.dbPasswordEnv
      $dbUrl = [Environment]::GetEnvironmentVariable($dbUrlName, "Process")

      if ($dbUrl) {
        Invoke-External "npm.cmd" @("exec", "--", "supabase", "db", "push", "--yes", "--db-url", $dbUrl)
      } else {
        $null = Get-RequiredEnv $accessTokenName
        $dbPassword = Get-RequiredEnv $dbPasswordName

        Invoke-External "npm.cmd" @("exec", "--", "supabase", "link", "--project-ref", [string]$Config.supabase.projectRef, "--password", $dbPassword)
        Invoke-External "npm.cmd" @("exec", "--", "supabase", "db", "push", "--linked", "--password", $dbPassword, "--yes")
      }
    }
  }

  if (-not $NoCommit) {
    Invoke-Step "Commit changes" {
      Invoke-External "git" @("add", "--all")

      $excludePaths = @()
      if ($Config.github.PSObject.Properties.Name -contains "releaseExcludePaths" -and $Config.github.releaseExcludePaths) {
        $excludePaths = @($Config.github.releaseExcludePaths)
      }

      foreach ($excludedPath in $excludePaths) {
        & git restore --staged -- $excludedPath 2>$null
      }

      Test-NoSecretFilesStaged
      $staged = & git diff --cached --name-only

      if ($staged) {
        if (-not $CommitMessage) {
          $CommitMessage = "Automated TC-Vreden release"
        }

        Invoke-External "git" @("commit", "-m", $CommitMessage)
      } else {
        Write-Host "No staged changes to commit."
      }
    }
  }

  if (-not $NoPush) {
    Invoke-Step "Push to GitHub" {
      $branch = (& git branch --show-current).Trim()

      if (-not $branch) {
        $branch = [string]$Config.defaultBranch
      }

      Invoke-External "git" @("push", [string]$Config.github.remoteName, $branch)
    }
  }

  if (-not $SkipVercel) {
    Invoke-Step "Vercel production deploy" {
      $vercelToken = Get-RequiredEnv ([string]$Config.vercel.tokenEnv)
      $scope = [string]$Config.vercel.scope
      $projectName = [string]$Config.vercel.projectName
      $envBackupPath = Backup-LocalEnvFile

      try {
        if (Test-VercelProjectLinked) {
          Write-Host "Vercel project already linked locally. Skipping link to avoid .env.local rewrites."
        } else {
          Invoke-External "npm.cmd" @("exec", "--", "vercel", "link", "--yes", "--scope", $scope, "--project", $projectName, "--token", $vercelToken)
        }

        Invoke-External "npm.cmd" @("exec", "--", "vercel", "deploy", "--prod", "--yes", "--scope", $scope, "--token", $vercelToken)
      } finally {
        Restore-LocalEnvFile $envBackupPath
      }
    }
  }

  Invoke-Step "Live health check" {
    $response = Invoke-WebRequest -Uri ([string]$Config.liveUrl) -UseBasicParsing -TimeoutSec 20

    if ([int]$response.StatusCode -ne 200) {
      throw "Live health check failed: HTTP $([int]$response.StatusCode)"
    }

    Write-Host "Live URL OK: $([string]$Config.liveUrl)"
  }

  Invoke-Notify "TC-Vreden Release abgeschlossen."
  Write-Host ""
  Write-Host "Release complete." -ForegroundColor Green
} catch {
  $message = $_.Exception.Message
  Invoke-Notify "TC-Vreden Release blockiert: $message"
  Write-Host ""
  Write-Host "Release failed: $message" -ForegroundColor Red
  exit 1
}
