// Chart tokens — one place for the palette (validated for CVD safety).
export const viz = {
  series1: '#2a78d6', // blue — primary series
  series2: '#1baf7a', // aqua — second series (tables provide the contrast relief)
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  tickInk: '#898781',
  surface: '#fcfcfb',
  // Sequential blue ramp (light → dark) for the busy-hours heatmap.
  ramp: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#1c5cab', '#104281'],
  good: '#006300',
  bad: '#d03b3b',
};

export const gbp = (n, opts = {}) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0, ...opts }).format(n);

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
