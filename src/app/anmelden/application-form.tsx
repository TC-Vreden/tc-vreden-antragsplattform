"use client";

import { FormEvent, useState } from "react";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; id: string }
  | { kind: "error"; message: string };

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
      studentStatusUntil: String(formData.get("studentStatusUntil") || ""),
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
      };

      if (!response.ok || !data.application?.id) {
        throw new Error(data.message || "Der Antrag konnte nicht gespeichert werden.");
      }

      form.reset();
      setFamilyMode(false);
      setState({ kind: "success", id: data.application.id });
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
          <label htmlFor="firstName">Vorname</label>
          <input id="firstName" name="firstName" required />
        </div>
        <div className="field">
          <label htmlFor="lastName">Nachname</label>
          <input id="lastName" name="lastName" required />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="birthDate">Geburtsdatum</label>
          <input id="birthDate" name="birthDate" type="date" />
        </div>
        <div className="field">
          <label htmlFor="email">E-Mail</label>
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

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="membershipKind">Art der Mitgliedschaft</label>
          <select
            id="membershipKind"
            name="membershipKind"
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

        <div className="field">
          <label htmlFor="studentStatusUntil">Nachweis gueltig bis</label>
          <input id="studentStatusUntil" name="studentStatusUntil" type="date" />
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
        <div className="checkbox-group">
          <label className="checkbox">
            <input type="checkbox" name="acceptsStatutes" required />
            <span>Ich habe Satzung, Beitragsordnung und Vereinsregeln zur Kenntnis genommen.</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="acceptsPrivacy" required />
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

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="accountHolder">Kontoinhaber</label>
          <input id="accountHolder" name="accountHolder" />
        </div>
        <div className="field">
          <label htmlFor="iban">IBAN</label>
          <input id="iban" name="iban" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="accountHolderAddress">Anschrift des Kontoinhabers</label>
        <input id="accountHolderAddress" name="accountHolderAddress" />
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
