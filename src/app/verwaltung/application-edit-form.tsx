"use client";

import { FormEvent, useState } from "react";
import type { ApplicationAdditionalMember, ApplicationRow } from "@/lib/application-types";
import {
  getAdditionalMemberRelationLabel,
  isReducedContributionMembership,
  membershipOptions,
  salutationOptions
} from "@/lib/application-options";

type EditableFamilyMember = Required<Pick<
  ApplicationAdditionalMember,
  "relation" | "salutation" | "firstName" | "lastName" | "birthDate" | "email" | "mobile" | "street" | "postalCode" | "city"
>>;

type ApplicationEditPayload = {
  salutation: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  email: string;
  phone: string;
  mobile: string;
  street: string;
  postal_code: string;
  city: string;
  membership_kind: string;
  student_status_until: string;
  family_members: EditableFamilyMember[];
  accepts_statutes: boolean;
  accepts_privacy: boolean;
  accepts_photo_video: boolean;
  accepts_whatsapp: boolean;
  accepts_sepa: boolean;
  iban: string;
  account_holder: string;
  account_holder_address: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  guardian_consent: boolean;
  notes: string;
};

type Props = {
  application: ApplicationRow;
  onCancel: () => void;
  onSaved: (application: ApplicationRow, message: string) => void;
};

const relationOptions = [
  { value: "partner", label: getAdditionalMemberRelationLabel("partner") },
  { value: "child", label: getAdditionalMemberRelationLabel("child") },
  { value: "family_member", label: getAdditionalMemberRelationLabel("family_member") }
] as const;

function textValue(value: string | null | undefined) {
  return value ?? "";
}

function createEmptyFamilyMember(): EditableFamilyMember {
  return {
    relation: "family_member",
    salutation: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    email: "",
    mobile: "",
    street: "",
    postalCode: "",
    city: ""
  };
}

function normalizeFamilyMember(member: ApplicationAdditionalMember): EditableFamilyMember {
  return {
    relation: member.relation ?? "family_member",
    salutation: textValue(member.salutation),
    firstName: textValue(member.firstName),
    lastName: textValue(member.lastName),
    birthDate: textValue(member.birthDate),
    email: textValue(member.email),
    mobile: textValue(member.mobile),
    street: textValue(member.street),
    postalCode: textValue(member.postalCode),
    city: textValue(member.city)
  };
}

function createForm(application: ApplicationRow): ApplicationEditPayload {
  return {
    salutation: textValue(application.salutation),
    first_name: application.first_name,
    last_name: application.last_name,
    birth_date: textValue(application.birth_date),
    email: application.email,
    phone: textValue(application.phone),
    mobile: textValue(application.mobile),
    street: textValue(application.street),
    postal_code: textValue(application.postal_code),
    city: textValue(application.city),
    membership_kind: textValue(application.membership_kind),
    student_status_until: textValue(application.student_status_until),
    family_members: application.family_members.map(normalizeFamilyMember),
    accepts_statutes: application.accepts_statutes,
    accepts_privacy: application.accepts_privacy,
    accepts_photo_video: application.accepts_photo_video,
    accepts_whatsapp: application.accepts_whatsapp,
    accepts_sepa: application.accepts_sepa,
    iban: textValue(application.iban),
    account_holder: textValue(application.account_holder),
    account_holder_address: textValue(application.account_holder_address),
    guardian_name: textValue(application.guardian_name),
    guardian_email: textValue(application.guardian_email),
    guardian_phone: textValue(application.guardian_phone),
    guardian_consent: application.guardian_consent,
    notes: textValue(application.notes)
  };
}

