import { ApplicationExtensionForm } from "@/app/anmelden/erweitern/application-extension-form";
import { PublicPageShell } from "@/components/public-page-shell";
import { getApplicationFormContent } from "@/lib/application-content";

export const dynamic = "force-dynamic";

export default async function MitgliedschaftErweiternPage() {
  const content = await getApplicationFormContent();

  return (
    <PublicPageShell
      title="Mitgliedschaft erweitern"
      intro={
        <p>
          Für bestehende Mitglieder, die ein Kind, einen Partner oder weitere
          Familienmitglieder zur vorhandenen Mitgliedschaft hinzufügen möchten.
        </p>
      }
    >
      <ApplicationExtensionForm content={content} />
    </PublicPageShell>
  );
}
