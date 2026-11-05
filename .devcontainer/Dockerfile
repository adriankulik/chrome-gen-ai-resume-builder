# Dev container for the Angular 21 portfolio frontend.
# Angular 21 requires Node ^20.19 || ^22.12 || ^24 — Node 22 LTS is used here.
FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Karma runs headless Chrome via Puppeteer. Puppeteer does not ship a
# linux-arm64 Chrome build (Apple Silicon hosts), so use Debian's Chromium
# on every architecture and point Puppeteer at it instead of downloading.
RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium fonts-liberation \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_BIN=/usr/bin/chromium \
    NG_CLI_ANALYTICS=false
