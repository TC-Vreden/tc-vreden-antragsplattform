"use client";

import { FormEvent, useState } from "react";
import type { ApplicationMatchSummary } from "@/lib/application-types";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; id: string; match?: ApplicationMatchSummary }
  | { kind: "error"; message: string };

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);

  if (!iban) {
    return true;
  }

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) {
    return false;
  }

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  const numeric = rearranged.replace(/[A-Z]/g, (character) =>
    String(character.charCodeAt(0) - 55)
  );

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1;
}

const membershipOptions = [
  { value: "adult_active", label: "Erwachsene aktiv" },
  { value: "adult_passive", label: "Erwachsene passiv" },
  { value: "adult_child", label: "Erwachsene + 1 Kind" },
  { value: "partner_active", label: "Ehepartner aktiv" },
  { value: "partner_passive", label: "Ehepartner passiv" },
  { value: "family", label: "Familie" },
  { value: "child", label: "Kind bis 14" },
  { value: "youth_active", label: "Jugendliche aktiv" },
  { value: "youth_passive", label: "Jugendliche passiv" },
  { value: "student_active", label: "Schueler/Azubi/Student aktiv" },
  { value: "student_passive", label: "Schueler/Azubi/Student passiv" }
];

export function ApplicationForm() {
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const [familyMode, setFamilyMode] = useState(false);
  const [iban, setIban] = useState("");
  const [acceptsSepa, setAcceptsSepa] = useState(false);
  const [accountHolderDiffers, setAccountHolderDiffers] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const childFirstName = String(formData.get("childFirstName") || "").trim();
    const childLastName = String(formData.get("childLastName") || "").trim();
    const childBirthDate = String(formData.get("childBirthDate") || "").trim();
    const childEmail = String(formData.get("childEmail") || "").trim();

    const familyMembers =
      childFirstName || childLastName || childBirthDate || childEmail
        ? [
            {
              firstName: childFirstName,
              lastName: childLastName,
              birthDate: childBirthDate,
              email: childEmail
            }
          ]
        : [];

    const street = String(formData.get("street") || "").trim();
    const postalCode = String(formData.get("postalCode") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const accountHolderAddressInput = String(formData.get("accountHolderAddress") || "").trim();
    const fallbackAddress = [street, postalCode, city].filter(Boolean).join(", ");

    const payload = {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      birthDate: String(formData.get("birthDate") || ""),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      mobile: String(formData.get("mobile") || "").trim(),
      street,
      postalCode,
      city,
      membershipKind: String(formData.get("membershipKind") || ""),
      familyMembers,
      acceptsStatutes: Boolean(formData.get("acceptsStatutes")),
      acceptsPrivacy: Boolean(formData.get("acceptsPrivacy")),
      acceptsPhotoVideo: Boolean(formData.get("acceptsPhotoVideo")),
      acceptsWhatsapp: Boolean(formData.get("acceptsWhatsapp")),
      acceptsSepa: Boolean(formData.get("acceptsSepa")),
      iban: normalizeIban(String(formData.get("iban") || "")),
      accountHolder: String(formData.get("accountHolder") || "").trim(),
      accountHolderAddress:
        accountHolderDiffers && accountHolderAddressInput
          ? accountHolderAddressInput
          : fallbackAddress,
      notes: String(formData.get("notes") || "").trim()
    };

    if (!isValidIban(payload.iban)) {
      setState({
        kind: "error",
        message: "Die IBAN ist formal ungueltig. Bitte pruefe die Eingabe."
      });
      return;
    }

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as {
        message?: string;
        application?: { id: string };
        ebusyMatch?: ApplicationMatchSummary;
      };

      if (!response.ok || !data.application?.id) {
        throw new Error(data.message || "Der Antrag konnte nicht gespeichert werden.");
      }

      form.reset();
      setFamilyMode(false);
      setIban("");
      setAcceptsSepa(false);
      setAccountHolderDiffers(false);
      setState({ kind: "success", id: data.application.id, match: data.ebusyMatch });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Der Antrag konnte nicht gespeichert werden."
      });
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="firstName">Vorname*</label>
          <input id="firstName" name="firstName" required />
        </div>
        <div className="field">
          <label htmlFor="lastName">Nachname*</label>
          <input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="birthDate">Geburtsdatum</label>
          <input id="birthDate" name="birthDate" type="date" />
        </div>
        <div className="field">
          <label htmlFor="email">E-Mail*</label>
          <input id="email" name="email" type="email" required />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="phone">Telefon</label>
          <input id="phone" name="phone" />
        </div>
        <div className="field">
          <label htmlFor="mobile">Mobil*</label>
          <input id="mobile" name="mobile" required />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="street">Strasse*</label>
          <input id="street" name="street" required />
        </div>
        <div className="field">
          <label htmlFor="postalCode">PLZ*</label>
          <input id="postalCode" name="postalCode" required />
        </div>
      </div>

      <div className="field">
        <label htmlFor="city">Ort*</label>
        <input id="city" name="city" required />
      </div>

      <div className="field">
        <label htmlFor="membershipKind">Art der Mitgliedschaft*</label>
        <select
          id="membershipKind"
          name="membershipKind"
          required
          defaultValue=""
          onChange={(event) =>
            setFamilyMode(["adult_child", "family"].includes(event.target.value))
          }
        >
          <option value="" disabled>
            Bitte auswaehlen
          </option>
          {membershipOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.15rem" }}>SEPA-Lastschrift</h2>
        <p>
          Aus Gruenden der Verwaltungsvereinfachung werden die Mitgliedsbeitraege im
          Lastschriftverfahren erhoben. Diese Angaben gehoeren daher direkt zur Anmeldung.
        </p>
        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Text zum SEPA-Lastschriftmandat anzeigen
          </summary>
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            <p>
              Ich ermaechtige den Tennisclub Vreden e.V., Zahlungen von meinem Konto mittels SEPA
              Basis Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die vom
              Tennisclub Vreden e.V. auf mein Konto gezogenen SEPA Basis Lastschriften
              einzuloesen.
            </p>
            <p>
              Das Mandat gilt fuer wiederkehrende Zahlungen im Rahmen der Mitgliedschaft. Die
              Mandatsreferenz wird spaeter vom Verein vergeben. Die Glaeubiger-ID des Vereins
              lautet <strong>DE34ZZZ000024060600</strong>.
            </p>
          </div>
        </details>
        <div className="checkbox-group" style={{ marginBottom: 16 }}>
          <label className="checkbox">
            <input
              type="checkbox"
              name="acceptsSepa"
              checked={acceptsSepa}
              required
              onChange={(event) => setAcceptsSepa(event.target.checked)}
            />
            <span>Ich stimme dem SEPA-Lastschriftverfahren zu.*</span>
          </label>
        </div>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="accountHolder">Kontoinhaber*</label>
            <input id="accountHolder" name="accountHolder" required={acceptsSepa} />
          </div>
          <div className="field">
            <label htmlFor="iban">IBAN*</label>
            <input
              id="iban"
              name="iban"
              value={iban}
              onChange={(event) => setIban(event.target.value)}
              inputMode="text"
              required={acceptsSepa}
            />
          </div>
        </div>
        <div className="checkbox-group" style={{ marginTop: 12 }}>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={accountHolderDiffers}
              onChange={(event) => setAccountHolderDiffers(event.target.checked)}
            />
            <span>Der Kontoinhaber hat eine andere Anschrift als der Antragsteller.</span>
          </label>
        </div>
        {accountHolderDiffers ? (
          <div className="field">
            <label htmlFor="accountHolderAddress">Anschrift des Kontoinhabers*</label>
            <input
              id="accountHolderAddress"
              name="accountHolderAddress"
              required={acceptsSepa && accountHolderDiffers}
            />
          </div>
        ) : (
          <p style={{ marginTop: 12, color: "var(--muted)" }}>
            Wenn hier nichts abweicht, verwendet das System fuer den Kontoinhaber die oben
            angegebene Anschrift des Antragstellers.
          </p>
        )}
      </div>

      {familyMode ? (
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: "1.15rem" }}>Zugeordnetes Kind / Familienbezug</h2>
          <p>
            Dieser Abschnitt ist wichtig fuer spaetere Familien- und Kinderlogik. So koennen wir
            spaeter in eBuSy sauber zwischen Hauptzahler, Kind und Familienmodell unterscheiden.
          </p>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="childFirstName">Vorname Kind</label>
              <input id="childFirstName" name="childFirstName" />
            </div>
            <div className="field">
              <label htmlFor="childLastName">Nachname Kind</label>
              <input id="childLastName" name="childLastName" />
            </div>
          </div>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="childBirthDate">Geburtsdatum Kind</label>
              <input id="childBirthDate" name="childBirthDate" type="date" />
            </div>
            <div className="field">
              <label htmlFor="childEmail">E-Mail Kind</label>
              <input id="childEmail" name="childEmail" type="email" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="notes">Hinweise fuer die Vereinsverwaltung</label>
        <textarea id="notes" name="notes" rows={4} />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.25rem" }}>Einwilligungen</h2>
        <div className="checkbox-group">
          <label className="checkbox">
            <input type="checkbox" name="acceptsStatutes" required />
            <span>Ich habe Satzung, Beitragsordnung und Vereinsregeln zur Kenntnis genommen.*</span>
          </label>
          <details style={{ margin: "-4px 0 8px 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Satzung, Beitragsordnung und Vereinsregeln anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              <p>
                Mit der Bestaetigung erkennst du Satzung, Beitragsordnung,
                Platzpflegeordnung und die Datenschutzbestimmungen des Tennisclub Vreden e.V. als
                verbindlich an.
              </p>
              <p>
                Der Antrag weist ausserdem auf folgende Regeln hin: Eintritt im ersten
                Kalenderhalbjahr = voller Jahresbeitrag, Eintritt im zweiten Kalenderhalbjahr =
                anteilige Berechnung. Reduzierte Beitraege fuer Schueler, Studierende und Azubis
                setzen einen jaehrlich vorzulegenden gueltigen Nachweis voraus.
              </p>
              <p>
                Der Austritt kann gemaess Satzung nur zum Jahresende erfolgen und muss spaetestens
                drei Monate vorher schriftlich erklaert werden. Mitgliedsbeitraege werden
                grundsaetzlich per Lastschrift eingezogen.
              </p>
            </div>
          </details>
          <label className="checkbox">
            <input type="checkbox" name="acceptsPrivacy" required />
            <span>Ich habe die Datenschutzhinweise zur Kenntnis genommen.*</span>
          </label>
          <details style={{ margin: "-4px 0 8px 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Datenschutzhinweise anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              <p>
                Verantwortlich fuer die Datenverarbeitung ist der Vorstand des Tennisclub Vreden
                e.V. Die Daten werden ausschliesslich fuer Begruendung, Durchfuehrung und
                Beendigung der Mitgliedschaft, gesetzliche Pflichten und berechtigte
                Vereinsinteressen verarbeitet.
              </p>
              <p>
                Verarbeitet werden insbesondere Name, Anschrift, Kontaktdaten, Bankverbindung,
                Geburtsdatum, Familienangaben, Statusangaben, Eintritts- und Austrittsdatum sowie
                Vereinsfunktionen. Daten koennen bei Bedarf an Verbaende, Behoerden, Steuerberater
                oder Vereinsdienstleister weitergegeben werden.
              </p>
              <p>
                Nach Ende der Mitgliedschaft werden Daten unter Beachtung gesetzlicher
                Aufbewahrungsfristen geloescht. Du hast Rechte auf Auskunft, Berichtigung,
                Loeschung, Einschraenkung, Widerspruch und Beschwerde. Einwilligungen koennen fuer
                die Zukunft widerrufen werden.
              </p>
            </div>
          </details>
          <label className="checkbox">
            <input type="checkbox" name="acceptsPhotoVideo" />
            <span>Ich willige in Foto- und Videoaufnahmen ein.</span>
          </label>
          <details style={{ margin: "-4px 0 8px 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Hinweise zu Foto- und Videoaufnahmen anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              <p>
                Der Verein darf im Rahmen von Vereinsveranstaltungen, Trainingseinheiten,
                Wettkaempfen und sonstigen Vereinsaktivitaeten Foto- und Videoaufnahmen anfertigen
                und fuer Website, soziale Netzwerke, Vereinshefte, Aushaenge, Presseberichte oder
                Anzeigen verwenden.
              </p>
              <p>
                Dir ist bekannt, dass Aufnahmen im Internet weltweit abrufbar sind und von Dritten
                gespeichert oder weiterverwendet werden koennen. Eine vollstaendige Loeschung im
                Internet kann nicht garantiert werden.
              </p>
              <p>
                Die Einwilligung ist freiwillig, zeitlich unbefristet und kann jederzeit fuer die
                Zukunft widerrufen werden. Bei Minderjaehrigen erklaeren die Erziehungsberechtigten
                die Einwilligung fuer das Kind.
              </p>
            </div>
          </details>
          <label className="checkbox">
            <input type="checkbox" name="acceptsWhatsapp" />
            <span>Ich moechte in vereinsbezogene WhatsApp-Gruppen aufgenommen werden.</span>
          </label>
          <details style={{ margin: "-4px 0 0 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Hinweise zur WhatsApp-Gruppe anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              <p>
                Die WhatsApp-Gruppen dienen der internen Kommunikation, insbesondere fuer
                Spielbetrieb, Trainingsorganisation, Vereinsinformationen und kurzfristige
                organisatorische Hinweise.
              </p>
              <p>
                Wenn du zustimmst, ist deine Mobilfunknummer fuer andere Gruppenmitglieder
                sichtbar. WhatsApp ist ein Dienst eines Drittanbieters; personenbezogene Daten
                koennen auch ausserhalb der EU verarbeitet werden.
              </p>
              <p>
                Die Einwilligung ist freiwillig, fuer die Mitgliedschaft nicht erforderlich und
                kann jederzeit fuer die Zukunft widerrufen werden.
              </p>
            </div>
          </details>
        </div>
      </div>

      <div className="cta-row">
        <button className="button" type="submit" disabled={state.kind === "submitting"}>
          {state.kind === "submitting" ? "Antrag wird gespeichert..." : "Antrag absenden"}
        </button>
        {state.kind === "submitting" ? <span className="pill">Speicherung laeuft...</span> : null}
      </div>

      {state.kind === "success" ? (
        <div className="result-box is-success">
          <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Antrag gespeichert</h3>
          <p>
            Der Antrag wurde in der internen Verwaltung abgelegt. Interne Vorgangs-ID:{" "}
            <strong>{state.id}</strong>
          </p>
          {state.match ? (
            <p style={{ marginTop: 10 }}>
              eBuSy-Status direkt nach dem Speichern: <strong>{state.match.status}</strong>.{" "}
              {state.match.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="result-box is-empty">
          <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Speicherung fehlgeschlagen</h3>
          <p>{state.message}</p>
        </div>
      ) : null}
    </form>
  );
}
