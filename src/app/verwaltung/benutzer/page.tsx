import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { InternalUserBar } from "@/components/internal-user-bar";
import { requireInternalPagePermission, type InternalUserProfile } from "@/lib/internal-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-server";
import { UsersAdminClient } from "@/app/verwaltung/benutzer/users-admin-client";

async function getUsers(): Promise<{
  users: InternalUserProfile[];
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("internal_user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return {
      users: (data as InternalUserProfile[] | null) ?? []
    };
  } catch (error) {
    return {
      users: [],
      error:
        error instanceof Error ? error.message : "Benutzer konnten nicht geladen werden."
    };
  }
}

export default async function UsersPage() {
  const actor = await requireInternalPagePermission("users.manage");
  const { users, error } = await getUsers();

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">Interner Bereich</span>
        <h1 className="page-title">Benutzerverwaltung</h1>
        <p>
          Interne Benutzer werden per E-Mail eingeladen, bekommen eine Rolle und koennen bei Bedarf
          gesperrt oder erneut zum Passwortsetzen aufgefordert werden.
        </p>

        <InternalUserBar actor={actor} />

        {error ? (
          <div className="warning-box">
            <strong>Benutzerliste nicht verfuegbar</strong>
            <p style={{ margin: "8px 0 0" }}>{error}</p>
          </div>
        ) : (
          <UsersAdminClient initialUsers={users} />
        )}
      </section>
    </main>
  );
}
