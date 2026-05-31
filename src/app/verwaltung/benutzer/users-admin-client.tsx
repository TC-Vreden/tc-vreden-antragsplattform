"use client";

import { FormEvent, useState } from "react";
import type { InternalUserProfile } from "@/lib/internal-auth";
import {
  getInternalRoleDescription,
  getInternalRoleLabel,
  internalRoleIds,
  type InternalRole
} from "@/lib/internal-roles";

type Props = {
  initialUsers: InternalUserProfile[];
};

type UserDraft = {
  displayName: string;
  role: InternalRole;
  status: InternalUserProfile["status"];
};

function createDraft(user: InternalUserProfile): UserDraft {
  return {
    displayName: user.display_name ?? "",
    role: user.role,
    status: user.status
  };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(new Date(value));
}

export function UsersAdminClient({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>(
    Object.fromEntries(initialUsers.map((user) => [user.id, createDraft(user)]))
  );
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<InternalRole>("verwaltung");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  function updateDraft(userId: string, update: Partial<UserDraft>) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...update
      }
    }));
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviting(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/verwaltung/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          displayName,
          role
        })
      });
      const payload = (await response.json()) as {
        user?: InternalUserProfile;
        message?: string;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setUsers((current) => [payload.user!, ...current.filter((user) => user.id !== payload.user!.id)]);
      setDrafts((current) => ({
        ...current,
        [payload.user!.id]: createDraft(payload.user!)
      }));
      setEmail("");
      setDisplayName("");
      setRole("verwaltung");
      setFeedback(payload.message ?? "Einladung wurde versendet.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Benutzer konnte nicht eingeladen werden."
      );
    } finally {
      setInviting(false);
    }
  }

  async function saveUser(userId: string) {
    const draft = drafts[userId];

    if (!draft) {
      return;
    }

    setLoadingId(userId);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/verwaltung/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName: draft.displayName || null,
          role: draft.role,
          status: draft.status
        })
      });
      const payload = (await response.json()) as {
        user?: InternalUserProfile;
        message?: string;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setUsers((current) => current.map((user) => (user.id === userId ? payload.user! : user)));
      setDrafts((current) => ({
        ...current,
        [userId]: createDraft(payload.user!)
      }));
      setFeedback("Benutzer wurde gespeichert.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Benutzer konnte nicht gespeichert werden."
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function sendPasswordReset(userId: string) {
    setLoadingId(userId);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/verwaltung/users/${userId}/reset-password`, {
        method: "POST"
      });
      const payload = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setFeedback(payload.message ?? "Passwortlink wurde angefordert.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Passwortlink konnte nicht gesendet werden."
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteUser(user: InternalUserProfile) {
    const confirmed = window.confirm(
      `Soll der interne Benutzer ${user.email} wirklich geloescht werden?\n\nDer Zugang wird aus Supabase Auth entfernt.`
    );

    if (!confirmed) {
      return;
    }

    setLoadingId(user.id);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/verwaltung/users/${user.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || `HTTP ${response.status}`);
      }

      setUsers((current) => current.filter((currentUser) => currentUser.id !== user.id));
      setDrafts((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setFeedback(payload.message ?? "Benutzer wurde geloescht.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Benutzer konnte nicht geloescht werden."
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <article className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.2rem" }}>Benutzer einladen</h2>
        <form className="form" onSubmit={handleInvite}>
          <div className="grid grid-2">
            <label className="field">
              <span>E-Mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Rolle</span>
              <select value={role} onChange={(event) => setRole(event.target.value as InternalRole)}>
                {internalRoleIds.map((roleId) => (
                  <option key={roleId} value={roleId}>
                    {getInternalRoleLabel(roleId)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="button" type="submit" disabled={inviting}>
            {inviting ? "Einladung laeuft..." : "Einladung senden"}
          </button>
        </form>
      </article>

      {feedback ? (
        <div className="hint-box">
          <strong>Erledigt</strong>
          <p style={{ margin: "8px 0 0" }}>{feedback}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="warning-box">
          <strong>Aktion fehlgeschlagen</strong>
          <p style={{ margin: "8px 0 0" }}>{errorMessage}</p>
        </div>
      ) : null}

      <article className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: "1.2rem" }}>Interne Benutzer</h2>
        {users.length === 0 ? (
          <p>Noch keine internen Benutzerprofile vorhanden.</p>
        ) : (
          <div className="table-scroll">
            <table className="table users-table">
            <thead>
              <tr>
                <th>Benutzer</th>
                <th>Rolle</th>
                <th>Status</th>
                <th>Aktivitaet</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = drafts[user.id] ?? createDraft(user);
                const isLoading = loadingId === user.id;
                const linkButtonLabel =
                  user.status === "invited" && !user.accepted_at
                    ? "Link erneut senden"
                    : "Passwortlink";

                return (
                  <tr key={user.id}>
                    <td className="users-table-user">
                      <label className="field">
                        <span className="users-table-email">{user.email}</span>
                        <input
                          aria-label={`Name fuer ${user.email}`}
                          value={draft.displayName}
                          placeholder="Name"
                          onChange={(event) =>
                            updateDraft(user.id, {
                              displayName: event.target.value
                            })
                          }
                        />
                      </label>
                    </td>
                    <td className="users-table-role">
                      <label className="field compact-field">
                        <span className="sr-only">Rolle fuer {user.email}</span>
                        <select
                          aria-label={`Rolle fuer ${user.email}`}
                          title={getInternalRoleDescription(draft.role)}
                          value={draft.role}
                          onChange={(event) =>
                            updateDraft(user.id, {
                              role: event.target.value as InternalRole
                            })
                          }
                        >
                          {internalRoleIds.map((roleId) => (
                            <option key={roleId} value={roleId}>
                              {getInternalRoleLabel(roleId)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </td>
                    <td className="users-table-status">
                      <label className="field compact-field">
                        <span className="sr-only">Status fuer {user.email}</span>
                        <select
                          aria-label={`Status fuer ${user.email}`}
                          value={draft.status}
                          onChange={(event) =>
                            updateDraft(user.id, {
                              status: event.target.value as InternalUserProfile["status"]
                            })
                          }
                        >
                          <option value="invited">Eingeladen</option>
                          <option value="active">Aktiv</option>
                          <option value="disabled">Gesperrt</option>
                        </select>
                      </label>
                    </td>
                    <td className="users-table-activity">
                      <div className="activity-line">
                        <span>Erstellt</span>
                        <strong>{formatDateTime(user.created_at)}</strong>
                      </div>
                      <div className="activity-line">
                        <span>Angenommen</span>
                        <strong>{formatDateTime(user.accepted_at)}</strong>
                      </div>
                      <div className="activity-line">
                        <span>Zuletzt</span>
                        <strong>{formatDateTime(user.last_seen_at)}</strong>
                      </div>
                    </td>
                    <td className="users-table-actions">
                      <div className="user-action-list">
                        <button
                          className="button user-action-button"
                          type="button"
                          disabled={isLoading}
                          onClick={() => saveUser(user.id)}
                        >
                          {isLoading ? "Speichern..." : "Speichern"}
                        </button>
                        <button
                          className="button secondary user-action-button"
                          type="button"
                          disabled={isLoading}
                          onClick={() => sendPasswordReset(user.id)}
                        >
                          {linkButtonLabel}
                        </button>
                        <button
                          className="button danger user-action-button"
                          type="button"
                          disabled={isLoading}
                          onClick={() => deleteUser(user)}
                        >
                          Loeschen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
