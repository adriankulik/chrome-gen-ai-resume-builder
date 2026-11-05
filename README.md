# ATS Resume Builder


---

## Overview

Local-first ATS resume builder (Angular 21, no backend). Spec: [ats_resume_builder_architecture_plan.md](ats_resume_builder_architecture_plan.md).

- **Panel 1 – Vault:** contact/photo, experience, education, skills CRUD; raw-text parsing (Chrome AI) and JSON export/import in a Backup popup; summary, experience, education and skills edited in popups (`app-modal`). English only. Persisted in localStorage.
- **Panel 2 – Job match:** job description input (analysis auto-runs on paste), 1:1 keyword ↔ bullet matching, generated summary and skills, bullet checkboxes (AI selection, keyword fallback), per-role bullet proposer.
- **Panel 3 – Preview:** live A4 preview, 3 themes, 1-page enforcer, photo and RODO toggles, print-to-PDF.

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

## Available NPM Scripts (in `frontend/`)

- `npm run dev` / `npm start`: Starts the dev server on `0.0.0.0:4200`
- `npm run build`: Production build into `dist/frontend`
- `npm test`: Runs unit tests via Karma + headless Chrome
- `npm run lint`: Runs ESLint
