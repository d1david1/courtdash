import { useId, useState } from 'react';

/**
 * Card wrapper that gives every chart a table-view twin — the values are
 * always reachable without hovering (and without color vision).
 */
export default function ChartCard({ title, subtitle, columns, rows, children }) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        {columns && (
          <button
            className="ghost-btn"
            aria-expanded={showTable}
            aria-controls={id}
            onClick={() => setShowTable(!showTable)}
          >
            {showTable ? 'Chart' : 'Table'}
          </button>
        )}
      </header>
      {showTable && columns ? (
        <div className="table-wrap" id={id}>
          <table>
            <thead>
              <tr>{columns.map((c) => <th key={c.key} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => <td key={c.key} className={c.num ? 'num' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
