"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export function PasswordUpdateForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseBrowserClient();

    async function initializeSession() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/u, ""));
      const hashError = hashParams.get("error_description") ?? hashParams.get("error");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!isMounted) {
        return;
      }

      if (hashError) {
        setErrorMessage(hashError);
        setHasSession(false);
        setCheckingSession(false);
        return;
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        window.history.replaceState(
          null,
          document.title,
          `${window.location.pathname}${window.location.search}`
        );

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
        }

        setHasSession(Boolean(data.session));
        setCheckingSession(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
      }

      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setHasSession(Boolean(session));
      setCheckingSession(false);
    });

    initializeSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!hasSession) {
      setErrorMessage(
        "Der Passwortlink ist nicht aktiv. Bitte den Link aus der E-Mail neu öffnen."
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }

    if (password !== passwordRepeat) {
      setErrorMessage("Die Passwörter stimmen nicht überein.");
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

      {!checkingSession && !hasSession && !errorMessage ? (
        <div className="warning-box">
          <strong>Passwortlink fehlt</strong>
          <p style={{ margin: "8px 0 0" }}>
            Bitte diese Seite über den Link aus der E-Mail öffnen.
          </p>
        </div>
      ) : null}

      <div className="cta-row">
        <button className="button" type="submit" disabled={loading || checkingSession || !hasSession}>
          {checkingSession
            ? "Link wird geprüft..."
            : loading
              ? "Passwort wird gespeichert..."
              : "Passwort speichern"}
        </button>
        <Link className="button secondary" href={"/verwaltung/login" as Route}>
          Zum Login
        </Link>
      </div>
    </form>
  );
}
