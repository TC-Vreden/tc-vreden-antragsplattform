import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { PasswordResetRequestForm } from "@/app/verwaltung/passwort-zuruecksetzen/password-reset-request-form";

export default function PasswordResetRequestPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Passwort zurücksetzen</h1>
        <p>
          Der Link führt zur Passwortvergabe für den persönlichen internen Zugang.
        </p>

        <PasswordResetRequestForm />
      </section>
    </main>
  );
}
