import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { PasswordResetRequestForm } from "@/app/verwaltung/passwort-zuruecksetzen/password-reset-request-form";

export default function PasswordResetRequestPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Passwort zuruecksetzen</h1>
        <p>
          Der Link fuehrt zur Passwortvergabe fuer den persoenlichen internen Zugang.
        </p>

        <PasswordResetRequestForm />
      </section>
    </main>
  );
}
