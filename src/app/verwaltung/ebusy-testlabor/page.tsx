import Link from "next/link";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { ebusyTestScenarios } from "@/lib/ebusy-test-lab";
import { EbusyTestLabClient } from "@/app/verwaltung/ebusy-testlabor/test-lab-client";

export default function EbusyTestlaborPage() {
  const writeEnabled = process.env.EBUSY_TEST_LAB_WRITE_ENABLED === "true";

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">eBuSy-Testlabor</h1>
        <p>
          Hier können wir kontrolliert prüfen, welche Daten tatsächlich an eBuSy gesendet werden
          und welche Werte nach dem Anlegen wieder aus eBuSy zurückkommen. Das Testlabor ist für
          kleine, nachvollziehbare Feldtests gedacht, nicht für produktive Mitgliedschaftsanlagen.
        </p>

        <div className="cta-row" style={{ marginBottom: 20 }}>
          <Link className="button secondary" href="/verwaltung">
            Zurück zur Verwaltung
          </Link>
        </div>

        <article className="hint-box" style={{ marginBottom: 20 }}>
          <strong>Arbeitsweise</strong>
          <p style={{ margin: "10px 0 0" }}>
            Der Datenpaket-Test zeigt nur, was gesendet würde. Der Live-Test legt eine klar markierte
            Testperson in eBuSy an, liest sie direkt wieder aus und vergleicht die Felder. Solange
            kein sicherer API-Löschweg bestätigt ist, muss die Testperson anschließend manuell in
            eBuSy gelöscht werden.
          </p>
        </article>

        <EbusyTestLabClient scenarios={ebusyTestScenarios} writeEnabled={writeEnabled} />
      </section>
    </main>
  );
}
