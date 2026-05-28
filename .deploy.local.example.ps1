# Copy this file to `.deploy.local.ps1` and fill in the TC-Vreden credentials.
# `.deploy.local.ps1` is gitignored and must never be committed.

# Required for direct production deployments with Vercel CLI.
$env:VERCEL_TOKEN = ""

# Required for Supabase CLI project linking. The CLI reads this env var directly.
$env:SUPABASE_ACCESS_TOKEN = ""

# Required for `supabase link` / `supabase db push --linked`.
$env:SUPABASE_DB_PASSWORD = ""

# Alternative to SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD:
# Use a percent-encoded direct Postgres connection string.
# $env:SUPABASE_DB_URL = "postgresql://postgres.xftnhnojaizyaecvtxcq:..."

# Runtime secrets stay in `.env.local`, not here:
# - SUPABASE_SERVICE_ROLE_KEY
# - INTERNAL_ACCESS_USERNAME / INTERNAL_ACCESS_PASSWORD
# - EBUSY_API_USERNAME / EBUSY_API_PASSWORD
# - SMTP_* values, if local mail tests are needed

# Optional: only needed if Windows Git credential routing ever becomes unreliable.
# Prefer the repository remote and normal `git push origin main` when this is empty.
$env:TCVREDEN_GITHUB_TOKEN = ""
