import { viz } from './viz.js';

export default function StatTile({ label, value, prev, format, goodWhenUp = true, suffixNote }) {
  const delta = prev > 0 ? (value - prev) / prev : null;
  const up = delta !== null && delta >= 0;
  const good = delta !== null && (up === goodWhenUp);

  return (
    <div className="tile">
      <p className="tile-label">{label}</p>
      <p className="tile-value">{format(value)}</p>
      {delta !== null && (
        <p className="tile-delta" style={{ color: good ? viz.good : viz.bad }}>
          {up ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(1)}%
          <span className="muted"> vs previous period</span>
        </p>
      )}
      {suffixNote && <p className="muted small">{suffixNote}</p>}
    </div>
  );
}
