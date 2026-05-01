import { TcVredenLogo } from "@/components/tc-vreden-logo";

export default function AnmeldenPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Oeffentliches Formular</span>
        <h1 style={{ maxWidth: "unset", fontSize: "2.5rem" }}>Neuanmeldung</h1>
        <p>
          Dieses Formular ist das erste fachliche Geruest. In der naechsten Ausbaustufe wird es
          an Supabase gespeichert und spaeter serverseitig mit eBuSy abgeglichen.
        </p>

        <form className="form">
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="firstName">Vorname</label>
              <input id="firstName" name="firstName" />
            </div>
            <div className="field">
              <label htmlFor="lastName">Nachname</label>
              <input id="lastName" name="lastName" />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="birthDate">Geburtsdatum</label>
              <input id="birthDate" name="birthDate" type="date" />
            </div>
            <div className="field">
              <label htmlFor="email">E-Mail</label>
              <input id="email" name="email" type="email" />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="phone">Telefon</label>
              <input id="phone" name="phone" />
            </div>
            <div className="field">
              <label htmlFor="mobile">Mobil</label>
              <input id="mobile" name="mobile" />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="membershipKind">Art der Mitgliedschaft</label>
              <select id="membershipKind" name="membershipKind" defaultValue="">
                <option value="" disabled>
                  Bitte auswaehlen
                </option>
                <option value="adult_active">Erwachsene aktiv</option>
                <option value="adult_passive">Erwachsene passiv</option>
                <option value="adult_child">Erwachsene + 1 Kind</option>
                <option value="partner_active">Ehepartner aktiv</option>
                <option value="partner_passive">Ehepartner passiv</option>
                <option value="family">Familie</option>
                <option value="child">Kind bis 14</option>
                <option value="youth_active">Jugendliche aktiv</option>
                <option value="youth_passive">Jugendliche passiv</option>
                <option value="student_active">Schueler/Azubi/Student aktiv</option>
                <option value="student_passive">Schueler/Azubi/Student passiv</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="studentStatusUntil">Nachweis gueltig bis</label>
              <input id="studentStatusUntil" name="studentStatusUntil" type="date" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Hinweise fuer die Vereinsverwaltung</label>
            <textarea id="notes" name="notes" rows={4} />
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.25rem" }}>Einwilligungen</h2>
            <div className="checkbox-group">
              <label className="checkbox">
                <input type="checkbox" name="acceptsStatutes" />
                <span>Ich habe Satzung, Beitragsordnung und Vereinsregeln zur Kenntnis genommen.</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" name="acceptsPrivacy" />
                <span>Ich habe die Datenschutzhinweise zur Kenntnis genommen.</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" name="acceptsPhotoVideo" />
                <span>Ich willige in Foto- und Videoaufnahmen ein.</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" name="acceptsWhatsapp" />
                <span>Ich moechte in vereinsbezogene WhatsApp-Gruppen aufgenommen werden.</span>
              </label>
              <label className="checkbox">
                <input type="checkbox" name="acceptsSepa" />
                <span>Ich stimme dem SEPA-Lastschriftverfahren zu.</span>
              </label>
            </div>
          </div>

          <div className="cta-row">
            <button className="button" type="submit">
              Prototypisch absenden
            </button>
            <span className="pill">Speicherung wird als naechstes angeschlossen</span>
          </div>
        </form>
      </section>
    </main>
  );
}
