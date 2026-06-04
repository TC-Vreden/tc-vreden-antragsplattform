import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { ApplicationForm } from "@/app/anmelden/application-form";

export default function AnmeldenPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Öffentliches Formular</span>
        <h1 className="page-title">Neuanmeldung</h1>
        <ApplicationForm />
      </section>
      <footer className="public-form-footer">
        TennisClub Vreden e.V. <span>|</span> Ottensteiner Str. 59 <span>|</span> 48691 Vreden{" "}
        <span>|</span> <a href="mailto:mail@tennisclub-vreden.de">mail@tennisclub-vreden.de</a>
      </footer>
    </main>
  );
}
