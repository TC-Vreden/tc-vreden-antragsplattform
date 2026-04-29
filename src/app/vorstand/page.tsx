const demoRows = [
  {
    name: "Anna Beispiel",
    type: "Neuanmeldung",
    status: "Neu",
    match: "Mock: moeglicher Treffer"
  },
  {
    name: "Max Muster",
    type: "Neuanmeldung",
    status: "Geprueft",
    match: "Mock: kein Treffer"
  }
];

export default function VorstandPage() {
  return (
    <main className="page-shell">
      <section className="card">
        <span className="eyebrow">Intern</span>
        <h1 style={{ maxWidth: "unset", fontSize: "2.5rem" }}>Vorstands-Cockpit</h1>
        <p>
          Hier landen spaeter echte Antraege aus Supabase. Solange die eBuSy-API noch nicht
          freigeschaltet ist, arbeiten wir mit einem Mock-Workflow.
        </p>

        <div className="grid grid-2" style={{ marginBottom: 20 }}>
          <article className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.2rem" }}>Arbeitsweise</h2>
            <ul className="list">
              <li>Antrag kommt ueber das Formular herein</li>
              <li>System prueft spaeter per Mock oder API auf moegliche Treffer</li>
              <li>Vorstand gibt frei, lehnt ab oder markiert Rueckfrage</li>
            </ul>
          </article>

          <article className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: "1.2rem" }}>Naechster Ausbauschritt</h2>
            <ul className="list">
              <li>Supabase-Login</li>
              <li>echte Antragstabelle</li>
              <li>echte Statushistorie</li>
            </ul>
          </article>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Typ</th>
              <th>Status</th>
              <th>eBuSy-Abgleich</th>
            </tr>
          </thead>
          <tbody>
            {demoRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.type}</td>
                <td>{row.status}</td>
                <td>{row.match}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
