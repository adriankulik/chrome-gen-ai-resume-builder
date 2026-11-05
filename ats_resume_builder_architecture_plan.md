# Project Specification: Local-First ATS Resume Builder (Chrome Built-in AI)

## 1. Overview & Architecture
- **Hosting:** Static Single-Page Application (SPA) hosted on GitHub Pages.
- **Privacy (GDPR / RODO):** 100% client-side execution. Zero backend servers, zero external analytics, and self-hosted fonts (`woff2`) to prevent IP leakage.
- **Storage:** `IndexedDB` (via `idb-keyval` or native wrapper) for storing the Master Career Vault JSON and Base64/Blob profile photos. Include JSON file Export/Import for backup.
- **AI Engine:** Chrome Built-in AI (`window.LanguageModel` / Gemini Nano) with structured JSON Schema outputs (`responseConstraint`). Include a graceful manual/keyword-matching fallback if `LanguageModel.availability()` returns `"unavailable"`.
- **Layout:** 3-Panel split-screen workspace on desktop (Stepper/Tabs for first-time onboarding).

---

## 2. Data Model (`MasterVault` JSON Schema)
All career items and bullets must have deterministic unique IDs (`exp_1`, `b_101`) so the LLM only returns selected IDs rather than regenerating user text.

```json
{
  "contact": {
    "fullName": "Jan Kowalski",
    "email": "jan@example.com",
    "phone": "+48 123 456 789",
    "location": "Wrocław, Poland",
    "links": ["linkedin.com/in/jankowalski", "github.com/jankowalski"],
    "photoDataUrl": "data:image/jpeg;base64,..."
  },
  "summary": "Senior Frontend Engineer with 6+ years of experience...",
  "experience": [
    {
      "id": "exp_1",
      "role": "Senior Frontend Developer",
      "company": "TechCorp",
      "startDate": "2022-03",
      "endDate": "Present",
      "bullets": [
        { "id": "b_101", "text": "Architected micro-frontend migration reducing bundle size by 38%." },
        { "id": "b_102", "text": "Mentored 5 junior developers and conducted technical interviews." }
      ]
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "degree": "B.Sc. in Computer Science",
      "institution": "Wrocław University of Science and Technology",
      "year": "2016 - 2020"
    }
  ],
  "skills": ["TypeScript", "React", "Node.js", "GraphQL", "Docker"],
  "settings": {
    "theme": "modern-slate",
    "showPhoto": true,
    "strictOnePage": true,
    "includeRodoClause": true,
    "rodoCompanyName": ""
  }
}
```

---

## 3. UI Layout: 3-Panel Split Workspace

### Panel 1: Master Career Vault (Left)
- **Contact & Photo Input:** Standard text inputs + `<input type="file" accept="image/*">` converted via `FileReader.readAsDataURL()` (avoids all CORS issues during PDF print).
- **Exhaustive Career History Editor:** Dynamic CRUD list for Roles, Bullets, Education, and Skills.
- **Raw Import / Backup:**
  - *"Parse Raw Resume Text"* button: Uses `LanguageModel` to convert pasted unstructured CV text into the `MasterVault` JSON structure.
  - *"Export / Import Vault (.json)"* buttons for local backups.

### Panel 2: Job Description & AI Triage (Center)
- **JD Input:** `<textarea>` for pasting the target Job Description + *"Analyze & Match"* CTA button.
- **ATS Keyword Match Bar:** Displays extracted hard/soft skills from the JD and highlights which ones are present or missing in the user's vault.
- **Interactive Bullet Triage (Checkboxes):**
  - Displays all roles and bullets from Panel 1.
  - AI automatically checks (`checked = true`) the most relevant bullets for the JD.
  - If `strictOnePage` is enabled in Panel 3, cap AI selection at ~12–15 bullets maximum.
- **AI Bullet Proposer:**
  - Per-role *"Suggest Bullet for this JD"* button.
  - Prompts Gemini Nano to propose 1–2 tailored bullet points bridging a missing JD keyword with that specific role. Users can click *"Accept & Edit"* to add it to their checked list.

