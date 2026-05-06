# Playwright-pinned image includes Chromium for live pharmacy scraping
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install --with-deps chromium

COPY . .
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV MEDSCAN_UPLOAD_FOLDER=/app/uploads
RUN mkdir -p /app/uploads

EXPOSE 5000
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "wsgi:app"]
