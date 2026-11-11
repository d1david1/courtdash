import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

/** Stateless signed session token: base64(payload).hmac — no session table needed. */
export function sign(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE_S * 1000 })).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac || ''), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function authRoutes(app, db) {
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body || {};
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase().trim());
    // Compare against a dummy hash when the user is unknown, so response time
    // doesn't reveal which emails exist.
    const hash = user?.password_hash || '$2b$10$invalidinvalidinvalidinvaliduVl0bGhDJV1q7W0dGm5lC2S1u';
    const ok = bcrypt.compareSync(String(password || ''), hash);
    if (!user || !ok) return res.status(401).json({ error: 'Wrong email or password.' });

    res.cookie('session', sign({ uid: user.id, name: user.name }), {
      httpOnly: true, sameSite: 'lax', maxAge: MAX_AGE_S * 1000,
      secure: process.env.NODE_ENV === 'production',
    });
    res.json({ name: user.name, email: user.email });
  });

  app.post('/api/logout', (_req, res) => {
    res.clearCookie('session');
    res.status(204).end();
  });

  app.get('/api/me', (req, res) => {
    const session = verify(req.cookies?.session);
    if (!session) return res.status(401).json({ error: 'Not signed in.' });
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(session.uid);
    user ? res.json(user) : res.status(401).json({ error: 'Not signed in.' });
  });
}

export function requireAuth(req, res, next) {
  const session = verify(req.cookies?.session);
  if (!session) return res.status(401).json({ error: 'Not signed in.' });
  req.user = session;
  next();
}
