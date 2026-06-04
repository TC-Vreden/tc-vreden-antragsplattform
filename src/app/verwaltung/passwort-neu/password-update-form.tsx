"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";

function getAuthError(params: URLSearchParams) {
  const message = params.get("error_description") ?? params.get("error");
  const code = params.get("error_code");

  if (!message && !code) {
    return null;
  }

  return {
    code,
    message: message ?? code ?? ""
  };
}

function translateAuthError(error: { code: string | null; message: string }) {
  const combined = `${error.code ?? ""} ${error.message}`.toLowerCase();

  if (
    combined.includes("otp_expired") ||
    combined.includes("expired") ||
    combined.includes("invalid")
  ) {
    return "Der Passwortlink konnte nicht mehr aktiviert werden. Bitte fordere einen neuen Link an oder sende ihn in der Benutzerverwaltung erneut.";
  }

  if (combined.includes("rate limit")) {
    return "Der Mailversand wurde gerade begrenzt. Bitte warte kurz und fordere den Passwortlink danach erneut an.";
  }

  return error.message || "Der Passwortlink konnte nicht geprüft werden.";
}

function clearAuthParamsFromUrl() {
  window.history.replaceState(null, document.title, window.location.pathname);
}

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
      const searchParams = new URLSearchParams(window.location.search);
      const linkError = getAuthError(hashParams) ?? getAuthError(searchParams);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!isMounted) {
        return;
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        clearAuthParamsFromUrl();

        if (!isMounted) {
          return;
        }

        setHasSession(Boolean(data.session));
        setErrorMessage(
          data.session
            ? null
            : error
              ? error.message
              : linkError
                ? translateAuthError(linkError)
                : "Der Passwortlink konnte nicht aktiviert werden."
        );
        setCheckingSession(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      const sessionIsActive = Boolean(data.session);

      if (sessionIsActive && (linkError || window.location.hash || window.location.search)) {
        clearAuthParamsFromUrl();
      }

      if (!sessionIsActive && linkError && (window.location.hash || window.location.search)) {
        clearAuthParamsFromUrl();
      }

      setHasSession(sessionIsActive);
      setErrorMessage(
        sessionIsActive
          ? null
          : linkError
            ? translateAuthError(linkError)
            : error
              ? error.message
              : null
      );
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
      {checkingSession ? (
        <div className="hint-box">
          <strong>Passwortlink wird geprüft</strong>
          <p style={{ margin: "8px 0 0" }}>Einen Moment bitte.</p>
        </div>
      ) : null}

      {!checkingSession && hasSession ? (
        <>
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
        </>
      ) : null}

      {errorMessage ? (
        <div className="warning-box">
          <strong>
            {hasSession ? "Passwort konnte nicht gesetzt werden" : "Passwortlink konnte nicht geöffnet werden"}
          </strong>
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
        {checkingSession ? null : hasSession ? (
          <button className="button" type="submit" disabled={loading || checkingSession}>
            {loading ? "Passwort wird gespeichert..." : "Passwort speichern"}
          </button>
        ) : (
          <Link className="button" href={"/verwaltung/passwort-zuruecksetzen" as Route}>
            Neuen Link anfordern
          </Link>
        )}
        <Link className="button secondary" href={"/verwaltung/login" as Route}>
          Zum Login
        </Link>
      </div>
    </form>
  );
}
