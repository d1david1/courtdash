import { useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="center-page muted">Loading…</div>;
  if (!user) return <Login onLogin={setUser} />;
  return <Dashboard user={user} onLogout={() => api.logout().then(() => setUser(null))} />;
}
