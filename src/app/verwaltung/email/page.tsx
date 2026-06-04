import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { InternalUserBar } from "@/components/internal-user-bar";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import {
  getApplicationMailSettings,
  getMailSecretStatus,
  getMailTransportSettings,
  saveApplicationMailSettings,
  type ApplicationMailSettings,
  type MailProviderSetting,
  type SmtpSecureSetting
} from "@/lib/application-mail-settings";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { requireInternalPagePermission } from "@/lib/internal-auth";
import { sendConfiguredMail } from "@/lib/mail";

type PageProps = {
  searchParams?: Promise<{
    gespeichert?: string;
    test?: string;
    grund?: string;
  }>;
};

function textareaValue(lines: string[]) {
  return lines.join("\n");
}

function splitTextarea(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readProvider(value: string): MailProviderSetting {
  return value === "smtp" || value === "resend" || value === "auto" ? value : "auto";
}

function readSmtpSecure(value: string): SmtpSecureSetting {
  return value === "true" || value === "false" || value === "auto" ? value : "auto";
}

async function saveMailSettings(formData: FormData) {
  "use server";

  const actor = await requireInternalPagePermission("mail.manage");
  const nextSettings: ApplicationMailSettings = {
    notificationEnabled: readBoolean(formData, "notificationEnabled"),
    confirmationEnabled: readBoolean(formData, "confirmationEnabled"),
    provider: readProvider(readString(formData, "provider")),
    from: readString(formData, "from"),
    replyTo: readString(formData, "replyTo"),
    clubRecipient: readString(formData, "clubRecipient"),
    confirmationBcc: readString(formData, "confirmationBcc"),
    testRecipient: readString(formData, "testRecipient"),
    smtpHost: readString(formData, "smtpHost"),
    smtpPort: readString(formData, "smtpPort"),
    smtpSecure: readSmtpSecure(readString(formData, "smtpSecure")),
    smtpUser: readString(formData, "smtpUser"),
    notificationSubject: readString(formData, "notificationSubject"),
    notificationIntro: splitTextarea(formData.get("notificationIntro")),
    notificationButtonLabel: readString(formData, "notificationButtonLabel"),
    notificationFooter: splitTextarea(formData.get("notificationFooter")),
    confirmationSubject: readString(formData, "confirmationSubject"),
    confirmationIntro: splitTextarea(formData.get("confirmationIntro")),
    confirmationAttachmentNote: splitTextarea(formData.get("confirmationAttachmentNote")),
    confirmationPdfNote: splitTextarea(formData.get("confirmationPdfNote")),
    confirmationRevocationNote: splitTextarea(formData.get("confirmationRevocationNote"))
  };

  const saved = await saveApplicationMailSettings(nextSettings);
  await writeInternalAuditLog({
    actor,
    action: "mail.settings.update",
    entityType: "application_mail_settings",
    entityId: "default",
    details: {
      provider: saved.provider,
      notificationEnabled: saved.notificationEnabled,
      confirmationEnabled: saved.confirmationEnabled
    }
  });

  revalidatePath("/verwaltung/email");
  redirect("/verwaltung/email?gespeichert=1");
}

async function sendTestMail() {
  "use server";

  const actor = await requireInternalPagePermission("mail.manage");
  const settings = await getApplicationMailSettings();

  if (!settings.testRecipient) {
    redirect("/verwaltung/email?test=skipped&grund=Testempfaenger%20fehlt");
  }

  const result = await sendConfiguredMail(
    {
      from: settings.from,
      to: settings.testRecipient,
      replyTo: settings.replyTo || undefined,
      subject: "Testmail TennisClub Vreden",
      html: `<!doctype html><html lang="de"><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#1d1d1b;"><div style="max-width:640px;margin:0 auto;padding:24px;"><h1 style="font-size:22px;margin:0 0 12px;">Testmail TennisClub Vreden</h1><p>Diese Mail prüft die aktuell gespeicherten E-Mail-Einstellungen der Antragsplattform.</p><p>Wenn diese Nachricht ankommt, funktioniert der Versand grundsätzlich.</p></div></body></html>`,
      text:
        "Testmail TennisClub Vreden\n\nDiese Mail prüft die aktuell gespeicherten E-Mail-Einstellungen der Antragsplattform.\nWenn diese Nachricht ankommt, funktioniert der Versand grundsätzlich."
    },
    getMailTransportSettings(settings)
  );

  await writeInternalAuditLog({
    actor,
    action: "mail.test",
    entityType: "application_mail_settings",
    entityId: "default",
    details: {
      status: result.status,
      recipient: settings.testRecipient,
      reason: result.reason
    }
  });

  const reason = encodeURIComponent(result.reason ?? result.messageId ?? "");
  redirect(`/verwaltung/email?test=${result.status}&grund=${reason}`);
}

function TextareaField({
  id,
  label,
  rows,
  value
}: {
  id: keyof ApplicationMailSettings;
  label: string;
  rows: number;
  value: string[];
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <textarea id={id} name={id} rows={rows} defaultValue={textareaValue(value)} />
    </label>
  );
}

export default async function MailSettingsPage({ searchParams }: PageProps) {
  const actor = await requireInternalPagePermission("mail.manage");
  const settings = await getApplicationMailSettings();
  const secretStatus = getMailSecretStatus();
  const params = searchParams ? await searchParams : {};

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">E-Mail</h1>
        <p>
          Versanddaten und Mailtexte für Eingangsmail und Bestätigungsmail. Passwörter und API-Keys
          werden nicht angezeigt und bleiben als Runtime-Secrets hinterlegt.
        </p>

        <InternalUserBar actor={actor} />

        {params.gespeichert ? (
          <div className="result-box is-success" style={{ marginBottom: 18 }}>
            <strong>Gespeichert</strong>
            <p style={{ margin: "8px 0 0" }}>Die E-Mail-Einstellungen wurden aktualisiert.</p>
          </div>
        ) : null}

        {params.test ? (
          <div
            className={params.test === "sent" ? "result-box is-success" : "result-box is-empty"}
            style={{ marginBottom: 18 }}
          >
            <strong>Testmail: {params.test}</strong>
            {params.grund ? <p style={{ margin: "8px 0 0" }}>{params.grund}</p> : null}
          </div>
        ) : null}

        <article className="hint-box" style={{ marginBottom: 20 }}>
          <strong>Verfügbare Platzhalter</strong>
          <p style={{ margin: "10px 0 0" }}>
            <code>{"{name}"}</code>, <code>{"{vorname}"}</code>, <code>{"{nachname}"}</code>,{" "}
            <code>{"{mitgliedschaft}"}</code>, <code>{"{referenznummer}"}</code>,{" "}
            <code>{"{verwaltungslink}"}</code>, <code>{"{bestaetigt_am}"}</code>,{" "}
            <code>{"{club}"}</code>. Nicht passende Platzhalter bleiben unverändert stehen.
          </p>
        </article>

        <form action={saveMailSettings} className="form">
          <section className="settings-panel">
            <h2 style={{ fontSize: "1.25rem" }}>Versand</h2>
            <div className="grid grid-2">
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="notificationEnabled"
                  defaultChecked={settings.notificationEnabled}
                />
                <span>Eingangsmail an den Verein aktiv</span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  name="confirmationEnabled"
                  defaultChecked={settings.confirmationEnabled}
                />
                <span>Bestätigungsmail mit PDF aktiv</span>
              </label>
              <label className="field">
                <span>Mailprovider</span>
                <select name="provider" defaultValue={settings.provider}>
                  <option value="auto">Automatisch</option>
                  <option value="smtp">SMTP</option>
                  <option value="resend">Resend</option>
                </select>
              </label>
              <label className="field">
                <span>Testempfänger</span>
                <input name="testRecipient" defaultValue={settings.testRecipient} />
              </label>
              <label className="field">
                <span>Absender</span>
                <input name="from" defaultValue={settings.from} />
              </label>
              <label className="field">
                <span>Reply-To</span>
                <input name="replyTo" defaultValue={settings.replyTo} />
              </label>
              <label className="field">
                <span>Empfänger Verein</span>
                <input name="clubRecipient" defaultValue={settings.clubRecipient} />
              </label>
              <label className="field">
                <span>BCC Bestätigungsmail</span>
                <input name="confirmationBcc" defaultValue={settings.confirmationBcc} />
              </label>
            </div>
          </section>

          <section className="settings-panel">
            <h2 style={{ fontSize: "1.25rem" }}>SMTP</h2>
            <div className="grid grid-2">
              <label className="field">
                <span>SMTP-Host</span>
                <input name="smtpHost" defaultValue={settings.smtpHost} />
              </label>
              <label className="field">
                <span>SMTP-Port</span>
                <input name="smtpPort" defaultValue={settings.smtpPort} inputMode="numeric" />
              </label>
              <label className="field">
                <span>SMTP-Sicherheit</span>
                <select name="smtpSecure" defaultValue={settings.smtpSecure}>
                  <option value="auto">Automatisch nach Port</option>
                  <option value="true">SSL/TLS aktiv</option>
                  <option value="false">SSL/TLS aus</option>
                </select>
              </label>
              <label className="field">
                <span>SMTP-Benutzer</span>
                <input name="smtpUser" defaultValue={settings.smtpUser} />
              </label>
            </div>
            <p>
              SMTP-Passwort:{" "}
              <strong>{secretStatus.smtpPasswordConfigured ? "als Secret vorhanden" : "nicht gefunden"}</strong>
              . Resend API-Key:{" "}
              <strong>{secretStatus.resendApiKeyConfigured ? "als Secret vorhanden" : "nicht gefunden"}</strong>.
            </p>
          </section>

          <section className="settings-panel">
            <h2 style={{ fontSize: "1.25rem" }}>Eingangsmail an den Verein</h2>
            <label className="field">
              <span>Betreff</span>
              <input name="notificationSubject" defaultValue={settings.notificationSubject} />
            </label>
            <TextareaField
              id="notificationIntro"
              label="Einleitung"
              rows={5}
              value={settings.notificationIntro}
            />
            <label className="field">
              <span>Button-Text</span>
              <input
                name="notificationButtonLabel"
                defaultValue={settings.notificationButtonLabel}
              />
            </label>
            <TextareaField
              id="notificationFooter"
              label="Fußhinweis"
              rows={3}
              value={settings.notificationFooter}
            />
          </section>

          <section className="settings-panel">
            <h2 style={{ fontSize: "1.25rem" }}>Bestätigungsmail an Antragsteller:in</h2>
            <label className="field">
              <span>Betreff</span>
              <input name="confirmationSubject" defaultValue={settings.confirmationSubject} />
            </label>
            <TextareaField
              id="confirmationIntro"
              label="Einleitung"
              rows={5}
              value={settings.confirmationIntro}
            />
            <TextareaField
              id="confirmationAttachmentNote"
              label="Hinweis auf PDF-Anhang"
              rows={4}
              value={settings.confirmationAttachmentNote}
            />
            <TextareaField
              id="confirmationPdfNote"
              label="Hinweis nach Kurzüberblick"
              rows={3}
              value={settings.confirmationPdfNote}
            />
            <TextareaField
              id="confirmationRevocationNote"
              label="Widerrufshinweis"
              rows={4}
              value={settings.confirmationRevocationNote}
            />
          </section>

          <div className="cta-row">
            <button className="button" type="submit">
              E-Mail-Einstellungen speichern
            </button>
          </div>
        </form>

        <form action={sendTestMail} className="cta-row" style={{ marginTop: 12 }}>
          <button className="button secondary" type="submit">
            Testmail senden
          </button>
        </form>
      </section>
    </main>
  );
}
