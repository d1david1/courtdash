/**
 * All reporting queries live here, as plain SQL against SQLite.
 * Every endpoint takes ?days=7|30|90 and compares with the period before it.
 */

const clampDays = (q) => ([7, 30, 90].includes(Number(q)) ? Number(q) : 30);

function periodBounds(days, now = new Date()) {
  const end = now.toISOString();
  const start = new Date(now.getTime() - days * 864e5).toISOString();
  const prevStart = new Date(now.getTime() - 2 * days * 864e5).toISOString();
  return { start, end, prevStart };
}

export function statsRoutes(app, db, requireAuth, nowFn = () => new Date()) {
  app.get('/api/stats/summary', requireAuth, (req, res) => {
    const days = clampDays(req.query.days);
    const { start, end, prevStart } = periodBounds(days, nowFn());

    const q = db.prepare(`
      SELECT COUNT(*) AS bookings,
             COALESCE(SUM(price), 0) AS revenue,
             COALESCE(SUM(hours), 0) AS hours
      FROM bookings
      WHERE status = 'confirmed' AND starts_at >= ? AND starts_at < ?
    `);
    const cur = q.get(start, end);
    const prev = q.get(prevStart, start);

    // Occupancy: booked hours vs available court-hours (4 courts × 14h × days).
    const capacity = 4 * 14 * days;

    res.json({
      days,
      revenue: { value: cur.revenue, prev: prev.revenue },
      bookings: { value: cur.bookings, prev: prev.bookings },
      occupancy: { value: capacity ? cur.hours / capacity : 0, prev: capacity ? prev.hours / capacity : 0 },
      avgValue: {
        value: cur.bookings ? cur.revenue / cur.bookings : 0,
        prev: prev.bookings ? prev.revenue / prev.bookings : 0,
      },
    });
  });

  app.get('/api/stats/revenue-by-day', requireAuth, (req, res) => {
    const days = clampDays(req.query.days);
    const { start, end } = periodBounds(days, nowFn());
    const rows = db.prepare(`
      SELECT date(starts_at) AS day,
             ROUND(SUM(price), 2) AS revenue,
             COUNT(*) AS bookings
      FROM bookings
      WHERE status = 'confirmed' AND starts_at >= ? AND starts_at < ?
      GROUP BY date(starts_at)
      ORDER BY day
    `).all(start, end);
    res.json(rows);
  });

  app.get('/api/stats/by-court', requireAuth, (req, res) => {
    const days = clampDays(req.query.days);
    const { start, end } = periodBounds(days, nowFn());
    const rows = db.prepare(`
      SELECT c.name, c.sport,
             COUNT(b.id) AS bookings,
             ROUND(COALESCE(SUM(b.price), 0), 2) AS revenue
      FROM courts c
      LEFT JOIN bookings b
        ON b.court_id = c.id AND b.status = 'confirmed'
       AND b.starts_at >= ? AND b.starts_at < ?
      GROUP BY c.id
      ORDER BY revenue DESC
    `).all(start, end);
    res.json(rows);
  });

  app.get('/api/stats/busy-hours', requireAuth, (req, res) => {
    const days = clampDays(req.query.days);
    const { start, end } = periodBounds(days, nowFn());
    const rows = db.prepare(`
      SELECT CAST(strftime('%w', starts_at) AS INTEGER) AS dow,
             CAST(strftime('%H', starts_at) AS INTEGER) AS hour,
             COUNT(*) AS bookings
      FROM bookings
      WHERE status = 'confirmed' AND starts_at >= ? AND starts_at < ?
      GROUP BY dow, hour
    `).all(start, end);
    res.json(rows);
  });

  app.get('/api/stats/top-customers', requireAuth, (req, res) => {
    const days = clampDays(req.query.days);
    const { start, end } = periodBounds(days, nowFn());
    const rows = db.prepare(`
      SELECT cu.name,
             COUNT(*) AS bookings,
             ROUND(SUM(b.price), 2) AS spent,
             MAX(b.starts_at) AS last_visit
      FROM bookings b
      JOIN customers cu ON cu.id = b.customer_id
      WHERE b.status = 'confirmed' AND b.starts_at >= ? AND b.starts_at < ?
      GROUP BY cu.id
      ORDER BY spent DESC
      LIMIT 8
    `).all(start, end);
    res.json(rows);
  });

  app.get('/api/bookings/recent', requireAuth, (_req, res) => {
    const rows = db.prepare(`
      SELECT b.id, b.starts_at, b.hours, b.price, b.status,
             c.name AS court, cu.name AS customer
      FROM bookings b
      JOIN courts c ON c.id = b.court_id
      JOIN customers cu ON cu.id = b.customer_id
      ORDER BY b.starts_at DESC
      LIMIT 12
    `).all();
    res.json(rows);
  });
}
