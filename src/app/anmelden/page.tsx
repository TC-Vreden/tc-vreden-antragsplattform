import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { ApplicationForm } from "@/app/anmelden/application-form";
import { getApplicationFormContent } from "@/lib/application-content";

export const dynamic = "force-dynamic";

export default async function AnmeldenPage() {
  const content = await getApplicationFormContent();

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <h1 className="page-title">Neuanmeldung</h1>
        <ApplicationForm content={content} />
      </section>
      <footer className="public-form-footer">
        TennisClub Vreden e.V. <span>|</span> Ottensteiner Str. 59 <span>|</span> 48691 Vreden{" "}
        <span>|</span> <a href="mailto:mail@tennisclub-vreden.de">mail@tennisclub-vreden.de</a>
      </footer>
    </main>
  );
}