### Panel 3: Live A4 Preview & Controls (Right)
- **Top Control Toolbar:**
  - **Theme Selector:** `Classic Serif`, `Modern Slate`, `Minimal Mono` (driven via CSS variables `--accent-color`, `--font-family`, `--spacing-scale`).
  - **1-Page Enforcer Toggle:** Dynamically adjusts `--spacing-scale` and font sizes (`9.5pt` vs `10.5pt`) and warns if content overflows `297mm` height.
  - **Photo Toggle:** Show/hide profile picture (`showPhoto`).
  - **RODO / GDPR Toggle:** Appends the standard Polish/EU recruitment data processing consent footer, with an optional input to inject the target company name.
  - **Export PDF Button:** Triggers `window.print()`.
- **A4 Preview Canvas:**
  - Exact aspect ratio container (`210mm` $\times$ `297mm` scaled via CSS `transform: scale()` to fit the viewport).
  - Pure semantic HTML (`<header>`, `<section>`, `<ul>`, `<li>`) with zero tables or canvas rasterization to guarantee 100% ATS text parseability.

---

## 4. Chrome Built-in AI (`LanguageModel`) Integration

### Multilingual / Polish Support Strategy
- Do **not** pass `expectedOutputs: [{ languages: ["pl"] }]` if the browser API rejects non-EN/ES/JA tags. Keep JSON Schema keys in English and instruct the system prompt: *"Analyze the input in its original language (e.g., Polish or English). Always output generated bullet proposals in the exact same language as the user's resume."*

### Prompt 1: Triage & Bullet Selection (`responseConstraint`)
```javascript
const triageSchema = {
  type: "object",
  properties: {
    extractedKeywords: { type: "array", items: { type: "string" } },
    selectedBulletIds: { type: "array", items: { type: "string" } },
    relevantSkills: { type: "array", items: { type: "string" } }
  },
  required: ["extractedKeywords", "selectedBulletIds", "relevantSkills"]
};
```
- **System Prompt:** *"You are an expert ATS Resume Filter. Given a Master Resume JSON and a Job Description, return the IDs of the most relevant bullet points (`selectedBulletIds`) that prove the candidate fits the role. Do not invent IDs."*

### Prompt 2: Propose New Bullet Point
```javascript
const proposalSchema = {
  type: "object",
  properties: {
    proposedBullets: { type: "array", items: { type: "string" } }
  },
  required: ["proposedBullets"]
};
```
- **System Prompt:** *"Rewrite or propose 2 strong, metric-driven resume bullet points for the specified role that naturally incorporate the missing JD keywords. Match the language (Polish or English) of the existing bullets."*

---

## 5. Print & ATS CSS Rules (`@media print`)
- Hide Panel 1, Panel 2, and Panel 3's control toolbar (`display: none !important`).
- Reset the A4 preview wrapper scale (`transform: none !important; width: 210mm;`).
- Set `@page { size: A4 portrait; margin: 12mm 14mm; }`.
- Enforce `break-inside: avoid;` on job role blocks so headings never orphan at the bottom of Page 1.

---

## 6. Implementation Milestones for CLI Agent
1. **Step 1 (Scaffold & Storage):** Set up Vite + Vanilla TS/React + Tailwind CSS, self-hosted fonts, IndexedDB storage service, and default mock `MasterVault` data (with EN/PL toggleable sample).
2. **Step 2 (Panel 1 & Panel 3):** Build the Vault CRUD editor, Base64 photo uploader, and live A4 preview with CSS custom property themes, 1-page scaling, RODO footer, and `@media print` styles.
3. **Step 3 (Panel 2 & Chrome AI Service):** Implement `aiService.ts` wrapping `window.LanguageModel` with JSON schema constraints, fallback keyword matcher, interactive bullet checkboxes, and the per-role bullet proposer.