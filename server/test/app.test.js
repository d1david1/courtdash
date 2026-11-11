import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { seed } from '../src/seed.js';
import { createApp } from '../src/app.js';
import { sign, verify } from '../src/auth.js';

let base, server, cookie;
const NOW = new Date(); // seed is relative to now, so queries line up

before(async () => {
  const db = openDb(':memory:');
  seed(db, { now: NOW });
  const app = createApp({ db, nowFn: () => NOW });
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;

  const res = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@courtdash.app', password: 'demo1234' }),
  });
  assert.equal(res.status, 200);
  cookie = res.headers.get('set-cookie').split(';')[0];
});

test('session tokens verify and reject tampering', () => {
  const token = sign({ uid: 1 });
  assert.equal(verify(token).uid, 1);
  assert.equal(verify(token.slice(0, -2) + 'xx'), null);
  assert.equal(verify('garbage'), null);
});

test('wrong password and missing session are rejected', async () => {
  const bad = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@courtdash.app', password: 'nope' }),
  });
  assert.equal(bad.status, 401);
  const noAuth = await fetch(`${base}/api/stats/summary`);
  assert.equal(noAuth.status, 401);
});

test('summary returns coherent KPIs and clamps the days param', async () => {
  const res = await fetch(`${base}/api/stats/summary?days=30`, { headers: { cookie } });
  assert.equal(res.status, 200);
  const s = await res.json();
  assert.equal(s.days, 30);
  assert.ok(s.revenue.value > 0);
  assert.ok(s.bookings.value > 0);
  assert.ok(s.occupancy.value > 0 && s.occupancy.value < 1);
  assert.ok(Math.abs(s.avgValue.value - s.revenue.value / s.bookings.value) < 0.01);

  const weird = await fetch(`${base}/api/stats/summary?days=9999`, { headers: { cookie } });
  assert.equal((await weird.json()).days, 30); // clamped to default
});

test('revenue-by-day sums match the summary total', async () => {
  const [sumRes, dayRes] = await Promise.all([
    fetch(`${base}/api/stats/summary?days=30`, { headers: { cookie } }),
    fetch(`${base}/api/stats/revenue-by-day?days=30`, { headers: { cookie } }),
  ]);
  const summary = await sumRes.json();
  const days = await dayRes.json();
  const total = days.reduce((s, d) => s + d.revenue, 0);
  assert.ok(Math.abs(total - summary.revenue.value) < 1, `${total} vs ${summary.revenue.value}`);
});

test('by-court covers all four courts, sorted by revenue', async () => {
  const rows = await (await fetch(`${base}/api/stats/by-court?days=90`, { headers: { cookie } })).json();
  assert.equal(rows.length, 4);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].revenue >= rows[i].revenue);
});

test('top customers and recent bookings return rows with the right shape', async () => {
  const top = await (await fetch(`${base}/api/stats/top-customers?days=90`, { headers: { cookie } })).json();
  assert.ok(top.length > 0 && top.length <= 8);
  assert.ok(top[0].spent >= top.at(-1).spent);

  const recent = await (await fetch(`${base}/api/bookings/recent`, { headers: { cookie } })).json();
  assert.equal(recent.length, 12);
  for (const r of recent) {
    assert.ok(r.court && r.customer && r.starts_at);
    assert.ok(['confirmed', 'cancelled'].includes(r.status));
  }
});

test('teardown', () => server.close());
