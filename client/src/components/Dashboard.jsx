import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { gbp, shortDate, viz } from './viz.js';
import StatTile from './StatTile.jsx';
import ChartCard from './ChartCard.jsx';
import { RevenueChart, CourtBars, BusyHeatmap } from './charts.jsx';

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];

export default function Dashboard({ user, onLogout }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);   // last loaded slice (kept during refetch)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.summary(days), api.revenueByDay(days), api.byCourt(days),
      api.busyHours(days), api.topCustomers(days), api.recentBookings(),
    ])
      .then(([summary, revenue, courts, busy, top, recent]) => {
        if (!cancelled) setData({ summary, revenue, courts, busy, top, recent });
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [days]);

  if (error) return <div className="center-page error">{error}</div>;
  if (!data) return <div className="center-page muted">Loading dashboard…</div>;

  const { summary, revenue, courts, busy, top, recent } = data;

  return (
    <div className="dash">
      <header className="dash-head">
        <h1 className="brand">Court<span>Dash</span></h1>
        <div className="dash-user">
          <span className="muted">{user.name}</span>
          <button className="ghost-btn" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {/* One filter row scopes everything below it. */}
      <div className="filter-row" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.days}
            className={`chip ${days === r.days ? 'chip-active' : ''}`}
            aria-pressed={days === r.days}
            onClick={() => setDays(r.days)}
          >
            {days === r.days ? '✓ ' : ''}{r.label}
          </button>
        ))}
      </div>

      <div className={`dash-body ${loading ? 'refetching' : ''}`}>
        <div className="tile-row">
          <StatTile label="Revenue" value={summary.revenue.value} prev={summary.revenue.prev} format={(v) => gbp(v)} />
          <StatTile label="Bookings" value={summary.bookings.value} prev={summary.bookings.prev} format={(v) => v.toLocaleString('en-GB')} />
          <StatTile label="Occupancy" value={summary.occupancy.value} prev={summary.occupancy.prev} format={(v) => `${(v * 100).toFixed(0)}%`} suffixNote="of court-hours 8:00–22:00" />
          <StatTile label="Avg booking" value={summary.avgValue.value} prev={summary.avgValue.prev} format={(v) => gbp(v, { maximumFractionDigits: 2 })} />
        </div>

        <ChartCard
          title="Revenue by day"
          subtitle={`Confirmed bookings, last ${days} days`}
          columns={[
            { key: 'day', label: 'Day', render: (r) => shortDate(r.day) },
            { key: 'revenue', label: 'Revenue', num: true, render: (r) => gbp(r.revenue, { maximumFractionDigits: 2 }) },
            { key: 'bookings', label: 'Bookings', num: true },
          ]}
          rows={revenue}
        >
          <RevenueChart data={revenue} />
        </ChartCard>

        <div className="card-row">
          <ChartCard
            title="Revenue by court"
            subtitle="Ranked, with bookings on hover"
            columns={[
              { key: 'name', label: 'Court' },
              { key: 'sport', label: 'Sport' },
              { key: 'bookings', label: 'Bookings', num: true },
              { key: 'revenue', label: 'Revenue', num: true, render: (r) => gbp(r.revenue, { maximumFractionDigits: 2 }) },
            ]}
            rows={courts}
          >
            <CourtBars data={courts} />
          </ChartCard>

          <ChartCard title="Busiest times" subtitle="Bookings by weekday and hour">
            <BusyHeatmap data={busy} />
          </ChartCard>
        </div>

        <div className="card-row">
          <section className="card">
            <header className="card-head"><h2>Top customers</h2></header>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Customer</th><th className="num">Bookings</th><th className="num">Spent</th><th>Last visit</th></tr>
                </thead>
                <tbody>
                  {top.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td className="num">{c.bookings}</td>
                      <td className="num">{gbp(c.spent, { maximumFractionDigits: 2 })}</td>
                      <td className="muted">{shortDate(c.last_visit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <header className="card-head"><h2>Recent bookings</h2></header>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>When</th><th>Court</th><th>Customer</th><th className="num">Price</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recent.map((b) => (
                    <tr key={b.id}>
                      <td className="muted">{new Date(b.starts_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{b.court}</td>
                      <td>{b.customer}</td>
                      <td className="num">{gbp(b.price, { maximumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`status status-${b.status}`}>
                          <span className="status-dot" style={{ background: b.status === 'confirmed' ? '#0ca30c' : '#d03b3b' }} aria-hidden="true" />
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
