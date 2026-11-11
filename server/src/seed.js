import bcrypt from 'bcryptjs';
import { openDb } from './db.js';

/**
 * Seeds ~6 months of believable bookings for a 4-court padel & tennis club:
 * evenings and weekends busier, summer busier than winter, a few % cancelled.
 * Deterministic (seeded PRNG) so everyone gets the same demo data.
 */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Amara', 'Ben', 'Chloe', 'Daniel', 'Efe', 'Farah', 'George', 'Hannah', 'Ibrahim', 'Jess', 'Kofi', 'Lena', 'Marcus', 'Nadia', 'Olu', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tunde', 'Uma', 'Victor', 'Wren', 'Xavier', 'Yusuf', 'Zara'];
const LAST = ['Adeyemi', 'Brown', 'Clark', 'Davies', 'Evans', 'Fletcher', 'Green', 'Hughes', 'Idowu', 'Jones', 'Khan', 'Lewis', 'Mensah', 'Novak', 'Okafor', 'Patel', 'Quigley', 'Roberts', 'Singh', 'Taylor'];

export function seed(db, { days = 185, now = new Date() } = {}) {
  const rand = mulberry32(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const insertUser = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
  insertUser.run('demo@courtdash.app', bcrypt.hashSync('demo1234', 10), 'Demo Manager');

  const courts = [
    ['Padel 1', 'padel', 28], ['Padel 2', 'padel', 28],
    ['Tennis 1', 'tennis', 22], ['Tennis 2', 'tennis', 22],
  ];
  const insertCourt = db.prepare('INSERT INTO courts (name, sport, hourly_rate) VALUES (?, ?, ?)');
  for (const c of courts) insertCourt.run(...c);

  const insertCustomer = db.prepare('INSERT INTO customers (name, email, joined_at) VALUES (?, ?, ?)');
  const customers = [];
  for (let i = 0; i < 160; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}.${i}@example.com`;
    const joinedDaysAgo = Math.floor(rand() * days);
    const joined = new Date(now.getTime() - joinedDaysAgo * 864e5);
    const { lastInsertRowid } = insertCustomer.run(name, email, joined.toISOString());
    // Regulars book far more often than one-off visitors.
    customers.push({ id: Number(lastInsertRowid), weight: rand() < 0.22 ? 2.5 + rand() * 4 : 0.4 + rand() });
  }
  const totalWeight = customers.reduce((s, c) => s + c.weight, 0);
  const weightedCustomer = () => {
    let r = rand() * totalWeight;
    for (const c of customers) { r -= c.weight; if (r <= 0) return c.id; }
    return customers[0].id;
  };

  const insertBooking = db.prepare(
    'INSERT INTO bookings (court_id, customer_id, starts_at, hours, price, status) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (let d = days; d >= 0; d--) {
      const day = new Date(now.getTime() - d * 864e5);
      const dow = day.getDay(); // 0 Sun .. 6 Sat
      const month = day.getMonth();
      const weekend = dow === 0 || dow === 6;
      // Seasonality: quieter Nov–Feb, busiest May–Sep.
      const season = [0.75, 0.75, 0.85, 0.95, 1.1, 1.2, 1.25, 1.2, 1.1, 0.95, 0.8, 0.75][month];
      const demand = (weekend ? 1.35 : 1.0) * season;

      for (let courtId = 1; courtId <= 4; courtId++) {
        for (let hour = 8; hour <= 21; hour++) {
          const evening = hour >= 17 && hour <= 20;
          const base = weekend ? (hour >= 9 && hour <= 18 ? 0.55 : 0.3) : evening ? 0.62 : 0.18;
          if (rand() < base * demand * (courtId <= 2 ? 1.12 : 0.92)) {
            const starts = new Date(day); starts.setHours(hour, 0, 0, 0);
            const hours = rand() < 0.25 ? 1.5 : 1;
            const rate = courts[courtId - 1][2];
            const peak = evening || weekend ? 1.15 : 1;
            const price = Math.round(rate * hours * peak * 100) / 100;
            const status = rand() < 0.055 ? 'cancelled' : 'confirmed';
            insertBooking.run(courtId, weightedCustomer(), starts.toISOString(), hours, price, status);
          }
        }
      }
    }
  });
  tx();

  return {
    bookings: db.prepare('SELECT COUNT(*) n FROM bookings').get().n,
    customers: customers.length,
  };
}

// Run directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openDb();
  const existing = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (existing > 0) {
    console.log('Database already seeded — delete courtdash.db to reseed.');
  } else {
    const result = seed(db);
    console.log(`Seeded ${result.bookings} bookings for ${result.customers} customers.`);
    console.log('Login: demo@courtdash.app / demo1234');
  }
}
