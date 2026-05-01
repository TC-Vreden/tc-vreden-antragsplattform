import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">TC Vreden Prototyp</span>
        <h1>Digitale Mitgliedschaft statt Papierstapel.</h1>
        <p>
          Dieser erste Prototyp sammelt Mitgliedsanfragen ausserhalb von eBuSy, speichert sie
          strukturiert und bereitet sie fuer den Vorstand zur Pruefung vor.
        </p>
        <div className="cta-row">
          <Link className="button" href="/anmelden">
            Neuanmeldung testen
          </Link>
          <Link className="button secondary" href="/verwaltung">
            Interne Ansicht
          </Link>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 28 }}>
        <article className="card">
          <h2>Version 1</h2>
          <ul className="list">
            <li>Neuanmeldung ueber eigenes Vereinsformular</li>
            <li>Zwischenspeicherung in Supabase</li>
            <li>interne Bearbeitung mit Personenabgleich</li>
            <li>Mock-Modus fuer eBuSy-Abgleich</li>
          </ul>
        </article>

        <article className="card">
          <h2>Danach</h2>
          <ul className="list">
            <li>echter eBuSy-Abgleich per API</li>
            <li>PDF-Zusammenfassung per E-Mail</li>
            <li>Bestandsmitglieder und Padel-Umstellung</li>
            <li>spaetere SEPA- und Einwilligungsstrecken</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
