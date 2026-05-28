# TC-Vreden Deployment Routing

- This project is the TC-Vreden Antragsplattform, not the Filter.Shop Cockpit.

## Required Start Check

Before changing files, verify the local routing from this project folder:

- `git status --short --branch`
- `git remote -v`
- `.codex-project.json`
- `.vercel\project.json`

Expected routing:

- GitHub: `https://github.com/TC-Vreden/tc-vreden-antragsplattform.git`
- Vercel project: `antrag-tennisclub-vreden`
- Vercel scope: `tc-vredens-projects`
- Supabase project ref: `xftnhnojaizyaecvtxcq`
- Live URL: `https://antrag-tennisclub-vreden.vercel.app`

## Release Rules

- Before release/deployment work, run `.\scripts\codex-doctor.ps1` from this project folder.
- For normal finished implementation work, use `.\scripts\codex-release.ps1 -CommitMessage "..."` so lint, build, Supabase migrations, Git push, Vercel deploy, live check, and phone notification happen in one project-routed flow.
- Do not rely on global Vercel or Supabase CLI login state. The release scripts load `.deploy.local.ps1` and use the TC-Vreden project profile from `.codex-project.json`.
- If `.deploy.local.ps1` is missing or the doctor fails, do not deploy.
- `.deploy.local.ps1` is local-only and gitignored. Never commit tokens, DB passwords, DB URLs, API keys, or passwords.

## Strict Project Separation

- Never edit, commit, push, deploy, or read credentials from the Filter.Shop Cockpit project in this thread.
- Do not copy Filter.Shop variables, Supabase refs, Vercel project IDs, scripts, routes, or documentation into this project unless Alexander explicitly asks for a comparison.
- If any Git, Vercel, Supabase, or local path points away from this TC-Vreden folder, stop and report the mismatch.
