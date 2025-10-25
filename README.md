# Script Generator

Script Generator automates the creation of production-ready speaker scripts from slide decks and accompanying handouts. It uses Azure OpenAI for language understanding, Azure Cognitive Search for semantic retrieval, and an Electron/Angular desktop app for collaborative editing.

## Highlights

- Automates the full flow from document ingestion through slide interpretation, matching, and AsciiDoc export.
- Caches intermediate results per script id to support incremental updates and re-runs.
- Ships with an Electron desktop UI (Angular 18 + NgRx) for reviewing, editing, and exporting tailored scripts.

## Prerequisites

- Python 3.9+ with `pip`
- Node.js 18+ with `npm`
- Azure subscription with access to Azure OpenAI and Azure Cognitive Search
- Poppler tools installed locally for `pdf2image` (macOS: `brew install poppler`)

## Installation

1. **Clone the repository**
   ```sh
   git clone https://github.com/<org>/script-generator.git
   cd script-generator
   ```

2. **Create and activate a Python virtual environment (recommended)**
   ```sh
   python -m venv .venv
   source .venv/bin/activate
   ```

3. **Install Python dependencies**
   ```sh
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Install UI dependencies**
   ```sh
   npm --prefix screator-ui install
   ```

## Configuration

Create a `config.properties` file in the repository root. The Azure credential keys must match the expected names in `config.py`.

```ini
[AzureOpenAI]
azure_openai_api_key = <your-api-key>
azure_openai_version = <api-version>
azure_openai_endpoint = https://<your-resource>.openai.azure.com/

[AzureSearch]
search_api_key = <your-search-key>
search_api_endpoint = https://<your-resource>.search.windows.net/
index_name = <existing-or-new-index-name>
```

Input assets live under `input/<id>/` with matching `.docx` and `.pdf` files. Only the first two filename characters are used as the numeric script id.

## Running the Pipelines

- **Full automation** – run the entire ingestion → interpretation → matching → script generation flow:
  ```sh
  python main.py input/01
  ```

- **Desktop review UI** – rebuild Angular assets and launch the Electron shell:
  ```sh
  ./startUI.sh
  ```

- **Generate edited AsciiDoc/PDF** – convert UI-curated edits back into AsciiDoc (and optional PDF):
  ```sh
  python script_generator_edited.py output/01
  ```

- **Quick edited script generation** – simplified shell script that takes only the folder name:
  ```sh
  ./createEditedScript.sh 01
  ```
  This script automatically:
  - Checks dependencies and provides helpful error messages
  - Processes the `script_edited.json` in the specified output folder
  - Generates both `.adoc` and `.pdf` files (if asciidoctor-pdf is available)
  - Shows progress and completion status

Generated artifacts are written to `output/<id>/` and include `script.json`, `slide_descriptions.json`, `slide_matches.json`, `script.adoc`, and UI exports.

## Project Structure

- `main.py` wires the multi-stage automation pipeline.
- `lectoring/` handles document extraction, paragraph lectoring, and embedding generation.
- `interpreting/` renders slide images and produces Azure OpenAI Vision descriptions.
- `matching/` provisions and queries the Azure Cognitive Search index for slide-to-script alignment.
- `screator-ui/` contains the Angular/Electron desktop application.
- `tests/` hosts unit tests (currently focused on the repository contract).

## Testing

Run the Python unit tests:
```sh
python -m unittest discover tests
```

Angular unit tests:
```sh
npm --prefix screator-ui run test
```

## Troubleshooting

- Ensure Poppler is installed and on your `PATH` before running slide interpretation (`pdf2image` dependency).
- Re-run `python main.py ...` if you change input files; cached outputs can be deleted from `output/<id>/` when a clean run is required.
- Azure resource errors typically indicate missing or misconfigured keys in `config.properties`.

## Application Logo

The desktop UI toolbar displays a modern scroll & pen logo (symbolizing authored scripts) sourced from `screator-ui/public/icons/app-icon.svg`. A PNG fallback (`screator-ui/public/icons/app-icon.png`) is referenced by Electron in `screator-ui/main.js` via the BrowserWindow `icon` option. For macOS packaging, supply a dedicated `.icns` file during bundling if you need a custom dock icon; the development run will still use the PNG. The SVG is optimized for scaling and can be updated without changing any code paths as long as the filename remains the same.
