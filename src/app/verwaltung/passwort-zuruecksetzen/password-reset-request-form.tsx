"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function translateResetError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("rate limit")) {
    return "Der Mailversand wurde gerade begrenzt. Bitte später erneut versuchen oder den Link in der Benutzerverwaltung erneut senden.";
  }

  return message;
}

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/verwaltung/passwort-neu`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      setErrorMessage(translateResetError(error.message));
      setLoading(false);
      return;
    }

    setMessage("Wenn die E-Mail intern bekannt ist, wurde ein Passwortlink verschickt.");
    setLoading(false);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="reset-email">E-Mail</label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {message ? (
        <div className="hint-box">
          <strong>Link angefordert</strong>
          <p style={{ margin: "8px 0 0" }}>{message}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="warning-box">
          <strong>Reset fehlgeschlagen</strong>
          <p style={{ margin: "8px 0 0" }}>{errorMessage}</p>
        </div>
      ) : null}

      <div className="cta-row">
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Link wird angefordert..." : "Passwortlink senden"}
        </button>
        <Link className="button secondary" href={"/verwaltung/login" as Route}>
          Zum Login
        </Link>
      </div>
    </form>
  );
}
