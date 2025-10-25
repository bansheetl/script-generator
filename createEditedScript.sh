#!/bin/bash

# createEditedScript.sh - Generate edited script from output folder
# Usage: ./createEditedScript.sh <folder_name>
# Example: ./createEditedScript.sh 01

# Get the script directory first
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "createEditedScript.sh - Generate edited script from output folder"
    echo ""
    echo "Usage: $0 <folder_name>"
    echo "Example: $0 01"
    echo ""
    echo "This script will:"
    echo "  1. Look for script_edited.json in output/<folder_name>/"
    echo "  2. Generate script_edited.adoc from the JSON file"
    echo "  3. Generate script_edited.pdf using asciidoctor-pdf (if available)"
    echo ""
    echo "Prerequisites:"
    echo "  - Python 3 with required packages (install with: pip3 install -r requirements.txt)"
    echo "  - asciidoctor-pdf (optional, for PDF generation)"
    echo ""
    echo "Available folders in output/:"
    ls -1 "$SCRIPT_DIR/output/" 2>/dev/null || echo "  (no folders found)"
    exit 0
fi

# Check if folder name is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <folder_name>"
    echo "Example: $0 01"
    echo ""
    echo "This script will process the script_edited.json file in output/<folder_name>/"
    exit 1
fi

FOLDER_NAME="$1"
OUTPUT_DIR="$SCRIPT_DIR/output/$FOLDER_NAME"

# Check if the output directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Error: Output directory '$OUTPUT_DIR' does not exist."
    echo "Available folders in output/:"
    ls -1 "$SCRIPT_DIR/output/" 2>/dev/null || echo "  (no folders found)"
    exit 1
fi

# Check if script_edited.json exists
SCRIPT_EDITED_JSON="$OUTPUT_DIR/script_edited.json"
if [ ! -f "$SCRIPT_EDITED_JSON" ]; then
    echo "Error: $SCRIPT_EDITED_JSON does not exist."
    echo "Make sure you have created and saved an edited script using the UI first."
    exit 1
fi

echo "Processing edited script for folder: $FOLDER_NAME"
echo "Input file: $SCRIPT_EDITED_JSON"
echo ""

# Change to script directory to ensure relative paths work correctly
cd "$SCRIPT_DIR"

# Check if required Python packages are available
echo "Checking Python dependencies..."
python3 -c "import tqdm, json, subprocess" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Required Python dependencies are missing."
    echo "Please install them by running:"
    echo "  pip3 install -r requirements.txt"
    echo "or:"
    echo "  pip3 install tqdm"
    exit 1
fi

# Run the Python script
python3 script_generator_edited.py "$OUTPUT_DIR"

# Check if the script execution was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edited script generation completed successfully!"
    echo "Generated files:"
    echo "  - $OUTPUT_DIR/script_edited.adoc"
    echo "  - $OUTPUT_DIR/script_edited.pdf (if asciidoctor-pdf is available)"
else
    echo ""
    echo "❌ Error occurred during script generation."
    exit 1
fi