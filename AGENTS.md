# TC-Vreden Deployment Routing

- This project is the TC-Vreden Antragsplattform, not the Filter.Shop Cockpit.
- Before release/deployment work, run `.\scripts\codex-doctor.ps1` from this project folder.
- For normal finished implementation work, use `.\scripts\codex-release.ps1 -CommitMessage "..."` so lint, build, Supabase migrations, Git push, Vercel deploy, live check, and phone notification happen in one project-routed flow.
- Do not rely on global Vercel or Supabase CLI login state. The release scripts load `.deploy.local.ps1` and use the TC-Vreden project profile from `.codex-project.json`.
- `.deploy.local.ps1` is local-only and gitignored. Never commit tokens, DB passwords, or API keys.
