# MedScan — Azure Deployment Guide (Full Stack)

**Target:** Microsoft Azure for Startups (free credits program)
**Backend:** Azure App Service (Linux, Docker container)
**Frontend:** Azure Static Web Apps
**Last updated:** 2026-05-19

---

## Table of Contents

1. [Why Azure](#1-why-azure)
2. [Prerequisites](#2-prerequisites)
3. [Azure Resource Overview](#3-azure-resource-overview)
4. [Step 1 — Create Azure Resources](#step-1--create-azure-resources)
5. [Step 2 — Push Docker Image to ACR](#step-2--push-docker-image-to-acr)
6. [Step 3 — Deploy Backend to App Service](#step-3--deploy-backend-to-app-service)
7. [Step 4 — Configure Environment Variables](#step-4--configure-environment-variables)
8. [Step 5 — Set Up PostgreSQL](#step-5--set-up-postgresql)
9. [Step 6 — Enable Redis Cache (Optional)](#step-6--enable-redis-cache-optional)
10. [Step 7 — Deploy Frontend to Azure Static Web Apps](#step-7--deploy-frontend-to-azure-static-web-apps)
11. [Step 8 — Connect Frontend to Backend](#step-8--connect-frontend-to-backend)
12. [Step 9 — Custom Domain & SSL](#step-9--custom-domain--ssl)
13. [Step 10 — CI/CD with GitHub Actions](#step-10--cicd-with-github-actions)
14. [Monitoring & Logs](#monitoring--logs)
15. [Capacity Planning & Cost Estimation ($10k Startup Credits)](#capacity-planning--cost-estimation-10k-startup-credits)
16. [Troubleshooting](#troubleshooting)

---

## 1. Why Azure

MedScan's backend has two system-level dependencies that rule out simple "code deploy" PaaS:

- **Playwright + Chromium** — headless browser for live pharmacy scraping
- **Tesseract OCR** — prescription and lab report text extraction

The existing `backend/Dockerfile` already bundles both (`mcr.microsoft.com/playwright/python:v1.49.0-jammy` base image + `tesseract-ocr` apt package), so a **Docker-based App Service** is the path of least resistance.

The frontend is a static React SPA (Vite build output), making **Azure Static Web Apps** the ideal host — free SSL, global CDN, and GitHub Actions integration out of the box.

---

## 2. Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| **Azure CLI** | All resource provisioning | `winget install Microsoft.AzureCLI` or [aka.ms/installazurecli](https://aka.ms/installazurecli) |
| **Docker Desktop** | Build and push container image | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Git** | Source control | Already installed |
| **Azure for Startups account** | Free credits ($1k–$150k depending on program) | [startups.microsoft.com](https://startups.microsoft.com) |

Log in to Azure CLI:

```bash
az login
az account show   # verify the correct subscription with startup credits
```

If you have multiple subscriptions, select the startup one:

```bash
az account set --subscription "<Your Startup Subscription Name>"
```

---

## 3. Azure Resource Overview

```
Resource Group: rg-medscan
├── Azure Container Registry (ACR): acrmedscan
├── App Service Plan (Linux, B2): plan-medscan
├── App Service (Docker): app-medscan-api          ← Backend
├── Static Web App: swa-medscan                    ← Frontend
├── Azure Database for PostgreSQL (Flexible): pg-medscan
├── Azure Cache for Redis (optional): redis-medscan
└── Application Insights (optional): ai-medscan
```

---

## Step 1 — Create Azure Resources

### 1.1 Resource Group

```bash
az group create --name rg-medscan --location centralindia
```

> **Location tip:** `centralindia` or `southindia` for lowest latency to Indian pharmacy sites. Other good options: `southeastasia`.

### 1.2 Container Registry

```bash
az acr create \
  --resource-group rg-medscan \
  --name acrmedscan \
  --sku Basic \
  --admin-enabled true
```

Save the login credentials:

```bash
az acr credential show --name acrmedscan
```

### 1.3 App Service Plan

Playwright + Chromium needs at least **2 GB RAM**. Use **B2** (Basic tier, 3.5 GB RAM) or **P1v3** (Premium, 8 GB) for production:

```bash
az appservice plan create \
  --name plan-medscan \
  --resource-group rg-medscan \
  --is-linux \
  --sku B2
```

> **Startup credits note:** B2 costs ~$55/month. If you have enough credits, P1v3 (~$108/month) gives better Playwright scrape performance with more CPU and RAM.

---

## Step 2 — Push Docker Image to ACR

### 2.1 Build the image locally

From the repository root:

```bash
cd medscan/backend
docker build -t acrmedscan.azurecr.io/medscan-api:latest .
```

### 2.2 Push to ACR

```bash
az acr login --name acrmedscan
docker push acrmedscan.azurecr.io/medscan-api:latest
```

### Alternative — Build directly on ACR (no local Docker needed)

```bash
az acr build \
  --registry acrmedscan \
  --image medscan-api:latest \
  --file Dockerfile \
  .
```

Run this from `medscan/backend/`.

---

## Step 3 — Deploy Backend to App Service

### 3.1 Create the Web App

```bash
az webapp create \
  --resource-group rg-medscan \
  --plan plan-medscan \
  --name medscan-api \
  --deployment-container-image-name acrmedscan.azurecr.io/medscan-api:latest
```

### 3.2 Connect ACR to App Service

```bash
az webapp config container set \
  --resource-group rg-medscan \
  --name medscan-api \
  --container-image-name acrmedscan.azurecr.io/medscan-api:latest \
  --container-registry-url https://acrmedscan.azurecr.io \
  --container-registry-user acrmedscan \
  --container-registry-password <password-from-step-1.2>
```

### 3.3 Set the exposed port

The Dockerfile exposes port 5000 and Gunicorn binds to `$PORT` (Azure sets this automatically), but explicitly configure it:

```bash
az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings WEBSITES_PORT=5000
```

### 3.4 Enable health check

```bash
az webapp config set \
  --resource-group rg-medscan \
  --name medscan-api \
  --generic-configurations '{"healthCheckPath": "/health"}'
```

### 3.5 Verify

```bash
curl https://medscan-api.azurewebsites.net/health
# Expected: {"status":"ok","service":"medscan-api"}
```

---

## Step 4 — Configure Environment Variables

Set all app settings (equivalent to `.env`):

```bash
az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings \
    FLASK_ENV=production \
    SECRET_KEY="<generate-a-strong-random-string>" \
    JWT_SECRET_KEY="<generate-another-strong-random-string>" \
    JWT_ACCESS_MINUTES=15 \
    JWT_REFRESH_DAYS=7 \
    OMNIDIMENSION_API_BASE="https://api.omnidimension.ai" \
    OMNIDIMENSION_API_KEY="<your-key>" \
    OMNIDIMENSION_MODEL="gpt-4o-mini" \
    CORS_ORIGINS="https://<your-swa-name>.azurestaticapps.net"
```

Generate strong secrets:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Full environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `FLASK_ENV` | Yes | Set to `production` |
| `SECRET_KEY` | Yes | Flask session encryption key |
| `JWT_SECRET_KEY` | Yes | JWT signing key |
| `JWT_ACCESS_MINUTES` | No | Access token lifetime (default: 15) |
| `JWT_REFRESH_DAYS` | No | Refresh token lifetime (default: 7) |
| `DATABASE_URL` | Yes | PostgreSQL connection string (see Step 5) |
| `OMNIDIMENSION_API_BASE` | Yes* | OpenAI-compatible API base URL (*required for chatbot) |
| `OMNIDIMENSION_API_KEY` | Yes* | API bearer token (*required for chatbot) |
| `OMNIDIMENSION_MODEL` | No | Model name (default: gpt-4o-mini) |
| `GOOGLE_OAUTH_CLIENT_ID` | No | Google sign-in (optional) |
| `REDIS_URL` | No | Redis connection string (see Step 6) |
| `CORS_ORIGINS` | Recommended | Frontend origin(s), comma-separated |
| `TESSERACT_CMD` | No | Not needed — Tesseract is on PATH inside the Docker image |
| `PLAYWRIGHT_HEADED` | No | Leave unset in production (always headless) |

---

## Step 5 — Set Up PostgreSQL

SQLite does not survive container restarts on App Service. Use **Azure Database for PostgreSQL Flexible Server**.

### 5.1 Create the server

```bash
az postgres flexible-server create \
  --resource-group rg-medscan \
  --name pg-medscan \
  --location centralindia \
  --admin-user medscanadmin \
  --admin-password "<strong-password>" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --yes
```

> **Standard_B1ms** (Burstable, 1 vCore, 2 GB) is ~$13/month — good starting point.

### 5.2 Allow Azure services to connect

```bash
az postgres flexible-server firewall-rule create \
  --resource-group rg-medscan \
  --name pg-medscan \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 5.3 Create the database

```bash
az postgres flexible-server db create \
  --resource-group rg-medscan \
  --server-name pg-medscan \
  --database-name medscan
```

### 5.4 Set DATABASE_URL on App Service

```bash
az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings \
    DATABASE_URL="postgresql://medscanadmin:<password>@pg-medscan.postgres.database.azure.com:5432/medscan?sslmode=require"
```

> The backend's `config.py` automatically normalizes `postgres://` → `postgresql://` for SQLAlchemy, so either prefix works.

### 5.5 Run initial migration

The app calls `db.create_all()` on startup, which creates all tables automatically. For subsequent schema changes, use Alembic:

```bash
# From local machine with DATABASE_URL pointing to Azure PG
cd backend
DATABASE_URL="postgresql://..." alembic upgrade head
```

---

## Step 6 — Enable Redis Cache (Optional)

Redis provides scrape result caching (reduces repeat Playwright runs). Without it, the app falls back to in-memory/no-op caching.

### 6.1 Create Redis

```bash
az redis create \
  --resource-group rg-medscan \
  --name redis-medscan \
  --location centralindia \
  --sku Basic \
  --vm-size C0
```

> **Basic C0** is ~$16/month with 250 MB — plenty for search cache.

### 6.2 Get connection string

```bash
az redis show --resource-group rg-medscan --name redis-medscan --query hostName -o tsv
az redis list-keys --resource-group rg-medscan --name redis-medscan
```

### 6.3 Set on App Service

```bash
az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings \
    REDIS_URL="rediss://:<access-key>@redis-medscan.redis.cache.windows.net:6380/0"
```

> Note: Azure Redis uses port **6380** with TLS (`rediss://`), not the default 6379.

---

## Step 7 — Deploy Frontend to Azure Static Web Apps

Azure Static Web Apps hosts the React SPA with global CDN, free SSL, and automatic GitHub integration.

### 7.1 Install the SWA CLI (optional, for manual deploys)

```bash
npm install -g @azure/static-web-apps-cli
```

### 7.2 Create the Static Web App

```bash
az staticwebapp create \
  --name swa-medscan \
  --resource-group rg-medscan \
  --location centralindia \
  --sku Free \
  --source https://github.com/<your-user>/medscan \
  --branch main \
  --app-location "/frontend" \
  --output-location "dist" \
  --login-with-github
```

> If you prefer manual deployment (no GitHub link), omit `--source`, `--branch`, and `--login-with-github`, then use the SWA CLI or GitHub Actions workflow.

### 7.3 Set frontend environment variables

In Azure Portal → Static Web App → **Configuration → Application settings**:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://medscan-api.azurewebsites.net` |
| `VITE_OMNIDIMENSION_WIDGET_SECRET` | Your widget secret |
| `VITE_GOOGLE_CLIENT_ID` | *(optional)* Google OAuth client ID |

Or via CLI:

```bash
az staticwebapp appsettings set \
  --name swa-medscan \
  --resource-group rg-medscan \
  --setting-names \
    VITE_API_URL=https://medscan-api.azurewebsites.net \
    VITE_OMNIDIMENSION_WIDGET_SECRET=<your-secret>
```

### 7.4 Build and deploy manually (if not using GitHub integration)

```bash
cd frontend
npm ci && npm run build
swa deploy ./dist \
  --deployment-token <your-swa-deployment-token> \
  --env production
```

### 7.5 Verify

Your frontend will be live at: `https://<generated-name>.azurestaticapps.net`

The `staticwebapp.config.json` in the `frontend/` folder handles SPA routing (all paths → `index.html`).

---

## Step 8 — Connect Frontend to Backend

### 8.1 Set CORS on the backend

The frontend (Static Web App) and backend (App Service) are on different origins. Configure CORS:

```bash
az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings CORS_ORIGINS="https://<your-swa-name>.azurestaticapps.net"
```

If you also have a custom domain:

```bash
az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings CORS_ORIGINS="https://<your-swa-name>.azurestaticapps.net,https://medscan.in"
```

### 8.2 Verify the connection

1. Open the Static Web App URL in your browser.
2. Try searching for a medicine — the frontend should call `https://medscan-api.azurewebsites.net/api/search-medicine`.
3. Check the browser console for CORS errors. If present, verify `CORS_ORIGINS` is set correctly.

---

## Step 9 — Custom Domain & SSL

### 9.1 Backend (App Service)

```bash
az webapp config hostname add \
  --resource-group rg-medscan \
  --webapp-name medscan-api \
  --hostname api.medscan.in
```

Add a CNAME record: `api.medscan.in → medscan-api.azurewebsites.net`

Free managed SSL:

```bash
az webapp config ssl create \
  --resource-group rg-medscan \
  --name medscan-api \
  --hostname api.medscan.in
```

### 9.2 Frontend (Static Web App)

```bash
az staticwebapp hostname set \
  --name swa-medscan \
  --resource-group rg-medscan \
  --hostname medscan.in
```

Add a CNAME record: `medscan.in → <your-swa-name>.azurestaticapps.net`

Static Web Apps provides **free SSL** automatically for custom domains.

### 9.3 Update CORS and VITE_API_URL after custom domains

Once custom domains are active, update:

```bash
# Backend CORS
az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings CORS_ORIGINS="https://medscan.in"

# Frontend API URL (if using custom backend domain)
az staticwebapp appsettings set \
  --name swa-medscan \
  --resource-group rg-medscan \
  --setting-names VITE_API_URL=https://api.medscan.in
```

---

## Step 10 — CI/CD with GitHub Actions

Two workflow files are provided in `.github/workflows/`:

### 10.1 Backend — `deploy-backend.yml`

Triggers on push to `main` when `backend/**` files change. Builds the Docker image, pushes to ACR, deploys to App Service, and runs a health check.

### 10.2 Frontend — `deploy-frontend.yml`

Triggers on push to `main` when `frontend/**` files change. Builds the Vite app with environment variables and deploys to Azure Static Web Apps.

### 10.3 Set up GitHub Secrets

**AZURE_CREDENTIALS** (for backend):

```bash
az ad sp create-for-rbac \
  --name "medscan-github-deploy" \
  --role contributor \
  --scopes /subscriptions/<sub-id>/resourceGroups/rg-medscan \
  --json-auth
```

Copy the JSON output into GitHub → **Settings → Secrets → AZURE_CREDENTIALS**.

**AZURE_SWA_DEPLOYMENT_TOKEN** (for frontend):

```bash
az staticwebapp secrets list \
  --name swa-medscan \
  --resource-group rg-medscan
```

Copy the `apiKey` value into GitHub → **Settings → Secrets → AZURE_SWA_DEPLOYMENT_TOKEN**.

### 10.4 Set up GitHub Variables

In GitHub → **Settings → Variables → Actions**, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://medscan-api.azurewebsites.net` |
| `VITE_OMNIDIMENSION_WIDGET_SECRET` | Your widget secret |
| `VITE_GOOGLE_CLIENT_ID` | *(optional)* |

---

## Monitoring & Logs

### Live log stream

```bash
az webapp log tail --resource-group rg-medscan --name medscan-api
```

### Enable Application Insights (recommended)

```bash
az monitor app-insights component create \
  --app ai-medscan \
  --resource-group rg-medscan \
  --location centralindia

az webapp config appsettings set \
  --resource-group rg-medscan \
  --name medscan-api \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<instrumentation-key>"
```

### Container logs in portal

Azure Portal → App Service → **Deployment Center → Logs** for container pull/startup logs.

---

## Capacity Planning & Cost Estimation ($10k Startup Credits)

### Understanding the Bottleneck

The heaviest operation is **medicine search**, which launches Playwright (headless Chromium). From `scraper_service.py`:

- **12 scrapers** run in parallel (1mg, PharmEasy, Netmeds, Apollo, TrueMeds, MedPlus, Flipkart, Amazon, SastaSundar, Medkart, Bajaj Health, Mankind)
- Each scraper opens a **separate Chromium page** in one shared browser context via `asyncio.gather`
- Per-page timeout: **60s** (`set_default_timeout(60000)`) / navigation: **75s**
- **Peak RAM per search: ~2.5–3.5 GB** (1 Chromium process + 12 concurrent tabs)
- Average scrape duration: **45–75 seconds**

The Dockerfile runs **`gunicorn -w 2`** (2 sync workers), so only **2 requests** can be processed concurrently — a single scrape blocks one worker for the full duration.

### Caching Drastically Reduces Chromium Load

From `comparison_service.py` and `redis_cache.py`, every search is cached at three layers:

1. **Redis** — 24-hour TTL (`MEDSCAN_CACHE_TTL_SECONDS`)
2. **DB `SearchCache`** — daily bucket keyed by `YYYY-MM-DD` + normalized query
3. Both checked **before** Playwright ever launches

**Impact:** "Paracetamol" searched by 500 users in one day = **1 Chromium scrape + 499 instant cache hits**. Popular medicines (top 100–200 drugs in India) will be cached within the first hour of daily usage.

All other endpoints (auth, dashboard, reminders, adherence, history, profile, chatbot) are lightweight DB queries or external API calls — they are **not** the limiting factor.

### Per-Endpoint Resource Profile

| Endpoint | CPU | RAM | Duration | Notes |
|----------|-----|-----|----------|-------|
| Medicine search (fresh) | High | ~3 GB | 45–75s | 12 parallel Chromium tabs |
| Medicine search (cached) | Minimal | ~5 MB | <50ms | Redis/DB lookup only |
| Prescription OCR | Moderate | ~200 MB | 2–5s | Tesseract CPU spike |
| Lab report analysis | Moderate | ~200 MB | 2–5s | OCR + deterministic parsing |
| Chatbot | Minimal | ~10 MB | 1–3s | HTTP call to OmniDimension API |
| Auth / Dashboard / CRUD | Minimal | ~5 MB | <100ms | DB read/write |

### Tier Comparison — Cost, Capacity, Duration

#### Scenario 1 — Starter (early MVP / low traffic)

| Resource | SKU | Cost/month |
|----------|-----|------------|
| App Service Plan | **B2** (2 vCores, 3.5 GB) | ~$55 |
| Static Web App (frontend) | Free | $0 |
| PostgreSQL Flexible | B1ms (1 vCore, 2 GB) | ~$13 |
| Container Registry | Basic | ~$5 |
| Redis Cache | Basic C0 (250 MB) | ~$16 |
| Application Insights | Free tier (5 GB/month) | $0 |
| **Total** | | **~$89/month** |

| Metric | Value |
|--------|-------|
| Gunicorn workers | 2 (from Dockerfile) |
| Concurrent scrapes | **1** (second worker handles lightweight requests) |
| Fresh scrapes/hour | ~48–80 |
| Cached hits/hour | Thousands (no Chromium) |
| Unique medicine searches/day | ~500–1,000 |
| **Daily active users** | **200–500** (at 2–3 unique searches/user) |
| **With popular-medicine caching** | **1,000–2,000 DAU** (most searches are cache hits) |
| **$10k lasts** | **~112 months (~9.3 years)** |

#### Scenario 2 — Growth (launched product)

| Resource | SKU | Cost/month |
|----------|-----|------------|
| App Service Plan | **P1v3** (2 vCores, 8 GB) | ~$108 |
| PostgreSQL Flexible | B2s (2 vCores, 4 GB) | ~$26 |
| Container Registry | Basic | ~$5 |
| Redis Cache | Basic C1 (1 GB) | ~$41 |
| Application Insights | Free tier | $0 |
| **Total** | | **~$180/month** |

| Metric | Value |
|--------|-------|
| Gunicorn workers | 3 (bump `-w 3`, enough RAM) |
| Concurrent scrapes | **2–3** |
| Fresh scrapes/hour | ~96–160 |
| Unique medicine searches/day | ~1,500–2,500 |
| **Daily active users** | **500–1,200** |
| **With caching** | **2,000–5,000 DAU** |
| **$10k lasts** | **~55 months (~4.5 years)** |

#### Scenario 3 — Scale (serious traction)

| Resource | SKU | Cost/month |
|----------|-----|------------|
| App Service Plan | **P2v3** (4 vCores, 16 GB) | ~$216 |
| PostgreSQL Flexible | GP D2s (2 vCores, 8 GB) | ~$100 |
| Container Registry | Basic | ~$5 |
| Redis Cache | Standard C1 (1 GB) | ~$82 |
| Application Insights | Free tier | $0 |
| **Total** | | **~$403/month** |

| Metric | Value |
|--------|-------|
| Gunicorn workers | 4 (bump `-w 4`) |
| Concurrent scrapes | **3–4** |
| Fresh scrapes/hour | ~180–300 |
| Unique medicine searches/day | ~3,000–5,000 |
| **Daily active users** | **1,500–3,000** |
| **With caching** | **5,000–10,000 DAU** |
| **$10k lasts** | **~25 months (~2 years)** |

#### Scenario 4 — High Scale (thousands of daily users)

| Resource | SKU | Cost/month |
|----------|-----|------------|
| App Service Plan | **P3v3 x2 instances** (8 vCores, 32 GB each) | ~$864 |
| PostgreSQL Flexible | GP D4s (4 vCores, 16 GB) | ~$200 |
| Container Registry | Standard | ~$20 |
| Redis Cache | Standard C2 (6 GB) | ~$164 |
| Application Insights | Free tier | $0 |
| **Total** | | **~$1,250/month** |

| Metric | Value |
|--------|-------|
| Concurrent scrapes | **15–20** (across 2 instances) |
| Unique medicine searches/day | ~15,000–20,000 |
| **Daily active users** | **5,000–10,000** |
| **With caching** | **10,000–25,000 DAU** |
| **$10k lasts** | **~8 months** |

### Summary — $10,000 Azure for Startups Credits

| Scenario | Monthly Cost | Daily Active Users | With Caching | Credits Last |
|----------|-------------|-------------------|--------------|-------------|
| **Starter** (B2) | ~$89 | 200–500 | 1,000–2,000 | **~9 years** |
| **Growth** (P1v3) | ~$180 | 500–1,200 | 2,000–5,000 | **~4.5 years** |
| **Scale** (P2v3) | ~$403 | 1,500–3,000 | 5,000–10,000 | **~2 years** |
| **High Scale** (P3v3 x2) | ~$1,250 | 5,000–10,000 | 10,000–25,000 | **~8 months** |

### Recommendation

**Start with Scenario 1 (B2).** The three-layer caching in `comparison_service.py` means most real-world searches are instant cache hits — your effective capacity is 3–5x higher than raw Chromium throughput suggests. Upgrade later with zero redeployment:

```bash
az appservice plan update --name plan-medscan --resource-group rg-medscan --sku P1v3
```

---

## Troubleshooting

### Container fails to start

```bash
az webapp log download --resource-group rg-medscan --name medscan-api --log-file startup.zip
```

Common causes:
- **Missing `WEBSITES_PORT=5000`** — Azure doesn't know which port to forward to.
- **Out of memory** — Chromium needs ~1.5 GB. Upgrade to B2 or higher.

### Playwright/Chromium crashes

The Docker image already includes all Chromium dependencies. If you see sandbox errors, ensure the Dockerfile has `--no-sandbox` in the Chromium launch args (already present in `scraper_service.py`).

### Database connection refused

- Verify firewall rule allows Azure services (0.0.0.0).
- Ensure `?sslmode=require` is in the connection string.
- Check the password doesn't contain special characters that need URL encoding.

### CORS errors from frontend

- Set `CORS_ORIGINS` to your exact Static Web App domain (with `https://`, no trailing slash).
- Multiple origins: comma-separated, e.g. `https://medscan.in,https://<swa-name>.azurestaticapps.net`.

### Slow cold starts

App Service may take 30–60s to cold-start the Playwright container. To mitigate:
- Enable **Always On** in App Service configuration (requires Basic tier or higher).
- Use the `/health` endpoint as a keep-alive ping.

```bash
az webapp config set \
  --resource-group rg-medscan \
  --name medscan-api \
  --always-on true
```

---

## Quick Reference — Complete Setup in One Script

```bash
# Variables — edit these
RG=rg-medscan
LOC=centralindia
ACR=acrmedscan
PLAN=plan-medscan
APP=medscan-api
SWA=swa-medscan
PG=pg-medscan
PG_USER=medscanadmin
PG_PASS="<your-strong-password>"
DB=medscan

# ── 1. Resource group ──
az group create --name $RG --location $LOC

# ── 2. Container registry ──
az acr create --resource-group $RG --name $ACR --sku Basic --admin-enabled true

# ── 3. Build and push backend image ──
cd backend
az acr build --registry $ACR --image medscan-api:latest --file Dockerfile .
cd ..

# ── 4. App Service plan + web app (backend) ──
az appservice plan create --name $PLAN --resource-group $RG --is-linux --sku B2
az webapp create --resource-group $RG --plan $PLAN --name $APP \
  --deployment-container-image-name $ACR.azurecr.io/medscan-api:latest

# ── 5. Connect ACR to App Service ──
ACR_PASS=$(az acr credential show --name $ACR --query "passwords[0].value" -o tsv)
az webapp config container set --resource-group $RG --name $APP \
  --container-image-name $ACR.azurecr.io/medscan-api:latest \
  --container-registry-url https://$ACR.azurecr.io \
  --container-registry-user $ACR \
  --container-registry-password $ACR_PASS

# ── 6. PostgreSQL ──
az postgres flexible-server create --resource-group $RG --name $PG --location $LOC \
  --admin-user $PG_USER --admin-password $PG_PASS \
  --sku-name Standard_B1ms --tier Burstable --storage-size 32 --version 16 --yes
az postgres flexible-server firewall-rule create --resource-group $RG --name $PG \
  --rule-name AllowAzure --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
az postgres flexible-server db create --resource-group $RG --server-name $PG --database-name $DB

# ── 7. Backend app settings ──
az webapp config appsettings set --resource-group $RG --name $APP --settings \
  WEBSITES_PORT=5000 \
  FLASK_ENV=production \
  SECRET_KEY="$(python -c 'import secrets;print(secrets.token_urlsafe(48))')" \
  JWT_SECRET_KEY="$(python -c 'import secrets;print(secrets.token_urlsafe(48))')" \
  DATABASE_URL="postgresql://$PG_USER:$PG_PASS@$PG.postgres.database.azure.com:5432/$DB?sslmode=require" \
  OMNIDIMENSION_API_BASE="https://api.omnidimension.ai" \
  OMNIDIMENSION_API_KEY="<your-key>"

# ── 8. Always on + health check ──
az webapp config set --resource-group $RG --name $APP --always-on true \
  --generic-configurations '{"healthCheckPath":"/health"}'

# ── 9. Frontend — Azure Static Web App ──
az staticwebapp create \
  --name $SWA \
  --resource-group $RG \
  --location centralindia \
  --sku Free

# Build and deploy frontend
cd frontend
npm ci
VITE_API_URL=https://$APP.azurewebsites.net npm run build
SWA_TOKEN=$(az staticwebapp secrets list --name $SWA --resource-group $RG --query "properties.apiKey" -o tsv)
npx @azure/static-web-apps-cli deploy ./dist --deployment-token $SWA_TOKEN --env production
cd ..

# ── 10. Set CORS to allow frontend origin ──
SWA_URL=$(az staticwebapp show --name $SWA --resource-group $RG --query "defaultHostname" -o tsv)
az webapp config appsettings set --resource-group $RG --name $APP \
  --settings CORS_ORIGINS="https://$SWA_URL"

# ── 11. Verify ──
echo "Waiting 60s for container startup..."
sleep 60
curl https://$APP.azurewebsites.net/health
echo ""
echo "Backend: https://$APP.azurewebsites.net"
echo "Frontend: https://$SWA_URL"
```
