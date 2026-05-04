import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { ApplicationForm } from "@/app/anmelden/application-form";

export default function AnmeldenPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Oeffentliches Formular</span>
        <h1 style={{ maxWidth: "unset", fontSize: "2.5rem" }}>Neuanmeldung</h1>
        <ApplicationForm />
      </section>
    </main>
  );
}
