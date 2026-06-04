import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { InternalUserBar } from "@/components/internal-user-bar";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import {
  getApplicationFormContent,
  saveApplicationFormContent,
  type ApplicationFormContent,
  type ContributionRow
} from "@/lib/application-content";
import { writeInternalAuditLog } from "@/lib/internal-audit";
import { requireInternalPagePermission } from "@/lib/internal-auth";

type PageProps = {
  searchParams?: Promise<{
    gespeichert?: string;
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

function readContributionRows(formData: FormData): ContributionRow[] {
  const count = Number.parseInt(readString(formData, "contributionRowCount"), 10);
  const rowCount = Number.isFinite(count) ? count : 0;
  const rows: ContributionRow[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const row = {
      membership: readString(formData, `contribution-${index}-membership`),
      status: readString(formData, `contribution-${index}-status`),
      fee: readString(formData, `contribution-${index}-fee`)
    };

    if (row.membership || row.status || row.fee) {
      rows.push(row);
    }
  }

  return rows;
}

async function saveFormContent(formData: FormData) {
  "use server";

  const actor = await requireInternalPagePermission("content.manage");
  const current = await getApplicationFormContent();

  const nextContent: ApplicationFormContent = {
    membershipOptions: current.membershipOptions.map((option) => ({
      value: option.value,
      label: readString(formData, `membership-${option.value}`) || option.label
    })),
    contributionRows: readContributionRows(formData),
    contributionNotes: splitTextarea(formData.get("contributionNotes")),
    juniorTrainingNotes: splitTextarea(formData.get("juniorTrainingNotes")),
    statutesConfirmationText: splitTextarea(formData.get("statutesConfirmationText")),
    documentLinks: current.documentLinks.map((link) => ({
      id: link.id,
      label: readString(formData, `document-${link.id}-label`) || link.label,
      url: readString(formData, `document-${link.id}-url`) || link.url
    }))
  };

  await saveApplicationFormContent(nextContent);
  await writeInternalAuditLog({
    actor,
    action: "content.form.update",
    entityType: "application_form_content",
    entityId: "default",
    details: {
      membershipOptions: nextContent.membershipOptions.length,
      contributionRows: nextContent.contributionRows.length,
      documentLinks: nextContent.documentLinks.length
    }
  });

  revalidatePath("/anmelden");
  revalidatePath("/verwaltung/formular");
  redirect("/verwaltung/formular?gespeichert=1");
}

export default async function FormularContentPage({ searchParams }: PageProps) {
  const actor = await requireInternalPagePermission("content.manage");
  const content = await getApplicationFormContent();
  const params = searchParams ? await searchParams : {};
  const contributionRows = [
    ...content.contributionRows,
    { membership: "", status: "", fee: "" },
    { membership: "", status: "", fee: "" },
    { membership: "", status: "", fee: "" }
  ];

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Formulartexte</h1>

        <InternalUserBar actor={actor} />

        {params.gespeichert ? (
          <div className="result-box is-success" style={{ marginBottom: 18 }}>
            <strong>Gespeichert</strong>
            <p style={{ margin: "8px 0 0" }}>
              Die Formularinhalte wurden aktualisiert und werden im öffentlichen Formular
              verwendet.
            </p>
          </div>
        ) : null}

        <article className="hint-box" style={{ marginBottom: 20 }}>
          <strong>Was hier bearbeitet wird</strong>
          <p style={{ margin: "10px 0 0" }}>
            Diese Seite ändert sichtbare Texte, Linktexte, Beitragszeilen und Dropdownlabels.
            Die technischen Werte der Mitgliedschaftsarten bleiben unverändert, damit bestehende
            Anträge und die Übernahme-Logik stabil bleiben.
          </p>
        </article>

        <form action={saveFormContent} className="form">
          <section className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.25rem" }}>Dropdown: Mitgliedschaftsarten</h2>
            <p>
              Ändere nur den sichtbaren Text. Der technische Wert rechts daneben bleibt fest.
            </p>
            <div className="grid">
              {content.membershipOptions.map((option) => (
                <label className="field" key={option.value}>
                  <span>{option.value}</span>
                  <input name={`membership-${option.value}`} defaultValue={option.label} />
                </label>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.25rem" }}>Beitragstabelle</h2>
            <input name="contributionRowCount" type="hidden" value={contributionRows.length} />
            <div className="table-scroll">
              <table className="table users-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Art der Mitgliedschaft</th>
                    <th>Status</th>
                    <th>Jahresbeitrag</th>
                  </tr>
                </thead>
                <tbody>
                  {contributionRows.map((row, index) => (
                    <tr key={`${row.membership}-${index}`}>
                      <td>
                        <input
                          name={`contribution-${index}-membership`}
                          defaultValue={row.membership}
                        />
                      </td>
                      <td>
                        <input name={`contribution-${index}-status`} defaultValue={row.status} />
                      </td>
                      <td>
                        <input name={`contribution-${index}-fee`} defaultValue={row.fee} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.25rem" }}>Hinweise im Formular</h2>
            <div className="field">
              <label htmlFor="contributionNotes">Beitragshinweise</label>
              <textarea
                id="contributionNotes"
                name="contributionNotes"
                rows={8}
                defaultValue={textareaValue(content.contributionNotes)}
              />
            </div>
            <div className="field">
              <label htmlFor="juniorTrainingNotes">Hinweise zum Jugendtraining</label>
              <textarea
                id="juniorTrainingNotes"
                name="juniorTrainingNotes"
                rows={5}
                defaultValue={textareaValue(content.juniorTrainingNotes)}
              />
            </div>
            <div className="field">
              <label htmlFor="statutesConfirmationText">Text zu Vereinsdokumenten</label>
              <textarea
                id="statutesConfirmationText"
                name="statutesConfirmationText"
                rows={6}
                defaultValue={textareaValue(content.statutesConfirmationText)}
              />
            </div>
          </section>

          <section className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.25rem" }}>PDF-Links</h2>
            <div className="grid">
              {content.documentLinks.map((link) => (
                <div className="grid grid-2" key={link.id}>
                  <label className="field">
                    <span>{link.id}: Linktext</span>
                    <input name={`document-${link.id}-label`} defaultValue={link.label} />
                  </label>
                  <label className="field">
                    <span>{link.id}: URL</span>
                    <input name={`document-${link.id}-url`} defaultValue={link.url} />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <div className="cta-row">
            <button className="button" type="submit">
              Formularinhalte speichern
            </button>
            <a className="button secondary" href="/anmelden" target="_blank" rel="noreferrer">
              Öffentliches Formular ansehen
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}
