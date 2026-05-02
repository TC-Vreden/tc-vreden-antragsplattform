"use client";

import { FormEvent, useState } from "react";

type Candidate = {
  externalPersonId: string;
  matchScore: number;
  matchReason: string;
  displayName?: string;
  email?: string;
  birthDate?: string;
  membershipNumber?: string;
  personCode?: string;
  customerId?: string;
  membershipId?: string;
};

type LookupResult = {
  status: "pending" | "match_found" | "no_match";
  source?: "mock" | "live";
  message?: string;
  candidates: Candidate[];
};

const initialResult: LookupResult | null = null;

export function LookupForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ebusy/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          birthDate
        })
      });

      if (!response.ok) {
        throw new Error(`Lookup fehlgeschlagen: HTTP ${response.status}`);
      }

      const data = (await response.json()) as LookupResult;
      setResult(data);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Der Abgleich konnte nicht ausgefuehrt werden."
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="card" style={{ padding: 18, marginBottom: 20 }}>
      <h2 style={{ fontSize: "1.2rem" }}>Personenabgleich</h2>
      <p>
        Diese Suche bleibt intern. Angezeigt werden bewusst nur wenige Vergleichsfelder und keine
        sensiblen Finanz- oder SEPA-Daten.
      </p>
      <p>
        Aktuell ist das eine direkte Suche in eBuSy. Es wird also noch kein vorher ueber das
        Formular gespeicherter Antrag benoetigt.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="lookup-firstName">Vorname</label>
            <input
              id="lookup-firstName"
              name="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lookup-lastName">Nachname</label>
            <input
              id="lookup-lastName"
              name="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="lookup-email">E-Mail</label>
            <input
              id="lookup-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lookup-birthDate">Geburtsdatum</label>
            <input
              id="lookup-birthDate"
              name="birthDate"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
        </div>

        <div className="cta-row">
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Suche laeuft..." : "In eBuSy suchen"}
          </button>
          {loading ? <span className="pill">Suche wird ausgefuehrt...</span> : null}
        </div>
      </form>

      {error ? <p style={{ color: "var(--danger)", marginTop: 18 }}>{error}</p> : null}

      {result ? (
        <div className={`result-box ${result.candidates.length > 0 ? "is-success" : "is-empty"}`}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>Suchergebnis</h3>
          <span className="pill">
            {result.source === "live" ? "Live-Abgleich" : "Testabgleich"} · {result.status}
          </span>
          {result.message ? <p style={{ marginTop: 12 }}>{result.message}</p> : null}

          {result.candidates.length > 0 ? (
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Personen-ID</th>
                  <th>E-Mail</th>
                  <th>Geburtsdatum</th>
                  <th>Mitgliedsnummer</th>
                  <th>Weitere Kennung</th>
                  <th>Treffergrund</th>
                </tr>
              </thead>
              <tbody>
                {result.candidates.map((candidate) => (
                  <tr key={`${candidate.externalPersonId}-${candidate.matchReason}`}>
                    <td>{candidate.displayName ?? candidate.externalPersonId}</td>
                    <td>{candidate.externalPersonId}</td>
                    <td>{candidate.email ?? "-"}</td>
                    <td>{candidate.birthDate ?? "-"}</td>
                    <td>{candidate.membershipNumber ?? "-"}</td>
                    <td>{candidate.customerId || candidate.personCode || candidate.membershipId || "-"}</td>
                    <td>{candidate.matchReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ marginTop: 12 }}>Kein passender Datensatz gefunden.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
