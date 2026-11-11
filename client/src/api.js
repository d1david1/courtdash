async function handle(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

const get = (url) => fetch(url, { credentials: 'include' }).then(handle);

export const api = {
  me: () => get('/api/me'),
  login: (email, password) =>
    fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handle),
  logout: () => fetch('/api/logout', { method: 'POST', credentials: 'include' }),

  summary: (days) => get(`/api/stats/summary?days=${days}`),
  revenueByDay: (days) => get(`/api/stats/revenue-by-day?days=${days}`),
  byCourt: (days) => get(`/api/stats/by-court?days=${days}`),
  busyHours: (days) => get(`/api/stats/busy-hours?days=${days}`),
  topCustomers: (days) => get(`/api/stats/top-customers?days=${days}`),
  recentBookings: () => get('/api/bookings/recent'),
};
