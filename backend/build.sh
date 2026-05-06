#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Install Chromium browser binary for Playwright scraping
playwright install --with-deps chromium
