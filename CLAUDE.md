# CLAUDE.md — AI Assistant Guide for `script-generator`

This file provides guidance for AI assistants (Claude, Copilot, etc.) working in this repository.

---

## Project Overview

`script-generator` is a hybrid Python/Angular+Electron application that automates the creation of speaker scripts for lecture videos. It combines AI-powered document processing (via Azure OpenAI) with an interactive desktop editor.

**Core workflow:**
1. **Lector** — Cleans raw lecture transcripts (German language) using an LLM
2. **Interpreter** — Describes slide images using GPT-4 Vision
3. **Matcher** — Aligns slides to script paragraphs using vector embeddings + Azure Cognitive Search
4. **Generator** — Produces AsciiDoc output with embedded slide references

---

## Repository Structure

```
script-generator/
├── main.py                      # Full pipeline entry point
├── config.py                    # Loads Azure credentials from config.properties
├── repository.py                # Centralized file I/O abstraction
├── llm.py                       # Azure OpenAI model initialization
├── embeddings.py                # Text embedding utilities
├── script_generator_auto.py     # Inserts slides into AsciiDoc at matched positions
├── script_generator_edited.py   # Converts edited JSON back to AsciiDoc/PDF
├── prompt_loader.py             # Loads prompt templates from prompts/
├── lectoring/
│   └── script_lector.py         # Stage 1: LLM-based transcript editing
├── interpreting/
│   └── slide_interpreter.py     # Stage 2: Vision-based slide description
├── matching/
│   ├── slide_script_matcher.py  # Stage 3: Vector-based slide-to-script alignment
│   └── script_search.py         # Azure Cognitive Search integration
├── prompts/                     # AI system prompts (Markdown, German language)
│   ├── script_lector_system.md
│   └── slide_interpreter_system.md
├── templates/                   # AsciiDoc document templates
├── tests/                       # Python unit tests
│   ├── repository_test.py
│   └── prompt_loader_test.py
├── screator-ui/                 # Angular + Electron desktop editor
│   ├── src/                     # Angular application source
│   ├── e2e/                     # Playwright end-to-end tests
│   ├── main.js                  # Electron main process
│   ├── angular.json             # Angular CLI configuration
│   ├── package.json             # Node.js dependencies and scripts
│   └── playwright.config.ts     # Playwright configuration
├── startUI.sh                   # Launch Electron UI
├── createEditedScript.sh        # Generate output from an edited script JSON
├── requirements.txt             # Python dependencies
└── README.md                    # Main project documentation
```

**Output directory (git-ignored, generated at runtime):**
```
output/<id>/
├── script.json              # Paragraphs with embeddings
├── script_edited.json       # User-edited version
├── script.adoc              # Final AsciiDoc output
├── script.txt               # Lectored raw text
├── slide_descriptions.json  # AI descriptions + embeddings
├── slide_matches.json       # Vector-matched slides per paragraph
└── slides/
    ├── page_001.png
    └── ...
```

---

## Development Environment Setup

### Python Backend

```bash
python -m venv .venv
source .venv/bin/activate     # Linux/macOS
pip install -r requirements.txt
```

Create `config.properties` (git-ignored) with Azure credentials:
```ini
[AzureOpenAI]
api_key = <your-key>
api_version = <version>
azure_endpoint = <endpoint>

[AzureSearch]
endpoint = <search-endpoint>
api_key = <search-key>
index_name = <index-name>
```

### Angular/Electron UI

```bash
cd screator-ui
npm install
```

---

## Running the Application

### Full Automated Pipeline
```bash
python main.py <script_id>          # Process by ID
python main.py --input <dir>        # Process by input directory path
```

### Desktop UI
```bash
./startUI.sh       # Builds Angular and launches Electron
# OR
cd screator-ui && npm run start
```

### Generate Output from Edited Script
```bash
./createEditedScript.sh <script_id>
# OR
python script_generator_edited.py --id <script_id>
```

---

## Testing

### Python Unit Tests
```bash
python -m unittest discover tests
```

### Angular Unit Tests (Karma)
```bash
npm --prefix screator-ui run test
```