export function ApplicationEditForm({ application, onCancel, onSaved }: Props) {
  const [form, setForm] = useState<ApplicationEditPayload>(() => createForm(application));
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showReducedProofUntil = isReducedContributionMembership(form.membership_kind);

  function updateField<K extends keyof ApplicationEditPayload>(
    field: K,
    value: ApplicationEditPayload[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateFamilyMember(
    index: number,
    field: keyof EditableFamilyMember,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      family_members: current.family_members.map((member, memberIndex) =>
        memberIndex === index
          ? {
              ...member,
              [field]: value
            }
          : member
      )
    }));
  }

  function addFamilyMember() {
    setForm((current) => ({
      ...current,
      family_members: [...current.family_members, createEmptyFamilyMember()]
    }));
  }

  function removeFamilyMember(index: number) {
    setForm((current) => ({
      ...current,
      family_members: current.family_members.filter((_, memberIndex) => memberIndex !== index)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/verwaltung/applications/${application.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = (await response.json()) as {
        message?: string;
        application?: ApplicationRow;
      };

      if (!response.ok || !payload.application) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      onSaved(payload.application, payload.message ?? "Antrag gespeichert.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Der Antrag konnte nicht gespeichert werden."
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18, padding: "14px 0" }}>
      <div className="warning-box">
        <strong>Antrag vor der eBuSy-Übernahme bearbeiten</strong>
        <p style={{ margin: "8px 0 0" }}>
          Änderungen speichern den Antrag erneut als offenen Prüffall. Bitte danach den eBuSy-Abgleich
          neu starten, damit keine alten Treffer mit korrigierten Daten vermischt werden.
        </p>
      </div>

      {errorMessage ? <div className="warning-box">{errorMessage}</div> : null}

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Hauptperson</legend>
        <div className="grid grid-2">
          <SelectField
            label="Anrede"
            value={form.salutation}
            onChange={(value) => updateField("salutation", value)}
            options={salutationOptions}
          />
          <TextField label="Vorname" required value={form.first_name} onChange={(value) => updateField("first_name", value)} />
          <TextField label="Nachname" required value={form.last_name} onChange={(value) => updateField("last_name", value)} />
          <TextField label="Geburtsdatum" type="date" value={form.birth_date} onChange={(value) => updateField("birth_date", value)} />
          <TextField label="E-Mail" required type="email" value={form.email} onChange={(value) => updateField("email", value)} />
          <TextField label="Festnetz" required value={form.phone} onChange={(value) => updateField("phone", value)} />
          <TextField label="Mobil" required value={form.mobile} onChange={(value) => updateField("mobile", value)} />
          <TextField label="Straße" value={form.street} onChange={(value) => updateField("street", value)} />
          <TextField label="PLZ" value={form.postal_code} onChange={(value) => updateField("postal_code", value)} />
          <TextField label="Ort" value={form.city} onChange={(value) => updateField("city", value)} />
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Mitgliedschaft</legend>
        <div className="grid grid-2">
          <SelectField
            label="Mitgliedschaftsart"
            value={form.membership_kind}
            onChange={(value) =>
              setForm((current) => ({
                ...current,
                membership_kind: value,
                student_status_until: isReducedContributionMembership(value)
                  ? current.student_status_until
                  : ""
              }))
            }
            options={[{ value: "", label: "Bitte auswählen" }, ...membershipOptions]}
          />
          {showReducedProofUntil ? (
            <TextField
              label="Nachweis Schüler:innen / Azubis / Student:innen gültig bis"
              type="date"
              value={form.student_status_until}
              onChange={(value) => updateField("student_status_until", value)}
            />
          ) : null}
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Zusatzpersonen</legend>
        {form.family_members.length === 0 ? (
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Keine Zusatzpersonen erfasst.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {form.family_members.map((member, index) => (
              <div key={`${index}-${member.firstName}-${member.lastName}`} style={memberBoxStyle}>
                <div className="grid grid-2">
                  <SelectField
                    label="Rolle"
                    value={member.relation}
                    onChange={(value) => updateFamilyMember(index, "relation", value)}
                    options={relationOptions}
                  />
                  <SelectField
                    label="Anrede"
                    value={member.salutation}
                    onChange={(value) => updateFamilyMember(index, "salutation", value)}
                    options={salutationOptions}
                  />
                  <TextField label="Vorname" value={member.firstName} onChange={(value) => updateFamilyMember(index, "firstName", value)} />
                  <TextField label="Nachname" value={member.lastName} onChange={(value) => updateFamilyMember(index, "lastName", value)} />
                  <TextField label="Geburtsdatum" type="date" value={member.birthDate} onChange={(value) => updateFamilyMember(index, "birthDate", value)} />
                  <TextField label="E-Mail" type="email" value={member.email} onChange={(value) => updateFamilyMember(index, "email", value)} />
                  <TextField label="Mobil" value={member.mobile} onChange={(value) => updateFamilyMember(index, "mobile", value)} />
                  <TextField label="Straße" value={member.street} onChange={(value) => updateFamilyMember(index, "street", value)} />
                  <TextField label="PLZ" value={member.postalCode} onChange={(value) => updateFamilyMember(index, "postalCode", value)} />
                  <TextField label="Ort" value={member.city} onChange={(value) => updateFamilyMember(index, "city", value)} />
                </div>
                <button className="button secondary" type="button" onClick={() => removeFamilyMember(index)}>
                  Zusatzperson entfernen
                </button>
              </div>
            ))}
          </div>
        )}
        <button className="button secondary" type="button" onClick={addFamilyMember}>
          Zusatzperson hinzufügen
        </button>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>SEPA und gesetzliche Vertreter</legend>
        <div className="grid grid-2">
          <TextField label="Kontoinhaber" value={form.account_holder} onChange={(value) => updateField("account_holder", value)} />
          <TextField label="IBAN" value={form.iban} onChange={(value) => updateField("iban", value)} />
          <TextField
            label="Anschrift Kontoinhaber"
            value={form.account_holder_address}
            onChange={(value) => updateField("account_holder_address", value)}
          />
          <CheckboxField label="SEPA-Mandat bestätigt" checked={form.accepts_sepa} onChange={(checked) => updateField("accepts_sepa", checked)} />
          <TextField label="Gesetzlicher Vertreter" value={form.guardian_name} onChange={(value) => updateField("guardian_name", value)} />
          <TextField label="Vertreter E-Mail" type="email" value={form.guardian_email} onChange={(value) => updateField("guardian_email", value)} />
          <TextField label="Vertreter Telefon" value={form.guardian_phone} onChange={(value) => updateField("guardian_phone", value)} />
          <CheckboxField label="Vertreter-Zustimmung" checked={form.guardian_consent} onChange={(checked) => updateField("guardian_consent", checked)} />
        </div>
      </fieldset>

      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Einwilligungen und Hinweise</legend>
        <div className="grid grid-2">
          <CheckboxField label="Satzung / Beiträge bestätigt" checked={form.accepts_statutes} onChange={(checked) => updateField("accepts_statutes", checked)} />
          <CheckboxField label="Datenschutz bestätigt" checked={form.accepts_privacy} onChange={(checked) => updateField("accepts_privacy", checked)} />
          <CheckboxField label="Foto-/Videoeinwilligung" checked={form.accepts_photo_video} onChange={(checked) => updateField("accepts_photo_video", checked)} />
          <CheckboxField label="WhatsApp-/Kommunikationseinwilligung" checked={form.accepts_whatsapp} onChange={(checked) => updateField("accepts_whatsapp", checked)} />
        </div>
        <label style={labelStyle}>
          Hinweise
          <textarea className="textarea" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={4} />
        </label>
      </fieldset>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="button" type="submit" disabled={saving}>
          {saving ? "Speichern..." : "Änderungen speichern"}
        </button>
        <button className="button secondary" type="button" onClick={onCancel} disabled={saving}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        className="input"
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label style={labelStyle}>
      {label}
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={{ ...labelStyle, display: "flex", flexDirection: "row", alignItems: "center" }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

const fieldsetStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  margin: 0,
  padding: 14
};

const legendStyle = {
  fontWeight: 700,
  padding: "0 6px"
};

const labelStyle = {
  display: "grid",
  gap: 6,
  fontWeight: 700
};

const memberBoxStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  padding: 12
};
