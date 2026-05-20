#!/usr/bin/env bash
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Install Chromium for Playwright (required on hosts that only run `pip install`)
python -m playwright install --with-deps chromium
