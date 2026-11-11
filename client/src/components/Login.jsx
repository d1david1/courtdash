import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('demo@courtdash.app');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onLogin(await api.login(email, password));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-page">
      <form className="login-card" onSubmit={submit}>
        <h1 className="brand">Court<span>Dash</span></h1>
        <p className="muted">Bookings &amp; revenue for Riverside Racquets Club</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="muted small">Demo login: demo@courtdash.app / demo1234</p>
      </form>
    </div>
  );
}
