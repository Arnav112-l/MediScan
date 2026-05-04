/**
 * MedScan API — targets Flask backend (see medscan/backend).
 * Dev: leave VITE_API_URL unset so Vite proxies /api → http://127.0.0.1:5000
 * Prod: set VITE_API_URL=https://your-api-host
 */
import client, { setToken } from '../api/client';

const SCRAPE_TIMEOUT_MS = 120_000;

/** Backend returns either `{ status, data }` or legacy flat JSON */
function unwrap(res) {
  const d = res?.data;
  if (d && typeof d === 'object' && d.status === 'success' && 'data' in d) return d.data;
  return d;
}

export async function loginWithPassword(email, password) {
  const res = await client.post('/api/auth/login', { email, password });
  const data = res.data;
  if (data.access_token) setToken(data.access_token);
  if (data.refresh_token) localStorage.setItem('medscan_refresh', data.refresh_token);
  return data;
}

export async function registerAccount(email, password) {
  const res = await client.post('/api/auth/register', { email, password });
  return res.data;
}

/** Google ID token from GIS — backend verifies when GOOGLE_OAUTH_CLIENT_ID is set */
export async function loginWithGoogleCredential(idToken) {
  const res = await client.post('/api/auth/google-login', {
    credential: idToken,
  });
  const data = res.data;
  if (data.access_token) setToken(data.access_token);
  if (data.refresh_token) localStorage.setItem('medscan_refresh', data.refresh_token);
  return data;
}

export async function refreshAccessToken() {
  const rt = localStorage.getItem('medscan_refresh');
  if (!rt) throw new Error('No refresh token');
  const res = await client.post('/api/auth/refresh', null, {
    headers: { Authorization: `Bearer ${rt}` },
  });
  const data = res.data;
  if (data.access_token) setToken(data.access_token);
  return data;
}

function mapDashboard(raw) {
  const stats = raw.stats || {};
  const reminders = raw.reminders_preview || [];
  const recent = raw.recent_searches || [];
  return {
    widgets: {
      upcomingReminders: reminders.length,
      adherenceScore: Number(stats.adherence_score_percent ?? 0),
      medicinesTracked: Number(stats.medicines_tracked ?? 0),
      monthlySavings: Math.round(Number(stats.monthly_savings_estimate_inr ?? 0)),
    },
    remindersPreview: reminders,
    recentSearches: recent,
    raw,
  };
}

function adherenceToTrendSeries(adherencePayload) {
  const weekly = adherencePayload?.weekly_series || [];
  return weekly.map((row) => ({
    name: row.date?.slice(5) || row.date,
    score:
      row.taken + row.missed > 0
        ? Math.round((100 * row.taken) / (row.taken + row.missed))
        : 0,
  }));
}

export async function resetUserActivity() {
  await client.post('/api/profile/reset-data');
}

export async function getDashboardData(options = {}) {
  const params = options.refresh ? { refresh: '1' } : {};
  const [dashRes, adhRes] = await Promise.all([
    client.get('/api/dashboard', { params }),
    client.get('/api/adherence').catch(() => ({ data: {} })),
  ]);
  const dash = unwrap(dashRes);
  const adh = unwrap(adhRes);
  const mapped = mapDashboard(dash);
  const series = adherenceToTrendSeries(adh);
  const trend = series.length ? series : [];
  return {
    ...mapped,
    adherenceTrend: trend,
    savingsAnalytics: [],
  };
}

/** Map pharmacy rows for search results cards */
function mapPriceRows(data, query) {
  if (data?.failed_all) {
    const err = new Error(data.scrape_errors?.[0]?.error || 'All pharmacy sources failed');
    err.scrape_errors = data.scrape_errors;
    err.query = data.query;
    throw err;
  }
  const md = data.medicine_display || query;
  const prices = data.prices || [];
  return prices.map((row, i) => ({
    id: `${row.pharmacy_name}-${i}`,
    name: md,
    generic: '',
    packSize: row.pack_size || '—',
    price: row.price,
    unitPrice: row.unit_price,
    savings: row.discount || '—',
    pharmacy: row.pharmacy_name,
    availability: row.availability,
    url: row.url,
  }));
}

export async function searchMedicines(query, options = {}) {
  const params = { query: query.trim() };
  if (options.refresh) params.refresh = '1';
  const res = await client.get('/api/search-medicine', {
    params,
    timeout: SCRAPE_TIMEOUT_MS,
  });
  const data = unwrap(res);
  return mapPriceRows(data, query);
}

export async function compareMedicine(medicine) {
  const res = await client.get('/api/compare', {
    params: { medicine: medicine.trim() },
    timeout: SCRAPE_TIMEOUT_MS,
  });
  return unwrap(res);
}

export async function uploadPrescription(formData) {
  const res = await client.post('/api/upload-prescription', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: SCRAPE_TIMEOUT_MS,
  });
  const body = res.data;
  if (body.status === 'success' && body.data) return body.data;
  return body;
}

export async function getHistory(params = {}) {
  const res = await client.get('/api/history', { params });
  return unwrap(res);
}

export async function getReminders() {
  const res = await client.get('/api/reminders');
  const data = unwrap(res);
  return data.reminders || data?.data?.reminders || [];
}

export async function createReminder(payload) {
  const res = await client.post('/api/reminders/create', payload);
  return unwrap(res);
}

export async function updateReminder(payload) {
  const res = await client.patch('/api/reminders/update', payload);
  return unwrap(res);
}

export async function deleteReminder(id) {
  await client.delete('/api/reminders/delete', { params: { id } });
}

export async function getAdherence() {
  const res = await client.get('/api/adherence');
  return unwrap(res);
}

export async function markDose(reminderId, status = 'taken') {
  const res = await client.post('/api/adherence/mark-dose', {
    reminder_id: reminderId,
    status,
  });
  return unwrap(res);
}

export async function analyzeReport(formData) {
  const res = await client.post('/api/report-analysis', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  const body = res.data;
  if (body.status === 'success' && body.data) return body.data;
  return body;
}

export async function askAiAssistant(message) {
  const res = await client.post('/api/chatbot', { message });
  const body = res.data;
  if (body.status === 'success' && body.data?.reply)
    return { text: body.data.reply, fromLlm: body.data.from_llm };
  if (body.reply) return { text: body.reply };
  return { text: typeof body === 'string' ? body : JSON.stringify(body) };
}

export async function getProfile() {
  const res = await client.get('/api/profile');
  return unwrap(res);
}

export async function updateProfile(partial) {
  const res = await client.patch('/api/profile/update', partial);
  return unwrap(res);
}

export async function getAlternatives(name) {
  const res = await client.get('/api/alternatives', { params: { name } });
  return unwrap(res);
}

export async function getNearbyPharmacies({ lat, lng, radius = 2000 }) {
  const res = await client.get('/api/pharmacies/nearby', {
    params: { lat, lng, radius },
    timeout: 30_000,
  });
  return unwrap(res);
}

export async function getRefillAlerts() {
  const res = await client.get('/api/refill/alerts');
  return unwrap(res);
}

export default client;
