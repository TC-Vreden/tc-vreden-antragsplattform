import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { PasswordUpdateForm } from "@/app/verwaltung/passwort-neu/password-update-form";

export default function PasswordUpdatePage() {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Neues Passwort</h1>
        <p>
          Das neue Passwort wird direkt fuer den persoenlichen Supabase-Auth-Zugang gesetzt.
        </p>

        <PasswordUpdateForm />
      </section>
    </main>
  );
}
