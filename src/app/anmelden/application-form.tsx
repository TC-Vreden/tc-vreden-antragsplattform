"use client";

import { FormEvent, useState } from "react";
import type { ApplicationMatchSummary } from "@/lib/application-types";
import {
  isReducedContributionMembership,
  membershipOptions,
  salutationOptions
} from "@/lib/application-options";
import {
  CONTRIBUTIONS_URL,
  CONTRIBUTION_NOTES,
  CONTRIBUTION_ROWS,
  JUNIOR_TRAINING_NOTES,
  MINOR_CONSENT_TEXT,
  PLACE_CARE_RULES_URL,
  PHOTO_VIDEO_CONSENT_TEXT,
  PRIVACY_SECTIONS,
  SEPA_MANDATE_TEXT,
  STATUTES_CONFIRMATION_TEXT,
  STATUTES_URL,
  WHATSAPP_CONSENT_TEXT
} from "@/lib/application-legal-content";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; id: string; match?: ApplicationMatchSummary }
  | { kind: "error"; message: string };

type AdditionalMemberRelation = "partner" | "child" | "family_member";

type AdditionalMember = {
  id: string;
  relation: AdditionalMemberRelation;
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

type MainContactDefaults = Pick<
  AdditionalMember,
  "email" | "mobile" | "street" | "postalCode" | "city"
>;

type MainApplicantDefaults = {
  firstName: string;
  lastName: string;
};

const emptyMainContactDefaults: MainContactDefaults = {
  email: "",
  mobile: "",
  street: "",
  postalCode: "",
  city: ""
};

const emptyMainApplicantDefaults: MainApplicantDefaults = {
  firstName: "",
  lastName: ""
};

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

function isLikelyMinorMembership(value: string) {
  return value === "child" || value === "youth_active" || value === "youth_passive";
}

function shouldShowJuniorTrainingNotice(value: string) {
  return (
    value === "child" ||
    value === "youth_active" ||
    value === "youth_passive" ||
    value === "adult_child" ||
    value === "family"
  );
}

function getMainApplicantDisplayName(defaults: MainApplicantDefaults) {
  return [defaults.firstName.trim(), defaults.lastName.trim()].filter(Boolean).join(" ");
}

function createAdditionalMember(
  relation: AdditionalMemberRelation,
  defaults: MainContactDefaults = emptyMainContactDefaults,
  mainApplicantDefaults: MainApplicantDefaults = emptyMainApplicantDefaults
): AdditionalMember {
  const defaultLegalRepresentative =
    relation === "partner" ? "" : getMainApplicantDisplayName(mainApplicantDefaults);

  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `member-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    relation,
    salutation: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    email: defaults.email,
    mobile: defaults.mobile,
    street: defaults.street,
    postalCode: defaults.postalCode,
    city: defaults.city,
    legalRepresentative: defaultLegalRepresentative
  };
}

function getAdditionalMemberConfig(membershipKind: string) {
  if (membershipKind === "partner_active" || membershipKind === "partner_passive") {
    return {
      title: "Ehepartner / eingetragene Lebenspartner",
      intro:
        "Für diese Mitgliedschaft wird neben der Hauptperson eine zweite erwachsene Person erfasst. Die Adresse kann gleich bleiben und ist daher optional.",
      addButtonLabel: "+ Ehepartner / eingetragenen Lebenspartner hinzufügen",
      relation: "partner" as const,
      minMembers: 1,
      maxMembers: 1
    };
  }

  if (membershipKind === "adult_child") {
    return {
      title: "Zugeordnetes Kind",
      intro:
        "Für die Mitgliedschaft Erwachsene + 1 Kind wird zusätzlich ein Kind erfasst. Kontakt- und Adressdaten sind optional.",
      addButtonLabel: "+ Kind hinzufügen",
      relation: "child" as const,
      minMembers: 1,
      maxMembers: 1
    };
  }

  if (membershipKind === "family") {
    return {
      title: "Weitere Familienmitglieder",
      intro:
        "Für den Familienbeitrag können mehrere weitere Personen nacheinander erfasst und bei Bedarf wieder entfernt werden.",
      addButtonLabel: "+ Familienmitglied hinzufügen",
      relation: "family_member" as const,
      minMembers: 1,
      maxMembers: Number.POSITIVE_INFINITY
    };
  }

  return null;
}

export function ApplicationForm() {
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });
  const [membershipKind, setMembershipKind] = useState("");
  const [additionalMembers, setAdditionalMembers] = useState<AdditionalMember[]>([]);
  const [mainContactDefaults, setMainContactDefaults] =
    useState<MainContactDefaults>(emptyMainContactDefaults);
  const [mainApplicantDefaults, setMainApplicantDefaults] =
    useState<MainApplicantDefaults>(emptyMainApplicantDefaults);
  const [reducedContributionMode, setReducedContributionMode] = useState(false);
  const [iban, setIban] = useState("");
  const [acceptsSepa, setAcceptsSepa] = useState(false);
  const [accountHolderDiffers, setAccountHolderDiffers] = useState(false);

  const additionalMemberConfig = getAdditionalMemberConfig(membershipKind);
  const mainApplicantIsMinor = isLikelyMinorMembership(membershipKind);
  const showJuniorTrainingNotice = shouldShowJuniorTrainingNotice(membershipKind);

  function handleMembershipChange(nextValue: string) {
    setMembershipKind(nextValue);
    setAdditionalMembers([]);
    setReducedContributionMode(isReducedContributionMembership(nextValue));
  }

  function addAdditionalMember() {
    if (!additionalMemberConfig) {
      return;
    }

    setAdditionalMembers((current) => {
      if (current.length >= additionalMemberConfig.maxMembers) {
        return current;
      }

      return [
        ...current,
        createAdditionalMember(
          additionalMemberConfig.relation,
          mainContactDefaults,
          mainApplicantDefaults
        )
      ];
    });
  }

  function removeAdditionalMember(memberId: string) {
    setAdditionalMembers((current) => current.filter((member) => member.id !== memberId));
  }

  function updateAdditionalMember(
    memberId: string,
    field: keyof AdditionalMember,
    value: string
  ) {
    setAdditionalMembers((current) =>
      current.map((member) =>
        member.id === memberId
          ? {
              ...member,
              [field]: value
            }
          : member
      )
    );
  }

  function updateMainContactDefault(field: keyof MainContactDefaults, value: string) {
    setMainContactDefaults((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateMainApplicantDefault(field: keyof MainApplicantDefaults, value: string) {
    setMainApplicantDefaults((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedMembershipKind = String(formData.get("membershipKind") || "");
    const activeAdditionalMemberConfig = getAdditionalMemberConfig(selectedMembershipKind);

    if (
      activeAdditionalMemberConfig &&
      additionalMembers.length < activeAdditionalMemberConfig.minMembers
    ) {
      setState({
        kind: "error",
        message: `Bitte mindestens ${activeAdditionalMemberConfig.minMembers} Zusatzperson erfassen.`
      });
      return;
    }

    const familyMembers = additionalMembers.map((member) => ({
      relation: member.relation,
      salutation: member.salutation,
      firstName: member.firstName.trim(),
      lastName: member.lastName.trim(),
      birthDate: member.birthDate,
      email: member.email.trim(),
      mobile: member.mobile.trim(),
      street: member.street.trim(),
      postalCode: member.postalCode.trim(),
      city: member.city.trim(),
      legalRepresentative: member.legalRepresentative.trim()
    }));

    const street = String(formData.get("street") || "").trim();
    const postalCode = String(formData.get("postalCode") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const accountHolderAddressInput = String(formData.get("accountHolderAddress") || "").trim();
    const fallbackAddress = [street, postalCode, city].filter(Boolean).join(", ");
    const notesInput = String(formData.get("notes") || "").trim();
    const selectedMainApplicantIsMinor = isLikelyMinorMembership(selectedMembershipKind);
    const guardianName = String(formData.get("guardianName") || "").trim();
    const guardianEmail = String(formData.get("guardianEmail") || "").trim();
    const guardianPhone = String(formData.get("guardianPhone") || "").trim();

    const payload = {
      salutation: String(formData.get("salutation") || "").trim(),
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      birthDate: String(formData.get("birthDate") || ""),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      mobile: String(formData.get("mobile") || "").trim(),
      street,
      postalCode,
      city,
      membershipKind: selectedMembershipKind,
      studentStatusUntil: String(formData.get("studentStatusUntil") || "").trim(),
      familyMembers,
      acceptsStatutes: Boolean(formData.get("acceptsStatutes")),
      acceptsPrivacy: Boolean(formData.get("acceptsPrivacy")),
      acceptsPhotoVideo: Boolean(formData.get("acceptsPhotoVideo")),
      acceptsWhatsapp: Boolean(formData.get("acceptsWhatsapp")),
      acceptsSepa: Boolean(formData.get("acceptsSepa")),
      isMinorApplicant: selectedMainApplicantIsMinor,
      guardianName: selectedMainApplicantIsMinor ? guardianName : "",
      guardianEmail: selectedMainApplicantIsMinor ? guardianEmail : "",
      guardianPhone: selectedMainApplicantIsMinor ? guardianPhone : "",
      guardianConsent: selectedMainApplicantIsMinor
        ? Boolean(formData.get("guardianConsent"))
        : false,
      iban: normalizeIban(String(formData.get("iban") || "")),
      accountHolder: String(formData.get("accountHolder") || "").trim(),
      accountHolderAddress:
        accountHolderDiffers && accountHolderAddressInput
          ? accountHolderAddressInput
          : fallbackAddress,
      notes: notesInput
    };

    if (!isValidIban(payload.iban)) {
      setState({
        kind: "error",
        message: "Die IBAN ist formal ungültig. Bitte prüfe die Eingabe."
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
      setMembershipKind("");
      setAdditionalMembers([]);
      setMainContactDefaults(emptyMainContactDefaults);
      setReducedContributionMode(false);
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
      <div className="field">
        <label htmlFor="membershipKind">Art der Mitgliedschaft*</label>
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
          {membershipOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {reducedContributionMode ? (
        <div className="field">
          <label htmlFor="studentStatusUntil">
            Nachweis für Schüler:innen / Azubis / Student:innen gültig bis
          </label>
          <input id="studentStatusUntil" name="studentStatusUntil" type="date" />
        </div>
      ) : null}

      <details style={{ margin: "0 0 18px" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>
          Mitgliedsbeiträge und wichtige Beitragsregeln 2026 anzeigen
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
              {CONTRIBUTION_ROWS.map((row) => (
                <tr key={`${row.membership}-${row.status}-${row.fee}`}>
                  <td>{row.membership}</td>
                  <td>{row.status || "-"}</td>
                  <td>{row.fee}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: "var(--muted)" }}>
            {CONTRIBUTION_NOTES.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </details>

      {showJuniorTrainingNotice ? (
        <details style={{ margin: "0 0 18px" }}>
          <summary style={{ color: "#b00020", cursor: "pointer", fontWeight: 700 }}>
            Wichtiger Hinweis zum Jugendtraining anzeigen
          </summary>
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            {JUNIOR_TRAINING_NOTES.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </details>
      ) : null}

      <h2 style={{ fontSize: "1.15rem" }}>Hauptperson</h2>

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
            onChange={(event) => updateMainApplicantDefault("firstName", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="lastName">Nachname*</label>
          <input
            id="lastName"
            name="lastName"
            required
            onChange={(event) => updateMainApplicantDefault("lastName", event.target.value)}
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
            onChange={(event) => updateMainContactDefault("email", event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="phone">Festnetz*</label>
          <input id="phone" name="phone" required />
        </div>
        <div className="field">
          <label htmlFor="mobile">Mobil*</label>
          <input
            id="mobile"
            name="mobile"
            required
            onChange={(event) => updateMainContactDefault("mobile", event.target.value)}
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
            onChange={(event) => updateMainContactDefault("street", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="postalCode">PLZ*</label>
          <input
            id="postalCode"
            name="postalCode"
            required
            onChange={(event) => updateMainContactDefault("postalCode", event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="city">Ort*</label>
        <input
          id="city"
          name="city"
          required
          onChange={(event) => updateMainContactDefault("city", event.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.15rem" }}>SEPA-Lastschrift</h2>
        <p>
          Aus Gründen der Verwaltungsvereinfachung werden die Mitgliedsbeiträge im
          Lastschriftverfahren erhoben. Diese Angaben gehören daher direkt zur Anmeldung.
        </p>
        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            Text zum SEPA-Lastschriftmandat anzeigen
          </summary>
          <div style={{ marginTop: 10, color: "var(--muted)" }}>
            {SEPA_MANDATE_TEXT.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
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
            Wenn hier nichts abweicht, verwendet das System für den Kontoinhaber die oben
            angegebene Anschrift des Antragstellers.
          </p>
        )}
      </div>

      {additionalMemberConfig ? (
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: "1.15rem" }}>{additionalMemberConfig.title}</h2>
          <p>{additionalMemberConfig.intro}</p>
          <p style={{ color: "var(--muted)" }}>
            Pflichtfelder für Zusatzpersonen: Anrede, Vorname, Nachname und Geburtsdatum.
            E-Mail, Mobil und Adresse werden beim Hinzufügen mit den Angaben der Hauptperson
            vorbelegt und können bei Bedarf angepasst werden. Leere Kontakt- und Adressfelder
            werden beim Speichern von der Hauptperson übernommen.
          </p>

          {additionalMembers.map((member, index) => (
            <div
              key={member.id}
              style={{
                borderTop: "1px solid var(--border)",
                marginTop: 16,
                paddingTop: 16
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 12,
                  justifyContent: "space-between",
                  marginBottom: 12
                }}
              >
                <strong>Zusatzperson {index + 1}</strong>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => removeAdditionalMember(member.id)}
                  style={{ minWidth: 140 }}
                >
                  Entfernen
                </button>
              </div>
              <div className="field">
                <label htmlFor={`${member.id}-salutation`}>Anrede*</label>
                <select
                  id={`${member.id}-salutation`}
                  value={member.salutation}
                  required
                  onChange={(event) =>
                    updateAdditionalMember(member.id, "salutation", event.target.value)
                  }
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
                  <label htmlFor={`${member.id}-firstName`}>Vorname*</label>
                  <input
                    id={`${member.id}-firstName`}
                    required
                    value={member.firstName}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "firstName", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${member.id}-lastName`}>Nachname*</label>
                  <input
                    id={`${member.id}-lastName`}
                    required
                    value={member.lastName}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "lastName", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor={`${member.id}-birthDate`}>Geburtsdatum*</label>
                  <input
                    id={`${member.id}-birthDate`}
                    required
                    type="date"
                    value={member.birthDate}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "birthDate", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${member.id}-email`}>E-Mail</label>
                  <input
                    id={`${member.id}-email`}
                    type="email"
                    value={member.email}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "email", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor={`${member.id}-mobile`}>Mobil</label>
                  <input
                    id={`${member.id}-mobile`}
                    value={member.mobile}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "mobile", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${member.id}-legalRepresentative`}>
                    Gesetzliche Vertreter (falls minderjährig)
                  </label>
                  <input
                    id={`${member.id}-legalRepresentative`}
                    value={member.legalRepresentative}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "legalRepresentative", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor={`${member.id}-street`}>Straße</label>
                  <input
                    id={`${member.id}-street`}
                    value={member.street}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "street", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor={`${member.id}-postalCode`}>PLZ</label>
                  <input
                    id={`${member.id}-postalCode`}
                    value={member.postalCode}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "postalCode", event.target.value)
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${member.id}-city`}>Ort</label>
                  <input
                    id={`${member.id}-city`}
                    value={member.city}
                    onChange={(event) =>
                      updateAdditionalMember(member.id, "city", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          {additionalMembers.length < additionalMemberConfig.maxMembers ? (
            <button className="button secondary" type="button" onClick={addAdditionalMember}>
              {additionalMemberConfig.addButtonLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {mainApplicantIsMinor ? (
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: "1.15rem" }}>Minderjährige / gesetzliche Vertreter</h2>
          <p>
            Bei einer Anmeldung als Kind oder Jugendliche:r muss die Zustimmung des
            gesetzlichen Vertreters dokumentiert werden.
          </p>
          <details style={{ marginBottom: 16 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Text zur Zusatzerklärung bei Minderjährigen anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              {MINOR_CONSENT_TEXT.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </details>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="guardianName">Name des gesetzlichen Vertreters*</label>
              <input id="guardianName" name="guardianName" required />
            </div>
            <div className="field">
              <label htmlFor="guardianEmail">E-Mail des gesetzlichen Vertreters</label>
              <input id="guardianEmail" name="guardianEmail" type="email" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="guardianPhone">Telefon des gesetzlichen Vertreters</label>
            <input id="guardianPhone" name="guardianPhone" />
          </div>
          <div className="checkbox-group">
            <label className="checkbox">
              <input type="checkbox" name="guardianConsent" required />
              <span>
                Ich bestätige als gesetzlicher Vertreter den Eintritt des minderjährigen
                Mitglieds und die damit verbundenen Verpflichtungen.*
              </span>
            </label>
          </div>
        </div>
      ) : null}

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
              2026 zur Kenntnis genommen und erkenne diese als verbindlich an.*
            </span>
          </label>
          <details style={{ margin: "-4px 0 8px 34px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>
              Satzung, Beitragsordnung und Platzpflegeordnung anzeigen
            </summary>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              {STATUTES_CONFIRMATION_TEXT.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p>
                Satzung:{" "}
                <a href={STATUTES_URL} rel="noreferrer" target="_blank">
                  vollständiges PDF öffnen
                </a>
              </p>
              <p>
                Beitragsübersicht 2026:{" "}
                <a href={CONTRIBUTIONS_URL} rel="noreferrer" target="_blank">
                  vollständiges PDF öffnen
                </a>
              </p>
              <p>
                Platzpflegeordnung 2026:{" "}
                <a href={PLACE_CARE_RULES_URL} rel="noreferrer" target="_blank">
                  vollständiges PDF öffnen
                </a>
              </p>
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
