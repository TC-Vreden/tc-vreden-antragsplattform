import { ApplicationForm } from "@/app/anmelden/application-form";
import { PublicPageShell } from "@/components/public-page-shell";
import { getApplicationFormContent } from "@/lib/application-content";

export const dynamic = "force-dynamic";

export default async function NeuanmeldungPage() {
  const content = await getApplicationFormContent();

  return (
    <PublicPageShell title="Neuanmeldung">
      <ApplicationForm content={content} />
    </PublicPageShell>
  );
}
