import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

export default function AnmeldenPage() {
  return (
    <PublicPageShell
      title="Mitgliedschaft"
      intro={
        <p>
          Bitte wähle zuerst aus, ob du neu in den Verein eintreten oder eine bestehende
          Mitgliedschaft um weitere Personen ergänzen möchtest.
        </p>
      }
    >
      <div className="entry-options">
        <Link className="entry-option" href="/anmelden/neuanmeldung">
          <strong>Neuanmeldung</strong>
          <span>
            Für Personen, die neu Mitglied im TennisClub Vreden e.V. werden möchten.
          </span>
        </Link>
        <Link className="entry-option" href="/anmelden/erweitern">
          <strong>Mitgliedschaft erweitern</strong>
          <span>
            Für bestehende Mitglieder, die ein Kind, einen Partner oder weitere
            Familienmitglieder hinzufügen möchten.
          </span>
        </Link>
      </div>
    </PublicPageShell>
  );
}
