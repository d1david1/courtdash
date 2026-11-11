import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { viz, gbp, shortDate } from './viz.js';

const axisProps = {
  tick: { fill: viz.tickInk, fontSize: 12 },
  axisLine: { stroke: viz.axis },
  tickLine: false,
};

function TooltipBox({ active, payload, label, labelFormat, rows }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip">
      <p className="tooltip-label">{labelFormat ? labelFormat(label, payload) : label}</p>
      {rows(payload).map((r) => (
        <p key={r.name} className="tooltip-row">
          <span className="tooltip-key" style={{ background: r.color }} aria-hidden="true" />
          <strong>{r.value}</strong>&nbsp;<span className="muted">{r.name}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={viz.grid} strokeWidth={1} vertical={false} />
        <XAxis dataKey="day" {...axisProps} tickFormatter={shortDate} minTickGap={28} />
        <YAxis {...axisProps} width={52} tickFormatter={(v) => `£${v >= 1000 ? `${v / 1000}K` : v}`} />
        <Tooltip
          cursor={{ stroke: viz.axis, strokeWidth: 1 }}
          content={
            <TooltipBox
              labelFormat={(l) => new Date(l).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              rows={(payload) => [
                { name: 'revenue', value: gbp(payload[0].value), color: viz.series1 },
                { name: 'bookings', value: payload[0].payload.bookings, color: viz.series1 },
              ]}
            />
          }
        />
        <Line
          type="monotone" dataKey="revenue" stroke={viz.series1} strokeWidth={2}
          dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: viz.surface }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CourtBars({ data }) {
  // Two series share the screen (padel vs tennis), so a legend is present
  // and the table view carries the exact values.
  const sports = [...new Set(data.map((d) => d.sport))];
  const colorFor = (sport) => (sport === sports[0] ? viz.series1 : viz.series2);

  return (
    <>
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 8 }} barCategoryGap="32%">
        <CartesianGrid stroke={viz.grid} strokeWidth={1} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={(v) => `£${v >= 1000 ? `${v / 1000}K` : v}`} />
        <YAxis type="category" dataKey="name" {...axisProps} width={72} />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          content={
            <TooltipBox
              rows={(payload) => [
                { name: 'revenue', value: gbp(payload[0].value), color: colorFor(payload[0].payload.sport) },
                { name: 'bookings', value: payload[0].payload.bookings, color: colorFor(payload[0].payload.sport) },
              ]}
            />
          }
        />
        <Bar dataKey="revenue" barSize={18} radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v) => gbp(v), fill: '#52514e', fontSize: 12 }}>
          {data.map((d) => <Cell key={d.name} fill={colorFor(d.sport)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <div className="legend-row" aria-hidden="false">
      {sports.map((s) => (
        <span key={s} className="legend-item">
          <span className="legend-swatch" style={{ background: colorFor(s) }} aria-hidden="true" />
          <span className="legend-text">{s}</span>
        </span>
      ))}
    </div>
    </>
  );
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00–21:00

export function BusyHeatmap({ data }) {
  const byCell = new Map(data.map((d) => [`${d.dow}-${d.hour}`, d.bookings]));
  const max = Math.max(1, ...data.map((d) => d.bookings));

  return (
    <div className="heatmap" role="img" aria-label="Bookings by weekday and hour; darker means busier">
      <div className="heatmap-row heatmap-head">
        <span />
        {HOURS.map((h) => <span key={h} className="heatmap-tick">{h % 3 === 0 ? `${h}:00` : ''}</span>)}
      </div>
      {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
        <div key={dow} className="heatmap-row">
          <span className="heatmap-day">{DAY_NAMES[dow]}</span>
          {HOURS.map((h) => {
            const n = byCell.get(`${dow}-${h}`) || 0;
            const step = n === 0 ? null : viz.ramp[Math.min(viz.ramp.length - 1, Math.floor((n / max) * viz.ramp.length))];
            return (
              <span
                key={h}
                className="heatmap-cell"
                style={{ background: step || 'transparent' }}
                title={`${DAY_NAMES[dow]} ${h}:00 — ${n} booking${n === 1 ? '' : 's'}`}
              />
            );
          })}
        </div>
      ))}
      <p className="muted small heatmap-note">Darker = more bookings. Hover a cell for the exact count.</p>
    </div>
  );
}
