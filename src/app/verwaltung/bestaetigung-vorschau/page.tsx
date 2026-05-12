import Link from "next/link";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import {
  clubContact,
  confirmationDocumentVersion,
  confirmationLegalSections,
  confirmationMailPreview,
  confirmationPreviewApplication,
  formatConsent,
  formatGermanDate,
  formatGermanDateTime,
  getConfirmationConsentEvidence
} from "@/lib/confirmation-document";
import styles from "./confirmation-preview.module.css";
import { PrintButton } from "./print-button";

function Field({
  label,
  value,
  wide = false,
  full = false
}: {
  label: string;
  value: string;
  wide?: boolean;
  full?: boolean;
}) {
  const className = [
    styles.field,
    wide ? styles.fieldWide : "",
    full ? styles.fieldFull : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

export default function ConfirmationPreviewPage() {
  const application = confirmationPreviewApplication;
  const mainPersonName = `${application.mainPerson.salutation} ${application.mainPerson.firstName} ${application.mainPerson.lastName}`;
  const consentEvidence = getConfirmationConsentEvidence(application);

  return (
    <main className="page-shell">
      <section className={`card ${styles.previewShell}`}>
        <div className={`${styles.toolbar} ${styles.noPrint}`}>
          <div>
            <TcVredenLogo />
            <span className="eyebrow">Interner Bereich</span>
            <h1 className="page-title">Bestätigungsvorschau</h1>
            <p>
              Optischer Test für die spätere PDF-Zusammenfassung und HTML-Mail. Es wird
              noch kein PDF gespeichert und keine E-Mail versendet.
            </p>
          </div>
          <div className={styles.toolbarActions}>
            <Link className="button secondary" href="/verwaltung">
              Zurück zur Verwaltung
            </Link>
            <PrintButton />
          </div>
        </div>

        <article className={`hint-box ${styles.noPrint}`}>
          <strong>Arbeitsstand</strong>
          <p style={{ margin: "10px 0 0" }}>
            Diese Vorschau nutzt vollständig ausgefüllte Testdaten. Sie bildet den Zielzustand
            nach interner Prüfung und erfolgreicher eBuSy-Übernahme ab: erst dann sollen PDF,
            Bestätigungs-E-Mail, PDF-Anhang und BCC an die Vereinsadresse ausgelöst werden.
          </p>
        </article>

        <div className={styles.previewGrid}>
          <article className={styles.documentPage} aria-label="PDF-Vorschau">
            <header className={styles.documentHeader}>
              <div className={styles.logoBox}>
                <TcVredenLogo />
              </div>
              <div>
                <span className={styles.documentKicker}>Nachweis Mitgliedsantrag</span>
                <h2 className={styles.documentTitle}>
                  Zusammenfassung zur Mitgliedschaft beim TennisClub Vreden e.V.
                </h2>
                <p className={styles.metaLine}>
                  Vorgang: {application.processId} · Textversion: {confirmationDocumentVersion}
                </p>
                <p className={styles.metaLine}>
                  Antrag gestellt: {formatGermanDateTime(application.applicationCreatedAt)} ·
                  Intern freigegeben: {formatGermanDateTime(application.approvedAt)}
                </p>
              </div>
            </header>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Hauptperson</h3>
              <div className={styles.fieldGrid}>
                <Field label="Anrede" value={application.mainPerson.salutation} />
                <Field label="Vorname" value={application.mainPerson.firstName} />
                <Field label="Nachname" value={application.mainPerson.lastName} />
                <Field label="Geburtsdatum" value={formatGermanDate(application.mainPerson.birthDate)} />
                <Field label="E-Mail" value={application.mainPerson.email} wide />
                <Field label="Mobil" value={application.mainPerson.mobile} />
                <Field label="Telefon" value={application.mainPerson.phone ?? "-"} />
                <Field
                  label="Adresse"
                  value={`${application.mainPerson.street}, ${application.mainPerson.postalCode} ${application.mainPerson.city}`}
                  full
                />
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Mitgliedschaft und Beitrag</h3>
              <div className={styles.fieldGrid}>
                <Field label="Auswahl" value={application.membershipLabel} wide />
                <Field label="eBuSy-Personen" value={application.ebusyPersonIds.join(", ")} />
                <Field label="Beitragshinweis" value={application.contributionNote} full />
                <Field label="Jugendtraining" value={application.youthTrainingNote} full />
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Weitere Personen im Antrag</h3>
              <div className={styles.peopleList}>
                {application.additionalPeople.map((person) => (
                  <article className={styles.personCard} key={`${person.role}-${person.firstName}`}>
                    <div className={styles.personHeader}>
                      <strong>{person.firstName} {person.lastName}</strong>
                      <span className={styles.badge}>{person.role}</span>
                    </div>
                    <div className={styles.fieldGrid}>
                      <Field label="Anrede" value={person.salutation} />
                      <Field label="Geburtsdatum" value={formatGermanDate(person.birthDate)} />
                      <Field label="Mobil" value={person.mobile} />
                      <Field label="E-Mail" value={person.email} wide />
                      <Field
                        label="Adresse"
                        value={`${person.street}, ${person.postalCode} ${person.city}`}
                        full
                      />
                      <Field label="Zuordnung" value={person.membershipNote} full />
                      {person.legalRepresentative ? (
                        <Field label="Gesetzliche Vertreter" value={person.legalRepresentative} full />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>SEPA und Zahlung</h3>
              <div className={styles.fieldGrid}>
                <Field label="Kontoinhaber" value={application.bankAccount.holder} />
                <Field label="IBAN" value={application.bankAccount.iban} />
                <Field label="Kreditinstitut" value={application.bankAccount.bank} />
                <Field label="Anschrift Kontoinhaber" value={application.bankAccount.holderAddress} wide />
                <Field label="Mandatsdatum" value={formatGermanDate(application.bankAccount.mandateDate)} />
                <Field label="SEPA-Mandat bestätigt" value={formatConsent(application.consent.sepa)} />
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Bestätigte Einwilligungen</h3>
              <div className={styles.consentList}>
                {consentEvidence.map((evidence) => (
                  <article className={styles.consentItem} key={evidence.key}>
                    <span
                      className={
                        evidence.checked ? styles.consentCheck : styles.consentEmpty
                      }
                      aria-hidden="true"
                    >
                      {evidence.checked ? "✓" : "–"}
                    </span>
                    <div>
                      <strong>{evidence.title}</strong>
                      <p className={styles.textBlock}>{evidence.text}</p>
                      <p className={styles.consentMeta}>
                        {evidence.checked && evidence.confirmedAt
                          ? `Aktiv bestätigt am ${formatGermanDateTime(
                              evidence.confirmedAt
                            )} durch ${evidence.confirmedBy}.`
                          : "Nicht bestätigt."}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <div className={`${styles.fieldGrid} ${styles.consentNotes}`}>
                <Field label="Hinweise" value={application.notes} full />
              </div>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Rechtliche Hinweise aus den Vereinsunterlagen</h3>
              <div className={styles.legalList}>
                {confirmationLegalSections.map((section) => (
                  <article className={styles.legalItem} key={section.title}>
                    <strong>{section.title}</strong>
                    <p className={styles.textBlock}>{section.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <footer className={styles.documentFooter}>
              <strong>{clubContact.name}</strong> · {clubContact.address}
              <br />
              {clubContact.email} · {clubContact.website}
              <br />
              Satzung: {clubContact.statutesUrl}
            </footer>
          </article>

          <aside className={styles.mailPreview} aria-label="HTML-Mail-Vorschau">
            <div className={styles.mailHeader}>
              <span className={styles.documentKicker}>HTML-Mail</span>
              <h2 className={styles.mailSubject}>{confirmationMailPreview.subject}</h2>
              <p className={styles.metaLine}>BCC: {confirmationMailPreview.bcc}</p>
            </div>
            <div className={styles.mailBody}>
              <p>Hallo {mainPersonName},</p>
              <p>{confirmationMailPreview.intro}</p>
              <div className={styles.mailInfo}>
                <strong>PDF-Zusammenfassung im Anhang</strong>
                <p style={{ margin: "8px 0 0" }}>{confirmationMailPreview.attachmentNote}</p>
              </div>
              <p>
                Ausgewählte Mitgliedschaft: <strong>{application.membershipLabel}</strong>
              </p>
              <p>
                Freigabe durch die Vereinsverwaltung:{" "}
                <strong>{formatGermanDateTime(application.approvedAt)}</strong>
              </p>
              <p>{confirmationMailPreview.revocationNote}</p>
              <p>
                Bei Fragen erreichst du uns unter{" "}
                <a href={`mailto:${clubContact.email}`}>{clubContact.email}</a>.
              </p>
              <p>
                Viele Grüße
                <br />
                {clubContact.name}
              </p>
              <p className={styles.sourceNote}>
                Diese Mail ist eine Vorschau. Der echte Versand wird erst später nach erfolgreicher
                eBuSy-Übernahme aktiviert.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
