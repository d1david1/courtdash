import Database from 'better-sqlite3';

export function openDb(file = process.env.DB_FILE || 'courtdash.db') {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      hourly_rate REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      joined_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY,
      court_id INTEGER NOT NULL REFERENCES courts(id),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      starts_at TEXT NOT NULL,        -- ISO datetime
      hours REAL NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed'  -- confirmed | cancelled
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_starts ON bookings(starts_at);
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
  `);

  return db;
}
