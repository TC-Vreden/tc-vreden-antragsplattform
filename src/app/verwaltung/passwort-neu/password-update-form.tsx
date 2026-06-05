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
    combined.includes("pkce") ||
    combined.includes("code verifier") ||
    combined.includes("different browser")
  ) {
    return "Der Passwortlink wurde in einem anderen Browser oder auf einem anderen Gerät angefordert. Bitte öffne den Link im selben Browser, in dem du ihn angefordert hast, oder fordere im gewünschten Browser einen neuen Link an.";
  }

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

function getInactivePasswordSessionMessage(hasExistingSession: boolean) {
  if (hasExistingSession) {
    return "Bitte öffne den Passwortlink direkt aus der E-Mail. Aus Sicherheitsgründen kann ein Passwort hier nicht über eine bereits bestehende Anmeldung geändert werden.";
  }

  return null;
}

function translatePasswordUpdateError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("pkce") ||
    normalizedMessage.includes("code verifier") ||
    normalizedMessage.includes("different browser")
  ) {
    return "Der Passwortlink wurde in einem anderen Browser oder auf einem anderen Gerät angefordert. Bitte öffne den Link im selben Browser, in dem du ihn angefordert hast, oder fordere im gewünschten Browser einen neuen Link an.";
  }

  if (
    normalizedMessage.includes("auth session missing") ||
    normalizedMessage.includes("session missing") ||
    normalizedMessage.includes("jwt")
  ) {
    return "Die Passwort-Sitzung ist nicht mehr aktiv. Bitte fordere einen neuen Link an und öffne ihn direkt im gewünschten Browser.";
  }

  return message;
}

export function PasswordUpdateForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [canSetPassword, setCanSetPassword] = useState(false);
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
      const code = searchParams.get("code");

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

        setCanSetPassword(Boolean(data.session));
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

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        clearAuthParamsFromUrl();

        if (!isMounted) {
          return;
        }

        setCanSetPassword(Boolean(data.session));
        setErrorMessage(
          data.session
            ? null
            : error
              ? translateAuthError({ code: error.name, message: error.message })
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

      setCanSetPassword(false);
      setErrorMessage(
        linkError
            ? translateAuthError(linkError)
            : error
              ? error.message
              : getInactivePasswordSessionMessage(sessionIsActive)
      );
      setCheckingSession(false);
    }

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!canSetPassword) {
      setErrorMessage(
        "Der Passwortlink ist nicht aktiv. Bitte öffne den Link aus der E-Mail erneut."
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
      const translatedError = translatePasswordUpdateError(error.message);
      setErrorMessage(translatedError);
      if (translatedError !== error.message) {
        setCanSetPassword(false);
      }
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

      {!checkingSession && canSetPassword ? (
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
            {canSetPassword ? "Passwort konnte nicht gesetzt werden" : "Passwortlink konnte nicht geöffnet werden"}
          </strong>
          <p style={{ margin: "8px 0 0" }}>{errorMessage}</p>
        </div>
      ) : null}

      {!checkingSession && !canSetPassword && !errorMessage ? (
        <div className="warning-box">
          <strong>Passwortlink fehlt</strong>
          <p style={{ margin: "8px 0 0" }}>
            Bitte diese Seite über den Link aus der E-Mail öffnen.
          </p>
        </div>
      ) : null}

      <div className="cta-row">
        {checkingSession ? null : canSetPassword ? (
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
