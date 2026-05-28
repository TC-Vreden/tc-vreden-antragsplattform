import type { Route } from "next";
import { redirect } from "next/navigation";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { getCurrentInternalActor, getSafeInternalNextPath } from "@/lib/internal-auth";
import { LoginForm } from "@/app/verwaltung/login/login-form";

type Props = {
  searchParams: Promise<{
    next?: string;
    reason?: string;
  }>;
};

function getReasonText(reason: string | undefined) {
  if (reason === "disabled") {
    return "Dieser interne Zugang ist gesperrt.";
  }

  if (reason === "forbidden") {
    return "Fuer diese interne Aktion fehlt die passende Rolle.";
  }

  return null;
}

export default async function InternalLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = getSafeInternalNextPath(params.next);
  const actor = await getCurrentInternalActor({ allowLegacyBasicAuth: false });

  if (actor && actor.status !== "disabled") {
    redirect(nextPath as Route);
  }

  const reasonText = getReasonText(params.reason);

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Login</h1>
        <p>
          Bitte mit dem persoenlichen internen Zugang anmelden. Einladungs- und
          Passwortlinks laufen ueber Supabase Auth.
        </p>
        <p>
          Fuer den ersten Admin kann der alte Uebergangs-Zugang gezielt ueber{" "}
          <a href="/verwaltung/benutzer?legacy=1">/verwaltung/benutzer?legacy=1</a>{" "}
          verwendet werden, solange die Basic-Auth-Fallback-Variable aktiv ist.
        </p>

        {reasonText ? (
          <div className="warning-box" style={{ marginBottom: 20 }}>
            <strong>Zugriff nicht moeglich</strong>
            <p style={{ margin: "8px 0 0" }}>{reasonText}</p>
          </div>
        ) : null}

        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
