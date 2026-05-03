"use client";

import { FormEvent, useState } from "react";
import type { ApplicationMatchSummary } from "@/lib/application-types";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; id: string; match?: ApplicationMatchSummary }
  | { kind: "error"; message: string };

function isValidIban(value: string) {
  const iban = value.replace(/\s+/g, "").toUpperCase();

  if (!iban) {
    return true;
  }

  if (!/^DE\d{20}$/.test(iban)) {
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

    const payload = {
      firstName: String(formData.get("firstName") || ""),
      lastName: String(formData.get("lastName") || ""),
      birthDate: String(formData.get("birthDate") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      mobile: String(formData.get("mobile") || ""),
      street: String(formData.get("street") || ""),
      postalCode: String(formData.get("postalCode") || ""),
      city: String(formData.get("city") || ""),
      membershipKind: String(formData.get("membershipKind") || ""),
      familyMembers,
      acceptsStatutes: Boolean(formData.get("acceptsStatutes")),
      acceptsPrivacy: Boolean(formData.get("acceptsPrivacy")),
      acceptsPhotoVideo: Boolean(formData.get("acceptsPhotoVideo")),
      acceptsWhatsapp: Boolean(formData.get("acceptsWhatsapp")),
      acceptsSepa: Boolean(formData.get("acceptsSepa")),
      iban: String(formData.get("iban") || ""),
      accountHolder: String(formData.get("accountHolder") || ""),
      accountHolderAddress: String(formData.get("accountHolderAddress") || ""),
      notes: String(formData.get("notes") || "")
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
          <label htmlFor="mobile">Mobil</label>
          <input id="mobile" name="mobile" />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="street">Strasse</label>
          <input id="street" name="street" />
        </div>
        <div className="field">
          <label htmlFor="postalCode">PLZ</label>
          <input id="postalCode" name="postalCode" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="city">Ort</label>
        <input id="city" name="city" />
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
            Ich ermaechtige den Tennisclub Vreden e.V., Zahlungen fuer Mitgliedsbeitraege mittels
            Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die vom
            Tennisclub Vreden e.V. auf mein Konto gezogenen Lastschriften einzuloesen. Das Mandat
            gilt fuer wiederkehrende Zahlungen im Rahmen der Vereinsmitgliedschaft.
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
              placeholder="DE..."
              required={acceptsSepa}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="accountHolderAddress">Anschrift des Kontoinhabers*</label>
          <input id="accountHolderAddress" name="accountHolderAddress" required={acceptsSepa} />
        </div>
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
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Satzung, Beitragsordnung und Vereinsregeln anzeigen
          </summary>
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            Mit der Bestaetigung erklaerst du, dass du die Satzung, die Beitragsordnung und die
            fuer den Spiel- und Vereinsbetrieb geltenden Regelungen des Tennisclub Vreden e.V. zur
            Kenntnis genommen hast und anerkennst.
          </div>
        </details>
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Datenschutzhinweise anzeigen
          </summary>
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            Deine Daten werden fuer die Begruendung und Verwaltung der Mitgliedschaft, fuer die
            Beitragsabwicklung sowie fuer vereinsbezogene Kommunikation verarbeitet. Die
            ausfuehrlichen Datenschutzinformationen des Vereins muessen vor dem Absenden zur
            Kenntnis genommen werden.
          </div>
        </details>
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Hinweise zu Foto- und Videoaufnahmen anzeigen
          </summary>
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            Die Einwilligung in Foto- und Videoaufnahmen ist freiwillig. Bilder oder Videos koennen
            fuer Vereinskommunikation, Website, Social Media oder Pressearbeit genutzt werden. Ein
            Widerruf fuer die Zukunft bleibt moeglich.
          </div>
        </details>
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Hinweise zur WhatsApp-Gruppe anzeigen
          </summary>
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            Die Aufnahme in vereinsbezogene WhatsApp-Gruppen ist freiwillig, fuer die praktische
            Kommunikation im Vereinsalltag aber oft sinnvoll. Bei WhatsApp gelten die
            Datenschutzbedingungen des Anbieters. Ein Austritt oder Widerruf ist jederzeit moeglich.
          </div>
        </details>
        <div className="checkbox-group">
          <label className="checkbox">
            <input type="checkbox" name="acceptsStatutes" required />
            <span>Ich habe Satzung, Beitragsordnung und Vereinsregeln zur Kenntnis genommen.*</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="acceptsPrivacy" required />
            <span>Ich habe die Datenschutzhinweise zur Kenntnis genommen.*</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="acceptsPhotoVideo" />
            <span>Ich willige in Foto- und Videoaufnahmen ein.</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="acceptsWhatsapp" />
            <span>Ich moechte in vereinsbezogene WhatsApp-Gruppen aufgenommen werden.</span>
          </label>
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
