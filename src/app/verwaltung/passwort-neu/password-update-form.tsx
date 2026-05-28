"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function PasswordUpdateForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }

    if (password !== passwordRepeat) {
      setErrorMessage("Die Passwoerter stimmen nicht ueberein.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/verwaltung" as Route);
    router.refresh();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="new-password">Neues Passwort</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="new-password-repeat">Passwort wiederholen</label>
        <input
          id="new-password-repeat"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={passwordRepeat}
          onChange={(event) => setPasswordRepeat(event.target.value)}
        />
      </div>

      {errorMessage ? (
        <div className="warning-box">
          <strong>Passwort konnte nicht gesetzt werden</strong>
          <p style={{ margin: "8px 0 0" }}>{errorMessage}</p>
        </div>
      ) : null}

      <div className="cta-row">
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Passwort wird gespeichert..." : "Passwort speichern"}
        </button>
        <Link className="button secondary" href={"/verwaltung/login" as Route}>
          Zum Login
        </Link>
      </div>
    </form>
  );
}
