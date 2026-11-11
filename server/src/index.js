import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = openDb();

// First run: seed automatically so `npm start` just works.
if (db.prepare('SELECT COUNT(*) n FROM users').get().n === 0) {
  const r = seed(db);
  console.log(`Seeded ${r.bookings} bookings. Login: demo@courtdash.app / demo1234`);
}

const clientDist = path.resolve(__dirname, '../../client/dist');
const port = Number(process.env.PORT || 3002);
createApp({ db, clientDist }).listen(port, () => {
  console.log(`CourtDash on http://localhost:${port}`);
});
