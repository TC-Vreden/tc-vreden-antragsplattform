import Link from "next/link";
import type { Route } from "next";
import { InternalUserBar } from "@/components/internal-user-bar";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { handbookDate, handbookPages } from "@/app/verwaltung/handbuch/content";
import { requireInternalPagePermission } from "@/lib/internal-auth";

export default async function VerwaltungHandbuchPage() {
  const actor = await requireInternalPagePermission("docs.read");

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interne Dokumentation</span>
        <h1 className="page-title">Handbuch</h1>
        <p>
          Wissensbasis für Bedienung, eBuSy-Übernahme, Betrieb und Weiterentwicklung der
          digitalen Mitgliedsantragsplattform. Stand: <strong>{handbookDate}</strong>.
        </p>

        <InternalUserBar actor={actor} />

        <div className="cta-row" style={{ marginBottom: 24 }}>
          <Link className="button secondary" href="/verwaltung">
            Zurück zur Verwaltung
          </Link>
          <Link className="button secondary" href="/anmelden">
            Formular ansehen
          </Link>
          <Link className="button secondary" href="/verwaltung/ebusy-testlabor">
            Testlabor
          </Link>
        </div>

        <section className="doc-hero">
          <h2>Was ist dokumentiert?</h2>
          <p>
            Dieses Handbuch ist bewusst als lebende Dokumentation angelegt. Bei neuen Funktionen,
            geänderten eBuSy-Regeln, Datenbanktabellen, Release-Schritten oder Rechten muss es
            mit aktualisiert werden.
          </p>
        </section>

        <div className="doc-grid">
          {handbookPages.map((page) => (
            <Link
              className="doc-link-card"
              href={`/verwaltung/handbuch/${page.slug}` as Route}
              key={page.slug}
            >
              <span>{page.audience}</span>
              <strong>{page.title}</strong>
              <p>{page.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