### End-to-End Tests (Playwright)
```bash
# From screator-ui/
npm run test:e2e           # Headless
npm run test:e2e:headed    # With visible browser
npm run test:e2e:ui        # Interactive Playwright UI
npm run test:e2e:record    # Record new tests (sets PWDEBUG)
npm run test:e2e:report    # View HTML results report
```

E2E test fixtures live in `screator-ui/e2e/fixtures/`.

---

## CI/CD

**File:** `.github/workflows/e2e-tests.yml`

- **Triggers:** Push to `main` or `ui-component-refactoring`; PRs targeting `main`
- **Platform:** macOS (latest)
- **Steps:** Checkout → Node.js 20 setup → `npm ci` → Playwright install → Run E2E → Upload artifacts
- **Artifacts retained:** 30 days (HTML report + screenshots)

---

## Key Conventions

### Python

- **Module boundaries:** Each pipeline stage is a separate folder (`lectoring/`, `interpreting/`, `matching/`). Keep stage logic inside its folder.
- **File I/O:** Always use the `Repository` class from `repository.py` for reading/writing files — never access the filesystem ad-hoc inside pipeline stages.
- **Prompts:** Load system prompts via `prompt_loader.py`. Prompt files are Markdown (`.md`) in `prompts/`. **Prompts are written in German** for German-language lecture content; do not translate them.
- **Intermediate data:** Use JSON as the interchange format between pipeline stages (see output directory structure above).
- **Embeddings:** Cached to JSON files. Do not regenerate unless the source text changes.
- **Progress feedback:** Use `tqdm` for any loop over many items.
- **LLM initialization:** Use `llm.py` for Azure OpenAI model setup, `embeddings.py` for embedding models. Do not instantiate them inline.
- **Configuration:** Always go through `config.py`. Never hardcode credentials or endpoints.

### TypeScript / Angular

- **Component style:** Use **standalone components** (Angular 20+ pattern). No NgModules.
- **State management:** Use **NgRx** for all shared state. Follow the action → reducer → selector pattern. Keep state immutable — use deep copies.
- **UI components:** Use **PrimeNG** for UI elements. Keep custom styling minimal and scoped to components.
- **Strict mode:** TypeScript strict mode is enabled. Fix type errors; do not use `any` without a strong reason.
- **Electron integration:** The Electron main process (`main.js`) disables `contextIsolation` and enables `nodeIntegration` for filesystem access. Be aware of security implications when modifying this.

### Naming

| Artifact | Convention |
|---|---|
| Python files/modules | `snake_case` |
| Python classes | `PascalCase` |
| TypeScript files | `kebab-case` (Angular CLI default) |
| Angular components | `PascalCase` class, `kebab-case` selector |
| NgRx actions | Descriptive string literals, e.g. `[Feature] Action Name` |
| JSON output files | `snake_case.json` |
| Prompt files | `snake_case.md` in `prompts/` |

---

## Architecture Notes

- **Language split:** Backend processing is Python; frontend/editor is TypeScript (Angular + Electron). These communicate exclusively through files on disk (JSON in `output/<id>/`).
- **No REST API:** There is no HTTP server. Python scripts are invoked as CLI commands; the Electron app reads/writes files directly.
- **Azure dependencies:** The pipeline requires active Azure OpenAI and Azure Cognitive Search subscriptions. Tests that exercise the full pipeline will fail without valid credentials in `config.properties`.
- **German content:** System prompts and the output AsciiDoc content are in German. Code, variable names, and comments are in English.

---

## Files to Never Modify Without Care

| File | Reason |
|---|---|
| `config.properties` | Git-ignored; contains live credentials. Never commit. |
| `prompts/*.md` | Carefully tuned AI prompts. Changes affect output quality. Test before changing. |
| `templates/` | AsciiDoc templates that define the final document structure. |
| `screator-ui/main.js` | Electron main process; security-sensitive (`nodeIntegration`, IPC). |
| `.github/workflows/e2e-tests.yml` | CI pipeline; changes affect all contributors. |

---

## Git-Ignored Paths

```
input/          # Raw input files (transcripts, PDFs)
output/         # Generated pipeline outputs
.venv/          # Python virtual environment
config.properties  # Azure credentials
```

Do not commit content from these directories.
