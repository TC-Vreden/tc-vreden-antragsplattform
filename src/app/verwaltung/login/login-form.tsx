"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Props = {
  nextPath: string;
};

export function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace(nextPath as Route);
    router.refresh();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="internal-email">E-Mail</label>
        <input
          id="internal-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="internal-password">Passwort</label>
        <input
          id="internal-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      {errorMessage ? (
        <div className="warning-box">
          <strong>Anmeldung fehlgeschlagen</strong>
          <p style={{ margin: "8px 0 0" }}>{errorMessage}</p>
        </div>
      ) : null}

      <div className="cta-row">
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Anmeldung läuft..." : "Einloggen"}
        </button>
        <Link className="button secondary" href={"/verwaltung/passwort-zuruecksetzen" as Route}>
          Passwort zurücksetzen
        </Link>
      </div>
    </form>
  );
}
