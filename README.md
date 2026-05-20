# MedScan

Medicine price comparison for India (**MedScan PRD v1.0** alongside `../MedScan_PRD_v1.0.docx`): **live** Chromium (Playwright) scraping of search results across twelve storefronts—no fabricated prices—plus OCR (Tesseract / PyMuPDF), JWT-backed features, and an OpenAI-compatible chat endpoint.

## End-to-end stack

| Layer | Notes |
| --- | --- |
| **Scraping** | Parallel headless Chromium sessions; normalised query → first valid INR + product link per pharmacy. Failures are returned per source; HTTP **502** if every source fails. |
| **OCR / PDF** | Images: OpenCV preprocess + Tesseract. PDFs: embedded text or first-page raster + OCR via **PyMuPDF**. Empty OCR → **422** (no fake prescription text). |
| **LLM** | **Required** for `/api/chatbot/query` (set `OMNIDIMENSION_API_BASE` + `OMNIDIMENSION_API_KEY`). Lab report "insights" use structured reference comparison first; optional LLM wrap when keys are set. |
| **Frontend** | React + Vite + Tailwind; surfaces scrape errors, 502 all-fail state, and 503 when chat API is not configured. |

## Prerequisites

- Python 3.11+
- Node 20+
- **Chromium for Playwright:** after `pip install -r backend/requirements.txt`, run:
  ```bash
  python -m playwright install chromium
  ```
- **Tesseract** on `PATH`, or set `TESSERACT_CMD` (Windows path to `tesseract.exe`).

## Local development

**API**

```bash
cd backend
pip install -r requirements.txt
python -m playwright install chromium
python run.py
```

**Web** (proxies `/api` → `http://127.0.0.1:5000`)

```bash
cd frontend
npm install
npm run dev
```

Copy **`.env.example`** to **`.env`** and set at least:

- `OMNIDIMENSION_API_BASE` — OpenAI-compatible base URL (no trailing slash), e.g. `https://api.openai.com` or your OmniDimension host.
- `OMNIDIMENSION_API_KEY` — bearer token.

## Docker (local)

`docker compose up --build` uses the Playwright-based API image so Chromium is available in the container. Point `OMNIDIMENSION_*` at your provider.

## Azure Deployment

MedScan is designed to run on **Microsoft Azure** (Azure for Startups).

| Component | Azure Service |
| --- | --- |
| **Backend API** | Azure App Service (Linux, Docker container) |
| **Frontend SPA** | Azure Static Web Apps |
| **Database** | Azure Database for PostgreSQL (Flexible Server) |
| **Cache** | Azure Cache for Redis (optional) |
| **Container Registry** | Azure Container Registry (ACR) |

See **[`docs/azure-deployment.md`](docs/azure-deployment.md)** for the complete step-by-step setup guide, including capacity planning and cost estimation for startup credits.

### Quick start

```bash
# Build and push backend image to ACR
cd backend
az acr build --registry acrmedscan --image medscan-api:latest --file Dockerfile .

# Deploy frontend to Azure Static Web Apps
cd ../frontend
npm run build
swa deploy ./dist --env production
```

### CI/CD

GitHub Actions workflows are provided in `.github/workflows/`:

- **`deploy-backend.yml`** — Builds Docker image, pushes to ACR, deploys to App Service on push to `main`.
- **`deploy-frontend.yml`** — Builds the React app and deploys to Azure Static Web Apps on push to `main`.

## Legal

Scraping third-party pharmacy sites may be restricted by their terms or local law—obtain appropriate review before production use (see PRD §14–15).

---

Informational tooling only—not a substitute for professional medical advice.
