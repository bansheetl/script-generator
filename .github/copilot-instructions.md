# Copilot Instructions

## System Overview
- `main.py` is the canonical entrypoint: it wires the pipeline `lectoring → interpreting → init_script_search → matching → script generation` against a `Repository` wrapper around the `<project>/output/<scriptId>` workspace.
- `Repository` (repository.py) enforces the input contract: each `input/<id>` folder must contain exactly one `.docx` and one `.pdf`, with the first two filename characters forming the numeric script id reused across Azure Search document keys.
- Generated artifacts live under `output/<id>/` (`script.json`, `slide_descriptions.json`, `slide_matches.json`, rendered slide PNGs, and `script.adoc`). Downstream tools and the Electron UI assume these filenames and locations; keep them stable when extending the flow.

## Azure + AI Integration
- Secrets come from `config.properties`; keep the `[AzureOpenAI]` and `[AzureSearch]` section keys (`azure_openai_api_key`, `azure_openai_version`, `azure_openai_endpoint`, `search_api_endpoint`, `search_api_key`, `index_name`) intact.
- `lectoring/script_lector.py` chunks DOCX input (via `doc_extractor`) and calls Azure OpenAI `chat.completions` with German editing instructions; every paragraph produced is embedded with `text-embedding-ada-002` (1536 dims) and stored in `script.json`.
- `interpreting/slide_interpreter.py` lazily extracts slides (pdf2image dependency) and feeds each PNG to Azure OpenAI Vision (`gpt-4o`), capturing both natural-language descriptions and embeddings. Reuse `repository.save_slides` / `save_slide_descriptions` helpers when adding new interpreters.
- Azure Cognitive Search integration lives in `matching/`: `init_azure_search.py` provisions a cosine HNSW vector index, `script_search.py` reinitializes it when the document count is non-zero but the expected keys are absent, and `slide_script_matcher.py` performs vector queries (`VectorizedQuery`) to align slides with paragraphs. Preserve the `content_vector` payload shape when altering embeddings.

## Script Generation Workflows
- Automatic pipeline (`script_generator_auto.py`) expects ordered paragraphs and slide matches to inject `image::...[]` markers into `script.adoc`. The `find_slide_match` helper advances by paragraph id; keep paragraph ids sequential starting at 1.
- Edited pipeline (`script_generator_edited.py`) reads the UI-authored `script_edited.json`, writes a fresh AsciiDoc, and optionally runs `asciidoctor-pdf`; ensure that CLI is available or guard the subprocess call.
- The root README still references `script_generator.py`; prefer invoking `python main.py input/01` (or the target directory) and update docs accordingly if you rename stages.

## Electron/Angular UI (`screator-ui/`)
- Angular 18 + NgRx store drives the desktop editor. `AppComponent` (standalone) reads `output/*/script.json` and `slide_matches.json` from disk using Node’s `fs` exposed via Electron (`nodeIntegration: true`). Any change to output file names or relative paths must update `SLIDE_PREFIX` (`../../../../../`) and `SCRIPT_ROOT_DIR` (`../output`).
- Slide selection is managed via NgRx actions (`app.actions.ts`), reducer (`app.reducers.ts`) with manual undo/redo stacks, and selectors (`app.selectors.ts`). When adding state, copy state deeply in `copyState` so undo snapshots remain immutable.
- Build commands: `npm install` then `npm run start` (runs `ng build --source-map` before launching Electron). Use `npm run build` for production bundles and `npm run test` for Angular unit tests.

## Python Environment
- Install deps with `pip install -r requirements.txt`; pdf rendering needs system-level Poppler (`brew install poppler` on macOS) for `pdf2image`. Tests use built-in `unittest` (`python -m unittest discover tests`).
- Long-running steps emit progress via `tqdm`; keep iterator lengths accurate when modifying loops to avoid misleading progress bars.

## Conventions & Tips
- Centralize filesystem IO through `Repository` rather than ad-hoc paths so caching (e.g., “already lectored/interpreted”) continues to work.
- Handle previously generated artifacts idempotently: many entrypoints bail early if cached JSON exists—preserve these short-circuit checks when introducing new processing stages.
- Embedding arrays are large; avoid logging them directly. When debugging Azure Search documents, log metadata (`vector_id`, `paragraph_id`) instead.
- UI expects every paragraph to expose a `slideCandidates: SlideCandidate[]`; if you extend JSON schemas, include default arrays so the NgRx reducer logic stays safe.

## Typical Commands
- `python main.py input/01` – run full automation for script 01.
- `python script_generator_edited.py output/01` – convert a manually curated script into AsciiDoc/PDF.
- `npm --prefix screator-ui run start` – rebuild Angular app and launch Electron shell.