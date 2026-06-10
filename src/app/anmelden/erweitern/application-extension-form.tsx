"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ApplicationMatchSummary } from "@/lib/application-types";
import {
  getMembershipExtensionOptions,
  salutationOptions
} from "@/lib/application-options";
import type { ApplicationFormContent } from "@/lib/application-content";
import {
  PHOTO_VIDEO_CONSENT_TEXT,
  PRIVACY_SECTIONS,
  WHATSAPP_CONSENT_TEXT
} from "@/lib/application-legal-content";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; id: string; match?: ApplicationMatchSummary }
  | { kind: "error"; message: string };

type ExtensionPersonKind = "child" | "adult";

type ExtensionPerson = {
  id: string;
  kind: ExtensionPersonKind;
  salutation: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  mobile: string;
  street: string;
  postalCode: string;
  city: string;
  legalRepresentative: string;
};

type MainContactDefaults = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  street: string;
  postalCode: string;
  city: string;
};

type ExtensionConfig = {
  title: string;
  intro: string;
  defaultKind: ExtensionPersonKind;
  allowedKinds: ExtensionPersonKind[];
  minPeople: number;
  maxPeople: number;
  addButtonLabel: string;
};

type ApplicationExtensionFormProps = {
  content: ApplicationFormContent;
};

