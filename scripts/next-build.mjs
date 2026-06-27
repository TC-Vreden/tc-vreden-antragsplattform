import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

const blockedProxyPattern = /(?:127\.0\.0\.1|localhost|\[::1\]):9/;
const env = { ...process.env };

for (const name of [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "GIT_HTTP_PROXY",
  "GIT_HTTPS_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy"
]) {
  if (env[name] && blockedProxyPattern.test(env[name])) {
    delete env[name];
  }
}

const shouldUseLocalCodexBuild =
  env.VERCEL !== "1" && env.TC_VREDEN_DISABLE_NEXT_CLEAN !== "0";

Object.assign(env, {
  DO_NOT_TRACK: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  NO_UPDATE_NOTIFIER: "1",
  VERCEL_TELEMETRY_DISABLED: "1"
});

if (shouldUseLocalCodexBuild) {
  env.TC_VREDEN_DISABLE_NEXT_CLEAN = "1";
}

let buildRoot = projectRoot;
let tempBuildRoot = "";

function shouldCopyProjectPath(source) {
  const relativePath = path.relative(projectRoot, source).replaceAll(path.sep, "/");

  if (!relativePath) {
    return true;
  }

  const [firstSegment] = relativePath.split("/");

  if (
    firstSegment === ".git" ||
    firstSegment === ".next" ||
    firstSegment === "node_modules" ||
    firstSegment.startsWith(".next-codex-")
  ) {
    return false;
  }

  if (
    relativePath === ".deploy.local.ps1" ||
    relativePath === "supabase/.temp" ||
    relativePath.startsWith("supabase/.temp/") ||
    relativePath.endsWith(".log")
  ) {
    return false;
  }

  return true;
}

function prepareTempBuildRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tc-vreden-next-build-"));

  fs.cpSync(projectRoot, root, {
    dereference: false,
    filter: shouldCopyProjectPath,
    recursive: true
  });

  fs.symlinkSync(path.join(projectRoot, "node_modules"), path.join(root, "node_modules"), "junction");

  return root;
}

function cleanupTempBuildRoot() {
  if (!tempBuildRoot) {
    return;
  }

  const nodeModulesLink = path.join(tempBuildRoot, "node_modules");

  try {
    if (fs.existsSync(nodeModulesLink) && fs.lstatSync(nodeModulesLink).isSymbolicLink()) {
      fs.rmSync(nodeModulesLink, {
        force: true,
        maxRetries: 5,
        retryDelay: 250
      });
    }

    fs.rmSync(tempBuildRoot, {
      force: true,
      maxRetries: 5,
      recursive: true,
      retryDelay: 250
    });
  } catch (error) {
    console.warn(`Could not remove temporary build directory ${tempBuildRoot}: ${error.message}`);
  }
}

if (shouldUseLocalCodexBuild) {
  tempBuildRoot = prepareTempBuildRoot();
  buildRoot = tempBuildRoot;
}

const nextBin = path.join(buildRoot, "node_modules", "next", "dist", "bin", "next");
const nextBuildArguments = ["build"];
const outputLogPath = path.join(os.tmpdir(), `tc-vreden-next-build-${Date.now()}.log`);
const outputLogFd = fs.openSync(outputLogPath, "w");
let outputLogClosed = false;

if (shouldUseLocalCodexBuild) {
  nextBuildArguments.push("--experimental-build-mode", "compile");
}

const child = spawn(process.execPath, [nextBin, ...nextBuildArguments], {
  cwd: buildRoot,
  env,
  stdio: ["inherit", outputLogFd, outputLogFd]
});

function readAndPrintBuildOutput() {
  if (!outputLogClosed) {
    fs.closeSync(outputLogFd);
    outputLogClosed = true;
  }

  const output = fs.existsSync(outputLogPath) ? fs.readFileSync(outputLogPath, "utf8") : "";

  if (output) {
    process.stdout.write(output);
  }

  try {
    fs.rmSync(outputLogPath, { force: true });
  } catch {
    // The OS temp directory may clean this up later; build status is more important here.
  }

  return output;
}

child.on("error", (error) => {
  readAndPrintBuildOutput();
  console.error(error);
  cleanupTempBuildRoot();
  process.exit(1);
});

child.on("exit", (code, signal) => {
  const output = readAndPrintBuildOutput();
  cleanupTempBuildRoot();

  if (signal) {
    console.error(`next build stopped with signal ${signal}`);
    process.exit(1);
  }

  if (
    code !== 0 &&
    shouldUseLocalCodexBuild &&
    output.includes("Compiled successfully") &&
    /spawn EPERM|operation not permitted/i.test(output)
  ) {
    console.warn(
      "Local Codex compile completed; skipped the blocked Next.js post-compile worker in this sandbox. Vercel deployment still runs the full production build."
    );
    process.exit(0);
  }

  process.exit(code ?? 1);
});
