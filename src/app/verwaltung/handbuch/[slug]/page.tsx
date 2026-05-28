import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { TcVredenLogo } from "@/components/tc-vreden-logo";
import { getHandbookPage, handbookPages } from "@/app/verwaltung/handbuch/content";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return handbookPages.map((page) => ({
    slug: page.slug
  }));
}

function SectionView({
  section
}: {
  section: NonNullable<ReturnType<typeof getHandbookPage>>["sections"][number];
}) {
  return (
    <section className="doc-section">
      <h2>{section.title}</h2>
      {section.body?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.bullets ? (
        <ul className="list">
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.rows ? (
        <table className="table">
          <tbody>
            {section.rows.map(([label, value]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

export default async function HandbookDetailPage({ params }: Props) {
  const { slug } = await params;
  const page = getHandbookPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="card">
        <TcVredenLogo />
        <span className="eyebrow">{page.audience}</span>
        <h1 className="page-title">{page.title}</h1>
        <p>{page.summary}</p>

        <div className="cta-row" style={{ marginBottom: 24 }}>
          <Link className="button secondary" href="/verwaltung/handbuch">
            Zurueck zum Handbuch
          </Link>
          <Link className="button secondary" href="/verwaltung">
            Verwaltung
          </Link>
        </div>

        <nav className="doc-nav" aria-label="Handbuchbereiche">
          {handbookPages.map((item) => (
            <Link
              className={item.slug === page.slug ? "is-active" : ""}
              href={`/verwaltung/handbuch/${item.slug}` as Route}
              key={item.slug}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="doc-sections">
          {page.sections.map((section) => (
            <SectionView key={section.title} section={section} />
          ))}
        </div>
      </section>
    </main>
  );
}
