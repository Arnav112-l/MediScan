# MedScan frontend ↔ backend integration report

**Date:** 2026-05-03  
**Scope:** Wire React app (`medscan/frontend`) to Flask API (`medscan/backend`) and remove demo-only API paths.

## Summary

| Status | Item |
|--------|------|
| **Fixed** | Central API module `src/services/api.js` now calls real Flask routes under `/api/*`, uses `src/api/client.js` (JWT in `Authorization`), unwraps `{ status, data }` responses, and uses the Vite dev proxy (empty `baseURL` + `/api` on port 5173 → 5000). |
| **Fixed** | Login uses `POST /api/auth/login`; tokens stored; session restored from `medscan_token` + `medscan_user`; logout clears storage. |
| **Fixed** | `App.jsx` protects `/dashboard/*` with Redux `auth.isAuthenticated` (no hardcoded `true`). |
| **Fixed** | Dashboard, search, compare, history, reminders aligned to backend response shapes. |
| **Partial** | Lab report UI, profile settings, and adherence page still contain static UI samples; main API paths exist (`/api/report-analysis`, `/api/profile`, `/api/adherence`) and can be wired the same way as search. |
| **Manual** | Search/compare require Playwright + network; Google sign-in needs `VITE_GOOGLE_CLIENT_ID` + Google Identity script on the page. |

## Configuration

1. **Development:** run API on `http://127.0.0.1:5000`, UI on Vite (e.g. `http://localhost:5173`). Do **not** set `VITE_API_URL` so Axios hits the same origin and Vite proxies `/api` and `/health` (see `vite.config.js`).
2. **Production (Azure):** set `VITE_API_URL` to the Azure App Service URL (e.g. `https://medscan-api.azurewebsites.net`). Set `CORS_ORIGINS` on the backend to the Azure Static Web App origin.

## Endpoint map (implemented in `services/api.js`)

| Frontend helper | HTTP |
|-----------------|------|
| `loginWithPassword` | `POST /api/auth/login` |
| `loginWithGoogleCredential` | `POST /api/auth/google-login` |
| `getDashboardData` | `GET /api/dashboard` + `GET /api/adherence` |
| `searchMedicines` | `GET /api/search-medicine?query=` |
| `compareMedicine` | `GET /api/compare?medicine=` |
| `uploadPrescription` | `POST /api/upload-prescription` (multipart) |
| `getHistory` | `GET /api/history` |
| `getReminders` | `GET /api/reminders` |
| `createReminder` / `updateReminder` / `deleteReminder` | `POST /api/reminders/create`, `PATCH /api/reminders/update`, `DELETE /api/reminders/delete` |
| `getAdherence` / `markDose` | `GET /api/adherence`, `POST /api/adherence/mark-dose` |
| `analyzeReport` | `POST /api/report-analysis` |
| `askAiAssistant` | `POST /api/chatbot` |
| `getProfile` / `updateProfile` | `GET /api/profile`, `PATCH /api/profile/update` |

## Verification checklist

- [ ] `GET http://127.0.0.1:5000/health` → `{"status":"ok",...}`
- [ ] Register user: `POST /api/auth/register` then login via UI
- [ ] Dashboard loads without 401 (JWT attached)
- [ ] Search: allow **up to ~2 minutes** for first Playwright scrape (`timeout` set to 120s)
- [ ] Compare page: open `/dashboard/compare?m=Paracetamol` (URL-encoded medicine name)

## Known limitations

- **Scraping:** If all pharmacies fail, UI shows API error (no fabricated prices).
- **LLM:** Chat needs `OMNIDIMENSION_*` on the server; otherwise backend may return FAQ fallback text.
- **Google OAuth:** Frontend button calls GIS only when `window.google` and `VITE_GOOGLE_CLIENT_ID` exist.

## Build

Last checked: `npm run build` completes successfully after integration changes.
