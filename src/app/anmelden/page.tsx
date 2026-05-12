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
    </main>
  );
}
