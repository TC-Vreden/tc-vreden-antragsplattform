# TC-Vreden Antragsplattform

## Start Check

Before changing files, verify the local project context:

- `git status --short --branch`
- `git remote -v`

Expected GitHub remote:

- `https://github.com/TC-Vreden/tc-vreden-antragsplattform.git`

If the local path or Git remote does not match this project, stop and report the mismatch.

## Standard Workflow

- Use normal Git operations from this repository.
- Use `npm ci` after a fresh clone or dependency changes.
- Use `npm run lint`, `npm run typecheck`, and `npm run build` before pushing meaningful changes.
- On the Windows Codex desktop, if `node` or `npm` is missing only because the app inherited a reduced `PATH`, prepend `C:\Program Files\nodejs` and `%APPDATA%\npm` for the current terminal process, then continue with the normal npm commands. Do not replace the installed project runtime with ad-hoc wrappers.
- Do not rely on project-specific release helpers or local token loader scripts.
- Deployments should be explicit through GitHub/Vercel project configuration or a normal Vercel CLI flow.
- The project owner generally authorizes committing, pushing, and deploying completed changes when the required checks pass. Verify the target branch and production project before doing so, and report any blocker instead of guessing.

## Completion Report

- At the end of every completed task, always give the project owner a short summary in plain German that is understandable without programming knowledge.
- State what was changed, what was checked, and whether the change was committed, pushed, and deployed.
- Always mention the sensible theoretical next steps, if any. If no next step is required, say so explicitly.

## Secrets And Environment

- Runtime configuration belongs in `.env.local` locally and in Vercel environment variables for hosted deployments.
- Never commit `.env.local`, tokens, DB passwords, DB URLs, API keys, service-role keys, SMTP passwords, or eBuSy passwords.
- Keep `.env.example` current when runtime environment variables change.

## Documentation

- Keep the internal documentation under `/verwaltung/handbuch` in sync with every meaningful feature, workflow, operations, eBuSy, PDF/email, database, release, or permission change.
- When adding or changing behavior, update the user-facing documentation and, when relevant, the technical/operations documentation in the same commit.
- If a feature is intentionally not documented yet, mention that as an open documentation item before finishing the task.