const emptyMainContactDefaults: MainContactDefaults = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobile: "",
  street: "",
  postalCode: "",
  city: ""
};

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `extension-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function getExistingMemberDisplayName(defaults: MainContactDefaults) {
  return [defaults.firstName.trim(), defaults.lastName.trim()].filter(Boolean).join(" ");
}

function getExtensionConfig(membershipKind: string): ExtensionConfig | null {
  switch (membershipKind) {
    case "adult_child":
      return {
        title: "Kind hinzufügen",
        intro:
          "Für diese Erweiterung können ein oder mehrere Kinder zur bestehenden Mitgliedschaft erfasst werden.",
        defaultKind: "child",
        allowedKinds: ["child"],
        minPeople: 1,
        maxPeople: Number.POSITIVE_INFINITY,
        addButtonLabel: "+ Kind hinzufügen"
      };
    case "partner_active":
    case "partner_passive":
      return {
        title: "Erwachsene Person hinzufügen",
        intro:
          "Für diese Erweiterung wird ein Ehepartner oder eingetragener Lebenspartner mit eigener E-Mail-Adresse und Mobilnummer erfasst.",
        defaultKind: "adult",
        allowedKinds: ["adult"],
        minPeople: 1,
        maxPeople: 1,
        addButtonLabel: "+ Erwachsene Person hinzufügen"
      };
    case "family":
      return {
        title: "Familienmitglied hinzufügen",
        intro:
          "Für eine Familienerweiterung können mehrere Kinder oder erwachsene Familienmitglieder nacheinander erfasst werden.",
        defaultKind: "child",
        allowedKinds: ["child", "adult"],
        minPeople: 1,
        maxPeople: Number.POSITIVE_INFINITY,
        addButtonLabel: "+ Person hinzufügen"
      };
    default:
      return null;
  }
}

function getRelation(kind: ExtensionPersonKind, membershipKind: string) {
  if (kind === "child") {
    return "child";
  }

  return membershipKind === "family" ? "family_member" : "partner";
}

function createExtensionPerson(
  kind: ExtensionPersonKind,
  defaults: MainContactDefaults
): ExtensionPerson {
  return {
    id: createId(),
    kind,
    salutation: "",
    firstName: "",
    lastName: defaults.lastName,
    birthDate: "",
    email: kind === "adult" ? "" : "",
    mobile: kind === "adult" ? "" : "",
    street: defaults.street,
    postalCode: defaults.postalCode,
    city: defaults.city,
    legalRepresentative: kind === "child" ? getExistingMemberDisplayName(defaults) : ""
  };
}

function normalizeExtensionPersonForKind(
  person: ExtensionPerson,
  kind: ExtensionPersonKind,
  defaults: MainContactDefaults
): ExtensionPerson {
  return {
    ...person,
    kind,
    email: kind === "adult" ? person.email : "",
    mobile: kind === "adult" ? person.mobile : "",
    legalRepresentative:
      kind === "child" ? person.legalRepresentative || getExistingMemberDisplayName(defaults) : ""
  };
}

export function ApplicationExtensionForm({ content }: ApplicationExtensionFormProps) {
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const [membershipKind, setMembershipKind] = useState("");
  const [people, setPeople] = useState<ExtensionPerson[]>([]);
  const [mainDefaults, setMainDefaults] = useState<MainContactDefaults>(
    emptyMainContactDefaults
  );

  const extensionOptions = useMemo(
    () => getMembershipExtensionOptions(content.membershipOptions),
    [content.membershipOptions]
  );
  const extensionConfig = getExtensionConfig(membershipKind);

  function updateMainDefault(field: keyof MainContactDefaults, value: string) {
    setMainDefaults((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleMembershipChange(nextValue: string) {
    const nextConfig = getExtensionConfig(nextValue);

    setMembershipKind(nextValue);
    setPeople(nextConfig ? [createExtensionPerson(nextConfig.defaultKind, mainDefaults)] : []);
  }

  function addPerson() {
    if (!extensionConfig) {
      return;
    }

    setPeople((current) => {
      if (current.length >= extensionConfig.maxPeople) {
        return current;
      }

      return [
        ...current,
        createExtensionPerson(extensionConfig.defaultKind, mainDefaults)
      ];
    });
  }

  function removePerson(personId: string) {
    setPeople((current) => current.filter((person) => person.id !== personId));
  }

  function updatePerson<K extends keyof ExtensionPerson>(
    personId: string,
    field: K,
    value: ExtensionPerson[K]
  ) {
    setPeople((current) =>
      current.map((person) =>
        person.id === personId
          ? {
              ...person,
              [field]: value
            }
          : person
      )
    );
  }

  function changePersonKind(personId: string, kind: ExtensionPersonKind) {
    setPeople((current) =>
      current.map((person) =>
        person.id === personId
          ? normalizeExtensionPersonForKind(person, kind, mainDefaults)
          : person
      )
    );
  }

  function copyAddressToPerson(personId: string) {
    setPeople((current) =>
      current.map((person) =>
        person.id === personId
          ? {
              ...person,
              street: mainDefaults.street,
              postalCode: mainDefaults.postalCode,
              city: mainDefaults.city,
              legalRepresentative:
                person.kind === "child"
                  ? person.legalRepresentative || getExistingMemberDisplayName(mainDefaults)
                  : person.legalRepresentative
            }
          : person
      )
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedMembershipKind = String(formData.get("membershipKind") || "");
    const activeConfig = getExtensionConfig(selectedMembershipKind);

    if (!activeConfig) {
      setState({
        kind: "error",
        message: "Bitte eine Erweiterungsart auswählen."
      });
      return;
    }

    if (people.length < activeConfig.minPeople) {
      setState({
        kind: "error",
        message: "Bitte mindestens eine hinzuzufügende Person erfassen."
      });
      return;
    }

    const familyMembers = people.map((person) => ({
      relation: getRelation(person.kind, selectedMembershipKind),
      salutation: person.salutation,
      firstName: person.firstName.trim(),
      lastName: person.lastName.trim(),
      birthDate: person.birthDate,
      email: person.kind === "adult" ? person.email.trim() : "",
      mobile: person.kind === "adult" ? person.mobile.trim() : "",
      street: person.street.trim(),
      postalCode: person.postalCode.trim(),
      city: person.city.trim(),
      legalRepresentative:
        person.kind === "child" ? person.legalRepresentative.trim() : ""
    }));

    const payload = {
      requestType: "membership_extension",
      salutation: String(formData.get("salutation") || "").trim(),
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      birthDate: String(formData.get("birthDate") || ""),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      mobile: String(formData.get("mobile") || "").trim(),
      street: String(formData.get("street") || "").trim(),
      postalCode: String(formData.get("postalCode") || "").trim(),
      city: String(formData.get("city") || "").trim(),
      membershipKind: selectedMembershipKind,
      studentStatusUntil: "",
      familyMembers,
      acceptsStatutes: Boolean(formData.get("acceptsStatutes")),
      acceptsPrivacy: Boolean(formData.get("acceptsPrivacy")),
      acceptsPhotoVideo: Boolean(formData.get("acceptsPhotoVideo")),
      acceptsWhatsapp: Boolean(formData.get("acceptsWhatsapp")),
      acceptsSepa: false,
      isMinorApplicant: false,
      guardianName: "",
      guardianEmail: "",
      guardianPhone: "",
      guardianConsent: false,
      iban: "",
      accountHolder: "",
      accountHolderAddress: "",
      notes: String(formData.get("notes") || "").trim()
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
        ebusyMatch?: ApplicationMatchSummary;
      };

      if (!response.ok || !data.application?.id) {
        throw new Error(data.message || "Der Antrag konnte nicht gespeichert werden.");
      }

      form.reset();
      setMembershipKind("");
      setPeople([]);
      setMainDefaults(emptyMainContactDefaults);
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
      <div className="field">
        <label htmlFor="membershipKind">Gewünschte Erweiterung*</label>
        <select
          id="membershipKind"
          name="membershipKind"
          required
          value={membershipKind}
          onChange={(event) => handleMembershipChange(event.target.value)}
        >
          <option value="" disabled>
            Bitte auswählen
          </option>
          {extensionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <details style={{ margin: "0 0 18px" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          Mitgliedsbeiträge und wichtige Beitragsregeln anzeigen
        </summary>
        <div style={{ marginTop: 10 }}>
          <table className="table" style={{ marginBottom: 14 }}>
            <thead>
              <tr>
                <th>Art der Mitgliedschaft</th>
                <th>Status</th>
                <th>Jahresbeitrag</th>
              </tr>
            </thead>
            <tbody>
              {content.contributionRows.map((row) => (
                <tr key={`${row.membership}-${row.status}-${row.fee}`}>
                  <td>{row.membership}</td>
                  <td>{row.status || "-"}</td>
                  <td>{row.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: "var(--muted)" }}>
            {content.contributionNotes.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </details>

      <h2 style={{ fontSize: "1.15rem" }}>Bestehendes Hauptmitglied</h2>
      <p style={{ marginTop: -8 }}>
        Diese Angaben helfen dem Verein, die vorhandene eBuSy-Person sicher zuzuordnen. Das
        bestehende Mitglied wird durch diesen Antrag nicht automatisch geändert.
      </p>

      <div className="field">
        <label htmlFor="salutation">Anrede*</label>
        <select id="salutation" name="salutation" required defaultValue="">
          {salutationOptions.map((option) => (
            <option key={option.value} value={option.value} disabled={option.value === ""}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="firstName">Vorname*</label>
          <input
            id="firstName"
            name="firstName"
            required
            onChange={(event) => updateMainDefault("firstName", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Nachname*</label>
          <input
            id="lastName"
            name="lastName"
            required
            onChange={(event) => updateMainDefault("lastName", event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="birthDate">Geburtsdatum*</label>
          <input id="birthDate" name="birthDate" type="date" required />
        </div>
        <div className="field">
          <label htmlFor="email">E-Mail*</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            onChange={(event) => updateMainDefault("email", event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="phone">Festnetz*</label>
          <input
            id="phone"
            name="phone"
            required
            onChange={(event) => updateMainDefault("phone", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="mobile">Mobil*</label>
          <input
            id="mobile"
            name="mobile"
            required
            onChange={(event) => updateMainDefault("mobile", event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="street">Straße*</label>
          <input
            id="street"
            name="street"
            required
            onChange={(event) => updateMainDefault("street", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="postalCode">PLZ*</label>
          <input
            id="postalCode"
            name="postalCode"
            required
            onChange={(event) => updateMainDefault("postalCode", event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="city">Ort*</label>
        <input
          id="city"
          name="city"
          required
          onChange={(event) => updateMainDefault("city", event.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.15rem" }}>
          {extensionConfig?.title ?? "Neu hinzuzufügende Person"}
        </h2>
        <p>
          {extensionConfig?.intro ??
            "Bitte zuerst die gewünschte Erweiterung auswählen. Danach können die hinzuzufügenden Personen erfasst werden."}
        </p>

        {people.map((person, index) => {
          const isChild = person.kind === "child";
          const canChangeKind = (extensionConfig?.allowedKinds.length ?? 0) > 1;

          return (
            <div
              key={person.id}
              style={{
                borderTop: "1px solid var(--border)",
                display: "grid",
                gap: 12,
                marginTop: 16,
                paddingTop: 16
              }}
            >
              <div className="extension-person-header">
                <strong>Person {index + 1}</strong>
                {people.length > (extensionConfig?.minPeople ?? 1) ? (
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => removePerson(person.id)}
                  >
                    Entfernen
                  </button>
                ) : null}
              </div>

              {canChangeKind ? (
                <div className="field">
                  <label htmlFor={`${person.id}-kind`}>Art der Person*</label>
                  <select
                    id={`${person.id}-kind`}
                    value={person.kind}
                    onChange={(event) =>
                      changePersonKind(person.id, event.target.value as ExtensionPersonKind)
                    }
                  >
                    <option value="child">Kind</option>
                    <option value="adult">Erwachsene Person</option>
                  </select>
                </div>
              ) : null}

              <div className="field">
                <label htmlFor={`${person.id}-salutation`}>Anrede*</label>
                <select
                  id={`${person.id}-salutation`}
                  value={person.salutation}
                  required
                  onChange={(event) => updatePerson(person.id, "salutation", event.target.value)}
                >
                  {salutationOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.value === ""}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor={`${person.id}-firstName`}>Vorname*</label>
                  <input
                    id={`${person.id}-firstName`}
                    required
                    value={person.firstName}
                    onChange={(event) => updatePerson(person.id, "firstName", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${person.id}-lastName`}>Nachname*</label>
                  <input
                    id={`${person.id}-lastName`}
                    required
                    value={person.lastName}
                    onChange={(event) => updatePerson(person.id, "lastName", event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor={`${person.id}-birthDate`}>Geburtsdatum*</label>
                  <input
                    id={`${person.id}-birthDate`}
                    required
                    type="date"
                    value={person.birthDate}
                    onChange={(event) => updatePerson(person.id, "birthDate", event.target.value)}
                  />
                </div>
                {!isChild ? (
                  <div className="field">
                    <label htmlFor={`${person.id}-email`}>Eigene E-Mail*</label>
                    <input
                      id={`${person.id}-email`}
                      required
                      type="email"
                      value={person.email}
                      onChange={(event) => updatePerson(person.id, "email", event.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              {!isChild ? (
                <div className="field">
                  <label htmlFor={`${person.id}-mobile`}>Eigene Mobilnummer*</label>
                  <input
                    id={`${person.id}-mobile`}
                    required
                    value={person.mobile}
                    onChange={(event) => updatePerson(person.id, "mobile", event.target.value)}
                  />
                </div>
              ) : (
                <div className="field">
                  <label htmlFor={`${person.id}-legalRepresentative`}>
                    Gesetzliche Vertreter*
                  </label>
                  <input
                    id={`${person.id}-legalRepresentative`}
                    required
                    value={person.legalRepresentative}
                    onChange={(event) =>
                      updatePerson(person.id, "legalRepresentative", event.target.value)
                    }
                  />
                </div>
              )}

              <div className="extension-copy-row">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => copyAddressToPerson(person.id)}
                >
                  Adresse übernehmen
                </button>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor={`${person.id}-street`}>Straße*</label>
                  <input
                    id={`${person.id}-street`}
                    required
                    value={person.street}
                    onChange={(event) => updatePerson(person.id, "street", event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${person.id}-postalCode`}>PLZ*</label>
                  <input
                    id={`${person.id}-postalCode`}
                    required
                    value={person.postalCode}
                    onChange={(event) => updatePerson(person.id, "postalCode", event.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor={`${person.id}-city`}>Ort*</label>
                <input
                  id={`${person.id}-city`}
                  required
                  value={person.city}
                  onChange={(event) => updatePerson(person.id, "city", event.target.value)}
                />
              </div>
            </div>
          );
        })}

        {extensionConfig && people.length < extensionConfig.maxPeople ? (
          <button className="button secondary" type="button" onClick={addPerson}>
            {extensionConfig.addButtonLabel}
          </button>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="notes">Hinweise für die Vereinsverwaltung</label>
        <textarea id="notes" name="notes" rows={4} />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.25rem" }}>Einwilligungen</h2>
        <div className="checkbox-group">
          <label className="checkbox">
            <input type="checkbox" name="acceptsStatutes" required />
            <span>
              Ich habe Satzung, Beitragsordnung, Platzpflegeordnung und Beitragsinformationen
              zur Kenntnis genommen und erkenne diese als verbindlich an.*
            </span>
          </label>
          <details style={{ margin: "-4px 0 8px 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Vereinsdokumente anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              {content.statutesConfirmationText.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {content.documentLinks.map((link) => (
                <p key={link.id}>
                  <a className="document-link" href={link.url} rel="noreferrer" target="_blank">
                    {link.label}
                  </a>
                </p>
              ))}
            </div>
          </details>

          <label className="checkbox">
            <input type="checkbox" name="acceptsPrivacy" required />
            <span>Ich habe die Datenschutzerklärung nach DSGVO zur Kenntnis genommen.*</span>
          </label>
          <details style={{ margin: "-4px 0 8px 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Datenschutzerklärung nach DSGVO anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              {PRIVACY_SECTIONS.map((section) => (
                <section key={section.title} style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: 6 }}>{section.title}</h3>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          </details>

          <label className="checkbox">
            <input type="checkbox" name="acceptsPhotoVideo" />
            <span>
              Ich willige freiwillig in die Anfertigung und Veröffentlichung von Foto- und
              Videoaufnahmen ein.
            </span>
          </label>
          <details style={{ margin: "-4px 0 8px 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Hinweise zu Foto- und Videoaufnahmen anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              {PHOTO_VIDEO_CONSENT_TEXT.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>

          <label className="checkbox">
            <input type="checkbox" name="acceptsWhatsapp" />
            <span>
              Ich willige freiwillig in die Nutzung meiner Mobilfunknummer für vereinsbezogene
              WhatsApp-Gruppen ein.
            </span>
          </label>
          <details style={{ margin: "-4px 0 0 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Hinweise zur WhatsApp-Gruppe anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              {WHATSAPP_CONSENT_TEXT.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="cta-row">
        <button className="button" type="submit" disabled={state.kind === "submitting"}>
          {state.kind === "submitting" ? "Antrag wird gespeichert..." : "Antrag absenden"}
        </button>
        {state.kind === "submitting" ? <span className="pill">Speicherung läuft...</span> : null}
      </div>

      {state.kind === "success" ? (
        <div className="result-box is-success">
          <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Antrag gespeichert</h3>
          <p>Der Antrag wurde gespeichert und an den Verein übermittelt.</p>
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
