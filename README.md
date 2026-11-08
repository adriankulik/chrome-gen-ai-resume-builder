# LocalResume

> Provider-agnostic, on-device GenAI resume builder focused on Chrome's built-in Gemini Nano with seamless support for local model runners (Ollama, LM Studio).

---

## Overview

**LocalResume** is a 100% private, client-side ATS resume tailor and builder (Angular 21, no cloud backend). Your career data never leaves your computer.

- **Panel 1 – Vault:** contact/photo, experience, education, skills CRUD; raw-text parsing (with on-device AI) and JSON export/import in a Backup popup; summary, experience, education and skills edited in popups (`app-modal`). English only. Persisted in localStorage or `chrome.storage.local`.
- **Panel 2 – Job match:** job description input (analysis auto-runs on paste, or 1-click DOM extract in the Chrome extension), 1:1 keyword ↔ bullet matching, generated summary and skills, bullet checkboxes (AI selection, keyword fallback), per-role bullet proposer.
- **Panel 3 – Preview:** live A4 preview, 3 themes, 1-page enforcer, photo and GDPR/RODO toggles, print-to-PDF.

### Provider-Agnostic On-Device AI
- **Chrome Built-in AI (Gemini Nano)**: Default zero-config on-device Prompt API.
- **Local Model Runners**: Seamlessly connect to Ollama (`http://localhost:11434/v1`), LM Studio (`http://localhost:1234/v1`), or any OpenAI-compatible runner (llama.cpp, OMLX, LocalAI).
- **Keyword Fallback**: Always works offline even if no LLM is installed.

```
frontend/src/app/
├── core/          # vault model, localStorage storage, VaultService, AiService, keyword matcher, samples
├── button/        # design-system button (variants: primary, secondary, ghost, close)
├── modal/         # reusable popup (native <dialog>)
├── vault-editor/  # Panel 1
├── triage/        # Panel 2
└── preview/       # Panel 3
frontend/src/assets/fonts/   # self-hosted woff2 (Inter, Lora, JetBrains Mono)
```

---

## Working in Docker Dev Container (Recommended)

1. Open this folder in VS Code or Cursor with the **Dev Containers** extension installed.
2. Select **"Reopen in Container"** when prompted (or open the Command Palette `Cmd+Shift+P` and choose `Dev Containers: Reopen in Container`).
3. The container will automatically:
   - Build the Node 22 environment with Debian Chromium.
   - Mount a dedicated Docker volume for `node_modules` (avoiding host architecture mismatches).
   - Run `npm ci` inside `frontend/`.
   - Forward port `4200` (`ng serve`) and `9876` (`karma`).
4. Start the dev server in the container terminal:
   ```bash
   cd frontend
   npm run dev
   ```

---

## Dual-Target Architecture: Web App & Chrome Extension (MV3)

This application is built with a **zero-maintenance dual-target architecture**: the exact same Angular codebase runs as both a hosted web application (GitHub Pages) and a native Manifest V3 Chrome Extension.

### Chrome Extension Features
- **Chrome Side Panel (`chrome.sidePanel`)**: Opens seamlessly as a dock beside LinkedIn, Indeed, Greenhouse, Lever, or Workday.
- **1-Click Job Description Extraction**: Click *"Extract from tab"* in the triage panel to pull the job description directly from the active tab's DOM (or currently highlighted text).
- **Rock-Solid Data Retention (`chrome.storage.local`)**: Automatically stores resumes in persistent disk storage inside the user's Chrome profile (immune to cookie wipes and browser cache clearing), with seamless fallback to `localStorage` in web mode.
- **Full Tab Mode**: Click *"Full tab"* in the header to expand from the side panel into a panoramic 3-column workspace at any time.

### Loading as an Unpacked Chrome Extension
1. In `frontend/`, run:
   ```bash
   npm run build:extension
   ```
2. In Google Chrome, navigate to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **"Load unpacked"** and select the `frontend/dist/frontend` directory.
5. Click the extension icon on any job board to open the side panel!

---

## Available NPM Scripts (in `frontend/`)

- `npm run dev` / `npm start`: Starts the dev server on `0.0.0.0:4200`
- `npm run build`: Production build into `dist/frontend`
- `npm run build:gh-pages`: Builds with base-href configured for GitHub Pages
- `npm run build:extension`: Builds with relative base-href (`./`) for Chrome Extension
- `npm run pack:extension`: Builds and packages the extension into `dist/chrome-resume-builder-extension.zip`
- `npm test`: Runs unit tests via Karma + headless Chrome
- `npm run lint`: Runs ESLint
