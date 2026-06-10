import type { ReactNode } from "react";
import { TcVredenLogo } from "@/components/tc-vreden-logo";

type PublicPageShellProps = {
  title: string;
  eyebrow?: string;
  intro?: ReactNode;
  children: ReactNode;
};

export function PublicPageShell({ title, eyebrow, intro, children }: PublicPageShellProps) {
  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {intro ? <div className="public-page-intro">{intro}</div> : null}
        {children}
      </section>
      <footer className="public-form-footer">
        TennisClub Vreden e.V. <span>|</span> Ottensteiner Str. 59 <span>|</span> 48691 Vreden{" "}
        <span>|</span> <a href="mailto:mail@tennisclub-vreden.de">mail@tennisclub-vreden.de</a>
      </footer>
    </main>
  );
}
