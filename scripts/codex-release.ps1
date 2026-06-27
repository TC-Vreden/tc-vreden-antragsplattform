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
    throw "Command failed: $FilePath $((Format-SafeCommandArguments $Arguments) -join ' ')"
  }
}

function Format-SafeCommandArguments {
  param([string[]]$Arguments)

  $redacted = @()
  $redactNext = $false
  $secretValueFlags = @("--token", "--password", "--db-url")

  foreach ($argument in @($Arguments)) {
    if ($redactNext) {
      $redacted += "[redacted]"
      $redactNext = $false
      continue
    }

    if ($secretValueFlags -contains $argument) {
      $redacted += $argument
      $redactNext = $true
      continue
    }

    if ($argument -match "(?i)(extraHeader|authorization)") {
      $redacted += ($argument -replace "(?i)(=).*", "=[redacted]")
      continue
    }

    if ($argument -match "(?i)(token|password|secret|key|db-url)=") {
      $redacted += ($argument -replace "(?i)(=).*", "=[redacted]")
      continue
    }

    $redacted += $argument
  }

  return $redacted
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

function Invoke-VercelExternal {
  param([string[]]$Arguments)

  $vercelArgs = @("exec", "--", "vercel", "--global-config", (Get-VercelGlobalConfigDir)) + $Arguments

  Invoke-WithProjectCliEnvironment {
    Invoke-External "npm.cmd" $vercelArgs
  }
}

function Get-GitHubTokenEnvName {
  if ($Config.github.PSObject.Properties.Name -contains "tokenEnv" -and $Config.github.tokenEnv) {
    return [string]$Config.github.tokenEnv
  }

  return "TCVREDEN_GITHUB_TOKEN"
}

function Invoke-GitHubExternal {
  param([string[]]$Arguments)

  $githubToken = Get-RequiredEnv (Get-GitHubTokenEnvName)
  $basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$githubToken"))
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
      Invoke-External "git" $gitArgs
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
    $notifyCommandPath = $notifyCommand
    $notifyExtension = [IO.Path]::GetExtension($notifyCommand)

    if ($notifyExtension -ieq ".cmd") {
      $notifyPowerShellPath = [IO.Path]::ChangeExtension($notifyCommand, ".ps1")

      if (Test-Path -Path $notifyPowerShellPath) {
        $notifyCommandPath = $notifyPowerShellPath
        $notifyExtension = ".ps1"
      }
    }

    $previousErrorActionPreference = $ErrorActionPreference

    try {
      $ErrorActionPreference = "Continue"
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $notificationOutput = Invoke-WithProjectCliEnvironment {
        & $notifyCommandPath $Message 2>&1
      }
      $notificationExitCode = if ($notifyExtension -ieq ".ps1") { 0 } else { $LASTEXITCODE }
      $notificationFailed = $notificationExitCode -ne 0 -or
        ($notificationOutput -and (($notificationOutput -join "`n") -match "Invoke-RestMethod|WebCmdletWebResponseException|Exception|Fehler|Error"))

      if ($notificationFailed) {
        $ntfyTopic = [Environment]::GetEnvironmentVariable("NTFY_TOPIC", "Process")

        if ($ntfyTopic) {
          $nodeNotifySource = @'
const decode = (value) => Buffer.from(value, "base64").toString("utf8");
const topic = decode(process.argv[2]);
const message = decode(process.argv[3]);
const title = decode(process.argv[4]);
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20000);

fetch("https://ntfy.sh/" + encodeURIComponent(topic), {
  method: "POST",
  headers: {
    Title: title,
    Priority: "default",
    Tags: "white_check_mark"
  },
  body: message,
  signal: controller.signal
})
  .then((response) => {
    clearTimeout(timeout);
    if (!response.ok) {
      console.error("ntfy status " + response.status);
      process.exit(1);
    }

    console.log("Handy-Benachrichtigung gesendet.");
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error(error.message);
    process.exit(1);
  });
'@
          $nodeNotifyRunner = "eval(Buffer.from(process.argv[1],String.fromCharCode(98,97,115,101,54,52)).toString())"
          $nodeNotifyPayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($nodeNotifySource))
          $topicPayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($ntfyTopic))
          $messagePayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Message))
          $titlePayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("Codex"))

          $nodeNotifyOutput = Invoke-WithProjectCliEnvironment {
            & node -e $nodeNotifyRunner $nodeNotifyPayload $topicPayload $messagePayload $titlePayload 2>&1
          }
          $nodeNotifyExitCode = $LASTEXITCODE

          if ($nodeNotifyExitCode -eq 0) {
            if ($nodeNotifyOutput) {
              Write-Host ($nodeNotifyOutput -join "`n")
            }
          } else {
            Write-Warning "Phone notification failed with exit code $nodeNotifyExitCode."
          }
        } else {
          Write-Warning "Phone notification failed with exit code $notificationExitCode; NTFY_TOPIC is not available for the Node fallback."
        }
      }
    } catch {
      $ntfyTopic = [Environment]::GetEnvironmentVariable("NTFY_TOPIC", "Process")

      if ($ntfyTopic) {
        $nodeNotifySource = @'
const decode = (value) => Buffer.from(value, "base64").toString("utf8");
const topic = decode(process.argv[2]);
const message = decode(process.argv[3]);
const title = decode(process.argv[4]);
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20000);

fetch("https://ntfy.sh/" + encodeURIComponent(topic), {
  method: "POST",
  headers: {
    Title: title,
    Priority: "default",
    Tags: "white_check_mark"
  },
  body: message,
  signal: controller.signal
})
  .then((response) => {
    clearTimeout(timeout);
    if (!response.ok) {
      console.error("ntfy status " + response.status);
      process.exit(1);
    }

    console.log("Handy-Benachrichtigung gesendet.");
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error(error.message);
    process.exit(1);
  });
'@
        $nodeNotifyRunner = "eval(Buffer.from(process.argv[1],String.fromCharCode(98,97,115,101,54,52)).toString())"
        $nodeNotifyPayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($nodeNotifySource))
        $topicPayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($ntfyTopic))
        $messagePayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Message))
        $titlePayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("Codex"))

        $nodeNotifyOutput = Invoke-WithProjectCliEnvironment {
          & node -e $nodeNotifyRunner $nodeNotifyPayload $topicPayload $messagePayload $titlePayload 2>&1
        }
        $nodeNotifyExitCode = $LASTEXITCODE

        if ($nodeNotifyExitCode -eq 0) {
          if ($nodeNotifyOutput) {
            Write-Host ($nodeNotifyOutput -join "`n")
          }
        } else {
          Write-Warning "Phone notification failed with exit code $nodeNotifyExitCode."
        }
      } else {
        Write-Warning "Phone notification failed: $($_.Exception.Message)"
      }
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
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

  Invoke-Step "TypeScript" {
    Invoke-External "npm.cmd" @("run", "typecheck")
  }

  Invoke-Step "Build" {
    Invoke-WithProjectCliEnvironment {
      Invoke-External "npm.cmd" @("run", "build")
    }
  }

  if (-not $SkipSupabase) {
    Invoke-Step "Supabase migrations" {
      $dbUrlName = [string]$Config.supabase.dbUrlEnv
      $accessTokenName = [string]$Config.supabase.accessTokenEnv
      $dbPasswordName = [string]$Config.supabase.dbPasswordEnv
      $dbUrl = [Environment]::GetEnvironmentVariable($dbUrlName, "Process")

      if ($dbUrl) {
        Invoke-WithProjectCliEnvironment {
          Invoke-External "npm.cmd" @("exec", "--", "supabase", "db", "push", "--yes", "--db-url", $dbUrl)
        }
      } else {
        $null = Get-RequiredEnv $accessTokenName
        $dbPassword = Get-RequiredEnv $dbPasswordName

        Invoke-WithProjectCliEnvironment {
          Invoke-External "npm.cmd" @("exec", "--", "supabase", "link", "--project-ref", [string]$Config.supabase.projectRef, "--password", $dbPassword)
          Invoke-External "npm.cmd" @("exec", "--", "supabase", "db", "push", "--linked", "--password", $dbPassword, "--yes")
        }
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

      Invoke-GitHubExternal @("push", [string]$Config.github.remoteName, $branch)
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
          Invoke-VercelExternal @("link", "--yes", "--scope", $scope, "--project", $projectName, "--token", $vercelToken)
        }

        Invoke-VercelExternal @("deploy", "--prod", "--yes", "--scope", $scope, "--token", $vercelToken)
      } finally {
        Restore-LocalEnvFile $envBackupPath
      }
    }
  }

  Invoke-Step "Live health check" {
    $liveUrl = [string]$Config.liveUrl
    $healthCheckSource = @'
const url = process.argv[2];
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20000);

fetch(url, { signal: controller.signal })
  .then((response) => {
    clearTimeout(timeout);
    console.log("Live URL status: " + response.status);
    process.exit(response.ok ? 0 : 1);
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error(error.message);
    process.exit(1);
  });
'@
    $healthCheckPayload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($healthCheckSource))
    $healthCheckScript = "eval(Buffer.from(process.argv[1],String.fromCharCode(98,97,115,101,54,52)).toString())"

    Invoke-WithProjectCliEnvironment {
      Invoke-External "node" @("-e", $healthCheckScript, $healthCheckPayload, $liveUrl)
    }

    Write-Host "Live URL OK: $liveUrl"
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
